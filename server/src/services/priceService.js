import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import axios from 'axios';
import Price from '../models/Price.js';
import Forecast from '../models/Forecast.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const parseAndUpsertPriceCSV = async (csvFilePathOrBuffer) => {
  return new Promise((resolve, reject) => {
    let inserted = 0;
    let updated = 0;
    const records = [];

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', (err) => reject(err));

    parser.on('end', async () => {
      try {
        const operations = [];
        for (const row of records) {
          const commodity = row.commodity || row.Commodity;
          const market = row.market || row.Market;
          const district = row.district || row.District || '';
          const state = row.state || row.State || '';
          const dateStr = row.date || row.Date || row.arrival_date;
          const minPrice = parseFloat(row.min_price || row.Min_Price || row.minPrice || 0);
          const maxPrice = parseFloat(row.max_price || row.Max_Price || row.maxPrice || 0);
          const modalPrice = parseFloat(row.modal_price || row.Modal_Price || row.modalPrice || 0);

          if (!commodity || !market || !dateStr || isNaN(modalPrice)) {
            continue;
          }

          const date = new Date(dateStr);
          operations.push({
            updateOne: {
              filter: { commodity, market, date },
              update: {
                $set: {
                  commodity,
                  market,
                  district,
                  state,
                  date,
                  minPrice: isNaN(minPrice) ? modalPrice : minPrice,
                  maxPrice: isNaN(maxPrice) ? modalPrice : maxPrice,
                  modalPrice,
                },
              },
              upsert: true,
            },
          });
        }

        if (operations.length > 0) {
          const bulkRes = await Price.bulkWrite(operations, { ordered: false });
          inserted = bulkRes.upsertedCount || 0;
          updated = bulkRes.modifiedCount || 0;
        }

        resolve({ inserted, updated, total: records.length });
      } catch (err) {
        reject(err);
      }
    });

    if (Buffer.isBuffer(csvFilePathOrBuffer)) {
      parser.write(csvFilePathOrBuffer);
      parser.end();
    } else if (typeof csvFilePathOrBuffer === 'string') {
      fs.createReadStream(csvFilePathOrBuffer).pipe(parser);
    } else {
      reject(new Error('Invalid CSV source'));
    }
  });
};

export const fetchPricesFromAgmarknetOrSeed = async () => {
  const apiKey = process.env.AGMARKNET_API_KEY;

  if (apiKey) {
    try {
      // Call official Agmarknet API endpoint
      const response = await axios.get(
        `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=500`
      );
      if (response.data && response.data.records) {
        let inserted = 0;
        let updated = 0;
        for (const row of response.data.records) {
          const commodity = row.commodity;
          const market = row.market;
          const date = new Date(row.arrival_date);
          const modalPrice = parseFloat(row.modal_price);
          const minPrice = parseFloat(row.min_price) || modalPrice;
          const maxPrice = parseFloat(row.max_price) || modalPrice;

          if (commodity && market && !isNaN(modalPrice)) {
            const res = await Price.findOneAndUpdate(
              { commodity, market, date },
              {
                commodity,
                market,
                district: row.district || '',
                state: row.state || '',
                date,
                minPrice,
                maxPrice,
                modalPrice,
              },
              { upsert: true, rawResult: true }
            );
            if (res.lastErrorObject?.updatedExisting) updated++;
            else inserted++;
          }
        }
        return { source: 'agmarknet-api', inserted, updated };
      }
    } catch (apiErr) {
      console.warn('[PriceService] Agmarknet API failed, falling back to seed CSV:', apiErr.message);
    }
  }

  // Fallback to data/prices_seed.csv (check both server/data and root data/)
  const candidatePaths = [
    path.resolve(__dirname, '../../data/prices_seed.csv'),
    path.resolve(__dirname, '../../../data/prices_seed.csv'),
    path.resolve(process.cwd(), 'data/prices_seed.csv'),
    path.resolve(process.cwd(), '../data/prices_seed.csv'),
  ];
  const seedPath = candidatePaths.find((p) => fs.existsSync(p));
  if (seedPath) {
    const result = await parseAndUpsertPriceCSV(seedPath);
    return { source: 'seed-csv', ...result };
  } else {
    throw new Error('Seed price CSV not found. Checked: ' + candidatePaths.join(', '));
  }
};

export const getOrGenerateForecast = async (commodity, market, horizon = 14, force = false) => {
  const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');

  if (!force) {
    // Check if generated within 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await Forecast.findOne({
      commodity,
      market,
      generatedAt: { $gte: yesterday },
    }).sort({ generatedAt: -1 });

    if (existing) {
      return existing;
    }
  }

  // Fetch up to 365 days of prices
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const prices = await Price.find({
    commodity,
    market,
    date: { $gte: oneYearAgo },
  }).sort({ date: 1 });

  if (prices.length === 0) {
    // Return last stored forecast even if older
    const lastStored = await Forecast.findOne({ commodity, market }).sort({ generatedAt: -1 });
    if (lastStored) return lastStored;
    throw new Error(`No price data available for commodity ${commodity} in market ${market}`);
  }

  const series = prices.map((p) => ({
    date: p.date.toISOString().split('T')[0],
    price: p.modalPrice,
  }));

  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/forecast`,
      { series, horizon: Number(horizon) },
      { timeout: 30000 } // 30s allows for cloud cold-start spin-ups on platforms like Render
    );

    const { points, model, mape } = response.data;

    const forecastDoc = await Forecast.create({
      commodity,
      market,
      generatedAt: new Date(),
      horizonDays: horizon,
      points: points.map((pt) => ({
        date: new Date(pt.date),
        predicted: pt.predicted,
        lower: pt.lower,
        upper: pt.upper,
      })),
      model,
      mape,
    });

    return forecastDoc;
  } catch (err) {
    console.warn(`[PriceService] ML Service failed (${err.message}). Checking cached forecast...`);
    const lastStored = await Forecast.findOne({ commodity, market }).sort({ generatedAt: -1 });
    if (lastStored) {
      return lastStored;
    }
    // Fallback: generate local moving average projection
    const lastPrice = prices[prices.length - 1].modalPrice;
    const lastDate = prices[prices.length - 1].date;
    const points = [];
    for (let i = 1; i <= horizon; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      points.push({
        date: d,
        predicted: lastPrice,
        lower: Math.round(lastPrice * 0.95),
        upper: Math.round(lastPrice * 1.05),
      });
    }

    return await Forecast.create({
      commodity,
      market,
      generatedAt: new Date(),
      horizonDays: horizon,
      points,
      model: 'Fallback-MA-Local',
      mape: 5.0,
    });
  }
};

import Price from '../models/Price.js';
import User from '../models/User.js';
import { getOrGenerateForecast } from '../services/priceService.js';

export const getPrices = async (req, res, next) => {
  try {
    const { commodity, market, from, to, limit = 365 } = req.query;
    const query = {};

    if (commodity) query.commodity = commodity;
    if (market) query.market = market;

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const prices = await Price.find(query)
      .sort({ date: 1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: prices,
    });
  } catch (error) {
    next(error);
  }
};

export const getPriceMeta = async (req, res, next) => {
  try {
    const pairs = await Price.aggregate([
      {
        $group: {
          _id: { commodity: '$commodity', market: '$market' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.commodity': 1, '_id.market': 1 },
      },
    ]);

    const combinations = {};
    const validCommoditiesSet = new Set();
    const validMarketsSet = new Set();
    const pairsList = [];

    for (const item of pairs) {
      const { commodity, market } = item._id;
      if (!commodity || !market) continue;
      validCommoditiesSet.add(commodity);
      validMarketsSet.add(market);
      pairsList.push({ commodity, market, count: item.count });

      if (!combinations[commodity]) {
        combinations[commodity] = [];
      }
      combinations[commodity].push(market);
    }

    const commodities = Array.from(validCommoditiesSet).sort();
    const markets = Array.from(validMarketsSet).sort();

    return res.status(200).json({
      success: true,
      data: {
        commodities,
        markets,
        combinations,
        pairs: pairsList,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getForecast = async (req, res, next) => {
  try {
    const { commodity, market, horizon = 14 } = req.query;

    if (!commodity || !market) {
      return res.status(400).json({
        success: false,
        message: 'Commodity and market query parameters are required',
      });
    }

    const forecast = await getOrGenerateForecast(commodity, market, parseInt(horizon), false);

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: `No price data available for commodity ${commodity} in market ${market}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdvisor = async (req, res, next) => {
  try {
    const { commodity, market, quantity = 1 } = req.query;

    if (!commodity || !market) {
      return res.status(400).json({
        success: false,
        message: 'Commodity and market query parameters are required',
      });
    }

    // Farmer's storage cost per quintal per day
    let storageCostPerDay = 2; // default
    if (req.user) {
      storageCostPerDay = req.user.storageCostPerQuintalPerDay ?? 2;
    }
    if (req.query.storageCost !== undefined) {
      storageCostPerDay = parseFloat(req.query.storageCost);
    }

    const qty = parseFloat(quantity) || 1;

    // Get current modal price
    const latestPriceDoc = await Price.findOne({ commodity, market }).sort({ date: -1 });
    if (!latestPriceDoc) {
      return res.status(404).json({
        success: false,
        message: 'No price data found for specified commodity and market',
      });
    }
    const currentPrice = latestPriceDoc.modalPrice;

    // Get forecast
    const forecast = await getOrGenerateForecast(commodity, market, 14, false);
    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: 'No forecast data available for specified commodity and market',
      });
    }
    const points = forecast.points || [];

    let bestDayIndex = 0;
    let maxNetGain = 0; // day 0 netGain is 0
    let bestPredictedPrice = currentPrice;

    // Evaluate each day d (1 to horizon)
    points.forEach((pt, idx) => {
      const d = idx + 1;
      const predictedPrice = pt.predicted;
      const netGain = predictedPrice - currentPrice - (storageCostPerDay * d);

      if (netGain > maxNetGain) {
        maxNetGain = netGain;
        bestDayIndex = d;
        bestPredictedPrice = predictedPrice;
      }
    });

    // If maxGain is greater than 3 percent of currentPrice then action = WAIT with waitDays = best.d, else action = SELL_NOW
    const threshold = currentPrice * 0.03;
    const shouldWait = maxNetGain > threshold && bestDayIndex > 0;

    const action = shouldWait ? 'WAIT' : 'SELL_NOW';
    const waitDays = shouldWait ? bestDayIndex : 0;
    const expectedGainPerQuintal = shouldWait ? Math.round(maxNetGain * 100) / 100 : 0;
    const expectedTotalGain = Math.round(expectedGainPerQuintal * qty * 100) / 100;

    let confidence = 'Low';
    const mape = forecast.mape;
    if (mape !== undefined && mape !== null) {
      if (mape < 8) confidence = 'High';
      else if (mape < 15) confidence = 'Medium';
      else confidence = 'Low';
    }

    return res.status(200).json({
      success: true,
      data: {
        action,
        waitDays,
        expectedGainPerQuintal,
        expectedTotalGain,
        currentPrice,
        bestPrice: Math.round(bestPredictedPrice * 100) / 100,
        storageCostPerDay,
        confidence,
        mape: forecast.mape,
        model: forecast.model,
      },
    });
  } catch (error) {
    next(error);
  }
};

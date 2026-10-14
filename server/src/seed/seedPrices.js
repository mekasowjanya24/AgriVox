import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../config/db.js';
import { parseAndUpsertPriceCSV } from '../services/priceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedPricesOnly = async () => {
  console.log('[Seed Prices] Connecting to database...');
  await connectDB();

  const candidatePaths = [
    path.resolve(__dirname, '../../data/prices_seed.csv'),
    path.resolve(__dirname, '../../../data/prices_seed.csv'),
    path.resolve(process.cwd(), 'data/prices_seed.csv'),
    path.resolve(process.cwd(), '../data/prices_seed.csv'),
    path.resolve(process.cwd(), 'server/data/prices_seed.csv'),
  ];

  const seedCSVPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!seedCSVPath) {
    throw new Error('prices_seed.csv file not found in candidate paths: ' + candidatePaths.join(', '));
  }

  console.log('[Seed Prices] Loading and upserting price dataset from:', seedCSVPath);
  const result = await parseAndUpsertPriceCSV(seedCSVPath);
  console.log(
    `[Seed Prices] Successfully processed ${result.total} price records. (Inserted: ${result.inserted}, Updated: ${result.updated})`
  );
  console.log('[Seed Prices] Completed safely without modifying users, plots, or cycles.');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedPricesOnly()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed Prices] Error loading prices:', err.message);
      await disconnectDB();
      process.exit(1);
    });
}

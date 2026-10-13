import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Plot from '../models/Plot.js';
import Cycle from '../models/Cycle.js';
import Expense from '../models/Expense.js';
import Harvest from '../models/Harvest.js';
import Price from '../models/Price.js';
import Forecast from '../models/Forecast.js';
import RefreshToken from '../models/RefreshToken.js';
import { parseAndUpsertPriceCSV } from '../services/priceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runSeed = async () => {
  console.log('[Seed] Starting database seed...');
  await connectDB();

  // Drop database for a clean slate and fresh indexes
  try {
    await mongoose.connection.dropDatabase();
    console.log('[Seed] Dropped database for clean slate and fresh indexes.');
  } catch (dropErr) {
    console.log('[Seed] Could not drop database, clearing collections individually...');
    await Promise.all([
      User.deleteMany({}),
      Plot.deleteMany({}),
      Cycle.deleteMany({}),
      Expense.deleteMany({}),
      Harvest.deleteMany({}),
      Price.deleteMany({}),
      Forecast.deleteMany({}),
      RefreshToken.deleteMany({}),
    ]);
  }

  // 1. Create Admin
  const adminSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', adminSalt);
  const admin = await User.create({
    name: 'Agri Admin Officer',
    phone: '9999999999',
    passwordHash: adminPasswordHash,
    role: 'admin',
    language: 'te',
    storageCostPerQuintalPerDay: 2,
    isActive: true,
  });
  console.log('[Seed] Created Admin: phone 9999999999 / Admin@123');

  // 2. Create Farmer
  const farmerSalt = await bcrypt.genSalt(10);
  const farmerPasswordHash = await bcrypt.hash('Farmer@123', farmerSalt);
  const farmer = await User.create({
    name: 'వెంకటేశ్వర్లు (Venkatesh)',
    phone: '8888888888',
    passwordHash: farmerPasswordHash,
    role: 'farmer',
    language: 'te',
    storageCostPerQuintalPerDay: 2,
    isActive: true,
  });
  console.log('[Seed] Created Farmer: phone 8888888888 / Farmer@123');

  // 3. Create 2 Plots
  const plot1 = await Plot.create({
    userId: farmer._id,
    name: 'ఉత్తర చేను (North Field)',
    areaAcres: 3.5,
    soilType: 'black',
    village: 'ఎనుమాముల (Enumamula)',
    district: 'వరంగల్ (Warangal)',
  });

  const plot2 = await Plot.create({
    userId: farmer._id,
    name: 'బావి చేను (Well Field)',
    areaAcres: 2.0,
    soilType: 'red',
    village: 'హసన్‌పర్తి (Hasanparthy)',
    district: 'వరంగల్ (Warangal)',
  });
  console.log('[Seed] Created 2 Plots.');

  // 4. Create 3 Cycles (paddy, cotton, maize)
  const cyclePaddy = await Cycle.create({
    userId: farmer._id,
    plotId: plot1._id,
    crop: 'వరి (Paddy)',
    season: 'Kharif',
    year: 2025,
    sowingDate: new Date('2025-06-15'),
    expectedHarvestDate: new Date('2025-11-20'),
    status: 'harvested',
  });

  const cycleCotton = await Cycle.create({
    userId: farmer._id,
    plotId: plot2._id,
    crop: 'ప్రత్తి (Cotton)',
    season: 'Kharif',
    year: 2025,
    sowingDate: new Date('2025-07-01'),
    expectedHarvestDate: new Date('2025-12-15'),
    status: 'harvested',
  });

  const cycleMaize = await Cycle.create({
    userId: farmer._id,
    plotId: plot1._id,
    crop: 'మొక్కజొన్న (Maize)',
    season: 'Rabi',
    year: 2026,
    sowingDate: new Date('2025-12-01'),
    expectedHarvestDate: new Date('2026-04-10'),
    status: 'active',
  });
  console.log('[Seed] Created 3 Cycles (Paddy, Cotton, Maize).');

  // 5. Create 20 or more expenses across categories
  const expensesData = [
    // Paddy Cycle Expenses
    { cycleId: cyclePaddy._id, category: 'seeds', item: 'BPT 5204 వరి విత్తనాలు (BPT 5204 Paddy Seeds)', amount: 3200, date: new Date('2025-06-10'), source: 'manual' },
    { cycleId: cyclePaddy._id, category: 'fertilizer', item: 'యూరియా 2 బస్తాలు (Urea 2 Bags)', amount: 1800, date: new Date('2025-06-25'), source: 'voice' },
    { cycleId: cyclePaddy._id, category: 'fertilizer', item: 'DAP ఎరువు (DAP Fertilizer 1 Bag)', amount: 1450, date: new Date('2025-07-10'), source: 'voice' },
    { cycleId: cyclePaddy._id, category: 'labour', item: 'నాట్లు వేసే కూలీలు (Transplanting Labour)', amount: 4500, date: new Date('2025-07-05'), source: 'manual' },
    { cycleId: cyclePaddy._id, category: 'irrigation', item: 'మోటార్ మరమ్మత్తు & డీజిల్ (Motor Repair & Diesel)', amount: 1200, date: new Date('2025-07-20'), source: 'voice' },
    { cycleId: cyclePaddy._id, category: 'pesticide', item: 'కోరాజెన్ పురుగుమందు (Coragen Pesticide)', amount: 1600, date: new Date('2025-08-15'), source: 'manual' },
    { cycleId: cyclePaddy._id, category: 'labour', item: 'కలుపు తీత కూలీలు (Weeding Labour)', amount: 2800, date: new Date('2025-08-25'), source: 'manual' },
    { cycleId: cyclePaddy._id, category: 'machinery', item: 'కోత మిషన్ (Harvester Machine)', amount: 5500, date: new Date('2025-11-18'), source: 'manual' },
    { cycleId: cyclePaddy._id, category: 'transport', item: 'మార్కెట్ లారీ రవాణా (Market Lorry Transport)', amount: 1500, date: new Date('2025-11-21'), source: 'voice' },

    // Cotton Cycle Expenses
    { cycleId: cycleCotton._id, category: 'seeds', item: 'రాశి బీటీ ప్రత్తి విత్తనాలు (Rasi Bt Cotton Seeds)', amount: 2400, date: new Date('2025-06-25'), source: 'manual' },
    { cycleId: cycleCotton._id, category: 'machinery', item: 'ట్రాక్టర్ దుక్కి (Tractor Ploughing)', amount: 3000, date: new Date('2025-06-28'), source: 'voice' },
    { cycleId: cycleCotton._id, category: 'fertilizer', item: '20:20:0:13 ఎరువులు (20:20:0:13 Fertilizer)', amount: 2600, date: new Date('2025-07-18'), source: 'manual' },
    { cycleId: cycleCotton._id, category: 'pesticide', item: 'గులాబీ రంగు పురుగు మందు (Pink Bollworm Pesticide)', amount: 1950, date: new Date('2025-08-30'), source: 'voice' },
    { cycleId: cycleCotton._id, category: 'labour', item: 'ప్రత్తి ఏరివేత కూలీ (Cotton Picking Labour)', amount: 6000, date: new Date('2025-10-15'), source: 'manual' },
    { cycleId: cycleCotton._id, category: 'labour', item: 'రెండవ విడత ప్రత్తి కూలీ (Second Cotton Picking Labour)', amount: 4000, date: new Date('2025-11-20'), source: 'manual' },
    { cycleId: cycleCotton._id, category: 'transport', item: 'ఆటో రవాణా మార్కెట్ కు (Auto Transport to Market)', amount: 900, date: new Date('2025-12-05'), source: 'voice' },

    // Maize Cycle Expenses
    { cycleId: cycleMaize._id, category: 'seeds', item: 'పయనీర్ మొక్కజొన్న విత్తనాలు (Pioneer Maize Seeds)', amount: 2800, date: new Date('2025-11-28'), source: 'manual' },
    { cycleId: cycleMaize._id, category: 'fertilizer', item: 'యూరియా మరియు పొటాష్ (Urea & Potash Fertilizer)', amount: 2200, date: new Date('2025-12-20'), source: 'voice' },
    { cycleId: cycleMaize._id, category: 'irrigation', item: 'కాలువ నీరు పన్ను (Canal Water Tax)', amount: 750, date: new Date('2026-01-15'), source: 'manual' },
    { cycleId: cycleMaize._id, category: 'pesticide', item: 'కత్తెర పురుగు మందు పిచికారీ (Fall Armyworm Spray)', amount: 1400, date: new Date('2026-02-10'), source: 'voice' },
    { cycleId: cycleMaize._id, category: 'labour', item: 'మొక్కజొన్న కలుపు కూలీ (Maize Weeding Labour)', amount: 2100, date: new Date('2026-02-25'), source: 'manual' },
    { cycleId: cycleMaize._id, category: 'other', item: 'గోనె సంచులు మరియు తాళ్ళు (Gunny Bags & Ropes)', amount: 650, date: new Date('2026-03-20'), source: 'manual' },
  ];

  await Expense.insertMany(expensesData.map((e) => ({ ...e, userId: farmer._id })));
  console.log(`[Seed] Created ${expensesData.length} Expenses across all categories.`);

  // 6. Create 2 Harvests
  await Harvest.create([
    {
      userId: farmer._id,
      cycleId: cyclePaddy._id,
      quantityQuintals: 70,
      pricePerQuintal: 2150,
      buyer: 'శ్రీనివాస ట్రేడర్స్ (Srinivasa Traders)',
      market: 'వరంగల్ మార్కెట్ (Warangal)',
      date: new Date('2025-11-22'),
    },
    {
      userId: farmer._id,
      cycleId: cycleCotton._id,
      quantityQuintals: 18,
      pricePerQuintal: 7200,
      buyer: 'లక్ష్మి కాటన్ జిన్నింగ్ మిల్లు',
      market: 'ఖమ్మం మార్కెట్ (Khammam)',
      date: new Date('2025-12-10'),
    },
  ]);
  console.log('[Seed] Created 2 Harvest sales records.');

  // 7. Load prices_seed.csv (check both server/data and root data/)
  const candidatePaths = [
    path.resolve(__dirname, '../../data/prices_seed.csv'),
    path.resolve(__dirname, '../../../data/prices_seed.csv'),
    path.resolve(process.cwd(), 'data/prices_seed.csv'),
    path.resolve(process.cwd(), '../data/prices_seed.csv'),
  ];
  const seedCSVPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
  console.log('[Seed] Loading price dataset from:', seedCSVPath);
  const priceResult = await parseAndUpsertPriceCSV(seedCSVPath);
  console.log(`[Seed] Loaded price dataset: ${priceResult.total} prices imported.`);

  console.log('[Seed] Seed script finished successfully!');
};

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Seed failed with error:', err);
      await disconnectDB();
      process.exit(1);
    });
}

import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Plot from '../src/models/Plot.js';
import Cycle from '../src/models/Cycle.js';
import Expense from '../src/models/Expense.js';
import Harvest from '../src/models/Harvest.js';
import Price from '../src/models/Price.js';

import { runSeed } from '../src/seed/seed.js';

let farmerToken = '';
let adminToken = '';
let farmerId = '';
let testPlotId = '';
let testCycleId = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB();
  const existingFarmer = await User.findOne({ phone: '8888888888' });
  if (!existingFarmer) {
    await runSeed();
  }
  // Clean up any previous test artifacts
  await User.deleteMany({ phone: '7777777777' });
  await Plot.deleteMany({ clientId: 'plot-uuid-test-123' });
});

afterAll(async () => {
  await disconnectDB();
});

describe('1. Authentication & Role-Based Authorization', () => {
  it('FR-AUTH-01: should register a new farmer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ravi Kumar',
        phone: '7777777777',
        password: 'Password@123',
        language: 'te',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.phone).toBe('7777777777');
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should allow two users with different phones and no email to both register successfully', async () => {
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Farmer One',
        phone: '7770000001',
        password: 'Password@123',
      });
    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Farmer Two',
        phone: '7770000002',
        password: 'Password@123',
      });
    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.user.phone).toBe('7770000002');

    // Clean up
    await User.deleteMany({ phone: { $in: ['7770000001', '7770000002'] } });
  });

  it('should return 409 with friendly phone message when registering the same phone number twice', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Phone Farmer',
        phone: '7777777777',
        password: 'Password@123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('This mobile number is already registered. Please log in.');
    expect(res.body.message).not.toMatch(/record|unique key|E11000|email/i);
  });

  it('should run stale index cleanup without errors idempotently', async () => {
    const { cleanStaleUserIndexes } = await import('../src/config/db.js');
    await expect(cleanStaleUserIndexes()).resolves.not.toThrow();
    await expect(cleanStaleUserIndexes()).resolves.not.toThrow();
  });

  it('FR-AUTH-01: should reject registration with invalid phone or short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid',
        phone: '123',
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('FR-AUTH-02: should login existing farmer', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '8888888888',
        password: 'Farmer@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    farmerToken = res.body.data.accessToken;
    farmerId = res.body.data.user.id;
  });

  it('FR-AUTH-02: should login admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '9999999999',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
    adminToken = res.body.data.accessToken;
  });

  it('FR-AUTH-04: should guard admin routes from farmer', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(403);
  });

  it('FR-AUTH-04: should allow admin to access admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.userCount).toBeGreaterThan(0);
  });

  it('FR-AUTH-06: should get and patch profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);

    const patchRes = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ storageCostPerQuintalPerDay: 3.5 });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.storageCostPerQuintalPerDay).toBe(3.5);
  });
});

describe('2. Plots, Cycles, Expenses & Harvests CRUD', () => {
  it('should create a plot with clientId idempotency (FR-IDEM-01)', async () => {
    const clientId = 'plot-uuid-test-123';
    const res1 = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'South Field',
        areaAcres: 1.5,
        soilType: 'black',
        village: 'Warangal',
        clientId,
      });

    expect(res1.status).toBe(201);
    testPlotId = res1.body.data._id;

    // Idempotent duplicate call with same clientId
    const res2 = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'South Field Modified',
        areaAcres: 1.5,
        soilType: 'black',
        village: 'Warangal',
        clientId,
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data._id).toBe(testPlotId);
  });

  it('should create a cycle for the plot', async () => {
    const clientId = 'cycle-uuid-test-123';
    const res = await request(app)
      .post('/api/cycles')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        plotId: testPlotId,
        crop: 'మిరప (Chilli)',
        season: 'Rabi',
        year: 2026,
        sowingDate: '2026-01-10',
        status: 'active',
        clientId,
      });

    expect(res.status).toBe(201);
    testCycleId = res.body.data._id;
  });

  it('FR-PLOT-01: deleting plot with active cycle should return 409', async () => {
    const res = await request(app)
      .delete(`/api/plots/${testPlotId}`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(409);
  });

  it('should log expense and harvest for the cycle', async () => {
    const expRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        cycleId: testCycleId,
        category: 'fertilizer',
        item: 'Urea bag',
        amount: 900,
        source: 'voice',
        clientId: 'exp-uuid-123',
      });

    expect(expRes.status).toBe(201);

    const harvRes = await request(app)
      .post('/api/harvests')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        cycleId: testCycleId,
        quantityQuintals: 10,
        pricePerQuintal: 15000,
        buyer: 'Spices Mandi',
        market: 'Warangal',
        closeCycle: true,
      });

    expect(harvRes.status).toBe(201);

    // Verify cycle is now harvested (FR-CYC-02)
    const cycleRes = await request(app)
      .get(`/api/cycles/${testCycleId}`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(cycleRes.body.data.status).toBe('harvested');
  });

  it('FR-CYC-01: deleting a cycle cascades deletion of expenses and harvests', async () => {
    const res = await request(app)
      .delete(`/api/cycles/${testCycleId}`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);

    const expCheck = await Expense.find({ cycleId: testCycleId });
    expect(expCheck.length).toBe(0);

    const harvCheck = await Harvest.find({ cycleId: testCycleId });
    expect(harvCheck.length).toBe(0);
  });
});

describe('3. Analytics Aggregation Pipelines (FR-AN-01 to 05)', () => {
  it('FR-AN-01: should return summary across cycles', async () => {
    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalExpense).toBeGreaterThan(0);
    expect(res.body.data.totalRevenue).toBeGreaterThan(0);
    expect(res.body.data.netProfit).toBeDefined();
    expect(res.body.data.profitPerAcre).toBeDefined();
  });

  it('FR-AN-03: should return expense breakdown by category', async () => {
    const res = await request(app)
      .get('/api/analytics/expense-breakdown')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('category');
    expect(res.body.data[0]).toHaveProperty('total');
  });

  it('FR-AN-04: should return season comparison', async () => {
    const res = await request(app)
      .get('/api/analytics/season-comparison')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('crop');
    expect(res.body.data[0]).toHaveProperty('profit');
  });

  it('FR-AN-05: should return monthly expense history', async () => {
    const res = await request(app)
      .get('/api/analytics/monthly-expense')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('4. Sell-Time Advisor Logic (FR-ADV-01)', () => {
  it('should compute advisor decision based on forecast and storage cost', async () => {
    const res = await request(app)
      .get('/api/prices/advisor?commodity=Paddy&market=Warangal&quantity=50&storageCost=2')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('action');
    expect(['WAIT', 'SELL_NOW']).toContain(res.body.data.action);
    expect(res.body.data).toHaveProperty('currentPrice');
    expect(res.body.data).toHaveProperty('bestPrice');
    expect(res.body.data).toHaveProperty('confidence');
  });
});

describe('5. PDF Report & Admin CSV Upload', () => {
  it('FR-PDF-01: should stream PDF report for a cycle', async () => {
    const cyclesRes = await request(app)
      .get('/api/cycles')
      .set('Authorization', `Bearer ${farmerToken}`);

    const cycleId = cyclesRes.body.data[0]._id;

    const res = await request(app)
      .get(`/api/reports/cycle/${cycleId}/pdf`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.length).toBeGreaterThan(500);
  });

  it('FR-PR-03: should upload price CSV via admin', async () => {
    const csvContent =
      'commodity,market,district,state,date,min_price,max_price,modal_price\n' +
      'Paddy,Warangal,Warangal,Telangana,2026-10-12,2100,2300,2250\n';

    const res = await request(app)
      .post('/api/admin/prices/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvContent), 'test_prices.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
  });
});

describe('6. Prices Metadata & Combinations (FR-PR-02)', () => {
  it('FR-PR-02: should return only commodities and markets with actual price data', async () => {
    const res = await request(app).get('/api/prices/meta');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.commodities).toContain('Paddy');
    expect(res.body.data.commodities).toContain('Cotton');
    expect(res.body.data.markets).toContain('Warangal');
    expect(res.body.data.markets).toContain('Khammam');

    // Combinations map
    expect(res.body.data.combinations).toBeDefined();
    expect(res.body.data.combinations.Paddy).toContain('Warangal');
    expect(res.body.data.combinations.Paddy).toContain('Khammam');
  });

  it('should return price history for Paddy in Warangal', async () => {
    const res = await request(app).get('/api/prices?commodity=Paddy&market=Warangal&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].commodity).toBe('Paddy');
    expect(res.body.data[0].market).toBe('Warangal');
  });

  it('should handle forecast cleanly with fallback when ML service is offline', async () => {
    const res = await request(app)
      .get('/api/prices/forecast?commodity=Paddy&market=Warangal&horizon=14')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.points.length).toBe(14);
    expect(res.body.data.commodity).toBe('Paddy');
    expect(res.body.data.market).toBe('Warangal');
  });

  it('should return 404 when requesting forecast for non-existent commodity', async () => {
    const res = await request(app)
      .get('/api/prices/forecast?commodity=NonExistentCropXYZ&market=Warangal')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('7. System & Database Health Endpoints', async () => {
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');

    const dbHealthRes = await request(app).get('/api/health/db');
    expect(dbHealthRes.status).toBe(200);
    expect(dbHealthRes.body.status).toBe('ok');
    expect(typeof dbHealthRes.body.database).toBe('string');
    expect(dbHealthRes.body.priceDocuments).toBeGreaterThan(0);
    expect(dbHealthRes.body.distinctPairsCount).toBeGreaterThan(0);
    expect(typeof dbHealthRes.body.mlServiceConfigured).toBe('boolean');
    // Ensure no secrets or connection strings are returned
    expect(JSON.stringify(dbHealthRes.body)).not.toMatch(/mongodb(\+srv)?:\/\//);
  });
});


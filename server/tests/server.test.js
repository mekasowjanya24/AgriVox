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

let farmerToken = '';
let adminToken = '';
let farmerId = '';
let testPlotId = '';
let testCycleId = '';

beforeAll(async () => {
  await connectDB();
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

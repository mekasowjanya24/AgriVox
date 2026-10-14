#!/usr/bin/env node

/**
 * AgriVox Automated Smoke Test Script
 * Verifies live deployment or local instance end-to-end.
 *
 * Usage:
 *   npm run smoke
 *   npm run smoke http://localhost:5000
 *   npm run smoke https://agrivox-backend.onrender.com
 */

const rawArgUrl = process.argv[2] || process.env.TEST_API_URL || process.env.VITE_API_URL || 'http://localhost:5000';

// Normalize URLs
const cleanUrl = rawArgUrl.trim().replace(/\/+$/, '');
const API_BASE = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
const ROOT_BASE = cleanUrl.endsWith('/api') ? cleanUrl.slice(0, -4) : cleanUrl;

const results = [];
let passedCount = 0;
let failedCount = 0;

function logResult(name, passed, detail = '') {
  if (passed) {
    passedCount++;
    console.log(` \x1b[32mPASS\x1b[0m \x1b[1m${name}\x1b[0m ${detail ? `\x1b[90m(${detail})\x1b[0m` : ''}`);
    results.push({ name, status: 'PASS', detail });
  } else {
    failedCount++;
    console.log(` \x1b[31mFAIL\x1b[0m \x1b[1m${name}\x1b[0m \x1b[31m- ${detail}\x1b[0m`);
    results.push({ name, status: 'FAIL', detail });
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else if (contentType.includes('application/pdf')) {
    const arrayBuf = await res.arrayBuffer();
    body = Buffer.from(arrayBuf);
  } else {
    body = await res.text();
  }

  return { status: res.status, ok: res.ok, headers: res.headers, body };
}

async function runSmokeTests() {
  console.log('\n============================================================');
  console.log('         AGRIVOX COMPREHENSIVE PRODUCTION SMOKE TEST        ');
  console.log('============================================================');
  console.log(`Target Base URL: \x1b[36m${ROOT_BASE}\x1b[0m`);
  console.log(`API Base URL:    \x1b[36m${API_BASE}\x1b[0m\n`);

  let authToken = null;
  let testUserId = null;
  let testPlotId = null;
  let testCycleId = null;
  let testExpenseId = null;
  let testHarvestId = null;
  const testPhone = `999${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 1. Health Check
  try {
    const res = await request('/health');
    const ok = res.status === 200 && res.body?.status === 'ok';
    logResult('1. Basic Server Health (/api/health)', ok, `status: ${res.status}`);
  } catch (err) {
    logResult('1. Basic Server Health (/api/health)', false, err.message);
  }

  // 2. DB Health Check
  try {
    const res = await request('/health/db');
    const b = res.body || {};
    const hasData = res.status === 200 && b.status === 'ok' && b.priceDocuments > 0 && b.distinctPairsCount > 0;
    const noSecrets = !JSON.stringify(b).includes('mongodb://') && !JSON.stringify(b).includes('mongodb+srv://');
    logResult(
      '2. Database Health & Price Count (/api/health/db)',
      hasData && noSecrets,
      `DB: ${b.database}, Docs: ${b.priceDocuments}, Pairs: ${b.distinctPairsCount}, MLConfigured: ${b.mlServiceConfigured}`
    );
  } catch (err) {
    logResult('2. Database Health & Price Count (/api/health/db)', false, err.message);
  }

  // 3. Price Metadata
  let combinations = {};
  let commodities = [];
  try {
    const res = await request('/prices/meta');
    const data = res.body?.data || {};
    commodities = data.commodities || [];
    combinations = data.combinations || {};
    const valid = res.status === 200 && commodities.length > 0 && Object.keys(combinations).length > 0;
    logResult(
      '3. Mandi Prices Metadata (/api/prices/meta)',
      valid,
      `Crops: ${commodities.length}, Markets: ${(data.markets || []).length}`
    );
  } catch (err) {
    logResult('3. Mandi Prices Metadata (/api/prices/meta)', false, err.message);
  }

  // 4. Prices for each combination
  try {
    let allCombosOk = true;
    let checkedCount = 0;
    for (const crop of commodities) {
      const mkts = combinations[crop] || [];
      for (const mkt of mkts) {
        checkedCount++;
        const res = await request(`/prices?commodity=${encodeURIComponent(crop)}&market=${encodeURIComponent(mkt)}&limit=10`);
        const prices = res.body?.data || [];
        if (res.status !== 200 || !Array.isArray(prices) || prices.length === 0) {
          allCombosOk = false;
        }
      }
    }
    logResult(
      '4. Historical Mandi Prices for All Combinations (/api/prices)',
      allCombosOk && checkedCount > 0,
      `Verified ${checkedCount} valid crop-market pairs have price records`
    );
  } catch (err) {
    logResult('4. Historical Mandi Prices for All Combinations (/api/prices)', false, err.message);
  }

  // 5. Forecast & Advisor for each combination
  try {
    let forecastOk = true;
    let advisorOk = true;
    let testedCombos = 0;
    for (const crop of commodities.slice(0, 3)) {
      const mkts = (combinations[crop] || []).slice(0, 2);
      for (const mkt of mkts) {
        testedCombos++;
        const fRes = await request(`/prices/forecast?commodity=${encodeURIComponent(crop)}&market=${encodeURIComponent(mkt)}&horizon=14`);
        if (fRes.status !== 200 || !fRes.body?.data?.points || fRes.body.data.points.length === 0) {
          forecastOk = false;
        }

        const aRes = await request(`/prices/advisor?commodity=${encodeURIComponent(crop)}&market=${encodeURIComponent(mkt)}&quantity=50&storageCost=2`);
        if (aRes.status !== 200 || !['WAIT', 'SELL'].includes(aRes.body?.data?.action)) {
          advisorOk = false;
        }
      }
    }
    logResult(
      '5a. 14-Day Price Forecast with Fallback (/api/prices/forecast)',
      forecastOk && testedCombos > 0,
      `Tested ${testedCombos} combos`
    );
    logResult(
      '5b. Smart Sell Advisor (/api/prices/advisor)',
      advisorOk && testedCombos > 0,
      `Tested ${testedCombos} combos`
    );
  } catch (err) {
    logResult('5. Forecast & Advisor', false, err.message);
  }

  // 6. Register Test Farmer
  try {
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        phone: testPhone,
        password: 'Password123!',
        name: 'SmokeTest Farmer',
        language: 'te',
      }),
    });

    if (regRes.status === 201 && regRes.body?.data?.accessToken) {
      authToken = regRes.body.data.accessToken;
      testUserId = regRes.body.data.user?.id || regRes.body.data.user?._id;
      logResult('6. Register Test Farmer (/api/auth/register)', true, `Phone: ${testPhone}`);
    } else {
      logResult('6. Register Test Farmer (/api/auth/register)', false, `Status: ${regRes.status}`);
    }
  } catch (err) {
    logResult('6. Register Test Farmer (/api/auth/register)', false, err.message);
  }

  // 7. Login Test Farmer
  try {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        phone: testPhone,
        password: 'Password123!',
      }),
    });

    if (loginRes.status === 200 && loginRes.body?.data?.accessToken) {
      authToken = loginRes.body.data.accessToken;
      logResult('7. Login Test Farmer (/api/auth/login)', true, 'Token received');
    } else {
      logResult('7. Login Test Farmer (/api/auth/login)', false, `Status: ${loginRes.status}`);
    }
  } catch (err) {
    logResult('7. Login Test Farmer (/api/auth/login)', false, err.message);
  }

  const authHeaders = { Authorization: `Bearer ${authToken}` };

  // 8. Create Plot
  try {
    const plotRes = await request('/plots', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Smoke Test North Field',
        areaAcres: 4.5,
        soilType: 'black',
        village: 'Warangal Rural',
      }),
    });

    testPlotId = plotRes.body?.data?._id;
    logResult('8. Create Farm Plot (/api/plots)', plotRes.status === 201 && !!testPlotId, `Plot ID: ${testPlotId}`);
  } catch (err) {
    logResult('8. Create Farm Plot (/api/plots)', false, err.message);
  }

  // 9. Create Crop Cycle
  try {
    const cycleRes = await request('/cycles', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        plotId: testPlotId,
        crop: 'Paddy',
        season: 'Kharif',
        year: 2026,
        sowingDate: '2026-06-15',
      }),
    });

    testCycleId = cycleRes.body?.data?._id;
    logResult('9. Create Crop Cycle (/api/cycles)', cycleRes.status === 201 && !!testCycleId, `Cycle ID: ${testCycleId}`);
  } catch (err) {
    logResult('9. Create Crop Cycle (/api/cycles)', false, err.message);
  }

  // 10. Record Expense
  try {
    const expRes = await request('/expenses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        cycleId: testCycleId,
        item: 'Urea Fertilizer 50kg',
        category: 'fertilizer',
        amount: 2400,
        date: '2026-07-01',
      }),
    });

    testExpenseId = expRes.body?.data?._id;
    logResult('10. Record Expense (/api/expenses)', expRes.status === 201 && !!testExpenseId, `Expense ID: ${testExpenseId}`);
  } catch (err) {
    logResult('10. Record Expense (/api/expenses)', false, err.message);
  }

  // 11. Record Harvest Sale
  try {
    const harvRes = await request('/harvests', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        cycleId: testCycleId,
        quantityQuintals: 30,
        pricePerQuintal: 2300,
        buyer: 'Warangal Mandi Buyer',
        market: 'Warangal',
        date: '2026-10-01',
        closeCycle: true,
      }),
    });

    testHarvestId = harvRes.body?.data?._id;
    logResult('11. Record Harvest Sale (/api/harvests)', harvRes.status === 201 && !!testHarvestId, `Harvest ID: ${testHarvestId}`);
  } catch (err) {
    logResult('11. Record Harvest Sale (/api/harvests)', false, err.message);
  }

  // 12. Analytics Summary & Cycle
  try {
    const sumRes = await request('/analytics/summary', { headers: authHeaders });
    const cycRes = await request(`/analytics/cycle/${testCycleId}`, { headers: authHeaders });
    const valid = sumRes.status === 200 && sumRes.body?.data?.totalExpense >= 2400 && cycRes.status === 200;
    logResult(
      '12. Farm Analytics Summary & Breakdown (/api/analytics)',
      valid,
      `Profit: Rs ${cycRes.body?.data?.netProfit}, Revenue: Rs ${cycRes.body?.data?.totalRevenue}`
    );
  } catch (err) {
    logResult('12. Farm Analytics Summary & Breakdown (/api/analytics)', false, err.message);
  }

  // 13. Season Farm Report PDF Generation
  try {
    const pdfRes = await request(`/reports/cycle/${testCycleId}/pdf`, { headers: authHeaders });
    const isPdf = pdfRes.status === 200 && Buffer.isBuffer(pdfRes.body) && pdfRes.body.length > 500;
    logResult('13. Generate Cycle Report PDF (/api/reports/cycle/:id/pdf)', isPdf, `PDF Size: ${pdfRes.body?.length || 0} bytes`);
  } catch (err) {
    logResult('13. Generate Cycle Report PDF (/api/reports/cycle/:id/pdf)', false, err.message);
  }

  // 14. Sync Pull
  try {
    const syncRes = await request('/sync/pull?lastSyncAt=2020-01-01T00:00:00.000Z', { headers: authHeaders });
    const d = syncRes.body?.data || {};
    const valid = syncRes.status === 200 && Array.isArray(d.plots) && Array.isArray(d.expenses);
    logResult('14. Offline Sync Pull (/api/sync/pull)', valid, `Plots: ${d.plots?.length}, Expenses: ${d.expenses?.length}`);
  } catch (err) {
    logResult('14. Offline Sync Pull (/api/sync/pull)', false, err.message);
  }

  // 15. Cleanup Test Data
  try {
    let cleaned = true;
    if (testExpenseId) await request(`/expenses/${testExpenseId}`, { method: 'DELETE', headers: authHeaders });
    if (testHarvestId) await request(`/harvests/${testHarvestId}`, { method: 'DELETE', headers: authHeaders });
    if (testCycleId) await request(`/cycles/${testCycleId}`, { method: 'DELETE', headers: authHeaders });
    if (testPlotId) {
      const delPlot = await request(`/plots/${testPlotId}`, { method: 'DELETE', headers: authHeaders });
      if (delPlot.status !== 200) cleaned = false;
    }
    logResult('15. Test Data Cascade Cleanup', cleaned, 'Removed temporary test entities');
  } catch (err) {
    logResult('15. Test Data Cascade Cleanup', false, err.message);
  }

  // Summary
  console.log('\n------------------------------------------------------------');
  console.log(`TOTAL CHECKS: ${passedCount + failedCount} | \x1b[32mPASSED: ${passedCount}\x1b[0m | \x1b[31mFAILED: ${failedCount}\x1b[0m`);
  console.log('------------------------------------------------------------\n');

  if (failedCount > 0) {
    console.error(`\x1b[31mSmoke test completed with ${failedCount} failure(s).\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log('\x1b[32mAll smoke test assertions PASSED successfully!\x1b[0m\n');
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke test runner failed:', err);
  process.exit(1);
});

AgriVox: Software Requirements Specification

Version: 1.0 | Companion document: AgriVox PRD

Instruction to the builder: Implement everything in this document and the PRD, frontend and backend, completely. Do not leave stubs, TODOs, or mock data in production code paths. Use the exact names, routes, and schemas below.

1. Architecture

Three deployable units:

client/: React 18 + Vite PWA

server/: Node.js + Express REST API + MongoDB (Mongoose)

ml-service/: Flask service for price forecasting

Flow: Client calls Server at /api. Server calls ML service at ML_SERVICE_URL for forecasts. Client stores writes in IndexedDB first and syncs to Server when online.

2. Folder Structure

agrivox/  client/src/{api,components,pages,hooks,db,i18n,utils,context}  client/public/{icons,manifest}  server/src/{config,models,routes,controllers,middleware,services,jobs,utils,seed}  server/tests/  ml-service/{app.py,forecast.py,requirements.txt}  data/prices_seed.csv  docs/{PRD.md,SRS.md}  README.md

3. Environment Variables

server/.env: PORT=5000, MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL, ML_SERVICE_URL, AGMARKNET_API_KEY (optional), NODE_ENV

client/.env: VITE_API_URL

ml-service: PORT=8000

4. Data Models (Mongoose)

All collections have createdAt and updatedAt (timestamps: true). Models that the client can create offline carry a clientId (UUID string) with a unique sparse compound index on (userId, clientId).

User

name (String, required), phone (String, unique, required, 10 digits), passwordHash (String), role (farmer | admin, default farmer), language (en | te, default te), storageCostPerQuintalPerDay (Number, default 2), isActive (Boolean, default true)

Plot

userId (ref User), name, areaAcres (Number > 0), soilType (red | black | sandy | loamy | clay), village, district, clientId

Cycle

userId, plotId (ref Plot), crop (String), season (Kharif | Rabi | Summer), year (Number), sowingDate (Date), expectedHarvestDate (Date), status (active | harvested | closed, default active), clientId

Expense

userId, cycleId (ref Cycle), category (seeds | fertilizer | pesticide | labour | irrigation | machinery | transport | other), item (String), amount (Number > 0), date (Date), note (String), source (manual | voice), clientId

Harvest

userId, cycleId (ref Cycle, unique per cycle allows multiple sales: do not enforce unique), quantityQuintals (Number > 0), pricePerQuintal (Number > 0), buyer (String), market (String), date (Date), clientId

Price

commodity, market, district, state, date, minPrice, maxPrice, modalPrice (Numbers, INR per quintal). Unique index on (commodity, market, date).

Forecast

commodity, market, generatedAt (Date), horizonDays (Number), points [{date, predicted, lower, upper}], model (String), mape (Number)

RefreshToken

userId, tokenHash, expiresAt (TTL index)

5. Functional Requirements

5.1 Authentication

FR-AUTH-01: POST /api/auth/register validates name, phone, password (min 6 chars), hashes with bcrypt (10 rounds), returns user and tokens.

FR-AUTH-02: POST /api/auth/login verifies credentials, rejects inactive users, returns a 15-minute access JWT and sets a 7-day refresh token as httpOnly cookie.

FR-AUTH-03: POST /api/auth/refresh issues a new access token. POST /api/auth/logout clears the refresh token.

FR-AUTH-04: Middleware authRequired validates JWT. Middleware roleRequired('admin') guards admin routes.

FR-AUTH-05: Every farmer query is filtered by req.user.id. Access to another user's document returns 404.

FR-AUTH-06: GET /api/auth/me returns the profile. PATCH /api/auth/me updates name, language, storageCostPerQuintalPerDay.

5.2 Plots, Cycles, Expenses, Harvests (CRUD)

Each resource supports: create, list (pagination with page and limit, search, filters), get one, update, delete. Validation with zod on every body.

FR-PLOT-01: Deleting a plot with any active cycle returns 409.

FR-CYC-01: Deleting a cycle also deletes its expenses and harvests (transaction or sequential cleanup).

FR-CYC-02: Creating a harvest sets cycle status to harvested if the farmer passes closeCycle=true.

FR-EXP-01: List supports filters cycleId, category, from, to, source.

FR-IDEM-01: Create endpoints accept clientId. If a document with the same (userId, clientId) exists, return it with 200 instead of creating a duplicate.

5.3 Analytics (MongoDB aggregation pipelines)

FR-AN-01: GET /api/analytics/summary returns totalExpense, totalRevenue, netProfit, profitPerAcre across all the farmer's cycles.

FR-AN-02: GET /api/analytics/cycle/:id returns expense total, revenue total, profit, profitPerAcre, and expense totals by category.

FR-AN-03: GET /api/analytics/expense-breakdown?cycleId= returns [{category, total}] using $group.

FR-AN-04: GET /api/analytics/season-comparison returns [{crop, season, year, expense, revenue, profit, profitPerAcre}] using $lookup of expenses and harvests, $group, and $project.

FR-AN-05: GET /api/analytics/monthly-expense returns [{month, total}] for the last 12 months.

Profit pipeline: start from cycles ($match userId), $lookup plots for area, $lookup expenses, $lookup harvests, $addFields totalExpense = sum of expenses.amount, totalRevenue = sum of (harvests.quantityQuintals * harvests.pricePerQuintal), profit = totalRevenue - totalExpense, profitPerAcre = profit / plot.areaAcres.

5.4 Voice Expense Parsing

Client-side module utils/voiceParser.js. Input: transcript string and language. Output: {item, amount, category, confidence}.

FR-VOICE-01: Use window.SpeechRecognition or webkitSpeechRecognition with lang te-IN or en-IN. If unsupported, hide the mic and show the manual form.

FR-VOICE-02: Amount extraction order: (a) digits in text, (b) Telugu or English number words. Support Telugu words: ఒకటి 1, రెండు 2, మూడు 3, నాలుగు 4, ఐదు 5, ఆరు 6, ఏడు 7, ఎనిమిది 8, తొమ్మిది 9, పది 10, వంద 100, వెయ్యి or వేలు 1000. Support English words: one to nine, ten, hundred, thousand. Handle patterns like 'two thousand' and 'రెండు వేలు' as 2000.

FR-VOICE-03: Category keyword map. fertilizer: urea, DAP, potash, ఎరువు, యూరియా. seeds: seed, విత్తనాలు. pesticide: pesticide, spray, పురుగుమందు. labour: labour, labor, coolie, కూలీ. irrigation: water, diesel, motor, నీరు. machinery: tractor, ట్రాక్టర్. transport: transport, lorry, రవాణా. Default: other.

FR-VOICE-04: Item is the transcript with amount and currency words (rupees, rs, రూపాయలు) removed.

FR-VOICE-05: Show a confirm card with editable item, amount, category, cycle. Save with source=voice only after the farmer taps Confirm.

Required test sentences (unit tests): 'bought urea 2000 rupees', 'paid labour 1500', 'seeds 3500 rupees', 'యూరియా రెండు వేలు', 'కూలీ 1500 రూపాయలు', 'diesel for motor 800', 'pesticide spray two thousand', 'tractor 1200', 'transport 600 rupees', 'ఎరువు 2500'.

5.5 Offline-First and Sync

FR-OFF-01: vite-plugin-pwa with Workbox. Precache app shell. Runtime cache for GET /api responses (StaleWhileRevalidate). Provide manifest with name AgriVox, theme color green, icons 192 and 512, display standalone.

FR-OFF-02: Dexie database 'agrivox' with tables: plots, cycles, expenses, harvests, outbox, meta. Reads render from IndexedDB first, then refresh from the server.

FR-OFF-03: Every create, update, delete first writes to IndexedDB and appends an outbox entry {id, entity, op, clientId, payload, createdAt, attempts}. New documents get clientId = crypto.randomUUID().

FR-OFF-04: Sync engine runs on app start, on the window 'online' event, and every 30 seconds while online. It sends outbox entries in order. On success it removes the entry and stores the server _id. On network error it retries with backoff. On 4xx validation error it moves the entry to a failed state and shows it to the user.

FR-OFF-05: POST /api/sync/pull?since=ISO returns all the farmer's documents changed after the timestamp so a second device converges. Conflict rule: last write wins by updatedAt.

FR-OFF-06: Sync badge shows Online, Offline, Syncing, and pending count.

FR-OFF-07: Login state and last-synced data stay available offline. Admin screens need network.

5.6 Prices, Forecast, Advisor

FR-PR-01: GET /api/prices?commodity=&market=&from=&to= returns price history.

FR-PR-02: GET /api/prices/meta returns distinct commodities and markets.

FR-PR-03: POST /api/admin/prices/upload (admin, multipart CSV with columns commodity, market, district, state, date, min_price, max_price, modal_price) upserts rows by the unique index and returns counts of inserted and updated.

FR-PR-04: POST /api/admin/prices/fetch calls the Agmarknet open data API when AGMARKNET_API_KEY exists. Without a key it loads data/prices_seed.csv. A node-cron job runs daily at 02:00 IST doing the same.

FR-FC-01: GET /api/forecast?commodity=&market=&horizon=14 returns the stored forecast if generated within 24 hours. Otherwise the server sends the last 365 days of modal prices to the ML service, stores the response, and returns it.

FR-FC-02: ML service POST /forecast accepts {series: [{date, price}], horizon}. Model: statsmodels SARIMAX or ExponentialSmoothing (Holt-Winters) chosen by lowest AIC on a holdout. If fewer than 30 points exist, fall back to a 7-day moving average with fixed 5 percent band. Returns {points: [{date, predicted, lower, upper}], model, mape}. MAPE computed on the last 14 days holdout. GET /health returns ok.

FR-ADV-01: GET /api/advisor?commodity=&market=&quantity= computes for each forecast day d from 0 to horizon: netGain(d) = predicted(d) - currentPrice - storageCostPerQuintalPerDay * d. Let best be the day with maximum netGain. If maxGain is greater than 3 percent of currentPrice then action = WAIT with waitDays = best.d, else action = SELL_NOW. Return {action, waitDays, expectedGainPerQuintal, expectedTotalGain (times quantity), currentPrice, bestPrice, confidence} where confidence is High if mape < 8, Medium if below 15, else Low.

5.7 PDF Report

FR-PDF-01: GET /api/reports/cycle/:id/pdf streams a PDF built with pdfkit: title, farmer name, plot, crop, season, dates, expense table, expense by category, harvest table, totals, net profit, profit per acre, generated date. Telugu text requires embedding Noto Sans Telugu font from server/assets/fonts.

5.8 Admin

FR-ADM-01: GET /api/admin/users (search, pagination). PATCH /api/admin/users/:id toggles isActive.

FR-ADM-02: GET /api/admin/stats returns user count, plot count, cycle count, total expenses logged, last price date, last forecast date.

FR-ADM-03: POST /api/admin/forecast/retrain?commodity=&market= forces regeneration.

5.9 Internationalization

FR-I18N-01: react-i18next with locales en.json and te.json covering every visible string, including validation messages and category names. Language toggle in header and Settings, saved to user profile and localStorage.

FR-I18N-02: Use Intl.NumberFormat('en-IN') for amounts and format dates by locale. Load Noto Sans Telugu web font.

6. REST API Summary

Auth: POST /api/auth/register, /login, /refresh, /logout. GET and PATCH /api/auth/me

Plots: GET, POST /api/plots. GET, PUT, DELETE /api/plots/:id

Cycles: GET, POST /api/cycles. GET, PUT, DELETE /api/cycles/:id

Expenses: GET, POST /api/expenses. GET, PUT, DELETE /api/expenses/:id

Harvests: GET, POST /api/harvests. GET, PUT, DELETE /api/harvests/:id

Analytics: GET /api/analytics/summary, /cycle/:id, /expense-breakdown, /season-comparison, /monthly-expense

Sync: GET /api/sync/pull?since=

Prices: GET /api/prices, /api/prices/meta

Forecast and advisor: GET /api/forecast, /api/advisor

Reports: GET /api/reports/cycle/:id/pdf

Admin: GET /api/admin/users, PATCH /api/admin/users/:id, GET /api/admin/stats, POST /api/admin/prices/upload, /prices/fetch, /forecast/retrain

Standard response format: success returns {success: true, data, meta?}. Errors return {success: false, message, errors?} with correct HTTP codes (400, 401, 403, 404, 409, 500).

7. Frontend Routes

/login, /register, / (dashboard), /plots, /plots/new, /plots/:id, /cycles, /cycles/new, /cycles/:id, /expenses/add, /harvests/add, /reports, /prices, /settings, /admin/users, /admin/prices, /admin/stats. Protected routes redirect to /login. Admin routes require role admin.

8. Non-Functional Requirements

Security: helmet, CORS restricted to CLIENT_URL, express-rate-limit (100 requests per 15 min per IP, 10 per 15 min on login), input sanitization (express-mongo-sanitize), no secrets in repo, passwords never returned.

Performance: indexes on userId, cycleId, (commodity, market, date). Lists paginated. API p95 under 500 ms on seeded data. Client bundle code-split per route.

Reliability: global error handler, async wrapper, graceful shutdown, ML service timeout of 15 seconds with a clear error and fallback to the last stored forecast.

Usability: mobile-first, touch targets 48px or larger, WCAG AA contrast, loading, empty, and error states on every page.

Compatibility: latest Chrome and Edge on Android and desktop. Voice features need Chrome.

Maintainability: ESLint and Prettier, consistent naming, JSDoc on services, README.

9. Seed Data

npm run seed in server creates: admin (phone 9999999999, password Admin@123), farmer (phone 8888888888, password Farmer@123), 2 plots, 3 cycles (paddy, cotton, maize), 20 or more expenses across categories, 2 harvests, and loads data/prices_seed.csv. The seed CSV must hold at least 2 years of daily modal prices for paddy, cotton, and maize in 2 markets each (realistic synthetic values with seasonal pattern if real data is unavailable; label as synthetic in README).

10. Testing Requirements

Server (Jest + Supertest): auth flow, role guard, ownership isolation, CRUD for each resource, idempotent create by clientId, each analytics endpoint against seeded numbers, advisor logic with fixed inputs, CSV upload.

Client (Vitest + React Testing Library): voice parser with the 10 required sentences, outbox queue logic, i18n key coverage (en and te have identical keys), sync badge states.

ML service (pytest): /forecast returns horizon points, fallback path with fewer than 30 points, MAPE present.

Manual offline test: disable network, add 5 expenses, reconnect, verify exactly 5 server documents.

11. Deployment

MongoDB Atlas free cluster with network access allowed.

ml-service on Render (gunicorn app:app). server on Render (node src/index.js). client on Vercel with SPA rewrite to index.html.

Set environment variables on each platform. Add the deployed client URL to CLIENT_URL.

Provide Dockerfiles and a docker-compose.yml for local run of all three services plus MongoDB.

12. Acceptance Checklist

Register, login, logout, refresh work. Farmer cannot read another farmer's data.

Full CRUD for plots, cycles, expenses, harvests in UI and API.

Dashboard numbers match aggregation endpoints and manual calculation.

Voice entry works for all 10 test sentences with a confirm card.

Offline add and edit works, sync is exact, no duplicates.

App is installable and Lighthouse PWA score is 90 or higher.

Forecast chart, MAPE, and advisor recommendation display and react to storage cost.

PDF report downloads with correct totals.

Telugu and English complete across all screens.

Admin can manage users, upload prices, retrain forecast, see stats.

All tests pass. README has setup, env variables, API list, screenshots, and deployed links.
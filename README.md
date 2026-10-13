# AgriVox (అగ్రివాక్స్)

> **Voice-First, Offline-First Farm Finance & Mandi Market Advisory Platform for Small Farmers.**
>
> A farmer speaks an expense in Telugu or English (e.g., *"యూరియా రెండు వేలు"* or *"bought urea 2000 rupees"*), the app automatically logs it, computes net profit per acre, forecasts mandi prices over a 14-day horizon, and provides intelligent **Sell Now** or **Wait N Days** recommendations based on storage costs.

---

## 🌟 Key Features (F1 - F13)

- **F1. Authentication & RBAC**: Farmer and Admin authentication via 10-digit mobile number and secure JWT tokens (15-min access token + 7-day httpOnly refresh token cookie).
- **F2. Plot Management**: Full CRUD for land plots with acreage, soil type (red, black, sandy, loamy, clay), village, and district. Guarded against deleting plots with active crop cycles.
- **F3. Crop Cycle Management**: Track multi-season cycles (Kharif, Rabi, Summer), sowing dates, harvest dates, and live profit figures.
- **F4. Expense Logging**: Manual and categorized tracking across seeds, fertilizer, pesticide, labour, irrigation, machinery, transport, and other.
- **F5. Voice Expense Entry**: Speech recognition in Telugu (`te-IN`) and English (`en-IN`) with client-side NLP parser for number words (*రెండు వేలు*, *వేలు*, *thousand*), category classification, and confirmation review card.
- **F6. Harvest & Sales Tracking**: Log sales in quintals, price per quintal, trader/buyer, and mandi market.
- **F7. Profit Dashboard**: Real-time aggregation pipelines calculating total expenses, total revenue, net profit, and profit per acre. Clean Recharts visualizations (expense breakdown pie, crop-wise profit bar, season comparison).
- **F8. Offline-First PWA**: Built with Vite PWA, Workbox runtime caching, Dexie (IndexedDB), and optimistic background sync outbox. Complete offline entry with zero duplicates.
- **F9. Mandi Price Forecasting**: Flask ML microservice running Holt-Winters Exponential Smoothing & SARIMAX models with 7-day moving average fallback and 95% confidence intervals. Displays MAPE model error.
- **F10. Sell-Time Advisor**: Dynamic calculation:
  $$\text{NetGain}(d) = \text{PredictedPrice}(d) - \text{CurrentPrice} - (\text{StorageCost} \times d)$$
  Recommends **Sell Now** or **Wait N Days** based on expected gain threshold (>3%) and farmer-adjustable storage costs.
- **F11. Season Report PDF**: On-the-fly PDF generation using `pdfkit` embedded with *Noto Sans Telugu* font for authentic bilingual reports.
- **F12. Bilingual Telugu/English UI**: 100% key parity across all strings, default Telugu interface, and instant toggle.
- **F13. Admin Management Panel**: Manage farmer accounts, upload price CSV files, trigger Agmarknet price fetches, retrain ML models, and review platform statistics.

---

## 🏗️ Architecture & Tech Stack

```
agrivox/
├── client/          # React 18 + Vite PWA + Tailwind CSS + Dexie + Recharts + react-i18next
├── server/          # Node.js + Express + Mongoose + JWT + pdfkit + node-cron + Zod
├── ml-service/      # Python + Flask + statsmodels + pandas + scikit-learn
├── data/            # Synthetic 2-year daily modal price dataset (prices_seed.csv)
├── docs/            # PRD.md and SRS.md
└── docker-compose.yml
```

| Component | Technologies |
|---|---|
| **Client (PWA)** | React 18, Vite, Tailwind CSS, Dexie (IndexedDB), Recharts, react-i18next, Lucide React, vite-plugin-pwa |
| **Server (API)** | Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs, Zod, PDFKit, node-cron, multer, csv-parse |
| **ML Microservice** | Python 3.11+, Flask, statsmodels, pandas, numpy, scipy, pytest |
| **Database** | MongoDB (with local/Atlas URI support & automatic in-memory fallback) |

> **Dataset Notice**: `data/prices_seed.csv` contains realistic synthetic daily modal prices (2024 to late 2026) for Paddy, Cotton, and Maize across Telangana markets (Warangal and Khammam), modeled with seasonal agricultural cycles.

---

## 🚀 Quick Start & Local Execution

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- MongoDB (or uses MongoDB Atlas / local MongoDB daemon)

### 1. Backend Server Setup
```bash
cd server
npm install
npm run seed     # Seeds demo admin, demo farmer, plots, cycles, expenses, harvests, and prices
npm run dev      # Runs server on http://localhost:5000
```

### 2. ML Forecasting Service Setup
```bash
cd ml-service
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python app.py    # Runs Flask service on http://localhost:8000
```

### 3. Frontend Client Setup
```bash
cd client
npm install
npm run dev      # Runs React PWA on http://localhost:3000
```

---

## 🐳 Docker Deployment

Run all services together with Docker Compose:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- ML Service: `http://localhost:8000`
- MongoDB: `localhost:27017`

---

## 🔑 Demo Credentials

| Role | Mobile Number | Password |
|---|---|---|
| **Farmer (రైతు)** | `8888888888` | `Farmer@123` |
| **Admin (అడ్మిన్)** | `9999999999` | `Admin@123` |

---

## 📡 REST API Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new farmer
- `POST /api/auth/login` - Login with phone & password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Clear refresh cookie
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update language or storage cost

### Plots & Cycles (`/api/plots`, `/api/cycles`)
- `GET /api/plots` & `POST /api/plots` - List and create plots (supports `clientId` idempotency)
- `GET /api/plots/:id` & `DELETE /api/plots/:id` - Plot details / safe deletion (blocks if cycles active)
- `GET /api/cycles` & `POST /api/cycles` - List and start crop cycles
- `GET /api/cycles/:id` & `DELETE /api/cycles/:id` - Cycle details & cascade deletion

### Expenses & Harvests (`/api/expenses`, `/api/harvests`)
- `GET /api/expenses` & `POST /api/expenses` - Filter by category, date range, source (`voice`/`manual`)
- `GET /api/harvests` & `POST /api/harvests` - Record yield sales with auto-close cycle option

### Analytics & Sync (`/api/analytics`, `/api/sync`)
- `GET /api/analytics/summary` - Aggregated profit, expense, revenue, profit/acre
- `GET /api/analytics/cycle/:id` - Cycle financial breakdown
- `GET /api/analytics/expense-breakdown` - Grouped by category
- `GET /api/analytics/season-comparison` - Multi-season comparison
- `GET /api/analytics/monthly-expense` - Last 12 months expense trend
- `GET /api/sync/pull?since=ISO` - Incremental sync for offline clients

### Prices, Forecast & Advisor (`/api/prices`)
- `GET /api/prices?commodity=&market=` - Price history
- `GET /api/prices/meta` - Available commodities and markets
- `GET /api/prices/forecast` - 14-day price prediction with confidence band
- `GET /api/prices/advisor` - Sell Now vs Wait N Days recommendation

### Reports & Admin (`/api/reports`, `/api/admin`)
- `GET /api/reports/cycle/:id/pdf` - Stream styled bilingual PDF report
- `GET /api/admin/stats` - Platform metrics
- `GET /api/admin/users` & `PATCH /api/admin/users/:id` - Manage users
- `POST /api/admin/prices/upload` - Multipart CSV upload
- `POST /api/admin/prices/fetch` - Agmarknet price sync
- `POST /api/admin/forecast/retrain` - Retrain forecasting model

---

## 🧪 Testing

### Server Test Suite (Jest + Supertest)
```bash
cd server
npm test
```
*Covers authentication, role guards, ownership isolation, CRUD operations, 409 plot deletion guard, cascade cycle deletion, idempotency, analytics pipelines, advisor calculation, and PDF report streaming.*

### Client Test Suite (Vitest)
```bash
cd client
npm test
```
*Covers the 10 required voice parsing sentences, i18n key parity between Telugu and English, and IndexedDB outbox queue logic.*

### ML Forecasting Test Suite (pytest)
```bash
cd ml-service
pytest test_forecast.py
```
*Covers 14-day forecast generation, Holt-Winters/SARIMAX selection, moving average fallback, and MAPE calculations.*

---

## 🌐 Production Deployment Guide

- **Frontend**: Deploy to Vercel with SPA routing rewrite (`vercel.json` pointing all routes to `index.html`).
- **Backend API**: Deploy to Render as a Web Service (`node src/index.js`), set `CLIENT_URL` and `ML_SERVICE_URL`.
- **ML Service**: Deploy to Render as a Web Service (`gunicorn app:app`).
- **Database**: MongoDB Atlas M0 Free Cluster.

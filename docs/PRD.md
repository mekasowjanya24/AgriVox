AgriVox: Product Requirements Document

Version: 1.0 | Owner: Sow | Type: Lab external project (MERN + Flask microservice)

1. Product Summary

AgriVox is an offline-first, voice-driven farm finance and market platform for small farmers. A farmer says an expense in Telugu or English, the app logs it, calculates profit per acre, forecasts mandi prices, and advises when to sell.

2. Problem

Small farmers keep no reliable records, so they cannot tell which crop made money.

They sell without price insight and often at the wrong time.

Rural internet is poor, and typing in English is a barrier.

3. Goals and Non-Goals

Goals

Record an expense by voice in under 10 seconds.

Show profit/loss per crop cycle and per acre.

Work fully offline and sync automatically with no duplicates.

Give a Sell Now or Wait recommendation backed by a price forecast.

Full Telugu and English UI.

Non-Goals (v1)

Payments, loans, e-commerce

Farmer group pooling

Native mobile apps (PWA only)

Image-based disease detection

4. Users

Farmer (primary): 35-60 years old, Telugu-speaking, low digital literacy, Android phone, patchy internet. Needs big buttons, voice input, minimal typing.

Admin (secondary): Project owner or agri officer. Manages users, uploads or refreshes mandi price data, triggers forecasts, views platform stats.

5. Features and Acceptance Criteria

F1. Authentication (P0)

Register and login with phone number and password. Roles: farmer, admin.

Acceptance: wrong password is rejected, protected routes need a valid token, farmers can never see another farmer's data.

F2. Plot Management (P0)

Create, view, edit, delete plots with name, area in acres, soil type, village, district.

Acceptance: a plot with active cycles cannot be deleted.

F3. Crop Cycle Management (P0)

Create a cycle for a plot with crop, season (Kharif, Rabi, Summer), year, sowing date, expected harvest date. Status: active, harvested, closed.

Acceptance: cycle detail page shows expenses, harvest, and live profit figure.

F4. Expense Logging (P0)

Add expense manually: category, item, amount, date, note.

Categories: seeds, fertilizer, pesticide, labour, irrigation, machinery, transport, other.

Acceptance: edit and delete work, list supports filter by category and date range.

F5. Voice Expense Entry (P0)

Mic button records speech in Telugu or English, converts to text, parses item, amount, category, and shows a confirm card before saving.

Example: 'bought urea 2000 rupees' gives Fertilizer, urea, 2000.

Acceptance: at least 8 of 10 test sentences parse correctly. Farmer can correct any field before saving. If speech is unsupported, the manual form is shown.

F6. Harvest and Sales (P0)

Record quantity in quintals, price per quintal, buyer, market, date.

Acceptance: saving a harvest updates cycle profit immediately.

F7. Profit Dashboard (P0)

Cards: total expense, total revenue, net profit, profit per acre.

Charts: expense breakdown pie, crop-wise profit bar, season comparison bar.

Acceptance: numbers are computed with MongoDB aggregation pipelines and match manual calculation.

F8. Offline-First PWA (P0)

Installable app. All farmer screens work offline. Writes are queued locally and synced when network returns.

Acceptance: with network off, adding 5 expenses succeeds. After reconnect, all 5 appear on the server exactly once.

F9. Price Data and Forecast (P1)

Price history per commodity and market. 14-day forecast with confidence band.

Acceptance: forecast chart shows history plus prediction. Model error (MAPE) is displayed.

F10. Sell-Time Advisor (P1)

Compares forecast prices with the farmer's storage cost per day and outputs Sell Now or Wait N days with expected extra gain.

Acceptance: changing storage cost changes the recommendation.

F11. Season Report PDF (P1)

Download a PDF report of a cycle: details, expenses table, harvest, profit summary.

Acceptance: PDF opens correctly and totals match the dashboard.

F12. Language Toggle (P0)

Telugu and English across all screens, remembered per user.

F13. Admin Panel (P1)

User list with enable/disable, price CSV upload, fetch latest prices, trigger forecast retrain, platform stats.

6. Key User Flows

First use: Register, choose language, add plot, create cycle.

Daily: Open app, tap mic, say expense, confirm, saved (even offline).

Harvest: Open cycle, add harvest, see profit.

Selling decision: Open Prices, select crop and market, read forecast and advisor.

Season end: Open cycle, download PDF.

7. Screens

Login, Register, Dashboard, Plots list and form, Cycles list and detail, Add Expense (voice and manual), Harvest form, Reports, Prices and Forecast, Settings (language, storage cost, sync status), Admin: Users, Price Data, Stats.

8. UX Requirements

Mobile-first, large touch targets (minimum 48px), high contrast, icons with labels.

Persistent sync status badge: Online, Offline, Syncing, Pending count.

Every voice result requires confirmation before saving.

Currency shown in INR with Indian number grouping.

9. Tech Stack

Frontend: React 18, Vite, React Router, Tailwind CSS, Recharts, Dexie (IndexedDB), react-i18next, vite-plugin-pwa

Backend: Node.js, Express, Mongoose, MongoDB Atlas, JWT, bcrypt, zod, pdfkit, node-cron, multer, csv-parse

ML service: Python, Flask, pandas, statsmodels

Deploy: Vercel (frontend), Render (backend and ML service), MongoDB Atlas

10. Build Milestones

M1: Project scaffold, config, MongoDB connection, auth

M2: Plots, cycles, expenses, harvests (API and UI)

M3: Aggregation analytics and dashboard charts

M4: i18n (Telugu and English)

M5: Voice entry and parser

M6: PWA, IndexedDB, offline sync

M7: Prices, Flask forecast service, sell advisor

M8: PDF report, admin panel

M9: Tests, seed data, README, deployment

11. Success Metrics

All P0 and P1 acceptance criteria pass.

Lighthouse PWA score of 90 or higher.

API p95 response under 500 ms on seeded data.

Zero duplicate records after offline sync tests.

Voice parsing: 8 of 10 test sentences correct.

12. Risks and Mitigations

Telugu speech recognition quality varies: always show confirm card, keep manual form as fallback.

Government price API needs a key or may be down: ship a seeded CSV dataset and CSV upload as fallback.

Free-tier cold starts on Render: show loading state, keep ML calls asynchronous and cached.

Scope creep: pooling and disease detection are out of scope.

13. Definition of Done

Everything in sections 5 and 10 is working end to end, frontend and backend.

Seed script creates demo admin, demo farmer, 2 plots, 3 cycles, expenses, harvests, and 2 years of price history.

README with setup steps, env variables, API list, and screenshots.

Deployed links for frontend, backend, and ML service.
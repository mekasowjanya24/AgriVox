import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import Price from './models/Price.js';

import authRoutes from './routes/authRoutes.js';
import plotRoutes from './routes/plotRoutes.js';
import cycleRoutes from './routes/cycleRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import harvestRoutes from './routes/harvestRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import priceRoutes from './routes/priceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security Middleware
app.use(helmet());

// Configured origins for CORS (supports FRONTEND_URL and legacy CLIENT_URL, comma-separated)
const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
]
  .filter(Boolean)
  .flatMap((url) => url.split(',').map((u) => u.trim().replace(/\/+$/, '')));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Check against configured frontend URLs (e.g. https://your-project.vercel.app)
      if (configuredOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow local development and Vercel preview deployments
      if (
        normalizedOrigin.startsWith('http://localhost:') ||
        normalizedOrigin.startsWith('http://127.0.0.1:') ||
        normalizedOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      // Allow in development mode
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize inputs against MongoDB injection
app.use(mongoSanitize());

// General rate limiter: high headroom with local development exclusion
const isDev = process.env.NODE_ENV !== 'production';
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 2000,
  skip: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return isDev || ip === '127.0.0.1' || ip === '::1' || ip.endsWith('127.0.0.1');
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// Rate limiter on login: 50 per 15 min, skip in local dev
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 50,
  skip: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return isDev || ip === '127.0.0.1' || ip === '::1' || ip.endsWith('127.0.0.1');
  },
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Health check endpoints
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', service: 'agrivox-server' });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const dbName = mongoose.connection.name || (mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown');
    const priceDocuments = await Price.countDocuments();
    const distinctPairs = await Price.aggregate([
      { $group: { _id: { commodity: '$commodity', market: '$market' } } },
      { $count: 'count' },
    ]);
    const distinctPairsCount = distinctPairs[0]?.count || 0;
    const mlServiceConfigured = Boolean(process.env.ML_SERVICE_URL && process.env.ML_SERVICE_URL.trim());

    res.status(200).json({
      status: 'ok',
      database: dbName,
      priceDocuments,
      distinctPairsCount,
      mlServiceConfigured,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database health check failed',
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/plots', plotRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/harvests', harvestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;

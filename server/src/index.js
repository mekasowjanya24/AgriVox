import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB, cleanStaleUserIndexes } from './config/db.js';
import { startPriceSyncJob } from './jobs/priceSyncJob.js';

import Price from './models/Price.js';
import { fetchPricesFromAgmarknetOrSeed } from './services/priceService.js';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    await connectDB();
    await cleanStaleUserIndexes();
    startPriceSyncJob();

    // Auto-seed initial Mandi price data on cloud startup if database is newly provisioned
    try {
      const priceCount = await Price.countDocuments();
      if (priceCount === 0) {
        console.log('[AgriVox Server] Initializing fresh database with Mandi price data...');
        const seedResult = await fetchPricesFromAgmarknetOrSeed();
        console.log('[AgriVox Server] Auto-seed completed successfully:', seedResult);
      } else {
        console.log(`[AgriVox Server] Database already initialized with ${priceCount} price records.`);
      }
    } catch (seedErr) {
      console.warn('[AgriVox Server] Notice: Could not auto-seed prices on startup:', seedErr.message);
    }

    const server = app.listen(PORT, HOST, () => {
      console.log(`[AgriVox Server] Running on http://${HOST}:${PORT}`);
    });

    // Graceful shutdown
    const handleShutdown = async (signal) => {
      console.log(`[AgriVox Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[AgriVox Server] Database disconnected and server stopped.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('[AgriVox Server] Failed to start:', error);
    process.exit(1);
  }
};

startServer();

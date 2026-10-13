import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { startPriceSyncJob } from './jobs/priceSyncJob.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    startPriceSyncJob();

    const server = app.listen(PORT, () => {
      console.log(`[AgriVox Server] Running on http://localhost:${PORT}`);
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

import cron from 'node-cron';
import { fetchPricesFromAgmarknetOrSeed } from '../services/priceService.js';

export const startPriceSyncJob = () => {
  // Daily at 02:00 IST
  cron.schedule(
    '0 2 * * *',
    async () => {
      console.log('[Cron] Running scheduled daily price sync at 02:00 IST...');
      try {
        const result = await fetchPricesFromAgmarknetOrSeed();
        console.log('[Cron] Price sync completed successfully:', result);
      } catch (err) {
        console.error('[Cron] Price sync failed:', err.message);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );
  console.log('[Cron] Scheduled daily price sync job initialized for 02:00 IST.');
};

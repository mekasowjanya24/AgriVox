import { Router } from 'express';
import {
  getPrices,
  getPriceMeta,
  getForecast,
  getAdvisor,
  keepWarm,
} from '../controllers/priceController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// Prices and meta can be publicly viewable or authenticated
router.get('/meta', getPriceMeta);
router.get('/keep-warm', keepWarm);
router.get('/', getPrices);

// Forecast & advisor
router.get('/forecast', authRequired, getForecast);
router.get('/advisor', authRequired, getAdvisor);

export default router;

import { Router } from 'express';
import {
  getSummary,
  getCycleAnalytics,
  getExpenseBreakdown,
  getSeasonComparison,
  getMonthlyExpense,
} from '../controllers/analyticsController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

router.get('/summary', getSummary);
router.get('/cycle/:id', getCycleAnalytics);
router.get('/expense-breakdown', getExpenseBreakdown);
router.get('/season-comparison', getSeasonComparison);
router.get('/monthly-expense', getMonthlyExpense);

export default router;

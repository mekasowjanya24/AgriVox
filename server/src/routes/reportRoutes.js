import { Router } from 'express';
import { getCycleReportPDF } from '../controllers/reportController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

router.get('/cycle/:id/pdf', getCycleReportPDF);

export default router;

import { Router } from 'express';
import multer from 'multer';
import {
  getUsers,
  toggleUserStatus,
  getStats,
  uploadPriceCSV,
  fetchPrices,
  retrainForecast,
} from '../controllers/adminController.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(authRequired, roleRequired('admin'));

router.get('/users', getUsers);
router.patch('/users/:id', toggleUserStatus);
router.get('/stats', getStats);
router.post('/prices/upload', upload.single('file'), uploadPriceCSV);
router.post('/prices/fetch', fetchPrices);
router.post('/forecast/retrain', retrainForecast);

export default router;

import { Router } from 'express';
import { pullSync } from '../controllers/syncController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

router.get('/pull', pullSync);
router.post('/pull', pullSync);

export default router;

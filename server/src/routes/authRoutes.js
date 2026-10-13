import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  registerSchema,
  loginSchema,
  updateMeSchema,
} from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

router.get('/me', authRequired, getMe);
router.patch('/me', authRequired, validate(updateMeSchema), updateMe);

export default router;

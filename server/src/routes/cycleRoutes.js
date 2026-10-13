import { Router } from 'express';
import {
  getCycles,
  getCycleById,
  createCycle,
  updateCycle,
  deleteCycle,
  cycleCreateSchema,
  cycleUpdateSchema,
} from '../controllers/cycleController.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authRequired);

router.get('/', getCycles);
router.post('/', validate(cycleCreateSchema), createCycle);
router.get('/:id', getCycleById);
router.put('/:id', validate(cycleUpdateSchema), updateCycle);
router.delete('/:id', deleteCycle);

export default router;

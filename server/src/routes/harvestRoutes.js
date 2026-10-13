import { Router } from 'express';
import {
  getHarvests,
  getHarvestById,
  createHarvest,
  updateHarvest,
  deleteHarvest,
  harvestCreateSchema,
  harvestUpdateSchema,
} from '../controllers/harvestController.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authRequired);

router.get('/', getHarvests);
router.post('/', validate(harvestCreateSchema), createHarvest);
router.get('/:id', getHarvestById);
router.put('/:id', validate(harvestUpdateSchema), updateHarvest);
router.delete('/:id', deleteHarvest);

export default router;

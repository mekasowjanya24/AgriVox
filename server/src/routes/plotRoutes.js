import { Router } from 'express';
import {
  getPlots,
  getPlotById,
  createPlot,
  updatePlot,
  deletePlot,
  plotCreateSchema,
  plotUpdateSchema,
} from '../controllers/plotController.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authRequired);

router.get('/', getPlots);
router.post('/', validate(plotCreateSchema), createPlot);
router.get('/:id', getPlotById);
router.put('/:id', validate(plotUpdateSchema), updatePlot);
router.delete('/:id', deletePlot);

export default router;

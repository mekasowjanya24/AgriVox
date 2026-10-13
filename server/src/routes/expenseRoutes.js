import { Router } from 'express';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  expenseCreateSchema,
  expenseUpdateSchema,
} from '../controllers/expenseController.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authRequired);

router.get('/', getExpenses);
router.post('/', validate(expenseCreateSchema), createExpense);
router.get('/:id', getExpenseById);
router.put('/:id', validate(expenseUpdateSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;

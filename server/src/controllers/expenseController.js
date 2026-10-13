import { z } from 'zod';
import Expense from '../models/Expense.js';
import Cycle from '../models/Cycle.js';

export const expenseCreateSchema = z.object({
  cycleId: z.string().min(1, 'Cycle ID is required'),
  category: z.enum([
    'seeds',
    'fertilizer',
    'pesticide',
    'labour',
    'irrigation',
    'machinery',
    'transport',
    'other',
  ]),
  item: z.string().min(1, 'Item description is required').trim(),
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string().or(z.date()).optional(),
  note: z.string().optional(),
  source: z.enum(['manual', 'voice']).optional(),
  clientId: z.string().optional(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

export const getExpenses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const { cycleId, category, from, to, source, search } = req.query;

    const query = { userId: req.user._id };

    if (cycleId) query.cycleId = cycleId;
    if (category) query.category = category;
    if (source) query.source = source;
    if (search) query.item = { $regex: search, $options: 'i' };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('cycleId', 'crop season year')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: expenses,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id }).populate('cycleId');
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const { cycleId, category, item, amount, date, note, source, clientId } = req.body;

    const cycle = await Cycle.findOne({ _id: cycleId, userId: req.user._id });
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    // FR-IDEM-01
    if (clientId) {
      const existing = await Expense.findOne({ userId: req.user._id, clientId }).populate('cycleId');
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          idempotent: true,
        });
      }
    }

    const expense = await Expense.create({
      userId: req.user._id,
      cycleId,
      category,
      item,
      amount,
      date: date ? new Date(date) : new Date(),
      note: note || '',
      source: source || 'manual',
      clientId,
    });

    const populated = await Expense.findById(expense._id).populate('cycleId');

    return res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (req.body.cycleId) {
      const cycle = await Cycle.findOne({ _id: req.body.cycleId, userId: req.user._id });
      if (!cycle) {
        return res.status(404).json({
          success: false,
          message: 'Cycle not found',
        });
      }
    }

    Object.assign(expense, req.body);
    await expense.save();

    const populated = await Expense.findById(expense._id).populate('cycleId');

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    await Expense.deleteOne({ _id: expense._id });

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

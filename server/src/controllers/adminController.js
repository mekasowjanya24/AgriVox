import User from '../models/User.js';
import Plot from '../models/Plot.js';
import Cycle from '../models/Cycle.js';
import Expense from '../models/Expense.js';
import Price from '../models/Price.js';
import Forecast from '../models/Forecast.js';
import {
  parseAndUpsertPriceCSV,
  fetchPricesFromAgmarknetOrSeed,
  getOrGenerateForecast,
} from '../services/priceService.js';

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: users,
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

export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.body.isActive !== undefined) {
      user.isActive = req.body.isActive;
    } else {
      user.isActive = !user.isActive;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const [
      userCount,
      plotCount,
      cycleCount,
      expensesAgg,
      lastPriceDoc,
      lastForecastDoc,
    ] = await Promise.all([
      User.countDocuments(),
      Plot.countDocuments(),
      Cycle.countDocuments(),
      Expense.aggregate([
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Price.findOne().sort({ date: -1 }).select('date'),
      Forecast.findOne().sort({ generatedAt: -1 }).select('generatedAt'),
    ]);

    const totalExpensesAmount = expensesAgg[0]?.totalAmount || 0;
    const totalExpensesCount = expensesAgg[0]?.count || 0;

    return res.status(200).json({
      success: true,
      data: {
        userCount,
        plotCount,
        cycleCount,
        totalExpensesLogged: totalExpensesCount,
        totalExpensesAmount,
        lastPriceDate: lastPriceDoc?.date || null,
        lastForecastDate: lastForecastDoc?.generatedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadPriceCSV = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required',
      });
    }

    const result = await parseAndUpsertPriceCSV(req.file.buffer);

    return res.status(200).json({
      success: true,
      data: result,
      message: `Processed ${result.total} records. Inserted: ${result.inserted}, Updated: ${result.updated}`,
    });
  } catch (error) {
    next(error);
  }
};

export const fetchPrices = async (req, res, next) => {
  try {
    const result = await fetchPricesFromAgmarknetOrSeed();
    return res.status(200).json({
      success: true,
      data: result,
      message: `Prices refreshed successfully from ${result.source}`,
    });
  } catch (error) {
    next(error);
  }
};

export const retrainForecast = async (req, res, next) => {
  try {
    const { commodity, market } = req.query;

    if (!commodity || !market) {
      return res.status(400).json({
        success: false,
        message: 'Commodity and market query parameters are required',
      });
    }

    const forecast = await getOrGenerateForecast(commodity, market, 14, true);

    return res.status(200).json({
      success: true,
      data: forecast,
      message: 'Forecast regenerated successfully',
    });
  } catch (error) {
    next(error);
  }
};

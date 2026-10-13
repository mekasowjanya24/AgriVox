import mongoose from 'mongoose';
import Cycle from '../models/Cycle.js';
import Expense from '../models/Expense.js';

export const getSummary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Run aggregation pipeline for overall summary
    const cyclesAgg = await Cycle.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'plots',
          localField: 'plotId',
          foreignField: '_id',
          as: 'plot',
        },
      },
      { $unwind: { path: '$plot', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'cycleId',
          as: 'expenses',
        },
      },
      {
        $lookup: {
          from: 'harvests',
          localField: '_id',
          foreignField: 'cycleId',
          as: 'harvests',
        },
      },
      {
        $project: {
          plotArea: { $ifNull: ['$plot.areaAcres', 1] },
          cycleExpense: { $sum: '$expenses.amount' },
          cycleRevenue: {
            $sum: {
              $map: {
                input: '$harvests',
                as: 'h',
                in: { $multiply: ['$$h.quantityQuintals', '$$h.pricePerQuintal'] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: '$cycleExpense' },
          totalRevenue: { $sum: '$cycleRevenue' },
          totalArea: { $sum: '$plotArea' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalExpense = 0;
    let totalRevenue = 0;
    let totalArea = 1;

    if (cyclesAgg.length > 0) {
      totalExpense = cyclesAgg[0].totalExpense || 0;
      totalRevenue = cyclesAgg[0].totalRevenue || 0;
      totalArea = cyclesAgg[0].totalArea || 1;
    }

    const netProfit = totalRevenue - totalExpense;
    const profitPerAcre = totalArea > 0 ? netProfit / totalArea : netProfit;

    return res.status(200).json({
      success: true,
      data: {
        totalExpense: Math.round(totalExpense * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitPerAcre: Math.round(profitPerAcre * 100) / 100,
        totalArea: Math.round(totalArea * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCycleAnalytics = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const cycleId = new mongoose.Types.ObjectId(req.params.id);

    const agg = await Cycle.aggregate([
      { $match: { _id: cycleId, userId } },
      {
        $lookup: {
          from: 'plots',
          localField: 'plotId',
          foreignField: '_id',
          as: 'plot',
        },
      },
      { $unwind: { path: '$plot', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'cycleId',
          as: 'expenses',
        },
      },
      {
        $lookup: {
          from: 'harvests',
          localField: '_id',
          foreignField: 'cycleId',
          as: 'harvests',
        },
      },
      {
        $project: {
          crop: 1,
          season: 1,
          year: 1,
          status: 1,
          plotArea: { $ifNull: ['$plot.areaAcres', 1] },
          plotName: '$plot.name',
          totalExpense: { $sum: '$expenses.amount' },
          totalRevenue: {
            $sum: {
              $map: {
                input: '$harvests',
                as: 'h',
                in: { $multiply: ['$$h.quantityQuintals', '$$h.pricePerQuintal'] },
              },
            },
          },
          expenses: 1,
        },
      },
    ]);

    if (!agg || agg.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    const data = agg[0];
    const netProfit = data.totalRevenue - data.totalExpense;
    const profitPerAcre = data.plotArea > 0 ? netProfit / data.plotArea : netProfit;

    // Category breakdown
    const categoryTotals = {};
    for (const exp of data.expenses || []) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }
    const categoryBreakdown = Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      total: Math.round(total * 100) / 100,
    }));

    return res.status(200).json({
      success: true,
      data: {
        cycleId: data._id,
        crop: data.crop,
        season: data.season,
        year: data.year,
        status: data.status,
        plotName: data.plotName,
        plotArea: data.plotArea,
        totalExpense: Math.round(data.totalExpense * 100) / 100,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitPerAcre: Math.round(profitPerAcre * 100) / 100,
        categoryBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseBreakdown = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const match = { userId };

    if (req.query.cycleId) {
      match.cycleId = new mongoose.Types.ObjectId(req.query.cycleId);
    }

    const breakdown = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total: { $round: ['$total', 2] },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
};

export const getSeasonComparison = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const comparison = await Cycle.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'plots',
          localField: 'plotId',
          foreignField: '_id',
          as: 'plot',
        },
      },
      { $unwind: { path: '$plot', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'cycleId',
          as: 'expenses',
        },
      },
      {
        $lookup: {
          from: 'harvests',
          localField: '_id',
          foreignField: 'cycleId',
          as: 'harvests',
        },
      },
      {
        $project: {
          crop: 1,
          season: 1,
          year: 1,
          plotArea: { $ifNull: ['$plot.areaAcres', 1] },
          expense: { $sum: '$expenses.amount' },
          revenue: {
            $sum: {
              $map: {
                input: '$harvests',
                as: 'h',
                in: { $multiply: ['$$h.quantityQuintals', '$$h.pricePerQuintal'] },
              },
            },
          },
        },
      },
      {
        $project: {
          crop: 1,
          season: 1,
          year: 1,
          expense: { $round: ['$expense', 2] },
          revenue: { $round: ['$revenue', 2] },
          profit: { $round: [{ $subtract: ['$revenue', '$expense'] }, 2] },
          profitPerAcre: {
            $round: [
              {
                $cond: [
                  { $gt: ['$plotArea', 0] },
                  { $divide: [{ $subtract: ['$revenue', '$expense'] }, '$plotArea'] },
                  { $subtract: ['$revenue', '$expense'] },
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { year: -1, season: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyExpense = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthly = await Expense.aggregate([
      {
        $match: {
          userId,
          date: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          total: { $round: ['$total', 2] },
        },
      },
      { $sort: { month: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: monthly,
    });
  } catch (error) {
    next(error);
  }
};

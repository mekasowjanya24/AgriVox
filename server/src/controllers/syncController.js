import Plot from '../models/Plot.js';
import Cycle from '../models/Cycle.js';
import Expense from '../models/Expense.js';
import Harvest from '../models/Harvest.js';

export const pullSync = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sinceStr = req.query.since || req.body?.since;
    const sinceDate = sinceStr ? new Date(sinceStr) : new Date(0);

    const [plots, cycles, expenses, harvests] = await Promise.all([
      Plot.find({ userId, updatedAt: { $gte: sinceDate } }),
      Cycle.find({ userId, updatedAt: { $gte: sinceDate } }).populate('plotId', 'name areaAcres soilType'),
      Expense.find({ userId, updatedAt: { $gte: sinceDate } }),
      Harvest.find({ userId, updatedAt: { $gte: sinceDate } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        plots,
        cycles,
        expenses,
        harvests,
        serverTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

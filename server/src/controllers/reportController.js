import Cycle from '../models/Cycle.js';
import Expense from '../models/Expense.js';
import Harvest from '../models/Harvest.js';
import { generateCyclePDF } from '../services/pdfReportService.js';

export const getCycleReportPDF = async (req, res, next) => {
  try {
    const cycle = await Cycle.findOne({ _id: req.params.id, userId: req.user._id }).populate('plotId');
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Crop cycle not found',
      });
    }

    const expenses = await Expense.find({ cycleId: cycle._id, userId: req.user._id }).sort({ date: -1 });
    const harvests = await Harvest.find({ cycleId: cycle._id, userId: req.user._id }).sort({ date: -1 });

    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalRevenue = harvests.reduce((sum, h) => sum + ((h.quantityQuintals || 0) * (h.pricePerQuintal || 0)), 0);
    const netProfit = totalRevenue - totalExpense;
    const plotArea = cycle.plotId?.areaAcres || 1;
    const profitPerAcre = plotArea > 0 ? netProfit / plotArea : netProfit;

    const cycleData = {
      ...cycle.toObject(),
      expenses,
      harvests,
      totalExpense,
      totalRevenue,
      netProfit,
      profitPerAcre: Math.round(profitPerAcre * 100) / 100,
    };

    const pdfBuffer = await generateCyclePDF(cycleData, req.user);

    const safeCrop = (cycle.crop || 'Crop').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `AgriVox_Cycle_${safeCrop}_${cycle.season || 'Season'}_${cycle.year || 'Year'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

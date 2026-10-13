import { z } from 'zod';
import Cycle from '../models/Cycle.js';
import Plot from '../models/Plot.js';
import Expense from '../models/Expense.js';
import Harvest from '../models/Harvest.js';

export const cycleCreateSchema = z.object({
  plotId: z.string().min(1, 'Plot ID is required'),
  crop: z.string().min(1, 'Crop is required').trim(),
  season: z.enum(['Kharif', 'Rabi', 'Summer']),
  year: z.number().int().min(2000),
  sowingDate: z.string().or(z.date()),
  expectedHarvestDate: z.string().or(z.date()).optional().nullable(),
  status: z.enum(['active', 'harvested', 'closed']).optional(),
  clientId: z.string().optional(),
});

export const cycleUpdateSchema = cycleCreateSchema.partial();

export const getCycles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const plotId = req.query.plotId;
    const status = req.query.status;
    const crop = req.query.crop;

    const query = { userId: req.user._id };
    if (plotId) query.plotId = plotId;
    if (status) query.status = status;
    if (crop) query.crop = { $regex: crop, $options: 'i' };

    const total = await Cycle.countDocuments(query);
    const cycles = await Cycle.find(query)
      .populate('plotId', 'name areaAcres soilType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: cycles,
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

export const getCycleById = async (req, res, next) => {
  try {
    const cycle = await Cycle.findOne({ _id: req.params.id, userId: req.user._id }).populate('plotId');
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    // Include quick totals for expenses and harvests
    const expenses = await Expense.find({ cycleId: cycle._id, userId: req.user._id }).sort({ date: -1 });
    const harvests = await Harvest.find({ cycleId: cycle._id, userId: req.user._id }).sort({ date: -1 });

    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalRevenue = harvests.reduce((sum, h) => sum + ((h.quantityQuintals || 0) * (h.pricePerQuintal || 0)), 0);
    const netProfit = totalRevenue - totalExpense;
    const plotArea = cycle.plotId?.areaAcres || 1;
    const profitPerAcre = plotArea > 0 ? (netProfit / plotArea) : netProfit;

    return res.status(200).json({
      success: true,
      data: {
        ...cycle.toObject(),
        expenses,
        harvests,
        totalExpense,
        totalRevenue,
        netProfit,
        profitPerAcre: Math.round(profitPerAcre * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCycle = async (req, res, next) => {
  try {
    const { plotId, crop, season, year, sowingDate, expectedHarvestDate, status, clientId } = req.body;

    // Validate that plot belongs to user
    const plot = await Plot.findOne({ _id: plotId, userId: req.user._id });
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Associated plot not found',
      });
    }

    // FR-IDEM-01
    if (clientId) {
      const existing = await Cycle.findOne({ userId: req.user._id, clientId }).populate('plotId');
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          idempotent: true,
        });
      }
    }

    const cycle = await Cycle.create({
      userId: req.user._id,
      plotId,
      crop,
      season,
      year,
      sowingDate: new Date(sowingDate),
      expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : null,
      status: status || 'active',
      clientId,
    });

    const populatedCycle = await Cycle.findById(cycle._id).populate('plotId');

    return res.status(201).json({
      success: true,
      data: populatedCycle,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCycle = async (req, res, next) => {
  try {
    const cycle = await Cycle.findOne({ _id: req.params.id, userId: req.user._id });
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    if (req.body.plotId) {
      const plot = await Plot.findOne({ _id: req.body.plotId, userId: req.user._id });
      if (!plot) {
        return res.status(404).json({
          success: false,
          message: 'Associated plot not found',
        });
      }
    }

    Object.assign(cycle, req.body);
    await cycle.save();

    const populated = await Cycle.findById(cycle._id).populate('plotId');

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCycle = async (req, res, next) => {
  try {
    const cycle = await Cycle.findOne({ _id: req.params.id, userId: req.user._id });
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    // FR-CYC-01: Deleting a cycle cascades expenses and harvests
    await Expense.deleteMany({ cycleId: cycle._id, userId: req.user._id });
    await Harvest.deleteMany({ cycleId: cycle._id, userId: req.user._id });
    await Cycle.deleteOne({ _id: cycle._id });

    return res.status(200).json({
      success: true,
      message: 'Cycle and its expenses and harvests deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

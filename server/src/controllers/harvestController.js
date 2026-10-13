import { z } from 'zod';
import Harvest from '../models/Harvest.js';
import Cycle from '../models/Cycle.js';

export const harvestCreateSchema = z.object({
  cycleId: z.string().min(1, 'Cycle ID is required'),
  quantityQuintals: z.number().positive('Quantity must be greater than 0'),
  pricePerQuintal: z.number().positive('Price per quintal must be greater than 0'),
  buyer: z.string().optional(),
  market: z.string().optional(),
  date: z.string().or(z.date()).optional(),
  clientId: z.string().optional(),
  closeCycle: z.boolean().optional(),
});

export const harvestUpdateSchema = harvestCreateSchema.partial();

export const getHarvests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { cycleId } = req.query;

    const query = { userId: req.user._id };
    if (cycleId) query.cycleId = cycleId;

    const total = await Harvest.countDocuments(query);
    const harvests = await Harvest.find(query)
      .populate('cycleId', 'crop season year')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: harvests,
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

export const getHarvestById = async (req, res, next) => {
  try {
    const harvest = await Harvest.findOne({ _id: req.params.id, userId: req.user._id }).populate('cycleId');
    if (!harvest) {
      return res.status(404).json({
        success: false,
        message: 'Harvest record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: harvest,
    });
  } catch (error) {
    next(error);
  }
};

export const createHarvest = async (req, res, next) => {
  try {
    const { cycleId, quantityQuintals, pricePerQuintal, buyer, market, date, clientId, closeCycle } = req.body;

    const cycle = await Cycle.findOne({ _id: cycleId, userId: req.user._id });
    if (!cycle) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    // FR-IDEM-01
    if (clientId) {
      const existing = await Harvest.findOne({ userId: req.user._id, clientId }).populate('cycleId');
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          idempotent: true,
        });
      }
    }

    const harvest = await Harvest.create({
      userId: req.user._id,
      cycleId,
      quantityQuintals,
      pricePerQuintal,
      buyer: buyer || '',
      market: market || '',
      date: date ? new Date(date) : new Date(),
      clientId,
    });

    // FR-CYC-02: Creating a harvest sets cycle status to harvested if closeCycle=true
    if (closeCycle) {
      cycle.status = 'harvested';
      await cycle.save();
    }

    const populated = await Harvest.findById(harvest._id).populate('cycleId');

    return res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateHarvest = async (req, res, next) => {
  try {
    const harvest = await Harvest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!harvest) {
      return res.status(404).json({
        success: false,
        message: 'Harvest record not found',
      });
    }

    Object.assign(harvest, req.body);
    await harvest.save();

    const populated = await Harvest.findById(harvest._id).populate('cycleId');

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHarvest = async (req, res, next) => {
  try {
    const harvest = await Harvest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!harvest) {
      return res.status(404).json({
        success: false,
        message: 'Harvest record not found',
      });
    }

    await Harvest.deleteOne({ _id: harvest._id });

    return res.status(200).json({
      success: true,
      message: 'Harvest record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

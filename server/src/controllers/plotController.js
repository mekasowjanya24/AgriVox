import { z } from 'zod';
import Plot from '../models/Plot.js';
import Cycle from '../models/Cycle.js';

export const plotCreateSchema = z.object({
  name: z.string().min(1, 'Plot name is required').trim(),
  areaAcres: z.number().positive('Area must be greater than 0'),
  soilType: z.enum(['red', 'black', 'sandy', 'loamy', 'clay']),
  village: z.string().optional(),
  district: z.string().optional(),
  clientId: z.string().optional(),
});

export const plotUpdateSchema = plotCreateSchema.partial();

export const getPlots = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const query = { userId: req.user._id };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await Plot.countDocuments(query);
    const plots = await Plot.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: plots,
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

export const getPlotById = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: plot,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlot = async (req, res, next) => {
  try {
    const { name, areaAcres, soilType, village, district, clientId } = req.body;

    // FR-IDEM-01: Idempotency by clientId
    if (clientId) {
      const existing = await Plot.findOne({ userId: req.user._id, clientId });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          idempotent: true,
        });
      }
    }

    const plot = await Plot.create({
      userId: req.user._id,
      name,
      areaAcres,
      soilType,
      village: village || '',
      district: district || '',
      clientId,
    });

    return res.status(201).json({
      success: true,
      data: plot,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlot = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found',
      });
    }

    Object.assign(plot, req.body);
    await plot.save();

    return res.status(200).json({
      success: true,
      data: plot,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlot = async (req, res, next) => {
  try {
    const plot = await Plot.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found',
      });
    }

    // FR-PLOT-01: Deleting a plot with any active cycle returns 409
    const activeCycles = await Cycle.find({
      plotId: plot._id,
      userId: req.user._id,
      status: 'active',
    });

    if (activeCycles.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete plot with active crop cycles. Close or delete cycles first.',
      });
    }

    await Plot.deleteOne({ _id: plot._id });

    return res.status(200).json({
      success: true,
      message: 'Plot deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

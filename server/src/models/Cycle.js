import mongoose from 'mongoose';

const cycleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plot',
      required: true,
      index: true,
    },
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    season: {
      type: String,
      enum: ['Kharif', 'Rabi', 'Summer'],
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    sowingDate: {
      type: Date,
      required: true,
    },
    expectedHarvestDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'harvested', 'closed'],
      default: 'active',
      index: true,
    },
    clientId: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

cycleSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);

const Cycle = mongoose.model('Cycle', cycleSchema);
export default Cycle;

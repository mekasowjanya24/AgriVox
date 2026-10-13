import mongoose from 'mongoose';

const plotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    areaAcres: {
      type: Number,
      required: true,
      min: [0.01, 'Area must be greater than 0'],
    },
    soilType: {
      type: String,
      enum: ['red', 'black', 'sandy', 'loamy', 'clay'],
      required: true,
    },
    village: {
      type: String,
      trim: true,
      default: '',
    },
    district: {
      type: String,
      trim: true,
      default: '',
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

plotSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);

const Plot = mongoose.model('Plot', plotSchema);
export default Plot;

import mongoose from 'mongoose';

const harvestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cycle',
      required: true,
      index: true,
    },
    quantityQuintals: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than 0'],
    },
    pricePerQuintal: {
      type: Number,
      required: true,
      min: [0.01, 'Price per quintal must be greater than 0'],
    },
    buyer: {
      type: String,
      trim: true,
      default: '',
    },
    market: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
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

harvestSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);
harvestSchema.index({ cycleId: 1, date: -1 });

const Harvest = mongoose.model('Harvest', harvestSchema);
export default Harvest;

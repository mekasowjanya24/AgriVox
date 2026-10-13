import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema(
  {
    commodity: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    market: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    minPrice: {
      type: Number,
      required: true,
    },
    maxPrice: {
      type: Number,
      required: true,
    },
    modalPrice: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

priceSchema.index({ commodity: 1, market: 1, date: 1 }, { unique: true });

const Price = mongoose.model('Price', priceSchema);
export default Price;

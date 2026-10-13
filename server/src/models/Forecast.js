import mongoose from 'mongoose';

const forecastPointSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    predicted: {
      type: Number,
      required: true,
    },
    lower: {
      type: Number,
      required: true,
    },
    upper: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const forecastSchema = new mongoose.Schema(
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
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    horizonDays: {
      type: Number,
      default: 14,
    },
    points: [forecastPointSchema],
    model: {
      type: String,
      default: 'ExponentialSmoothing-HoltWinters',
    },
    mape: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

forecastSchema.index({ commodity: 1, market: 1, generatedAt: -1 });

const Forecast = mongoose.model('Forecast', forecastSchema);
export default Forecast;

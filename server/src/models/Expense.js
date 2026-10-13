import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['seeds', 'fertilizer', 'pesticide', 'labour', 'irrigation', 'machinery', 'transport', 'other'],
      required: true,
      index: true,
    },
    item: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than 0'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['manual', 'voice'],
      default: 'manual',
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

expenseSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);
expenseSchema.index({ cycleId: 1, date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;

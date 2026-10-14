import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['farmer', 'admin'],
      default: 'farmer',
    },
    language: {
      type: String,
      enum: ['en', 'te'],
      default: 'te',
    },
    storageCostPerQuintalPerDay: {
      type: Number,
      default: 2,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

const User = mongoose.model('User', userSchema);
export default User;

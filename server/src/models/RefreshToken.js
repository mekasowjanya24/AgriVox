import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;

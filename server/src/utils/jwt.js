import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_DAYS = 7;

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET || 'agrivox_secret_key_default',
    { expiresIn: ACCESS_EXPIRES_IN }
  );
};

export const generateRefreshToken = () => {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'agrivox_secret_key_default');
};

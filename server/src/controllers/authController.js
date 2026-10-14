import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../utils/jwt.js';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['farmer', 'admin']).optional(),
  language: z.enum(['en', 'te']).optional(),
});

export const loginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  password: z.string().min(1, 'Password is required'),
});

export const updateMeSchema = z.object({
  name: z.string().min(1).trim().optional(),
  language: z.enum(['en', 'te']).optional(),
  storageCostPerQuintalPerDay: z.number().min(0).optional(),
});

export const register = async (req, res, next) => {
  try {
    const { name, phone, password, role, language } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered. Please log in.',
        field: 'phone',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      phone,
      passwordHash,
      role: role || 'farmer',
      language: language || 'te',
    });

    const accessToken = generateAccessToken(user);
    const { token: refreshTokenRaw, tokenHash, expiresAt } = generateRefreshToken();

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshTokenRaw, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          language: user.language,
          storageCostPerQuintalPerDay: user.storageCostPerQuintalPerDay,
        },
        accessToken,
        refreshToken: refreshTokenRaw,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password',
      });
    }

    const accessToken = generateAccessToken(user);
    const { token: refreshTokenRaw, tokenHash, expiresAt } = generateRefreshToken();

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshTokenRaw, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          language: user.language,
          storageCostPerQuintalPerDay: user.storageCostPerQuintalPerDay,
        },
        accessToken,
        refreshToken: refreshTokenRaw,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshTokenRaw = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshTokenRaw) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    const tokenHash = hashToken(refreshTokenRaw);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired or invalid',
      });
    }

    const user = await User.findById(storedToken.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User invalid or inactive',
      });
    }

    const newAccessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          language: user.language,
          storageCostPerQuintalPerDay: user.storageCostPerQuintalPerDay,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshTokenRaw = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshTokenRaw) {
      const tokenHash = hashToken(refreshTokenRaw);
      await RefreshToken.deleteOne({ tokenHash });
    }

    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const { name, language, storageCostPerQuintalPerDay } = req.body;
    const user = await User.findById(req.user._id);

    if (name !== undefined) user.name = name;
    if (language !== undefined) user.language = language;
    if (storageCostPerQuintalPerDay !== undefined) {
      user.storageCostPerQuintalPerDay = storageCostPerQuintalPerDay;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        language: user.language,
        storageCostPerQuintalPerDay: user.storageCostPerQuintalPerDay,
      },
    });
  } catch (error) {
    next(error);
  }
};

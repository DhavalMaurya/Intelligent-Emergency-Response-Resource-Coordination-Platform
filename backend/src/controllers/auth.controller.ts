import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.active) {
      throw new AppError('Account is inactive. Contact supervisor.', 403, 'ACCOUNT_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          badgeNumber: user.badgeNumber,
          department: user.department,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const getDemoAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!env.ENABLE_DEMO_SEEDING || env.NODE_ENV === 'production') {
      return res.json({
        success: true,
        data: { demoEnabled: false, accounts: [] },
      });
    }

    const demoUsers = await User.find({
      email: { $regex: /@ps9\.demo$/ },
    }).select('email name role department badgeNumber');

    res.json({
      success: true,
      data: {
        demoEnabled: true,
        defaultPassword: env.DEMO_SEED_PASSWORD,
        accounts: demoUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

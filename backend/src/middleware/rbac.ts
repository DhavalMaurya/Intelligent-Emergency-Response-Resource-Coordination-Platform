import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.js';
import { AppError } from './errorHandler.js';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Requires one of [${allowedRoles.join(', ')}] role. Current role: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

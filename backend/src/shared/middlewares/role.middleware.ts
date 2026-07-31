import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@/modules/users/user.model';
import { ApiError } from '@/shared/utils/ApiError';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'Insufficient permissions'));
      return;
    }

    next();
  };
}

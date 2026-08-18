import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Role } from '../types/auth.types';

/**
 * Restricts a route to the given roles. Must run after `isAuthenticated`.
 * Usage: router.post('/categories', isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN), createCategory)
 */
export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
};

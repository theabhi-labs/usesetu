import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../services/token.service';
import { User } from '../models/user.model';

/**
 * Verifies the Bearer access token and attaches `req.user`.
 * Also confirms the user still exists, is active, and the token's
 * tokenVersion matches (so refresh-token revocation invalidates old access tokens too).
 */
export const isAuthenticated = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    throw ApiError.unauthorized('Access token missing');
  }

  const payload = verifyAccessToken(token);

  const user = await User.findById(payload.userId).select('isActive tokenVersion role');
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  req.user = {
    userId: payload.userId,
    role: payload.role,
    tokenVersion: payload.tokenVersion,
  };

  next();
});

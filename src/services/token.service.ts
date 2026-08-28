import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtAccessPayload, JwtRefreshPayload } from '../types/auth.types';

export const generateAccessToken = (payload: JwtAccessPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as SignOptions);
};

export const generateRefreshToken = (payload: JwtRefreshPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): JwtAccessPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
};

export const verifyRefreshToken = (token: string): JwtRefreshPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
};

export interface JwtTwoFactorPayload {
  userId: string;
  method?: string;
  action: '2fa_challenge';
}

export const generateTwoFactorToken = (payload: JwtTwoFactorPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '10m',
  } as SignOptions);
};

export const verifyTwoFactorToken = (token: string): JwtTwoFactorPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtTwoFactorPayload;
  if (decoded.action !== '2fa_challenge') {
    throw new Error('Invalid 2FA token action');
  }
  return decoded;
};

export const REFRESH_COOKIE_NAME = 'csc_refresh_token';

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

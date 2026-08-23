import { Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { User } from '../models/user.model';
import { AuditLog } from '../models/auditLog.model';
import { env } from '../config/env';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../services/token.service';
import { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail, sendAccountLockedEmail } from '../services/email.service';
import { generateOtp } from '../utils/generateCode';
import { Role } from '../types/auth.types';

const OTP_EXPIRY_MS = env.OTP_EXPIRY_MINUTES * 60 * 1000;
const LOCK_DURATION_MS = env.ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000;

const logAudit = async (
  userId: string | undefined,
  action: string,
  req: Request,
  description?: string,
) => {
  await AuditLog.create({
    user: userId,
    action,
    module: 'AUTH',
    description,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, mobile, password } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { mobile }] });
  if (existing) throw ApiError.conflict('Email or mobile already registered');

  const otp = generateOtp();

  const user = await User.create({
    name,
    email,
    mobile,
    password,
    role: Role.CUSTOMER,
    otp,
    otpExpiry: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  await sendOtpEmail(email, name, otp);
  await logAudit(String(user._id), 'REGISTER', req, 'New account registered');

  res
    .status(201)
    .json(new ApiResponse(201, { userId: user._id, email: user.email }, 'Registered. Please verify OTP sent to your email.'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/verify-otp
// ---------------------------------------------------------------------------
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+otp +otpExpiry');
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) throw ApiError.badRequest('Email already verified');

  if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
    throw ApiError.badRequest('OTP expired. Please request a new one.');
  }
  if (user.otp !== otp) throw ApiError.badRequest('Invalid OTP');

  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  await sendWelcomeEmail(user.email, user.name);
  await logAudit(String(user._id), 'EMAIL_VERIFIED', req);

  res.status(200).json(new ApiResponse(200, {}, 'Email verified successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/resend-otp
// ---------------------------------------------------------------------------
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) throw ApiError.badRequest('Email already verified');

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save();

  await sendOtpEmail(user.email, user.name, otp);

  res.status(200).json(new ApiResponse(200, {}, 'OTP resent successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  if (user.isLocked()) {
    throw ApiError.forbidden(
      `Account locked due to multiple failed attempts. Try again after ${env.ACCOUNT_LOCK_DURATION_MINUTES} minutes.`,
    );
  }

  if (!user.isActive) throw ApiError.forbidden('Account is deactivated. Contact support.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= env.ACCOUNT_LOCK_MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
      await user.save();
      await sendAccountLockedEmail(user.email, user.name);
      await logAudit(String(user._id), 'ACCOUNT_LOCKED', req, 'Too many failed login attempts');
      throw ApiError.forbidden('Account locked due to multiple failed attempts. Check your email.');
    }

    await user.save();
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden('Please verify your email before logging in');
  }

  // Reset lockout counters on success
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;
  await user.save();

  const accessToken = generateAccessToken({ userId: String(user._id), role: user.role, tokenVersion: user.tokenVersion });
  const refreshToken = generateRefreshToken({ userId: String(user._id), tokenVersion: user.tokenVersion });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  await logAudit(String(user._id), 'LOGIN', req);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
      'Login successful',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.userId);
  if (!user || !user.isActive) throw ApiError.unauthorized('User not found or inactive');

  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Session revoked. Please log in again.');
  }

  // Rotate refresh token
  const newAccessToken = generateAccessToken({ userId: String(user._id), role: user.role, tokenVersion: user.tokenVersion });
  const newRefreshToken = generateRefreshToken({ userId: String(user._id), tokenVersion: user.tokenVersion });

  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);
  res.status(200).json(new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user.userId, { $inc: { tokenVersion: 1 } });
    await logAudit(req.user.userId, 'LOGOUT', req);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth/refresh' });
  res.status(200).json(new ApiResponse(200, {}, 'Logged out successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/forgot-password
// ---------------------------------------------------------------------------
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Always respond success to avoid leaking which emails are registered
  if (!user) {
    res.status(200).json(new ApiResponse(200, {}, 'If that email exists, a reset link has been sent.'));
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, user.name, resetUrl);
  await logAudit(String(user._id), 'PASSWORD_RESET_REQUESTED', req);

  res.status(200).json(new ApiResponse(200, {}, 'If that email exists, a reset link has been sent.'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/reset-password
// ---------------------------------------------------------------------------
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: new Date() },
  }).select('+password');

  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  user.tokenVersion += 1; // invalidate all existing sessions
  await user.save();

  await logAudit(String(user._id), 'PASSWORD_RESET', req);

  res.status(200).json(new ApiResponse(200, {}, 'Password reset successful. Please log in again.'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/change-password  (authenticated)
// ---------------------------------------------------------------------------
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user!.userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.unauthorized('Current password is incorrect');

  user.password = newPassword;
  user.tokenVersion += 1;
  await user.save();

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth/refresh' });
  await logAudit(String(user._id), 'PASSWORD_CHANGED', req);

  res.status(200).json(new ApiResponse(200, {}, 'Password changed. Please log in again.'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me  (authenticated)
// ---------------------------------------------------------------------------
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) throw ApiError.notFound('User not found');

  if (!user.cardVerificationToken) {
    user.cardVerificationToken = crypto.randomBytes(16).toString('hex');
    await user.save();
  }

  res.status(200).json(new ApiResponse(200, { user }, 'Current user fetched'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/verify-card/:token  (public)
// ---------------------------------------------------------------------------
export const verifyCustomerCard = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const user = await User.findOne({ cardVerificationToken: token }).select('name role isActive avatar createdAt mobile');

  if (!user) {
    throw ApiError.notFound('Invalid or expired card verification token');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        memberSince: user.createdAt,
        customerId: 'CUST-' + String(user._id).substring(18).toUpperCase(),
        mobile: user.mobile.substring(0, 5) + 'XXXXX',
      },
      'Card verified successfully'
    )
  );
});

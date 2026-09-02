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
  generateTwoFactorToken,
  verifyTwoFactorToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../services/token.service';
import {
  sendOtpEmail,
  sendTwoFactorOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
} from '../services/email.service';
import { uploadToR2 } from '../services/r2.service';
import { generateOtp } from '../utils/generateCode';
import {
  generateTotpSecret,
  verifyTotpToken,
  generateOtpAuthUri,
  generateQrCodeDataUrl,
  generateBackupCodes,
} from '../utils/totp.util';
import { Role } from '../types/auth.types';

const OTP_EXPIRY_MS = env.OTP_EXPIRY_MINUTES * 60 * 1000;
const LOCK_DURATION_MS = env.ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000;

const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  if (!user || user.length <= 2) return `${user || ''}***@${domain || ''}`;
  return `${user.substring(0, 2)}***${user[user.length - 1]}@${domain}`;
};

const maskMobile = (mobile: string) => {
  if (!mobile || mobile.length <= 4) return '******';
  return `${mobile.substring(0, 3)}****${mobile.substring(mobile.length - 3)}`;
};

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

  const existing = await User.findOne({
    $or: [{ email }, { mobile }],
  }).setOptions({ bypassTenantQuery: true });
  if (existing) throw ApiError.conflict('Email or mobile already registered');

  const otp = generateOtp();

  const user = await User.create({
    name,
    email,
    mobile,
    password,
    role: Role.CUSTOMER,
    tenantId: req.tenantId || undefined,
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

  const user = await User.findOne({ email })
    .select('+password')
    .setOptions({ bypassTenantQuery: true });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  // Verify non-super_admin belongs to the resolved tenant
  if (user.role !== Role.SUPER_ADMIN) {
    const activeTenantId = req.tenantId;
    if (!user.tenantId || String(user.tenantId) !== String(activeTenantId)) {
       throw ApiError.unauthorized('Invalid email or password');
    }
  }

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

  // Two-Factor Authentication Check
  if (user.twoFactor?.enabled) {
    const twoFactorMethod = user.twoFactor.method || 'authenticator';
    const twoFactorToken = generateTwoFactorToken({
      userId: String(user._id),
      method: twoFactorMethod,
      action: '2fa_challenge',
    });

    if (twoFactorMethod === 'email' || twoFactorMethod === 'mobile') {
      const otp = generateOtp();
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
      await user.save();

      if (twoFactorMethod === 'email') {
        await sendTwoFactorOtpEmail(user.email, user.name, otp);
      }
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          requires2FA: true,
          twoFactorMethod,
          twoFactorToken,
          emailMasked: maskEmail(user.email),
          mobileMasked: maskMobile(user.mobile),
        },
        'Two-factor authentication required',
      ),
    );
    return;
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
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          twoFactor: {
            enabled: user.twoFactor?.enabled ?? false,
            method: user.twoFactor?.method,
            lastVerifiedAt: user.twoFactor?.lastVerifiedAt,
          },
        },
      },
      'Login successful',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/verify-2fa (public with challenge token)
// ---------------------------------------------------------------------------
export const verify2FA = asyncHandler(async (req: Request, res: Response) => {
  const { twoFactorToken, code, isBackupCode } = req.body;
  if (!twoFactorToken || !code) {
    throw ApiError.badRequest('2FA token and verification code are required');
  }

  let payload;
  try {
    payload = verifyTwoFactorToken(twoFactorToken);
  } catch {
    throw ApiError.unauthorized('2FA session expired or invalid. Please sign in again.');
  }

  const user = await User.findById(payload.userId)
    .select('+otp +otpExpiry +twoFactor.secret +twoFactor.backupCodes')
    .setOptions({ bypassTenantQuery: true });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or account is deactivated');
  }

  const cleanCode = String(code).trim();
  let verified = false;

  // Option A: Backup recovery code
  if (isBackupCode || (user.twoFactor?.backupCodes && user.twoFactor.backupCodes.includes(cleanCode.toUpperCase()))) {
    const formattedCode = cleanCode.toUpperCase();
    const backupCodes = user.twoFactor?.backupCodes || [];
    const codeIdx = backupCodes.indexOf(formattedCode);
    if (codeIdx !== -1) {
      backupCodes.splice(codeIdx, 1);
      user.twoFactor!.backupCodes = backupCodes;
      verified = true;
    }
  }

  // Option B: Method verification
  if (!verified) {
    const method = user.twoFactor?.method || payload.method;
    if (method === 'authenticator') {
      if (!user.twoFactor?.secret) {
        throw ApiError.badRequest('Authenticator secret not found. Please contact support.');
      }
      verified = verifyTotpToken(user.twoFactor.secret, cleanCode);
    } else if (method === 'email' || method === 'mobile') {
      if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        throw ApiError.badRequest('OTP expired. Please click resend to get a new code.');
      }
      if (user.otp === cleanCode) {
        verified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
      }
    }
  }

  if (!verified) {
    throw ApiError.unauthorized('Invalid verification code. Please check and try again.');
  }

  // Reset lockout counters on success
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;
  user.twoFactor = user.twoFactor || { enabled: true };
  user.twoFactor.lastVerifiedAt = new Date();
  await user.save();

  const accessToken = generateAccessToken({
    userId: String(user._id),
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = generateRefreshToken({
    userId: String(user._id),
    tokenVersion: user.tokenVersion,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  await logAudit(String(user._id), 'LOGIN_2FA_VERIFIED', req);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          twoFactor: {
            enabled: user.twoFactor?.enabled ?? false,
            method: user.twoFactor?.method,
            lastVerifiedAt: user.twoFactor?.lastVerifiedAt,
          },
        },
      },
      '2FA verification successful. Logged in.',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/2fa/resend-code (public with challenge token)
// ---------------------------------------------------------------------------
export const resend2FACode = asyncHandler(async (req: Request, res: Response) => {
  const { twoFactorToken } = req.body;
  if (!twoFactorToken) throw ApiError.badRequest('2FA token required');

  let payload;
  try {
    payload = verifyTwoFactorToken(twoFactorToken);
  } catch {
    throw ApiError.unauthorized('2FA session expired. Please sign in again.');
  }

  const user = await User.findById(payload.userId).setOptions({ bypassTenantQuery: true });
  if (!user || !user.isActive) throw ApiError.unauthorized('User not found');

  const method = user.twoFactor?.method || 'email';
  if (method !== 'email' && method !== 'mobile') {
    throw ApiError.badRequest('Code resend is only available for Email or Mobile SMS 2FA');
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save();

  if (method === 'email') {
    await sendTwoFactorOtpEmail(user.email, user.name, otp);
  }

  res.status(200).json(new ApiResponse(200, {}, `New verification code sent via ${method}`));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/2fa/initiate (authenticated)
// ---------------------------------------------------------------------------
export const initiate2FA = asyncHandler(async (req: Request, res: Response) => {
  const { method } = req.body;
  if (!['email', 'mobile', 'authenticator'].includes(method)) {
    throw ApiError.badRequest('Invalid 2FA method. Supported: email, mobile, authenticator');
  }

  const user = await User.findById(req.user!.userId).select('+twoFactor.tempSecret');
  if (!user) throw ApiError.notFound('User not found');

  if (method === 'authenticator') {
    const secret = generateTotpSecret(20);
    const otpAuthUri = generateOtpAuthUri(user.email, secret, 'UseSetu');
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUri);

    user.twoFactor = user.twoFactor || { enabled: false };
    user.twoFactor.tempSecret = secret;
    await user.save();

    res.status(200).json(
      new ApiResponse(
        200,
        {
          method: 'authenticator',
          secret,
          qrCodeUrl: qrCodeDataUrl,
          otpAuthUri,
        },
        'Scan the QR code with Google Authenticator or enter the secret key manually.',
      ),
    );
    return;
  }

  // Email or Mobile OTP
  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save();

  if (method === 'email') {
    await sendTwoFactorOtpEmail(user.email, user.name, otp);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        method,
        targetMasked: method === 'email' ? maskEmail(user.email) : maskMobile(user.mobile),
      },
      `Verification code sent to your ${method === 'email' ? 'email' : 'mobile number'}.`,
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/2fa/confirm (authenticated)
// ---------------------------------------------------------------------------
export const confirm2FA = asyncHandler(async (req: Request, res: Response) => {
  const { method, code } = req.body;
  if (!method || !code) throw ApiError.badRequest('Method and verification code are required');

  const user = await User.findById(req.user!.userId).select(
    '+otp +otpExpiry +twoFactor.tempSecret +twoFactor.secret +twoFactor.backupCodes',
  );
  if (!user) throw ApiError.notFound('User not found');

  const cleanCode = String(code).trim();
  let verified = false;

  if (method === 'authenticator') {
    if (!user.twoFactor?.tempSecret) {
      throw ApiError.badRequest('No pending authenticator setup found. Please initiate 2FA again.');
    }
    verified = verifyTotpToken(user.twoFactor.tempSecret, cleanCode);
  } else if (method === 'email' || method === 'mobile') {
    if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      throw ApiError.badRequest('OTP expired. Please request a new code.');
    }
    if (user.otp === cleanCode) {
      verified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
    }
  }

  if (!verified) {
    throw ApiError.badRequest('Invalid verification code. Please check and try again.');
  }

  // Generate emergency recovery backup codes
  const backupCodes = generateBackupCodes(8);

  user.twoFactor = {
    enabled: true,
    method,
    secret: method === 'authenticator' ? user.twoFactor?.tempSecret : undefined,
    tempSecret: undefined,
    backupCodes,
    lastVerifiedAt: new Date(),
  };

  await user.save();
  await logAudit(String(user._id), '2FA_ENABLED', req, `2FA enabled with method: ${method}`);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        enabled: true,
        method,
        backupCodes,
      },
      'Two-Factor Authentication successfully activated! Please save your emergency backup codes.',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/2fa/disable (authenticated)
// ---------------------------------------------------------------------------
export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) throw ApiError.badRequest('Password is required to disable 2FA');

  const user = await User.findById(req.user!.userId).select(
    '+password +twoFactor.secret +twoFactor.backupCodes',
  );
  if (!user) throw ApiError.notFound('User not found');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized('Incorrect password');

  user.twoFactor = {
    enabled: false,
    method: undefined,
    secret: undefined,
    tempSecret: undefined,
    backupCodes: undefined,
    lastVerifiedAt: undefined,
  };

  await user.save();
  await logAudit(String(user._id), '2FA_DISABLED', req);

  res.status(200).json(new ApiResponse(200, { enabled: false }, 'Two-Factor Authentication has been disabled.'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/2fa/status (authenticated)
// ---------------------------------------------------------------------------
export const get2FAStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) throw ApiError.notFound('User not found');

  res.status(200).json(
    new ApiResponse(
      200,
      {
        enabled: user.twoFactor?.enabled ?? false,
        method: user.twoFactor?.method,
        lastVerifiedAt: user.twoFactor?.lastVerifiedAt,
      },
      '2FA status fetched',
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

  res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken: newAccessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          twoFactor: {
            enabled: user.twoFactor?.enabled ?? false,
            method: user.twoFactor?.method,
            lastVerifiedAt: user.twoFactor?.lastVerifiedAt,
          },
        },
      },
      'Token refreshed',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.userId);
      if (user) {
        user.tokenVersion += 1;
        await user.save();
        await logAudit(String(user._id), 'LOGOUT', req);
      }
    } catch {
      // Ignore token verification errors during logout
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth/refresh' });
  res.status(200).json(new ApiResponse(200, {}, 'Logged out successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/forgot-password
// ---------------------------------------------------------------------------
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).setOptions({ bypassTenantQuery: true });
  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save();

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
    await logAudit(String(user._id), 'PASSWORD_RESET_REQUESTED', req);
  }

  res.status(200).json(
    new ApiResponse(200, {}, 'If an account with that email exists, a password reset link has been sent.'),
  );
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
  })
    .select('+passwordResetToken +passwordResetExpiry')
    .setOptions({ bypassTenantQuery: true });

  if (!user) {
    throw ApiError.badRequest('Password reset token is invalid or has expired');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  user.tokenVersion += 1;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth/refresh' });
  await logAudit(String(user._id), 'PASSWORD_RESET_COMPLETED', req);

  res.status(200).json(new ApiResponse(200, {}, 'Password reset successful. You can now log in.'));
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

// ---------------------------------------------------------------------------
// PUT /api/v1/auth/profile  (authenticated)
// ---------------------------------------------------------------------------
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, mobile, avatar } = req.body;
  const user = await User.findById(req.user!.userId);
  if (!user) throw ApiError.notFound('User not found');

  if (mobile && mobile !== user.mobile) {
    const existing = await User.findOne({ mobile, _id: { $ne: user._id } }).setOptions({ bypassTenantQuery: true });
    if (existing) throw ApiError.conflict('Mobile number already registered to another account');
    user.mobile = mobile;
  }

  if (name) user.name = name.trim();
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  await logAudit(String(user._id), 'PROFILE_UPDATED', req);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive,
          twoFactor: {
            enabled: user.twoFactor?.enabled ?? false,
            method: user.twoFactor?.method,
            lastVerifiedAt: user.twoFactor?.lastVerifiedAt,
          },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      'Profile updated successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/avatar  (authenticated)
// ---------------------------------------------------------------------------
export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');
  const user = await User.findById(req.user!.userId);
  if (!user) throw ApiError.notFound('User not found');

  let avatarUrl = '';
  let fileId = '';

  try {
    const uploaded = await uploadToR2(req.file.buffer, req.file.originalname, 'avatars', req.file.mimetype);
    avatarUrl = uploaded.url;
    fileId = uploaded.fileId;
  } catch (err) {
    const base64 = req.file.buffer.toString('base64');
    avatarUrl = `data:${req.file.mimetype};base64,${base64}`;
    fileId = `local-${Date.now()}`;
  }

  user.avatar = { url: avatarUrl, fileId };
  await user.save();
  await logAudit(String(user._id), 'AVATAR_UPDATED', req);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        avatar: user.avatar,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive,
          twoFactor: {
            enabled: user.twoFactor?.enabled ?? false,
            method: user.twoFactor?.method,
            lastVerifiedAt: user.twoFactor?.lastVerifiedAt,
          },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      'Avatar uploaded successfully',
    ),
  );
});


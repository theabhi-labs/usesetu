import { Router } from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  verify2FA,
  resend2FACode,
  initiate2FA,
  confirm2FA,
  disable2FA,
  get2FAStatus,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  verifyCustomerCard,
  updateProfile,
  uploadAvatar,
} from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { authRateLimiter, otpRateLimiter } from '../middlewares/security.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/verify-otp', otpRateLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/resend-otp', otpRateLimiter, resendOtp);
router.post('/login', authRateLimiter, validate(loginSchema), login);

// Two-Factor Authentication (2FA)
router.post('/verify-2fa', authRateLimiter, verify2FA);
router.post('/2fa/resend-code', otpRateLimiter, resend2FACode);
router.post('/2fa/initiate', isAuthenticated, otpRateLimiter, initiate2FA);
router.post('/2fa/confirm', isAuthenticated, confirm2FA);
router.post('/2fa/disable', isAuthenticated, disable2FA);
router.get('/2fa/status', isAuthenticated, get2FAStatus);

router.post('/refresh', refreshAccessToken);
router.post('/logout', isAuthenticated, logout);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/change-password', isAuthenticated, validate(changePasswordSchema), changePassword);
router.get('/me', isAuthenticated, getMe);
router.put('/profile', isAuthenticated, validate(updateProfileSchema), updateProfile);
router.post('/avatar', isAuthenticated, uploadImage.single('avatar'), uploadAvatar);
router.get('/verify-card/:token', verifyCustomerCard);

export default router;


import { Router } from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authRateLimiter, otpRateLimiter } from '../middlewares/security.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/verify-otp', otpRateLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/resend-otp', otpRateLimiter, resendOtp);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', isAuthenticated, logout);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/change-password', isAuthenticated, validate(changePasswordSchema), changePassword);
router.get('/me', isAuthenticated, getMe);

export default router;

import dotenv from 'dotenv';
import { cleanEnv, str, port, num } from 'envalid';

dotenv.config();

/**
 * Validates and exports strongly-typed environment variables.
 * App will refuse to boot if any required variable is missing/invalid.
 */
export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: port({ default: 5000 }),

  // Database
  MONGO_URI: str(),

  // JWT
  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_ACCESS_EXPIRY: str({ default: '15m' }),
  JWT_REFRESH_EXPIRY: str({ default: '30d' }),

  // Cookies
  COOKIE_SECRET: str(),

  // Client
  CLIENT_URL: str({ default: 'http://localhost:5173' }),

  // Brevo (Email)
  BREVO_API_KEY: str(),
  BREVO_SENDER_EMAIL: str(),
  BREVO_SENDER_NAME: str({ default: 'CSC OS' }),

  // Cloudflare R2 Storage (S3-Compatible)
  R2_ACCOUNT_ID: str({ default: 'placeholder_r2_account_id' }),
  R2_ACCESS_KEY_ID: str({ default: 'placeholder_r2_access_key_id' }),
  R2_SECRET_ACCESS_KEY: str({ default: 'placeholder_r2_secret_access_key' }),
  R2_BUCKET_NAME: str({ default: 'csc-os' }),
  R2_PUBLIC_URL: str({ default: 'https://cdn.usesetu.com' }),

  // Security
  RATE_LIMIT_WINDOW_MS: num({ default: 15 * 60 * 1000 }),
  RATE_LIMIT_MAX: num({ default: 100 }),

  // OTP
  OTP_EXPIRY_MINUTES: num({ default: 10 }),
  ACCOUNT_LOCK_MAX_ATTEMPTS: num({ default: 5 }),
  ACCOUNT_LOCK_DURATION_MINUTES: num({ default: 30 }),

  // Request Management
  APPLICATION_NUMBER_PREFIX: str({ default: 'CSC' }),

  // Platform Domains
  PLATFORM_BASE_DOMAIN: str({ default: 'usesetu.com' }),
  PLATFORM_PROTOCOL: str({ choices: ['http', 'https'], default: 'https' }),
  CUSTOM_DOMAIN_CNAME_TARGET: str({ default: 'domains.usesetu.com' }),
  CUSTOM_DOMAIN_VERIFICATION_PREFIX: str({ default: '_usesetu-verification' }),

  // Razorpay Payment Gateway (Stage 7 & Stage 8)
  RAZORPAY_KEY_ID: str({ default: 'rzp_test_placeholder_key' }),
  RAZORPAY_KEY_SECRET: str({ default: 'rzp_test_placeholder_secret' }),
  RAZORPAY_WEBHOOK_SECRET: str({ default: 'rzp_test_placeholder_webhook_secret' }),
  RAZORPAY_ACCOUNT_NAME: str({ default: 'UseSetu Cloud' }),
  RAZORPAY_CURRENCY: str({ default: 'INR' }),
  RAZORPAY_MODE: str({ choices: ['test', 'live'], default: 'test' }),
  RAZORPAY_BILLING_MODE: str({ choices: ['order', 'subscription'], default: 'order' }),

  // Automated Billing Lifecycle & Self-Healing
  BILLING_GRACE_PERIOD_DAYS: num({ default: 7 }),
  BILLING_RECONCILIATION_STALE_MINUTES: num({ default: 15 }),
});

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

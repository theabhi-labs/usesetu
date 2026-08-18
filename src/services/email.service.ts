import SibApiV3Sdk from 'sib-api-v3-sdk';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

const client = SibApiV3Sdk.ApiClient.instance;
const apiKeyAuth = client.authentications['api-key'];
apiKeyAuth.apiKey = env.BREVO_API_KEY;

const transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}

export const sendEmail = async ({ to, subject, htmlContent }: SendEmailParams): Promise<void> => {
  try {
    await transactionalEmailsApi.sendTransacEmail({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to,
      subject,
      htmlContent,
    });
  } catch (error) {
    logger.error(`Brevo email failed: ${(error as Error).message}`);
    throw ApiError.internal('Failed to send email. Please try again later.');
  }
};

export const sendOtpEmail = async (email: string, name: string, otp: string): Promise<void> => {
  await sendEmail({
    to: [{ email, name }],
    subject: 'Your CSC OS Verification Code',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background:#0d0d0d; color:#fff; padding:24px; border-radius:8px;">
        <h2 style="color:#FF6700;">CSC OS Verification</h2>
        <p>Hi ${name},</p>
        <p>Your One-Time Password (OTP) is:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color:#FF6700; margin: 16px 0;">${otp}</div>
        <p>This code expires in ${env.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  await sendEmail({
    to: [{ email, name }],
    subject: 'Welcome to CSC OS',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background:#0d0d0d; color:#fff; padding:24px; border-radius:8px;">
        <h2 style="color:#FF6700;">Welcome, ${name}!</h2>
        <p>Your account has been created successfully. You can now log in and start using our services.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, name: string, resetUrl: string): Promise<void> => {
  await sendEmail({
    to: [{ email, name }],
    subject: 'Reset Your Password - CSC OS',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background:#0d0d0d; color:#fff; padding:24px; border-radius:8px;">
        <h2 style="color:#FF6700;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>Click the button below to reset your password. This link expires in 15 minutes.</p>
        <a href="${resetUrl}" style="display:inline-block; margin-top:16px; padding:12px 24px; background:#FF6700; color:#fff; text-decoration:none; border-radius:6px;">Reset Password</a>
        <p style="margin-top:16px; font-size:12px; color:#999;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

export const sendAccountLockedEmail = async (email: string, name: string): Promise<void> => {
  await sendEmail({
    to: [{ email, name }],
    subject: 'Account Temporarily Locked - CSC OS',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background:#0d0d0d; color:#fff; padding:24px; border-radius:8px;">
        <h2 style="color:#FF6700;">Account Locked</h2>
        <p>Hi ${name},</p>
        <p>Your account has been temporarily locked due to multiple failed login attempts. Please try again after ${env.ACCOUNT_LOCK_DURATION_MINUTES} minutes, or reset your password.</p>
      </div>
    `,
  });
};

/**
 * Wraps a plain-text or lightly-formatted body (typically the rendered
 * output of a NotificationTemplate) in the same branded shell used by the
 * hand-written emails above, so automation-driven emails look consistent
 * with the rest of the product without every template author needing to
 * repeat the HTML boilerplate.
 */
export const wrapBrandedEmail = (title: string, bodyHtml: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background:#0d0d0d; color:#fff; padding:24px; border-radius:8px;">
    <h2 style="color:#FF6700;">${title}</h2>
    <div>${bodyHtml}</div>
  </div>
`;

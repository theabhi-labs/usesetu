import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhook.controller';

const router = Router();

// Razorpay Webhook Receiver (Public, unauthenticated; authenticated via HMAC-SHA256 signature)
router.post('/razorpay', handleRazorpayWebhook);

export default router;

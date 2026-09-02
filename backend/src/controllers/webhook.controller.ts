import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { RazorpayWebhookHandler } from '../services/payment/razorpay/razorpay.webhook';

/**
 * POST /api/v1/webhooks/razorpay
 * Public webhook endpoint for Razorpay asynchronous event delivery
 */
export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = (req.headers['x-razorpay-signature'] as string) || '';
  if (!signature) {
    throw ApiError.unauthorized('Missing X-Razorpay-Signature header');
  }

  // Ensure rawBody is available
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const result = await RazorpayWebhookHandler.handleWebhook({
    rawBody,
    signature,
    headers: req.headers as Record<string, any>,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        received: true,
        eventId: result.eventId,
        duplicate: result.duplicate,
      },
      'Webhook processed successfully',
    ),
  );
});

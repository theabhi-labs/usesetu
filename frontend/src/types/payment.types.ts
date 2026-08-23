export type PaymentType = 'advance' | 'partial' | 'full';
export type PaymentMethod = 'cash' | 'upi' | 'qr_code' | 'bank_transfer' | 'online_gateway';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';

export interface Payment {
  _id: string;
  request: string;
  customer: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  amount: number;
  refundedAmount: number;
  status: PaymentStatus;
  transactionId?: string;
  paidAt: string;
}

// POST /payments body
export interface RecordPaymentBody {
  request: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  amount: number;
  transactionId?: string;
  remarks?: string;
}

// GET /payments/:id/receipt response .data
export interface ReceiptResponse {
  receiptNumber: string;
  payment: string;
  amount: number;
  paymentMethod: string;
  balanceAfterPayment: number;
  qrCode: string; // base64 data URL
}

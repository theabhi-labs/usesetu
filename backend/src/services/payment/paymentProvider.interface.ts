export interface ProviderCapabilities {
  supportsRecurringBilling: boolean;
  supportsRefunds: boolean;
  supportsInvoices: boolean;
  supportsSubscriptions: boolean;
  supportsPartialRefunds: boolean;
}

export interface CreateCustomerInput {
  email: string;
  name: string;
  contact?: string;
  notes?: Record<string, any>;
}

export interface CreateCustomerResult {
  customerId: string;
  email: string;
  name: string;
}

export interface CreateOrderInput {
  amount: number; // In minor units (paise)
  currency: string; // e.g. INR
  receipt: string;
  notes?: Record<string, any>;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  raw?: any;
}

export interface FetchPaymentResult {
  paymentId: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: string; // captured, authorized, failed, refunded
  method?: string;
  email?: string;
  contact?: string;
  failureReason?: string;
  captured: boolean;
  createdAt: number;
  raw?: any;
}

export interface CapturePaymentInput {
  paymentId: string;
  amount: number;
  currency?: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  amount?: number; // In minor units (paise); omit for full refund
  notes?: Record<string, any>;
  speed?: 'normal' | 'optimum';
}

export interface RefundPaymentResult {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  raw?: any;
}

export interface CreateSubscriptionInput {
  planId: string;
  totalCount?: number;
  quantity?: number;
  customerNotify?: 0 | 1;
  startAt?: number;
  notes?: Record<string, any>;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  planId: string;
  status: string;
  currentStart?: number;
  currentEnd?: number;
  raw?: any;
}

export interface VerifyPaymentSignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyWebhookSignatureInput {
  rawBody: string | Buffer;
  signature: string;
  secret: string;
}

export interface NormalizedPaymentEvent {
  provider: string;
  eventId: string;
  eventType: string;
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  failureReason?: string;
  applicationId?: string;
  accountId?: string;
  planId?: string;
  billingCycle?: string;
  notes?: Record<string, any>;
  occurredAt: Date;
  rawReference?: any;
}

export interface IPaymentProvider {
  readonly providerName: string;
  readonly capabilities: ProviderCapabilities;

  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult>;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  fetchPayment(paymentId: string): Promise<FetchPaymentResult>;
  capturePayment(input: CapturePaymentInput): Promise<FetchPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
  createSubscription?(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult>;
  cancelSubscription?(providerSubscriptionId: string): Promise<{ success: boolean; raw?: any }>;
  fetchSubscription?(providerSubscriptionId: string): Promise<any>;

  verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean;
  verifyWebhookSignature(input: VerifyWebhookSignatureInput): boolean;
  normalizeWebhookEvent(rawEvent: any): NormalizedPaymentEvent;
}

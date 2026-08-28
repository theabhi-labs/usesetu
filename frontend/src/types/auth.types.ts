export const Role = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
} as const;

export type Role = typeof Role[keyof typeof Role];

export type TwoFactorMethod = 'email' | 'mobile' | 'authenticator';

export interface TwoFactorStatus {
  enabled: boolean;
  method?: TwoFactorMethod;
  lastVerifiedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  isEmailVerified: boolean;
  isActive: boolean;
  twoFactor?: TwoFactorStatus;
  avatar?: {
    url: string;
    fileId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface ApiFieldError {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  errors?: ApiFieldError[];
}

export interface Initiate2FAResponse {
  method: TwoFactorMethod;
  secret?: string;
  qrCodeUrl?: string;
  otpAuthUri?: string;
  targetMasked?: string;
}

export interface Confirm2FAResponse {
  enabled: boolean;
  method: TwoFactorMethod;
  backupCodes: string[];
}

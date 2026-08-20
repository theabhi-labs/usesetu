export const Role = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
} as const;

export type Role = typeof Role[keyof typeof Role];

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  isEmailVerified: boolean;
  isActive: boolean;
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

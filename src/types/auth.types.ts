export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  STAFF = 'staff',
  CUSTOMER = 'customer',
}

export interface JwtAccessPayload {
  userId: string;
  role: Role;
  tokenVersion: number;
}

export interface JwtRefreshPayload {
  userId: string;
  tokenVersion: number;
}

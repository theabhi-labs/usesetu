import { Role } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        tokenVersion: number;
        tenantId?: string;
      };
      tenantId?: string;
      tenant?: any;
      rawBody?: Buffer | string;
      requestId?: string;
    }
  }
}

export {};

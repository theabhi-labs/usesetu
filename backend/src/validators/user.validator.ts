import { z } from 'zod';
import { Role } from '../types/auth.types';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().email('Invalid email address'),
    mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
    password: passwordSchema,
    role: z.nativeEnum(Role),
    isActive: z.boolean().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    email: z.string().trim().email('Invalid email address').optional(),
    mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').optional(),
    password: passwordSchema.optional().or(z.literal('')),
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  }),
});

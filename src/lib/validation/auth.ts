import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const createAdminUserSchema = z.object({
  email: z.email().max(300),
  password: z.string().min(12, 'password must be at least 12 characters'),
  name: z.string().min(1).max(200),
  roleId: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const updateAdminUserSchema = z.object({
  email: z.email().max(300).optional(),
  password: z.string().min(12).optional(),
  name: z.string().min(1).max(200).optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12, 'password must be at least 12 characters'),
});

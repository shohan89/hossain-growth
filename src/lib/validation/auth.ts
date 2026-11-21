import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  turnstileToken: z.string().min(1, 'turnstileToken is required'),
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

export const requestPasswordResetSchema = z.object({
  email: z.email(),
  turnstileToken: z.string().min(1, 'turnstileToken is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12, 'password must be at least 12 characters'),
});

export const updateRolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()),
});

export const createRoleSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9]+(_[a-z0-9]+)*$/, 'key must be lowercase snake_case'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

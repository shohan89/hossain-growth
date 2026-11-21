import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { websitePages, navigationItems } from '../db/schema';

const slug = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be lowercase, alphanumeric, hyphen-separated');

export const createWebsitePageSchema = createInsertSchema(websitePages, {
  slug,
  title: z.string().min(1).max(200),
}).omit({ id: true, createdAt: true, updatedAt: true, createdBy: true });
export const updateWebsitePageSchema = createWebsitePageSchema.partial();

export const createNavigationItemSchema = createInsertSchema(navigationItems, {
  label: z.string().min(1).max(100),
}).omit({ id: true });
export const updateNavigationItemSchema = createNavigationItemSchema.partial();

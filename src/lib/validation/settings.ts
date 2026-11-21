import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { redirects, seoMetadata } from '../db/schema';

export const createRedirectSchema = createInsertSchema(redirects, {
  fromPath: z.string().min(1).max(500).startsWith('/'),
  toPath: z.string().min(1).max(500),
  statusCode: z.coerce
    .number()
    .int()
    .refine((n) => [301, 302, 307, 308].includes(n), {
      message: 'statusCode must be one of 301, 302, 307, 308',
    }),
}).omit({ id: true, createdAt: true });
export const updateRedirectSchema = createRedirectSchema.partial();

export const upsertSeoMetadataSchema = createInsertSchema(seoMetadata, {
  entityId: z.string().min(1),
}).omit({ id: true });

export const siteSettingValueSchema = z.object({
  value: z.unknown(),
});

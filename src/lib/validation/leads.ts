import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { leads, leadNotes, LEAD_STATUSES } from '../db/schema';

export const createLeadSchema = createInsertSchema(leads, {
  name: z.string().min(1).max(200),
  email: z.email().max(300),
  serviceInterest: z.array(z.string()).optional(),
})
  .omit({
    id: true,
    status: true,
    assignedTo: true,
    followUpDate: true,
    turnstileVerified: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    turnstileToken: z.string().min(1, 'turnstileToken is required'),
  });

/** Used when an authenticated admin logs a lead manually (phone call, in-person, etc.) — no Turnstile token, since the request already came from a verified admin session rather than a public form. */
export const adminCreateLeadSchema = createInsertSchema(leads, {
  name: z.string().min(1).max(200),
  email: z.email().max(300),
  serviceInterest: z.array(z.string()).optional(),
}).omit({
  id: true,
  turnstileVerified: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: z.string().nullable().optional(),
  followUpDate: z.coerce.date().nullable().optional(),
  name: z.string().min(1).max(200).optional(),
  email: z.email().max(300).optional(),
  phone: z.string().max(50).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  budget: z.string().max(100).nullable().optional(),
  message: z.string().nullable().optional(),
  source: z.string().max(100).optional(),
  serviceInterest: z.array(z.string()).optional(),
});

export const createLeadNoteSchema = createInsertSchema(leadNotes, {
  note: z.string().min(1).max(5000),
}).omit({ id: true, leadId: true, authorId: true, createdAt: true });

export const leadListQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  country: z.string().optional(),
  budget: z.string().optional(),
  source: z.string().optional(),
  assignedTo: z.string().optional(),
  serviceInterest: z.string().optional(),
});

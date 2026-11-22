import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { adminUsers } from './auth';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    company: text('company'),
    country: text('country'),
    budget: text('budget'),
    message: text('message'),
    source: text('source').notNull().default('contact_form'),
    serviceInterest: text('service_interest', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    status: text('status', { enum: LEAD_STATUSES }).notNull().default('new'),
    assignedTo: text('assigned_to').references(() => adminUsers.id, { onDelete: 'set null' }),
    followUpDate: integer('follow_up_date', { mode: 'timestamp' }),
    turnstileVerified: integer('turnstile_verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('leads_status_created_idx').on(t.status, t.createdAt),
    index('leads_assigned_idx').on(t.assignedTo),
    index('leads_country_idx').on(t.country),
    index('leads_follow_up_idx').on(t.followUpDate),
  ],
);

export const leadNotes = sqliteTable(
  'lead_notes',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    note: text('note').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('lead_notes_lead_idx').on(t.leadId)],
);

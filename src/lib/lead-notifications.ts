import { sendEmail, type EmailEnv } from './email';
import { logActivity } from './audit';
import type { AppDb } from './db/client';

export interface NewLeadNotificationInput {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  budget: string | null;
  message: string | null;
  source: string;
  serviceInterest: string[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLeadEmail(lead: NewLeadNotificationInput): {
  subject: string;
  html: string;
  text: string;
} {
  const rows: [string, string][] = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone ?? '—'],
    ['Company', lead.company ?? '—'],
    ['Country', lead.country ?? '—'],
    ['Budget', lead.budget ?? '—'],
    ['Source', lead.source],
    ['Service interest', lead.serviceInterest.join(', ') || '—'],
    ['Message', lead.message ?? '—'],
  ];

  const subject = `New inquiry from ${lead.name}`;
  const html = `
    <h2>New inquiry received</h2>
    <table cellpadding="6" cellspacing="0" border="0">
      ${rows.map(([label, value]) => `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`).join('')}
    </table>
  `;
  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');

  return { subject, html, text };
}

/**
 * Notifies the agency's inbox of a new inquiry. Never throws — a failed
 * send is logged to the activity log for visibility and otherwise
 * swallowed, so a notification outage can never roll back or block the
 * lead write that already committed before this is called.
 */
export async function notifyNewLead(
  db: AppDb,
  env: EmailEnv & { NOTIFICATION_EMAIL_TO?: string },
  lead: NewLeadNotificationInput,
): Promise<void> {
  const to = env.NOTIFICATION_EMAIL_TO;
  if (!to) return;

  try {
    const { subject, html, text } = renderLeadEmail(lead);
    const result = await sendEmail(env, { to, subject, html, text });

    // "not_configured" means this environment deliberately has no email
    // provider set up (e.g. local dev) — that is not a failure worth an
    // audit entry. Anything else is a real delivery attempt that failed.
    if (!result.sent && result.reason !== 'not_configured') {
      await logActivity(db, {
        userId: null,
        action: 'lead.notification_failed',
        entityType: 'lead',
        entityId: lead.id,
        metadata: { reason: result.reason },
      });
    }
  } catch (error) {
    // Belt-and-suspenders: even an unexpected throw from the email/audit
    // path itself must not propagate back into the request handler.
    console.error('Unexpected error sending lead notification:', error);
  }
}

/**
 * Minimal, swappable email-sending abstraction. The provider and its
 * credentials are read entirely from environment config — nothing here
 * is hardcoded, and an unconfigured environment (local dev, a fresh
 * staging deploy) degrades to a no-op rather than throwing, so a missing
 * email setup never blocks whatever triggered the send.
 *
 * Supported `EMAIL_PROVIDER` values: "resend" (HTTPS API — the only
 * practical choice on Workers, which has no raw SMTP socket API) or
 * "none"/unset, which just logs instead of sending. Adding another
 * HTTP-API provider (Postmark, SendGrid, …) means adding one more
 * branch here — nothing else in the codebase needs to change.
 */
export interface EmailEnv {
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  /** Present when `sent` is false — a reason, never the raw provider error body. */
  reason?: string;
}

async function sendViaResend(env: EmailEnv, input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.EMAIL_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? 'no-reply@hossaingrowth.com',
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      return { sent: false, reason: `resend_http_${response.status}` };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: 'network_error' };
  }
}

export async function sendEmail(env: EmailEnv, input: SendEmailInput): Promise<SendEmailResult> {
  const provider = env.EMAIL_PROVIDER ?? 'none';

  if (provider === 'none' || !env.EMAIL_API_KEY) {
    return { sent: false, reason: 'not_configured' };
  }
  if (provider === 'resend') {
    return sendViaResend(env, input);
  }
  return { sent: false, reason: `unsupported_provider:${provider}` };
}

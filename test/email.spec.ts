import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '../src/lib/email';

const INPUT = { to: 'agency@example.test', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };

describe('sendEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a no-op when no provider is configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await sendEmail({}, INPUT);

    expect(result).toEqual({ sent: false, reason: 'not_configured' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is a no-op when a provider is set but no API key is present', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await sendEmail({ EMAIL_PROVIDER: 'resend' }, INPUT);

    expect(result).toEqual({ sent: false, reason: 'not_configured' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends via the Resend HTTP API when configured', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await sendEmail({ EMAIL_PROVIDER: 'resend', EMAIL_API_KEY: 'key_123' }, INPUT);

    expect(result).toEqual({ sent: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('reports a reason, not the raw body, when the provider rejects the request', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('server exploded', { status: 500 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await sendEmail({ EMAIL_PROVIDER: 'resend', EMAIL_API_KEY: 'key_123' }, INPUT);

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('resend_http_500');
  });

  it('never throws when the network call itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    const result = await sendEmail({ EMAIL_PROVIDER: 'resend', EMAIL_API_KEY: 'key_123' }, INPUT);

    expect(result).toEqual({ sent: false, reason: 'network_error' });
  });

  it('reports an unsupported provider by name', async () => {
    const result = await sendEmail({ EMAIL_PROVIDER: 'mailgun', EMAIL_API_KEY: 'key' }, INPUT);
    expect(result).toEqual({ sent: false, reason: 'unsupported_provider:mailgun' });
  });
});

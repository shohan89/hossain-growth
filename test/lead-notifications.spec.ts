import { describe, expect, it, vi } from 'vitest';
import { notifyNewLead, type NewLeadNotificationInput } from '../src/lib/lead-notifications';

const LEAD: NewLeadNotificationInput = {
  id: 'lead_1',
  name: 'Jordan Rivers',
  email: 'jordan@example.test',
  phone: null,
  company: null,
  country: 'United States',
  budget: '$5,000–$10,000/mo',
  message: 'Interested in SEO.',
  source: 'contact_form',
  serviceInterest: ['seo-aeo-geo'],
};

function fakeDb() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  return { db: { insert } as never, values };
}

describe('notifyNewLead', () => {
  it('does nothing when no notification address is configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { db, values } = fakeDb();

    await notifyNewLead(db, {}, LEAD);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(values).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not log a failure when a recipient is set but no provider is configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { db, values } = fakeDb();

    await notifyNewLead(db, { NOTIFICATION_EMAIL_TO: 'agency@example.test' }, LEAD);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(values).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('sends the notification when a provider and recipient are configured', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const { db, values } = fakeDb();

    await notifyNewLead(
      db,
      {
        EMAIL_PROVIDER: 'resend',
        EMAIL_API_KEY: 'key_123',
        NOTIFICATION_EMAIL_TO: 'agency@example.test',
      },
      LEAD,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(values).not.toHaveBeenCalled(); // no failure logged on success
    vi.unstubAllGlobals();
  });

  it('logs a failure but does not throw when the email provider rejects the send', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const { db, values } = fakeDb();

    await expect(
      notifyNewLead(
        db,
        {
          EMAIL_PROVIDER: 'resend',
          EMAIL_API_KEY: 'key_123',
          NOTIFICATION_EMAIL_TO: 'agency@example.test',
        },
        LEAD,
      ),
    ).resolves.toBeUndefined();

    expect(values).toHaveBeenCalledTimes(1);
    const loggedEvent = values.mock.calls[0][0];
    expect(loggedEvent.action).toBe('lead.notification_failed');
    expect(loggedEvent.entityId).toBe('lead_1');
    vi.unstubAllGlobals();
  });

  it('never throws even if the underlying network call rejects outright', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { db } = fakeDb();

    await expect(
      notifyNewLead(
        db,
        {
          EMAIL_PROVIDER: 'resend',
          EMAIL_API_KEY: 'key_123',
          NOTIFICATION_EMAIL_TO: 'agency@example.test',
        },
        LEAD,
      ),
    ).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});

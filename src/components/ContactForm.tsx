import { useEffect, useState, type SyntheticEvent } from 'react';

interface Props {
  turnstileSiteKey: string;
  services: { slug: string; title: string }[];
}

export default function ContactForm({ turnstileSiteKey, services }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (document.getElementById('turnstile-script')) return;
    const script = document.createElement('script');
    script.id = 'turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');
    const serviceInterest = String(form.get('serviceInterest') ?? '');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone') || undefined,
          company: form.get('company') || undefined,
          country: form.get('country') || undefined,
          message: form.get('message') || undefined,
          serviceInterest: serviceInterest ? [serviceInterest] : undefined,
          turnstileToken,
        }),
      });
      const body = (await res.json()) as { error?: { code: string; message: string } };

      if (!res.ok) {
        setError(body.error?.message ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        window.turnstile?.reset?.();
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="border-ink-900/10 bg-bone-100 rounded-3xl border p-8 text-center">
        <p className="font-display text-ink-900 text-xl font-semibold">Thank you.</p>
        <p className="text-ink-600 mt-2">
          We have received your message and will get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-ink-900 text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="border-ink-900/15 text-ink-900 rounded-xl border px-4 py-3 focus-visible:border-lime-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-ink-900 text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="border-ink-900/15 text-ink-900 rounded-xl border px-4 py-3 focus-visible:border-lime-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-ink-900 text-sm font-medium">
            Phone (optional)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="border-ink-900/15 text-ink-900 rounded-xl border px-4 py-3 focus-visible:border-lime-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company" className="text-ink-900 text-sm font-medium">
            Company (optional)
          </label>
          <input
            id="company"
            name="company"
            type="text"
            className="border-ink-900/15 text-ink-900 rounded-xl border px-4 py-3 focus-visible:border-lime-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className="text-ink-900 text-sm font-medium">
            Country (optional)
          </label>
          <input
            id="country"
            name="country"
            type="text"
            className="border-ink-900/15 text-ink-900 rounded-xl border px-4 py-3 focus-visible:border-lime-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="serviceInterest" className="text-ink-900 text-sm font-medium">
            Service of interest (optional)
          </label>
          <select
            id="serviceInterest"
            name="serviceInterest"
            defaultValue=""
            className="border-ink-900/15 text-ink-900 rounded-xl border px-4 py-3 focus-visible:border-lime-500"
          >
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-ink-900 text-sm font-medium">
          Tell us about your goals
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="border-ink-900/15 text-ink-900 rounded-xl border px-4 py-3 focus-visible:border-lime-500"
        />
      </div>

      <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-ink-900 text-bone-50 hover:bg-ink-800 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Book a Free Consultation'}
      </button>
    </form>
  );
}

declare global {
  interface Window {
    turnstile?: { reset?: (widget?: string) => void };
  }
}

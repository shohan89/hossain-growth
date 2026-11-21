import { useEffect, useState, type SyntheticEvent } from 'react';

interface Props {
  turnstileSiteKey: string;
}

export default function ForgotPasswordForm({ turnstileSiteKey }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
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
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        turnstileToken: String(form.get('cf-turnstile-response') ?? ''),
      }),
    });
    const body = (await res.json()) as {
      data?: { message: string; devOnlyResetToken?: string };
    };
    setMessage(body.data?.message ?? 'If that email exists, a reset link has been sent.');
    setDevToken(body.data?.devOnlyResetToken ?? null);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
      {message && <p className="text-sm text-slate-700">{message}</p>}
      {devToken && (
        <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          Dev-only (no email provider configured yet):{' '}
          <a
            className="underline"
            href={`/admin/reset-password?token=${encodeURIComponent(devToken)}`}
          >
            reset link
          </a>
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}

import { useEffect, useState, type SyntheticEvent } from 'react';

interface Props {
  turnstileSiteKey: string;
  next: string;
}

export default function LoginForm({ turnstileSiteKey, next }: Props) {
  const [error, setError] = useState<string | null>(null);
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

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          turnstileToken,
        }),
      });
      const body = (await res.json()) as { error?: { code: string; message: string } };

      if (!res.ok) {
        setError(body.error?.message ?? 'Login failed.');
        setSubmitting(false);
        window.turnstile?.reset?.();
        return;
      }

      window.location.href = next || '/admin';
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
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
          autoComplete="username"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      <a href="/admin/forgot-password" className="text-sm text-slate-500 underline">
        Forgot your password?
      </a>
    </form>
  );
}

declare global {
  interface Window {
    turnstile?: { reset?: (widget?: string) => void };
  }
}

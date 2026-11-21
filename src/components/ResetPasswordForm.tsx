import { useState, type SyntheticEvent } from 'react';

interface Props {
  token: string;
}

export default function ResetPasswordForm({ token }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const body = (await res.json()) as { error?: { message: string } };

    if (!res.ok) {
      setError(body.error?.message ?? 'Could not reset password.');
      setSubmitting(false);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-slate-700">
        Password reset.{' '}
        <a className="underline" href="/admin/login">
          Log in
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={12}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={12}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  );
}

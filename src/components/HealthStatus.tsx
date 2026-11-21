import { useEffect, useState } from 'react';

type HealthResponse = {
  status: 'ok';
  environment: string;
  timestamp: string;
  checks: {
    database: 'ok' | 'error';
    media: 'ok' | 'error';
  };
};

export default function HealthStatus() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json() as Promise<HealthResponse>;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-red-600">Backend check failed: {error}</p>;
  }

  if (!data) {
    return <p className="text-slate-500">Checking backend connection…</p>;
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 text-sm">
      <p className="font-medium text-green-700">Backend connected — status: {data.status}</p>
      <ul className="mt-2 space-y-1 text-slate-600">
        <li>Environment: {data.environment}</li>
        <li>Database (D1): {data.checks.database}</li>
        <li>Media (R2): {data.checks.media}</li>
        <li>Checked at: {data.timestamp}</li>
      </ul>
    </div>
  );
}

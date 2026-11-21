import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async () => {
  let database: 'ok' | 'error';
  try {
    await env.DB.prepare('SELECT 1').first();
    database = 'ok';
  } catch {
    database = 'error';
  }

  let media: 'ok' | 'error';
  try {
    await env.MEDIA.list({ limit: 1 });
    media = 'ok';
  } catch {
    media = 'error';
  }

  const body = {
    status: 'ok' as const,
    environment: env.ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
    checks: { database, media },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

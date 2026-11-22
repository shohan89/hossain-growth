import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../lib/db/schema';
import { mediaAssets } from '../../lib/db/schema';

export const prerender = false;

/**
 * Publicly serves an uploaded media asset's bytes by id. Deliberately
 * unauthenticated: these are site assets (featured images, etc.) that
 * need to render on public pages for anonymous visitors, same as any
 * CDN-hosted image URL. Content is immutable per id (replacing a file
 * creates a new media asset), so it's safe to cache aggressively.
 */
export const GET: APIRoute = async ({ params }) => {
  const id = params.id as string;
  const db = drizzle(env.DB, { schema });
  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!row) return new Response('Not found', { status: 404 });

  const object = await env.MEDIA.get(row.r2Key);
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    status: 200,
    headers: {
      'content-type': row.mimeType,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};

import { env } from 'cloudflare:workers';
import { readD1Migrations } from '@cloudflare/vitest-plugin';

let applied = false;

/** Applies all migrations in migrations/ to the test D1 instance, once. */
export async function ensureMigrationsApplied(): Promise<void> {
  if (applied) return;
  const migrations = await readD1Migrations('./migrations');
  for (const migration of migrations) {
    for (const query of migration.queries) {
      await env.DB.prepare(query).run();
    }
  }
  applied = true;
}

# Hossain Growth — Maintenance Guide

Operational guide for running the site day to day once it's live. `docs/DEPLOYMENT_GUIDE.md` is for getting to production the first time; this is for everything after.

---

## 1. Routine deployments

For a normal content/code change after launch:

```bash
git pull
npm ci
npx eslint . && npx prettier --check . && npx astro check && npm test
npx astro build
npm run deploy:production
```

No `wrangler.jsonc` changes, no new secrets, no migration needed for a typical change. If a change touches the database schema, see §3 first — migrations are a separate, more careful step than a normal deploy.

**Why `deploy:production` doesn't pass `--env production`:** the Astro Cloudflare adapter regenerates `dist/server/wrangler.json` on every `astro build`, and that generated file is flat — it never carries the `env.staging`/`env.production` override blocks from the real `wrangler.jsonc`, even though it lists them under `definedEnvironments`. Running `wrangler deploy --config dist/server/wrangler.json --env production` against it silently deploys with the **top-level (dev) bindings**, because there's no `env.production` block in that file for `--env` to select — this actually happened on the first production deploy and was caught by checking the bindings table in the deploy output. The fix: `scripts/apply-env-bindings.mjs <env>` runs between `astro build` and `wrangler deploy`, reading the real environment's `vars`/`d1_databases`/`r2_buckets`/`kv_namespaces`/`name` out of `wrangler.jsonc` and merging them into the generated file — `npm run deploy:production` and `deploy:staging` already do this. **Always check the "Your Worker has access to the following bindings" table printed by every deploy** before trusting it; it's the only direct confirmation of what actually went live.

**There is no CI/CD pipeline yet** (no `.github/workflows`) — every deploy today is this manual sequence, run by a human. Setting up GitHub Actions to run the checks above and deploy on merge to `main` is a reasonable future improvement; until then, never skip the lint/check/test/build steps before deploying by hand.

**Rolling back:** Cloudflare keeps previous Worker versions. Dashboard → Workers & Pages → `hossain-growth-production` → **Deployments** → find the last known-good version → **Rollback**. This reverts the _code_; it does not undo a database migration (see §3.4).

---

## 2. Monitoring and logs

- **Observability is already enabled** (`"observability": { "enabled": true }` in `wrangler.jsonc`) — Cloudflare captures Worker logs, errors, and request metrics automatically. Dashboard → Workers & Pages → `hossain-growth-production` → **Logs** / **Metrics**.
- **Live tail** for real-time debugging: `npx wrangler tail --env production` (streams logs from production — use sparingly, briefly, and never leave running unattended against a resource you don't own the cost of).
- **Application-level audit trail**: every admin mutation is in the `activity_logs` table, visible in the dashboard's Activity Logs module (read-only by design) or queryable directly:
  ```bash
  npx wrangler d1 execute hossain-growth-production --remote --env production \
    --command "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20;"
  ```
- **Failed lead notifications** are logged as an `activity_logs` row with `action = 'lead.notification_failed'` and the failure reason in `metadata` — an intentionally-unconfigured provider is _not_ logged as a failure (see `docs/QA_REPORT.md` §Phase 7/8 notes), so if you see this action at all, a real delivery attempt genuinely failed and is worth investigating (expired/invalid `EMAIL_API_KEY`, Resend outage, etc.) — the lead itself was still saved regardless.
- **Spam signal**: `action = 'lead.spam_rejected'` means the honeypot field caught a bot. `action = 'lead.duplicate_merged'` means a resubmission was folded into an existing lead as a note, not a bug.

## 3. Database changes going forward

### 3.1 Making a schema change

1. Edit the relevant file in `src/lib/db/schema/`.
2. `npm run db:generate` — regenerates a migration from the Drizzle schema diff into `migrations/`. **Review the generated SQL before applying it anywhere** — Drizzle's diffing is usually right but not infallible, especially for column type changes or anything involving data transformation.
3. Apply locally first (`npm run db:migrate:local`), test thoroughly, then remote-dev (`npm run db:migrate:dev:remote`), then staging, then — last — production (`npm run db:migrate:production`).
4. Never hand-edit a migration file that's already been applied anywhere. If a mistake ships, write a new migration that corrects it forward; don't rewrite history.

### 3.2 Seed data

`seeds/dev-seed.sql` is local-dev-only by design — there is no `db:seed:staging` or `db:seed:production` script, deliberately. Production content is entered through the admin dashboard by a real admin, or via direct SQL for a one-time bulk import reviewed line by line before running. Never adapt the dev seed script to "quickly" populate staging or production.

### 3.3 Backups

Cloudflare D1 does not (as of this writing) offer a one-click scheduled-backup feature in the dashboard. Until/unless that changes, the practical backup strategy is:

```bash
npx wrangler d1 export hossain-growth-production --remote --env production --output backup-$(date +%Y%m%d).sql
```

Run this on a schedule you're comfortable with (weekly is a reasonable starting point for a low-write-volume marketing/CRM site; more often once lead volume grows), and store the output somewhere other than this repo (it will contain real lead PII — never commit it).

### 3.4 Rolling back a bad migration

D1 doesn't version schemas the way it versions Worker code. If a migration needs to be undone, write and apply a new migration that reverses the specific change — there's no equivalent of the Worker-deployment rollback button for the database.

### 3.5 Orphaned media cleanup

The Media Library's "unused files" panel (Phase 7) finds media assets nothing references and lets an admin delete them with one click — this is the normal way to keep R2 storage tidy. There's no scheduled/automatic cleanup; it's a manual, admin-triggered action by design (deleting storage should always be a deliberate click, not a cron job that could misfire).

---

## 4. Secret rotation

```bash
# Session signing key — rotating this invalidates every existing session immediately
# (everyone gets logged out). Fine to do; just expect support questions if admins
# are mid-task.
openssl rand -base64 32
npx wrangler secret put SESSION_SIGNING_KEY --env production

# Turnstile secret — rotate from the Cloudflare Turnstile dashboard (regenerate the
# widget's secret key), then:
npx wrangler secret put TURNSTILE_SECRET_KEY --env production

# Email provider API key — rotate from Resend's dashboard, then:
npx wrangler secret put EMAIL_API_KEY --env production
```

After any rotation: `npx wrangler secret list --env production` to confirm it took, and do one live smoke check of the thing that secret protects (log in; submit the contact form; etc.).

**If a secret is ever suspected compromised:** rotate it immediately via the commands above — this takes effect on the next request, no redeploy needed. For `SESSION_SIGNING_KEY` specifically, rotating it is itself the full remediation (every existing token becomes unverifiable instantly).

---

## 5. User and role management

- Day-to-day admin user management (deactivate a departing team member, change someone's role) is entirely through **Admin → User Management** in the dashboard — no CLI needed.
- Creating a _new Super Admin_ after launch (e.g. a second one, or replacing the original) still goes through `node scripts/create-super-admin.mjs` — there's no dashboard "promote to super admin" button, intentionally, so creating this specific level of access always leaves the deliberate paper trail of someone running this script by hand.
- Custom roles (beyond `super_admin`/`admin`/`editor`) can be created and have their permissions configured entirely through **Admin → User Management → Roles & Permissions** — no code or redeploy needed for a new permission combination.

---

## 6. Dependency updates

```bash
npm outdated         # see what's behind
npm update            # safe, in-range updates
npx astro build        # confirm nothing broke
npm test
```

For a major-version bump of anything in `dependencies` (Astro, the Cloudflare adapter, React, Drizzle), treat it as its own small project: read the changelog, upgrade in a branch, run the full check suite (§1) plus a manual click-through of the admin dashboard and public site, and deploy to staging before production.

`npm audit` will likely continue to show moderate-severity findings in **dev-only** tooling (`drizzle-kit`'s bundled `esbuild`, the Vitest Workers plugin's bundled `ws`) — these don't ship in the production Worker bundle. Re-check this assumption (`npm audit --omit=dev`) after any dependency update, and re-read `README.md` → "Known rough edges" for the current status of the specific blocked items there.

---

## 7. Planned security follow-up: Content-Security-Policy

Phase 8/9 added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a minimal `Permissions-Policy` to every response (`src/middleware.ts`) — all safe, zero-risk additions. A strict `Content-Security-Policy` was deliberately **not** added at the same time, because this app uses several inline `<script>` tags without nonces (JSON-LD structured data on every content page, the theme toggle and mobile-nav toggle in the layouts) — a strict CSP would break all of them immediately.

**The planned follow-up**, when there's time to do it carefully and test thoroughly rather than bolt it on:

1. Generate a per-request nonce in `src/middleware.ts` (`crypto.randomUUID()` or similar), store it on `Astro.locals`.
2. Pass `nonce={Astro.locals.cspNonce}` to every inline `<script>` tag (JSON-LD in `Breadcrumbs.astro`, `Faq.astro`, `PublicLayout.astro`'s schema scripts, the theme-toggle and nav-toggle scripts in `AdminLayout.astro`/`Navbar.astro`).
3. Set a policy roughly like:
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<x>' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src https://challenges.cloudflare.com; connect-src 'self';
   ```
   (`'unsafe-inline'` on `style-src` is needed unless Tailwind's output and any inline `style=` attributes are also nonced/hashed — a bigger lift; starting there and tightening later is reasonable.)
4. Test every page type (public + admin) and every interactive feature (Turnstile, the rich text editor, the media picker, theme toggle) against the new policy in staging before production. A misconfigured CSP fails _silently_ in the browser console, not as a server error — easy to miss without deliberately checking.

---

## 8. Scaling considerations (for when they become relevant, not before)

- **D1**: fine for the traffic/content volume this site is built for (a marketing site + CRM, not a high-write-volume application). If lead volume or content volume grows dramatically, re-check query patterns against `docs/DATABASE_SCHEMA.md`'s indexes before assuming a bigger problem exists.
- **R2**: effectively unlimited for this use case; cost scales with storage + egress, not request volume in a way that matters here.
- **KV**: `CACHE` (redirects) and `SESSIONS` (rate limits, lockouts, tokenVersion) are both low-volume, low-risk. No action needed until/unless KV's own rate limits are observed in logs (unlikely at this site's scale).
- **The Worker itself**: Cloudflare Workers scale horizontally and automatically — there's no server to size or provision.

## 9. Troubleshooting quick reference

| Symptom                                           | Likely cause                                                                                                                                                                    | Check                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `/api/health` reports `database: "error"`         | D1 binding misconfigured or database unreachable                                                                                                                                | `wrangler.jsonc` → `env.production.d1_databases`; `wrangler d1 list`    |
| `/api/health` reports `media: "error"`            | R2 binding misconfigured                                                                                                                                                        | `wrangler.jsonc` → `env.production.r2_buckets`                          |
| Everyone suddenly logged out                      | `SESSION_SIGNING_KEY` was rotated, or `SESSIONS` KV was recreated                                                                                                               | Expected after §4; if unexpected, check deploy history                  |
| Admin page redirects to login when it shouldn't   | Session cookie not being sent — check `SITE_URL` matches the real domain exactly (mismatched origin can affect cookie/CSRF behavior)                                            | `wrangler.jsonc` → `env.production.vars.SITE_URL`                       |
| Contact form always fails Turnstile               | Site/secret key mismatch, or still using the published _test_ keys in production                                                                                                | §4.2 of the deployment guide                                            |
| New redirect doesn't seem to work                 | KV cache hasn't invalidated — should be instant on create/edit/delete via the dashboard (Phase 8's `onMutate` hook); a direct D1 edit bypassing the API would not invalidate it | Always edit redirects through the admin dashboard/API, never direct SQL |
| A newly uploaded image's dimensions show as empty | File isn't actually a valid image of a supported format (PNG/GIF/WebP/JPEG), or is corrupted — the parser fails closed to "no dimensions," not an error                         | Re-export/re-save the source file                                       |

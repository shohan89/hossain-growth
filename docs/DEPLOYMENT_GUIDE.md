# Hossain Growth — Deployment Guide

**Status as of writing: deployed and live.** The site is running in production at `https://hossain-growth-production.maffin-killer007.workers.dev` (no custom domain yet — launched on `workers.dev`, see §5). This guide is kept as written (runnable from a clean slate) for the next environment or a future redeploy from scratch. Commands that create or modify a real Cloudflare resource are marked **⚠️ irreversible/billable** or **⚠️ requires confirmation** — do not run those without explicit sign-off, and never run them twice without checking what already exists first (`wrangler d1 list`, `wrangler r2 bucket list`, etc. — all read-only, safe to run anytime).

Current Cloudflare account: `maffin.killer007@gmail.com` (account ID `04a6a86d6ab057082a4f602214adc3de`). All commands below assume you're authenticated as this account (`npx wrangler whoami` to check; `npx wrangler login` if not).

---

## 0. Pre-flight — information you need before starting

Have these ready; several steps below ask for them:

1. **The production domain.** `wrangler.jsonc` already assumes `hossaingrowth.com`. Confirm: is this domain registered, and is it (or will it be) added as a zone in _this_ Cloudflare account? If it's registered elsewhere, you'll either transfer its nameservers to Cloudflare or use a Cloudflare-provided subdomain instead — see §5.
2. **A Resend account and API key** (or a decision to launch with `EMAIL_PROVIDER=none` and add real notifications later — the app works correctly either way, per Phase 7).
3. **The email address that should receive new-lead notifications** (`NOTIFICATION_EMAIL_TO`).
4. **The email address and name of the first real Super Admin** (not a default — see §4.3).
5. 10–15 minutes where the production D1 database can be briefly unavailable during migration (Wrangler's own confirmation prompt says this; in practice it's sub-second for a fresh database).

---

## 1. Inspect configuration and dependencies (do this first, every time)

```bash
npm ci                 # install from the committed lockfile, not a loose `npm install`
npx eslint .            # 0 errors expected
npx prettier --check .  # all files formatted
npx astro check         # 0 type errors expected
npm test                # 54 unit tests, all passing
npx astro build         # production build — must succeed before anything else
```

Also re-read `wrangler.jsonc`'s `env.production` block end to end. As of this writing it contains:

| Key                           | Current value                                | Action needed                                                                                        |
| ----------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `database_id` (D1)            | `REPLACE_WITH_PRODUCTION_D1_ID`              | Filled in by you after §2.1                                                                          |
| `id` (KV `SESSIONS`, `CACHE`) | `REPLACE_WITH_PRODUCTION_*_KV_ID`            | Filled in by you after §2.3                                                                          |
| `NOTIFICATION_EMAIL_TO`       | `REPLACE_WITH_PRODUCTION_NOTIFICATION_EMAIL` | Filled in by you — see §0.3                                                                          |
| `EMAIL_PROVIDER`              | `resend`                                     | Leave as-is only if you have a real Resend API key ready (§4.4); otherwise temporarily set to `none` |

**Dependency check performed this phase:** the `motion` package was listed in `dependencies` but never imported anywhere in `src/` — removed (`npm uninstall motion`). No other unused production dependencies found. `npm audit` reports only dev-tooling vulnerabilities (documented in `README.md` → "Known rough edges"), nothing in the production dependency tree.

---

## 2. Create production Cloudflare resources

None of these exist yet — confirmed via `wrangler d1 list` / `wrangler r2 bucket list` / `wrangler kv namespace list`, which only show the `*-dev` resources from earlier phases. Each command below is safe to run once; re-running a `create` command against a name that already exists will fail loudly rather than silently duplicating anything, but check first regardless.

### 2.1 Production D1 database — ⚠️ billable (D1 has a free tier; this is unlikely to exceed it early on, but it is a real resource)

```bash
npx wrangler d1 create hossain-growth-production
```

Copy the `database_id` from the output into `wrangler.jsonc` → `env.production.d1_databases[0].database_id`.

### 2.2 Production R2 bucket — ⚠️ billable

```bash
npx wrangler r2 bucket create hossain-growth-media-production
```

No ID to copy — R2 buckets are referenced by name, and `wrangler.jsonc` already has the right name (`hossain-growth-media-production`) in `env.production.r2_buckets[0].bucket_name`.

### 2.3 Production KV namespaces — ⚠️ billable

```bash
npx wrangler kv namespace create SESSIONS_PRODUCTION
npx wrangler kv namespace create CACHE_PRODUCTION
```

Copy each `id` from the output into `wrangler.jsonc` → `env.production.kv_namespaces` (the `SESSIONS` and `CACHE` entries respectively).

### 2.4 Verify bindings resolve correctly

```bash
npx wrangler d1 list
npx wrangler r2 bucket list
npx wrangler kv namespace list
```

Confirm the three new production resources appear, then re-read `wrangler.jsonc`'s `env.production` block one more time to confirm every `REPLACE_WITH_PRODUCTION_*` placeholder (except `NOTIFICATION_EMAIL_TO`, which is a value you choose, not an ID) has been replaced with a real ID.

---

## 3. Database: migrations, verification, no dev data

### 3.1 Apply migrations — ⚠️ requires confirmation (Wrangler will prompt; this briefly locks the database)

```bash
npx wrangler d1 migrations apply hossain-growth-production --remote --env production
```

This applies, in order: `0000_initial_schema.sql` (full schema — 23 tables), `0001_seed_reference_data.sql` (the permission catalog and `super_admin`/`admin`/`editor` role definitions — **system configuration, not sample data**, safe and required in every environment), `0002_auth_hardening.sql`, `0003_realign_roles.sql`, `0004_phase6_crm_portfolio_fields.sql`.

### 3.2 Verify schema and indexes landed correctly

```bash
npx wrangler d1 execute hossain-growth-production --remote --env production \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
npx wrangler d1 execute hossain-growth-production --remote --env production \
  --command "SELECT name, tbl_name FROM sqlite_master WHERE type='index' ORDER BY tbl_name;"
```

Confirm 23 tables and that each table with a documented index (see `docs/DATABASE_SCHEMA.md`) has one — e.g. `leads_status_created_idx`, `media_assets_r2_key_idx`, `activity_logs_created_idx`.

### 3.3 Confirm role/permission reference data seeded correctly

```bash
npx wrangler d1 execute hossain-growth-production --remote --env production \
  --command "SELECT r.key, COUNT(*) AS permission_count FROM role_permissions rp JOIN roles r ON r.id = rp.role_id GROUP BY r.key;"
```

Expect `super_admin` with every permission, `admin` with all but `users.manage`/`roles.manage`, `editor` with the narrower content/leads set (exact counts in `docs/API_DOCUMENTATION.md` → §3).

### 3.4 Confirm zero dev/seed data — this must return 0

```bash
npx wrangler d1 execute hossain-growth-production --remote --env production \
  --command "SELECT COUNT(*) AS c FROM admin_users;"
```

**If this is anything other than `0`, stop and investigate before going further.** `seeds/dev-seed.sql` has no `:remote`/`:production` script anywhere in `package.json` — there is no command that could have put dev data here by accident — but this is the one check that must never be skipped.

---

## 4. Secrets and the first Super Admin

### 4.1 Session signing key — ⚠️ requires confirmation (do not reuse the dev value)

```bash
openssl rand -base64 32
# then:
npx wrangler secret put SESSION_SIGNING_KEY --env production
```

Paste the generated value when prompted. This must be a fresh value, never the one in your local `.dev.vars` — reusing it would mean a dev-environment compromise could forge production session tokens.

### 4.2 Turnstile — **manual Cloudflare Dashboard step required**

Cloudflare Turnstile widgets are created in the dashboard, not via `wrangler`:

1. Dashboard → **Turnstile** → **Add widget**.
2. Widget name: `Hossain Growth — Production`. Domain: your production domain (§5). Widget mode: Managed (recommended).
3. Copy the **Site Key** and **Secret Key** it generates.

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

The **Site Key** is not a secret (it's sent to every visitor's browser) — set it as a plain var instead:

```jsonc
// wrangler.jsonc → env.production.vars
"TURNSTILE_SITE_KEY": "<the real site key>",
```

### 4.3 The first Super Admin — never a default/baked-in account

```bash
node scripts/create-super-admin.mjs <real-email> "<real name>"
```

This prompts for a password locally, hashes it exactly the way the app does, and **prints** an `INSERT` statement — it never runs anything itself. Run the printed command yourself:

```bash
npx wrangler d1 execute hossain-growth-production --remote --env production --command "<paste the printed SQL>"
```

Never paste that output anywhere other than your own terminal (it contains a real password hash).

### 4.4 Email notifications (optional at launch)

If you have a Resend API key ready:

```bash
npx wrangler secret put EMAIL_API_KEY --env production
```

and set `NOTIFICATION_EMAIL_TO` in `wrangler.jsonc` → `env.production.vars` to the real inbox that should receive new-lead alerts.

If you don't have one yet, set `EMAIL_PROVIDER` to `"none"` in that same block — the lead pipeline works identically either way (Phase 7's design: a missing/failed notification never blocks or loses a lead). Switch it to `"resend"` and add the secret later with zero other changes needed.

### 4.5 Confirm every secret is set, and nothing extra leaked in

```bash
npx wrangler secret list --env production
```

Expect exactly: `SESSION_SIGNING_KEY`, `TURNSTILE_SECRET_KEY`, and `EMAIL_API_KEY` (if configured). **If `TURNSTILE_SITE_KEY` appears here, something went wrong — it belongs in `vars`, not `secret`, and vice versa for the other two.**

---

## 5. Custom domain, DNS, and TLS

**This is the step most likely to need manual dashboard work, and depends on facts about the domain I don't have — confirm before proceeding:**

- **If `hossaingrowth.com` is already an active zone in this Cloudflare account:** Dashboard → Workers & Pages → `hossain-growth-production` (after first deploy, §6) → **Settings → Domains & Routes → Add → Custom Domain** → enter `hossaingrowth.com` (and `www.hossaingrowth.com` if you want both). Cloudflare manages the DNS record and SSL certificate automatically — no separate DNS or SSL step needed.
- **If the domain is registered but not yet on Cloudflare:** Dashboard → **Add a site** → enter the domain → Cloudflare gives you two nameservers → update them at your registrar → wait for the zone to become active (can take a few minutes to 24 hours) → then do the step above.
- **If you don't have the domain yet / want to launch on a Cloudflare-provided URL first:** every Worker gets a free `*.workers.dev` subdomain automatically (e.g. `hossain-growth-production.<your-subdomain>.workers.dev`) — no setup needed, and you can add the custom domain later without redeploying anything (just the dashboard step above). **If you do this, update `SITE_URL` in `wrangler.jsonc`'s `env.production.vars` to match the real `workers.dev` URL** — it's used for CSRF Origin-checking (§Security below) and canonical/OG URLs, so it must match whatever URL visitors actually use.

**SSL/TLS:** Cloudflare issues and renews the certificate automatically for both the custom domain and the `workers.dev` subdomain — there is no certificate to generate or install yourself. Recommended dashboard check after the domain is attached: **SSL/TLS → Overview** → encryption mode should be **Full (strict)**; **SSL/TLS → Edge Certificates** → **Always Use HTTPS** → on.

---

## 6. Build and deploy

```bash
npm run deploy:production
```

This runs `astro build && node scripts/apply-env-bindings.mjs production && wrangler deploy --config dist/server/wrangler.json` (see `package.json`). **⚠️ This is the actual production deployment** — the Worker becomes live and publicly reachable (at its `workers.dev` URL immediately, and at the custom domain once §5 is done) the moment this command finishes successfully.

The middle step exists because the Astro Cloudflare adapter's generated `dist/server/wrangler.json` is flat and doesn't carry the `env.production` overrides — `apply-env-bindings.mjs` merges the real production `vars`/`d1_databases`/`r2_buckets`/`kv_namespaces` from `wrangler.jsonc` into it before deploy (this was found and fixed during the first real production deploy — see `docs/MAINTENANCE_GUIDE.md` §1 for the full story). **Always read the "Your Worker has access to the following bindings" table that every deploy prints and confirm it shows production resource names/IDs, not dev ones**, before trusting a deploy.

If it fails, it fails before anything public-facing changes — Wrangler validates and uploads the new version atomically; a failed deploy doesn't leave a half-updated Worker running.

---

## 7. Post-deploy verification

Replace `https://hossaingrowth.com` below with whatever URL is actually live yet (the `workers.dev` URL if §5 hasn't been done).

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://hossaingrowth.com/              # expect 200
curl -s -o /dev/null -w "%{http_code}\n" https://hossaingrowth.com/api/health    # expect 200, check body below
curl -s https://hossaingrowth.com/api/health                                    # expect {"status":"ok", checks: {database:"ok", media:"ok"}}
curl -s -o /dev/null -w "%{http_code}\n" https://hossaingrowth.com/admin         # expect 302 to /admin/login (no session yet)
curl -s -D - -o /dev/null https://hossaingrowth.com/ | grep -i "x-frame-options\|cache-control"  # confirm security/caching headers from Phase 8
```

Then manually, in a browser:

1. **Public website** — visit the homepage, a service page, the portfolio, and the contact page. Confirm styling, images, and the Turnstile widget on the contact form all render.
2. **Admin dashboard** — log in with the Super Admin created in §4.3. Confirm the dashboard loads, and that at least one module (e.g. Services) lists correctly (should be empty — see §3.4, there's no content yet).
3. **Database connectivity** — already confirmed by `/api/health` above and the admin dashboard loading data.
4. **R2 media delivery** — upload a real image via the admin Media Library, confirm it previews correctly and that `GET https://hossaingrowth.com/media/<id>` serves it.
5. **Contact form submission** — submit the real contact form once, end to end. Confirm it succeeds, appears in the admin Leads module, and (if `EMAIL_API_KEY` is configured) that the notification email arrives.

---

## 8. Staging (recommended before production, optional but strongly advised)

Everything in §2–§7 has an identical staging counterpart — just swap `production` for `staging` in every command and use `env.staging` in `wrangler.jsonc`. Staging is the place to run through this entire guide once, with a disposable domain (`staging.hossaingrowth.com` or a `workers.dev` URL), before touching the real production resources. It costs the same handful of free-tier resources and catches any mistake in this guide before it matters.

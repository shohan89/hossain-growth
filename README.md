# Hossain Growth

Premium digital marketing agency website + admin CMS, built on Astro (SSR) and Cloudflare's edge platform (Workers, D1, R2, KV, Turnstile).

Planning docs: see [`docs/`](./docs) — `PROJECT_REQUIREMENTS.md`, `TECHNICAL_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_DOCUMENTATION.md`, `DEVELOPMENT_ROADMAP.md`.

This README covers **Phase 0/2 (infrastructure), Phase 3 (database architecture + backend API), Phase 4 (secure admin authentication & authorization), and Phase 5 (public website UI/UX)**.

## Stack

|                 |                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Astro 7 (SSR, `output: 'server'`)                                                                                                              |
| Adapter         | `@astrojs/cloudflare` 14 (Workers target — Pages support dropped)                                                                              |
| UI              | React 19 islands + Tailwind CSS 4                                                                                                              |
| Validation      | Zod + `drizzle-zod` (schemas derived from the Drizzle table defs)                                                                              |
| ORM             | Drizzle ORM (D1 / SQLite dialect)                                                                                                              |
| Auth primitives | `jose` (WebCrypto — no Node-only JWT libs on Workers), WebCrypto PBKDF2 (600k iterations) for password hashing, Turnstile on login/leads/reset |
| Infra           | Cloudflare Workers, D1, R2, KV, Turnstile                                                                                                      |
| Testing         | Vitest 4 + `@cloudflare/vitest-plugin` (unit), live smoke test script (integration)                                                            |
| Tooling         | TypeScript, ESLint 10 (flat config), Prettier, Wrangler 4                                                                                      |

## Prerequisites

- Node.js ≥ 22.22 (project tested on Node 24.15)
- A Cloudflare account with **Workers**, **D1**, and **R2** enabled (R2 requires one-time enablement in the dashboard — see below)
- `wrangler` CLI authenticated: `npx wrangler login`

## 1. Install

```bash
npm install
```

## 2. Cloudflare account setup

Confirm you're logged into the **correct** Cloudflare account before creating any resources:

```bash
npx wrangler whoami
```

If it's the wrong account:

```bash
npx wrangler logout
npx wrangler login
```

### Dev-tier resources (already created for this project)

These were provisioned once under the project's Cloudflare account and are wired into `wrangler.jsonc`:

- D1 database: `hossain-growth-dev`
- KV namespaces: `SESSIONS` (sessions), `CACHE` (misc caching)
- R2 bucket: `hossain-growth-media-dev`

If you need to recreate resources on a different account, run:

```bash
npx wrangler d1 create hossain-growth-dev
npx wrangler kv namespace create SESSIONS
npx wrangler kv namespace create CACHE
```

Then update the `database_id` / KV `id` values in `wrangler.jsonc` with the output.

### R2 bucket

R2 is enabled on the account and the dev bucket (`hossain-growth-media-dev`) is created. Verified with a real remote upload/delete round-trip via `wrangler r2 object put/delete ... --remote`.

If R2 isn't enabled on a different account you move to, enable it first (Cloudflare Dashboard → **R2** → accept terms; a payment method may be required even on the free tier), then:

```bash
npx wrangler r2 bucket create hossain-growth-media-dev
```

Local development and the health check work fine even without a real bucket (R2 is emulated locally by Wrangler/Miniflare), but uploads to the **remote** bucket (`--remote` flags, staging/production) need the real bucket to exist.

### Staging / production resources

**Not created yet** — this phase intentionally stops at local development. `wrangler.jsonc`'s `env.staging` / `env.production` blocks contain placeholder IDs (`REPLACE_WITH_...`). Before deploying to either environment:

```bash
npx wrangler d1 create hossain-growth-staging
npx wrangler r2 bucket create hossain-growth-media-staging
npx wrangler kv namespace create SESSIONS --env staging
npx wrangler kv namespace create CACHE --env staging
# repeat with -production names/env for production
```

Then replace the placeholder IDs in `wrangler.jsonc` and set secrets (see below) for that environment before running a `deploy:*` script.

## 3. Environment variables & secrets

Local secrets live in `.dev.vars` (gitignored, read automatically by Astro/Wrangler). Copy the example and fill in real values:

```bash
cp .dev.vars.example .dev.vars
```

| Variable               | Purpose                            | Local value                                                                  |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `TURNSTILE_SITE_KEY`   | Turnstile widget (client-side)     | Cloudflare's published test site key (always passes)                         |
| `TURNSTILE_SECRET_KEY` | Turnstile server-side verification | Cloudflare's published test secret key (always passes)                       |
| `SESSION_SIGNING_KEY`  | Signs session cookies (`jose`)     | Random value, pre-generated for you — **do not reuse in staging/production** |

Non-secret config (`SITE_URL`, `ENVIRONMENT`) lives in `wrangler.jsonc` under `vars` / `env.<name>.vars` — safe to commit, never put secrets there.

For staging/production, set real secrets with:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY --env staging
npx wrangler secret put SESSION_SIGNING_KEY --env staging
```

Never commit `.dev.vars`, never hardcode secrets in source, never put secrets in `wrangler.jsonc`.

## 4. Database schema & migrations

Schema lives in `src/lib/db/schema/` (Drizzle ORM, one file per domain: `auth`, `content`, `leads`, `media`, `pages`, `settings`, `audit` — barrel-exported from `schema/index.ts`). 23 tables total: the 20 required by the project spec plus three pure join tables (`role_permissions`, `blog_post_tags`, `portfolio_project_images`) needed for proper normalization. Full column-level detail: `docs/DATABASE_SCHEMA.md`.

Four real migrations (applied to every environment, including staging/production when they exist):

- `migrations/0000_initial_schema.sql` — all 23 tables, indexes, and foreign keys (generated via `drizzle-kit generate`).
- `migrations/0001_seed_reference_data.sql` — the permission catalog (~35 keys) and the original `admin`/`editor` role grants. This is **system configuration, not fake data** — every environment needs it to function, so it's a real migration (idempotent via `INSERT OR IGNORE`).
- `migrations/0002_auth_hardening.sql` — adds `admin_users.token_version` (for server-side session invalidation) and the `password_reset_tokens` table.
- `migrations/0003_realign_roles.sql` — adds the `super_admin` role (every permission), narrows `admin` by revoking `users.manage`/`roles.manage`, and drops the earlier `viewer` role — see the Phase 4 role model in `docs/API_DOCUMENTATION.md`.

No migration or seed file anywhere ever creates an admin user — see "Initial Super Admin provisioning" below.

```bash
npm run db:generate          # generate a new migration from schema changes
npm run db:migrate:local     # apply migrations to the local D1 (persisted in .wrangler/state)
npm run db:migrate:dev:remote   # apply to the real remote dev D1
npm run db:migrate:staging   # apply to remote staging D1 (after staging resources exist)
npm run db:migrate:production
```

### Dev-only seed data

`seeds/dev-seed.sql` is **separate from `migrations/`** on purpose — it contains fake sample content (a dev admin + editor user, sample services/portfolio/blog/leads/testimonials) for local UI development, and must never run against staging or production (no `db:seed:remote`/`db:seed:staging` script exists — deliberately).

```bash
npm run db:seed:local
```

Seeded accounts (local only):

| Email                                | Password             | Role          |
| ------------------------------------ | -------------------- | ------------- |
| `dev-superadmin@hossaingrowth.local` | `DevAdmin!2026Local` | `super_admin` |
| `dev-admin@hossaingrowth.local`      | `DevAdmin!2026Local` | `admin`       |
| `dev-editor@hossaingrowth.local`     | `DevAdmin!2026Local` | `editor`      |

The password hash in that file was generated with `node scripts/hash-password.mjs "<password>"`, which reproduces the exact `pbkdf2$<iterations>$<salt>$<hash>` format `src/lib/auth/password.ts` uses — handy for writing any future hand-written seed/fixture SQL.

## Initial Super Admin provisioning (staging/production)

There is **no default admin password anywhere in this codebase** — not in a migration, not in an environment variable, not in source. For a real environment, generate the first Super Admin yourself:

```bash
node scripts/create-super-admin.mjs <email> "<name>"
```

It prompts for the password locally, hashes it the same way the app does, and only **prints** the `INSERT` statement — it never executes it against a remote database itself. Run the printed command yourself:

```bash
npx wrangler d1 execute hossain-growth-production --remote --command "<printed SQL>"
```

That's a deliberate human checkpoint: creating the first real admin credential for a live environment should never be something a script does unattended.

## 5. Run locally

```bash
npm run dev
```

Starts Astro's dev server at `http://localhost:4321` with full HMR and live Cloudflare bindings (D1/R2/KV) via Wrangler's platform proxy — no separate `wrangler dev` needed for day-to-day development.

Verify it's working:

```bash
curl http://localhost:4321/api/health
```

Expected:

```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "...",
  "checks": { "database": "ok", "media": "ok" }
}
```

The homepage (`/`) renders this same check live via a React island (`src/components/HealthStatus.tsx`) — "Backend connected" confirms frontend → `/api/health` → D1 + R2 all work together.

## 6. Preview a production build locally

```bash
npm run preview
```

Builds the Astro app (`dist/client` static assets + `dist/server` Worker) and runs it under `wrangler dev` using **local, dev-tier resources only** — the closest thing to the real Workers runtime without touching any remote/production data.

## 7. Backend API

Full endpoint reference (auth, RBAC, every resource, the lead pipeline, error codes): **`docs/API_DOCUMENTATION.md`**.

## 8. Testing

```bash
npm test                              # unit tests (Vitest) — no server needed
npm run preview                       # in another terminal: build + run under wrangler dev
node scripts/smoke-test.mjs           # live end-to-end smoke test against it
```

- **Unit tests** (`test/*.spec.ts`, 31 passing, pure logic, no bindings touched): password hashing, RBAC permission checks, pagination/query parsing, session JWT round-trip + tamper/expiry/malformed rejection, account-lockout threshold, CSRF Origin-matching.
- **Live smoke test** (`scripts/smoke-test.mjs`, 88/88 checks passing): exercises every API endpoint against a real running `wrangler dev` instance — login/logout, the three-role RBAC boundary (super admin vs. narrowed admin vs. editor), configurable-permissions endpoints, account lockout, Turnstile enforcement on login/leads/reset, CSRF Origin rejection, session-cookie attributes, server-side `/admin` route protection, password-change session invalidation, the full password-reset workflow, full CRUD + joins on several resources, media upload to R2, SEO metadata upsert, the complete lead pipeline (public create → admin status/assignment/notes → CSV export), rate limiting, and audit-log verification. Requires `npm run db:seed:local` first (uses the seeded dev super admin/admin/editor accounts). Repeatable — each run uses time-derived fake source IPs and emails so re-running it immediately doesn't trip the previous run's rate limits/lockouts.
- A D1-binding Vitest suite was written (`test/db.spec.ts.skip`) but is currently blocked by an upstream bug — see "Known rough edges" below. The live smoke test covers the same ground against real D1/R2.

## 9. Scripts reference

| Script                                         | Purpose                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`                                  | Astro dev server (primary local loop)                                              |
| `npm run build`                                | Build static assets + Worker to `dist/`                                            |
| `npm run preview`                              | Build, then run under `wrangler dev` (local resources)                             |
| `npm run check`                                | Astro + TypeScript diagnostics                                                     |
| `npm run lint` / `lint:fix`                    | ESLint                                                                             |
| `npm run format` / `format:check`              | Prettier                                                                           |
| `npm run cf:typegen`                           | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc`                       |
| `npm run db:generate`                          | Generate a Drizzle migration from schema changes                                   |
| `npm run db:migrate:local`                     | Apply migrations to local D1                                                       |
| `npm run db:migrate:dev:remote`                | Apply migrations to the real remote dev D1                                         |
| `npm run db:seed:local`                        | Apply dev-only fake sample data to local D1 (never staging/production)             |
| `npm test`                                     | Run unit tests (Vitest)                                                            |
| `npm run deploy:staging` / `deploy:production` | Build + deploy — **not used yet**, staging/production resources aren't provisioned |

Re-run `npm run cf:typegen` after any change to `wrangler.jsonc` bindings.

## 10. Project structure

```
src/
  pages/
    api/            Backend API routes (one folder per resource, [id].ts for item routes)
    index.astro     Public homepage
    about.astro, services/, portfolio/, case-studies/, industries/,
    blog/, contact.astro, privacy-policy.astro,
    terms-and-conditions.astro   Public marketing site (14 page types)
    robots.txt.ts, sitemap.xml.ts  Dynamic SEO endpoints
  components/
    home/            Homepage section components (Hero, ServicesOverview, …)
    layout/          Navbar, Footer
    ui/              Shared design-system primitives (Button, Container, Faq, …)
                     React islands (admin/public/shared) live alongside these
  content/           Static, non-DB marketing content (industries, service detail copy)
  layouts/           Astro layouts — `PublicLayout` (bare shell, used by admin auth
                     pages), `SiteLayout` (marketing chrome: nav + footer + SEO)
  middleware.ts     Resolves the session cookie into `locals.session` on every request
  lib/
    db/schema/      Drizzle schema, one file per domain, barrel-exported
    db/client.ts    `getDb()` + the shared `AppDb` type
    auth/           password hashing, session (jose), RBAC, permission constants
    http/           response envelopes, typed errors, pagination, the generic CRUD factory
    validation/     Zod schemas (mostly drizzle-zod derived)
    resources/      Factory-built CRUD resource definitions (shared between index.ts/[id].ts)
    rate-limit.ts   KV-backed fixed-window limiter
    audit.ts        Writes to activity_logs
    turnstile.ts    Server-side Turnstile verification
    content/public.ts  Published-only read queries for the public site
    seo.ts          SEO metadata defaults + JSON-LD schema builders
  env.d.ts          Astro.locals / Cloudflare runtime types
migrations/         Real migrations (schema + system reference data) — safe for every environment
seeds/              Dev-only fake sample data — local only, never applied to staging/production
scripts/            hash-password.mjs, create-super-admin.mjs, smoke-test.mjs
test/               Vitest unit tests
docs/               Planning + API documentation
wrangler.jsonc      Cloudflare bindings (D1/R2/KV), env-specific config
.dev.vars           Local secrets (gitignored)
```

## 11. Known rough edges (current tool versions, Nov 2026)

- **`wrangler.jsonc` has no top-level `main` field.** The `@astrojs/cloudflare` adapter's own build pipeline (`astro dev` / `build` / `check`) validates `main` points to an existing file _before_ that file is built — a chicken-and-egg problem if `main` is set at the root. The adapter instead writes its own `dist/server/wrangler.json` after each build with the correct `main`/`assets` paths; the `preview`/`deploy:*` scripts point `wrangler` at that generated file instead of the root config.
- **D1 local persistence must live outside `dist/`.** `dist/` is wiped on every build, so all local-D1-touching commands pass `--persist-to .wrangler/state` to keep local data across rebuilds.
- **`npm audit` reports 11 moderate / 6 high dev-only vulnerabilities**, mostly in `drizzle-kit`'s bundled `esbuild` and the vitest-plugin's bundled `ws`/`miniflare` chain (dev tooling, not the production bundle). Fixing `drizzle-kit`'s requires downgrading to a much older major version — not worth the regression; revisit when it ships an updated bundle.
- **`@cloudflare/vitest-plugin` v1.9.0 (the just-renamed replacement for the deprecated `vitest-pool-workers`) fails on any test file that touches a real Workers binding** (`import { env } from 'cloudflare:workers'`) in this environment:
  ```
  TypeError: Cannot destructure property 'Console' of 'require(...)' as it is undefined.
    at .../vitest-plugin/node_modules/undici/lib/mock/pending-interceptors-formatter.js
  ```
  This reproduces with the documented minimal config (`plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })]`), isn't listed on Cloudflare's known-issues page, and persists after installing the optional `bufferutil`/`utf-8-validate` native deps `ws` wants. It looks like a Vite 8 / Vitest 4 module-runner interop bug in this very new package, not an application bug. The D1-backed test suite was written anyway (`test/db.spec.ts.skip`, excluded from the `*.spec.ts` glob so `npm test` stays green) with a comment explaining the blocker — un-skip and rename back to `.spec.ts` once upstream fixes it. In the meantime, the same ground is covered by `scripts/smoke-test.mjs` against a live `wrangler dev` instance with real D1/R2.

## Status

- [x] Astro + TypeScript + Tailwind + React islands configured
- [x] `@astrojs/cloudflare` adapter configured (Workers target)
- [x] `wrangler.jsonc` with D1 + R2 + KV bindings — all dev resources live and created
- [x] Environment variable / secrets management (`.dev.vars`, Wrangler secrets)
- [x] Generated Cloudflare types (`worker-configuration.d.ts`)
- [x] Dev / build / preview / deploy scripts
- [x] ESLint + Prettier
- [x] Git + `.gitignore`
- [x] `/api/health` endpoint (checks D1 + R2)
- [x] Frontend ↔ backend connection verified (homepage React island calls `/api/health`)
- [x] Verified locally: `npm run dev` and `npm run preview` both serve the homepage (200) and a passing health check
- [x] Verified remotely: real upload/delete round-trip against the remote R2 bucket, migration applied to remote dev D1
- [x] **Phase 3** — 23-table normalized D1 schema (20 required + 3 join tables), real migrations (schema + seeded roles/permissions), dev-only seed data kept separate from migrations
- [x] RESTful CRUD for every resource, pagination/filter/sort/search, Zod validation, centralized error handling, consistent response envelopes, audit logging on every mutation, rate limiting on login + public lead creation
- [x] Full lead management API: status pipeline, assignment, notes, follow-up dates, source/country/service filters, CSV export
- [x] **Phase 4** — Super Admin / Admin / Editor role model with configurable, per-role permissions (`PUT /api/roles/:id/permissions`); PBKDF2-600k password hashing; server-side session management (signed JWT + `tokenVersion` invalidation on password change/reset, 8h expiry); password reset workflow (Turnstile-verified request → one-time token → reset); account lockout (5 failed attempts/email → 15 min) on top of IP rate limiting; `HttpOnly` + `Secure` + `SameSite=Strict` session cookie; CSRF Origin check on authenticated mutations; Turnstile on login, lead creation, and password-reset requests; server-enforced `/admin` route protection (not just client-side); no default/baked-in admin password anywhere — `scripts/create-super-admin.mjs` documents real provisioning
- [x] **Phase 5** — Full public website UI/UX: dark-charcoal/off-white/lime design system (Tailwind v4 `@theme` tokens, Space Grotesk + Inter), accessible Navbar/Footer, bento-grid homepage (16 sections), Services overview + 6 SSR service detail pages (hero/problem-solution/benefits/process/deliverables/case studies/FAQ/CTA), Portfolio + project detail, Case Studies + detail, Industries, Blog + post detail, Contact (lead form with Turnstile), Privacy Policy, Terms & Conditions. All list/detail content is D1-driven through `lib/content/public.ts` (published-only); industries and per-service long-form copy are static (`src/content/`) since they aren't well modeled by the existing schema. SEO: per-page canonical/OG/Twitter meta, Organization/Service/Article/BreadcrumbList/FAQPage JSON-LD, dynamic `/sitemap.xml` and `/robots.txt`. Respects `prefers-reduced-motion`; mobile nav is a vanilla-JS (non-React) toggle for performance. **Known scope cut:** no public media-serving endpoint exists yet (R2-backed images), so project/post imagery uses gradient placeholders rather than real `<img>` tags — wire up a media CDN route before using real photography.
- [x] `docs/API_DOCUMENTATION.md` updated to the actual implemented endpoints, including the full auth/security surface
- [x] Unit tests (31, Vitest) + live smoke test (88/88 checks) against a real `wrangler dev` instance with real D1/R2/KV, covering the full security surface above
- [ ] Staging/production resources and secrets (deferred — not deploying yet)

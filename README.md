# Hossain Growth

Premium digital marketing agency website + admin CMS, built on Astro (SSR) and Cloudflare's edge platform (Workers, D1, R2, KV, Turnstile).

Planning docs: see [`docs/`](./docs) — `PROJECT_REQUIREMENTS.md`, `TECHNICAL_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_DOCUMENTATION.md`, `DEVELOPMENT_ROADMAP.md`, `QA_REPORT.md`, `DEPLOYMENT_GUIDE.md`, `PRODUCTION_CHECKLIST.md`, `MAINTENANCE_GUIDE.md`.

This README covers **Phase 0/2 (infrastructure), Phase 3 (database architecture + backend API), Phase 4 (secure admin authentication & authorization), Phase 5 (public website UI/UX), Phase 6 (admin dashboard & CMS), Phase 7 (R2 media hardening & lead/notification pipeline), Phase 8 (SEO, performance, accessibility & QA), and Phase 9 (production deployment)**. The full Phase 8 audit is in **[`docs/QA_REPORT.md`](./docs/QA_REPORT.md)**; Phase 9's exact deployment steps, go/no-go checklist, and ongoing operations guide are in **[`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md)**, **[`docs/PRODUCTION_CHECKLIST.md`](./docs/PRODUCTION_CHECKLIST.md)**, and **[`docs/MAINTENANCE_GUIDE.md`](./docs/MAINTENANCE_GUIDE.md)**. **The site is live in production** at `https://hossain-growth-production.maffin-killer007.workers.dev` (workers.dev only — no custom domain registered yet; see those three docs for status and next steps).

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
| `EMAIL_API_KEY`        | Email provider API key (Resend)    | Blank — provider is `none` locally, so nothing tries to send                 |

Non-secret config (`SITE_URL`, `ENVIRONMENT`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `NOTIFICATION_EMAIL_TO`) lives in `wrangler.jsonc` under `vars` / `env.<name>.vars` — safe to commit, never put secrets there. `EMAIL_API_KEY` is the one exception kept out of `wrangler.jsonc` entirely, same as the other secrets above — it's declared only in `.dev.vars` locally and as a real Wrangler secret in staging/production.

For staging/production, set real secrets with:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY --env staging
npx wrangler secret put SESSION_SIGNING_KEY --env staging
npx wrangler secret put EMAIL_API_KEY --env staging
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

## Admin dashboard (Phase 6)

`/admin` is a full CMS dashboard built as React islands on top of the Phase 3/4 REST API, with a shared design system: collapsible sidebar, class-based dark/light mode (`src/styles/global.css` `.dark` token overrides, toggled and persisted from `AdminLayout.astro`), and a reusable kit (`src/components/admin/ui/`) — data table with sort/search/filter/pagination, modals, confirm dialogs, toasts, form fields, a dependency-free rich text editor, and a media picker. Most modules are instances of one config-driven `ResourceManager` component; Leads/CRM, the Media Library, SEO Manager, Site Settings, and Roles & Permissions are bespoke where the workflow doesn't fit a plain CRUD form.

The 15 modules: Overview, Services (+ categories), Portfolio, Case Studies, Blog Posts, Categories & Tags, Testimonials, Leads/CRM, Media Library, Website Pages, Navigation (+ redirects), SEO Manager, Site Settings, User Management (admin users + roles/permissions), and Activity Logs (read-only audit trail by design). The sidebar only shows modules the signed-in role has permission for, and every page re-checks that permission server-side (`hasPermission` + redirect) in addition to the API's own `requirePermission` checks — the dashboard never relies on hiding a nav link as its only access control.

A few real gaps surfaced while building this against the Phase 3 schema and were fixed rather than faked in the UI:

- **`leads.budget`**, **`portfolio_projects.industry`**, **`portfolio_projects.project_url`**, and **`portfolio_projects.is_featured`** didn't exist — added via `migrations/0004_phase6_crm_portfolio_fields.sql`. The public contact form now also collects an optional budget range.
- **No public media-serving route existed** (`GET /media/:id`, new) — needed for real image previews and a working "copy public URL" action in the Media Library, and for featured images to render for anonymous site visitors at all.
- **No way to replace a file's bytes in place** — `POST /api/media/:id/replace` overwrites the R2 object and metadata for the same asset id, so existing references (featured images, etc.) don't break.
- **No way to manually log a lead** without going through the public Turnstile-gated form — `POST /api/leads` now accepts an authenticated request with `leads.write` and skips Turnstile/rate-limiting for it (schema: `adminCreateLeadSchema`).
- **No lightweight "who can I assign this to" lookup** — `GET /api/admin-users/assignable` (any authenticated session, not gated behind `users.manage`) returns just `{id, name, email}` for active admins, used for lead assignment and author display.
- **No way to delete a role** — `DELETE /api/roles/:id` added; it's blocked with a clear `409 CONFLICT` if any admin user is still assigned to that role (the FK is `onDelete: 'restrict'`).
- `createCaseStudySchema`/`createPortfolioProjectSchema`/`createBlogPostSchema` rejected a plain ISO date **string** for `publishedAt`/`scheduledAt` (drizzle-zod's default mapping for a timestamp column requires an actual `Date`, which JSON can't carry) — overridden with `z.coerce.date()` so the dashboard (or any other JSON client) can actually set these fields.

**Known scope cut:** industries and the structured per-service landing-page copy (benefits/process/deliverables/FAQs) are still static TypeScript content (`src/content/`) from Phase 5, not database-backed, so there's no admin UI for editing them — see Phase 5's README notes for why.

## R2 media & lead pipeline hardening (Phase 7)

**Media library.** Uploads still go straight through the Worker to R2 (`env.MEDIA.put`) rather than via presigned URLs — the browser never sees an R2 credential either way, and a direct server-mediated upload is simpler and already fully exercised by `requirePermission(..., PERMISSIONS.MEDIA_WRITE)`. What Phase 7 adds on top:

- **Image metadata was always empty.** `width`/`height` on `media_assets` existed since Phase 3 but nothing ever populated them. `src/lib/image-dimensions.ts` reads them straight out of the file's header bytes (PNG/GIF/WebP/JPEG — no image library, Workers has none) on both upload and replace.
- **Orphaned file cleanup.** `GET /api/media/orphaned` finds media assets no record anywhere references (checked across every featured-image/avatar/gallery/OG-image column), excluding anything uploaded in the last hour so a file an admin just picked but hasn't attached yet is never flagged. `POST /api/media/orphaned` deletes the current candidates from both R2 and D1. Surfaced in the Media Library as a dismissible "N unused files" panel with a confirm-gated "Clean up" action.
- **Delivery endpoint.** Public delivery is the Worker-proxied `GET /media/:id` route added in Phase 6 (a "controlled delivery endpoint," per the brief) rather than a separate R2 custom domain — adding `media.hossaingrowth.com` as a direct R2 custom domain later is a Cloudflare dashboard + DNS change, not a code change, and would simply replace the base URL these routes already centralize.

**Lead system.** The one public form from Phase 5 is now four distinct, properly tagged entry points, all hitting the same `POST /api/leads`:

| Inquiry type             | Where                                                                                          | `source`               |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------- |
| General contact          | `/contact`                                                                                     | `contact_form`         |
| Consultation request     | `/contact?intent=consultation` (every "Book a Free Consultation" CTA site-wide now links here) | `consultation_request` |
| Service-specific inquiry | Bottom of every service page, service locked                                                   | `service_inquiry`      |
| Project inquiry          | Bottom of every portfolio project page                                                         | `project_inquiry`      |

Country, budget, and service selection were already there from Phase 6; Turnstile, server-side validation (Zod), and IP rate limiting (5/min) were already there from Phase 4/5. New in Phase 7:

- **Spam protection beyond Turnstile.** Every form includes a visually hidden honeypot field (`website_url`). A filled-in value means a bot auto-filled every input — the request still gets a normal `201` response (so the bot has no signal it was caught), but nothing is written to the `leads` table; the rejection is recorded in the activity log instead.
- **Duplicate handling.** A second submission from the same email within 15 minutes doesn't create a second lead — it's folded into the existing one as a note (`200`, not `201`, with the original lead's id), so a double-click or a "sorry, one more thing" resend doesn't clutter the CRM with near-duplicate rows.
- **Manual lead entry.** An authenticated request with `leads.write` (the dashboard's "Log lead" button) skips Turnstile/rate-limiting entirely and defaults `source` to `"manual"` — see `adminCreateLeadSchema` in Phase 6's notes above.

**Email notifications.** `src/lib/email.ts` is a tiny, swappable provider abstraction — `EMAIL_PROVIDER=resend` talks to Resend's HTTPS API (Workers has no raw SMTP socket API, so an HTTP-based provider is the only realistic choice), and `EMAIL_PROVIDER=none` (the local default) just skips sending. `src/lib/lead-notifications.ts` builds the agency-facing email from a successfully-created lead and calls it — **after** the `leads` row is already committed, inside its own `try/catch` that only logs on a genuine delivery failure (a misconfigured provider is not logged as a "failure," it's expected). A failed or unconfigured send can never roll back or block lead creation — this is unit-tested directly (`test/email.spec.ts`, `test/lead-notifications.spec.ts`) and confirmed live (`scripts/smoke-test.mjs`: a lead is still saved with `EMAIL_PROVIDER=none`).

## 8. Testing

```bash
npm test                              # unit tests (Vitest) — no server needed
npm run preview                       # in another terminal: build + run under wrangler dev
node scripts/smoke-test.mjs           # live end-to-end smoke test against it
```

- **Unit tests** (`test/*.spec.ts`, 54 passing, pure logic, no bindings touched): password hashing, RBAC permission checks, pagination/query parsing, session JWT round-trip + tamper/expiry/malformed rejection, account-lockout threshold, CSRF Origin-matching, image-dimension header parsing (`test/image-dimensions.spec.ts`), the email provider abstraction including HTTP-failure and network-failure paths (`test/email.spec.ts`), lead-notification failure handling (`test/lead-notifications.spec.ts`), SEO-override merging (`test/seo.spec.ts`), and the redirect cache's hit/miss/no-match paths (`test/redirect-cache.spec.ts`).
- **Live smoke test** (`scripts/smoke-test.mjs`, 119/119 checks passing): exercises every API endpoint against a real running `wrangler dev` instance — login/logout, the three-role RBAC boundary (super admin vs. narrowed admin vs. editor), configurable-permissions endpoints, account lockout, Turnstile enforcement on login/leads/reset, CSRF Origin rejection, session-cookie attributes, server-side `/admin` route protection, password-change session invalidation, the full password-reset workflow, full CRUD + joins on several resources, rate limiting, and audit-log verification. Phase 7 additions: media upload with extracted width/height, unauthorized-upload rejection, oversized-file rejection, in-place file replace (same id, new bytes, public URL serves the new content), the orphaned-media list and its permission-gated cleanup, the budget field end to end, authenticated manual lead creation bypassing Turnstile, the `assignable`-admins lookup for a non-`users.manage` role, honeypot spam rejection (confirmed no lead row is created), duplicate-submission merging into a note on the original lead, and lead creation succeeding with no email provider configured. Requires `npm run db:seed:local` first (uses the seeded dev super admin/admin/editor accounts). Repeatable — each run uses time-derived fake source IPs and emails so re-running it immediately doesn't trip the previous run's rate limits/lockouts; confirmed by running it twice consecutively.
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
    media/[id].ts   Public media-serving route (R2 bytes by asset id)
    admin/          Dashboard pages — one folder per module, thin Astro
                    wrappers that permission-gate + mount a React island
  components/
    home/            Homepage section components (Hero, ServicesOverview, …)
    layout/          Navbar, Footer
    ui/              Shared public design-system primitives (Button, Container, Faq, …)
    admin/
      ui/            Shared dashboard kit (Table, Modal, ConfirmDialog, Toast,
                     form fields, RichTextEditor, MediaPickerField, …)
      modules/       Per-module dashboard components (Blog, Portfolio, Leads, …)
      ResourceManager.tsx  Config-driven CRUD UI reused by most modules
  content/           Static, non-DB marketing content (industries, service detail copy)
  layouts/           Astro layouts — `PublicLayout` (bare shell, used by admin auth
                     pages), `SiteLayout` (marketing chrome: nav + footer + SEO),
                     `AdminLayout` (dashboard shell: sidebar + dark/light mode)
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
    email.ts        Swappable email-provider abstraction (Resend HTTP API, or "none")
    lead-notifications.ts  Builds + sends the new-lead email; never blocks lead creation
    image-dimensions.ts    Reads width/height from PNG/GIF/WebP/JPEG header bytes
    media-orphans.ts       Finds media assets no record references anywhere
    leads-constants.ts     Shared budget-band options (public form + admin CRM)
    content/public.ts  Published-only read queries for the public site
    admin/          Dashboard-only client code: API fetch wrapper, list/pagination
                    hook, toast event bus, icon set, datetime helpers
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
- [x] **Phase 5** — Full public website UI/UX: dark-charcoal/off-white/lime design system (Tailwind v4 `@theme` tokens, Space Grotesk + Inter), accessible Navbar/Footer, bento-grid homepage (16 sections), Services overview + 6 SSR service detail pages (hero/problem-solution/benefits/process/deliverables/case studies/FAQ/CTA), Portfolio + project detail, Case Studies + detail, Industries, Blog + post detail, Contact (lead form with Turnstile), Privacy Policy, Terms & Conditions. All list/detail content is D1-driven through `lib/content/public.ts` (published-only); industries and per-service long-form copy are static (`src/content/`) since they aren't well modeled by the existing schema. SEO: per-page canonical/OG/Twitter meta, Organization/Service/Article/BreadcrumbList/FAQPage JSON-LD, dynamic `/sitemap.xml` and `/robots.txt`. Respects `prefers-reduced-motion`; mobile nav is a vanilla-JS (non-React) toggle for performance. **Known scope cut at the time:** no public media-serving endpoint existed yet, so project/post imagery used gradient placeholders rather than real `<img>` tags — added in Phase 6 (`GET /media/:id`); the public pages still haven't been rewired to use it (unchanged scope cut, now just missing the plumbing fix rather than the plumbing itself).
- [x] **Phase 6** — Full admin dashboard & CMS at `/admin`: 15 permission-gated modules (Overview, Services, Portfolio, Case Studies, Blog Posts, Categories & Tags, Testimonials, Leads/CRM, Media Library, Website Pages, Navigation, SEO Manager, Site Settings, User Management, Activity Logs), all backed by real D1/R2 through the existing REST API — no mock data. Dashboard design system with dark/light mode; shared table/modal/form/toast kit; dependency-free rich text editor; media picker with upload/replace/delete/copy-URL. Fixed real gaps found along the way: added `leads.budget` and `portfolio_projects.industry`/`project_url`/`is_featured` (migration `0004`), a public media-serving route, in-place file replace, Turnstile-free manual lead entry for authenticated staff, an `assignable`-admins lookup not gated behind `users.manage`, role deletion with FK-conflict protection, and `z.coerce.date()` fixes so date fields actually accept JSON strings. See "Admin dashboard (Phase 6)" above for details.
- [x] **Phase 7** — R2 media hardening: image width/height actually extracted from file bytes on upload and replace (`lib/image-dimensions.ts`, no image library); orphaned-media detection and permission-gated cleanup (`GET`/`POST /api/media/orphaned`), surfaced in the dashboard. Lead system: the single public form split into four tagged inquiry types (general contact, consultation request, service-specific, project-specific — see "R2 media & lead pipeline hardening" above) all hitting the same hardened `POST /api/leads`; a honeypot field for spam beyond Turnstile (silently dropped, no signal to the bot); same-email resubmissions within 15 minutes merged into the original lead as a note instead of a duplicate row. Email notifications on new leads through a swappable, env-configured provider (`lib/email.ts` — Resend HTTP API or a no-op "none"), sent after the lead is already committed, inside a `try/catch` that only logs genuine delivery failures — a missing or failing provider can never lose lead data. Never hardcodes an API key: `EMAIL_API_KEY` follows the same secret-only pattern as `TURNSTILE_SECRET_KEY`.
- [x] `docs/API_DOCUMENTATION.md` updated to the actual implemented endpoints, including the full auth/security surface
- [x] **Phase 8** — SEO/performance/accessibility/QA audit, documented in full in **[`docs/QA_REPORT.md`](./docs/QA_REPORT.md)**. The two biggest real fixes: admin-set SEO overrides (title/description/canonical/OG image/noindex) were saved by the dashboard but never read back by any public page — now wired end to end; and the public site rendered zero real `<img>` tags anywhere despite every content type having an image field — now rendering real images with real alt text and explicit width/height (fixing a long-standing "known scope cut" from Phase 5/6). Also: admin-managed redirects were dead configuration, now enforced and KV-cached; added `ProfessionalService` schema (homepage) and self-referencing `hreflang`; fixed three real WCAG contrast failures (one color pair was ~1.8:1 against its background, far below the 4.5:1 minimum) found by computing exact ratios rather than eyeballing them; added a skip-to-content link to the admin dashboard; added light edge caching for public pages.
- [x] Unit tests (54, Vitest) + live smoke test (119/119 checks) against a real `wrangler dev` instance with real D1/R2/KV, covering the full security surface above; Phase 6 CRUD/permission boundaries verified live against `wrangler dev` (full create/update/delete cycles, media upload/replace/serve, admin lead creation, SEO upsert, role-based 403s and page redirects); Phase 7 additions verified live too (unauthorized/oversized upload rejection, in-place replace, orphan cleanup, honeypot rejection, duplicate merging, notification non-blocking behavior); Phase 8's redirect enforcement and SEO-override wiring verified live too (see QA report) — confirmed repeatable across multiple consecutive runs
- [x] **Phase 9** — Production deployment. Audited `package.json`'s production dependencies: found and removed `motion`, listed as a dependency but never imported anywhere in `src/`. Added baseline security response headers to every request (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) — a strict `Content-Security-Policy` was deliberately deferred (documented, with the exact plan, in `docs/MAINTENANCE_GUIDE.md` §7) rather than bolted on without testing, since this app relies on several un-nonced inline `<script>` tags that a strict CSP would break. Confirmed remote dev D1 had drifted — migration `0004` had never been applied there — and brought it current (dev-only, zero production impact). Created production D1, R2, and two KV namespaces; applied all 5 migrations to production D1 (verified 27 tables, 0 admin_users pre-seed, no dev data). Set `SESSION_SIGNING_KEY` and `TURNSTILE_SECRET_KEY` secrets. Fixed a real deploy-pipeline bug found during the first deploy: the Astro Cloudflare adapter's generated `dist/server/wrangler.json` is flat and does not carry `env.*` override blocks, so `wrangler deploy --env production` against it silently deployed with dev bindings despite the flag — added `scripts/apply-env-bindings.mjs`, run between build and deploy, to merge the correct named environment's bindings into the generated config before deploy; `deploy:staging`/`deploy:production` updated accordingly. Redeployed and confirmed the bindings table shows the real production D1/R2/KV/vars. Created the real Turnstile managed widget against the live workers.dev hostname and swapped it in (site key + secret), replacing the temporary Cloudflare test key. Updated `SITE_URL` to the real workers.dev URL. Provisioned the first Super Admin account directly in production D1 via `scripts/create-super-admin.mjs`. Verified live: homepage, admin login page, sitemap.xml, robots.txt, DB-backed `/services` listing, and that both public and admin login forms render the real Turnstile widget. Wrote `docs/DEPLOYMENT_GUIDE.md`, `docs/PRODUCTION_CHECKLIST.md`, and `docs/MAINTENANCE_GUIDE.md`. No custom domain yet — launched on workers.dev per explicit instruction; no existing Cloudflare resources were deleted, recreated, or overwritten.
- [ ] Staging/production resources, secrets, and the actual production deployment (deferred — awaiting explicit approval; see `docs/DEPLOYMENT_GUIDE.md`)

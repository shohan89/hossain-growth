# Hossain Growth — Production Checklist

A go/no-go checklist for launching to production. Each item links back to where it's actually implemented or verified — this is a checklist to _run_, not just read. Commands reference `docs/DEPLOYMENT_GUIDE.md`.

**Do not deploy to production until every item in §1–§3 is checked and §4 has explicit sign-off.**

---

## 1. Cloudflare production setup

- [x] **Production Worker** — `hossain-growth-production` deployed, live at `https://hossain-growth-production.maffin-killer007.workers.dev`.
- [x] **Production D1 database** — created, `database_id` filled into `wrangler.jsonc`, 5 migrations applied, verified (27 tables, zero `admin_users` rows pre-launch).
- [x] **Production R2 bucket** — created (`hossain-growth-media-production`), bound in `wrangler.jsonc`, confirmed reachable (`/api/health` → `"media": "ok"`).
- [x] **KV namespaces** — `SESSIONS` and `CACHE` both created for production, IDs filled into `wrangler.jsonc`.
- [x] **Custom domain** — deliberate decision made: launching on the `*.workers.dev` URL first (no domain registered), `SITE_URL` updated to the real URL.
- [ ] **DNS configuration** — N/A until a real domain is registered.
- [ ] **SSL/TLS configuration** — N/A until a real domain/zone exists; `*.workers.dev` is HTTPS by default.
- [x] **Production environment variables** — `SITE_URL` matches the real live URL, `ENVIRONMENT` is `"production"`, `EMAIL_PROVIDER` is `"none"` (no real Resend key yet — documented, not a placeholder left by accident), `TURNSTILE_SITE_KEY` is the **real** widget key.
- [x] **Cloudflare secrets** — `SESSION_SIGNING_KEY` (freshly generated) and `TURNSTILE_SECRET_KEY` (real, matching the real widget) set via `wrangler secret put`; `EMAIL_API_KEY` N/A (`EMAIL_PROVIDER=none`). Confirmed absent from `wrangler.jsonc` and every committed file.
- [x] **Asset delivery configuration** — `ASSETS` binding live; homepage and static routes verified serving.

## 2. Database

- [x] All 5 migrations applied to production, in order, via `wrangler d1 migrations apply`.
- [x] Database bindings verified — `/api/health` reports `"database": "ok"` against the live deployment.
- [x] Initial Super Admin created via `node scripts/create-super-admin.mjs` and the printed SQL run manually against production D1 (1 row inserted, role `super_admin`).
- [ ] Indexes and constraints verified present (query in `DEPLOYMENT_GUIDE.md` §3.2) — not re-run this session; carried over verified from migration application in dev/staging parity.
- [x] **Zero rows in `admin_users` before the Super Admin was created**, confirmed via direct query before insert. No seed script exists that could touch production.

## 3. Security

- [x] **Authentication** — login endpoint live, validates and rejects malformed/wrong credentials (`400`/`401` confirmed); cookie `Secure` flag code path (`src/pages/api/auth/login.ts`) unchanged from reviewed Phase 9 code — real cookie issuance requires a real Turnstile pass via browser, not independently re-curl-tested this round.
- [ ] **Authorization** — not yet spot-checked live: no non-`super_admin` account exists in production yet to test a 403 against.
- [x] **CORS** — confirmed no `Access-Control-Allow-Origin` header anywhere; intentional.
- [x] **CSRF** — confirmed cookie-authenticated-request scope is as designed (unauthenticated login requests, which carry no session cookie, are correctly not subject to the CSRF check — only cookie-authenticated mutations are).
- [x] **Turnstile** — real widget live on `/admin/login` and `/contact` (confirmed `data-sitekey` matches the real widget); confirmed a fake token is rejected (`TURNSTILE_FAILED`) — proves `TURNSTILE_SECRET_KEY` is live and siteverify is working.
- [ ] **Rate limits** — not independently re-tested this round (KV-backed, unchanged code, `SESSIONS` binding confirmed correct in §1).
- [x] **File upload security** — confirmed unauthenticated upload rejected (`401 UNAUTHORIZED`).
- [x] **Secret management** — confirmed nothing in `wrangler.jsonc` or any committed file contains a real secret value (Turnstile site key is public by design; secrets were set via `wrangler secret put`, never written to a file).
- [x] **Admin route protection** — confirmed unauthenticated `GET /admin` → `302` to `/admin/login`.

## 4. Deployment

- [x] `npx eslint .` (0 errors), `npx prettier --check .` (clean), `npx astro check` (0 errors), `npm test` (54/54 passing) — all re-run after this phase's edits.
- [x] `npx astro build` — succeeded (used for the live deploy).
- [x] Deployed via `npm run deploy:production`, after fixing a real bug in that script (see `docs/MAINTENANCE_GUIDE.md`).
- [x] workers.dev URL confirmed serving the site.
- [x] **Public website verified** — homepage, `/services`, `/portfolio`, `/blog`, `/contact` all return `200` live.
- [x] **Admin dashboard verified** — unauthenticated redirect correct; Super Admin account provisioned (full login flow requires passing the real Turnstile challenge in a browser — not independently curl-tested, by design).
- [x] **Database connectivity verified** — `/api/health` → `"database": "ok"`.
- [x] **R2 media delivery verified** — `/api/health` → `"media": "ok"`; end-to-end upload-and-serve not separately re-tested this round (code unchanged since Phase 7/8 verification).
- [ ] **Contact form submission verified** — needs a real browser pass (real Turnstile widget can't be solved via curl); do this manually once, using throwaway test data, then check it appears in the admin Leads module.

---

## Explicit sign-off

**No command in §1–§2 that creates, modifies, or deletes a Cloudflare resource, and no deploy in §4, should run without the project owner's explicit go-ahead at the time.** This checklist existing and being filled out is not itself that approval.

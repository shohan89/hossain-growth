# Hossain Growth — API Documentation (Implemented)

This replaces the Phase 1 plan with what Phases 3–8 actually built and tested. All routes live under `/api/*` in the Astro-on-Workers app (`src/pages/api/`), with two deliberate exceptions served outside `/api/*` for public, unauthenticated delivery: `GET /media/:id` (media bytes) and the SEO endpoints `GET /sitemap.xml` / `GET /robots.txt`. Confirmed working via `scripts/smoke-test.mjs` against a live `wrangler dev` instance (119/119 checks passing) plus unit tests in `test/` (54 passing). Phase 8's full SEO/performance/accessibility/QA audit is in **`docs/QA_REPORT.md`**.

## Conventions

- **Auth**: session cookie (`hg_session`, HttpOnly, Secure outside local dev, `SameSite=Strict`, signed JWT via `jose`, 8-hour expiry), set by `POST /api/auth/login`. Sent automatically by browsers; no header needed.
- **Authorization**: every protected route calls `requirePermission(session, 'resource.action')`. Missing session → `401 UNAUTHORIZED`. Session present but missing permission → `403 FORBIDDEN`.
- **Session invalidation**: each admin user has a `tokenVersion` counter, embedded in the JWT and mirrored into KV at login. Changing or resetting a password bumps it, which invalidates that JWT (and every other outstanding session for that user) on their very next request — `src/middleware.ts` checks the live KV value on every request and fails closed if it's missing or doesn't match.
- **CSRF**: `SameSite=Strict` is the primary defense. As defense-in-depth, the middleware also rejects (`403 CSRF_REJECTED`) any cookie-authenticated, state-changing (`POST`/`PUT`/`PATCH`/`DELETE`) `/api/*` request whose `Origin` header is present but doesn't match the site's own origin. Public, unauthenticated endpoints (login, lead creation) are exempt — there's no prior session to forge there; Turnstile + rate limiting + account lockout cover those instead.
- **Validation**: every request body is parsed with a Zod schema (mostly derived from the Drizzle table via `drizzle-zod`). Failures → `400 VALIDATION_ERROR` with a `details` array of Zod issues.
- **Responses**: single resource → `{ "data": {...} }`. List → `{ "data": [...], "pagination": { page, pageSize, total, totalPages } }`. Errors → `{ "error": { "code", "message", "details"? } }`.
- **Pagination/sort/search** (list endpoints): `?page=1&pageSize=20&sortBy=<allow-listed column>&sortDir=asc|desc&search=<text>`. `sortBy` is rejected with `400` if not in that endpoint's allow-list (prevents sorting by arbitrary/unindexed/sensitive columns).
- **SQL injection**: 100% Drizzle ORM query builder with parameter binding — no raw string-interpolated SQL anywhere in request-handling code.
- **Audit logging**: every create/update/delete on every resource below writes a row to `activity_logs` (`action`, `entityType`, `entityId`, `userId`, `ipAddress`).
- **Rate limiting**: KV-backed fixed-window limits on `POST /api/auth/login` (10/min per IP), `POST /api/auth/request-password-reset` (5/min per IP), `POST /api/auth/reset-password` (10/min per IP), and `POST /api/leads` (5/min per IP) → `429 RATE_LIMITED`.
- **Account lockout**: independent of the IP rate limit above, 5 failed login attempts for the same email locks that account for 15 minutes (`423 ACCOUNT_LOCKED`), regardless of which IP the attempts came from — this is what actually stops credential stuffing against one account from many IPs.

## Error codes

| HTTP | Code                  | Meaning                                                 |
| ---- | --------------------- | ------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`    | Zod validation failed; `details` has the issue list     |
| 401  | `UNAUTHORIZED`        | No/invalid session                                      |
| 401  | `INVALID_CREDENTIALS` | Login/change-password credential check failed           |
| 403  | `FORBIDDEN`           | Session valid, permission missing                       |
| 403  | `CSRF_REJECTED`       | Authenticated mutating request with a mismatched Origin |
| 404  | `NOT_FOUND`           | Resource doesn't exist                                  |
| 409  | `CONFLICT`            | Unique constraint violation (duplicate slug/email/etc.) |
| 400  | `TURNSTILE_FAILED`    | Bot verification failed (login, lead, or reset request) |
| 400  | `INVALID_RESET_TOKEN` | Password reset token is wrong, expired, or already used |
| 423  | `ACCOUNT_LOCKED`      | Too many failed login attempts for this email           |
| 429  | `RATE_LIMITED`        | Too many requests from this IP for this action          |
| 500  | `INTERNAL_ERROR`      | Unhandled error                                         |

## 1. Auth — `/api/auth/*`

| Method | Path                               | Auth                                                      | Description                                                                                                                                                                                                                                                                                                                              |
| ------ | ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`                  | public, rate-limited, account-lockout, Turnstile-verified | `{ email, password, turnstileToken }` → sets session cookie, returns `{ id, email, name, role, permissions }`                                                                                                                                                                                                                            |
| POST   | `/api/auth/logout`                 | any                                                       | Clears session cookie                                                                                                                                                                                                                                                                                                                    |
| GET    | `/api/auth/me`                     | session                                                   | Current user's `{ id, email, role, permissions }`                                                                                                                                                                                                                                                                                        |
| POST   | `/api/auth/change-password`        | session                                                   | `{ currentPassword, newPassword }` → bumps `tokenVersion` (invalidates every session for this user, including the current one) and clears the cookie                                                                                                                                                                                     |
| POST   | `/api/auth/request-password-reset` | public, rate-limited, Turnstile-verified                  | `{ email, turnstileToken }` → always the same generic response whether or not the email exists (no account enumeration). In `development` only, the response also includes `devOnlyResetToken` — there's no email provider wired up yet, so this is the only way to exercise the flow locally; it is never present outside `development` |
| POST   | `/api/auth/reset-password`         | public, rate-limited                                      | `{ token, newPassword }` → sets the new password, bumps `tokenVersion`, marks the token used (one-time, 30-minute expiry)                                                                                                                                                                                                                |

### Admin UI route structure

Server-enforced, not just client-side: `src/middleware.ts` redirects any unauthenticated request under `/admin/*` (except `/admin/login`) to `/admin/login?next=<path>` with a `302`, before the page ever renders. `src/layouts/AdminLayout.astro` re-checks `Astro.locals.session` itself as well, so a protected page is never one accidental refactor away from being exposed. Pages: `/admin/login`, `/admin/forgot-password`, `/admin/reset-password?token=...` (all public), `/admin` (protected dashboard placeholder — full CMS screens are a later phase).

## 2. Admin Users — `/api/admin-users` (permission: `users.manage`)

| Method | Path                                        | Description                                                                                                                                                                                      |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/admin-users?page&pageSize&sortBy=name | email                                                                                                                                                                                            | createdAt | lastLoginAt&sortDir&search` | List, joined with role key |
| POST   | `/api/admin-users`                          | `{ email, password (≥12 chars), name, roleId, isActive? }` → 201                                                                                                                                 |
| GET    | `/api/admin-users/:id`                      | Detail (never includes `passwordHash`)                                                                                                                                                           |
| PATCH  | `/api/admin-users/:id`                      | Partial update; `password` rehashes                                                                                                                                                              |
| DELETE | `/api/admin-users/:id`                      | Soft delete — sets `isActive = false`, preserves FK history (authored content, audit logs)                                                                                                       |
| GET    | `/api/admin-users/assignable`               | `{ id, name, email }[]` for active admins — any authenticated session, **not** gated behind `users.manage`. Used for lead assignment and author display without exposing full account management |

`users.manage` is **super_admin-only** (see role model below) — an `admin` cannot create, edit, or deactivate other admin users.

## 3. Roles & Permissions (permission: `roles.manage`, super_admin-only)

| Method | Path                         | Description                                                                                                                                                                              |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/roles`                 | All roles with their resolved `permissions: string[]`                                                                                                                                    |
| POST   | `/api/roles`                 | `{ key, name, description? }` → create a custom role with no permissions yet                                                                                                             |
| GET    | `/api/roles/:id`             | One role with its resolved permissions                                                                                                                                                   |
| PATCH  | `/api/roles/:id`             | `{ name?, description? }`                                                                                                                                                                |
| DELETE | `/api/roles/:id`             | `204`; `409 CONFLICT` if any admin user is still assigned to the role (`admin_users.role_id` is `onDelete: 'restrict'`)                                                                  |
| PUT    | `/api/roles/:id/permissions` | `{ permissionKeys: string[] }` → **replaces** the role's entire permission set. This is what makes permissions configurable rather than hardcoded; unknown keys → `400 VALIDATION_ERROR` |
| GET    | `/api/permissions`           | All permission keys + descriptions (~35)                                                                                                                                                 |

### Role model

| Role        | Key           | Access                                                                           |
| ----------- | ------------- | -------------------------------------------------------------------------------- |
| Super Admin | `super_admin` | Every permission, including `users.manage` and `roles.manage`                    |
| Admin       | `admin`       | Content, leads, media, and settings — **not** user or role management            |
| Editor      | `editor`      | Content and leads (including `blog.publish`) — **not** settings, users, or roles |

Seeded by `migrations/0001_seed_reference_data.sql` (permission catalog + `admin`/`editor` as originally scoped) and `migrations/0003_realign_roles.sql` (adds `super_admin`, narrows `admin` by revoking `users.manage`/`roles.manage`, drops the earlier `viewer` role). Both are real migrations — this is system configuration, not sample data, so it's safe and expected in every environment. The three roles above are the starting point, not a hardcoded ceiling: any role's permission set can be changed via `PUT /api/roles/:id/permissions`, and new roles can be created via `POST /api/roles`.

## 4. Services — `/api/services`, `/api/service-categories` (permission: `services.{read,write,delete}`)

Both are standard CRUD resources built on the shared factory (`src/lib/http/crud.ts`):

| Method                                     | Path                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| GET                                        | `/api/service-categories?sortBy=name                      | slug | orderIndex` |
| POST / GET /:id / PATCH /:id / DELETE /:id | `/api/service-categories`                                 |
| GET                                        | `/api/services?categoryId&isPublished&search&sortBy=title | slug | orderIndex  | createdAt | updatedAt` |
| POST / GET /:id / PATCH /:id / DELETE /:id | `/api/services`                                           |

## 5. Portfolio Projects — `/api/portfolio-projects` (permission: `portfolio.{read,write,delete}`)

Bespoke (manages the `portfolio_project_images` join table). Fields include `clientName`, `industry`, `projectUrl`, `summary`, `content`, `serviceIds: string[]`, `resultsMetrics: Record<string,string>`, `featuredImageId`, `isFeatured`, `isPublished`, `publishedAt` (`industry`/`projectUrl`/`isFeatured` added in `migrations/0004_phase6_crm_portfolio_fields.sql`).

| Method | Path                                                                | Notes                                                                 |
| ------ | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/portfolio-projects?isPublished&isFeatured&search&sortBy=title | slug                                                                  | createdAt | updatedAt | publishedAt` |     |
| POST   | `/api/portfolio-projects`                                           | Body includes optional `imageIds: string[]` (ordered media asset IDs) |
| GET    | `/api/portfolio-projects/:id`                                       | Includes resolved `images: [{ id, r2Key, altText, orderIndex }]`      |
| PATCH  | `/api/portfolio-projects/:id`                                       | `imageIds` (if present) fully replaces the image set                  |
| DELETE | `/api/portfolio-projects/:id`                                       | Cascades `portfolio_project_images`                                   |

## 6. Case Studies — `/api/case-studies` (permission: `case_studies.{read,write,delete}`)

Standard CRUD (factory-built). `GET /api/case-studies?isPublished&portfolioProjectId&search&sortBy=title|slug|createdAt|updatedAt|publishedAt`.

## 7. Blog — `/api/blog-categories`, `/api/blog-tags`, `/api/blog-posts` (permission: `blog.{read,write,delete}`, plus `blog.publish`)

Categories and tags are standard CRUD. Posts are bespoke (manage the `blog_post_tags` join table and gate publishing):

| Method | Path                                                   | Notes                                                                                                                          |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/blog-posts?status&categoryId&search&sortBy=title | slug                                                                                                                           | status | createdAt | updatedAt | publishedAt` |     |
| POST   | `/api/blog-posts`                                      | Body includes optional `tagIds: string[]`. Setting `status: "published"` or `"scheduled"` additionally requires `blog.publish` |
| GET    | `/api/blog-posts/:id`                                  | Includes resolved `tags: [{ id, slug, name }]`                                                                                 |
| PATCH  | `/api/blog-posts/:id`                                  | Same publish-permission gate on status changes                                                                                 |
| DELETE | `/api/blog-posts/:id`                                  | Cascades `blog_post_tags`                                                                                                      |

## 8. Testimonials — `/api/testimonials` (permission: `testimonials.{read,write,delete}`)

Standard CRUD. `GET /api/testimonials?isPublished&portfolioProjectId&sortBy=clientName|orderIndex|createdAt|rating`.

## 9. Website Pages & Navigation — `/api/website-pages`, `/api/navigation-items`

- Pages: permission `pages.{read,write,delete}`. `GET /api/website-pages?isPublished&search&sortBy=title|slug|createdAt|updatedAt`.
- Navigation: permission `navigation.write` for read/write/delete alike (low-traffic admin config, no separate read grant). `GET /api/navigation-items?location=header|footer&parentId&sortBy=orderIndex|label|location`.

## 10. Media Library — `/api/media` (permission: `media.{read,write,delete}`)

| Method | Path                               | Notes                                                                                                                                                                                                                |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/media?search&sortBy=fileName | createdAt                                                                                                                                                                                                            | sizeBytes` |     |
| POST   | `/api/media`                       | `multipart/form-data`: `file` (required), `altText` (optional). Max 10 MB; allowed types: jpeg, png, webp, gif, svg, pdf. Streams to R2 (`env.MEDIA`), stores metadata in D1                                         |
| GET    | `/api/media/:id`                   |                                                                                                                                                                                                                      |
| PATCH  | `/api/media/:id`                   | `{ altText?, fileName? }`                                                                                                                                                                                            |
| POST   | `/api/media/:id/replace`           | `multipart/form-data`: `file`. Overwrites the R2 object **in place** (same `r2Key`/id), updates `fileName`/`mimeType`/`sizeBytes` — existing references (e.g. a service's `featuredImageId`) keep working            |
| DELETE | `/api/media/:id`                   | Deletes from both R2 and D1                                                                                                                                                                                          |
| GET    | `/api/media/orphaned`              | Media assets no record anywhere references (checked against `portfolio_projects`/`portfolio_project_images`/`case_studies`/`blog_posts`/`testimonials`/`seo_metadata`), excluding anything uploaded in the last hour |
| POST   | `/api/media/orphaned`              | `media.delete` required. Deletes every current orphan candidate from both R2 and D1; `{ deleted: <count> }`                                                                                                          |

**Public serving route (not under `/api`):** `GET /media/:id` streams the asset's bytes with its stored `mimeType` and an aggressive immutable cache header. Deliberately unauthenticated — featured images, etc. need to render for anonymous site visitors, same as any CDN image URL. This is the chosen "controlled delivery endpoint"; a real R2 custom domain (e.g. `media.hossaingrowth.com` bound directly to the bucket) is a Cloudflare dashboard/DNS change for later, not a code change.

Upload and replace now also extract `width`/`height` from the file's own header bytes (`src/lib/image-dimensions.ts` — PNG/GIF/WebP/JPEG; no image library, since Workers has none) and store them alongside the existing metadata. Uploads still go directly through the Worker to R2 rather than via presigned URLs — the browser never touches an R2 credential either way, and `requirePermission(..., media.write)` already gates who can upload.

## 11. SEO Metadata — `/api/seo-metadata/:entityType/:entityId` (permission: `seo.write`)

Polymorphic — `entityType` ∈ `page | blog_post | portfolio_project | case_study | service`.

| Method | Path                                      | Notes                                       |
| ------ | ----------------------------------------- | ------------------------------------------- |
| GET    | `/api/seo-metadata/:entityType/:entityId` | 404 if none set                             |
| PUT    | `/api/seo-metadata/:entityType/:entityId` | Upserts; 201 on first create, 200 on update |

**As of Phase 8, this actually does something on the public site.** Before then, the dashboard could save an override here and the corresponding public page would ignore it entirely. `resolveSeo()` (`src/lib/seo.ts`) now merges this record on top of each page's own computed title/description/canonical/OG-image/noindex — see `docs/QA_REPORT.md` §1a.

## 12. Redirects — `/api/redirects` (permission: `redirects.write`)

Standard CRUD. `GET /api/redirects?search&sortBy=fromPath|createdAt`. `statusCode` restricted to 301/302/307/308.

**As of Phase 8, this actually redirects traffic.** Before then, rows in this table had no effect on the live site. `src/middleware.ts` now checks every public GET request's path against this table (via a 5-minute KV cache — see `src/lib/redirect-cache.ts` — so it doesn't cost a D1 query per page view) and issues the configured redirect. A create/update/delete through this API busts that cache immediately. See `docs/QA_REPORT.md` §1c.

## 13. Site Settings — `/api/site-settings` (permission: `settings.write`)

Key-value store.

| Method | Path                      | Notes                           |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/api/site-settings`      | All settings                    |
| GET    | `/api/site-settings/:key` | One setting                     |
| PUT    | `/api/site-settings/:key` | `{ value: <any JSON> }`, upsert |

## 14. Leads (CRM) — `/api/leads/*`

The full lead-management requirement from Phase 3, implemented as a bespoke resource (not the generic factory, due to the public-create path, assignment permission, notes sub-resource, and CSV export).

Statuses: `new`, `contacted`, `qualified`, `proposal_sent`, `won`, `lost`. `budget` (free-text band, e.g. `"$5,000–$10,000/mo"`) added in `migrations/0004_phase6_crm_portfolio_fields.sql`.

**Four public entry points, one endpoint.** The public site has four distinct inquiry forms — general contact (`/contact`), consultation request (`/contact?intent=consultation`), service-specific (bottom of every service page), and project-specific (bottom of every portfolio project page) — and all of them `POST` here with a different `source` (`contact_form` / `consultation_request` / `service_inquiry` / `project_inquiry`) and, for the service/project forms, a preset or scoped `serviceInterest`.

**Spam protection beyond Turnstile.** Every public form includes a visually hidden honeypot field, `website_url` in the request body. A non-empty value means a bot auto-filled every input on the form: the request still gets a normal `201` with a fabricated-looking success body (so the bot has no signal it was caught), but nothing is written to `leads` — the rejection is recorded instead as an `activity_logs` row (`lead.spam_rejected`).

**Duplicate handling.** Before inserting, the public branch checks for an existing lead with the same (lowercased) email created within the last 15 minutes. If found, the new submission's message is appended as a note on that existing lead (`lead.duplicate_merged` in the activity log) and the response is `200` with the _existing_ lead, not a new `201` — a double-click or an immediate resend never produces a second row for the same inquiry.

**Email notification.** After a genuinely new lead is inserted (the public, non-duplicate, non-spam path only — not the admin manual-create branch, since staff don't need to be notified of their own entry), `notifyNewLead` builds and sends an email to `NOTIFICATION_EMAIL_TO` via whatever `EMAIL_PROVIDER` is configured (see `src/lib/email.ts`). This happens strictly after the D1 write has already committed, inside a `try/catch` that only logs a failure for a genuine delivery error (`lead.notification_failed`) — an intentionally unconfigured provider is not treated as a failure at all. Either way, the lead is never lost and the API response is unaffected by whether the email sent.

| Method | Path                                                                                                                                | Auth                                                                      | Notes                                                                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/leads`                                                                                                                        | **public**, rate-limited (5/min/IP), Turnstile-verified                   | `{ name, email, phone?, company?, country?, budget?, message?, source, serviceInterest?: string[], turnstileToken }`. Server calls Cloudflare's `siteverify` before inserting                                                                               |
| POST   | `/api/leads`                                                                                                                        | **authenticated**, `leads.write`                                          | Same endpoint, different branch: an authenticated request with `leads.write` is treated as staff manually logging a lead (phone call, in person) and skips Turnstile/rate-limiting entirely — no `turnstileToken` required, `source` defaults to `"manual"` |
| GET    | `/api/leads?status&country&budget&source&assignedTo&serviceInterest&search&sortBy=createdAt\|updatedAt\|name\|status\|followUpDate` | `leads.read`                                                              | `serviceInterest` matches against the JSON array column                                                                                                                                                                                                     |
| GET    | `/api/leads/:id`                                                                                                                    | `leads.read`                                                              | Includes resolved `notes: [{ id, note, createdAt, authorName }]`                                                                                                                                                                                            |
| PATCH  | `/api/leads/:id`                                                                                                                    | `leads.write`; changing `assignedTo` additionally requires `leads.assign` | `{ status?, assignedTo?, followUpDate?, name?, email?, phone?, company?, country?, budget?, message?, source?, serviceInterest? }`                                                                                                                          |
| DELETE | `/api/leads/:id`                                                                                                                    | `leads.delete`                                                            |                                                                                                                                                                                                                                                             |
| POST   | `/api/leads/:id/notes`                                                                                                              | `leads.write`                                                             | `{ note }` → 201                                                                                                                                                                                                                                            |
| GET    | `/api/leads/export?status&country&budget&source&search`                                                                             | `leads.export`                                                            | Streams CSV (`content-disposition: attachment`), now including the `budget` column                                                                                                                                                                          |

## 15. Activity Logs (Audit) — `/api/activity-logs` (permission: `activity_logs.read`)

Read-only. `GET /api/activity-logs?entityType&userId&page&pageSize` — every mutating action across every resource above is recorded here.

## Testing

- **Unit tests** (`npm test`, Vitest, 54 passing, no live server needed): `test/password.spec.ts` (PBKDF2 hash/verify), `test/rbac.spec.ts` (permission checks), `test/pagination.spec.ts` (query parsing), `test/session.spec.ts` (JWT round-trip, tampered/expired/malformed token rejection), `test/lockout.spec.ts` (lockout threshold), `test/csrf.spec.ts` (Origin-matching logic), `test/image-dimensions.spec.ts` (PNG/GIF/WebP/JPEG header parsing against real-structure byte buffers), `test/email.spec.ts` (the provider abstraction: no-op when unconfigured, Resend success, HTTP failure, network failure, unsupported provider), `test/lead-notifications.spec.ts` (never throws; logs a failure only for a genuine delivery error, not an intentionally-unconfigured provider), `test/seo.spec.ts` (SEO override merging — default fallback, field-by-field override, image-id precedence), `test/redirect-cache.spec.ts` (cache miss builds and caches the map, cache hit skips D1 entirely, no-match returns null).
- **Live smoke test** (`node scripts/smoke-test.mjs`, 119/119 checks passing): exercises every endpoint above against a running `wrangler dev` instance, including the full Phase 4 security surface — account lockout (5 failures → `423`, independent per email), login/reset Turnstile enforcement, the three-role boundary (super admin vs. narrowed admin vs. editor) including the configurable-permissions endpoints, CSRF Origin rejection, session-cookie attributes (`HttpOnly`, `SameSite=Strict`), server-side `/admin` route redirection, password change invalidating the current session immediately, and the complete password-reset workflow (request → dev-only token → reset → old password rejected → new password accepted → token can't be reused). Plus everything from Phase 3: RBAC boundaries, validation errors, CRUD + joins (portfolio images, blog tags), media upload (R2), SEO upsert, site settings, the full lead pipeline including CSV export, and audit log verification. **Phase 7 additions:** upload of a disallowed MIME type (`400`), upload with no session at all (`401`), upload over the 10 MB limit (`400`), extracted `width`/`height` on a real 1×1 PNG, in-place replace (`POST /api/media/:id/replace` — same id, new bytes, confirmed via the public URL that the served content actually changed, and that the new dimensions were re-extracted), the orphaned-media list excluding a just-uploaded file (age grace period) and the cleanup endpoint rejecting an `editor` session (no `media.delete`), the `budget` field round-tripping through create/read/CSV export, authenticated manual lead creation with no `turnstileToken`, the `assignable`-admins lookup working for a role without `users.manage`, a honeypot-filled submission returning `201` while creating zero `leads` rows, a same-email resubmission within the duplicate window resolving to the original lead's id with the new message captured as a note, and a lead still being created successfully with `EMAIL_PROVIDER=none`. **Phase 8 additions:** a newly created redirect takes effect on the very next request (no cache propagation delay), following it lands at the configured destination, deleting it makes the path 404 again, and an SEO Manager override (title/description/noindex) actually shows up in a public page's rendered `<head>`. Confirmed against local D1/R2/KV, repeatable across two consecutive runs.
- A D1-binding Vitest integration suite (`test/db.spec.ts.skip`) was written but is currently blocked by an upstream `@cloudflare/vitest-plugin` v1.9.0 module-resolution bug in this environment (see comment at the top of that file and `README.md` → "Known rough edges"). The same logic it would have tested is covered by the live smoke test instead.
- **Phase 6 (admin dashboard) endpoints** were verified live against `wrangler dev`, outside `scripts/smoke-test.mjs`: full create/update/delete cycles on `/api/services`; media upload → `/media/:id` public serving → `/api/media/:id/replace` (confirmed the served bytes actually changed) → delete; the authenticated manual-lead-creation branch of `POST /api/leads`; an SEO metadata upsert; and the permission boundary itself — an `editor` session gets a `302` redirect from `/admin/users` (no `users.manage`) and a `403` attempting `DELETE /api/services/:id` (no `services.delete`), while the same session can create a service (has `services.write`) and load `/admin/leads` (has `leads.read`).

## Initial Super Admin provisioning

No migration or seed file ever creates an admin user outside local dev — there is no default admin account in this codebase, in any environment. To provision the first real Super Admin for staging or production:

```bash
node scripts/create-super-admin.mjs <email> "<name>"
```

It prompts for the password locally, hashes it with the same algorithm the app uses, and **prints** the `INSERT` SQL — it never runs it for you. Run the printed command yourself against the target environment, e.g.:

```bash
npx wrangler d1 execute hossain-growth-production --remote --command "<printed SQL>"
```

This keeps a deliberate human checkpoint before any real admin credential is created, and means the repo never contains a default or sample production password.

# Hossain Growth — API Documentation (Implemented)

This replaces the Phase 1 plan with what Phases 3 and 4 actually built and tested. All routes live under `/api/*` in the Astro-on-Workers app (`src/pages/api/`). Confirmed working via `scripts/smoke-test.mjs` against a live `wrangler dev` instance (88/88 checks passing) plus unit tests in `test/` (31 passing).

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

| Method | Path                                        | Description                                                                                |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/admin-users?page&pageSize&sortBy=name | email                                                                                      | createdAt | lastLoginAt&sortDir&search` | List, joined with role key |
| POST   | `/api/admin-users`                          | `{ email, password (≥12 chars), name, roleId, isActive? }` → 201                           |
| GET    | `/api/admin-users/:id`                      | Detail (never includes `passwordHash`)                                                     |
| PATCH  | `/api/admin-users/:id`                      | Partial update; `password` rehashes                                                        |
| DELETE | `/api/admin-users/:id`                      | Soft delete — sets `isActive = false`, preserves FK history (authored content, audit logs) |

`users.manage` is **super_admin-only** (see role model below) — an `admin` cannot create, edit, or deactivate other admin users.

## 3. Roles & Permissions (permission: `roles.manage`, super_admin-only)

| Method | Path                         | Description                                                                                                                                                                              |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/roles`                 | All roles with their resolved `permissions: string[]`                                                                                                                                    |
| POST   | `/api/roles`                 | `{ key, name, description? }` → create a custom role with no permissions yet                                                                                                             |
| GET    | `/api/roles/:id`             | One role with its resolved permissions                                                                                                                                                   |
| PATCH  | `/api/roles/:id`             | `{ name?, description? }`                                                                                                                                                                |
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

Bespoke (manages the `portfolio_project_images` join table).

| Method | Path                                                     | Notes                                                                 |
| ------ | -------------------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/portfolio-projects?isPublished&search&sortBy=title | slug                                                                  | createdAt | updatedAt | publishedAt` |     |
| POST   | `/api/portfolio-projects`                                | Body includes optional `imageIds: string[]` (ordered media asset IDs) |
| GET    | `/api/portfolio-projects/:id`                            | Includes resolved `images: [{ id, r2Key, altText, orderIndex }]`      |
| PATCH  | `/api/portfolio-projects/:id`                            | `imageIds` (if present) fully replaces the image set                  |
| DELETE | `/api/portfolio-projects/:id`                            | Cascades `portfolio_project_images`                                   |

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

| Method | Path                               | Notes                                                                                                                                                                        |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/media?search&sortBy=fileName | createdAt                                                                                                                                                                    | sizeBytes` |     |
| POST   | `/api/media`                       | `multipart/form-data`: `file` (required), `altText` (optional). Max 10 MB; allowed types: jpeg, png, webp, gif, svg, pdf. Streams to R2 (`env.MEDIA`), stores metadata in D1 |
| GET    | `/api/media/:id`                   |                                                                                                                                                                              |
| PATCH  | `/api/media/:id`                   | `{ altText?, fileName? }`                                                                                                                                                    |
| DELETE | `/api/media/:id`                   | Deletes from both R2 and D1                                                                                                                                                  |

## 11. SEO Metadata — `/api/seo-metadata/:entityType/:entityId` (permission: `seo.write`)

Polymorphic — `entityType` ∈ `page | blog_post | portfolio_project | case_study | service`.

| Method | Path                                      | Notes                                       |
| ------ | ----------------------------------------- | ------------------------------------------- |
| GET    | `/api/seo-metadata/:entityType/:entityId` | 404 if none set                             |
| PUT    | `/api/seo-metadata/:entityType/:entityId` | Upserts; 201 on first create, 200 on update |

## 12. Redirects — `/api/redirects` (permission: `redirects.write`)

Standard CRUD. `GET /api/redirects?search&sortBy=fromPath|createdAt`. `statusCode` restricted to 301/302/307/308.

## 13. Site Settings — `/api/site-settings` (permission: `settings.write`)

Key-value store.

| Method | Path                      | Notes                           |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/api/site-settings`      | All settings                    |
| GET    | `/api/site-settings/:key` | One setting                     |
| PUT    | `/api/site-settings/:key` | `{ value: <any JSON> }`, upsert |

## 14. Leads (CRM) — `/api/leads/*`

The full lead-management requirement from Phase 3, implemented as a bespoke resource (not the generic factory, due to the public-create path, assignment permission, notes sub-resource, and CSV export).

Statuses: `new`, `contacted`, `qualified`, `proposal_sent`, `won`, `lost`.

| Method | Path                                                                                                                         | Auth                                                                      | Notes                                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/leads`                                                                                                                 | **public**, rate-limited (5/min/IP), Turnstile-verified                   | `{ name, email, phone?, company?, country?, message?, source, serviceInterest?: string[], turnstileToken }`. Server calls Cloudflare's `siteverify` before inserting |
| GET    | `/api/leads?status&country&source&assignedTo&serviceInterest&search&sortBy=createdAt\|updatedAt\|name\|status\|followUpDate` | `leads.read`                                                              | `serviceInterest` matches against the JSON array column                                                                                                              |
| GET    | `/api/leads/:id`                                                                                                             | `leads.read`                                                              | Includes resolved `notes: [{ id, note, createdAt, authorName }]`                                                                                                     |
| PATCH  | `/api/leads/:id`                                                                                                             | `leads.write`; changing `assignedTo` additionally requires `leads.assign` | `{ status?, assignedTo?, followUpDate?, name?, email?, phone?, company?, country?, message?, source?, serviceInterest? }`                                            |
| DELETE | `/api/leads/:id`                                                                                                             | `leads.delete`                                                            |                                                                                                                                                                      |
| POST   | `/api/leads/:id/notes`                                                                                                       | `leads.write`                                                             | `{ note }` → 201                                                                                                                                                     |
| GET    | `/api/leads/export?status&country&source&search`                                                                             | `leads.export`                                                            | Streams CSV (`content-disposition: attachment`)                                                                                                                      |

## 15. Activity Logs (Audit) — `/api/activity-logs` (permission: `activity_logs.read`)

Read-only. `GET /api/activity-logs?entityType&userId&page&pageSize` — every mutating action across every resource above is recorded here.

## Testing

- **Unit tests** (`npm test`, Vitest, 31 passing, no live server needed): `test/password.spec.ts` (PBKDF2 hash/verify), `test/rbac.spec.ts` (permission checks), `test/pagination.spec.ts` (query parsing), `test/session.spec.ts` (JWT round-trip, tampered/expired/malformed token rejection), `test/lockout.spec.ts` (lockout threshold), `test/csrf.spec.ts` (Origin-matching logic).
- **Live smoke test** (`node scripts/smoke-test.mjs`, 88/88 checks passing): exercises every endpoint above against a running `wrangler dev` instance, including the full Phase 4 security surface — account lockout (5 failures → `423`, independent per email), login/reset Turnstile enforcement, the three-role boundary (super admin vs. narrowed admin vs. editor) including the configurable-permissions endpoints, CSRF Origin rejection, session-cookie attributes (`HttpOnly`, `SameSite=Strict`), server-side `/admin` route redirection, password change invalidating the current session immediately, and the complete password-reset workflow (request → dev-only token → reset → old password rejected → new password accepted → token can't be reused). Plus everything from Phase 3: RBAC boundaries, validation errors, CRUD + joins (portfolio images, blog tags), media upload (R2), SEO upsert, site settings, the full lead pipeline including CSV export, and audit log verification. Confirmed against local D1/R2/KV; D1 writes also verified against the real remote dev database in earlier runs.
- A D1-binding Vitest integration suite (`test/db.spec.ts.skip`) was written but is currently blocked by an upstream `@cloudflare/vitest-plugin` v1.9.0 module-resolution bug in this environment (see comment at the top of that file and `README.md` → "Known rough edges"). The same logic it would have tested is covered by the live smoke test instead.

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

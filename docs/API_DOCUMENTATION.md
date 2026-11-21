# Hossain Growth — API Documentation (Implemented)

This replaces the Phase 1 plan with what Phase 3 actually built and tested. All routes live under `/api/*` in the Astro-on-Workers app (`src/pages/api/`). Confirmed working via `scripts/smoke-test.mjs` against a live `wrangler dev` instance (49/49 checks passing) plus unit tests in `test/`.

## Conventions

- **Auth**: session cookie (`hg_session`, HttpOnly, signed JWT via `jose`), set by `POST /api/auth/login`. Sent automatically by browsers; no header needed.
- **Authorization**: every protected route calls `requirePermission(session, 'resource.action')`. Missing session → `401 UNAUTHORIZED`. Session present but missing permission → `403 FORBIDDEN`.
- **Validation**: every request body is parsed with a Zod schema (mostly derived from the Drizzle table via `drizzle-zod`). Failures → `400 VALIDATION_ERROR` with a `details` array of Zod issues.
- **Responses**: single resource → `{ "data": {...} }`. List → `{ "data": [...], "pagination": { page, pageSize, total, totalPages } }`. Errors → `{ "error": { "code", "message", "details"? } }`.
- **Pagination/sort/search** (list endpoints): `?page=1&pageSize=20&sortBy=<allow-listed column>&sortDir=asc|desc&search=<text>`. `sortBy` is rejected with `400` if not in that endpoint's allow-list (prevents sorting by arbitrary/unindexed/sensitive columns).
- **SQL injection**: 100% Drizzle ORM query builder with parameter binding — no raw string-interpolated SQL anywhere in request-handling code.
- **Audit logging**: every create/update/delete on every resource below writes a row to `activity_logs` (`action`, `entityType`, `entityId`, `userId`, `ipAddress`).
- **Rate limiting**: KV-backed fixed-window limits on `POST /api/auth/login` (10/min per IP) and `POST /api/leads` (5/min per IP) → `429 RATE_LIMITED`.

## Error codes

| HTTP | Code                  | Meaning                                                 |
| ---- | --------------------- | ------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`    | Zod validation failed; `details` has the issue list     |
| 401  | `UNAUTHORIZED`        | No/invalid session                                      |
| 401  | `INVALID_CREDENTIALS` | Login/change-password credential check failed           |
| 403  | `FORBIDDEN`           | Session valid, permission missing                       |
| 404  | `NOT_FOUND`           | Resource doesn't exist                                  |
| 409  | `CONFLICT`            | Unique constraint violation (duplicate slug/email/etc.) |
| 400  | `TURNSTILE_FAILED`    | Bot verification failed on public lead submission       |
| 429  | `RATE_LIMITED`        | Too many requests from this IP for this action          |
| 500  | `INTERNAL_ERROR`      | Unhandled error                                         |

## 1. Auth — `/api/auth/*`

| Method | Path                        | Auth                 | Description                                                                                   |
| ------ | --------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`           | public, rate-limited | `{ email, password }` → sets session cookie, returns `{ id, email, name, role, permissions }` |
| POST   | `/api/auth/logout`          | any                  | Clears session cookie                                                                         |
| GET    | `/api/auth/me`              | session              | Current user's `{ id, email, role, permissions }`                                             |
| POST   | `/api/auth/change-password` | session              | `{ currentPassword, newPassword }`                                                            |

## 2. Admin Users — `/api/admin-users` (permission: `users.manage`)

| Method | Path                                        | Description                                                                                |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/admin-users?page&pageSize&sortBy=name | email                                                                                      | createdAt | lastLoginAt&sortDir&search` | List, joined with role key |
| POST   | `/api/admin-users`                          | `{ email, password (≥12 chars), name, roleId, isActive? }` → 201                           |
| GET    | `/api/admin-users/:id`                      | Detail (never includes `passwordHash`)                                                     |
| PATCH  | `/api/admin-users/:id`                      | Partial update; `password` rehashes                                                        |
| DELETE | `/api/admin-users/:id`                      | Soft delete — sets `isActive = false`, preserves FK history (authored content, audit logs) |

## 3. Roles & Permissions (permission: `roles.manage`)

| Method | Path               | Description                                           |
| ------ | ------------------ | ----------------------------------------------------- |
| GET    | `/api/roles`       | All roles with their resolved `permissions: string[]` |
| GET    | `/api/permissions` | All permission keys + descriptions                    |

Seeded roles: `admin` (every permission), `editor` (content + leads, no deletes, no system settings), `viewer` (read-only). See `migrations/0001_seed_reference_data.sql`.

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

- **Unit tests** (`npm test`, Vitest): `test/password.spec.ts` (PBKDF2 hash/verify), `test/rbac.spec.ts` (permission checks), `test/pagination.spec.ts` (query parsing) — 16 tests, all passing, no live server needed.
- **Live smoke test** (`node scripts/smoke-test.mjs`): exercises every endpoint above against a running `wrangler dev` instance — auth, RBAC boundaries, validation errors, CRUD + joins (portfolio images, blog tags), media upload (R2), SEO upsert, site settings, the full lead pipeline including CSV export, rate limiting, and audit log verification. 49/49 checks passing against local D1/R2/KV and confirmed D1 writes also succeed against the real remote dev database.
- A D1-binding Vitest integration suite (`test/db.spec.ts.skip`) was written but is currently blocked by an upstream `@cloudflare/vitest-plugin` v1.9.0 module-resolution bug in this environment (see comment at the top of that file and `README.md` → "Known rough edges"). The same logic it would have tested is covered by the live smoke test instead.

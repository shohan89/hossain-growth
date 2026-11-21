# Hossain Growth — Database Schema (Cloudflare D1)

D1 platform limits (current): 500 MB/DB on Free plan, 10 GB/DB on Paid; 2 MB max per row/column value; 100 columns/table max; ~50 (Free) / 1,000 (Paid) queries per Worker invocation. Schema below is designed to stay well within these limits for an agency site's scale.

ORM: Drizzle ORM, schema defined in `src/lib/db/schema.ts`, migrations generated via Drizzle Kit and applied with `wrangler d1 migrations apply`.

## 1. Entity Overview

```
users ──┬─< sessions
        ├─< audit_logs
        ├─< blog_posts (author)
        ├─< portfolio_items (created_by)
        └─< leads (assigned_to)

blog_posts ──< blog_post_tags >── tags
portfolio_items ──< portfolio_images >── media_assets
blog_posts ──< media_assets (featured_image)

leads ──< lead_notes
leads ──< lead_activity_log

media_assets (R2-backed, metadata only in D1)

seo_meta ── polymorphic (entity_type + entity_id) → pages/blog_posts/portfolio_items

site_settings (singleton key-value config table)
redirects (SEO redirect management)
```

## 2. Tables

### `users`

| Column        | Type                       | Notes                           |
| ------------- | -------------------------- | ------------------------------- |
| id            | TEXT PK (UUID)             |                                 |
| email         | TEXT UNIQUE NOT NULL       |                                 |
| password_hash | TEXT NOT NULL              | WebCrypto PBKDF2/Argon2 hash    |
| name          | TEXT NOT NULL              |                                 |
| role          | TEXT NOT NULL              | `admin` \| `editor` \| `viewer` |
| is_active     | INTEGER NOT NULL DEFAULT 1 | boolean                         |
| created_at    | TEXT NOT NULL              | ISO 8601                        |
| updated_at    | TEXT NOT NULL              |                                 |

### `sessions`

| Column     | Type                        | Notes                                            |
| ---------- | --------------------------- | ------------------------------------------------ |
| id         | TEXT PK                     | session token ID (signed cookie references this) |
| user_id    | TEXT NOT NULL FK → users.id |                                                  |
| expires_at | TEXT NOT NULL               |                                                  |
| created_at | TEXT NOT NULL               |                                                  |
| user_agent | TEXT                        | optional, audit                                  |
| ip_address | TEXT                        | optional, audit                                  |

(Alternative: sessions stored in KV instead of D1 for lower-latency reads; D1 kept here as source of truth if audit trail is required. Decision deferred to implementation phase — both bindings available.)

### `audit_logs`

| Column      | Type               | Notes                                        |
| ----------- | ------------------ | -------------------------------------------- |
| id          | TEXT PK (UUID)     |                                              |
| user_id     | TEXT FK → users.id | nullable (system actions)                    |
| action      | TEXT NOT NULL      | e.g. `lead.status_changed`, `post.published` |
| entity_type | TEXT NOT NULL      |                                              |
| entity_id   | TEXT NOT NULL      |                                              |
| metadata    | TEXT               | JSON blob                                    |
| created_at  | TEXT NOT NULL      |                                              |

### `services`

| Column       | Type                       | Notes                                  |
| ------------ | -------------------------- | -------------------------------------- |
| id           | TEXT PK (UUID)             |                                        |
| slug         | TEXT UNIQUE NOT NULL       |                                        |
| title        | TEXT NOT NULL              |                                        |
| summary      | TEXT                       |                                        |
| content      | TEXT                       | rich content (Markdown or JSON blocks) |
| icon         | TEXT                       |                                        |
| order_index  | INTEGER NOT NULL DEFAULT 0 | manual ordering                        |
| is_published | INTEGER NOT NULL DEFAULT 1 |                                        |
| created_at   | TEXT NOT NULL              |                                        |
| updated_at   | TEXT NOT NULL              |                                        |

Covers the 6 core services as CMS-editable records rather than hardcoded pages.

### `portfolio_items`

| Column            | Type                       | Notes                                              |
| ----------------- | -------------------------- | -------------------------------------------------- |
| id                | TEXT PK (UUID)             |                                                    |
| slug              | TEXT UNIQUE NOT NULL       |                                                    |
| client_name       | TEXT                       |                                                    |
| title             | TEXT NOT NULL              |                                                    |
| summary           | TEXT                       |                                                    |
| content           | TEXT                       | case study body                                    |
| service_ids       | TEXT                       | JSON array of related service IDs                  |
| results_metrics   | TEXT                       | JSON (e.g. `{ "roas": "4.2x", "leads": "+180%" }`) |
| featured_image_id | TEXT FK → media_assets.id  |                                                    |
| is_published      | INTEGER NOT NULL DEFAULT 0 |                                                    |
| published_at      | TEXT                       |                                                    |
| created_by        | TEXT FK → users.id         |                                                    |
| created_at        | TEXT NOT NULL              |                                                    |
| updated_at        | TEXT NOT NULL              |                                                    |

### `portfolio_images`

| Column            | Type                                  | Notes |
| ----------------- | ------------------------------------- | ----- |
| id                | TEXT PK (UUID)                        |       |
| portfolio_item_id | TEXT NOT NULL FK → portfolio_items.id |       |
| media_asset_id    | TEXT NOT NULL FK → media_assets.id    |       |
| order_index       | INTEGER NOT NULL DEFAULT 0            |       |

### `blog_posts`

| Column            | Type                          | Notes                                 |
| ----------------- | ----------------------------- | ------------------------------------- |
| id                | TEXT PK (UUID)                |                                       |
| slug              | TEXT UNIQUE NOT NULL          |                                       |
| title             | TEXT NOT NULL                 |                                       |
| excerpt           | TEXT                          |                                       |
| content           | TEXT NOT NULL                 | Markdown or JSON blocks               |
| featured_image_id | TEXT FK → media_assets.id     |                                       |
| author_id         | TEXT FK → users.id            |                                       |
| status            | TEXT NOT NULL DEFAULT 'draft' | `draft` \| `scheduled` \| `published` |
| scheduled_at      | TEXT                          |                                       |
| published_at      | TEXT                          |                                       |
| created_at        | TEXT NOT NULL                 |                                       |
| updated_at        | TEXT NOT NULL                 |                                       |

### `tags`

| Column | Type                 | Notes |
| ------ | -------------------- | ----- |
| id     | TEXT PK (UUID)       |       |
| slug   | TEXT UNIQUE NOT NULL |       |
| name   | TEXT NOT NULL        |       |

### `blog_post_tags` (join table)

| Column       | Type                             | Notes |
| ------------ | -------------------------------- | ----- |
| blog_post_id | TEXT NOT NULL FK → blog_posts.id |       |
| tag_id       | TEXT NOT NULL FK → tags.id       |       |

PK: (`blog_post_id`, `tag_id`)

### `media_assets`

| Column      | Type                 | Notes                   |
| ----------- | -------------------- | ----------------------- |
| id          | TEXT PK (UUID)       |                         |
| r2_key      | TEXT UNIQUE NOT NULL | object key in R2 bucket |
| file_name   | TEXT NOT NULL        | original filename       |
| mime_type   | TEXT NOT NULL        |                         |
| size_bytes  | INTEGER NOT NULL     |                         |
| width       | INTEGER              | for images              |
| height      | INTEGER              | for images              |
| alt_text    | TEXT                 | SEO/accessibility       |
| uploaded_by | TEXT FK → users.id   |                         |
| created_at  | TEXT NOT NULL        |                         |

Actual file bytes live in R2; this table is metadata-only, keeping D1 rows small and well under the 2 MB/value limit.

### `leads`

| Column             | Type                        | Notes                                                                     |
| ------------------ | --------------------------- | ------------------------------------------------------------------------- |
| id                 | TEXT PK (UUID)              |                                                                           |
| name               | TEXT NOT NULL               |                                                                           |
| email              | TEXT NOT NULL               |                                                                           |
| phone              | TEXT                        |                                                                           |
| company            | TEXT                        |                                                                           |
| message            | TEXT                        |                                                                           |
| source             | TEXT                        | e.g. `contact_form`, `landing_page_x`                                     |
| service_interest   | TEXT                        | JSON array of service slugs                                               |
| status             | TEXT NOT NULL DEFAULT 'new' | `new` \| `contacted` \| `qualified` \| `proposal_sent` \| `won` \| `lost` |
| assigned_to        | TEXT FK → users.id          |                                                                           |
| turnstile_verified | INTEGER NOT NULL DEFAULT 0  | boolean, audit                                                            |
| created_at         | TEXT NOT NULL               |                                                                           |
| updated_at         | TEXT NOT NULL               |                                                                           |

### `lead_notes`

| Column     | Type                        | Notes |
| ---------- | --------------------------- | ----- |
| id         | TEXT PK (UUID)              |       |
| lead_id    | TEXT NOT NULL FK → leads.id |       |
| author_id  | TEXT FK → users.id          |       |
| note       | TEXT NOT NULL               |       |
| created_at | TEXT NOT NULL               |       |

### `lead_activity_log`

| Column     | Type                        | Notes                             |
| ---------- | --------------------------- | --------------------------------- |
| id         | TEXT PK (UUID)              |                                   |
| lead_id    | TEXT NOT NULL FK → leads.id |                                   |
| action     | TEXT NOT NULL               | e.g. `status_changed`, `assigned` |
| metadata   | TEXT                        | JSON                              |
| created_at | TEXT NOT NULL               |                                   |

### `seo_meta`

| Column           | Type                       | Notes                                                  |
| ---------------- | -------------------------- | ------------------------------------------------------ |
| id               | TEXT PK (UUID)             |                                                        |
| entity_type      | TEXT NOT NULL              | `page` \| `blog_post` \| `portfolio_item` \| `service` |
| entity_id        | TEXT NOT NULL              |                                                        |
| meta_title       | TEXT                       |                                                        |
| meta_description | TEXT                       |                                                        |
| og_image_id      | TEXT FK → media_assets.id  |                                                        |
| canonical_url    | TEXT                       |                                                        |
| structured_data  | TEXT                       | JSON-LD override                                       |
| no_index         | INTEGER NOT NULL DEFAULT 0 |                                                        |

Unique constraint on (`entity_type`, `entity_id`).

### `redirects`

| Column      | Type                         | Notes |
| ----------- | ---------------------------- | ----- |
| id          | TEXT PK (UUID)               |       |
| from_path   | TEXT UNIQUE NOT NULL         |       |
| to_path     | TEXT NOT NULL                |       |
| status_code | INTEGER NOT NULL DEFAULT 301 |       |
| created_at  | TEXT NOT NULL                |       |

### `site_settings`

| Column     | Type          | Notes |
| ---------- | ------------- | ----- |
| key        | TEXT PK       |       |
| value      | TEXT          | JSON  |
| updated_at | TEXT NOT NULL |       |

Singleton config table: site name, default OG image, social links, business contact info, analytics IDs.

## 3. Indexing Plan

- `blog_posts(status, published_at)` — for public listing/pagination.
- `blog_posts(slug)` — unique, already PK-adjacent.
- `portfolio_items(is_published, published_at)`.
- `leads(status, created_at)` — CRM pipeline views.
- `leads(assigned_to)`.
- `seo_meta(entity_type, entity_id)` — unique composite.
- `sessions(expires_at)` — for cleanup sweeps.

## 4. Migration Strategy

- Drizzle Kit generates SQL migration files from schema changes → committed to `migrations/`.
- Applied via `wrangler d1 migrations apply <db> --env <environment>`.
- Never apply untested migrations directly to production; staging D1 instance mirrors production schema for pre-deploy validation.
- Large data backfills batched (~1000 rows/chunk) to respect per-statement and per-invocation query limits.

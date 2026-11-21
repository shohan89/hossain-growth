# Hossain Growth — Technical Architecture

## 1. Technology Stack (confirmed against current Cloudflare docs, Nov 2026)

| Layer           | Choice                                           | Notes                                                                                                              |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Language        | TypeScript                                       | end-to-end, shared types between frontend/backend                                                                  |
| Framework       | Astro (SSR, `output: 'server'`)                  | `@astrojs/cloudflare` adapter (v13+), Workers-only target (Pages support dropped in this adapter)                  |
| UI              | React islands via `@astrojs/react`, Tailwind CSS | Astro renders static by default; React only for interactive islands (forms, dashboard widgets, filters)            |
| Animation       | Motion (motion.dev, formerly Framer Motion)      | client-side only, lazy-loaded on islands                                                                           |
| Compute         | Cloudflare Workers                               | single Worker serves SSR pages + API routes + admin app                                                            |
| Static assets   | Workers Static Assets (`assets` binding)         | replaces deprecated Workers Sites; free to serve, Worker invoked only for dynamic routes unless `run_worker_first` |
| Database        | Cloudflare D1 (SQLite at the edge)               | relational data: content, leads, users, blog, portfolio                                                            |
| ORM             | Drizzle ORM                                      | typed schema, migration generation, D1 driver                                                                      |
| Object storage  | Cloudflare R2                                    | media library files (images, documents)                                                                            |
| Key-value       | Cloudflare KV                                    | sessions, short-lived caches, rate-limit counters                                                                  |
| Bot protection  | Cloudflare Turnstile                             | public lead forms, contact forms                                                                                   |
| Validation      | Zod                                              | shared schemas for API request/response + form validation                                                          |
| Auth primitives | `jose` (WebCrypto-based JWT/JWS)                 | no Node-only JWT libs — Workers runtime has no full Node APIs by default                                           |
| Source control  | GitHub                                           | single monorepo                                                                                                    |
| CI/CD           | Cloudflare Workers Builds (Git integration)      | auto-deploy on push to `main`; preview deployments on PRs                                                          |
| Config          | `wrangler.jsonc`                                 | current preferred format over `wrangler.toml`                                                                      |

### Explicitly avoided (deprecated / wrong fit)

- Cloudflare Pages / Pages Functions for new build.
- Workers Sites (legacy static serving, deprecated in Wrangler v4).
- Node-only JWT libraries (`jsonwebtoken`, `jwks-rsa`) without full `nodejs_compat` shimming.
- Client-side-only Turnstile verification (must verify server-side via `siteverify`).
- Presigned R2 URLs issued directly from a plain Workers binding (binding has no S3 credentials — if direct upload is needed later, a separate S3-compatible credential flow is required; Phase 1 uses Worker-proxied upload instead).

## 2. High-Level Architecture

```
GitHub repo (main)
   │  push
   ▼
Cloudflare Workers Builds (CI/CD)
   │  wrangler deploy
   ▼
┌─────────────────────────────────────────────┐
│              Cloudflare Worker               │
│  (single Worker, Astro SSR + API routes)     │
│                                               │
│  /            → public site (SSR/prerendered)│
│  /blog/*      → blog pages                   │
│  /portfolio/* → case studies                  │
│  /admin/*     → admin dashboard (React SPA   │
│                  islands, auth-gated)         │
│  /api/*       → JSON API (Zod-validated)      │
└───────┬───────────┬───────────┬──────────────┘
        │            │           │
        ▼            ▼           ▼
   Cloudflare D1   Cloudflare R2  Cloudflare KV
   (content, leads, (media files)  (sessions,
    users, blog,                   rate limits,
    portfolio)                     cache)
        │
        ▼
   Turnstile siteverify (server-side call from Worker)
```

Single Worker deployment keeps the architecture simple for Phase 1: one codebase, one deploy, shared bindings. Public routes and `/admin` and `/api` are logically separated by routing, not by separate Workers — this can be split into multiple Workers later (see Scalability) without changing the data layer.

## 3. Folder Structure

```
hossain-growth/
├── docs/                          # planning docs (this set)
├── migrations/                    # D1 SQL migrations (wrangler d1 migrations)
├── public/                        # static assets (favicon, robots.txt handled via Astro)
├── src/
│   ├── pages/                     # Astro file-based routing
│   │   ├── index.astro
│   │   ├── services/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── portfolio/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── contact.astro
│   │   ├── admin/
│   │   │   ├── index.astro        # dashboard shell (auth-gated layout)
│   │   │   ├── login.astro
│   │   │   ├── leads/
│   │   │   ├── blog/
│   │   │   ├── portfolio/
│   │   │   ├── media/
│   │   │   ├── seo/
│   │   │   └── users/
│   │   └── api/
│   │       ├── leads/[...].ts
│   │       ├── blog/[...].ts
│   │       ├── portfolio/[...].ts
│   │       ├── media/[...].ts
│   │       ├── seo/[...].ts
│   │       ├── auth/[...].ts
│   │       └── turnstile/verify.ts
│   ├── components/
│   │   ├── public/                # site sections (Hero, ServiceCard, etc.)
│   │   ├── admin/                 # dashboard widgets, tables, forms
│   │   └── shared/                # buttons, inputs, layout primitives
│   ├── layouts/
│   │   ├── PublicLayout.astro
│   │   └── AdminLayout.astro
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema (single source of truth)
│   │   │   └── client.ts          # D1 binding → Drizzle instance
│   │   ├── auth/
│   │   │   ├── session.ts         # cookie sign/verify (jose)
│   │   │   ├── rbac.ts            # role/permission checks
│   │   │   └── password.ts        # hashing (WebCrypto)
│   │   ├── r2/
│   │   │   └── media.ts           # upload/get/delete helpers
│   │   ├── validation/            # Zod schemas (shared client+server)
│   │   ├── seo/                   # meta/JSON-LD/sitemap helpers
│   │   └── turnstile.ts           # server-side verify helper
│   ├── middleware.ts              # Astro middleware: auth gate for /admin, /api
│   └── env.d.ts                   # typed bindings (D1, R2, KV, secrets)
├── wrangler.jsonc
├── astro.config.mjs
├── drizzle.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## 4. Authentication & Security Strategy

- **Credential storage**: passwords hashed with WebCrypto PBKDF2/SHA-256 (or Argon2 via WASM if available in Workers runtime) — never stored plain.
- **Sessions**: signed, HttpOnly, Secure, SameSite=Lax cookies containing a session ID; session record (`user_id`, `role`, `expires_at`) stored in D1 or KV. Signing/verification via `jose` (WebCrypto, Workers-native).
- **RBAC**: roles — `admin`, `editor`, `viewer`. Middleware (`src/middleware.ts`) resolves session → role on every `/admin/*` and `/api/*` request; route handlers declare required role/permission.
- **CSRF**: same-site cookies + explicit origin check on state-changing API requests.
- **Turnstile**: widget on public lead/contact forms; server verifies token via `siteverify` before processing submission. Reject silently-failed verifications.
- **Input validation**: every API route validates request body/query with Zod before touching the database.
- **Secrets**: stored as Wrangler secrets (`wrangler secret put`), injected as env bindings — never bundled into client JS, never committed to repo.
- **Transport**: Cloudflare terminates TLS; HSTS enabled.
- **Defense in depth (optional, recommended for admin)**: Cloudflare Access/Zero Trust in front of `/admin/*` as an additional edge-level gate beyond app auth.
- **Rate limiting**: KV-backed counters on login and form-submission endpoints to slow brute-force/spam.

## 5. Cloudflare Infrastructure Configuration

- **wrangler.jsonc** (conceptual):
  - `main`: Worker entry (Astro adapter output)
  - `assets`: `{ directory: "./dist/client", binding: "ASSETS" }`
  - `d1_databases`: `[{ binding: "DB", database_name: "hossain_growth", database_id: "<id>" }]`
  - `r2_buckets`: `[{ binding: "MEDIA", bucket_name: "hossain-growth-media" }]`
  - `kv_namespaces`: `[{ binding: "SESSIONS", id: "<id>" }]` and `[{ binding: "CACHE", id: "<id>" }]`
  - `vars`: non-secret config (site URL, etc.)
  - secrets (`TURNSTILE_SECRET_KEY`, `SESSION_SIGNING_KEY`) set via `wrangler secret put`, not in the config file.
  - separate `env.staging` / `env.production` blocks with their own bindings (Wrangler environments do not inherit bindings automatically).
- **R2 public serving**: production custom domain connected to the media bucket for public-facing images (portfolio/blog); admin upload/delete goes through the Worker binding, never exposing bucket credentials.
- **CI/CD**: Cloudflare Workers Builds connected to the GitHub repo — push to `main` triggers build + `wrangler deploy`; pull requests get preview deployments.
- **Migrations**: `wrangler d1 migrations apply` run as an explicit CI step before deploy (never auto-applied silently in production without review).

## 6. Scalability Considerations

- Stateless Worker — horizontal scaling is automatic (Cloudflare edge network).
- D1 is SQLite-based with defined size/row limits (see DATABASE_SCHEMA.md) — acceptable for Phase 1–2 agency-scale data; if lead/blog volume grows heavily, plan sharding by tenant or migrating hot tables to a different store.
- KV for anything read-heavy/eventually-consistent (sessions, cached rendered fragments, rate limits) to keep D1 read load low.
- Single Worker today; architecture allows splitting into separate Workers (public site / admin+API) later via Service Bindings without changing D1/R2/KV data layer.
- Media served from R2 + Cloudflare cache/CDN — scales independently of compute.

## 7. Technical Risks & Mitigations

| Risk                                                      | Mitigation                                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| D1 size/row limits reached as content grows               | Monitor usage; archive old leads; move large media out of D1 (already using R2)                                                 |
| Workers runtime lacks full Node APIs                      | Select Workers-native libraries (`jose`, Drizzle D1 driver, Zod); avoid Node-only deps; use `nodejs_compat` only if unavoidable |
| SSR + React islands hydration mismatches                  | Keep islands minimal, test hydration boundaries, avoid server/client state divergence                                           |
| Admin dashboard security gap                              | RBAC middleware + optional Cloudflare Access layer + audit logging on sensitive actions                                         |
| SEO/AEO regressions from client-heavy rendering           | Enforce SSR/prerender for all public content pages; React islands only for interactivity, never for primary content             |
| Vendor lock-in to Cloudflare primitives                   | Accepted trade-off per requirements; mitigated by clean data-access layer (Drizzle/R2 helpers) that could be swapped later      |
| Turnstile/Zod/D1 ecosystem changes (fast-moving platform) | Pin dependency versions; re-verify against Cloudflare docs before major version bumps                                           |

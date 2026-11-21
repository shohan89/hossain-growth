# Hossain Growth — Development Roadmap

## Phase 0 — Project Setup

- Initialize git repo, push to GitHub.
- Scaffold Astro project (`npm create cloudflare@latest` or `npx astro add cloudflare`), confirm `output: 'server'`, Workers target.
- Set up `wrangler.jsonc`, create D1 database, R2 bucket, KV namespaces (dev + staging + production).
- Configure Drizzle ORM + initial empty migration.
- Connect GitHub repo to Cloudflare Workers Builds (CI/CD).
- Base folder structure per TECHNICAL_ARCHITECTURE.md.

**Exit criteria**: empty "Hello World" Astro page deploys automatically on push to `main`, bindings reachable.

## Phase 1 — Core Data Layer & Auth

- Implement full D1 schema (DATABASE_SCHEMA.md) + migrations.
- Build auth: login/logout, session cookies (`jose`), password hashing, RBAC middleware.
- Seed initial admin user (via migration or one-time script).
- Build `/admin/login` and protected `/admin` shell (auth-gated layout).

**Exit criteria**: admin can log in, session persists, unauthenticated requests to `/admin/*` and `/api/*` are rejected.

## Phase 2 — Admin Dashboard: Content Modules

- Services CMS module (list/edit).
- Blog module (CRUD, draft/schedule/publish, tags).
- Portfolio/case study module (CRUD, image attachment).
- Media library (R2 upload/list/delete, alt text).
- SEO management module (meta per entity, redirects, sitemap generation).
- User management module (admin-only).

**Exit criteria**: non-technical staff can fully manage services, blog, portfolio, media, and SEO metadata from the dashboard without code changes.

## Phase 3 — Public Website

- Design system: Tailwind config, typography, color palette, shared components.
- Build pages: Home, Services (index + detail), Portfolio (index + detail), Blog (index + detail), About, Contact.
- Motion animations on key sections (hero, scroll reveals, hover states).
- Lead capture / contact form with Turnstile, wired to `/api/leads`.
- SEO: meta tags, Open Graph, JSON-LD (Organization, Service, Article, FAQ where relevant), sitemap.xml, robots.txt.
- AEO/GEO pass: clean semantic structure, FAQ sections, clear entity statements for LLM crawlers.

**Exit criteria**: public site fully content-driven from CMS, passes Lighthouse SEO ≥ 95, Core Web Vitals "Good".

## Phase 4 — Lead Management CRM

- Leads list/detail/pipeline views in admin.
- Status workflow, assignment, notes, activity log.
- CSV export.
- Email notification on new lead (via Worker + external email API, e.g. Resend/Postmark — evaluate during this phase).

**Exit criteria**: every form submission flows into CRM with correct status pipeline and notifications.

## Phase 5 — Hardening & Launch Prep

- Rate limiting on auth + lead endpoints (KV counters).
- Audit logging on sensitive admin actions.
- Accessibility pass (WCAG 2.1 AA).
- Security review: secret exposure check, dependency audit, RBAC edge cases.
- Staging → production migration dry run.
- Backup/export plan for D1 + R2.
- Analytics setup (privacy-respecting, e.g. Cloudflare Web Analytics).

**Exit criteria**: production environment mirrors staging, security checklist passed, ready for DNS cutover.

## Phase 6 — Launch & Post-Launch

- DNS cutover to Cloudflare.
- Monitor Workers logs/analytics for errors.
- Submit sitemap to Search Console / Bing Webmaster.
- Content population (real services/portfolio/blog content from agency).
- Short post-launch stabilization window for bug fixes.

## Future / Backlog (not in initial scope)

- Multi-Worker split (public vs admin/API) if traffic/complexity demands.
- i18n for international clients.
- Direct-to-R2 presigned uploads for large media (bypass Worker proxy).
- Third-party CRM/email marketing integrations.
- Cloudflare Access/Zero Trust layer in front of `/admin`.

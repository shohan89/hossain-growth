# Hossain Growth — Project Requirements

## 1. Business Context

Hossain Growth is a digital growth agency serving local and international clients. The website must establish authority, demonstrate expertise, generate qualified leads, and convert visitors into clients.

### Core Services

1. Full Stack Digital Marketing
2. Google Ads Management
3. Meta Ads Management
4. SEO / AEO / GEO (Search, Answer Engine, Generative Engine Optimization)
5. Social Media Management & Strategy
6. Web Development

## 2. Scope

### 2.1 Public Website

- Premium, modern, responsive design (mobile-first).
- Fast load times, strong Core Web Vitals (SEO ranking factor).
- Server-rendered or prerendered pages for SEO/AEO/GEO (crawlers and LLM answer engines must see full content without executing JS).
- Service pages, portfolio/case studies, blog, lead capture forms, contact/booking.
- Bot-resistant forms (Cloudflare Turnstile).

### 2.2 Admin Dashboard (internal tool)

- Protected behind authentication, role-based access control (RBAC).
- Content management (pages, services, sections).
- Portfolio / case study management (create, edit, publish, reorder, media attach).
- Blog management (drafts, scheduling, categories/tags, SEO metadata per post).
- Lead management CRM (capture, status pipeline, notes, assignment, export).
- Media library (upload, organize, delete, search images/files stored in R2).
- SEO management (meta titles/descriptions, Open Graph, sitemap, redirects, structured data/JSON-LD).
- User management (admin/editor/viewer roles).

### 2.3 Platform / Infrastructure

- Cloudflare-native: Workers (compute), D1 (database), R2 (media storage), KV (caching/sessions), Turnstile (bot protection).
- GitHub as source of truth; deploy via Cloudflare's native Git integration (Workers Builds).
- Database migrations versioned in repo.
- No secrets or credentials exposed to the browser.

## 3. Non-Functional Requirements

| Category        | Requirement                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | SSR/prerendered pages, edge-cached static assets, Core Web Vitals "Good" thresholds                                                             |
| SEO             | Server-rendered HTML, sitemap.xml, robots.txt, structured data, canonical URLs, Open Graph/Twitter cards                                        |
| AEO/GEO         | Clean semantic HTML, FAQ/Q&A schema, clear entity/topic structure for LLM crawlers (GPTBot, ClaudeBot, etc.)                                    |
| Security        | RBAC, hashed credentials, signed sessions, Turnstile on public forms, input validation (Zod) on every API boundary, no secret leakage to client |
| Scalability     | Stateless Workers, edge-distributed data (D1/KV/R2), architecture supports future multi-tenant or multi-region growth                           |
| Maintainability | TypeScript end-to-end, migrations-based schema changes, documented API, modular folder structure                                                |
| Accessibility   | WCAG 2.1 AA target for public site                                                                                                              |

## 4. Out of Scope (Phase 1)

- Payment processing / e-commerce.
- Multi-language i18n (design should not block it later, but not built now).
- Native mobile app.
- Third-party CRM/email marketing integration (may be added later via API).

## 5. Success Criteria

- Public site passes Core Web Vitals and Lighthouse SEO score ≥ 95.
- Admin dashboard allows non-technical staff to manage content, blog, portfolio, and leads without developer involvement.
- Zero database credentials or API secrets present in client-side bundle.
- All schema changes tracked as migrations, reproducible from a clean D1 instance.
- Site deploys automatically from GitHub `main` branch push.

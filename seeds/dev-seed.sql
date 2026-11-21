-- Local development seed data ONLY. Never apply this to staging or
-- production (it is not a wrangler migration and lives outside migrations/
-- for exactly that reason — see README.md "Database migrations & seeding").
--
-- Apply with:
--   npx wrangler d1 execute hossain-growth-dev --local --file=seeds/dev-seed.sql
--
-- The dev password hash below corresponds to "DevAdmin!2026Local"
-- (generated with: node scripts/hash-password.mjs "DevAdmin!2026Local").
-- Dev-only credential — never reused anywhere else.
--
-- Everything below (services, portfolio, case studies, blog posts,
-- testimonials, contact details) is illustrative placeholder content used
-- to preview the public site locally. None of it is real client data, and
-- none of it is ever applied to staging or production — real content is
-- entered by an admin through the CMS before launch.

INSERT INTO admin_users (id, email, password_hash, name, role_id, is_active) VALUES
  ('user_dev_super_admin', 'dev-superadmin@hossaingrowth.local', 'pbkdf2$600000$KiZbLVdEylFSDRBTTbrrFw==$2WYXDns6/k8Xr+DssryrL+fM49HIG1CPc5np6ytjtBY=', 'Dev Super Admin', 'role_super_admin', 1),
  ('user_dev_admin', 'dev-admin@hossaingrowth.local', 'pbkdf2$600000$KiZbLVdEylFSDRBTTbrrFw==$2WYXDns6/k8Xr+DssryrL+fM49HIG1CPc5np6ytjtBY=', 'Dev Admin', 'role_admin', 1),
  ('user_dev_editor', 'dev-editor@hossaingrowth.local', 'pbkdf2$600000$KiZbLVdEylFSDRBTTbrrFw==$2WYXDns6/k8Xr+DssryrL+fM49HIG1CPc5np6ytjtBY=', 'Dev Editor', 'role_editor', 1);

INSERT INTO service_categories (id, slug, name, order_index) VALUES
  ('svccat_dev_paid', 'paid-advertising', 'Paid Advertising', 0),
  ('svccat_dev_organic', 'organic-growth', 'Organic Growth', 1),
  ('svccat_dev_tech', 'web-technology', 'Web & Technology', 2);

INSERT INTO services (id, slug, category_id, title, summary, content, order_index, is_published) VALUES
  ('svc_full_stack', 'full-stack-digital-marketing', NULL, 'Full Stack Digital Marketing', 'A single connected strategy across paid, organic, content, and web — managed by one accountable team.', 'Full stack digital marketing from Hossain Growth.', 0, 1),
  ('svc_google_ads', 'google-ads-management', 'svccat_dev_paid', 'Google Ads Management', 'Search and shopping campaigns structured around intent, with conversion tracking you can trust.', 'Google Ads management from Hossain Growth.', 1, 1),
  ('svc_meta_ads', 'meta-ads-management', 'svccat_dev_paid', 'Meta Ads Management', 'Facebook and Instagram campaigns built on continuous creative and audience testing.', 'Meta Ads management from Hossain Growth.', 2, 1),
  ('svc_seo', 'seo-aeo-geo', 'svccat_dev_organic', 'SEO / AEO / GEO', 'Technical SEO, content, and answer-engine optimization so you are found in search and AI answers.', 'SEO, AEO, and GEO from Hossain Growth.', 3, 1),
  ('svc_social', 'social-media-management', 'svccat_dev_organic', 'Social Media Management & Strategy', 'Content strategy, publishing, and community management built around business goals.', 'Social media management from Hossain Growth.', 4, 1),
  ('svc_web_dev', 'web-development', 'svccat_dev_tech', 'Web Development', 'Fast, conversion-ready websites built on modern, edge-grade infrastructure.', 'Web development from Hossain Growth.', 5, 1);

INSERT INTO portfolio_projects (id, slug, client_name, title, summary, content, service_ids, results_metrics, is_published, published_at, created_by) VALUES
  ('proj_harbor_co', 'harbor-and-co-ecommerce-rebuild', 'Harbor & Co.', 'Harbor & Co. — E-commerce Platform Rebuild', 'A full storefront rebuild paired with SEO and paid search to replace a slow, outdated platform.', '<p>Harbor & Co. came to us with an ageing storefront that was slow on mobile and difficult to update. We rebuilt the site on modern, edge-deployed infrastructure, restructured the information architecture around how customers actually shop, and paired the launch with a technical SEO pass and a restructured paid search account.</p><p>The result was a faster, easier-to-maintain storefront supported by a coordinated SEO and paid media plan from day one.</p>', '["svc_web_dev","svc_seo","svc_google_ads"]', '{"Scope":"Platform rebuild, SEO, paid search","Timeline":"12 weeks"}', 1, unixepoch(), 'user_dev_admin'),
  ('proj_lumen_analytics', 'lumen-analytics-demand-generation', 'Lumen Analytics', 'Lumen Analytics — B2B SaaS Demand Generation', 'A full-funnel paid and content strategy built to generate qualified trial sign-ups for a B2B SaaS product.', '<p>Lumen Analytics needed a demand generation engine that could produce qualified trial sign-ups without relying on a single channel. We built a combined paid search, SEO, and content strategy under one plan, with landing pages built specifically for each campaign.</p><p>Paid and organic efforts were coordinated from the same keyword and messaging strategy, so each channel reinforced the other instead of competing for the same audience.</p>', '["svc_full_stack","svc_google_ads","svc_seo"]', '{"Scope":"Paid search, SEO, content","Channels":"Search and organic"}', 1, unixepoch(), 'user_dev_admin'),
  ('proj_cedar_realty', 'cedar-realty-social-launch', 'Cedar Realty Group', 'Cedar Realty Group — Social Launch & Brand Presence', 'A new social media strategy and content system to build local brand presence for a growing real estate team.', '<p>Cedar Realty Group had an inconsistent social presence with no clear strategy behind it. We built a platform and content strategy focused on local visibility, paired with a paid social program to extend reach to new audiences in their market.</p>', '["svc_social","svc_meta_ads"]', '{"Scope":"Social strategy, paid social, content"}', 1, unixepoch(), 'user_dev_admin');

INSERT INTO case_studies (id, portfolio_project_id, slug, title, client, industry, challenge, solution, results, content, is_published, published_at, created_by) VALUES
  ('case_harbor_co', 'proj_harbor_co', 'harbor-and-co-ecommerce-rebuild', 'Harbor & Co.: Rebuilding an E-commerce Platform Without Losing Search Visibility', 'Harbor & Co.', 'E-commerce & Retail', 'Harbor & Co. needed to replace a slow, outdated e-commerce platform without losing the organic search rankings their existing pages had built up over time.', 'We planned the migration around a full URL and redirect map, rebuilt the storefront on modern infrastructure, and paired the launch with a technical SEO audit and a restructured paid search account.', 'The new storefront launched with improved page speed, a cleaner information architecture, and a coordinated SEO and paid search plan in place from day one.', '<p>Migrations are one of the riskiest moments in any e-commerce business''s SEO history. Our approach centered on a complete content and redirect map before a single line of the new site was built, so no existing ranking page was left without a destination.</p><p>Post-launch, our team monitored indexing and search performance closely during the transition window, adjusting the technical SEO and paid search account in parallel.</p>', 1, unixepoch(), 'user_dev_admin'),
  ('case_lumen_analytics', 'proj_lumen_analytics', 'lumen-analytics-demand-generation', 'Lumen Analytics: Building a Full-Funnel Demand Generation Engine', 'Lumen Analytics', 'SaaS & Technology', 'Lumen Analytics was relying on a single paid channel for trial sign-ups and had no coordinated content or SEO strategy supporting it.', 'We built a combined paid search, SEO, and content strategy under one editorial and keyword plan, with dedicated landing pages for each campaign and audience segment.', 'Paid and organic channels now run from the same strategy, with campaign landing pages built specifically to match search intent at each funnel stage.', '<p>For B2B SaaS, the sales cycle rarely starts and ends on one channel. We mapped the questions a prospective buyer asks at each stage, from early research to trial evaluation, and built content and paid campaigns to match each one.</p>', 1, unixepoch(), 'user_dev_admin');

INSERT INTO blog_categories (id, slug, name) VALUES
  ('blogcat_dev_marketing', 'marketing', 'Marketing'),
  ('blogcat_dev_seo', 'seo', 'SEO'),
  ('blogcat_dev_paid', 'paid-media', 'Paid Media');

INSERT INTO blog_tags (id, slug, name) VALUES
  ('tag_dev_seo', 'seo', 'SEO'),
  ('tag_dev_ads', 'ads', 'Ads'),
  ('tag_dev_strategy', 'strategy', 'Strategy'),
  ('tag_dev_growth', 'growth', 'Growth'),
  ('tag_dev_aeo', 'aeo', 'AEO'),
  ('tag_dev_ppc', 'ppc', 'PPC');

INSERT INTO blog_posts (id, slug, title, excerpt, content, author_id, category_id, status, published_at) VALUES
  ('post_full_funnel_strategy', 'why-full-funnel-strategy-beats-channel-silos', 'Why a Full-Funnel Strategy Beats Channel Silos', 'Running paid, organic, and content as separate workstreams quietly costs businesses pipeline. Here is what changes when they are planned together.', '<p>Most marketing underperformance is not a tactics problem. It is a coordination problem. When paid media, SEO, and content are managed by different vendors with different goals, budget gets duplicated and attribution breaks down before anyone notices.</p><h2>What a connected strategy actually looks like</h2><p>A full-funnel strategy starts with one set of revenue goals and works backward into which channels serve which stage of the funnel. Paid search captures existing demand. SEO and content build demand over time. Retargeting and email carry prospects through consideration.</p><p>When one team owns all of it, budget can move toward what is working in weeks, not at the next quarterly review.</p>', 'user_dev_admin', 'blogcat_dev_marketing', 'published', unixepoch()),
  ('post_aeo_explainer', 'what-answer-engine-optimization-means-for-seo', 'What Answer Engine Optimization Means for SEO in 2026', 'Search is no longer just a list of links. Here is how answer and generative engine optimization fit alongside traditional SEO.', '<p>AI-generated answers and summaries are now a real discovery channel alongside traditional search results. Answer engine optimization (AEO) focuses on structuring content so it can be accurately cited by these systems, while generative engine optimization (GEO) extends that thinking to how content is represented across generative search experiences.</p><h2>It does not replace technical SEO</h2><p>Strong technical SEO — crawlability, structured data, clear page intent — remains the foundation. AEO and GEO build on that foundation rather than replacing it, which is why we treat them as one connected discipline rather than a separate service.</p>', 'user_dev_admin', 'blogcat_dev_seo', 'published', unixepoch()),
  ('post_google_ads_structure', 'the-google-ads-account-structure-that-actually-converts', 'The Google Ads Account Structure That Actually Converts', 'Broad campaigns and broad match keywords waste budget. Here is the account structure we use to keep spend tied to intent.', '<p>The most common Google Ads mistake we see when auditing new accounts is structure: broad campaigns covering too many themes, broad match keywords competing with each other, and landing pages that do not match what was searched.</p><h2>Structure around intent, not products</h2><p>Instead of organizing campaigns around your product catalog, organize them around the specific way customers search. Tightly themed ad groups with intent-matched keywords consistently outperform broad structures, even with the same budget.</p>', 'user_dev_admin', 'blogcat_dev_paid', 'published', unixepoch());

INSERT INTO blog_post_tags (blog_post_id, tag_id) VALUES
  ('post_full_funnel_strategy', 'tag_dev_strategy'),
  ('post_full_funnel_strategy', 'tag_dev_growth'),
  ('post_aeo_explainer', 'tag_dev_seo'),
  ('post_aeo_explainer', 'tag_dev_aeo'),
  ('post_google_ads_structure', 'tag_dev_ads'),
  ('post_google_ads_structure', 'tag_dev_ppc');

INSERT INTO testimonials (id, client_name, client_title, client_company, content, rating, portfolio_project_id, is_published, order_index) VALUES
  ('testimonial_harbor_co', 'Dana Whitfield', 'Head of E-commerce', 'Harbor & Co.', 'Hossain Growth rebuilt our storefront and handled the SEO transition in the same breath. We never lost the search visibility we were worried about.', 5, 'proj_harbor_co', 1, 0),
  ('testimonial_lumen_analytics', 'Priya Raman', 'VP Marketing', 'Lumen Analytics', 'Having one team own paid, SEO, and content strategy together removed the constant back-and-forth we used to have between agencies.', 5, 'proj_lumen_analytics', 1, 1),
  ('testimonial_cedar_realty', 'Marcus Webb', 'Owner', 'Cedar Realty Group', 'They treated our social presence as a real strategy, not just a content calendar. It finally feels connected to how we actually win business.', 5, 'proj_cedar_realty', 1, 2);

INSERT INTO leads (id, name, email, phone, company, country, message, source, service_interest, status, assigned_to, follow_up_date, turnstile_verified) VALUES
  ('lead_dev_new', 'Dev Lead One', 'dev-lead-1@example.test', '+1-555-0100', 'Dev Test Co', 'United States', 'Dev-seed test lead message.', 'contact_form', '["google-ads-management"]', 'new', NULL, NULL, 1),
  ('lead_dev_contacted', 'Dev Lead Two', 'dev-lead-2@example.test', '+1-555-0101', 'Dev Test Inc', 'Canada', 'Dev-seed test lead message.', 'landing_page', '["seo-aeo-geo"]', 'contacted', 'user_dev_editor', unixepoch() + 86400, 1);

INSERT INTO lead_notes (id, lead_id, author_id, note) VALUES
  ('leadnote_dev_sample', 'lead_dev_contacted', 'user_dev_editor', 'Dev-seed test note: left a voicemail, following up tomorrow.');

INSERT INTO website_pages (id, slug, title, content, template, is_published, published_at, created_by) VALUES
  ('page_dev_about', 'about', 'About (dev seed)', '{"blocks":[{"type":"text","value":"Dev-seed test page content."}]}', 'default', 1, unixepoch(), 'user_dev_admin');

INSERT INTO navigation_items (id, label, link_type, page_id, url, parent_id, order_index, location, is_visible) VALUES
  ('nav_dev_services', 'Services', 'url', NULL, '/services', NULL, 0, 'header', 1),
  ('nav_dev_portfolio', 'Portfolio', 'url', NULL, '/portfolio', NULL, 1, 'header', 1),
  ('nav_dev_case_studies', 'Case Studies', 'url', NULL, '/case-studies', NULL, 2, 'header', 1),
  ('nav_dev_industries', 'Industries', 'url', NULL, '/industries', NULL, 3, 'header', 1),
  ('nav_dev_blog', 'Blog', 'url', NULL, '/blog', NULL, 4, 'header', 1),
  ('nav_dev_about', 'About', 'url', NULL, '/about', NULL, 5, 'header', 1);

INSERT INTO redirects (id, from_path, to_path, status_code) VALUES
  ('redirect_dev_sample', '/old-about', '/about', 301);

INSERT INTO site_settings (key, value) VALUES
  ('contact_email', '"hello@hossaingrowth.com"'),
  ('contact_phone', '"+1 (555) 012-0199"'),
  ('social_links', '{"linkedin":"https://linkedin.com/company/dev-seed-placeholder"}');

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

INSERT INTO admin_users (id, email, password_hash, name, role_id, is_active) VALUES
  ('user_dev_super_admin', 'dev-superadmin@hossaingrowth.local', 'pbkdf2$600000$KiZbLVdEylFSDRBTTbrrFw==$2WYXDns6/k8Xr+DssryrL+fM49HIG1CPc5np6ytjtBY=', 'Dev Super Admin', 'role_super_admin', 1),
  ('user_dev_admin', 'dev-admin@hossaingrowth.local', 'pbkdf2$600000$KiZbLVdEylFSDRBTTbrrFw==$2WYXDns6/k8Xr+DssryrL+fM49HIG1CPc5np6ytjtBY=', 'Dev Admin', 'role_admin', 1),
  ('user_dev_editor', 'dev-editor@hossaingrowth.local', 'pbkdf2$600000$KiZbLVdEylFSDRBTTbrrFw==$2WYXDns6/k8Xr+DssryrL+fM49HIG1CPc5np6ytjtBY=', 'Dev Editor', 'role_editor', 1);

INSERT INTO service_categories (id, slug, name, order_index) VALUES
  ('svccat_dev_ads', 'paid-ads', 'Paid Advertising', 0),
  ('svccat_dev_organic', 'organic-growth', 'Organic Growth', 1);

INSERT INTO services (id, slug, category_id, title, summary, content, order_index, is_published) VALUES
  ('svc_dev_google_ads', 'google-ads-management', 'svccat_dev_ads', 'Google Ads Management', 'Dev-seed test service.', 'Dev-seed test content for Google Ads Management.', 0, 1),
  ('svc_dev_seo', 'seo-aeo-geo', 'svccat_dev_organic', 'SEO / AEO / GEO', 'Dev-seed test service.', 'Dev-seed test content for SEO / AEO / GEO.', 1, 1);

INSERT INTO portfolio_projects (id, slug, client_name, title, summary, content, is_published, published_at, created_by) VALUES
  ('proj_dev_sample', 'dev-sample-project', 'Dev Test Co', 'Dev Sample Project', 'Dev-seed test portfolio project.', 'Dev-seed test content.', 1, unixepoch(), 'user_dev_admin');

INSERT INTO case_studies (id, portfolio_project_id, slug, title, client, industry, challenge, solution, results, content, is_published, published_at, created_by) VALUES
  ('case_dev_sample', 'proj_dev_sample', 'dev-sample-case-study', 'Dev Sample Case Study', 'Dev Test Co', 'Retail', 'Dev-seed challenge text.', 'Dev-seed solution text.', 'Dev-seed results text.', 'Dev-seed test content.', 1, unixepoch(), 'user_dev_admin');

INSERT INTO blog_categories (id, slug, name) VALUES
  ('blogcat_dev_marketing', 'marketing', 'Marketing');

INSERT INTO blog_tags (id, slug, name) VALUES
  ('tag_dev_seo', 'seo', 'SEO'),
  ('tag_dev_ads', 'ads', 'Ads');

INSERT INTO blog_posts (id, slug, title, excerpt, content, author_id, category_id, status, published_at) VALUES
  ('post_dev_sample', 'dev-sample-post', 'Dev Sample Blog Post', 'Dev-seed test excerpt.', 'Dev-seed test content for a sample blog post.', 'user_dev_admin', 'blogcat_dev_marketing', 'published', unixepoch());

INSERT INTO blog_post_tags (blog_post_id, tag_id) VALUES
  ('post_dev_sample', 'tag_dev_seo'),
  ('post_dev_sample', 'tag_dev_ads');

INSERT INTO testimonials (id, client_name, client_title, client_company, content, rating, portfolio_project_id, is_published, order_index) VALUES
  ('testimonial_dev_sample', 'Dev Test Client', 'Marketing Director', 'Dev Test Co', 'Dev-seed test testimonial content.', 5, 'proj_dev_sample', 1, 0);

INSERT INTO leads (id, name, email, phone, company, country, message, source, service_interest, status, assigned_to, follow_up_date, turnstile_verified) VALUES
  ('lead_dev_new', 'Dev Lead One', 'dev-lead-1@example.test', '+1-555-0100', 'Dev Test Co', 'United States', 'Dev-seed test lead message.', 'contact_form', '["google-ads-management"]', 'new', NULL, NULL, 1),
  ('lead_dev_contacted', 'Dev Lead Two', 'dev-lead-2@example.test', '+1-555-0101', 'Dev Test Inc', 'Canada', 'Dev-seed test lead message.', 'landing_page', '["seo-aeo-geo"]', 'contacted', 'user_dev_editor', unixepoch() + 86400, 1);

INSERT INTO lead_notes (id, lead_id, author_id, note) VALUES
  ('leadnote_dev_sample', 'lead_dev_contacted', 'user_dev_editor', 'Dev-seed test note: left a voicemail, following up tomorrow.');

INSERT INTO website_pages (id, slug, title, content, template, is_published, published_at, created_by) VALUES
  ('page_dev_about', 'about', 'About (dev seed)', '{"blocks":[{"type":"text","value":"Dev-seed test page content."}]}', 'default', 1, unixepoch(), 'user_dev_admin');

INSERT INTO navigation_items (id, label, link_type, page_id, url, parent_id, order_index, location, is_visible) VALUES
  ('nav_dev_about', 'About', 'page', 'page_dev_about', NULL, NULL, 0, 'header', 1),
  ('nav_dev_contact', 'Contact', 'url', NULL, '/contact', NULL, 1, 'header', 1);

INSERT INTO redirects (id, from_path, to_path, status_code) VALUES
  ('redirect_dev_sample', '/old-about', '/about', 301);

INSERT INTO site_settings (key, value) VALUES
  ('contact_email', '"dev-contact@hossaingrowth.local"'),
  ('social_links', '{"linkedin":"https://linkedin.com/company/dev-seed-placeholder"}');

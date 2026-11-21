-- Reference data (roles + permissions). Safe to apply in every environment —
-- this is system configuration, not sample/fake content. Idempotent via
-- INSERT OR IGNORE so re-running this migration never duplicates rows.

INSERT OR IGNORE INTO roles (id, key, name, description) VALUES
  ('role_admin', 'admin', 'Administrator', 'Full access to every module, including users, roles, and settings.'),
  ('role_editor', 'editor', 'Editor', 'Can create and publish content and manage leads, without destructive or system-level access.'),
  ('role_viewer', 'viewer', 'Viewer', 'Read-only access across content and leads.');

INSERT OR IGNORE INTO permissions (id, key, description) VALUES
  ('perm_dashboard_access', 'dashboard.access', 'View the admin dashboard'),
  ('perm_leads_read', 'leads.read', 'View leads'),
  ('perm_leads_write', 'leads.write', 'Create and update leads, notes, assignment, follow-up'),
  ('perm_leads_delete', 'leads.delete', 'Delete leads'),
  ('perm_leads_assign', 'leads.assign', 'Assign leads to admin users'),
  ('perm_leads_export', 'leads.export', 'Export leads to CSV'),
  ('perm_blog_read', 'blog.read', 'View blog posts'),
  ('perm_blog_write', 'blog.write', 'Create and update blog posts'),
  ('perm_blog_delete', 'blog.delete', 'Delete blog posts'),
  ('perm_blog_publish', 'blog.publish', 'Publish or schedule blog posts'),
  ('perm_portfolio_read', 'portfolio.read', 'View portfolio projects'),
  ('perm_portfolio_write', 'portfolio.write', 'Create and update portfolio projects'),
  ('perm_portfolio_delete', 'portfolio.delete', 'Delete portfolio projects'),
  ('perm_case_studies_read', 'case_studies.read', 'View case studies'),
  ('perm_case_studies_write', 'case_studies.write', 'Create and update case studies'),
  ('perm_case_studies_delete', 'case_studies.delete', 'Delete case studies'),
  ('perm_services_read', 'services.read', 'View services'),
  ('perm_services_write', 'services.write', 'Create and update services'),
  ('perm_services_delete', 'services.delete', 'Delete services'),
  ('perm_testimonials_read', 'testimonials.read', 'View testimonials'),
  ('perm_testimonials_write', 'testimonials.write', 'Create and update testimonials'),
  ('perm_testimonials_delete', 'testimonials.delete', 'Delete testimonials'),
  ('perm_media_read', 'media.read', 'View media library'),
  ('perm_media_write', 'media.write', 'Upload and update media'),
  ('perm_media_delete', 'media.delete', 'Delete media'),
  ('perm_pages_read', 'pages.read', 'View website pages'),
  ('perm_pages_write', 'pages.write', 'Create and update website pages'),
  ('perm_pages_delete', 'pages.delete', 'Delete website pages'),
  ('perm_navigation_write', 'navigation.write', 'Manage navigation menus'),
  ('perm_settings_write', 'settings.write', 'Manage site settings'),
  ('perm_seo_write', 'seo.write', 'Manage SEO metadata'),
  ('perm_redirects_write', 'redirects.write', 'Manage redirects'),
  ('perm_users_manage', 'users.manage', 'Create, update, and deactivate admin users'),
  ('perm_roles_manage', 'roles.manage', 'Manage roles and permission assignment'),
  ('perm_activity_logs_read', 'activity_logs.read', 'View the audit log');

-- admin: every permission
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role_admin', id FROM permissions;

-- editor: content + leads, no deletes, no system-level access
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role_editor', id FROM permissions WHERE key IN (
    'dashboard.access',
    'leads.read', 'leads.write', 'leads.assign', 'leads.export',
    'blog.read', 'blog.write', 'blog.publish',
    'portfolio.read', 'portfolio.write',
    'case_studies.read', 'case_studies.write',
    'services.read', 'services.write',
    'testimonials.read', 'testimonials.write',
    'media.read', 'media.write',
    'pages.read', 'pages.write',
    'navigation.write',
    'seo.write'
  );

-- viewer: read-only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role_viewer', id FROM permissions WHERE key IN (
    'dashboard.access',
    'leads.read',
    'blog.read',
    'portfolio.read',
    'case_studies.read',
    'services.read',
    'testimonials.read',
    'media.read',
    'pages.read'
  );

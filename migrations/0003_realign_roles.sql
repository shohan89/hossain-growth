-- Realigns the role model to the three roles required by Phase 4:
-- Super Admin (full access), Admin (content/leads/media/settings, no user
-- or role management), Editor (content + leads, no sensitive settings).
-- System configuration, not fake data — safe for every environment.
-- No admin_users exist yet in any environment, so this is a pure
-- reference-data change with no user migration needed.

INSERT OR IGNORE INTO roles (id, key, name, description) VALUES
  ('role_super_admin', 'super_admin', 'Super Admin', 'Full access to every module, including users, roles, and settings.');

-- super_admin: every permission (mirrors what 'admin' used to grant).
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'role_super_admin', id FROM permissions;

-- admin: narrowed — content/leads/media/settings, but not user or role
-- management (those are now super_admin-exclusive).
DELETE FROM role_permissions
  WHERE role_id = 'role_admin'
    AND permission_id IN (
      SELECT id FROM permissions WHERE key IN ('users.manage', 'roles.manage')
    );

UPDATE roles
  SET name = 'Admin', description = 'Manages content, leads, media, and settings. No user or role management.'
  WHERE id = 'role_admin';

UPDATE roles
  SET description = 'Manages content and leads. No access to settings, users, or roles.'
  WHERE id = 'role_editor';

-- 'viewer' is not one of the three roles this phase specifies; drop it.
-- Cascades role_permissions rows for it; no admin_users reference it.
DELETE FROM roles WHERE key = 'viewer';

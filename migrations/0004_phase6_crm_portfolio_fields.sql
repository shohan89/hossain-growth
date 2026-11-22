-- Phase 6 (admin dashboard & CMS) needs a few fields the Phase 3 schema
-- didn't anticipate: a lead budget range for CRM filtering, and
-- industry/project URL/featured flag for the Portfolio CMS module.

ALTER TABLE leads ADD COLUMN budget text;

ALTER TABLE portfolio_projects ADD COLUMN industry text;
ALTER TABLE portfolio_projects ADD COLUMN project_url text;
ALTER TABLE portfolio_projects ADD COLUMN is_featured integer DEFAULT 0 NOT NULL;

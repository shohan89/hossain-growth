CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role_id` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_idx` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_key_idx` ON `permissions` (`key`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_key_idx` ON `roles` (`key`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`alt_text` text,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_r2_key_idx` ON `media_assets` (`r2_key`);--> statement-breakpoint
CREATE TABLE `blog_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_categories_slug_idx` ON `blog_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `blog_post_tags` (
	`blog_post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`blog_post_id`, `tag_id`),
	FOREIGN KEY (`blog_post_id`) REFERENCES `blog_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `blog_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`featured_image_id` text,
	`author_id` text,
	`category_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_at` integer,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`featured_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`author_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_idx` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `blog_posts_status_idx` ON `blog_posts` (`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `blog_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_tags_slug_idx` ON `blog_tags` (`slug`);--> statement-breakpoint
CREATE TABLE `case_studies` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_project_id` text,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`client` text,
	`industry` text,
	`challenge` text,
	`solution` text,
	`results` text,
	`content` text,
	`featured_image_id` text,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`portfolio_project_id`) REFERENCES `portfolio_projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`featured_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_studies_slug_idx` ON `case_studies` (`slug`);--> statement-breakpoint
CREATE INDEX `case_studies_published_idx` ON `case_studies` (`is_published`,`published_at`);--> statement-breakpoint
CREATE TABLE `portfolio_project_images` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_project_id` text NOT NULL,
	`media_asset_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`portfolio_project_id`) REFERENCES `portfolio_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portfolio_project_images_project_idx` ON `portfolio_project_images` (`portfolio_project_id`);--> statement-breakpoint
CREATE TABLE `portfolio_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`client_name` text,
	`title` text NOT NULL,
	`summary` text,
	`content` text,
	`service_ids` text DEFAULT '[]' NOT NULL,
	`results_metrics` text DEFAULT '{}' NOT NULL,
	`featured_image_id` text,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`featured_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_projects_slug_idx` ON `portfolio_projects` (`slug`);--> statement-breakpoint
CREATE INDEX `portfolio_projects_published_idx` ON `portfolio_projects` (`is_published`,`published_at`);--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_categories_slug_idx` ON `service_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`category_id` text,
	`title` text NOT NULL,
	`summary` text,
	`content` text,
	`icon` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_slug_idx` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `services_category_idx` ON `services` (`category_id`);--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` text PRIMARY KEY NOT NULL,
	`client_name` text NOT NULL,
	`client_title` text,
	`client_company` text,
	`content` text NOT NULL,
	`rating` integer,
	`avatar_media_id` text,
	`portfolio_project_id` text,
	`is_published` integer DEFAULT true NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`avatar_media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`portfolio_project_id`) REFERENCES `portfolio_projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `testimonials_published_idx` ON `testimonials` (`is_published`,`order_index`);--> statement-breakpoint
CREATE TABLE `lead_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`author_id` text,
	`note` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `lead_notes_lead_idx` ON `lead_notes` (`lead_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`company` text,
	`country` text,
	`message` text,
	`source` text DEFAULT 'contact_form' NOT NULL,
	`service_interest` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`assigned_to` text,
	`follow_up_date` integer,
	`turnstile_verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assigned_to`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leads_status_created_idx` ON `leads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_assigned_idx` ON `leads` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `leads_country_idx` ON `leads` (`country`);--> statement-breakpoint
CREATE INDEX `leads_follow_up_idx` ON `leads` (`follow_up_date`);--> statement-breakpoint
CREATE TABLE `navigation_items` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`link_type` text DEFAULT 'url' NOT NULL,
	`page_id` text,
	`url` text,
	`parent_id` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`location` text DEFAULT 'header' NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `website_pages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `navigation_items_parent_idx` ON `navigation_items` (`parent_id`);--> statement-breakpoint
CREATE INDEX `navigation_items_location_idx` ON `navigation_items` (`location`,`order_index`);--> statement-breakpoint
CREATE TABLE `website_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`template` text DEFAULT 'default' NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `website_pages_slug_idx` ON `website_pages` (`slug`);--> statement-breakpoint
CREATE TABLE `redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`from_path` text NOT NULL,
	`to_path` text NOT NULL,
	`status_code` integer DEFAULT 301 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `redirects_from_path_idx` ON `redirects` (`from_path`);--> statement-breakpoint
CREATE TABLE `seo_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`meta_title` text,
	`meta_description` text,
	`og_image_id` text,
	`canonical_url` text,
	`structured_data` text,
	`no_index` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`og_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seo_metadata_entity_idx` ON `seo_metadata` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`metadata` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_logs_created_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_logs_user_idx` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_entity_idx` ON `activity_logs` (`entity_type`,`entity_id`);
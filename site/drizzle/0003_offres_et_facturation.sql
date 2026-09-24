CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'demande' NOT NULL,
	`org_type` text NOT NULL,
	`org_name` text NOT NULL,
	`org_ide` text,
	`street` text,
	`zip` text,
	`city` text,
	`country` text DEFAULT 'CH' NOT NULL,
	`contact_first_name` text NOT NULL,
	`contact_last_name` text NOT NULL,
	`contact_role` text,
	`contact_email` text NOT NULL,
	`contact_phone` text,
	`seats` integer DEFAULT 1 NOT NULL,
	`message` text,
	`plan_id` text,
	`interval` text DEFAULT 'year' NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`valid_until` integer,
	`conditions` text,
	`internal_note` text,
	`purchase_order` text,
	`user_id` text,
	`subscription_id` text,
	`invoice_id` text,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`accepted_at` integer,
	`declined_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_number_unique` ON `quotes` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_token_unique` ON `quotes` (`token`);--> statement-breakpoint
CREATE INDEX `quotes_status_idx` ON `quotes` (`status`);--> statement-breakpoint
CREATE INDEX `quotes_email_idx` ON `quotes` (`contact_email`);--> statement-breakpoint
ALTER TABLE `invoices` ADD `due_at` integer;--> statement-breakpoint
ALTER TABLE `invoices` ADD `payment_mode` text DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `quote_id` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `reference` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `qr_reference` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `bill_name` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `bill_street` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `bill_zip` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `bill_city` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `bill_country` text DEFAULT 'CH';--> statement-breakpoint
ALTER TABLE `invoices` ADD `bill_ide` text;--> statement-breakpoint
CREATE INDEX `invoices_quote_idx` ON `invoices` (`quote_id`);--> statement-breakpoint
ALTER TABLE `plans` ADD `max_seats` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `allow_card` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `allow_invoice` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `billing_mode` text DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `seats` integer DEFAULT 1 NOT NULL;
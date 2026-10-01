CREATE TABLE `licences` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`client` text NOT NULL,
	`ide` text,
	`seats` integer DEFAULT 0 NOT NULL,
	`model` text DEFAULT 'site' NOT NULL,
	`issued_on` text NOT NULL,
	`updates_until` text,
	`body` text NOT NULL,
	`key_id` text NOT NULL,
	`user_id` text,
	`subscription_id` text,
	`invoice_id` text,
	`superseded_by_id` text,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `licences_number_unique` ON `licences` (`number`);--> statement-breakpoint
CREATE INDEX `licences_user_idx` ON `licences` (`user_id`);--> statement-breakpoint
CREATE INDEX `licences_subscription_idx` ON `licences` (`subscription_id`);
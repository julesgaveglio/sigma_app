ALTER TABLE `allowed_emails` MODIFY COLUMN `role` enum('user','admin','direction','agent') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','direction','agent') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `allowed_emails` ADD `actif` boolean DEFAULT true NOT NULL;
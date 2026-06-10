ALTER TABLE `crm_leads` ADD `marieAssignee` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `testimonyMarieFait` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `marieAssigneeEtape` enum('courtage','immo');
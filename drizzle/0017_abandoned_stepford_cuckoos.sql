ALTER TABLE `biens` MODIFY COLUMN `ambassadeurId` int;--> statement-breakpoint
ALTER TABLE `biens` ADD `source` enum('ambassadeur','pap_scrape') DEFAULT 'ambassadeur' NOT NULL;
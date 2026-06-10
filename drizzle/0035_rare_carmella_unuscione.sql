ALTER TABLE `courtier_soumissions` ADD `resumeSituation` text;--> statement-breakpoint
ALTER TABLE `courtier_soumissions` ADD `zipDocumentsUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `courtier_soumissions` ADD `tableauCourtagePdfUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `statutCourtage` enum('a_contacter','en_cours','effectue') DEFAULT 'a_contacter' NOT NULL;
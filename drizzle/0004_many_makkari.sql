ALTER TABLE `mandats_recherche` MODIFY COLUMN `budgetMax` int;--> statement-breakpoint
ALTER TABLE `mandats_recherche` MODIFY COLUMN `modeFinancement` enum('comptant','credit','mixte');
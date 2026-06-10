CREATE TABLE `mandat_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`nom` varchar(256) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`uploadePar` varchar(128),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mandat_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `regimeMatrimonialType` enum('communaute_reduite_acquets','communaute_universelle','separation_biens','participation_acquets','autre');--> statement-breakpoint
ALTER TABLE `leads` ADD `projetSeulOuDeux` enum('seul','a_deux');
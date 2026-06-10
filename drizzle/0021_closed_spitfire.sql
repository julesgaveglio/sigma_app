CREATE TABLE `lead_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`type` enum('note','email_envoye','rdv_pris','rdv_confirme','etape_changee','champ_modifie','document','appel','autre') NOT NULL,
	`auteur` varchar(128) NOT NULL DEFAULT 'Système',
	`titre` varchar(256) NOT NULL,
	`contenu` text,
	`meta` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_activities_id` PRIMARY KEY(`id`)
);

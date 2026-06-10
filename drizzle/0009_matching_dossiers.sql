CREATE TABLE `matching_dossiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`bienId` int,
	`statut_md` enum('en_cours','proposition_1','proposition_2','proposition_3','offre','signature_notaire','vendu','abandonne') NOT NULL DEFAULT 'en_cours',
	`modeElargi` int DEFAULT 0,
	`criteresSup` text,
	`notes` text,
	`date_proposition` bigint,
	`date_offre` bigint,
	`date_signature` bigint,
	`date_vente` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matching_dossiers_id` PRIMARY KEY(`id`)
);

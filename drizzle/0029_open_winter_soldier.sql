CREATE TABLE `avis_pipe` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`leadNom` varchar(256) NOT NULL,
	`leadEmail` varchar(320),
	`leadTelephone` varchar(32),
	`etape` enum('avis_a_faire','avis_effectue','en_montage','montage_ok') NOT NULL DEFAULT 'avis_a_faire',
	`etapeSource` enum('courtage','immo') NOT NULL DEFAULT 'courtage',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `avis_pipe_id` PRIMARY KEY(`id`)
);

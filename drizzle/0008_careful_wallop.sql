CREATE TABLE `calendar_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titre` varchar(256) NOT NULL,
	`description` text,
	`assigneA` enum('Maria','Manon','Elodie','Hanna') NOT NULL,
	`dateDebut` timestamp NOT NULL,
	`dateFin` timestamp,
	`touteJournee` boolean NOT NULL DEFAULT false,
	`crmLeadId` int,
	`rappelEmail` boolean NOT NULL DEFAULT false,
	`rappelMinutesAvant` int DEFAULT 30,
	`rappelEnvoye` boolean NOT NULL DEFAULT false,
	`statut` enum('a_faire','en_cours','termine') NOT NULL DEFAULT 'a_faire',
	`creePar` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_tasks_id` PRIMARY KEY(`id`)
);

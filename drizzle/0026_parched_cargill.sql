CREATE TABLE `courtier_soumissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`courtierNom` varchar(255) NOT NULL,
	`courtierEmail` varchar(320),
	`courtierCabinet` varchar(255),
	`dateEnvoi` bigint NOT NULL,
	`reponse` enum('en_attente','ok_enveloppe','regroupement','refus','sans_suite') NOT NULL DEFAULT 'en_attente',
	`montantEnveloppe` int,
	`selectionne` boolean NOT NULL DEFAULT false,
	`note` text,
	`creePar` varchar(128),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `courtier_soumissions_id` PRIMARY KEY(`id`)
);

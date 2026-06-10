CREATE TABLE `crm_lead_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`nom` varchar(256) NOT NULL,
	`taille` int,
	`mimeType` varchar(128),
	`uploadePar` varchar(128),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_lead_documents_id` PRIMARY KEY(`id`)
);

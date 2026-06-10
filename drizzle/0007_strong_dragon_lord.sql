CREATE TABLE `crm_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nom` varchar(128) NOT NULL,
	`prenom` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`telephone` varchar(32),
	`leadId` int,
	`mandatId` int,
	`hexaId` int,
	`etape` enum('welcome_call','courtage','recherche_bien','sigma_credit') NOT NULL DEFAULT 'welcome_call',
	`responsable` varchar(128),
	`welcomeCallFait` boolean NOT NULL DEFAULT false,
	`etatCivilRempli` boolean NOT NULL DEFAULT false,
	`mandatRempli` boolean NOT NULL DEFAULT false,
	`accesPodia` boolean NOT NULL DEFAULT false,
	`documentsDeposes` boolean NOT NULL DEFAULT false,
	`avisDepose` boolean NOT NULL DEFAULT false,
	`courtierAssigne` varchar(128),
	`enveloppeValidee` int,
	`enveloppeDate` varchar(32),
	`agentAssigne` varchar(128),
	`nbBiensPresentes` int NOT NULL DEFAULT 0,
	`offreAcceptee` boolean NOT NULL DEFAULT false,
	`notes` text,
	`statut` enum('actif','en_pause','cloture','perdu') NOT NULL DEFAULT 'actif',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`etape` varchar(64) NOT NULL,
	`auteur` varchar(128),
	`contenu` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_notes_id` PRIMARY KEY(`id`)
);

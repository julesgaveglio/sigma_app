CREATE TABLE `calendar_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titre` varchar(256) NOT NULL,
	`description` text,
	`assigneA` enum('maria','manon','elodie','hanna') NOT NULL,
	`crmLeadId` int,
	`dateDebut` timestamp NOT NULL,
	`dateFin` timestamp,
	`rappelMinutes` int DEFAULT 30,
	`rappelEnvoye` boolean DEFAULT false,
	`termine` boolean DEFAULT false,
	`couleur` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nom` varchar(256) NOT NULL,
	`email` varchar(320),
	`telephone` varchar(32),
	`leadId` int,
	`mandatId` int,
	`hexaId` int,
	`etape` enum('sigma_credit','welcome_call','courtage','point_personnalise','recherche_bien') NOT NULL DEFAULT 'sigma_credit',
	`responsable` varchar(128),
	`notes` text,
	`enveloppeValidee` int,
	`enveloppeStatut` enum('en_attente','validee','refusee') DEFAULT 'en_attente',
	`statut` enum('actif','standby','cloture') NOT NULL DEFAULT 'actif',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`auteur` varchar(128) NOT NULL,
	`etape` varchar(64),
	`contenu` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_care_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomConseiller` varchar(128) NOT NULL,
	`emailConseiller` varchar(320),
	`typeService` enum('recherche_bien','visite_accompagnee','negociation','suivi_dossier','conseil_investissement','estimation','autre') DEFAULT 'autre',
	`priorite` enum('basse','normale','haute','urgente') NOT NULL DEFAULT 'normale',
	`sujet` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`nomLead` varchar(256),
	`emailLead` varchar(320),
	`telephoneLead` varchar(32),
	`statut` enum('nouveau','en_cours','en_attente','traite','annule') NOT NULL DEFAULT 'nouveau',
	`notes` text,
	`assigneA` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_care_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hexa_dossiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`civilite` enum('M','Mme') DEFAULT 'M',
	`nom` varchar(128) NOT NULL,
	`prenoms` varchar(256) NOT NULL,
	`dateNaissance` varchar(32),
	`lieuNaissance` varchar(128),
	`adresse` text,
	`codePostal` varchar(10),
	`ville` varchar(128),
	`email` varchar(320),
	`telephone` varchar(32),
	`montant` int NOT NULL,
	`statut` enum('nouveau','en_cours','lien_envoye','paiement_recu','annule') NOT NULL DEFAULT 'nouveau',
	`lienPaiement` text,
	`paiementInitie` boolean DEFAULT false,
	`paiementRecu` boolean DEFAULT false,
	`notes` text,
	`assigneA` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hexa_dossiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mandats_recherche` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int,
	`civilite` enum('M','Mme','M_et_Mme') DEFAULT 'M',
	`nom` varchar(128) NOT NULL,
	`prenoms` varchar(256) NOT NULL,
	`email` varchar(320),
	`telephone` varchar(32),
	`adresse` text,
	`typeBien` enum('appartement','maison','terrain','local_commercial','autre') DEFAULT 'appartement',
	`usage` enum('residence_principale','residence_secondaire','investissement') DEFAULT 'residence_principale',
	`localisation` text,
	`surfaceMin` int,
	`surfaceMax` int,
	`nbPiecesMin` int,
	`nbPiecesMax` int,
	`budgetMax` int,
	`modeFinancement` enum('comptant','credit','mixte'),
	`prestations` text,
	`proximite` text,
	`criteresPrioritaires` text,
	`typeMandat` enum('exclusif','simple') DEFAULT 'simple',
	`dureeMandat` int DEFAULT 3,
	`statut` enum('nouveau','en_cours','en_attente_retour','standby','traite','annule') NOT NULL DEFAULT 'nouveau',
	`notes` text,
	`conseiller` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mandats_recherche_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maria_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`rdvType` enum('welcome_call','point_personnalise') NOT NULL,
	`wcEffectue` boolean DEFAULT false,
	`wcEtatCivil` boolean DEFAULT false,
	`wcMandat` boolean DEFAULT false,
	`wcDocumentsPodia` boolean DEFAULT false,
	`wcAvis` boolean DEFAULT false,
	`wcDiscoursClair` boolean DEFAULT false,
	`ppAvisRetour` boolean DEFAULT false,
	`ppEnveloppeOk` boolean DEFAULT false,
	`ppMandatSigne` boolean DEFAULT false,
	`notes` text,
	`rdvDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maria_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `conseiller` varchar(128);
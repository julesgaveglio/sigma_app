CREATE TABLE `ambassadeurs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nom` varchar(128) NOT NULL,
	`prenom` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`telephone` varchar(32) NOT NULL,
	`adresse` text NOT NULL,
	`codePostal` varchar(10) NOT NULL,
	`ville` varchar(128) NOT NULL,
	`statut` enum('agent_immobilier','mandataire','courtier','auto_entrepreneur','autre') NOT NULL,
	`siret` varchar(32),
	`activitePrincipale` text,
	`parrainId` int,
	`niveau` enum('1','2') NOT NULL DEFAULT '1',
	`contratSigne` boolean NOT NULL DEFAULT false,
	`dateSignature` timestamp,
	`signatureNom` varchar(256),
	`contratPdfUrl` text,
	`contratPdfKey` varchar(512),
	`statutInterne` enum('en_attente','actif','suspendu','resilie') NOT NULL DEFAULT 'en_attente',
	`notesInternes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ambassadeurs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `biens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ambassadeurId` int NOT NULL,
	`reference` varchar(64),
	`titre` varchar(256) NOT NULL,
	`typeBien` enum('appartement','maison','villa','terrain','local_commercial','autre') NOT NULL,
	`transaction` enum('vente','location') NOT NULL DEFAULT 'vente',
	`usage` enum('residence_principale','residence_secondaire','investissement_locatif','professionnel') NOT NULL,
	`adresse` text NOT NULL,
	`codePostal` varchar(10) NOT NULL,
	`ville` varchar(128) NOT NULL,
	`departement` varchar(64),
	`region` varchar(64),
	`latitude` varchar(32),
	`longitude` varchar(32),
	`surface` int NOT NULL,
	`surfaceTerrain` int,
	`nbPieces` int,
	`nbChambres` int,
	`nbSallesBain` int,
	`nbEtages` int,
	`etage` int,
	`anneeConstruction` int,
	`etatBien` enum('neuf','bon_etat','a_renover','a_rafraichir') NOT NULL,
	`travauxEstimes` int,
	`dpeLettre` enum('A','B','C','D','E','F','G','NC') DEFAULT 'NC',
	`dpeValeur` int,
	`gesLettre` enum('A','B','C','D','E','F','G','NC') DEFAULT 'NC',
	`gesValeur` int,
	`balcon` boolean DEFAULT false,
	`terrasse` boolean DEFAULT false,
	`jardin` boolean DEFAULT false,
	`parking` boolean DEFAULT false,
	`garage` boolean DEFAULT false,
	`cave` boolean DEFAULT false,
	`ascenseur` boolean DEFAULT false,
	`gardien` boolean DEFAULT false,
	`piscine` boolean DEFAULT false,
	`digicode` boolean DEFAULT false,
	`interphone` boolean DEFAULT false,
	`pmr` boolean DEFAULT false,
	`exposition` varchar(32),
	`vue` varchar(128),
	`environnement` varchar(128),
	`prix` int NOT NULL,
	`prixNegociable` boolean DEFAULT false,
	`chargesAnnuelles` int,
	`taxeFonciere` int,
	`photoPrincipaleUrl` text,
	`photoPrincipaleKey` varchar(512),
	`photosUrls` text,
	`planUrl` text,
	`dpeDocUrl` text,
	`description` text,
	`pointsForts` text,
	`statutBien` enum('en_attente_validation','publie','sous_compromis','vendu','retire') NOT NULL DEFAULT 'en_attente_validation',
	`valideParAdmin` boolean NOT NULL DEFAULT false,
	`notesAdmin` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `biens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int,
	`bienId` int,
	`descriptionVente` text,
	`commissionSigmaHt` int NOT NULL,
	`dateEncaissement` varchar(32) NOT NULL,
	`ambassadeurId` int NOT NULL,
	`niveau` enum('0','1','2') NOT NULL,
	`tauxPourcent` int NOT NULL,
	`montantHt` int NOT NULL,
	`statut` enum('a_payer','facture_recue','paye') NOT NULL DEFAULT 'a_payer',
	`datePaiement` varchar(32),
	`reference` varchar(128),
	`valideParAdmin` boolean NOT NULL DEFAULT false,
	`valideParNom` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demandes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nom` varchar(128) NOT NULL,
	`prenom` varchar(128) NOT NULL,
	`telephone` varchar(32) NOT NULL,
	`email` varchar(320) NOT NULL,
	`sujet` varchar(256) NOT NULL,
	`demande` text NOT NULL,
	`priorite` enum('hyper_urgent','tres_urgent','urgent','normal','faible') NOT NULL DEFAULT 'normal',
	`statut` enum('nouvelle','en_cours','en_attente_retour','standby','effectuee','annulee') NOT NULL DEFAULT 'nouvelle',
	`notesInternes` text,
	`assigneA` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demandes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinataire` enum('Maria','Manon','Elodie','Hanna','Owner') NOT NULL,
	`type` enum('nouveau_lead','changement_etape','nouvelle_note','nouvelle_tache','rappel_rdv') NOT NULL,
	`titre` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`lien` varchar(512),
	`lu` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propositions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crmLeadId` int NOT NULL,
	`bienId` int NOT NULL,
	`ordre` int NOT NULL DEFAULT 1,
	`presente` boolean NOT NULL DEFAULT false,
	`datePresentation` timestamp,
	`reactionClient` enum('interesse','pas_interesse','a_visiter','visite_faite','offre_faite'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `propositions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `custom_care_requests`;--> statement-breakpoint
DROP TABLE `maria_checklists`;--> statement-breakpoint
ALTER TABLE `calendar_tasks` MODIFY COLUMN `assigneA` enum('Maria','Manon','Elodie','Hanna') NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_tasks` MODIFY COLUMN `rappelEnvoye` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` MODIFY COLUMN `nom` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` MODIFY COLUMN `etape` enum('welcome_call','point_personnalise','courtage','recherche_bien','sigma_credit') NOT NULL DEFAULT 'welcome_call';--> statement-breakpoint
ALTER TABLE `crm_leads` MODIFY COLUMN `statut` enum('actif','en_pause','cloture','perdu') NOT NULL DEFAULT 'actif';--> statement-breakpoint
ALTER TABLE `crm_notes` MODIFY COLUMN `auteur` varchar(128);--> statement-breakpoint
ALTER TABLE `crm_notes` MODIFY COLUMN `etape` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` MODIFY COLUMN `civilite` enum('M.','Mme','Mme M.','M. Mme');--> statement-breakpoint
ALTER TABLE `hexa_dossiers` MODIFY COLUMN `adresse` varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` MODIFY COLUMN `codePostal` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` MODIFY COLUMN `ville` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` MODIFY COLUMN `paiementInitie` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` MODIFY COLUMN `paiementRecu` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `mandats_recherche` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `mandats_recherche` MODIFY COLUMN `telephone` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `mandats_recherche` MODIFY COLUMN `typeBien` enum('appartement','maison','villa','terrain','local_commercial','autre') NOT NULL;--> statement-breakpoint
ALTER TABLE `mandats_recherche` MODIFY COLUMN `usage` enum('residence_principale','residence_secondaire','investissement_locatif') NOT NULL;--> statement-breakpoint
ALTER TABLE `mandats_recherche` MODIFY COLUMN `localisation` text NOT NULL;--> statement-breakpoint
ALTER TABLE `mandats_recherche` MODIFY COLUMN `typeMandat` enum('simple','exclusif') DEFAULT 'simple';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','direction') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `calendar_tasks` ADD `touteJournee` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_tasks` ADD `rappelEmail` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_tasks` ADD `rappelMinutesAvant` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `calendar_tasks` ADD `statut` enum('a_faire','en_cours','termine') DEFAULT 'a_faire' NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_tasks` ADD `creePar` varchar(128);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `prenom` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `welcomeCallFait` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `etatCivilRempli` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `mandatRempli` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `accesPodia` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `documentsDeposes` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `avisDepose` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `discoursClair` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `avisRetourExp` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `enveloppeOk` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `mandatSigne` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `courtierAssigne` varchar(128);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `enveloppeDate` varchar(32);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `agentAssigne` varchar(128);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `nbBiensPresentes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `offreAcceptee` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `prenom` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `mobile` varchar(32);--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `fixe` varchar(32);--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `paysNaissance` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `villeNaissance` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `notesInternes` text;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `dateNaissance` varchar(32);--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `lieuNaissance` varchar(128);--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `nationalite` varchar(64);--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `situationFamiliale` varchar(64);--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `etage` varchar(64);--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `etatBien` enum('neuf','ancien','les_deux') DEFAULT 'les_deux';--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `travauxAcceptes` enum('oui','non','selon_prix') DEFAULT 'selon_prix';--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `balconTerrasse` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `parkingGarage` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `cave` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `ascenseur` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `gardien` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `calme` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `lumineux` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `procheTransports` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `procheEcoles` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `accessibilitePmr` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `animaux` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `exposition` varchar(32);--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `autresCriteres` text;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `apportPersonnel` int;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `accordBancaire` enum('oui','non','en_cours') DEFAULT 'non';--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `banqueCourtier` varchar(128);--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `revenusNets` int;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `notesInternes` text;--> statement-breakpoint
ALTER TABLE `mandats_recherche` ADD `assigneA` varchar(128);--> statement-breakpoint
ALTER TABLE `calendar_tasks` DROP COLUMN `rappelMinutes`;--> statement-breakpoint
ALTER TABLE `calendar_tasks` DROP COLUMN `termine`;--> statement-breakpoint
ALTER TABLE `calendar_tasks` DROP COLUMN `couleur`;--> statement-breakpoint
ALTER TABLE `crm_leads` DROP COLUMN `enveloppeStatut`;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` DROP COLUMN `prenoms`;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` DROP COLUMN `dateNaissance`;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` DROP COLUMN `lieuNaissance`;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` DROP COLUMN `telephone`;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `conseiller`;--> statement-breakpoint
ALTER TABLE `mandats_recherche` DROP COLUMN `civilite`;--> statement-breakpoint
ALTER TABLE `mandats_recherche` DROP COLUMN `prestations`;--> statement-breakpoint
ALTER TABLE `mandats_recherche` DROP COLUMN `proximite`;--> statement-breakpoint
ALTER TABLE `mandats_recherche` DROP COLUMN `criteresPrioritaires`;--> statement-breakpoint
ALTER TABLE `mandats_recherche` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `mandats_recherche` DROP COLUMN `conseiller`;
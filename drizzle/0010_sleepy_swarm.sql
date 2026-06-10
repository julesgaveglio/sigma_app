CREATE TABLE `assignations_financement` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierFinancementId` int NOT NULL,
	`courtierId` int NOT NULL,
	`statut` enum('en_attente','en_cours','valide','refuse') NOT NULL DEFAULT 'en_attente',
	`noteCourtier` text,
	`noteManon` text,
	`assignePar` varchar(128),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `assignations_financement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bien_propositions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bienId` int NOT NULL,
	`crmLeadId` int NOT NULL,
	`pdfUrl` varchar(1024),
	`messagePersonnalise` text,
	`envoyePar` varchar(320),
	`emailDestinataire` varchar(320),
	`statut_bp` enum('sent','preview') NOT NULL DEFAULT 'sent',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bien_propositions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocked_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`heure` varchar(5),
	`typeRdv_bs` enum('welcome_call','point_personnalise'),
	`raison` varchar(255),
	`creePar` varchar(100) DEFAULT 'Maria',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demande_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`demandeId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`nom` varchar(256) NOT NULL,
	`taille` int NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`envoyePar` enum('lead','hanna') NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demande_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `docs_dossier_financement` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierFinancementId` int NOT NULL,
	`nom` varchar(255) NOT NULL,
	`type` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(64),
	`size` int,
	`uploadePar` varchar(128),
	`created_at` bigint NOT NULL,
	CONSTRAINT `docs_dossier_financement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dossiers_financement` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int,
	`emprunteur1Nom` varchar(255) NOT NULL,
	`emprunteur1Prenom` varchar(255) NOT NULL,
	`emprunteur1DateNaissance` varchar(32),
	`emprunteur1Nationalite` varchar(128),
	`emprunteur1SituationMatrimoniale` varchar(64),
	`emprunteur1NbEnfants` int,
	`emprunteur1Proprietaire` boolean DEFAULT false,
	`emprunteur1Activite` varchar(128),
	`emprunteur1Anciennete` varchar(64),
	`emprunteur1StatutPro` varchar(128),
	`emprunteur1SalaireAvis2024` int,
	`emprunteur1SalaireAvis2025` int,
	`emprunteur1SalaireCumul2025` int,
	`emprunteur1SalaireNet2026` int,
	`emprunteur1AutresRevenus` int,
	`emprunteur1AutresCharges` int,
	`emprunteur1EpargneLiquide` int,
	`emprunteur1EpargneNonLiquide` int,
	`emprunteur1Apport` int,
	`emprunteur2Nom` varchar(255),
	`emprunteur2Prenom` varchar(255),
	`emprunteur2DateNaissance` varchar(32),
	`emprunteur2Nationalite` varchar(128),
	`emprunteur2Activite` varchar(128),
	`emprunteur2Anciennete` varchar(64),
	`emprunteur2StatutPro` varchar(128),
	`emprunteur2SalaireAvis2024` int,
	`emprunteur2SalaireAvis2025` int,
	`emprunteur2SalaireCumul2025` int,
	`emprunteur2SalaireNet2026` int,
	`emprunteur2EpargneLiquide` int,
	`emprunteur2EpargneNonLiquide` int,
	`emprunteur2Apport` int,
	`patrimoineJson` text,
	`montantProjet` int NOT NULL,
	`duree` int NOT NULL,
	`regimeFiscal` varchar(128),
	`objetFinancement` varchar(255),
	`incidentsATD` boolean DEFAULT false,
	`personneGarante` boolean DEFAULT false,
	`commentaire` text,
	`statut` enum('nouveau','en_cours','assigne','traite') NOT NULL DEFAULT 'nouveau',
	`noteManon` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `dossiers_financement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('bug','amelioration','question','autre') NOT NULL DEFAULT 'bug',
	`priorite` enum('faible','normale','haute','critique') NOT NULL DEFAULT 'normale',
	`titre` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`page` varchar(255),
	`auteur` varchar(255),
	`email` varchar(255),
	`statut` enum('nouveau','en_cours','resolu','ignore') NOT NULL DEFAULT 'nouveau',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `feedbacks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `notifications_in_app` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinataireEmail` varchar(320) NOT NULL,
	`type` varchar(64) NOT NULL,
	`titre` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`lien` varchar(512),
	`lu` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	CONSTRAINT `notifications_in_app_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions_courtage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courtierId` int NOT NULL,
	`leadNom` varchar(255),
	`dossierRef` varchar(255),
	`montantEnveloppe` int,
	`date_enveloppe` bigint,
	`montantCommission` int,
	`date_validation` bigint,
	`partCourtier` int,
	`partParrainN1` int,
	`partParrainN2` int,
	`partSigma` int,
	`parrainN1Id` int,
	`parrainN2Id` int,
	`statut_tc` enum('en_attente','valide','paiement_initie','paye') NOT NULL DEFAULT 'en_attente',
	`noteHanna` text,
	`valideePar` varchar(128),
	`validee_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `transactions_courtage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions_immo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`adresseBien` varchar(512),
	`type_transaction` enum('vente','location') NOT NULL DEFAULT 'vente',
	`montantHonoraires` int NOT NULL,
	`date_transaction` bigint,
	`partAgent` int,
	`partParrainN1` int,
	`partParrainN2` int,
	`partSigma` int,
	`parrainN1Id` int,
	`parrainN2Id` int,
	`statut_ti` enum('en_attente','valide','paiement_initie','paye') NOT NULL DEFAULT 'en_attente',
	`noteHanna` text,
	`valideePar` varchar(128),
	`validee_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `transactions_immo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('nouveau_lead','changement_etape','nouvelle_note','nouvelle_tache','rappel_rdv','nouvel_ambassadeur','nouveau_courtier') NOT NULL;--> statement-breakpoint
ALTER TABLE `ambassadeurs` ADD `latitude` varchar(32);--> statement-breakpoint
ALTER TABLE `ambassadeurs` ADD `longitude` varchar(32);--> statement-breakpoint
ALTER TABLE `biens` ADD `prixNetVendeur` int;--> statement-breakpoint
ALTER TABLE `biens` ADD `honorairesAgence` int;--> statement-breakpoint
ALTER TABLE `closes` ADD `lead_id` int;--> statement-breakpoint
ALTER TABLE `closes` ADD `closerNom` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `closes` ADD `leadNom` varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE `closes` ADD `leadEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `closes` ADD `leadTelephone` varchar(32);--> statement-breakpoint
ALTER TABLE `closes` ADD `resultat` enum('close','non_close','r2','perdu');--> statement-breakpoint
ALTER TABLE `courtiers` ADD `denominationSociale` varchar(256);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `formeJuridique` varchar(64);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `capitalSocial` varchar(64);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `adresseSiegeSocial` text;--> statement-breakpoint
ALTER TABLE `courtiers` ADD `villeGreffe` varchar(128);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `numeroRCS` varchar(64);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `representantLegalNom` varchar(256);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `representantLegalFonction` varchar(128);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `latitude` varchar(32);--> statement-breakpoint
ALTER TABLE `courtiers` ADD `longitude` varchar(32);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `formule` enum('starter','premium','sdt_starter','sdt_premium');--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `modePaiement` enum('comptant','deux_fois','cinquante_pourcent');--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `montantFormule` int;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `tableauCourtageRempli` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `avisStatut` enum('en_attente','depose','pas_davis') DEFAULT 'en_attente' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `avisNote` text;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `dateNaissance` varchar(32);--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `situationFamiliale` enum('celibataire','marie','pacse','divorce','veuf');--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `profession` varchar(128);--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `formule` enum('starter','premium','sdt_starter','sdt_premium');--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `modePaiement` enum('comptant','deux_fois','cinquante_pourcent');--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `montantTotal` int;--> statement-breakpoint
ALTER TABLE `hexa_dossiers` ADD `montantAcompte` int;--> statement-breakpoint
ALTER TABLE `demande_documents` ADD CONSTRAINT `demande_documents_demandeId_demandes_id_fk` FOREIGN KEY (`demandeId`) REFERENCES `demandes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `closes` DROP COLUMN `closerId`;
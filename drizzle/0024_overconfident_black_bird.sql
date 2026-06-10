ALTER TABLE `blocked_slots` ADD `typeRdv` enum('welcome_call','point_personnalise','point_immobilier','tous');--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `numeroMandat` varchar(32);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `projetType` enum('Rés. principale','Invest. locatif','RP + IL');--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `budgetMax` int;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `typeBien` varchar(255);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `zoneRecherche` text;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `villeResidence` varchar(128);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `departement` varchar(8);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `codePostal` varchar(10);--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `dateSignatureMandat` varchar(32);--> statement-breakpoint
ALTER TABLE `blocked_slots` DROP COLUMN `typeRdv_bs`;
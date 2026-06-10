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

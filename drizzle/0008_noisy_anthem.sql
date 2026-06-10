CREATE TABLE `closers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nom` varchar(128) NOT NULL,
	`prenom` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`actif` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `closers_id` PRIMARY KEY(`id`),
	CONSTRAINT `closers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `closes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`closerId` int NOT NULL,
	`offre` enum('IDRH','HZC','SDT') NOT NULL,
	`show` boolean NOT NULL,
	`pitche` boolean NOT NULL DEFAULT false,
	`lienFathom` text,
	`formule` enum('Starter','Premium'),
	`modePaiement` enum('une_fois','deux_fois','trois_fois'),
	`montantGenere` int NOT NULL DEFAULT 0,
	`montantEncaisse` int NOT NULL DEFAULT 0,
	`montantCb` int,
	`montantVirement` int,
	`montantCreditImpot` int,
	`montantPrelevement` int,
	`datePrelevement` varchar(32),
	`commentaire` text,
	`dateCall` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `closes_id` PRIMARY KEY(`id`)
);

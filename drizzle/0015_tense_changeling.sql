ALTER TABLE `closes` ADD `dateVirementPrevu` varchar(32);--> statement-breakpoint
ALTER TABLE `closes` ADD `statutEncaissement` enum('en_attente','initie','recu') DEFAULT 'en_attente';
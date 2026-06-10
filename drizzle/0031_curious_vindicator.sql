ALTER TABLE `bien_propositions` MODIFY COLUMN `bienId` int;--> statement-breakpoint
ALTER TABLE `bien_propositions` ADD `offMarketBienId` int;--> statement-breakpoint
ALTER TABLE `bien_propositions` ADD `source` varchar(20) DEFAULT 'bien';--> statement-breakpoint
ALTER TABLE `bien_propositions` ADD `bienTitreSnapshot` varchar(512);
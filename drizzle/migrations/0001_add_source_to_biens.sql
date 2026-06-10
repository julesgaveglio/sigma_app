-- Migration: Add source column and make ambassadeurId nullable in biens table
ALTER TABLE `biens` 
  MODIFY COLUMN `ambassadeurId` int NULL,
  ADD COLUMN `source` enum('ambassadeur', 'pap_scrape') NOT NULL DEFAULT 'ambassadeur' AFTER `ambassadeurId`;

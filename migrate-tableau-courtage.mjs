import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS tableaux_courtage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leadId INT,
    mandatId INT,
    nom VARCHAR(128) NOT NULL,
    prenoms VARCHAR(256) NOT NULL,
    email VARCHAR(320) NOT NULL,
    telephone VARCHAR(32) NOT NULL,
    situationPro ENUM('salarie_cdi','salarie_cdd','fonctionnaire','independant','chef_entreprise','retraite','sans_emploi','autre') NOT NULL,
    employeur VARCHAR(128),
    ancienneteEmploi VARCHAR(64),
    salaireNet INT,
    autresRevenus INT,
    natureAutresRevenus VARCHAR(256),
    conjointSituationPro ENUM('salarie_cdi','salarie_cdd','fonctionnaire','independant','chef_entreprise','retraite','sans_emploi','autre','non_applicable') DEFAULT 'non_applicable',
    conjointSalaireNet INT,
    conjointAutresRevenus INT,
    loyerActuel INT,
    creditImmobilier INT,
    creditAuto INT,
    creditConso INT,
    autresCharges INT,
    apportPersonnel INT,
    origineApport ENUM('epargne_personnelle','donation_familiale','vente_bien','participation_entreprise','autre'),
    epargneResiduelle INT,
    banquePrincipale VARCHAR(128),
    incidentsFinanciers ENUM('oui','non') DEFAULT 'non',
    detailsIncidents TEXT,
    montantEmprunte INT,
    dureeEmprunt INT,
    accordBancaire_tc ENUM('oui','non','en_cours') DEFAULT 'non',
    nomBanqueAccord VARCHAR(128),
    montantAccord INT,
    commentaires TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
  )
`);

console.log('✅ Table tableaux_courtage créée avec succès');
await conn.end();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Créer la table lead_activities
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`lead_activities\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`crmLeadId\` int NOT NULL,
    \`type\` enum('note','email_envoye','rdv_pris','rdv_confirme','etape_changee','champ_modifie','document','appel','autre') NOT NULL,
    \`auteur\` varchar(128) NOT NULL DEFAULT 'Système',
    \`titre\` varchar(256) NOT NULL,
    \`contenu\` text,
    \`meta\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`lead_activities_id\` PRIMARY KEY(\`id\`)
  )
`);

console.log('✅ Table lead_activities créée avec succès');

// Vérifier
const [rows] = await conn.execute("SHOW TABLES LIKE 'lead_activities'");
console.log('Vérification:', rows.length > 0 ? '✅ Table présente' : '❌ Table absente');

await conn.end();

import { createConnection } from 'mysql2/promise';

const db = await createConnection(process.env.DATABASE_URL);

await db.execute(`CREATE TABLE IF NOT EXISTS \`bien_propositions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`bienId\` int NOT NULL,
  \`crmLeadId\` int NOT NULL,
  \`pdfUrl\` varchar(1024),
  \`messagePersonnalise\` text,
  \`envoyePar\` varchar(320),
  \`emailDestinataire\` varchar(320),
  \`statut_bp\` enum('sent','preview') NOT NULL DEFAULT 'sent',
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`bien_propositions_id\` PRIMARY KEY(\`id\`)
)`);

console.log('Table bien_propositions créée avec succès');
await db.end();

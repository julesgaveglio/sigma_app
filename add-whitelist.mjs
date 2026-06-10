import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Charger les variables d'environnement
try { dotenv.config(); } catch {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL non définie');
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// Ajouter Jérôme Chibau
await conn.execute(
  `INSERT INTO allowed_emails (email, nom, role) VALUES (?, ?, ?)
   ON DUPLICATE KEY UPDATE nom = VALUES(nom), role = VALUES(role)`,
  ['jerome.chibau@iadfrance.fr', 'Jérôme CHIBAU', 'user']
);

console.log('✅ jerome.chibau@iadfrance.fr ajouté à la liste blanche avec rôle: user (agent)');

// Vérification
const [rows] = await conn.execute(
  'SELECT email, nom, role, createdAt FROM allowed_emails ORDER BY createdAt DESC LIMIT 10'
);
console.log('\nListe blanche actuelle (10 derniers) :');
console.table(rows);

await conn.end();

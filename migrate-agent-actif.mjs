import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// 1. Ajouter la colonne actif à allowed_emails si elle n'existe pas
try {
  await conn.execute(`ALTER TABLE allowed_emails ADD COLUMN actif BOOLEAN NOT NULL DEFAULT TRUE`);
  console.log('✅ Colonne actif ajoutée à allowed_emails');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log('ℹ️  Colonne actif déjà présente');
  } else throw e;
}

// 2. Modifier l'enum role dans allowed_emails pour ajouter 'agent'
try {
  await conn.execute(`ALTER TABLE allowed_emails MODIFY COLUMN role ENUM('user', 'admin', 'direction', 'agent') NOT NULL DEFAULT 'user'`);
  console.log('✅ Enum role mis à jour dans allowed_emails (ajout agent)');
} catch (e) {
  console.error('❌ Erreur modification enum allowed_emails:', e.message);
}

// 3. Modifier l'enum role dans users pour ajouter 'agent'
try {
  await conn.execute(`ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'direction', 'agent') NOT NULL DEFAULT 'user'`);
  console.log('✅ Enum role mis à jour dans users (ajout agent)');
} catch (e) {
  console.error('❌ Erreur modification enum users:', e.message);
}

// Vérification
const [rows] = await conn.execute('SELECT email, nom, role, actif FROM allowed_emails ORDER BY createdAt');
console.log('\nÉtat actuel de allowed_emails :');
console.table(rows);

await conn.end();
console.log('\n✅ Migration terminée');

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const newPassword = 'Sigma2026!';
const email = 'julien@js-courtage-et-financement.com';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute('SELECT id, email, name, passwordHash FROM users WHERE email = ?', [email]);
if (rows.length === 0) {
  console.log('ERREUR: Compte non trouvé pour', email);
  process.exit(1);
}

console.log('Compte trouvé:', { id: rows[0].id, email: rows[0].email, name: rows[0].name, hasPassword: !!rows[0].passwordHash });

const hash = await bcrypt.hash(newPassword, 12);
await conn.execute('UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE email = ?', [hash, email]);
console.log('✅ Mot de passe réinitialisé avec succès:', newPassword);

await conn.end();

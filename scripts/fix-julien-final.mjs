import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Supprimer le compte doublon
await conn.execute('DELETE FROM users WHERE id = ?', [2763634]);
console.log('✅ Doublon supprimé (id 2763634)');

// 2. Vérifier le hash du bon compte
const [rows] = await conn.execute('SELECT id, email, passwordHash FROM users WHERE id = ?', [2640047]);
const user = rows[0];
const ok = await bcrypt.compare('Sigma2026!', user.passwordHash);
console.log('Mot de passe Sigma2026! valide:', ok);

if (ok === false) {
  const hash = await bcrypt.hash('Sigma2026!', 10);
  await conn.execute('UPDATE users SET passwordHash = ? WHERE id = ?', [hash, 2640047]);
  console.log('✅ Mot de passe réinitialisé à Sigma2026!');
} else {
  console.log('✅ Mot de passe déjà correct — aucune modification nécessaire');
}

// 3. Vérifier l'état final
const [final] = await conn.execute('SELECT id, email, name, role FROM users WHERE email = ?', ['julien@js-courtage-et-financement.com']);
console.log('État final users:', JSON.stringify(final));

await conn.end();

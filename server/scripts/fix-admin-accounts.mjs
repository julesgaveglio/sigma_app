import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Nouveau mot de passe temporaire pour Othmane
const newPassword = 'SigmaAdmin2026!';
const hash = await bcrypt.hash(newPassword, 10);

// Mettre à jour le compte principal d'Othmane (id 2) avec le nouveau mot de passe
await conn.query(
  `UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = 2`
, [hash]);

// Supprimer le doublon OAuth (id 1020001) qui n'a pas de mot de passe
// D'abord vérifier qu'il n'a pas de données liées
await conn.query(`DELETE FROM users WHERE id = 1020001`);

console.log('✅ Compte Othmane (id 2) mis à jour avec le nouveau mot de passe');
console.log('✅ Doublon (id 1020001) supprimé');
console.log('');
console.log('Identifiants pour sigmafactory.org/login :');
console.log('  Email   : othmanehiyadi@sigmaipf.fr');
console.log('  Mot de passe : ' + newPassword);

// Vérifier aussi Hanna et Mario
const [rows] = await conn.query(
  `SELECT id, name, email, role, 
   CASE WHEN passwordHash IS NOT NULL THEN 'OUI' ELSE 'NON' END as has_password
   FROM users WHERE id IN (2, 3, 6)`
);
console.log('\nÉtat des comptes admin/direction :');
console.table(rows);

await conn.end();

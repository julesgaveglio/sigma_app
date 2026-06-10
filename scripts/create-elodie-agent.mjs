import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Vérifier si Élodie a déjà un profil ambassadeur
const [existing] = await conn.execute(
  'SELECT id, nom, prenom, userId FROM ambassadeurs WHERE email = ?',
  ['elodie@sigmafactory.fr']
);
console.log('Profil existant:', JSON.stringify(existing));

if (existing.length === 0) {
  // Créer le profil agent d'Élodie
  const [result] = await conn.execute(`
    INSERT INTO ambassadeurs (nom, prenom, email, telephone, adresse, codePostal, ville, statut, niveau, contratSigne, dateSignature, signatureNom, statutInterne, userId, parrainId, codeParrain, createdAt, updatedAt)
    VALUES ('BENCHEKROUN', 'Elodie', 'elodie@sigmafactory.fr', '0600000000', 'Sigma Factory', '75000', 'Paris', 'agent_immobilier', '1', 1, NOW(), 'Elodie Benchekroun', 'actif', 570015, 3, 'SIG-ELODIE-ADMIN', NOW(), NOW())
  `);
  console.log('Profil créé, ID:', result.insertId);
} else {
  const profil = existing[0];
  const hasUserId = profil.userId !== null && profil.userId !== undefined;
  if (!hasUserId) {
    await conn.execute('UPDATE ambassadeurs SET userId = 570015 WHERE id = ?', [profil.id]);
    console.log('UserId lié au profil existant ID:', profil.id);
  } else {
    console.log('Profil déjà lié, userId:', profil.userId);
  }
}

await conn.end();
console.log('Done.');

import mysql from '/home/ubuntu/sigma-etat-civil/node_modules/mysql2/promise.js';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Trouver Pierre Aries
const [rows] = await conn.query(`
  SELECT id, prenom, nom, email, codeParrain, statutInterne, conventionPdfUrl
  FROM courtiers 
  WHERE LOWER(nom) LIKE '%aries%' OR LOWER(prenom) LIKE '%pierre%'
  ORDER BY createdAt DESC
  LIMIT 5
`);

console.log("=== Courtiers trouvés ===");
console.log(JSON.stringify(rows, null, 2));

if (rows.length > 0) {
  const courtier = rows[0];
  console.log(`\n=== Activation de ${courtier.prenom} ${courtier.nom} (${courtier.email}) ===`);
  
  // 2. Activer le courtier
  await conn.query(`UPDATE courtiers SET statutInterne = 'actif' WHERE id = ?`, [courtier.id]);
  console.log("✅ Statut mis à 'actif'");

  // 3. Ajouter dans allowed_emails si pas déjà présent
  const [existing] = await conn.query(`SELECT id FROM allowed_emails WHERE email = ?`, [courtier.email.toLowerCase()]);
  
  if (existing.length === 0) {
    await conn.query(`
      INSERT INTO allowed_emails (email, nom, role, actif) 
      VALUES (?, ?, 'courtier', true)
    `, [courtier.email.toLowerCase(), `${courtier.prenom} ${courtier.nom}`]);
    console.log("✅ Email ajouté dans allowed_emails avec rôle 'courtier'");
  } else {
    await conn.query(`UPDATE allowed_emails SET role = 'courtier', actif = true WHERE email = ?`, [courtier.email.toLowerCase()]);
    console.log("✅ Email déjà présent — rôle mis à jour");
  }

  console.log(`\n📧 Email: ${courtier.email}`);
  console.log(`🔑 Code parrain: ${courtier.codeParrain}`);
  console.log(`📄 Convention: ${courtier.conventionPdfUrl}`);
}

await conn.end();

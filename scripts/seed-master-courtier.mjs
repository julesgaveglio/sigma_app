import { createConnection } from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const db = await createConnection(dbUrl);

// Vérifier si le master Sigma courtier existe déjà
const [existing] = await db.execute(
  "SELECT id FROM courtiers WHERE email = ? LIMIT 1",
  ["sigma@sigmafactory.fr"]
);

if (existing.length > 0) {
  console.log("✅ Compte master Sigma courtier déjà existant (id:", existing[0].id, ")");
} else {
  await db.execute(
    `INSERT INTO courtiers 
     (nom, prenom, email, telephone, adresse, codePostal, ville, statut, 
      parrainId, niveau, conventionSignee, statutInterne, codeParrain, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      "Factory", "Sigma", "sigma@sigmafactory.fr", "0000000000",
      "1 rue Sigma", "75001", "Paris", "sasu",
      null, "1", 1, "actif", "SIG-SIGMA-0001"
    ]
  );
  console.log("✅ Compte master Sigma courtier créé avec le code SIG-SIGMA-0001");
}

await db.end();

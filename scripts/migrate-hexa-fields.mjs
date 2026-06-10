import { createConnection } from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const conn = await createConnection(url);

try {
  // Vérifier si les colonnes existent déjà
  const [rows] = await conn.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'hexa_dossiers' 
    AND COLUMN_NAME IN ('dateNaissance', 'situationFamiliale', 'profession')
  `);
  const existing = rows.map(r => r.COLUMN_NAME);
  console.log("Colonnes existantes:", existing);

  const toAdd = [];
  if (!existing.includes("dateNaissance")) toAdd.push("ADD COLUMN `dateNaissance` VARCHAR(32)");
  if (!existing.includes("situationFamiliale")) toAdd.push("ADD COLUMN `situationFamiliale` ENUM('celibataire','marie','pacse','divorce','veuf')");
  if (!existing.includes("profession")) toAdd.push("ADD COLUMN `profession` VARCHAR(128)");

  if (toAdd.length === 0) {
    console.log("✓ Toutes les colonnes existent déjà, rien à faire.");
  } else {
    const sql = `ALTER TABLE hexa_dossiers ${toAdd.join(", ")}`;
    console.log("Exécution:", sql);
    await conn.execute(sql);
    console.log("✓ Migration réussie !");
  }
} finally {
  await conn.end();
}

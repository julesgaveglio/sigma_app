import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE off_market_biens ADD COLUMN latitude varchar(32) NULL, ADD COLUMN longitude varchar(32) NULL");
  console.log("✅ Colonnes latitude/longitude ajoutées avec succès");
} catch(e) {
  if (e.message.includes("Duplicate column")) {
    console.log("ℹ️ Colonnes déjà existantes");
  } else {
    console.error("❌ Erreur:", e.message);
  }
}

// Vérification
const [rows] = await conn.execute("DESCRIBE off_market_biens");
console.log("\nColonnes actuelles:");
rows.forEach(r => console.log(" -", r.Field, r.Type));
await conn.end();

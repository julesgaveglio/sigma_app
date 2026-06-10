import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const columns = [
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS denominationSociale VARCHAR(256)",
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS formeJuridique VARCHAR(64)",
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS capitalSocial VARCHAR(64)",
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS adresseSiegeSocial TEXT",
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS villeGreffe VARCHAR(128)",
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS numeroRCS VARCHAR(64)",
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS representantLegalNom VARCHAR(256)",
  "ALTER TABLE courtiers ADD COLUMN IF NOT EXISTS representantLegalFonction VARCHAR(128)",
];

for (const sql of columns) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.split("ADD COLUMN IF NOT EXISTS ")[1]?.split(" ")[0]);
  } catch (e) {
    console.log("⚠", e.message);
  }
}

await conn.end();
console.log("Migration terminée.");

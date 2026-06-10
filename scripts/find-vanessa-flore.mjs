import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Chercher toutes les entrées avec Vanessa ou Flore
const [rows] = await conn.query(
  `SELECT * FROM crm_leads WHERE nom LIKE '%Flore%' OR prenom LIKE '%Vanessa%' OR nom LIKE '%Vanessa%' OR prenom LIKE '%Flore%' ORDER BY id`
);

console.log(`\n=== Fiches trouvées : ${rows.length} ===`);
for (const r of rows) {
  console.log("\n--- Fiche ID:", r.id, "---");
  for (const [k, v] of Object.entries(r)) {
    if (v !== null && v !== undefined && v !== '') {
      console.log(`  ${k}: ${v}`);
    }
  }
}

// Aussi chercher dans etat_civil
const [ecRows] = await conn.query(
  `SELECT * FROM etat_civil WHERE nom LIKE '%Flore%' OR prenom LIKE '%Vanessa%' OR nom LIKE '%Vanessa%' OR prenom LIKE '%Flore%' ORDER BY id`
).catch(() => [[]]);

if (ecRows.length > 0) {
  console.log(`\n=== État civil trouvé : ${ecRows.length} ===`);
  for (const r of ecRows) {
    console.log("\n--- État civil ID:", r.id, "---");
    for (const [k, v] of Object.entries(r)) {
      if (v !== null && v !== undefined && v !== '') {
        console.log(`  ${k}: ${v}`);
      }
    }
  }
}

await conn.end();

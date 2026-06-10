import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL!);

// Lister toutes les tables
const [tables] = await db.execute("SHOW TABLES") as any;
console.log("=== TABLES DISPONIBLES ===");
const tableNames = tables.map((t: any) => Object.values(t)[0] as string);
tableNames.forEach((t: string) => console.log(t));

// Chercher les tables liées à l'état civil
const etatCivilTables = tableNames.filter((t: string) => 
  t.includes("etat") || t.includes("civil") || t.includes("document") || t.includes("form") || t.includes("identit")
);
console.log("\n=== TABLES ÉTAT CIVIL CANDIDATES ===");
console.log(etatCivilTables);

// Vérifier le lead de Vanessa - etatCivilRempli = 0 alors qu'elle a rempli 3 fois
// Chercher dans les tables candidates
for (const table of etatCivilTables) {
  try {
    const [rows] = await db.execute(`SELECT * FROM \`${table}\` LIMIT 3`) as any;
    console.log(`\n=== ${table} (sample) ===`);
    console.log(JSON.stringify(rows[0], null, 2));
  } catch (e: any) {
    console.log(`Erreur sur ${table}: ${e.message}`);
  }
}

// Chercher aussi par email dans toutes les tables
console.log("\n=== RECHERCHE obivanessa49 dans toutes les tables ===");
for (const table of tableNames) {
  try {
    const [cols] = await db.execute(`SHOW COLUMNS FROM \`${table}\``) as any;
    const emailCol = cols.find((c: any) => c.Field.toLowerCase().includes("email"));
    if (emailCol) {
      const [rows] = await db.execute(`SELECT * FROM \`${table}\` WHERE \`${emailCol.Field}\` LIKE '%vanessa%' OR \`${emailCol.Field}\` LIKE '%obivanessa%'`) as any;
      if (rows.length > 0) {
        console.log(`\nTrouvé dans ${table}:`);
        console.log(JSON.stringify(rows, null, 2));
      }
    }
  } catch (e: any) {
    // ignore
  }
}

await db.end();

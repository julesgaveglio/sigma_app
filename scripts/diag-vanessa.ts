import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL!);

// Chercher Vanessa Obi dans les leads CRM
const [leads] = await db.execute(
  "SELECT * FROM crm_leads WHERE email LIKE '%vanessa%' OR email LIKE '%obi%' OR nom LIKE '%Obi%' OR prenom LIKE '%Vanessa%' LIMIT 10"
) as any;
console.log("=== LEADS CRM Vanessa ===");
console.log(JSON.stringify(leads, null, 2));

// Chercher dans la table etat_civil
const [etatsCivils] = await db.execute(
  "SELECT * FROM etat_civil WHERE email LIKE '%vanessa%' OR email LIKE '%obi%' ORDER BY created_at DESC LIMIT 10"
) as any;
console.log("\n=== ÉTAT CIVIL Vanessa ===");
console.log(JSON.stringify(etatsCivils, null, 2));

// Chercher aussi dans les tables possibles
const [tables] = await db.execute("SHOW TABLES") as any;
console.log("\n=== TABLES DISPONIBLES ===");
tables.forEach((t: any) => console.log(Object.values(t)[0]));

await db.end();

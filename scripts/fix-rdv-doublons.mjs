import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// 1. Lister tous les RDV du 15 avril 2026 pour Élodie
console.log("\n=== RDV Élodie du 15 avril 2026 ===");
const [rows] = await conn.query(
  `SELECT id, titre, dateDebut, dateFin, assigneA, creePar 
   FROM calendar_tasks 
   WHERE assigneA = 'Elodie' 
     AND dateDebut >= '2026-04-15 00:00:00' 
     AND dateDebut < '2026-04-16 00:00:00'
   ORDER BY dateDebut`
);
console.table(rows);

// 2. Chercher les doublons (même heure, même assigneA)
console.log("\n=== Doublons potentiels (même heure, Élodie) ===");
const [doublons] = await conn.query(
  `SELECT dateDebut, COUNT(*) as nb, GROUP_CONCAT(id ORDER BY id) as ids, GROUP_CONCAT(titre ORDER BY id SEPARATOR ' | ') as titres
   FROM calendar_tasks
   WHERE assigneA = 'Elodie'
   GROUP BY dateDebut
   HAVING COUNT(*) > 1
   ORDER BY dateDebut`
);
console.table(doublons);

// 3. Chercher aussi les doublons pour Maria
console.log("\n=== Doublons potentiels (même heure, Maria) ===");
const [doublonsMaria] = await conn.query(
  `SELECT dateDebut, COUNT(*) as nb, GROUP_CONCAT(id ORDER BY id) as ids, GROUP_CONCAT(titre ORDER BY id SEPARATOR ' | ') as titres
   FROM calendar_tasks
   WHERE assigneA = 'Maria'
   GROUP BY dateDebut
   HAVING COUNT(*) > 1
   ORDER BY dateDebut`
);
console.table(doublonsMaria);

// 4. Lister tous les RDV du 15 avril (tous membres)
console.log("\n=== Tous les RDV du 15 avril 2026 ===");
const [all15] = await conn.query(
  `SELECT id, titre, dateDebut, assigneA, creePar 
   FROM calendar_tasks 
   WHERE dateDebut >= '2026-04-15 00:00:00' 
     AND dateDebut < '2026-04-16 00:00:00'
   ORDER BY dateDebut, assigneA`
);
console.table(all15);

await conn.end();
console.log("\nDiagnostic terminé.");

// Simule exactement ce que fait la procédure inscrire côté serveur
// pour identifier pourquoi allowedEmails n'est pas inséré

import { getDb } from "../server/db";
import { courtiers, allowedEmails } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
if (!db) { console.error("DB indisponible"); process.exit(1); }

// Simuler l'insertion dans allowedEmails comme dans le code
const testEmail = "test-inscription-debug@test.fr";

console.log("=== TEST INSERTION allowedEmails ===");
try {
  const [existingAllowed] = await db.select().from(allowedEmails)
    .where(eq(allowedEmails.email, testEmail.toLowerCase())).limit(1);
  
  if (!existingAllowed) {
    await db.insert(allowedEmails).values({
      email: testEmail.toLowerCase(),
      nom: "Test Debug",
      role: "courtier",
      actif: true,
    });
    console.log("✓ Insertion réussie");
  } else {
    console.log("✓ Déjà existant:", existingAllowed);
  }
  
  // Vérifier
  const [check] = await db.select().from(allowedEmails)
    .where(eq(allowedEmails.email, testEmail.toLowerCase())).limit(1);
  console.log("Vérification:", check ? `✓ Trouvé (id=${check.id}, role=${check.role})` : "✗ NON TROUVÉ");
  
  // Nettoyer
  await db.delete(allowedEmails).where(eq(allowedEmails.email, testEmail.toLowerCase()));
  console.log("Nettoyage OK");
  
} catch (e: any) {
  console.error("✗ ERREUR:", e.message);
  console.error("Stack:", e.stack?.split("\n").slice(0, 5).join("\n"));
}

// Vérifier aussi le schéma de la table en production
console.log("\n=== VÉRIFICATION TABLE allowed_emails ===");
try {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  const [cols] = await conn.query("DESCRIBE allowed_emails") as any;
  console.log("Colonnes:", cols.map((c: any) => `${c.Field}(${c.Type})`).join(", "));
  await conn.end();
} catch (e: any) {
  console.error("Erreur DESCRIBE:", e.message);
}

process.exit(0);

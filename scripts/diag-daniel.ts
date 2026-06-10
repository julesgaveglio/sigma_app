import { getDb } from "../server/db";
import { courtiers, users, allowedEmails } from "../drizzle/schema";
import { like, or } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) { console.error("DB indisponible"); return; }

  // Chercher dans courtiers
  const courtiersList = await db.select().from(courtiers).where(
    or(like(courtiers.nom, "%BARCELO%"), like(courtiers.nom, "%Barcelo%"), like(courtiers.prenom, "%Daniel%"), like(courtiers.email, "%barcelo%"))
  );
  console.log("=== COURTIERS ===");
  for (const c of courtiersList) {
    console.log(`ID: ${c.id} | ${c.prenom} ${c.nom} | ${c.email} | statut: ${c.statutInterne} | code: ${c.codeParrain} | PDF: ${c.conventionPdfUrl ? "OUI" : "NON"}`);
  }

  // Chercher dans users
  const usersList = await (db as any).select().from(users).where(
    or(like((users as any).email, "%barcelo%"), like((users as any).name, "%Daniel%"), like((users as any).name, "%Barcelo%"))
  );
  console.log("\n=== USERS ===");
  for (const u of usersList) {
    console.log(`ID: ${u.id} | email: ${u.email} | name: ${u.name} | role: ${u.role} | loginMethod: ${u.loginMethod}`);
  }

  // Chercher dans allowedEmails
  const allowedList = await db.select().from(allowedEmails).where(
    like(allowedEmails.email, "%barcelo%")
  );
  console.log("\n=== ALLOWED_EMAILS ===");
  for (const a of allowedList) {
    console.log(`email: ${a.email} | role: ${a.role}`);
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

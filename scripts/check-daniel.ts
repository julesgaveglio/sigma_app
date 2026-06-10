import { getDb } from "../server/db";
import { courtiers, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  const db = (await getDb());
  if (!db) { console.error("DB indisponible"); process.exit(1); }

  const [c] = await db.select().from(courtiers).where(eq(courtiers.email, "daniel.barcelo@ymanci.com")).limit(1);
  if (!c) { console.log("Courtier non trouvé"); process.exit(0); }
  
  console.log("=== COURTIER ===");
  console.log({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    statutInterne: c.statutInterne,
    codeParrain: c.codeParrain,
    userId: c.userId,
    conventionPdfUrl: c.conventionPdfUrl ? "OUI" : "NON",
    conventionSignee: c.conventionSignee,
    parrainId: c.parrainId,
  });

  const [u] = await db.select().from(users).where(eq(users.email, "daniel.barcelo@ymanci.com")).limit(1);
  console.log("\n=== USER ===");
  if (u) {
    console.log({ id: u.id, email: u.email, name: u.name, role: u.role, loginMethod: u.loginMethod });
  } else {
    console.log("Aucun user trouvé");
  }

  // Lier userId si pas encore fait
  if (c && u && !c.userId) {
    await db.update(courtiers).set({ userId: u.id }).where(eq(courtiers.id, c.id));
    console.log("\n✓ userId lié:", u.id);
  } else if (c.userId) {
    console.log("\n✓ userId déjà lié:", c.userId);
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

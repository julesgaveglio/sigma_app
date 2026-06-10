import { schedule } from "node-cron";
import { getDb } from "../db";
import { courtiers, ambassadeurs } from "../../drizzle/schema";
import { isNull, eq } from "drizzle-orm";
import mysql from "mysql2/promise";

/**
 * Job hebdomadaire (lundi à 7h00) :
 * - Détecte les courtiers et ambassadeurs (agents immo) sans userId
 * - Les lie automatiquement par email si un compte user correspondant existe
 * - Logge les cas non résolus pour intervention manuelle
 */
async function linkMissingUserIds(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[UserIdLink] DB non disponible");
    return;
  }

  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL!);
    let liésTotal = 0;
    const nonRésolus: string[] = [];

    // ── 1. Courtiers sans userId ──────────────────────────────────────────────
    const courtiersNonLies = await db
      .select({ id: courtiers.id, nom: courtiers.nom, prenom: courtiers.prenom, email: courtiers.email })
      .from(courtiers)
      .where(isNull(courtiers.userId));

    if (courtiersNonLies.length > 0) {
      console.log(`[UserIdLink] ${courtiersNonLies.length} courtier(s) sans userId détecté(s).`);
      for (const c of courtiersNonLies) {
        if (!c.email) { nonRésolus.push(`[Courtier] ${c.prenom ?? ""} ${c.nom ?? ""} (pas d'email)`); continue; }
        const [rows] = await conn.query('SELECT id FROM users WHERE email = ? AND role = "courtier" LIMIT 1', [c.email]);
        const users = rows as { id: number }[];
        if (users.length > 0) {
          await db.update(courtiers).set({ userId: users[0].id }).where(eq(courtiers.id, c.id));
          console.log(`[UserIdLink] ✓ Courtier lié : ${c.prenom} ${c.nom} → userId ${users[0].id}`);
          liésTotal++;
        } else {
          nonRésolus.push(`[Courtier] ${c.prenom ?? ""} ${c.nom ?? ""} (${c.email}) — aucun compte user trouvé`);
        }
      }
    } else {
      console.log("[UserIdLink] Aucun courtier sans userId.");
    }

    // ── 2. Ambassadeurs (agents immo) sans userId ─────────────────────────────
    const ambassadeursNonLies = await db
      .select({ id: ambassadeurs.id, nom: ambassadeurs.nom, prenom: ambassadeurs.prenom, email: ambassadeurs.email })
      .from(ambassadeurs)
      .where(isNull(ambassadeurs.userId));

    if (ambassadeursNonLies.length > 0) {
      console.log(`[UserIdLink] ${ambassadeursNonLies.length} ambassadeur(s) sans userId détecté(s).`);
      for (const a of ambassadeursNonLies) {
        if (!a.email) { nonRésolus.push(`[Ambassadeur] ${a.prenom ?? ""} ${a.nom ?? ""} (pas d'email)`); continue; }
        const [rows] = await conn.query('SELECT id FROM users WHERE email = ? AND role IN ("user","ambassadeur") LIMIT 1', [a.email]);
        const users = rows as { id: number }[];
        if (users.length > 0) {
          await db.update(ambassadeurs).set({ userId: users[0].id }).where(eq(ambassadeurs.id, a.id));
          console.log(`[UserIdLink] ✓ Ambassadeur lié : ${a.prenom} ${a.nom} → userId ${users[0].id}`);
          liésTotal++;
        } else {
          nonRésolus.push(`[Ambassadeur] ${a.prenom ?? ""} ${a.nom ?? ""} (${a.email}) — aucun compte user trouvé`);
        }
      }
    } else {
      console.log("[UserIdLink] Aucun ambassadeur sans userId.");
    }

    await conn.end();

    if (liésTotal > 0) console.log(`[UserIdLink] ${liésTotal} compte(s) lié(s) avec succès.`);
    if (nonRésolus.length > 0) {
      console.warn(`[UserIdLink] ${nonRésolus.length} cas non résolus (intervention manuelle requise) :`);
      nonRésolus.forEach((c) => console.warn(`  - ${c}`));
    }
  } catch (err) {
    console.error("[UserIdLink] Erreur lors du job de liaison userId :", err);
  }
}

export function scheduleUserIdLinkJob(): void {
  // Chaque lundi à 7h00 (heure serveur)
  schedule("0 7 * * 1", async () => {
    console.log("[UserIdLink] Démarrage du job hebdomadaire de liaison userId...");
    await linkMissingUserIds();
  });
  console.log("[UserIdLink] Job liaison userId configuré (lundi à 7h)");
}

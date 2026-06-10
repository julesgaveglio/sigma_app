import cron from "node-cron";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { and, isNotNull, lt } from "drizzle-orm";

async function runCleanExpiredTokensJob() {
  const db = await getDb();
  if (!db) { console.error("[CleanExpiredTokens] DB non disponible."); return; }
  try {
    const now = new Date();
    const result = await db
      .update(users)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(
        and(
          isNotNull(users.resetToken),
          lt(users.resetTokenExpiry, now)
        )
      );
    const affected = (result as any)[0]?.affectedRows ?? 0;
    if (affected > 0) {
      console.log(`[CleanExpiredTokens] ${affected} token(s) expirés nettoyés.`);
    }
  } catch (err) {
    console.error("[CleanExpiredTokens] Erreur lors du nettoyage :", err);
  }
}

export function scheduleCleanExpiredTokensJob() {
  // Tous les jours à 3h du matin
  cron.schedule("0 3 * * *", async () => {
    console.log("[CleanExpiredTokens] Démarrage du nettoyage des tokens expirés...");
    await runCleanExpiredTokensJob();
  });
  console.log("[CleanExpiredTokens] Job planifié (tous les jours à 3h).");
}

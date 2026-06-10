import { schedule } from "node-cron";
import { runPAPScraperJob } from "../services/papScraperService";

/**
 * Configure le job quotidien pour scraper PAP
 * S'exécute tous les jours à 2h du matin
 */
export function schedulePAPScraperJob(): void {
  try {
    // Cron expression : 0 2 * * * (tous les jours à 2h du matin)
    schedule("0 2 * * *", async () => {
      console.log("[Cron] Exécution du scraper PAP quotidien...");
      try {
        await runPAPScraperJob();
      } catch (error) {
        console.error("[Cron] Erreur scraper PAP:", error);
      }
    });

    console.log("[Cron] Job PAP scraper configuré (quotidien à 2h)");
  } catch (error) {
    console.error("[Cron] Erreur configuration job PAP:", error);
  }
}

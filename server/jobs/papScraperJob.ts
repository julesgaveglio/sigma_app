import { runPAPScraperJob } from "../services/papScraperService";

/**
 * Job quotidien pour scraper PAP
 * À exécuter via cron ou un scheduler
 */
export async function executePAPScraperJob(): Promise<void> {
  console.log("[Job] Exécution du scraper PAP...");
  await runPAPScraperJob();
  console.log("[Job] Scraper PAP terminé");
}

// Export pour utilisation dans les procédures tRPC
export { runPAPScraperJob };

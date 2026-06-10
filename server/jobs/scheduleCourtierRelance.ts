import { schedule } from "node-cron";
import { getDb } from "../db";
import { courtierSoumissions } from "../../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { Resend } from "resend";

const MANON_EMAIL = "manondubost@sigmaipf.fr";
const SEUIL_JOURS = 7;

async function runCourtierRelanceJob(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Cron Courtier] DB non disponible");
    return;
  }

  const seuilTimestamp = Date.now() - SEUIL_JOURS * 24 * 60 * 60 * 1000;

  // Récupérer toutes les soumissions en attente depuis plus de 7 jours
  const soumissionsEnRetard = await db
    .select()
    .from(courtierSoumissions)
    .where(
      and(
        eq(courtierSoumissions.reponse, "en_attente"),
        lt(courtierSoumissions.dateEnvoi, seuilTimestamp)
      )
    );

  if (soumissionsEnRetard.length === 0) {
    console.log("[Cron Courtier] Aucun courtier en retard de réponse.");
    return;
  }

  console.log(`[Cron Courtier] ${soumissionsEnRetard.length} courtier(s) sans réponse depuis +${SEUIL_JOURS}j`);

  // Construire le tableau HTML des courtiers en retard
  const lignes = soumissionsEnRetard.map((s) => {
    const joursDepuis = Math.floor((Date.now() - s.dateEnvoi) / 86400000);
    return `
      <tr style="border-bottom: 1px solid #3f3f46;">
        <td style="padding: 10px 12px; color: #f4f4f5; font-weight: 600;">${s.courtierNom}</td>
        <td style="padding: 10px 12px; color: #a1a1aa;">${s.courtierCabinet ?? "—"}</td>
        <td style="padding: 10px 12px; color: #a1a1aa;">${s.courtierEmail ?? "—"}</td>
        <td style="padding: 10px 12px; color: ${joursDepuis > 14 ? "#f87171" : "#fbbf24"}; font-weight: 700;">${joursDepuis} jours</td>
        <td style="padding: 10px 12px; color: #a1a1aa;">${s.note ?? "—"}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="background: #09090b; font-family: 'Segoe UI', sans-serif; padding: 32px; margin: 0;">
      <div style="max-width: 680px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1c1917 0%, #292524 100%); border: 1px solid #d97706; border-radius: 12px; padding: 28px 32px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 28px; font-weight: 800; color: #d97706; letter-spacing: -0.5px; margin-bottom: 4px;">SIGMA FACTORY</div>
          <div style="color: #78716c; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">Alerte Courtage</div>
        </div>

        <!-- Alerte -->
        <div style="background: #1c1917; border: 1px solid #f59e0b; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
          <div style="font-size: 18px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">
            ⏰ ${soumissionsEnRetard.length} courtier${soumissionsEnRetard.length > 1 ? "s" : ""} sans réponse depuis +${SEUIL_JOURS} jours
          </div>
          <p style="color: #a8a29e; font-size: 14px; margin: 0;">
            Les dossiers suivants sont en attente de réponse. Pensez à relancer les courtiers concernés.
          </p>
        </div>

        <!-- Tableau -->
        <div style="background: #18181b; border: 1px solid #3f3f46; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #27272a;">
                <th style="padding: 10px 12px; text-align: left; color: #d97706; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Courtier</th>
                <th style="padding: 10px 12px; text-align: left; color: #d97706; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Cabinet</th>
                <th style="padding: 10px 12px; text-align: left; color: #d97706; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Email</th>
                <th style="padding: 10px 12px; text-align: left; color: #d97706; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Délai</th>
                <th style="padding: 10px 12px; text-align: left; color: #d97706; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Note</th>
              </tr>
            </thead>
            <tbody>${lignes}</tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #52525b; font-size: 12px; padding-top: 16px; border-top: 1px solid #27272a;">
          <p style="margin: 0;">Sigma Factory · <a href="https://sigmafactory.org" style="color: #d97706; text-decoration: none;">sigmafactory.org</a> · contact@sigmafactory.fr</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Envoyer l'email à Manon
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Sigma Factory <contact@sigmafactory.fr>",
      to: [MANON_EMAIL],
      subject: `⏰ ${soumissionsEnRetard.length} courtier${soumissionsEnRetard.length > 1 ? "s" : ""} sans réponse depuis +${SEUIL_JOURS}j — Relance nécessaire`,
      html,
    });
    console.log(`[Cron Courtier] Email de relance envoyé à Manon (${soumissionsEnRetard.length} courtiers)`);
  } catch (err) {
    console.error("[Cron Courtier] Erreur envoi email:", err);
  }
}

/**
 * Configure le job quotidien de relance courtier
 * S'exécute tous les jours à 8h du matin
 */
export function scheduleCourtierRelanceJob(): void {
  try {
    schedule("0 8 * * *", async () => {
      console.log("[Cron Courtier] Vérification des courtiers sans réponse...");
      try {
        await runCourtierRelanceJob();
      } catch (error) {
        console.error("[Cron Courtier] Erreur:", error);
      }
    });
    console.log("[Cron Courtier] Job relance courtier configuré (quotidien à 8h)");
  } catch (error) {
    console.error("[Cron Courtier] Erreur configuration job:", error);
  }
}

/**
 * Script de correction des RDV décalés de +2h dans calendar_tasks.
 *
 * Contexte : avant le fix du 17/04/2026, la fonction fromParisInputToUtc
 * dans CalendarPage.tsx appliquait un double-offset UTC+2, stockant les
 * heures avec +2h de trop. Ce script soustrait 2h à tous les dateDebut
 * et dateFin des tâches créées AVANT le fix (timestamp du deploy du fix).
 *
 * Le fix a été déployé le 17/04/2026 — on corrige toutes les tâches
 * créées via l'agenda (source = calendar_tasks, pas les RDV créés depuis
 * CrmPipeline qui utilisaient new Date() correctement).
 *
 * IMPORTANT : Ce script est idempotent si on le relance, car on filtre
 * sur createdAt < fix_date. Ne pas relancer après la date du fix.
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const FIX_DATE = "2026-04-17 11:54:00"; // timestamp UTC du déploiement du fix (HMR 11:54)

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. Lister les tâches concernées
  const [rows] = await conn.execute(
    `SELECT id, titre, dateDebut, dateFin, createdAt FROM calendar_tasks
     WHERE createdAt < ? AND touteJournee = 0
     ORDER BY dateDebut ASC`,
    [FIX_DATE]
  );

  console.log(`\n=== ${rows.length} tâche(s) à corriger ===\n`);

  if (rows.length === 0) {
    console.log("Aucune tâche à corriger.");
    await conn.end();
    return;
  }

  // 2. Afficher avant/après pour validation
  for (const row of rows) {
    const before = new Date(row.dateDebut);
    const after = new Date(before.getTime() - 2 * 60 * 60 * 1000);
    console.log(
      `ID ${row.id} | "${row.titre.slice(0, 35)}" | ${before.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} → ${after.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`
    );
  }

  // 3. Appliquer la correction
  const [result] = await conn.execute(
    `UPDATE calendar_tasks
     SET
       dateDebut = DATE_SUB(dateDebut, INTERVAL 2 HOUR),
       dateFin   = CASE WHEN dateFin IS NOT NULL THEN DATE_SUB(dateFin, INTERVAL 2 HOUR) ELSE NULL END
     WHERE createdAt < ? AND touteJournee = 0`,
    [FIX_DATE]
  );

  console.log(`\n✅ ${result.affectedRows} tâche(s) corrigée(s) (-2h appliqué).`);

  await conn.end();
}

main().catch((e) => {
  console.error("Erreur :", e.message);
  process.exit(1);
});

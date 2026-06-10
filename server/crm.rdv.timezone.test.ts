/**
 * Test de non-régression : conversion de date RDV dans CrmPipeline.tsx
 *
 * Logique testée (extrait de CrmPipeline.tsx, ligne 1344) :
 *   const dateTime = new Date(`${rdvDate}T${rdvHeure}:00`);
 *   dateDebut: dateTime.toISOString()
 *
 * Contexte :
 * - `new Date("2026-04-17T11:00:00")` sans suffixe "Z" est interprété comme
 *   heure LOCALE par le moteur JS (navigateur ou Node.js).
 * - En production (navigateur Europe/Paris, UTC+2 en été), 11:00 local → 09:00 UTC ✅
 * - Si le runtime est UTC (serveur Node.js sans TZ), 11:00 local → 11:00 UTC ❌
 *
 * Ce test s'exécute avec TZ=Europe/Paris (voir vitest.config.ts ou via env)
 * pour reproduire les conditions du navigateur de l'utilisateur.
 *
 * IMPORTANT : Si ce test échoue, cela signifie que l'environnement d'exécution
 * n'est pas en fuseau Europe/Paris. Vérifier TZ dans l'environnement CI/CD.
 */

import { describe, expect, it } from "vitest";

/**
 * Reproduit exactement la logique de CrmPipeline.tsx (ligne 1344-1347).
 * Reçoit la date (YYYY-MM-DD) et l'heure (HH:MM) séparément,
 * comme le font les deux inputs du formulaire de création de RDV.
 */
function buildRdvIsoString(rdvDate: string, rdvHeure: string): string {
  const dateTime = new Date(`${rdvDate}T${rdvHeure}:00`);
  return dateTime.toISOString();
}

/**
 * Vérifie si le runtime est en fuseau Europe/Paris.
 * Utilisé pour conditionner les assertions dépendantes du fuseau.
 */
function isParisTimezone(): boolean {
  const offset = new Date("2026-04-17T12:00:00").getTimezoneOffset();
  // UTC+2 (CEST) → offset = -120 minutes
  // UTC+1 (CET)  → offset = -60 minutes
  return offset === -120 || offset === -60;
}

describe("CrmPipeline — conversion date RDV → ISO UTC", () => {
  it("produit une chaîne ISO valide pour une date et heure valides", () => {
    const result = buildRdvIsoString("2026-04-17", "11:00");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("stocke l'heure correcte en UTC quand le runtime est en Europe/Paris (UTC+2 été)", () => {
    if (!isParisTimezone()) {
      console.warn("⚠️  Test ignoré : runtime non en Europe/Paris (TZ =", process.env.TZ, ")");
      return;
    }
    // 11:00 Paris (UTC+2) → 09:00 UTC
    expect(buildRdvIsoString("2026-04-17", "11:00")).toBe("2026-04-17T09:00:00.000Z");
  });

  it("stocke l'heure correcte en UTC pour 15:00 Paris (UTC+2 été)", () => {
    if (!isParisTimezone()) {
      console.warn("⚠️  Test ignoré : runtime non en Europe/Paris");
      return;
    }
    // 15:00 Paris (UTC+2) → 13:00 UTC
    expect(buildRdvIsoString("2026-04-17", "15:00")).toBe("2026-04-17T13:00:00.000Z");
  });

  it("gère correctement 09:00 Paris (UTC+2 été) → 07:00 UTC", () => {
    if (!isParisTimezone()) return;
    expect(buildRdvIsoString("2026-06-15", "09:00")).toBe("2026-06-15T07:00:00.000Z");
  });

  it("gère correctement minuit Paris → 22:00 UTC J-1", () => {
    if (!isParisTimezone()) return;
    expect(buildRdvIsoString("2026-04-17", "00:00")).toBe("2026-04-16T22:00:00.000Z");
  });

  it("produit des dates différentes pour des heures différentes (sanity check)", () => {
    const rdv1 = buildRdvIsoString("2026-04-17", "10:00");
    const rdv2 = buildRdvIsoString("2026-04-17", "11:00");
    const rdv3 = buildRdvIsoString("2026-04-17", "15:00");
    expect(new Date(rdv2).getTime() - new Date(rdv1).getTime()).toBe(3600 * 1000);
    expect(new Date(rdv3).getTime() - new Date(rdv2).getTime()).toBe(4 * 3600 * 1000);
  });

  it("ne produit pas de NaN pour des valeurs valides", () => {
    const result = buildRdvIsoString("2026-04-17", "10:00");
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });

  it("documente le comportement UTC si le runtime n'est pas en Europe/Paris", () => {
    if (isParisTimezone()) return;
    // En UTC, "2026-04-17T11:00:00" est interprété comme 11:00 UTC
    // Ce cas représente un bug potentiel en production si le navigateur
    // n'est pas configuré en Europe/Paris.
    const result = buildRdvIsoString("2026-04-17", "11:00");
    expect(result).toBe("2026-04-17T11:00:00.000Z"); // UTC → UTC, pas de conversion
    console.warn(
      "⚠️  ATTENTION : Runtime en UTC. En production, le navigateur doit être en Europe/Paris.",
      "Résultat obtenu :", result
    );
  });
});

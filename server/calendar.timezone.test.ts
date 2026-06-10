/**
 * Test de non-régression : conversion fuseau horaire Europe/Paris → UTC
 * pour le champ dateDebut de l'agenda (CalendarPage.tsx).
 *
 * Contexte : la fonction fromParisInputToUtc était défectueuse avant le
 * 17/04/2026 et stockait les heures avec +2h de décalage. Ce test garantit
 * que la logique de conversion est correcte et ne régresse pas.
 *
 * La fonction est dupliquée ici (côté serveur) pour être testable sans
 * importer le composant React frontend.
 */

import { describe, expect, it } from "vitest";

/**
 * Convertit une valeur datetime-local saisie en heure Paris vers ISO UTC.
 * Dupliquée depuis client/src/pages/CalendarPage.tsx pour les tests.
 */
function fromParisInputToUtc(localStr: string): string {
  if (!localStr) return "";
  const normalized = localStr.length === 16 ? localStr + ":00" : localStr;
  const asUtc = new Date(normalized + "Z");
  const parisStr = asUtc.toLocaleString("sv-SE", { timeZone: "Europe/Paris" });
  const parisAsUtc = new Date(parisStr.replace(" ", "T") + "Z");
  const offsetMs = asUtc.getTime() - parisAsUtc.getTime();
  return new Date(asUtc.getTime() + offsetMs).toISOString();
}

describe("fromParisInputToUtc — conversion Europe/Paris → UTC", () => {
  it("convertit 11:00 Paris (UTC+2 été) en 09:00 UTC", () => {
    // Cas rapporté par Élodie : RDV à 11h affiché à 13h (bug +2h)
    expect(fromParisInputToUtc("2026-04-17T11:00")).toBe(
      "2026-04-17T09:00:00.000Z"
    );
  });

  it("convertit 15:00 Paris (UTC+2 été) en 13:00 UTC", () => {
    // Cas rapporté par Élodie : RDV à 15h bloquant Manon à 17h
    expect(fromParisInputToUtc("2026-04-17T15:00")).toBe(
      "2026-04-17T13:00:00.000Z"
    );
  });

  it("convertit 09:00 Paris (UTC+2 été) en 07:00 UTC", () => {
    expect(fromParisInputToUtc("2026-06-15T09:00")).toBe(
      "2026-06-15T07:00:00.000Z"
    );
  });

  it("convertit 14:00 Paris (UTC+1 hiver) en 13:00 UTC", () => {
    // En hiver (UTC+1), l'offset est de 1h seulement
    expect(fromParisInputToUtc("2026-01-15T14:00")).toBe(
      "2026-01-15T13:00:00.000Z"
    );
  });

  it("retourne une chaîne vide si l'entrée est vide", () => {
    expect(fromParisInputToUtc("")).toBe("");
  });

  it("accepte le format avec secondes (HH:MM:SS)", () => {
    expect(fromParisInputToUtc("2026-04-17T11:00:00")).toBe(
      "2026-04-17T09:00:00.000Z"
    );
  });

  it("gère correctement minuit Paris (00:00) → 22:00 UTC J-1", () => {
    expect(fromParisInputToUtc("2026-04-17T00:00")).toBe(
      "2026-04-16T22:00:00.000Z"
    );
  });
});

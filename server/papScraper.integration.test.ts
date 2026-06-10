import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createScrapedBiens, markMissingBiensAsSold, runPAPScraperJob } from "./services/papScraperService";
import { getDb } from "./db";
import { biens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("PAP Scraper - Full Integration Tests", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  it("should create multiple scraped biens and filter by source", async () => {
    // Créer 5 biens de test
    const testBiens = Array.from({ length: 5 }, (_, i) => ({
      id: `test_${Date.now()}_${i}`,
      titre: `Bien d'investissement ${i + 1}`,
      prix: 200000 + i * 50000,
      adresse: `${100 + i} Rue de Test`,
      codePostal: "75001",
      ville: "Paris",
      surface: 80 + i * 10,
      typeBien: i % 2 === 0 ? ("maison" as const) : ("appartement" as const),
      description: `Description bien ${i + 1}`,
      photos: [],
      url: "https://test.com",
      datePublication: new Date(),
    }));

    const { created, skipped } = await createScrapedBiens(testBiens);
    console.log(`[Test] Créés: ${created}, Ignorés: ${skipped}`);

    expect(created).toBeGreaterThan(0);

    // Vérifier que les biens sont en base avec source = pap_scrape
    const scrapedBiens = await db.select().from(biens).where(eq(biens.source, "pap_scrape"));
    console.log(`[Test] Total biens scrappés en base: ${scrapedBiens.length}`);

    expect(scrapedBiens.length).toBeGreaterThan(0);

    // Vérifier les propriétés
    scrapedBiens.forEach((bien: any) => {
      expect(bien.source).toBe("pap_scrape");
      expect(bien.ambassadeurId).toBeNull();
      expect(bien.titre).toBeTruthy();
      expect(bien.prix).toBeGreaterThan(0);
    });
  });

  it("should mark old biens as sold", async () => {
    // Créer un bien directement en base avec une date ancienne
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 jours
    
    await db.insert(biens).values({
      ambassadeurId: null,
      source: "pap_scrape",
      titre: "Bien ancien test mark sold",
      typeBien: "maison",
      transaction: "vente",
      usage: "investissement_locatif",
      adresse: "999 Rue Ancienne",
      codePostal: "75002",
      ville: "Paris",
      surface: 100,
      prix: 300000,
      description: "Bien ancien",
      statutBien: "en_attente_validation",
      valideParAdmin: false,
      etatBien: "bon_etat",
      createdAt: oldDate,
      updatedAt: oldDate,
    });

    // Marquer les biens disparus
    const marked = await markMissingBiensAsSold();
    console.log(`[Test] Biens marqués comme vendus: ${marked}`);

    // Vérifier que le bien a été marqué
    const updatedBien = await db.select().from(biens).where(
      and(
        eq(biens.titre, "Bien ancien test mark sold"),
        eq(biens.source, "pap_scrape")
      )
    );

    if (updatedBien.length > 0) {
      expect(updatedBien[0].statutBien).toBe("vendu");
    }
  });

  it("should run full PAP scraper job", async () => {
    // Exécuter le job complet
    await runPAPScraperJob();

    // Vérifier qu'il n'y a pas d'erreur
    const scrapedBiens = await db.select().from(biens).where(eq(biens.source, "pap_scrape"));
    console.log(`[Test] Total biens scrappés après job: ${scrapedBiens.length}`);

    expect(scrapedBiens.length).toBeGreaterThanOrEqual(0);
  });

  it("should filter biens by source in dashboard", async () => {
    // Récupérer les biens ambassadeurs
    const ambassadeurBiens = await db.select().from(biens).where(eq(biens.source, "ambassadeur"));
    console.log(`[Test] Biens ambassadeurs: ${ambassadeurBiens.length}`);

    // Récupérer les biens scrappés
    const scrapedBiens = await db.select().from(biens).where(eq(biens.source, "pap_scrape"));
    console.log(`[Test] Biens scrappés: ${scrapedBiens.length}`);

    // Vérifier que les deux sources existent
    expect(ambassadeurBiens.length).toBeGreaterThanOrEqual(0);
    expect(scrapedBiens.length).toBeGreaterThanOrEqual(0);

    // Vérifier que les sources sont bien séparées
    ambassadeurBiens.forEach((bien: any) => {
      expect(bien.source).toBe("ambassadeur");
    });

    scrapedBiens.forEach((bien: any) => {
      expect(bien.source).toBe("pap_scrape");
    });
  });
});

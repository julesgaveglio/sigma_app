import { describe, it, expect, beforeAll } from "vitest";
import { createScrapedBiens } from "./services/papScraperService";
import { getDb } from "./db";
import { biens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("PAP Scraper - Integration Tests", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  it("should create scraped biens in database", async () => {
    // Créer quelques biens de test
    const testBiens = [
      {
        id: `test_${Date.now()}_1`,
        titre: "Maison d'investissement à Paris",
        prix: 250000,
        adresse: "123 Rue de Test",
        codePostal: "75001",
        ville: "Paris",
        surface: 100,
        typeBien: "maison" as const,
        description: "Belle maison d'investissement locatif",
        photos: [],
        url: "https://test.com",
        datePublication: new Date(),
      },
      {
        id: `test_${Date.now()}_2`,
        titre: "Appartement à Lyon",
        prix: 150000,
        adresse: "456 Avenue de Test",
        codePostal: "69000",
        ville: "Lyon",
        surface: 60,
        typeBien: "appartement" as const,
        description: "Petit appartement",
        photos: [],
        url: "https://test.com",
        datePublication: new Date(),
      },
    ];

    const { created, skipped } = await createScrapedBiens(testBiens);

    expect(created).toBeGreaterThan(0);
    expect(created + skipped).toBe(testBiens.length);
  });

  it("should have biens with source pap_scrape in database", async () => {
    // Récupérer les biens scrappés
    const scrapedBiens = await db.select().from(biens).where(eq(biens.source, "pap_scrape"));

    // Vérifier que les biens existent
    expect(scrapedBiens.length).toBeGreaterThan(0);

    // Vérifier que tous les biens ont source = pap_scrape
    scrapedBiens.forEach((bien: any) => {
      expect(bien.source).toBe("pap_scrape");
      expect(bien.ambassadeurId).toBeNull();
      // Le statut peut être en_attente_validation, publie, vendu ou archive
      expect(["en_attente_validation", "publie", "vendu", "archive"]).toContain(bien.statutBien);
    });
  });
});

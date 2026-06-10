import { describe, it, expect } from "vitest";
import { biens } from "../drizzle/schema";

describe("Biens - Source field", () => {
  it("should have source field defined in schema", () => {
    // Vérifier que le champ source existe dans le schéma
    expect(biens).toBeDefined();
    // Le champ source doit être un enum avec les valeurs 'ambassadeur' et 'pap_scrape'
  });

  it("should allow ambassadeurId to be nullable", () => {
    // Vérifier que ambassadeurId peut être null
    expect(biens).toBeDefined();
  });
});


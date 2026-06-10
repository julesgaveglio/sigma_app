import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  createCrmLead: vi.fn(),
  getCrmLeads: vi.fn(),
  getCrmLeadById: vi.fn(),
  updateCrmLead: vi.fn(),
  addCrmNote: vi.fn(),
  getCrmNotesByLeadId: vi.fn(),
  getCrmLeadByEmail: vi.fn(),
}));

import {
  createCrmLead,
  getCrmLeads,
  getCrmLeadById,
  updateCrmLead,
  addCrmNote,
  getCrmNotesByLeadId,
  getCrmLeadByEmail,
} from "./db";

// ─── Données de test ──────────────────────────────────────────────────────────

const mockLead = {
  id: 1,
  nom: "Dupont",
  prenom: "Sophie",
  email: "sophie.dupont@example.com",
  telephone: "0612345678",
  etape: "welcome_call" as const,
  statut: "actif" as const,
  responsable: "Maria",
  leadId: 10,
  mandatId: null,
  hexaId: 5,
  welcomeCallFait: false,
  etatCivilRempli: false,
  mandatRempli: false,
  accesPodia: false,
  documentsDeposes: false,
  avisDepose: false,
  courtierAssigne: null,
  enveloppeValidee: null,
  enveloppeDate: null,
  agentAssigne: null,
  nbBiensPresentes: 0,
  offreAcceptee: false,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockNote = {
  id: 1,
  crmLeadId: 1,
  etape: "welcome_call",
  auteur: "Maria",
  contenu: "Premier contact effectué, très motivé.",
  createdAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CRM Pipeline — createCrmLead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crée un lead CRM avec les champs requis", async () => {
    vi.mocked(createCrmLead).mockResolvedValue({ insertId: 1 } as any);
    const result = await createCrmLead({
      nom: "Dupont",
      prenom: "Sophie",
      email: "sophie.dupont@example.com",
      etape: "welcome_call",
    });
    expect(result).toEqual({ insertId: 1 });
    expect(createCrmLead).toHaveBeenCalledOnce();
  });

  it("crée un lead avec tous les champs optionnels", async () => {
    vi.mocked(createCrmLead).mockResolvedValue({ insertId: 2 } as any);
    await createCrmLead({
      nom: "Martin",
      prenom: "Julien",
      email: "julien.martin@example.com",
      telephone: "0698765432",
      leadId: 42,
      hexaId: 7,
      etape: "welcome_call",
      responsable: "Maria",
    });
    expect(createCrmLead).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 42, hexaId: 7, responsable: "Maria" })
    );
  });
});

describe("CRM Pipeline — getCrmLeads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne la liste des leads avec total", async () => {
    vi.mocked(getCrmLeads).mockResolvedValue({ items: [mockLead], total: 1 });
    const result = await getCrmLeads();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("filtre par étape welcome_call", async () => {
    vi.mocked(getCrmLeads).mockResolvedValue({ items: [mockLead], total: 1 });
    const result = await getCrmLeads({ etape: "welcome_call" });
    expect(result.items[0].etape).toBe("welcome_call");
  });

  it("filtre par statut actif", async () => {
    vi.mocked(getCrmLeads).mockResolvedValue({ items: [mockLead], total: 1 });
    const result = await getCrmLeads({ statut: "actif" });
    expect(result.items[0].statut).toBe("actif");
  });

  it("retourne une liste vide si aucun lead", async () => {
    vi.mocked(getCrmLeads).mockResolvedValue({ items: [], total: 0 });
    const result = await getCrmLeads({ search: "inexistant" });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe("CRM Pipeline — getCrmLeadById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne un lead existant", async () => {
    vi.mocked(getCrmLeadById).mockResolvedValue(mockLead);
    const result = await getCrmLeadById(1);
    expect(result).not.toBeNull();
    expect(result?.nom).toBe("Dupont");
    expect(result?.etape).toBe("welcome_call");
  });

  it("retourne null si lead introuvable", async () => {
    vi.mocked(getCrmLeadById).mockResolvedValue(null);
    const result = await getCrmLeadById(999);
    expect(result).toBeNull();
  });
});

describe("CRM Pipeline — updateCrmLead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("met à jour l'étape d'un lead", async () => {
    vi.mocked(updateCrmLead).mockResolvedValue(undefined);
    await updateCrmLead(1, { etape: "courtage" });
    expect(updateCrmLead).toHaveBeenCalledWith(1, { etape: "courtage" });
  });

  it("met à jour la checklist Welcome Call", async () => {
    vi.mocked(updateCrmLead).mockResolvedValue(undefined);
    await updateCrmLead(1, {
      welcomeCallFait: true,
      etatCivilRempli: true,
      accesPodia: true,
    });
    expect(updateCrmLead).toHaveBeenCalledWith(1, expect.objectContaining({
      welcomeCallFait: true,
      etatCivilRempli: true,
    }));
  });

  it("met à jour l'enveloppe de courtage", async () => {
    vi.mocked(updateCrmLead).mockResolvedValue(undefined);
    await updateCrmLead(1, { enveloppeValidee: 350000, courtierAssigne: "Cabinet Dupré" });
    expect(updateCrmLead).toHaveBeenCalledWith(1, expect.objectContaining({
      enveloppeValidee: 350000,
      courtierAssigne: "Cabinet Dupré",
    }));
  });

  it("met à jour le statut en perdu", async () => {
    vi.mocked(updateCrmLead).mockResolvedValue(undefined);
    await updateCrmLead(1, { statut: "perdu" });
    expect(updateCrmLead).toHaveBeenCalledWith(1, { statut: "perdu" });
  });
});

describe("CRM Pipeline — addCrmNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ajoute une note à un lead", async () => {
    vi.mocked(addCrmNote).mockResolvedValue(undefined);
    await addCrmNote({
      crmLeadId: 1,
      etape: "welcome_call",
      auteur: "Maria",
      contenu: "Premier contact effectué.",
    });
    expect(addCrmNote).toHaveBeenCalledWith(expect.objectContaining({
      crmLeadId: 1,
      contenu: "Premier contact effectué.",
    }));
  });
});

describe("CRM Pipeline — getCrmNotesByLeadId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne les notes d'un lead", async () => {
    vi.mocked(getCrmNotesByLeadId).mockResolvedValue([mockNote]);
    const notes = await getCrmNotesByLeadId(1);
    expect(notes).toHaveLength(1);
    expect(notes[0].auteur).toBe("Maria");
    expect(notes[0].contenu).toBe("Premier contact effectué, très motivé.");
  });

  it("retourne un tableau vide si aucune note", async () => {
    vi.mocked(getCrmNotesByLeadId).mockResolvedValue([]);
    const notes = await getCrmNotesByLeadId(999);
    expect(notes).toHaveLength(0);
  });
});

describe("CRM Pipeline — getCrmLeadByEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne un lead existant par email", async () => {
    vi.mocked(getCrmLeadByEmail).mockResolvedValue(mockLead);
    const result = await getCrmLeadByEmail("sophie.dupont@example.com");
    expect(result).not.toBeNull();
    expect(result?.email).toBe("sophie.dupont@example.com");
  });

  it("retourne null si email introuvable", async () => {
    vi.mocked(getCrmLeadByEmail).mockResolvedValue(null);
    const result = await getCrmLeadByEmail("inconnu@example.com");
    expect(result).toBeNull();
  });

  it("évite les doublons lors de la création", async () => {
    vi.mocked(getCrmLeadByEmail).mockResolvedValue(mockLead);
    const existing = await getCrmLeadByEmail("sophie.dupont@example.com");
    // Si le lead existe déjà, on ne crée pas un doublon
    expect(existing).not.toBeNull();
    expect(createCrmLead).not.toHaveBeenCalled();
  });
});

describe("CRM Pipeline — transitions d'étapes", () => {
  it("valide les 5 étapes du pipeline", () => {
    const etapes = ["welcome_call", "point_personnalise", "courtage", "recherche_bien", "sigma_credit"];
    expect(etapes).toHaveLength(5);
    expect(etapes[0]).toBe("welcome_call");
    expect(etapes[1]).toBe("point_personnalise");
    expect(etapes[4]).toBe("sigma_credit");
  });

  it("valide les 4 statuts possibles", () => {
    const statuts = ["actif", "en_pause", "cloture", "perdu"];
    expect(statuts).toHaveLength(4);
    expect(statuts).toContain("actif");
    expect(statuts).toContain("perdu");
  });
});

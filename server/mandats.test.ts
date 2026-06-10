import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createMandat: vi.fn().mockResolvedValue({ insertId: 42 }),
    getMandats: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getMandatById: vi.fn().mockResolvedValue(null),
    getMandatsByLeadId: vi.fn().mockResolvedValue([]),
    updateMandatStatut: vi.fn().mockResolvedValue(undefined),
    getAllMandatsForExport: vi.fn().mockResolvedValue([]),
    // Keep existing mocks
    createLead: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    getLeads: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getLeadById: vi.fn().mockResolvedValue(null),
    updateLeadStatut: vi.fn().mockResolvedValue(undefined),
    getAllLeadsForExport: vi.fn().mockResolvedValue([]),
    getDocumentsByLeadId: vi.fn().mockResolvedValue([]),
    createDocument: vi.fn().mockResolvedValue(undefined),
    createDemande: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    getDemandes: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getDemandeById: vi.fn().mockResolvedValue(null),
    updateDemandeStatut: vi.fn().mockResolvedValue(undefined),
    getAllDemandesForExport: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("./mailer", () => ({
  sendNewLeadNotification: vi.fn().mockResolvedValue(true),
  sendNewMandatNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@sigmaipf.fr",
    name: "Admin Sigma",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const VALID_MANDAT = {
  nom: "DUPONT",
  prenoms: "Jean-Pierre",
  email: "jean.dupont@exemple.fr",
  telephone: "0612345678",
  typeBien: "appartement" as const,
  usage: "residence_principale" as const,
  localisation: "Paris 16e, Neuilly-sur-Seine",
  budgetMax: 450000,
  modeFinancement: "credit" as const,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mandats.submit (public)", () => {
  it("accepte une soumission valide et retourne un mandatId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.mandats.submit(VALID_MANDAT);
    expect(result.success).toBe(true);
    expect(result.mandatId).toBe(42);
  });

  it("rejette si le nom est manquant", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.mandats.submit({ ...VALID_MANDAT, nom: "" })
    ).rejects.toThrow();
  });

  it("rejette si l'email est invalide", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.mandats.submit({ ...VALID_MANDAT, email: "pas-un-email" })
    ).rejects.toThrow();
  });

  it("rejette si le budget est nul ou négatif", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.mandats.submit({ ...VALID_MANDAT, budgetMax: 0 })
    ).rejects.toThrow();
  });

  it("rejette si la localisation est vide", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.mandats.submit({ ...VALID_MANDAT, localisation: "" })
    ).rejects.toThrow();
  });

  it("accepte un mandat avec leadId (lien état civil)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.mandats.submit({ ...VALID_MANDAT, leadId: 7 });
    expect(result.success).toBe(true);
  });

  it("accepte un mandat avec tous les champs optionnels", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.mandats.submit({
      ...VALID_MANDAT,
      surfaceMin: 60,
      surfaceMax: 120,
      nbPiecesMin: 3,
      nbPiecesMax: 5,
      apportPersonnel: 80000,
      accordBancaire: "oui",
      typeMandat: "exclusif",
      dureeMandat: 6,
      balconTerrasse: true,
      parkingGarage: true,
      autresCriteres: "Vue dégagée souhaitée",
    });
    expect(result.success).toBe(true);
  });
});

describe("mandats.list (admin)", () => {
  it("retourne une liste vide pour un admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.mandats.list({});
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("autorise l'accès à tout utilisateur connecté (y compris non-admin)", async () => {
    const ctx = createAdminContext();
    (ctx.user as AuthenticatedUser).role = "user";
    const caller = appRouter.createCaller(ctx);
    // mandats.list est ouvert à toute l'équipe connectée
    const result = await caller.mandats.list({});
    expect(result).toHaveProperty("items");
  });

  it("refuse l'accès à un utilisateur non connecté", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.mandats.list({})).rejects.toThrow();
  });

  it("accepte des filtres de recherche", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.mandats.list({ search: "Dupont", statut: "nouveau", limit: 10, offset: 0 });
    expect(result).toBeDefined();
  });
});

describe("mandats.byId (admin)", () => {
  it("lève NOT_FOUND si le mandat n'existe pas", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.mandats.byId({ id: 9999 })).rejects.toThrow();
  });

  it("refuse l'accès à un non-admin", async () => {
    const ctx = createAdminContext();
    (ctx.user as AuthenticatedUser).role = "user";
    const caller = appRouter.createCaller(ctx);
    await expect(caller.mandats.byId({ id: 1 })).rejects.toThrow();
  });
});

describe("mandats.updateStatut (admin)", () => {
  it("met à jour le statut avec succès", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.mandats.updateStatut({ id: 1, statut: "en_cours", notesInternes: "Suivi en cours", assigneA: "Hanna" });
    expect(result.success).toBe(true);
  });

  it("refuse la mise à jour pour un non-admin", async () => {
    const ctx = createAdminContext();
    (ctx.user as AuthenticatedUser).role = "user";
    const caller = appRouter.createCaller(ctx);
    await expect(caller.mandats.updateStatut({ id: 1, statut: "traite" })).rejects.toThrow();
  });
});

describe("mandats.exportCsv (admin)", () => {
  it("retourne un tableau vide pour l'export", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.mandats.exportCsv();
    expect(Array.isArray(result)).toBe(true);
  });

  it("refuse l'export à un non-admin", async () => {
    const ctx = createAdminContext();
    (ctx.user as AuthenticatedUser).role = "user";
    const caller = appRouter.createCaller(ctx);
    await expect(caller.mandats.exportCsv()).rejects.toThrow();
  });
});

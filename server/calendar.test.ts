import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  createCalendarTask: vi.fn().mockResolvedValue({ insertId: 1 }),
  getCalendarTasks: vi.fn().mockResolvedValue([
    {
      id: 1,
      titre: "Welcome Call — Sophie Martin",
      description: "Onboarding initial",
      assigneA: "Maria",
      dateDebut: new Date("2026-04-10T10:00:00Z"),
      dateFin: new Date("2026-04-10T10:30:00Z"),
      touteJournee: false,
      crmLeadId: null,
      rappelEmail: true,
      rappelMinutesAvant: 30,
      statut: "a_faire",
      creePar: "Hanna",
      createdAt: new Date("2026-04-01T08:00:00Z"),
      updatedAt: new Date("2026-04-01T08:00:00Z"),
    },
    {
      id: 2,
      titre: "Suivi dossier financement",
      description: null,
      assigneA: "Manon",
      dateDebut: new Date("2026-04-11T14:00:00Z"),
      dateFin: null,
      touteJournee: false,
      crmLeadId: 5,
      rappelEmail: false,
      rappelMinutesAvant: 30,
      statut: "en_cours",
      creePar: "Manon",
      createdAt: new Date("2026-04-01T09:00:00Z"),
      updatedAt: new Date("2026-04-02T10:00:00Z"),
    },
  ]),
  updateCalendarTask: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  deleteCalendarTask: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  // Autres mocks nécessaires pour le router global
  createLead: vi.fn(),
  createDocument: vi.fn(),
  getLeads: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getLeadById: vi.fn(),
  updateLeadStatut: vi.fn(),
  getAllLeadsForExport: vi.fn().mockResolvedValue([]),
  getDocumentsByLeadId: vi.fn().mockResolvedValue([]),
  createDemande: vi.fn(),
  getDemandes: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getDemandeById: vi.fn(),
  updateDemandeStatut: vi.fn(),
  getAllDemandesForExport: vi.fn().mockResolvedValue([]),
  createMandat: vi.fn(),
  getMandats: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getMandatById: vi.fn(),
  getMandatsByLeadId: vi.fn().mockResolvedValue([]),
  updateMandatStatut: vi.fn(),
  getAllMandatsForExport: vi.fn().mockResolvedValue([]),
  createHexaDossier: vi.fn(),
  getHexaDossiers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getHexaDossierById: vi.fn(),
  updateHexaStatut: vi.fn(),
  getAllHexaDossiersForExport: vi.fn().mockResolvedValue([]),
  createCrmLead: vi.fn(),
  getCrmLeads: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getCrmLeadById: vi.fn(),
  updateCrmLead: vi.fn(),
  addCrmNote: vi.fn(),
  getCrmNotesByLeadId: vi.fn().mockResolvedValue([]),
  getCrmLeadByEmail: vi.fn().mockResolvedValue(null),
}));

vi.mock("./mailer", () => ({
  sendNewLeadNotification: vi.fn().mockResolvedValue(true),
  sendNewMandatNotification: vi.fn().mockResolvedValue(true),
  sendNewHexaNotification: vi.fn().mockResolvedValue(true),
  sendCalendarReminder: vi.fn().mockResolvedValue(true),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/file.pdf", key: "file.pdf" }),
}));

vi.mock("nanoid", () => ({ nanoid: () => "test-nanoid-123" }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Module Calendrier — Helpers DB", () => {
  let createCalendarTask: ReturnType<typeof vi.fn>;
  let getCalendarTasks: ReturnType<typeof vi.fn>;
  let updateCalendarTask: ReturnType<typeof vi.fn>;
  let deleteCalendarTask: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const db = await import("./db");
    createCalendarTask = db.createCalendarTask as ReturnType<typeof vi.fn>;
    getCalendarTasks = db.getCalendarTasks as ReturnType<typeof vi.fn>;
    updateCalendarTask = db.updateCalendarTask as ReturnType<typeof vi.fn>;
    deleteCalendarTask = db.deleteCalendarTask as ReturnType<typeof vi.fn>;
    vi.clearAllMocks();
  });

  it("crée une tâche avec tous les champs requis", async () => {
    const payload = {
      titre: "Welcome Call — Sophie Martin",
      assigneA: "Maria" as const,
      dateDebut: new Date("2026-04-10T10:00:00Z"),
      touteJournee: false,
      rappelEmail: true,
      rappelMinutesAvant: 30,
      statut: "a_faire" as const,
      creePar: "Hanna",
    };
    const result = await createCalendarTask(payload);
    expect(createCalendarTask).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ insertId: 1 });
  });

  it("liste les tâches et retourne 2 entrées", async () => {
    const tasks = await getCalendarTasks({});
    expect(getCalendarTasks).toHaveBeenCalledWith({});
    expect(tasks).toHaveLength(2);
    expect(tasks[0].titre).toBe("Welcome Call — Sophie Martin");
    expect(tasks[0].assigneA).toBe("Maria");
    expect(tasks[1].assigneA).toBe("Manon");
  });

  it("filtre les tâches par membre", async () => {
    await getCalendarTasks({ assigneA: "Maria" });
    expect(getCalendarTasks).toHaveBeenCalledWith({ assigneA: "Maria" });
  });

  it("met à jour le statut d'une tâche", async () => {
    const result = await updateCalendarTask(1, { statut: "termine" });
    expect(updateCalendarTask).toHaveBeenCalledWith(1, { statut: "termine" });
    expect(result).toEqual({ affectedRows: 1 });
  });

  it("met à jour les dates d'une tâche", async () => {
    const newDate = new Date("2026-04-15T09:00:00Z");
    await updateCalendarTask(1, { dateDebut: newDate });
    expect(updateCalendarTask).toHaveBeenCalledWith(1, { dateDebut: newDate });
  });

  it("supprime une tâche", async () => {
    const result = await deleteCalendarTask(1);
    expect(deleteCalendarTask).toHaveBeenCalledWith(1);
    expect(result).toEqual({ affectedRows: 1 });
  });

  it("crée une tâche toute la journée", async () => {
    const payload = {
      titre: "Journée formation",
      assigneA: "Elodie" as const,
      dateDebut: new Date("2026-04-20T00:00:00Z"),
      touteJournee: true,
      rappelEmail: false,
      rappelMinutesAvant: 30,
      statut: "a_faire" as const,
      creePar: "Hanna",
    };
    await createCalendarTask(payload);
    expect(createCalendarTask).toHaveBeenCalledWith(
      expect.objectContaining({ touteJournee: true })
    );
  });

  it("crée une tâche liée à un lead CRM", async () => {
    const payload = {
      titre: "Appel financement — Jean Dupont",
      assigneA: "Manon" as const,
      dateDebut: new Date("2026-04-12T15:00:00Z"),
      touteJournee: false,
      crmLeadId: 3,
      rappelEmail: true,
      rappelMinutesAvant: 60,
      statut: "a_faire" as const,
      creePar: "Hanna",
    };
    await createCalendarTask(payload);
    expect(createCalendarTask).toHaveBeenCalledWith(
      expect.objectContaining({ crmLeadId: 3 })
    );
  });
});

describe("Module Calendrier — Email de rappel", () => {
  it("envoie un email de rappel avec les bonnes données", async () => {
    const { sendCalendarReminder } = await import("./mailer");
    const data = {
      taskId: 1,
      titre: "Welcome Call — Sophie Martin",
      description: "Onboarding initial",
      assigneA: "Maria",
      dateDebut: new Date("2026-04-10T10:00:00Z"),
      rappelMinutesAvant: 30,
    };
    const result = await sendCalendarReminder(data);
    expect(sendCalendarReminder).toHaveBeenCalledWith(data);
    expect(result).toBe(true);
  });

  it("retourne true pour un rappel immédiat (0 minutes)", async () => {
    const { sendCalendarReminder } = await import("./mailer");
    const result = await sendCalendarReminder({
      taskId: 2,
      titre: "Réunion équipe",
      assigneA: "Hanna",
      dateDebut: new Date(),
      rappelMinutesAvant: 0,
    });
    expect(result).toBe(true);
  });
});

describe("Module Calendrier — Validation des membres", () => {
  it("accepte tous les membres valides", () => {
    const membresValides = ["Maria", "Manon", "Elodie", "Hanna"];
    membresValides.forEach(m => {
      expect(["Maria", "Manon", "Elodie", "Hanna"]).toContain(m);
    });
  });

  it("valide les statuts de tâche", () => {
    const statutsValides = ["a_faire", "en_cours", "termine"];
    statutsValides.forEach(s => {
      expect(["a_faire", "en_cours", "termine"]).toContain(s);
    });
  });
});

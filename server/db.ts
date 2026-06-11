import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { demandes, documents, InsertDemande, InsertDocument, InsertLead, leads, InsertUser, users, mandatsRecherche, InsertMandatRecherche, hexaDossiers, InsertHexaDossier, crmLeads, InsertCrmLead, crmNotes, InsertCrmNote, closes, leadActivities, InsertLeadActivity, offMarketBiens, InsertOffMarketBien, bienPropositions } from "../drizzle/schema";
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      console.error("[Database] DATABASE_URL not set in environment");
      return null;
    }
    try {
      console.log("[Database] Attempting connection...");
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error("[Database] Connection failed:", error instanceof Error ? error.message : String(error));
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(data);
  return result[0];
}

export async function getLeads(opts?: { search?: string; statut?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.statut && opts.statut !== 'tous') {
    conditions.push(eq(leads.statut, opts.statut as any));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    conditions.push(
      or(
        like(leads.nom, s),
        like(leads.prenoms, s),
        like(leads.email, s),
        like(leads.telephonePortable, s)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const [items, countResult] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateLeadStatut(id: number, statut: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { statut };
  if (notes !== undefined) updateData.notes = notes;
  await db.update(leads).set(updateData as any).where(eq(leads.id, id));
}

export async function getAllLeadsForExport() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(documents).values(data);
}

export async function getDocumentsByLeadId(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.leadId, leadId));
}

// ─── DEMANDES CUSTOM CARE ─────────────────────────────────────────────────────────────

export async function createDemande(data: InsertDemande) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(demandes).values(data);
  return result[0];
}

export async function getDemandes(opts?: { search?: string; statut?: string; priorite?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.statut && opts.statut !== 'toutes') {
    conditions.push(eq(demandes.statut, opts.statut as any));
  }
  if (opts?.priorite && opts.priorite !== 'toutes') {
    conditions.push(eq(demandes.priorite, opts.priorite as any));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    conditions.push(
      or(
        like(demandes.nom, s),
        like(demandes.prenom, s),
        like(demandes.email, s),
        like(demandes.telephone, s),
        like(demandes.sujet, s)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 25;
  const offset = opts?.offset ?? 0;

  const [items, countResult] = await Promise.all([
    db.select().from(demandes).where(where).orderBy(desc(demandes.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(demandes).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getDemandeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(demandes).where(eq(demandes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateDemandeStatut(id: number, statut: string, notesInternes?: string, assigneA?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { statut };
  if (notesInternes !== undefined) updateData.notesInternes = notesInternes;
  if (assigneA !== undefined) updateData.assigneA = assigneA;
  await db.update(demandes).set(updateData as any).where(eq(demandes.id, id));
}

export async function getAllDemandesForExport() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(demandes).orderBy(desc(demandes.createdAt));
}

// ─── MANDATS DE RECHERCHE ─────────────────────────────────────────────────────────────────────────

export async function createMandat(data: InsertMandatRecherche) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mandatsRecherche).values(data);
  return result[0];
}

export async function getMandats(opts?: { search?: string; statut?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.statut && opts.statut !== 'tous') {
    conditions.push(eq(mandatsRecherche.statut, opts.statut as any));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    conditions.push(
      or(
        like(mandatsRecherche.nom, s),
        like(mandatsRecherche.prenoms, s),
        like(mandatsRecherche.email, s),
        like(mandatsRecherche.telephone, s),
        like(mandatsRecherche.localisation, s)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 25;
  const offset = opts?.offset ?? 0;

  const [items, countResult] = await Promise.all([
    db.select().from(mandatsRecherche).where(where).orderBy(desc(mandatsRecherche.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(mandatsRecherche).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getMandatById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(mandatsRecherche).where(eq(mandatsRecherche.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getMandatsByLeadId(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mandatsRecherche).where(eq(mandatsRecherche.leadId, leadId)).orderBy(desc(mandatsRecherche.createdAt));
}

export async function updateMandatStatut(id: number, statut: string, notesInternes?: string, assigneA?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { statut };
  if (notesInternes !== undefined) updateData.notesInternes = notesInternes;
  if (assigneA !== undefined) updateData.assigneA = assigneA;
  await db.update(mandatsRecherche).set(updateData as any).where(eq(mandatsRecherche.id, id));
}

export async function getAllMandatsForExport() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mandatsRecherche).orderBy(desc(mandatsRecherche.createdAt));
}

// ─── HEXA DOSSIERS ──────────────────────────────────────────────────────────────────────────────────

export async function createHexaDossier(data: InsertHexaDossier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(hexaDossiers).values(data);
  return result[0];
}

export async function getHexaDossiers(opts?: { search?: string; statut?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.statut && opts.statut !== 'tous') {
    conditions.push(eq(hexaDossiers.statut, opts.statut as any));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    conditions.push(
      or(
        like(hexaDossiers.nom, s),
        like(hexaDossiers.prenom, s),
        like(hexaDossiers.email, s),
        like(hexaDossiers.mobile, s),
        like(hexaDossiers.ville, s)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 25;
  const offset = opts?.offset ?? 0;

  const [items, countResult] = await Promise.all([
    db.select().from(hexaDossiers).where(where).orderBy(desc(hexaDossiers.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(hexaDossiers).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getHexaDossierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(hexaDossiers).where(eq(hexaDossiers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateHexaStatut(
  id: number,
  statut: string,
  notesInternes?: string,
  assigneA?: string,
  lienPaiement?: string,
  paiementInitie?: boolean,
  paiementRecu?: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { statut };
  if (notesInternes !== undefined) updateData.notesInternes = notesInternes;
  if (assigneA !== undefined) updateData.assigneA = assigneA;
  if (lienPaiement !== undefined) updateData.lienPaiement = lienPaiement;
  if (paiementInitie !== undefined) updateData.paiementInitie = paiementInitie;
  if (paiementRecu !== undefined) updateData.paiementRecu = paiementRecu;
  await db.update(hexaDossiers).set(updateData as any).where(eq(hexaDossiers.id, id));

  // — Mise à jour automatique du close Sales quand paiement reçu
  if (paiementRecu === true) {
    try {
      // Récupérer le dossier Hexa pour avoir l'email et le montant
      const dossier = await db.select().from(hexaDossiers).where(eq(hexaDossiers.id, id)).limit(1);
      if (dossier.length > 0) {
        const d = dossier[0];
        const email = d.email;
        const montantCreditImpot = d.montant ?? 0; // montant du dossier Hexa (en centimes)
        if (email) {
          // Chercher le close lié par email du lead
          const closeRows = await db.select().from(closes)
            .where(eq(closes.leadEmail, email))
            .orderBy(desc(closes.createdAt))
            .limit(1);
          if (closeRows.length > 0) {
            const closeRow = closeRows[0];
            const today = new Date().toISOString().slice(0, 10);
            // Calculer le nouveau montant encaissé (existant + crédit d'impôt)
            const nouveauMontantEncaisse = (closeRow.montantEncaisse ?? 0) + montantCreditImpot;
            await db.update(closes).set({
              statutEncaissement: 'recu' as any,
              dateVirementPrevu: today,
              montantEncaisse: nouveauMontantEncaisse,
            } as any).where(eq(closes.id, closeRow.id));
            console.log(`[Sales] Close #${closeRow.id} mis à jour : encaissement reçu le ${today}, montant +${montantCreditImpot} centimes`);
          }
        }
      }
    } catch (e) {
      console.warn('[Sales] Impossible de mettre à jour le close Sales:', e);
    }
  }
}

export async function getAllHexaDossiersForExport() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hexaDossiers).orderBy(desc(hexaDossiers.createdAt));
}

// ─── CRM PIPELINE ────────────────────────────────────────────────────────────────────────────────

export async function createCrmLead(data: InsertCrmLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmLeads).values(data);
  return result[0];
}

export async function getCrmLeads(opts?: { search?: string; etape?: string; statut?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.etape && opts.etape !== 'toutes') {
    conditions.push(eq(crmLeads.etape, opts.etape as any));
  }
  if (opts?.statut && opts.statut !== 'tous') {
    conditions.push(eq(crmLeads.statut, opts.statut as any));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    conditions.push(
      or(
        like(crmLeads.nom, s),
        like(crmLeads.prenom, s),
        like(crmLeads.email, s),
        like(crmLeads.telephone, s)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;

  const [items, countResult] = await Promise.all([
    db.select().from(crmLeads).where(where).orderBy(desc(crmLeads.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(crmLeads).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getCrmLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
  const lead = result[0] ?? null;
  if (!lead) return null;

  // Auto-détecter etatCivilRempli si un lead (fiche d'état civil) est lié
  if ((lead as any).leadId && !(lead as any).etatCivilRempli) {
    const leadRows = await db.select().from(leads).where(eq(leads.id, (lead as any).leadId)).limit(1);
    if (leadRows.length > 0) {
      await db.update(crmLeads).set({ etatCivilRempli: true } as any).where(eq(crmLeads.id, id));
      (lead as any).etatCivilRempli = true;
    }
  }

  // Auto-détecter mandatRempli si un mandat est lié
  if ((lead as any).mandatId && !(lead as any).mandatRempli) {
    const mandatRows = await db.select().from(mandatsRecherche).where(eq(mandatsRecherche.id, (lead as any).mandatId)).limit(1);
    if (mandatRows.length > 0) {
      await db.update(crmLeads).set({ mandatRempli: true } as any).where(eq(crmLeads.id, id));
      (lead as any).mandatRempli = true;
    }
  }

  return lead;
}

export async function updateCrmLead(id: number, data: Partial<InsertCrmLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(crmLeads).set(data as any).where(eq(crmLeads.id, id));
}

export async function addCrmNote(data: InsertCrmNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(crmNotes).values(data);
}

export async function getCrmNotesByLeadId(crmLeadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmNotes).where(eq(crmNotes.crmLeadId, crmLeadId)).orderBy(desc(crmNotes.createdAt));
}

export async function getCrmLeadByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(crmLeads).where(eq(crmLeads.email, email)).limit(1);
  return result[0] ?? null;
}

// ─── CALENDRIER ───────────────────────────────────────────────────────────────

import { calendarTasks, InsertCalendarTask } from "../drizzle/schema";

export async function createCalendarTask(data: InsertCalendarTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calendarTasks).values(data);
  return result[0];
}

export async function getCalendarTasks(filters: {
  assigneA?: string;
  from?: Date;
  to?: Date;
  statut?: string;
  creePar?: string;
} = {}) {
  const db = await getDb();
  if (!db) return [];
  const { and, gte, lte } = await import("drizzle-orm");
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters.assigneA) conditions.push(eq(calendarTasks.assigneA, filters.assigneA as "Maria" | "Manon" | "Elodie" | "Hanna"));
  if (filters.from) conditions.push(gte(calendarTasks.dateDebut, filters.from));
  if (filters.to) conditions.push(lte(calendarTasks.dateDebut, filters.to));
  if (filters.statut) conditions.push(eq(calendarTasks.statut, filters.statut as "a_faire" | "en_cours" | "termine"));
  if (filters.creePar) {
    const { like } = await import("drizzle-orm");
    conditions.push(like(calendarTasks.creePar, `%${filters.creePar}%`) as any);
  }
  const query = db.select().from(calendarTasks);
  const rows = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(calendarTasks.dateDebut)
    : await query.orderBy(calendarTasks.dateDebut);
  return rows;
}

export async function getCalendarTaskById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(calendarTasks).where(eq(calendarTasks.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateCalendarTask(id: number, data: Partial<InsertCalendarTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarTasks).set(data).where(eq(calendarTasks.id, id));
}

export async function deleteCalendarTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarTasks).where(eq(calendarTasks.id, id));
}

export async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];
  const { and, lte, eq: eqOp } = await import("drizzle-orm");
  const now = new Date();
  // Récupère les tâches avec rappel non encore envoyé dont l'heure de rappel est passée
  const rows = await db.select().from(calendarTasks).where(
    and(
      eqOp(calendarTasks.rappelEmail, true),
      eqOp(calendarTasks.rappelEnvoye, false),
      eqOp(calendarTasks.statut, "a_faire")
    )
  );
  // Filtrer côté JS : dateDebut - rappelMinutesAvant <= now
  return rows.filter(t => {
    const reminderTime = new Date(t.dateDebut.getTime() - (t.rappelMinutesAvant ?? 30) * 60 * 1000);
    return reminderTime <= now;
  });
}

// ─── NOTIFICATIONS IN-APP ─────────────────────────────────────────────────────

export async function createNotification(data: {
  destinataire: "Maria" | "Manon" | "Elodie" | "Hanna" | "Marie" | "Owner" | "Courtier" | "Agent";
  destinataireEmail?: string;
  type: "nouveau_lead" | "changement_etape" | "nouvelle_note" | "nouvelle_tache" | "rappel_rdv" | "nouvel_ambassadeur" | "nouveau_courtier" | "assignation" | "statut_change";
  titre: string;
  message?: string;
  contenu?: string;
  lien?: string;
  lienPage?: string;
  crmLeadId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  // Utiliser mysql2 directement pour éviter les problèmes d'import dynamique
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  const message = data.message ?? data.contenu ?? "";
  const lien = data.lienPage ?? data.lien ?? null;
  await conn.execute(
    "INSERT INTO notifications (destinataire, destinataireEmail, type, titre, message, lien) VALUES (?, ?, ?, ?, ?, ?)",
    [data.destinataire, data.destinataireEmail ?? null, data.type, data.titre, message, lien]
  );
  await conn.end();
}

export async function getNotifications(destinataire?: string, destinataireEmail?: string) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  let rows;
  if (destinataireEmail) {
    [rows] = await conn.execute(
      "SELECT * FROM notifications WHERE destinataireEmail = ? ORDER BY createdAt DESC LIMIT 50",
      [destinataireEmail]
    );
  } else if (destinataire) {
    [rows] = await conn.execute(
      "SELECT * FROM notifications WHERE destinataire = ? OR destinataire = 'Owner' ORDER BY createdAt DESC LIMIT 50",
      [destinataire]
    );
  } else {
    [rows] = await conn.execute(
      "SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 100"
    );
  }
  await conn.end();
  return rows as any[];
}

export async function markNotificationRead(id: number) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  await conn.execute("UPDATE notifications SET lu = TRUE WHERE id = ?", [id]);
  await conn.end();
}

// ─── CRÉNEAUX BLOQUÉS ────────────────────────────────────────────────────────
import { blockedSlots, InsertBlockedSlot } from "../drizzle/schema";

export async function getBlockedSlots(dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return [];
  if (dateFrom && dateTo) {
    const { between } = await import("drizzle-orm");
    return db.select().from(blockedSlots)
      .where(between(blockedSlots.date, dateFrom, dateTo))
      .orderBy(blockedSlots.date);
  }
  return db.select().from(blockedSlots).orderBy(blockedSlots.date);
}

export async function createBlockedSlot(data: InsertBlockedSlot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blockedSlots).values(data);
}

export async function deleteBlockedSlot(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blockedSlots).where(eq(blockedSlots.id, id));
}

export async function markAllNotificationsRead(destinataire: string) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  await conn.execute(
    "UPDATE notifications SET lu = TRUE WHERE destinataire = ? OR destinataire = 'Owner'",
    [destinataire]
  );
  await conn.end();
}

export async function getUnreadNotificationCount(destinataire: string) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute(
    "SELECT COUNT(*) as count FROM notifications WHERE (destinataire = ? OR destinataire = 'Owner') AND lu = FALSE",
    [destinataire]
  ) as any[];
  await conn.end();
  return (rows[0]?.count ?? 0) as number;
}

export async function getUnreadCountByPage(destinataire: string): Promise<Record<string, number>> {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute(
    "SELECT lien, COUNT(*) as count FROM notifications WHERE (destinataire = ? OR destinataire = 'Owner') AND lu = FALSE GROUP BY lien",
    [destinataire]
  ) as any[];
  await conn.end();
  const result: Record<string, number> = {};
  for (const row of rows as any[]) {
    if (row.lien) result[row.lien] = Number(row.count);
  }
  return result;
}

export async function getAllCrmLeadsForExport() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt));
}

// ─── SUPPRESSION (admin/direction uniquement) ─────────────────────────────────
export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(leads).where(eq(leads.id, id));
}
export async function deleteDemande(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(demandes).where(eq(demandes.id, id));
}
export async function deleteMandat(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(mandatsRecherche).where(eq(mandatsRecherche.id, id));
}
export async function deleteHexaDossier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hexaDossiers).where(eq(hexaDossiers.id, id));
}
export async function deleteCrmLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(crmLeads).where(eq(crmLeads.id, id));
}

// ─── LEAD ACTIVITIES — Timeline complète ─────────────────────────────────────

export async function getLeadActivities(crmLeadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadActivities)
    .where(eq(leadActivities.crmLeadId, crmLeadId))
    .orderBy(desc(leadActivities.createdAt));
}

export async function addLeadActivity(data: InsertLeadActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leadActivities).values(data);
  return result[0];
}

export async function deleteLeadActivity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(leadActivities).where(eq(leadActivities.id, id));
}

// ─── OFF MARKET BIENS ─────────────────────────────────────────────────────────

export async function getOffMarketBiens(opts?: { search?: string; statut?: string; region?: string; typeBien?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.statut && opts.statut !== 'tous') {
    conditions.push(eq(offMarketBiens.statut, opts.statut as any));
  }
  if (opts?.region && opts.region !== 'toutes') {
    conditions.push(like(offMarketBiens.region, `%${opts.region}%`));
  }
  if (opts?.typeBien && opts.typeBien !== 'tous') {
    conditions.push(eq(offMarketBiens.typeBien, opts.typeBien));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    conditions.push(
      or(
        like(offMarketBiens.titre, s),
        like(offMarketBiens.typeBien, s),
        like(offMarketBiens.region, s),
        like(offMarketBiens.departement, s),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const [items, countResult] = await Promise.all([
    db.select().from(offMarketBiens).where(where).orderBy(desc(offMarketBiens.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(offMarketBiens).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getOffMarketBienById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(offMarketBiens).where(eq(offMarketBiens.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateOffMarketBienStatut(id: number, statut: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(offMarketBiens).set({ statut: statut as any, updatedAt: Date.now() }).where(eq(offMarketBiens.id, id));
}

export async function createOffMarketBien(data: InsertOffMarketBien) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(offMarketBiens).values(data);
  return result[0];
}

export async function deleteOffMarketBien(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(offMarketBiens).where(eq(offMarketBiens.id, id));
}

export async function getEnvoisParBien(bienId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: bienPropositions.id,
      crmLeadId: bienPropositions.crmLeadId,
      pdfUrl: bienPropositions.pdfUrl,
      messagePersonnalise: bienPropositions.messagePersonnalise,
      envoyePar: bienPropositions.envoyePar,
      emailDestinataire: bienPropositions.emailDestinataire,
      statut: bienPropositions.statut,
      createdAt: bienPropositions.createdAt,
      leadPrenom: crmLeads.prenom,
      leadNom: crmLeads.nom,
      leadEmail: crmLeads.email,
    })
    .from(bienPropositions)
    .leftJoin(crmLeads, eq(bienPropositions.crmLeadId, crmLeads.id))
    .where(eq(bienPropositions.bienId, bienId))
    .orderBy(desc(bienPropositions.createdAt));
  return rows;
}

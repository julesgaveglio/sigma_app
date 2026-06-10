import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import type { AssignationFinancement, Courtier, DossierFinancement } from "../../drizzle/schema";
import { dossiersFinancement, docsDossierFinancement, assignationsFinancement, notificationsInApp, courtiers, leads } from "../../drizzle/schema";
import { eq, desc, and, inArray, like, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

// ─── SCHÉMAS ──────────────────────────────────────────────────────────────────

const PatrimoineItemSchema = z.object({
  mensualite: z.number().optional(),
  typeGarantie: z.string().optional(),
  formatPropriete: z.string().optional(),
  dpe: z.string().optional(),
  loyersHC: z.number().optional(),
  capitalRestantDu: z.number().optional(),
  valeurActuelle: z.number().optional(),
});

const DossierFinancementSchema = z.object({
  leadId: z.number().optional(),
  emprunteur1Nom: z.string().min(1, "Nom requis"),
  emprunteur1Prenom: z.string().min(1, "Prénom requis"),
  emprunteur1DateNaissance: z.string().optional(),
  emprunteur1Nationalite: z.string().optional(),
  emprunteur1SituationMatrimoniale: z.string().optional(),
  emprunteur1NbEnfants: z.number().optional(),
  emprunteur1Proprietaire: z.boolean().optional(),
  emprunteur1Activite: z.string().optional(),
  emprunteur1Anciennete: z.string().optional(),
  emprunteur1StatutPro: z.string().optional(),
  emprunteur1SalaireAvis2024: z.number().optional(),
  emprunteur1SalaireAvis2025: z.number().optional(),
  emprunteur1SalaireCumul2025: z.number().optional(),
  emprunteur1SalaireNet2026: z.number().optional(),
  emprunteur1AutresRevenus: z.number().optional(),
  emprunteur1AutresCharges: z.number().optional(),
  emprunteur1EpargneLiquide: z.number().optional(),
  emprunteur1EpargneNonLiquide: z.number().optional(),
  emprunteur1Apport: z.number().optional(),
  emprunteur2Nom: z.string().optional(),
  emprunteur2Prenom: z.string().optional(),
  emprunteur2DateNaissance: z.string().optional(),
  emprunteur2Nationalite: z.string().optional(),
  emprunteur2Activite: z.string().optional(),
  emprunteur2Anciennete: z.string().optional(),
  emprunteur2StatutPro: z.string().optional(),
  emprunteur2SalaireAvis2024: z.number().optional(),
  emprunteur2SalaireAvis2025: z.number().optional(),
  emprunteur2SalaireCumul2025: z.number().optional(),
  emprunteur2SalaireNet2026: z.number().optional(),
  emprunteur2EpargneLiquide: z.number().optional(),
  emprunteur2EpargneNonLiquide: z.number().optional(),
  emprunteur2Apport: z.number().optional(),
  patrimoine: z.array(PatrimoineItemSchema).optional(),
  montantProjet: z.number().min(1, "Montant requis"),
  duree: z.number().min(1, "Durée requise"),
  regimeFiscal: z.string().optional(),
  objetFinancement: z.string().optional(),
  incidentsATD: z.boolean().optional(),
  personneGarante: z.boolean().optional(),
  commentaire: z.string().optional(),
});

// ─── ROUTEUR ──────────────────────────────────────────────────────────────────

export const financementRouter = router({

  // ── Soumettre un dossier (public, rempli par le lead) ──────────────────────
  soumettre: publicProcedure
    .input(DossierFinancementSchema)
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const { patrimoine, ...rest } = input;
      const [result] = await db.insert(dossiersFinancement).values({
        ...rest,
        patrimoineJson: patrimoine ? JSON.stringify(patrimoine) : null,
        statut: "nouveau",
        createdAt: now,
        updatedAt: now,
      });
      const id = (result as any).insertId as number;

      // Notifier Manon
      await db.insert(notificationsInApp).values({
        destinataireEmail: "manondubost@sigmaipf.fr",
        type: "nouveau_dossier_financement",
        titre: "Nouveau dossier de financement",
        message: `Dossier de ${input.emprunteur1Prenom} ${input.emprunteur1Nom} — ${input.montantProjet.toLocaleString("fr-FR")} € sur ${input.duree} mois`,
        lien: `/dashboard/financement/${id}`,
        lu: false,
        createdAt: now,
      });

      return { success: true, id };
    }),

  // ── Lister tous les dossiers (admin/direction) ─────────────────────────────
  lister: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      statut: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;
      let rows = await db.select().from(dossiersFinancement)
        .orderBy(desc(dossiersFinancement.createdAt));

      // Filtrage côté JS (MySQL/TiDB — pas de OR natif en drizzle sans rawSQL)
      if (input?.statut && input.statut !== "tous") {
        rows = rows.filter((r: DossierFinancement) => r.statut === input.statut);
      }
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter((r: DossierFinancement) =>
          `${r.emprunteur1Prenom} ${r.emprunteur1Nom}`.toLowerCase().includes(q)
        );
      }

      // Enrichir avec le nb d'assignations et docs
      const allAssignations = await db.select().from(assignationsFinancement);
      const allDocs = await db.select().from(docsDossierFinancement);

      return rows.map((r: DossierFinancement) => ({
        ...r,
        patrimoine: r.patrimoineJson ? JSON.parse(r.patrimoineJson) : [],
        assignations: allAssignations.filter((a: AssignationFinancement) => a.dossierFinancementId === r.id),
        docs: allDocs.filter((d: any) => d.dossierFinancementId === r.id),
      }));
    }),

  // ── Compteur dossiers par courtier (vue Manon) ────────────────────────────
  statsParCourtier: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;

      const allCourtiers = await db.select().from(courtiers);
      const allAssignations = await db.select().from(assignationsFinancement);

      // Calcul de la fenêtre hebdomadaire (lundi 00:00 → dimanche 23:59)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=dim, 1=lun...
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      return allCourtiers.map((c: Courtier) => {
        const assignationsCourtier = allAssignations.filter((a: AssignationFinancement) => a.courtierId === c.id);
        const total = assignationsCourtier.length;
        const enAttente = assignationsCourtier.filter((a: AssignationFinancement) => a.statut === "en_attente").length;
        const enCours = assignationsCourtier.filter((a: AssignationFinancement) => a.statut === "en_cours").length;
        const valide = assignationsCourtier.filter((a: AssignationFinancement) => a.statut === "valide").length;
        const refuse = assignationsCourtier.filter((a: AssignationFinancement) => a.statut === "refuse").length;
        // Assignations de la semaine en cours
        const hebdo = assignationsCourtier.filter((a: AssignationFinancement) => {
          const d = new Date(a.createdAt ?? 0);
          return d >= monday && d <= sunday;
        }).length;
        // Régions d'opération
        let regions: string[] = [];
        try { regions = JSON.parse((c as any).regionsOperation ?? "[]"); } catch {}
        return {
          courtierId: c.id,
          courtierNom: `${c.prenom ?? ""} ${c.nom}`.trim(),
          courtierEmail: c.email,
          cabinetNom: c.cabinetNom ?? null,
          statutInterne: c.statutInterne,
          total,
          enAttente,
          enCours,
          valide,
          refuse,
          hebdo,
          regions,
        };
      }).sort((a: any, b: any) => b.total - a.total);
    }),

  // ── Détail d'un dossier ────────────────────────────────────────────────────
  detail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;
      const [dossier] = await db.select().from(dossiersFinancement)
        .where(eq(dossiersFinancement.id, input.id));
      if (!dossier) throw new TRPCError({ code: "NOT_FOUND" });

      const docs = await db.select().from(docsDossierFinancement)
        .where(eq(docsDossierFinancement.dossierFinancementId, input.id))
        .orderBy(desc(docsDossierFinancement.createdAt));

      const assignations = await db.select().from(assignationsFinancement)
        .where(eq(assignationsFinancement.dossierFinancementId, input.id));

      const courtierIds = assignations.map((a: AssignationFinancement) => a.courtierId);
      const courtiersList = courtierIds.length > 0
        ? await db.select().from(courtiers).where(inArray(courtiers.id, courtierIds))
        : [];

      let lead = null;
      if (dossier.leadId) {
        const [l] = await db.select().from(leads).where(eq(leads.id, dossier.leadId));
        lead = l ?? null;
      }

      return {
        ...dossier,
        patrimoine: dossier.patrimoineJson ? JSON.parse(dossier.patrimoineJson) : [],
        docs,
        assignations: assignations.map((a: AssignationFinancement) => ({
          ...a,
          courtier: courtiersList.find((c: Courtier) => c.id === a.courtierId) ?? null,
        })),
        lead,
      };
    }),

  // ── Mettre à jour le statut / note Manon ──────────────────────────────────
  updateStatut: protectedProcedure
    .input(z.object({
      id: z.number(),
      statut: z.enum(["nouveau", "en_cours", "assigne", "traite"]).optional(),
      noteManon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;
      await db.update(dossiersFinancement)
        .set({ statut: input.statut, noteManon: input.noteManon, updatedAt: Date.now() })
        .where(eq(dossiersFinancement.id, input.id));
      return { success: true };
    }),

  // ── Upload d'un document (Manon joint un doc au dossier) ──────────────────
  uploadDoc: protectedProcedure
    .input(z.object({
      dossierFinancementId: z.number(),
      nom: z.string(),
      type: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;
      const buffer = Buffer.from(input.fileBase64, "base64");
      const suffix = nanoid(8);
      const fileKey = `financement/${input.dossierFinancementId}/docs/${suffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      await db.insert(docsDossierFinancement).values({
        dossierFinancementId: input.dossierFinancementId,
        nom: input.nom,
        type: input.type,
        url,
        fileKey,
        mimeType: input.mimeType,
        size: buffer.length,
        uploadePar: ctx.user.email ?? ctx.user.name ?? "admin",
        createdAt: Date.now(),
      });

      return { success: true, url };
    }),

  // ── Supprimer un document ─────────────────────────────────────────────────
  supprimerDoc: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;
      await db.delete(docsDossierFinancement)
        .where(eq(docsDossierFinancement.id, input.id));
      return { success: true };
    }),

  // ── Assigner un dossier à un ou plusieurs courtiers (bulk) ────────────────
  assigner: protectedProcedure
    .input(z.object({
      dossierFinancementId: z.number(),
      courtierIds: z.array(z.number()).min(1, "Au moins un courtier requis"),
      noteManon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;
      const now = Date.now();
      const assignePar = ctx.user.email ?? ctx.user.name ?? "admin";

      const [dossier] = await db.select().from(dossiersFinancement)
        .where(eq(dossiersFinancement.id, input.dossierFinancementId));
      if (!dossier) throw new TRPCError({ code: "NOT_FOUND" });

      const courtiersList = await db.select().from(courtiers)
        .where(inArray(courtiers.id, input.courtierIds));

      for (const courtierId of input.courtierIds) {
        const [existing] = await db.select().from(assignationsFinancement)
          .where(and(
            eq(assignationsFinancement.dossierFinancementId, input.dossierFinancementId),
            eq(assignationsFinancement.courtierId, courtierId)
          ));
        if (!existing) {
          await db.insert(assignationsFinancement).values({
            dossierFinancementId: input.dossierFinancementId,
            courtierId,
            statut: "en_attente",
            noteManon: input.noteManon,
            assignePar,
            createdAt: now,
            updatedAt: now,
          });

          const courtier = courtiersList.find((c: Courtier) => c.id === courtierId);
          if (courtier?.email) {
            await db.insert(notificationsInApp).values({
              destinataireEmail: courtier.email,
              type: "nouveau_dossier_assigne",
              titre: "Nouveau dossier de financement reçu",
              message: `Dossier de ${dossier.emprunteur1Prenom} ${dossier.emprunteur1Nom} — ${dossier.montantProjet.toLocaleString("fr-FR")} € sur ${dossier.duree} mois`,
              lien: `/dashboard/courtier`,
              lu: false,
              createdAt: now,
            });
          }
        }
      }

      await db.update(dossiersFinancement)
        .set({ statut: "assigne", updatedAt: now })
        .where(eq(dossiersFinancement.id, input.dossierFinancementId));

      return { success: true, nbAssignations: input.courtierIds.length };
    }),

  // ── Courtier met à jour le statut de son assignation ──────────────────────
  updateAssignation: protectedProcedure
    .input(z.object({
      assignationId: z.number(),
      statut: z.enum(["en_attente", "en_cours", "valide", "refuse"]),
      noteCourtier: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(assignationsFinancement)
        .set({ statut: input.statut, noteCourtier: input.noteCourtier, updatedAt: now })
        .where(eq(assignationsFinancement.id, input.assignationId));

      const [assignation] = await db.select().from(assignationsFinancement)
        .where(eq(assignationsFinancement.id, input.assignationId));
      if (assignation) {
        const [dossier] = await db.select().from(dossiersFinancement)
          .where(eq(dossiersFinancement.id, assignation.dossierFinancementId));
        const statutLabel = { en_attente: "En attente", en_cours: "En cours", valide: "Validé ✅", refuse: "Refusé ❌" }[input.statut];
        await db.insert(notificationsInApp).values({
          destinataireEmail: "manondubost@sigmaipf.fr",
          type: "statut_dossier_courtier",
          titre: `Dossier ${statutLabel} par un courtier`,
          message: `${dossier ? `${dossier.emprunteur1Prenom} ${dossier.emprunteur1Nom}` : "Dossier"} — Statut : ${statutLabel}${input.noteCourtier ? ` — Note : ${input.noteCourtier}` : ""}`,
          lien: `/dashboard/financement/${assignation.dossierFinancementId}`,
          lu: false,
          createdAt: now,
        });
      }

      return { success: true };
    }),

  // ── Dossiers reçus par un courtier (portail courtier) ─────────────────────
  mesAssignations: protectedProcedure
    .query(async ({ ctx }) => {
      const db = (await getDb())!;

      // Chercher le courtier par userId, avec fallback par email
      let [courtier] = await db.select().from(courtiers)
        .where(eq(courtiers.userId, ctx.user.id));
      if (!courtier && ctx.user.email) {
        const [byEmail] = await db.select().from(courtiers)
          .where(eq(courtiers.email, ctx.user.email));
        if (byEmail) {
          await db.update(courtiers)
            .set({ userId: ctx.user.id })
            .where(eq(courtiers.id, byEmail.id));
          courtier = { ...byEmail, userId: ctx.user.id };
        }
      }
      if (!courtier) return [];

      const assignations = await db.select().from(assignationsFinancement)
        .where(eq(assignationsFinancement.courtierId, courtier.id))
        .orderBy(desc(assignationsFinancement.createdAt));

      const result = [];
      for (const a of assignations) {
        const [dossier] = await db.select().from(dossiersFinancement)
          .where(eq(dossiersFinancement.id, a.dossierFinancementId));
        const docs = await db.select().from(docsDossierFinancement)
          .where(eq(docsDossierFinancement.dossierFinancementId, a.dossierFinancementId));

        let lead = null;
        if (dossier?.leadId) {
          const [l] = await db.select().from(leads).where(eq(leads.id, dossier.leadId));
          lead = l ?? null;
        }

        result.push({
          assignation: a,
          dossier: dossier ? {
            ...dossier,
            patrimoine: dossier.patrimoineJson ? JSON.parse(dossier.patrimoineJson) : [],
          } : null,
          docs,
          lead,
        });
      }
      return result;
    }),

  // ── Supprimer un dossier (admin) ───────────────────────────────────────────
  supprimer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = (await getDb())!;
      await db.delete(docsDossierFinancement)
        .where(eq(docsDossierFinancement.dossierFinancementId, input.id));
      await db.delete(assignationsFinancement)
        .where(eq(assignationsFinancement.dossierFinancementId, input.id));
      await db.delete(dossiersFinancement)
        .where(eq(dossiersFinancement.id, input.id));
      return { success: true };
    }),

  // ── Notifications in-app pour l'utilisateur connecté ─────────────────────
  mesNotifications: protectedProcedure
    .query(async ({ ctx }) => {
      const db = (await getDb())!;
      const email = ctx.user.email ?? "";
      if (!email) return [];
      return db.select().from(notificationsInApp)
        .where(eq(notificationsInApp.destinataireEmail, email))
        .orderBy(desc(notificationsInApp.createdAt))
        .limit(50);
    }),

  marquerNotifLue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(notificationsInApp)
        .set({ lu: true })
        .where(eq(notificationsInApp.id, input.id));
      return { success: true };
    }),

  marquerToutesLues: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = (await getDb())!;
      const email = ctx.user.email ?? "";
      if (!email) return { success: false };
      await db.update(notificationsInApp)
        .set({ lu: true })
        .where(eq(notificationsInApp.destinataireEmail, email));
      return { success: true };
    }),
});

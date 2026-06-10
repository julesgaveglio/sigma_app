import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { ambassadeursRouter } from "./routers/ambassadeurs";
import { courtiersRouter } from "./routers/courtiers";
import { salesRouter } from "./routers/sales";
import { feedbacksRouter } from "./routers/feedbacks";
import { financementRouter } from "./routers/financement";
import { commissionsRouter } from "./routers/commissions";
import { triggersRouter } from "./routers/triggers";
import { partnerDocsRouter } from "./routers/partnerDocs";
import { protectedProcedure, publicProcedure, router, adminProcedure } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { sendNewLeadNotification } from "./mailer";
import {
  createLead, createDocument, getLeads, getLeadById,
  updateLeadStatut, getAllLeadsForExport, getDocumentsByLeadId, deleteLead,
  createDemande, getDemandes, getDemandeById, updateDemandeStatut, getAllDemandesForExport, deleteDemande,
  createMandat, getMandats, getMandatById, getMandatsByLeadId, updateMandatStatut, getAllMandatsForExport, deleteMandat,
  createHexaDossier, getHexaDossiers, getHexaDossierById, updateHexaStatut, getAllHexaDossiersForExport, deleteHexaDossier,
  createCrmLead, getCrmLeads, getCrmLeadById, updateCrmLead, addCrmNote, getCrmNotesByLeadId, getCrmLeadByEmail, getAllCrmLeadsForExport, deleteCrmLead,
  getLeadActivities, addLeadActivity, deleteLeadActivity,
  getOffMarketBiens, getOffMarketBienById, updateOffMarketBienStatut, createOffMarketBien, deleteOffMarketBien,
  createCalendarTask, getCalendarTasks, updateCalendarTask, deleteCalendarTask, getCalendarTaskById,
  createNotification, getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount, getUnreadCountByPage,
  getBlockedSlots, createBlockedSlot, deleteBlockedSlot,
} from "./db";
import { sendNewMandatNotification, sendNewHexaNotification, sendCrmLeadAlert, sendCalendarTaskAlert, sendTacheTermineeNotif, sendDemandeDocumentAlert, sendRdvConfirmation, sendDemandeStatutChange, sendPointImmobilierInvitation } from "./mailer";
import { generateOffMarketPdf } from "./pdfOffMarket";
import { generatePortefeuillePdf } from "./pdfPortefeuille";
import { storagePut } from "./storage";
import { generateBienPdf } from "./pdfBien";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { closes as closesTable, courtierSoumissions, crmLeads, crmLeadDocuments, mandatVersions, courtiers as courtiersTable, ambassadeurs as ambassadeursTable, notificationsInApp as notificationsInAppTable } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { loginLocalUser, registerLocalUser, requestPasswordReset, resetPassword, isEmailAllowed, loginWithTempPassword } from "./localAuth";
import { generateDossierPdf } from "./pdfDossier";
import { marieRouter } from "./routers/marie";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const DemandeSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  telephone: z.string().min(1, "Le téléphone est requis"),
  email: z.string().email("Email invalide"),
  sujet: z.string().min(1, "Le sujet est requis"),
  demande: z.string().min(1, "La demande est requise"),
  priorite: z.enum(["hyper_urgent", "tres_urgent", "urgent", "normal", "faible"]).default("normal"),
});

const LeadSchema = z.object({
  // Identité
  nom: z.string().min(1, "Le nom est requis"),
  nomJeuneFille: z.string().optional(),
  prenoms: z.string().min(1, "Les prénoms sont requis"),
  profession: z.string().optional(),
  dateNaissance: z.string().optional(),
  lieuNaissance: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  telephoneDomicile: z.string().optional(),
  telephoneTravail: z.string().optional(),
  telephonePortable: z.string().optional(),
  email: z.string().optional().transform(v => v?.trim() || undefined),
  // Conjoint
  conjointNom: z.string().optional(),
  conjointNomJeuneFille: z.string().optional(),
  conjointPrenoms: z.string().optional(),
  conjointProfession: z.string().optional(),
  conjointDateNaissance: z.string().optional(),
  conjointLieuNaissance: z.string().optional(),
  conjointAdresse: z.string().optional(),
  conjointTelephoneDomicile: z.string().optional(),
  conjointTelephoneTravail: z.string().optional(),
  conjointTelephonePortable: z.string().optional(),
  conjointEmail: z.string().optional(),
  // Mariage
  communeMariage: z.string().optional(),
  dateMariage: z.string().optional(),
  contratMariage: z.boolean().optional(),
  regimeMatrimonial: z.string().optional(),
  regimeMatrimonialType: z.enum(["communaute_reduite_acquets", "communaute_universelle", "separation_biens", "participation_acquets", "autre"]).optional(),
  projetSeulOuDeux: z.enum(["seul", "a_deux"]).optional(),
  notaireContratNom: z.string().optional(),
  notaireContratLieu: z.string().optional(),
  notaireContratDate: z.string().optional(),
  // Changement de régime
  changementRegime: z.boolean().optional(),
  nouveauRegime: z.string().optional(),
  notaireChangementNom: z.string().optional(),
  notaireChangementLieu: z.string().optional(),
  notaireChangementDate: z.string().optional(),
  tribunalHomologation: z.string().optional(),
  dateHomologation: z.string().optional(),
  // Situation
  situationFamiliale: z.enum(["celibataire", "marie", "divorce", "instance_divorce", "pacs", "veuf"]).optional(),
  avocatNomAdresse: z.string().optional(),
  tribunalDivorce: z.string().optional(),
  dateDivorce: z.string().optional(),
  exConjointNomPrenom: z.string().optional(),
  datePacs: z.string().optional(),
  partenairePacs: z.string().optional(),
  // Nationalité
  nationalite: z.enum(["francais", "francais_etranger", "etranger"]).optional(),
});

// ─── ROUTER ────────────────────────────────────────────────────────────────────────────

// Mappe le nom/email de l'utilisateur connecté vers son identifiant de destinataire de notifications
function resolveNotifDest(userName: string, userEmail: string): "Maria" | "Manon" | "Elodie" | "Hanna" | "Marie" | "Owner" {
  const name = userName.toLowerCase();
  const email = userEmail.toLowerCase();
  // Détection par email (prioritaire)
  if (email.includes("elodie") || email === "elodie@sigmafactory.fr" || email === "elodie@sigmaipf.fr") return "Elodie";
  if (email.includes("maria") || email === "maria@sigmaipf.fr") return "Maria";
  if (email.includes("manon") || email === "manondubost@sigmaipf.fr") return "Manon";
  if (email.includes("hanna") || email === "assistance.direction@sigmaipf.fr") return "Hanna";
  if (email.includes("mariecabut") || email === "mariecabut@sigmaipf.fr") return "Marie";
  // Détection par nom (fallback)
  if (name.includes("elodie") || name.includes("élodie")) return "Elodie";
  if (name.includes("maria")) return "Maria";
  if (name.includes("manon")) return "Manon";
  if (name.includes("hanna")) return "Hanna";
  if (name.includes("marie") && name.includes("cabut")) return "Marie";
  return "Owner";
}

export const appRouter = router({
  // Test procedure to check database connection
  testDb: publicProcedure.query(async () => {
    const db = await getDb();
    return {
      dbConnected: !!db,
      databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET",
      timestamp: new Date().toISOString(),
    };
  }),
  
  system: systemRouter,
  sales: salesRouter,
  feedbacks: feedbacksRouter,
  scraper: router({
    scrapePAPManual: adminProcedure.mutation(async () => {
      try {
        const { runPAPScraperJob } = await import("./services/papScraperService");
        await runPAPScraperJob();
        return { success: true, message: "Scrape PAP déclenché avec succès" };
      } catch (error) {
        console.error("Erreur scraper PAP:", error);
        return { success: false, message: String(error) };
      }
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // ─── AUTHENTIFICATION LOCALE ─────────────────────────────────────────────
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        // Essayer d'abord le mot de passe normal
        let result = await loginLocalUser(input.email, input.password);
        let isTempPassword = false;
        // Si échec, essayer le mot de passe temporaire
        if (!result.success) {
          const tempResult = await loginWithTempPassword(input.email, input.password);
          if (tempResult.success) {
            result = tempResult;
            isTempPassword = tempResult.isTempPassword ?? false;
          }
        }
        if (!result.success || !result.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: result.error ?? "Identifiants invalides" });
        }
        const user = result.user;
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? user.email ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, isTempPassword, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"), name: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const result = await registerLocalUser(input.email, input.password, input.name);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Erreur lors de la création du compte" });
        }
        return { success: true };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await requestPasswordReset(input.email);
        return { success: true };
      }),
    resetPassword: publicProcedure
      .input(z.object({ token: z.string().min(1), newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères") }))
      .mutation(async ({ input }) => {
        const result = await resetPassword(input.token, input.newPassword);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Erreur lors de la réinitialisation" });
        }
        return { success: true };
      }),
    checkEmailAllowed: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return isEmailAllowed(input.email);
      }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1, "Mot de passe actuel requis"),
        newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [user] = await db.select().from(users).where(eq(users.openId, ctx.user.openId)).limit(1);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
        if (!user.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce compte n'utilise pas de mot de passe local" });
        const bcrypt = (await import("bcryptjs")).default;
        const validCurrent = await bcrypt.compare(input.currentPassword, user.passwordHash);
        const validTemp = user.resetToken ? await bcrypt.compare(input.currentPassword, user.resetToken) : false;
        if (!validCurrent && !validTemp) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Mot de passe actuel incorrect" });
        }
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await db.update(users).set({ passwordHash: newHash, resetToken: null, resetTokenExpiry: null }).where(eq(users.id, user.id));
        return { success: true };
      }),
  }),

  leads: router({
    // Soumission publique du formulaire
    submit: publicProcedure
      .input(LeadSchema)
      .mutation(async ({ input }) => {
        const result = await createLead(input as any);
        const insertId = (result as any).insertId as number;

        // Notification owner (Manus)
        try {
          await notifyOwner({
            title: `Nouvelle fiche d'état civil — ${input.nom} ${input.prenoms}`,
            content: `Un nouveau lead a soumis sa fiche d'état civil.\n\nNom : ${input.nom} ${input.prenoms}\nEmail : ${input.email ?? "—"}\nTéléphone : ${input.telephonePortable ?? "—"}\nSituation : ${input.situationFamiliale ?? "—"}`,
          });
        } catch (e) {
          console.warn("Notification Manus failed:", e);
        }

        // Email à l'équipe Sigma Factory
        try {
          await sendNewLeadNotification({
            nom: input.nom,
            prenoms: input.prenoms,
            email: input.email ?? undefined,
            telephonePortable: input.telephonePortable ?? undefined,
            situationFamiliale: input.situationFamiliale ?? undefined,
            nationalite: input.nationalite ?? undefined,
            leadId: insertId,
          });
        } catch (e) {
          console.warn("Email notification failed:", e);
        }

        // Créer automatiquement un lead CRM dans le Pipeline (étape Welcome Call)
        try {
          const existingCrm = await getCrmLeadByEmail(input.email ?? "");
          if (!existingCrm && input.email) {
            const crmResult = await createCrmLead({
              nom: input.nom,
              prenom: input.prenoms?.split(" ")[0] ?? input.prenoms ?? "",
              email: input.email,
              telephone: input.telephonePortable ?? null,
              leadId: insertId,
              hexaId: null,
              etape: "welcome_call",
              etatCivilRempli: true,
            } as any);
            console.log("[CRM] Lead créé pour", input.email, "- ID:", (crmResult as any)?.insertId);
            // Notification in-app pour Maria
            createNotification({ destinataire: "Maria", type: "nouveau_lead", titre: `Nouveau lead : ${input.prenoms} ${input.nom}`, message: `Formulaire État Civil soumis — ajouté en Welcome Call.`, lien: "/dashboard/pipeline" }).catch(console.error);
            createNotification({ destinataire: "Owner", type: "nouveau_lead", titre: `Nouveau lead : ${input.prenoms} ${input.nom}`, message: `Formulaire État Civil soumis — ajouté en Welcome Call.`, lien: "/dashboard/pipeline" }).catch(console.error);
          } else if (existingCrm && input.email) {
            // Lead CRM existant : mettre à jour etatCivilRempli=true et lier le leadId
            const dbInst = await getDb();
            if (dbInst) {
              const { crmLeads } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await dbInst.update(crmLeads)
                .set({ etatCivilRempli: true, leadId: insertId } as any)
                .where(eq(crmLeads.id, (existingCrm as any).id));
              console.log("[CRM] Lead existant mis à jour pour", input.email, "- etatCivilRempli=true, leadId=", insertId);
              // Notifier Maria et Owner que l'état civil a été soumis sur un lead existant
              createNotification({ destinataire: "Maria", type: "nouveau_lead", titre: `État Civil soumis : ${input.prenoms} ${input.nom}`, message: `${input.prenoms} ${input.nom} vient de soumettre son formulaire d'état civil.`, lien: "/dashboard/pipeline" }).catch(console.error);
              createNotification({ destinataire: "Owner", type: "nouveau_lead", titre: `État Civil soumis : ${input.prenoms} ${input.nom}`, message: `${input.prenoms} ${input.nom} vient de soumettre son formulaire d'état civil.`, lien: "/dashboard/pipeline" }).catch(console.error);
            }
          }
        } catch (e) {
          console.warn("CRM lead creation failed:", e);
        }

        return { success: true, leadId: insertId };
      }),

    // Liste des leads (admin)
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        statut: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        return getLeads(input);
      }),

    // Détail d'un lead (admin)
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        const lead = await getLeadById(input.id);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
        const docs = await getDocumentsByLeadId(input.id);
        return { lead, documents: docs };
      }),

    // Mise à jour du statut (admin)
    updateStatut: protectedProcedure
      .input(z.object({ id: z.number(), statut: z.string(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        await updateLeadStatut(input.id, input.statut, input.notes);
        return { success: true };
      }),

    // Export CSV (admin)
    exportCsv: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        const allLeads = await getAllLeadsForExport();
        return allLeads;
      }),
    // Supprimer un lead (admin/direction)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteLead(input.id);
        return { success: true };
      }),
  }),
  // Custom Care — Demandess
  demandes: router({
    // Soumission publique (interne équipe)
    submit: protectedProcedure
      .input(DemandeSchema)
      .mutation(async ({ input }) => {
        const result = await createDemande(input as any);
        const insertId = (result as any).insertId as number;

        // Notification owner
        try {
          await notifyOwner({
            title: `🚨 Nouvelle demande Custom Care — ${input.sujet}`,
            content: `Lead : ${input.prenom} ${input.nom}\nTél : ${input.telephone}\nEmail : ${input.email}\nPriorité : ${input.priorite}\n\n${input.demande}`,
          });
        } catch (e) { console.warn("Notification failed:", e); }

        return { success: true, demandeId: insertId };
      }),

    // Liste (tous les membres connectés)
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        statut: z.string().optional(),
        priorite: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return getDemandes(input);
      }),

    // Détail (tous les membres connectés)
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const demande = await getDemandeById(input.id);
        if (!demande) throw new TRPCError({ code: "NOT_FOUND" });
        return demande;
      }),

    // Mise à jour statut + notes (admin)
    updateStatut: protectedProcedure
      .input(z.object({
        id: z.number(),
        statut: z.string(),
        notesInternes: z.string().optional(),
        assigneA: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });

        // Récupérer l'ancien statut avant mise à jour
        const ancienneDemande = await getDemandeById(input.id);
        const ancienStatut = ancienneDemande?.statut ?? "nouvelle";

        await updateDemandeStatut(input.id, input.statut, input.notesInternes, input.assigneA);

        // Notifier si le statut a changé OU si l'assignation a changé
        const ancienAssigne = ancienneDemande?.assigneA;
        const nouvelAssigne = input.assigneA;
        
        if (ancienneDemande && (ancienStatut !== input.statut || ancienAssigne !== nouvelAssigne)) {
          const statutLabels: Record<string, string> = {
            nouvelle: "Nouvelle",
            en_cours: "En cours de traitement",
            en_attente_retour: "En attente de votre retour",
            standby: "En standby",
            effectuee: "Effectuée",
            annulee: "Annulée",
          };
          const nouveauLabel = statutLabels[input.statut] ?? input.statut;

          // Notification in-app (pour tous les membres de l'équipe concernés)
          // Le destinataire est la personne qui a soumis la demande (via email)
          // On notifie tous les membres (ils verront dans leur espace Customer Care)
          const membres: Array<"Maria" | "Manon" | "Elodie" | "Hanna" | "Marie"> = ["Maria", "Manon", "Elodie", "Hanna", "Marie"];
          for (const membre of membres) {
            createNotification({
              destinataire: membre,
              type: "nouvelle_tache",
              titre: `Customer Care #${input.id} : ${nouveauLabel}`,
              message: `Demande "${ancienneDemande.sujet}" de ${ancienneDemande.prenom} ${ancienneDemande.nom}${input.notesInternes ? ` — ${input.notesInternes.slice(0, 80)}` : ""}`,
              lien: "/dashboard/customcare"
            }).catch(console.error);
          }

          // Notification specifique si quelqu'un est assigne
          if (nouvelAssigne && ancienAssigne !== nouvelAssigne) {
            createNotification({
              destinataire: nouvelAssigne as "Maria" | "Manon" | "Elodie" | "Hanna",
              type: "assignation",
              titre: `Vous êtes assigné(e) : ${ancienneDemande.sujet}`,
              message: `Demande Custom Care #${input.id} de ${ancienneDemande.prenom} ${ancienneDemande.nom} — Priorité : ${ancienneDemande.priorite}`,
              lien: "/dashboard/customcare"
            }).catch(console.error);
            createNotification({
              destinataire: "Owner",
              type: "assignation",
              titre: `Assignation Custom Care : ${ancienneDemande.sujet}`,
              message: `${ancienneDemande.prenom} ${ancienneDemande.nom} assigné(e) à ${nouvelAssigne}`,
              lien: "/dashboard/customcare"
            }).catch(console.error);
          }

          // Email au demandeur (lead) UNIQUEMENT si la demande a été soumise par le client lui-même
          // (soumisParClient = 1). Si la demande a été créée par l'équipe pour le compte du client,
          // on n'envoie PAS d'email — règle métier Sigma Factory.
          if (ancienneDemande.email && ancienneDemande.soumisParClient) {
            sendDemandeStatutChange({
              demandeId: input.id,
              nom: ancienneDemande.nom,
              prenom: ancienneDemande.prenom,
              sujet: ancienneDemande.sujet,
              ancienStatut,
              nouveauStatut: input.statut,
              notesInternes: input.notesInternes,
              destinataireEmail: ancienneDemande.email,
              destinataireNom: `${ancienneDemande.prenom} ${ancienneDemande.nom}`,
            }).catch(console.error);
          }
        }

        return { success: true };
      }),

    // Export CSV (admin)
    exportCsv: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllDemandesForExport();
      }),
    // Supprimer une demande (admin/direction)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteDemande(input.id);
        return { success: true };
      }),

    // ─── DOCUMENTS BIDIRECTIONNELS ────────────────────────────────────────────────────
    // Upload d'un document (lead OU Hanna)
    uploadDocument: protectedProcedure
      .input(z.object({
        demandeId: z.number(),
        // Fichier en base64
        fileBase64: z.string(),
        nom: z.string(),
        mimeType: z.string(),
        taille: z.number(),
        envoyePar: z.enum(["lead", "hanna"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Hanna = admin/direction seulement
        if (input.envoyePar === "hanna" && ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Réservé à l'équipe Sigma" });
        }
        // Vérifier que la demande existe
        const demande = await getDemandeById(input.demandeId);
        if (!demande) throw new TRPCError({ code: "NOT_FOUND", message: "Demande introuvable" });

        // Upload vers S3
        const ext = input.nom.split(".").pop() ?? "bin";
        const fileKey = `demande-docs/${input.demandeId}/${nanoid(10)}.${ext}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Sauvegarder en BDD
        const db = await getDb();
        const { demandeDocuments } = await import("../drizzle/schema");
        await db!.insert(demandeDocuments).values({
          demandeId: input.demandeId,
          url,
          fileKey,
          nom: input.nom,
          taille: input.taille,
          mimeType: input.mimeType,
          envoyePar: input.envoyePar,
        });

        // Notification email
        try {
          await sendDemandeDocumentAlert({
            demandeId: input.demandeId,
            demandeNom: `${demande.prenom} ${demande.nom}`,
            demandeEmail: demande.email,
            demandeSujet: demande.sujet,
            nomFichier: input.nom,
            envoyePar: input.envoyePar,
          });
        } catch (e) { console.warn("[Demande] Email doc alert failed:", e); }

        return { success: true, url, fileKey };
      }),

    // Liste des documents d'une demande
    listDocuments: protectedProcedure
      .input(z.object({ demandeId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const { demandeDocuments } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        return db!.select().from(demandeDocuments).where(eq(demandeDocuments.demandeId, input.demandeId)).orderBy(demandeDocuments.uploadedAt);
      }),

    // Supprimer un document (admin/direction uniquement)
    deleteDocument: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        const { demandeDocuments } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db!.delete(demandeDocuments).where(eq(demandeDocuments.id, input.documentId));
        return { success: true };
      }),
  }),
  // Mandats de Recherchee
  mandats: router({
    // Soumission publique du formulaire mandat
    submit: publicProcedure
      .input(z.object({
        // Identité
        leadId: z.number().optional(),
        nom: z.string().min(1),
        prenoms: z.string().min(1),
        email: z.string().email(),
        telephone: z.string().min(1),
        adresse: z.string().optional(),
        dateNaissance: z.string().optional(),
        lieuNaissance: z.string().optional(),
        nationalite: z.string().optional(),
        situationFamiliale: z.string().optional(),
        // Bien recherché
        typeBien: z.enum(["appartement", "maison", "villa", "terrain", "local_commercial", "autre"]),
        usage: z.enum(["residence_principale", "residence_secondaire", "investissement_locatif"]),
        nbPiecesMin: z.number().optional(),
        nbPiecesMax: z.number().optional(),
        surfaceMin: z.number().optional(),
        surfaceMax: z.number().optional(),
        etage: z.string().optional(),
        localisation: z.string().min(1),
        etatBien: z.enum(["neuf", "ancien", "les_deux"]).optional(),
        travauxAcceptes: z.enum(["oui", "non", "selon_prix"]).optional(),
        // Critères
        balconTerrasse: z.boolean().optional(),
        parkingGarage: z.boolean().optional(),
        cave: z.boolean().optional(),
        ascenseur: z.boolean().optional(),
        gardien: z.boolean().optional(),
        calme: z.boolean().optional(),
        lumineux: z.boolean().optional(),
        procheTransports: z.boolean().optional(),
        procheEcoles: z.boolean().optional(),
        accessibilitePmr: z.boolean().optional(),
        animaux: z.boolean().optional(),
        exposition: z.string().optional(),
        autresCriteres: z.string().optional(),
        // Budget (optionnel — à confirmer après enveloppe courtage)
        budgetMax: z.number().min(1).optional(),
        modeFinancement: z.enum(["comptant", "credit", "mixte"]).optional(),
        apportPersonnel: z.number().optional(),
        accordBancaire: z.enum(["oui", "non", "en_cours"]).optional(),
        banqueCourtier: z.string().optional(),
        revenusNets: z.number().optional(),
        // Mandat
        typeMandat: z.enum(["simple", "exclusif"]).optional(),
        dureeMandat: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await createMandat(input as any);
        const insertId = (result as any).insertId as number;

        try {
          await notifyOwner({
            title: `Nouveau Mandat de Recherche — ${input.nom} ${input.prenoms}`,
            content: `Mandat soumis par ${input.nom} ${input.prenoms}\nBudget max : ${input.budgetMax ? input.budgetMax.toLocaleString('fr-FR') + ' €' : 'À définir après enveloppe courtage'}\nBien : ${input.typeBien} à ${input.localisation}\nFinancement : ${input.modeFinancement ?? 'À définir'}`,
          });
        } catch (e) { console.warn("Notification failed:", e); }

        try {
          await sendNewMandatNotification({
            nom: input.nom,
            prenoms: input.prenoms,
            email: input.email,
            telephone: input.telephone,
            typeBien: input.typeBien,
            localisation: input.localisation,
            budgetMax: input.budgetMax,
            modeFinancement: input.modeFinancement,
            mandatId: insertId,
          });
        } catch (e) { console.warn("Email mandat failed:", e); }

        // Mettre à jour mandatRempli dans le lead CRM correspondant
        try {
          const crmLead = await getCrmLeadByEmail(input.email);
          if (crmLead) {
            await updateCrmLead(crmLead.id, { mandatRempli: true, mandatId: insertId } as any);
            createNotification({ destinataire: "Maria", type: "nouvelle_note", titre: `Mandat rempli : ${input.nom} ${input.prenoms}`, message: `Le mandat de recherche de ${input.nom} ${input.prenoms} a été soumis.`, lien: "/dashboard/pipeline" }).catch(console.error);
          }
        } catch (e) { console.warn("CRM mandatRempli update failed:", e); }

        return { success: true, mandatId: insertId };
      }),

     // Liste (tous les membres connectés)
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        statut: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return getMandats(input);
      }),
    // Détail (tous les membres connectés)
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const mandat = await getMandatById(input.id);
        if (!mandat) throw new TRPCError({ code: "NOT_FOUND" });
        return mandat;
      }),
    // Mandats par lead (tous les membres connectés)
    byLeadId: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return getMandatsByLeadId(input.leadId);
      }),

    // Mise à jour statut (admin)
    updateStatut: protectedProcedure
      .input(z.object({
        id: z.number(),
        statut: z.string(),
        notesInternes: z.string().optional(),
        assigneA: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        // Récupérer l'ancienne assignation
        const ancienMandat = await getMandatById(input.id);
        const ancienAssigneMandat = ancienMandat?.assigneA;
        await updateMandatStatut(input.id, input.statut, input.notesInternes, input.assigneA);
        // Notification si assignation changée
        if (input.assigneA && input.assigneA !== ancienAssigneMandat) {
          const auteurMandat = ctx.user?.name ?? "Système";
          const nomLead = ancienMandat ? `${(ancienMandat as any).prenom ?? (ancienMandat as any).prenoms ?? ""} ${ancienMandat.nom ?? ""}`.trim() : `Mandat #${input.id}`;
          const destMandat = input.assigneA as "Maria" | "Manon" | "Elodie" | "Hanna";
          createNotification({ destinataire: destMandat, type: "assignation", titre: `Mandat assigné : ${nomLead}`, message: `${auteurMandat} vous a assigné le mandat de ${nomLead}`, lien: "/dashboard/mandats" }).catch(console.error);
          createNotification({ destinataire: "Owner", type: "assignation", titre: `Mandat assigné : ${nomLead}`, message: `Mandat de ${nomLead} assigné à ${input.assigneA} par ${auteurMandat}`, lien: "/dashboard/mandats" }).catch(console.error);
        }
        return { success: true };
      }),

    // Export CSV (admin)
    exportCsv: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllMandatsForExport();
      }),
    // Supprimer un mandat (admin/direction)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteMandat(input.id);
        return { success: true };
      }),
  }),
  // Hexa — Crédit d'impôt Sigmaa
  hexa: router({
    // Soumission publique
    submit: publicProcedure
      .input(z.object({
        // Identité
        civilite: z.enum(["M.", "Mme", "Mme M.", "M. Mme"]).optional(),
        nom: z.string().min(1, "Le nom est requis"),
        prenom: z.string().min(1, "Le prénom est requis"),
        email: z.string().email("Email invalide"),
        // Coordonnées
        mobile: z.string().optional(),
        fixe: z.string().optional(),
        adresse: z.string().min(1, "L'adresse est requise"),
        codePostal: z.string().min(1, "Le code postal est requis"),
        ville: z.string().min(1, "La ville est requise"),
        paysNaissance: z.string().min(1, "Le pays de naissance est requis"),
        villeNaissance: z.string().min(1, "La ville de naissance est requise"),
        // Informations personnelles supplémentaires
        dateNaissance: z.string().optional(),
        situationFamiliale: z.enum(["celibataire", "marie", "pacse", "divorce", "veuf"]).optional(),
        profession: z.string().optional(),
        // Formule & paiement (optionnels — le lead saisit uniquement le montant négocié)
        formule: z.enum(["starter", "premium", "sdt_starter", "sdt_premium"]).optional(),
        modePaiement: z.enum(["comptant", "deux_fois", "cinquante_pourcent"]).optional(),
        montantTotal: z.number().optional(),
        montantAcompte: z.number().optional(),
        // Montant négocié par le lead avec son conseiller
        montant: z.number().min(100),
      }))
      .mutation(async ({ input }) => {
        const result = await createHexaDossier(input as any);
        const insertId = (result as any).insertId as number;

        const formuleLabel: Record<string, string> = {
          starter: "Starter (5 000 €)",
          premium: "Premium (10 000 €)",
          sdt_starter: "SDT Starter (7 500 €)",
          sdt_premium: "SDT Premium (15 000 €)",
        };
        const formuleStr = input.formule ? formuleLabel[input.formule] ?? input.formule : "Non renseignée";
        const paiementStr = input.modePaiement === "deux_fois" ? `2× ${(input.montantAcompte ?? 0).toLocaleString('fr-FR')} €` :
          input.modePaiement === "cinquante_pourcent" ? `50% = ${input.montant.toLocaleString('fr-FR')} €` :
          `${input.montant.toLocaleString('fr-FR')} € (comptant)`;

        try {
          await notifyOwner({
            title: `Nouveau dossier Sigma Crédit — ${input.nom} ${input.prenom}`,
            content: `Dossier soumis par ${input.nom} ${input.prenom}\nEmail : ${input.email}\nFormule : ${formuleStr}\nPaiement : ${paiementStr}\nVille : ${input.ville}`,
          });
        } catch (e) { console.warn("Notification failed:", e); }

        try {
          await sendNewHexaNotification({
            nom: input.nom,
            prenom: input.prenom,
            email: input.email,
            mobile: input.mobile,
            montant: input.montant,
            ville: input.ville,
            dossierHexaId: insertId,
          });
        } catch (e) { console.warn("Email hexa failed:", e); }

        // ─── Liaison automatique Hexa → CRM ──────────────────────────────────
        // Si un lead CRM existe avec le même email, on met à jour sa formule et son montant
        try {
          const crmLead = await getCrmLeadByEmail(input.email);
          if (crmLead) {
            await updateCrmLead(crmLead.id, {
              hexaId: insertId,
              formule: input.formule ?? null,
              modePaiement: input.modePaiement ?? null,
              montantFormule: input.montant,
            } as any);
            console.log("[CRM] Formule mise à jour pour", input.email, "->", input.formule, input.montant, "€");
          }
        } catch (e) { console.warn("Hexa→CRM link failed:", e); }

        return { success: true, dossierHexaId: insertId };
      }),

    // Liste (admin)
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        statut: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        return getHexaDossiers(input);
      }),

    // Détail (admin) — enrichi avec le close correspondant (matching email)
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        const dossier = await getHexaDossierById(input.id);
        if (!dossier) throw new TRPCError({ code: "NOT_FOUND" });
        // Matching email : trouver le(s) close(s) associé(s) dans le rapport de vente
        let closeInfo: { closerNom: string; offre: string; formule: string | null; montantGenere: number; resultat: string | null; dateCall: Date | null } | null = null;
        if (dossier.email) {
          const db = await getDb();
          if (db) {
            const rows = await db
              .select({
                closerNom: closesTable.closerNom,
                offre: closesTable.offre,
                formule: closesTable.formule,
                montantGenere: closesTable.montantGenere,
                resultat: closesTable.resultat,
                dateCall: closesTable.dateCall,
              })
              .from(closesTable)
              .where(sql`${closesTable.leadEmail} = ${dossier.email} AND ${closesTable.resultat} = 'close'`)
              .orderBy(sql`${closesTable.dateCall} DESC`)
              .limit(1);
            if (rows.length > 0) {
              closeInfo = {
                ...rows[0],
                montantGenere: (rows[0].montantGenere ?? 0) / 100,
              };
            }
          }
        }
        return { ...dossier, closeInfo };
      }),

    // Mise à jour statut + lien paiement + suivi paiement (admin)
    updateStatut: protectedProcedure
      .input(z.object({
        id: z.number(),
        statut: z.string(),
        notesInternes: z.string().optional(),
        assigneA: z.string().optional(),
        lienPaiement: z.string().optional(),
        paiementInitie: z.boolean().optional(),
        paiementRecu: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        // Récupérer l'ancienne assignation
        const ancienHexa = await getHexaDossierById(input.id);
        const ancienAssigneHexa = ancienHexa?.assigneA;
        await updateHexaStatut(input.id, input.statut, input.notesInternes, input.assigneA, input.lienPaiement, input.paiementInitie, input.paiementRecu);
        // Notification si assignation changée
        if (input.assigneA && input.assigneA !== ancienAssigneHexa) {
          const auteurHexa = ctx.user?.name ?? "Système";
          const nomLeadHexa = ancienHexa ? `${ancienHexa.prenom ?? ""} ${ancienHexa.nom ?? ""}`.trim() : `Dossier #${input.id}`;
          const destHexa = input.assigneA as "Maria" | "Manon" | "Elodie" | "Hanna";
          createNotification({ destinataire: destHexa, type: "assignation", titre: `Dossier Sigma Crédit assigné : ${nomLeadHexa}`, message: `${auteurHexa} vous a assigné le dossier de ${nomLeadHexa}`, lien: "/dashboard/hexa" }).catch(console.error);
          createNotification({ destinataire: "Owner", type: "assignation", titre: `Dossier Sigma Crédit assigné : ${nomLeadHexa}`, message: `Dossier de ${nomLeadHexa} assigné à ${input.assigneA} par ${auteurHexa}`, lien: "/dashboard/hexa" }).catch(console.error);
        }
        return { success: true };
      }),

    // Export CSV (admin)
    exportCsv: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllHexaDossiersForExport();
      }),
    // Supprimer un dossier Sigma Crédit (admin/direction)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteHexaDossier(input.id);
        return { success: true };
      }),
  }),
  // Upload de documentt
  documents: router({
    getUploadUrl: publicProcedure
      .input(z.object({
        leadId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        type: z.enum(["cni", "passeport", "titre_sejour", "autre"]),
        fileBase64: z.string(),
        size: z.number(),
      }))
      .mutation(async ({ input }) => {
        const suffix = nanoid(8);
        const ext = input.filename.split('.').pop() ?? 'bin';
        const fileKey = `leads/${input.leadId}/docs/${input.type}-${suffix}.${ext}`;
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        await createDocument({
          leadId: input.leadId,
          type: input.type,
          filename: input.filename,
          fileKey,
          url,
          mimeType: input.mimeType,
          size: input.size,
        });

        return { success: true, url };
      }),
   }),

  // ─── CRM PIPELINE ────────────────────────────────────────────────────────────────────────────────
  crm: router({
    // Créer un lead CRM
    create: protectedProcedure
      .input(z.object({
        nom: z.string().min(1),
        prenom: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
        telephone: z.string().optional(),
        leadId: z.number().optional(),
        mandatId: z.number().optional(),
        hexaId: z.number().optional(),
        etape: z.enum(["welcome_call", "sigma_cash", "sigma_credit", "point_personnalise", "courtage", "recherche_bien"]).default("welcome_call"),
        responsable: z.string().optional(),
        // Champs enrichis
        formule: z.enum(["starter", "premium", "sdt_starter", "sdt_premium"]).optional(),
        modePaiement: z.enum(["comptant", "deux_fois", "cinquante_pourcent"]).optional(),
        montantFormule: z.number().int().positive().optional(),
        villeResidence: z.string().optional(),
        departement: z.string().optional(),
        codePostal: z.string().optional(),
        projetType: z.enum(["Rés. principale", "Invest. locatif", "RP + IL"]).optional(),
        notes: z.string().optional(),
        statut: z.enum(["actif", "en_pause", "cloture", "perdu"]).default("actif"),
      }))
      .mutation(async ({ input }) => {
        // Vérifier si un lead CRM avec cet email existe déjà (seulement si email fourni)
        if (input.email) {
          const existing = await getCrmLeadByEmail(input.email);
          if (existing) throw new TRPCError({ code: "CONFLICT", message: `Un lead avec l'email ${input.email} existe déjà dans le pipeline (${existing.prenom} ${existing.nom}).` });
        }
        const result = await createCrmLead({
          nom: input.nom,
          prenom: input.prenom,
          email: input.email ?? "",
          telephone: input.telephone ?? null,
          leadId: input.leadId ?? null,
          mandatId: input.mandatId ?? null,
          hexaId: input.hexaId ?? null,
          etape: input.etape,
          responsable: input.responsable ?? null,
          formule: input.formule ?? null,
          modePaiement: input.modePaiement ?? null,
          montantFormule: input.montantFormule ?? null,
          villeResidence: input.villeResidence ?? null,
          departement: input.departement ?? null,
          codePostal: input.codePostal ?? null,
          projetType: input.projetType ?? null,
          notes: input.notes ?? null,
          statut: input.statut,
        });
        // Alerte email + notif in-app : nouveau lead dans le pipeline
        const etapeLabel: Record<string, string> = { sigma_credit: "Sigma Crédit", sigma_cash: "Sigma Cash", welcome_call: "Welcome Call", point_personnalise: "Point Personnalisé", courtage: "Courtage", recherche_bien: "Recherche bien" };
        const destMap: Record<string, "Maria" | "Manon" | "Elodie" | "Hanna"> = { sigma_credit: "Hanna", sigma_cash: "Hanna", welcome_call: "Maria", point_personnalise: "Maria", courtage: "Manon", recherche_bien: "Elodie" };
        const dest = destMap[input.etape ?? "welcome_call"] ?? "Maria";
        sendCrmLeadAlert({ leadId: result.insertId, nom: input.nom, prenom: input.prenom, email: input.email ?? "", etape: input.etape, action: "nouveau_lead" }).catch(console.error);
        createNotification({ destinataire: dest, type: "nouveau_lead", titre: `Nouveau lead : ${input.prenom} ${input.nom}`, message: `Un nouveau lead a été ajouté à l'étape ${etapeLabel[input.etape ?? "welcome_call"] ?? input.etape}.`, lien: "/dashboard/pipeline" }).catch(console.error);
        createNotification({ destinataire: "Owner", type: "nouveau_lead", titre: `Nouveau lead : ${input.prenom} ${input.nom}`, message: `Un nouveau lead a été ajouté à l'étape ${etapeLabel[input.etape ?? "welcome_call"] ?? input.etape}.`, lien: "/dashboard/pipeline" }).catch(console.error);
        return { id: result.insertId, created: true };
      }),

    // Export CSV de tous les leads CRM
    exportCsv: protectedProcedure
      .query(async () => {
        const leads = await getAllCrmLeadsForExport();
        const ETAPE_LABELS: Record<string, string> = {
          sigma_credit: "Sigma Crédit",
          sigma_cash: "Sigma Cash",
          welcome_call: "Welcome Call",
          point_personnalise: "Point Personnalisé",
          courtage: "Courtage",
          recherche_bien: "Recherche bien",
        };
        const CONSEILLER_MAP: Record<string, string> = {
          sigma_credit: "Hanna",
          sigma_cash: "Hanna",
          welcome_call: "Maria",
          point_personnalise: "Maria",
          courtage: "Manon",
          recherche_bien: "Élodie",
        };
        const rows = leads.map((l: any) => ({
          id: l.id,
          prenom: l.prenom,
          nom: l.nom,
          email: l.email,
          telephone: l.telephone ?? "",
          etape: ETAPE_LABELS[l.etape] ?? l.etape,
          statut: l.statut,
          conseiller: CONSEILLER_MAP[l.etape] ?? "",
          date_creation: new Date(l.createdAt).toLocaleDateString("fr-FR"),
        }));
        return rows;
      }),

    // Créer depuis formulaire public (sans auth)
    createPublic: publicProcedure
      .input(z.object({
        nom: z.string().min(1),
        prenom: z.string().min(1),
        email: z.string().email(),
        telephone: z.string().optional(),
        leadId: z.number().optional(),
        hexaId: z.number().optional(),
        etape: z.enum(["welcome_call", "sigma_cash", "sigma_credit", "point_personnalise", "courtage", "recherche_bien"]).default("welcome_call"),
      }))
      .mutation(async ({ input }) => {
        const existing = await getCrmLeadByEmail(input.email);
        if (existing) {
          // Mettre à jour les liens si manquants
          const updates: Record<string, unknown> = {};
          if (input.leadId && !existing.leadId) updates.leadId = input.leadId;
          if (input.hexaId && !existing.hexaId) updates.hexaId = input.hexaId;
          if (Object.keys(updates).length > 0) await updateCrmLead(existing.id, updates as any);
          return { id: existing.id, created: false };
        }
        const result = await createCrmLead({
          nom: input.nom,
          prenom: input.prenom,
          email: input.email ?? "",
          telephone: input.telephone ?? null,
          leadId: input.leadId ?? null,
          hexaId: input.hexaId ?? null,
          etape: input.etape,
        });
        // Alerte email + notif in-app : nouveau lead depuis formulaire public
        const etapeLabelPub: Record<string, string> = { sigma_credit: "Sigma Crédit", sigma_cash: "Sigma Cash", welcome_call: "Welcome Call", point_personnalise: "Point Personnalisé", courtage: "Courtage", recherche_bien: "Recherche bien" };
        const destMapPub: Record<string, "Maria" | "Manon" | "Elodie" | "Hanna"> = { sigma_credit: "Hanna", sigma_cash: "Hanna", welcome_call: "Maria", point_personnalise: "Maria", courtage: "Manon", recherche_bien: "Elodie" };
        const destPub = destMapPub[input.etape ?? "welcome_call"] ?? "Maria";
        sendCrmLeadAlert({ leadId: result.insertId, nom: input.nom, prenom: input.prenom, email: input.email ?? "", etape: input.etape, action: "nouveau_lead" }).catch(console.error);
        createNotification({ destinataire: destPub, type: "nouveau_lead", titre: `Nouveau lead : ${input.prenom} ${input.nom}`, message: `Un nouveau lead a été ajouté à l'étape ${etapeLabelPub[input.etape ?? "welcome_call"] ?? input.etape}.`, lien: "/dashboard/pipeline" }).catch(console.error);
        createNotification({ destinataire: "Owner", type: "nouveau_lead", titre: `Nouveau lead : ${input.prenom} ${input.nom}`, message: `Formulaire public — étape ${etapeLabelPub[input.etape ?? "welcome_call"] ?? input.etape}.`, lien: "/dashboard/pipeline" }).catch(console.error);
        return { id: result.insertId, created: true };
      }),
    // Lister les leads CRMM (Kanban + liste)
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        etape: z.string().optional(),
        statut: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getCrmLeads(input ?? {});
      }),

    // Détail d'un lead avec notes et données agrégées
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lead = await getCrmLeadById(input.id);
        if (!lead) return null;
        const noteHistory = await getCrmNotesByLeadId(input.id);
        // Joindre le mandat de recherche si lié (budget + critères pour Élodie)
        let mandat = null;
        if ((lead as any).mandatId) {
          mandat = await getMandatById((lead as any).mandatId);
        }
        // Renommer le champ texte 'notes' en 'globalNotes' pour éviter la collision avec le tableau noteHistory
        const { notes: globalNotes, ...leadWithoutNotes } = lead as any;
        return { ...leadWithoutNotes, globalNotes, notes: noteHistory, mandat };
      }),

    // Mettre à jour un lead (champs, étape, statut, responsable, suivi)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        etape: z.enum(["welcome_call", "sigma_cash", "sigma_credit", "point_personnalise", "courtage", "recherche_bien"]).optional(),
        statut: z.enum(["actif", "en_pause", "cloture", "perdu"]).optional(),
        responsable: z.string().optional(),
        notes: z.string().optional(),
        // Welcome Call (Maria)
        welcomeCallFait: z.boolean().optional(),
        etatCivilRempli: z.boolean().optional(),
        mandatRempli: z.boolean().optional(),
        tableauCourtageRempli: z.boolean().optional(),
        accesPodia: z.boolean().optional(),
        documentsDeposes: z.boolean().optional(),
        avisDepose: z.boolean().optional(),
        avisStatut: z.enum(["en_attente", "depose", "pas_davis"]).optional(),
        avisNote: z.string().optional(),
        discoursClair: z.boolean().optional(),
        // Point Personnalisé (Maria)
        avisRetourExp: z.boolean().optional(),
        enveloppeOk: z.boolean().optional(),
        mandatSigne: z.boolean().optional(),
        // Courtage
        courtierAssigne: z.string().optional(),
        enveloppeValidee: z.number().optional(),
        enveloppeDate: z.string().optional(),
        // Recherche bien
        agentAssigne: z.string().optional(),
        nbBiensPresentes: z.number().optional(),
        offreAcceptee: z.boolean().optional(),
        // Formule & paiement
        formule: z.enum(["starter", "premium", "sdt_starter", "sdt_premium"]).optional(),
        modePaiement: z.enum(["comptant", "deux_fois", "cinquante_pourcent"]).optional(),
        montantFormule: z.number().optional(),
        // Liens modules
        leadId: z.number().optional(),
        mandatId: z.number().optional(),
        hexaId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        // Récupérer l'ancienne étape avant mise à jour
        let ancienneEtape: string | undefined;
        if (data.etape) {
          const existing = await getCrmLeadById(id);
          ancienneEtape = existing?.etape ?? undefined;
        }
        // Récupérer l'ancienne assignation avant mise à jour (pour détecter les changements)
        let ancienCourtier: string | undefined;
        let ancienAgent: string | undefined;
        let ancienResponsable: string | undefined;
        if (data.courtierAssigne !== undefined || data.agentAssigne !== undefined || data.responsable !== undefined) {
          const existingForAssign = await getCrmLeadById(id);
          ancienCourtier = (existingForAssign as any)?.courtierAssigne ?? undefined;
          ancienAgent = (existingForAssign as any)?.agentAssigne ?? undefined;
          ancienResponsable = (existingForAssign as any)?.responsable ?? undefined;
        }
        await updateCrmLead(id, data as any);
        // Notification + timeline sur assignation courtier
        if (data.courtierAssigne !== undefined && data.courtierAssigne !== ancienCourtier) {
          const leadForAssign = await getCrmLeadById(id);
          if (leadForAssign) {
            const auteurAssign = ctx.user?.name ?? "Système";
            const msgCourtier = data.courtierAssigne
              ? `${auteurAssign} a assigné le courtier ${data.courtierAssigne} au dossier de ${leadForAssign.prenom} ${leadForAssign.nom}`
              : `${auteurAssign} a retiré le courtier du dossier de ${leadForAssign.prenom} ${leadForAssign.nom}`;
            // Notif in-app Manon + Owner
            createNotification({ destinataire: "Manon", type: "assignation", titre: `Courtier assigné : ${leadForAssign.prenom} ${leadForAssign.nom}`, message: msgCourtier, lien: "/dashboard/pipeline" }).catch(console.error);
            createNotification({ destinataire: "Owner", type: "assignation", titre: `Courtier assigné : ${leadForAssign.prenom} ${leadForAssign.nom}`, message: msgCourtier, lien: "/dashboard/pipeline" }).catch(console.error);
            // Notif in-app au courtier lui-même
            if (data.courtierAssigne) {
              (async () => {
                try {
                  const db = await getDb();
                  if (db) {
                    const [courtier] = await db.select().from(courtiersTable)
                      .where(eq(courtiersTable.nom, data.courtierAssigne!.split(" ").slice(-1)[0] ?? ""))
                      .limit(1);
                    // Recherche plus large par nom complet
                    const allCourtiers = await db.select().from(courtiersTable);
                    const courtierMatch = allCourtiers.find((c: any) => {
                      const fullName = `${c.prenom ?? ""} ${c.nom}`.trim().toLowerCase();
                      return fullName === (data.courtierAssigne ?? "").toLowerCase();
                    });
                    if (courtierMatch?.email) {
                      await db.insert(notificationsInAppTable).values({
                        destinataireEmail: courtierMatch.email,
                        type: "nouveau_dossier_assigne",
                        titre: `Nouveau dossier CRM assigné`,
                        message: `${auteurAssign} vous a assigné le dossier de ${leadForAssign.prenom} ${leadForAssign.nom}`,
                        lien: `/dashboard/courtier`,
                        lu: false,
                        createdAt: Date.now(),
                      });
                    }
                  }
                } catch (e) { console.error("Notif courtier CRM:", e); }
              })();
            }
            // Timeline
            addLeadActivity({ crmLeadId: id, type: "champ_modifie", auteur: auteurAssign, titre: data.courtierAssigne ? `Courtier assigné : ${data.courtierAssigne}` : "Courtier retiré", contenu: msgCourtier }).catch(console.error);
            // Mettre à jour le statutCourtage : 'effectue' si courtier assigné, 'en_cours' si retiré
            try {
              const db2 = await getDb();
              if (db2) {
                await db2.update(crmLeads)
                  .set({ statutCourtage: data.courtierAssigne ? "effectue" : "en_cours" } as any)
                  .where(eq(crmLeads.id, id));
              }
            } catch (e) { console.error("statutCourtage update:", e); }
          }
        }
        // Notification + timeline sur assignation agent immo
        if (data.agentAssigne !== undefined && data.agentAssigne !== ancienAgent) {
          const leadForAssign = await getCrmLeadById(id);
          if (leadForAssign) {
            const auteurAssign = ctx.user?.name ?? "Système";
            const msgAgent = data.agentAssigne
              ? `${auteurAssign} a assigné l'agent ${data.agentAssigne} au dossier de ${leadForAssign.prenom} ${leadForAssign.nom}`
              : `${auteurAssign} a retiré l'agent du dossier de ${leadForAssign.prenom} ${leadForAssign.nom}`;
            // Notif in-app Elodie + Owner
            createNotification({ destinataire: "Elodie", type: "assignation", titre: `Agent assigné : ${leadForAssign.prenom} ${leadForAssign.nom}`, message: msgAgent, lien: "/dashboard/pipeline" }).catch(console.error);
            createNotification({ destinataire: "Owner", type: "assignation", titre: `Agent assigné : ${leadForAssign.prenom} ${leadForAssign.nom}`, message: msgAgent, lien: "/dashboard/pipeline" }).catch(console.error);
            // Notif in-app à l'agent lui-même
            if (data.agentAssigne) {
              (async () => {
                try {
                  const db = await getDb();
                  if (db) {
                    const allAgents = await db.select().from(ambassadeursTable);
                    const agentMatch = allAgents.find((a: any) => {
                      const fullName = `${a.prenom ?? ""} ${a.nom}`.trim().toLowerCase();
                      return fullName === (data.agentAssigne ?? "").toLowerCase();
                    });
                    if (agentMatch?.email) {
                      await db.insert(notificationsInAppTable).values({
                        destinataireEmail: agentMatch.email,
                        type: "nouveau_dossier_assigne",
                        titre: `Nouveau dossier immobilier assigné`,
                        message: `${auteurAssign} vous a assigné le dossier de ${leadForAssign.prenom} ${leadForAssign.nom}`,
                        lien: `/portail`,
                        lu: false,
                        createdAt: Date.now(),
                      });
                    }
                  }
                } catch (e) { console.error("Notif agent CRM:", e); }
              })();
            }
            // Timeline
            addLeadActivity({ crmLeadId: id, type: "champ_modifie", auteur: auteurAssign, titre: data.agentAssigne ? `Agent assigné : ${data.agentAssigne}` : "Agent retiré", contenu: msgAgent }).catch(console.error);
          }
        }
        // Notification + timeline sur changement de responsable (Team interne)
        if (data.responsable !== undefined && data.responsable !== ancienResponsable && data.responsable) {
          const leadForResp = await getCrmLeadById(id);
          if (leadForResp) {
            const auteurResp = ctx.user?.name ?? "Système";
            const msgResp = `${auteurResp} a assigné ${data.responsable} comme responsable du dossier de ${leadForResp.prenom} ${leadForResp.nom}`;
            const destResp = data.responsable as "Maria" | "Manon" | "Elodie" | "Hanna";
            createNotification({ destinataire: destResp, type: "assignation", titre: `Dossier assigné : ${leadForResp.prenom} ${leadForResp.nom}`, message: msgResp, lien: "/dashboard/pipeline" }).catch(console.error);
            createNotification({ destinataire: "Owner", type: "assignation", titre: `Responsable assigné : ${leadForResp.prenom} ${leadForResp.nom}`, message: msgResp, lien: "/dashboard/pipeline" }).catch(console.error);
            addLeadActivity({ crmLeadId: id, type: "champ_modifie", auteur: auteurResp, titre: `Responsable : ${ancienResponsable ?? "—"} → ${data.responsable}`, contenu: msgResp }).catch(console.error);
          }
        }
        // Alerte email + notif in-app si changement d'étape
        if (data.etape && ancienneEtape && data.etape !== ancienneEtape) {
          const lead = await getCrmLeadById(id);
          if (lead) {
            const etapeLabel2: Record<string, string> = { sigma_credit: "Sigma Crédit", sigma_cash: "Sigma Cash", welcome_call: "Welcome Call", point_personnalise: "Point Personnalisé", courtage: "Courtage", recherche_bien: "Recherche bien" };
            const destMap2: Record<string, "Maria" | "Manon" | "Elodie" | "Hanna"> = { sigma_credit: "Hanna", sigma_cash: "Hanna", welcome_call: "Maria", point_personnalise: "Maria", courtage: "Manon", recherche_bien: "Elodie" };
            const dest2 = destMap2[data.etape] ?? "Maria";
            sendCrmLeadAlert({ leadId: id, nom: lead.nom, prenom: lead.prenom, email: lead.email, etape: data.etape, ancienneEtape, action: "changement_etape" }).catch(console.error);
            createNotification({ destinataire: dest2, type: "changement_etape", titre: `Lead déplacé : ${lead.prenom} ${lead.nom}`, message: `Étape : ${etapeLabel2[ancienneEtape] ?? ancienneEtape} → ${etapeLabel2[data.etape] ?? data.etape}`, lien: "/dashboard/pipeline" }).catch(console.error);
            createNotification({ destinataire: "Owner", type: "changement_etape", titre: `Lead déplacé : ${lead.prenom} ${lead.nom}`, message: `Étape : ${etapeLabel2[ancienneEtape] ?? ancienneEtape} → ${etapeLabel2[data.etape] ?? data.etape}`, lien: "/dashboard/pipeline" }).catch(console.error);
            // Log automatique dans la timeline
            const auteurEtape = ctx.user?.name ?? "Système";
            addLeadActivity({ crmLeadId: id, type: "etape_changee", auteur: auteurEtape, titre: `Étape : ${etapeLabel2[ancienneEtape] ?? ancienneEtape} → ${etapeLabel2[data.etape] ?? data.etape}`, meta: `${ancienneEtape} → ${data.etape}` }).catch(console.error);
            // Email au lead avec lien RDV Elodie si passage en recherche_bien
            if (data.etape === "recherche_bien" && lead.email) {
              sendPointImmobilierInvitation({
                nomLead: `${lead.prenom} ${lead.nom}`,
                emailLead: lead.email,
                rdvUrl: "https://www.sigmafactory.org/rdv/point-immobilier",
              }).catch(console.error);
              // Log email envoyé
              addLeadActivity({ crmLeadId: id, type: "email_envoye", auteur: "Système", titre: "Email Point Immobilier envoyé au lead", contenu: `Invitation à prendre RDV avec Élodie envoyée à ${lead.email}` }).catch(console.error);
            }
          }
        }
        return { success: true };
      }),

    // Upload du PDF mandat signé
    uploadMandatSigne: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        fileBase64: z.string(),   // PDF encodé en base64
        fileName: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `mandats-signes/${input.crmLeadId}_${Date.now()}_${safeName}`;
        const { url } = await storagePut(key, buffer, "application/pdf");
        const db = await getDb();
        // Calculer le numéro de version (nb de versions existantes + 1)
        const existingVersions = await db!.select().from(mandatVersions)
          .where(eq(mandatVersions.crmLeadId, input.crmLeadId));
        const nextVersion = existingVersions.length + 1;
        // Enregistrer dans l'historique des versions
        await db!.insert(mandatVersions).values({
          crmLeadId: input.crmLeadId,
          url,
          fileKey: key,
          nom: input.fileName,
          version: nextVersion,
          uploadePar: ctx.user?.name ?? "Direction",
        });
        // Mettre à jour la fiche CRM : URL PDF + mandatSigne = true (toujours pointer vers la dernière version)
        await db!.update(crmLeads)
          .set({ mandatSignePdfUrl: url, mandatSigne: true } as any)
          .where(eq(crmLeads.id, input.crmLeadId));
        // Log timeline
        addLeadActivity({
          crmLeadId: input.crmLeadId,
          type: "document",
          auteur: ctx.user?.name ?? "Direction",
          titre: `Mandat de recherche signé — version ${nextVersion}`,
          contenu: `PDF : ${input.fileName}`,
        }).catch(console.error);
        return { success: true, url, version: nextVersion };
      }),

    // Lister l'historique des versions du mandat signé
    listMandatVersions: protectedProcedure
      .input(z.object({ crmLeadId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        return db!.select().from(mandatVersions)
          .where(eq(mandatVersions.crmLeadId, input.crmLeadId))
          .orderBy(desc(mandatVersions.version));
      }),

    // Ajouter une note
    addNote: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        etape: z.string(),
        auteur: z.string().optional(),
        contenu: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const auteur = input.auteur ?? ctx.user?.name ?? "Équipe";
        await addCrmNote({
          crmLeadId: input.crmLeadId,
          etape: input.etape,
          auteur,
          contenu: input.contenu,
        });
        // Alerte email + notif in-app : nouvelle note
        const lead = await getCrmLeadById(input.crmLeadId);
        if (lead) {
          const destMap3: Record<string, "Maria" | "Manon" | "Elodie" | "Hanna"> = { sigma_credit: "Hanna", sigma_cash: "Hanna", welcome_call: "Maria", point_personnalise: "Maria", courtage: "Manon", recherche_bien: "Elodie" };
          const dest3 = destMap3[lead.etape] ?? "Maria";
          sendCrmLeadAlert({ leadId: input.crmLeadId, nom: lead.nom, prenom: lead.prenom, email: lead.email, etape: lead.etape, action: "nouvelle_note", noteContenu: input.contenu, noteAuteur: auteur }).catch(console.error);
          createNotification({ destinataire: dest3, type: "nouvelle_note", titre: `Note sur ${lead.prenom} ${lead.nom}`, message: `${auteur} : ${input.contenu.slice(0, 100)}${input.contenu.length > 100 ? "..." : ""}`, lien: "/dashboard/pipeline" }).catch(console.error);
          createNotification({ destinataire: "Owner", type: "nouvelle_note", titre: `Note sur ${lead.prenom} ${lead.nom}`, message: `${auteur} : ${input.contenu.slice(0, 100)}${input.contenu.length > 100 ? "..." : ""}`, lien: "/dashboard/pipeline" }).catch(console.error);
        }
        return { success: true };
      }),
    // Supprimer un lead CRM (admin/direction)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteCrmLead(input.id);
        return { success: true };
      }),
    // Envoyer manuellement l'email Point Immobilier à un lead
    sendPointImmobilierEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const lead = await getCrmLeadById(input.id);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead introuvable" });
        if (!lead.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce lead n'a pas d'adresse email" });
        const sent = await sendPointImmobilierInvitation({
          nomLead: `${lead.prenom} ${lead.nom}`,
          emailLead: lead.email,
          rdvUrl: "https://www.sigmafactory.org/rdv/point-immobilier",
        });
        if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erreur lors de l'envoi de l'email" });
        // Log automatique dans la timeline
        addLeadActivity({ crmLeadId: input.id, type: "email_envoye", auteur: "Système", titre: "Email Point Immobilier envoyé manuellement", contenu: `Email envoyé à ${lead.email}` }).catch(console.error);
        return { success: true, email: lead.email };
      }),
    // Envoyer un email de test Point Immobilier (depuis la page d'aperçu)
    sendPointImmobilierEmailTest: protectedProcedure
      .input(z.object({ email: z.string().email(), nom: z.string().optional() }))
      .mutation(async ({ input }) => {
        const sent = await sendPointImmobilierInvitation({
          nomLead: input.nom ?? "Client Test",
          emailLead: input.email,
          rdvUrl: "https://www.sigmafactory.org/rdv/point-immobilier",
        });
        if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erreur lors de l'envoi de l'email" });
        return { success: true, email: input.email };
      }),
    // Envoyer manuellement l'email d'invitation mandat à un lead ancien (rattrapage)
    sendMandatInvitation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const lead = await getCrmLeadById(input.id);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead introuvable" });
        if (!lead.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce lead n'a pas d'adresse email" });
        const nomAffiche = lead.nom ? lead.nom.toUpperCase() : "CLIENT";
        const BASE_URL = "https://www.sigmafactory.org";
        const params = new URLSearchParams({
          nom: lead.nom || "",
          prenom: lead.prenom || "",
          email: lead.email || "",
          tel: lead.telephone || "",
          budget: lead.budgetMax ? String(lead.budgetMax) : "",
          leadId: String(lead.id),
        });
        const mandatUrl = `${BASE_URL}/mandat?${params.toString()}`;
        const subject = `Famille ${nomAffiche} — Pré-remplissez votre Mandat de Recherche — Sigma Factory`;
        const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div><div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pôle Immobilier</div></div><div style="padding:36px"><h2 style="margin:0 0 6px;color:#fff">Votre Mandat de Recherche est prêt à compléter</h2><p style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Étape Recherche de Bien — Sigma Factory</p><p style="color:#aaa;font-size:14px;line-height:1.8;margin:0 0 20px">Madame, Monsieur <strong style="color:#fff">${nomAffiche}</strong>,<br><br>Votre dossier avance ! Dans le cadre de votre accompagnement Sigma Factory, nous vous invitons à <strong style="color:#fff">pré-remplir votre Mandat de Recherche et de Négociation</strong> afin qu'Élodie, votre conseillère immobilière dédiée, puisse démarrer officiellement la recherche de votre bien.<br><br>Une fois vos informations renseignées, vous recevrez le <strong style="color:#C9A84C">vrai mandat à signer électroniquement</strong> via notre plateforme officielle.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:20px 24px;margin:0 0 28px"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Ce que vous allez renseigner</div><div style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px">Mandat de Recherche et de Négociation</div><div style="color:#aaa;font-size:13px;line-height:1.8">• Vos coordonnées et celles de votre co-acquéreur (si applicable)<br>• La description de votre bien idéal<br>• Votre budget maximum<br>• Durée : <strong style="color:#ddd">12 mois</strong> — Honoraires : <strong style="color:#ddd">5% H.T.</strong></div></div><div style="text-align:center;margin:28px 0"><a href="${mandatUrl}" style="background:#C9A84C;color:#000;text-decoration:none;padding:16px 36px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">PRÉ-REMPLIR MON MANDAT</a></div><p style="color:#666;font-size:12px;line-height:1.6;text-align:center;margin:0 0 24px">Le formulaire est pré-rempli avec vos informations.<br>Il vous suffit de vérifier et compléter la description de votre bien.</p><div style="border-top:1px solid #222;margin:24px 0"></div><div style="background:#0a0a0a;border:1px solid #222;padding:16px 20px;margin-bottom:20px"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Après validation du formulaire</div><div style="color:#fff;font-size:14px;font-weight:bold;margin-bottom:4px">Point Immobilier avec Élodie — 45 min</div><div style="color:#aaa;font-size:13px">Élodie vous contactera pour fixer votre premier rendez-vous de recherche.</div></div><p style="color:#555;font-size:12px;line-height:1.6;margin:0">Une question ? <a href="mailto:elodie@sigmafactory.fr" style="color:#C9A84C">elodie@sigmafactory.fr</a></p></div><div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center;line-height:1.6">Sigma Factory — Pôle Immobilier<br><a href="https://www.sigmafactory.fr/politique-de-confidentialite-sigma-factory/" style="color:#555;text-decoration:none">Politique de confidentialité</a> &nbsp;·&nbsp; <a href="mailto:contact@sigmafactory.fr" style="color:#555;text-decoration:none">contact@sigmafactory.fr</a></div></div></body></html>`;
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
          to: lead.email,
          subject,
          html,
        });
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        addLeadActivity({ crmLeadId: input.id, type: "email_envoye", auteur: "Système", titre: "Invitation mandat envoyée manuellement", contenu: `Email envoyé à ${lead.email}` }).catch(console.error);
        return { success: true, email: lead.email };
      }),

    // ─── TIMELINE ACTIVITÉS ──────────────────────────────────────────────────
    // Lister les activités d'un lead (timeline)
    getActivities: protectedProcedure
      .input(z.object({ crmLeadId: z.number() }))
      .query(async ({ input }) => {
        return getLeadActivities(input.crmLeadId);
      }),
    // Ajouter une note/activité manuelle
    addActivity: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        type: z.enum(["note", "email_envoye", "rdv_pris", "rdv_confirme", "etape_changee", "champ_modifie", "document", "appel", "autre"]),
        auteur: z.string(),
        titre: z.string(),
        contenu: z.string().optional(),
        meta: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await addLeadActivity(input);
        return { success: true };
      }),
    // Supprimer une activité (admin/direction uniquement)
    deleteActivity: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteLeadActivity(input.id);
        return { success: true };
      }),

    // ── Documents CRM ──
    // Uploader un document pour un lead CRM
    uploadDocument: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        fileBase64: z.string(),
        nom: z.string(),
        mimeType: z.string(),
        taille: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ext = input.nom.split(".").pop() ?? "bin";
        const fileKey = `crm-lead-docs/${input.crmLeadId}/${nanoid(10)}.${ext}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const db = await getDb();
        await db!.insert(crmLeadDocuments).values({
          crmLeadId: input.crmLeadId,
          url,
          fileKey,
          nom: input.nom,
          taille: input.taille ?? null,
          mimeType: input.mimeType,
          uploadePar: ctx.user.name ?? ctx.user.email ?? "inconnu",
        });
        return { url, fileKey, nom: input.nom };
      }),

    // Lister les documents d'un lead CRM
    listDocuments: protectedProcedure
      .input(z.object({ crmLeadId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const docs = await db!.select().from(crmLeadDocuments)
          .where(eq(crmLeadDocuments.crmLeadId, input.crmLeadId))
          .orderBy(desc(crmLeadDocuments.uploadedAt));
        return docs;
      }),

    // Supprimer un document CRM
    deleteDocument: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db!.delete(crmLeadDocuments).where(eq(crmLeadDocuments.id, input.id));
        return { success: true };
      }),
  }),
  // ─── CALENDRIERR ──────────────────────────────────────────────────────────────────────────────────
  calendar: router({
    // Lister les tâches (avec filtres optionnels)
    list: protectedProcedure
      .input(z.object({
        assigneA: z.enum(["Maria", "Manon", "Elodie", "Hanna", "Marie"]).optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        statut: z.enum(["a_faire", "en_cours", "termine"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const tasks = await getCalendarTasks(input ?? {});
        return tasks.map(t => ({
          ...t,
          dateDebut: t.dateDebut.toISOString(),
          dateFin: t.dateFin ? t.dateFin.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }));
      }),

    // Créer une tâche
    create: protectedProcedure
      .input(z.object({
        titre: z.string().min(1),
        description: z.string().optional(),
        assigneA: z.enum(["Maria", "Manon", "Elodie", "Hanna", "Marie"]),
        dateDebut: z.string(), // ISO string
        dateFin: z.string().optional(),
        touteJournee: z.boolean().default(false),
        crmLeadId: z.number().optional(),
        rappelEmail: z.boolean().default(false),
        rappelMinutesAvant: z.number().default(30),
        statut: z.enum(["a_faire", "en_cours", "termine"]).default("a_faire"),
      }))
      .mutation(async ({ input, ctx }) => {
        const creePar = ctx.user?.name ?? "Équipe";
        const dateDebutObj = new Date(input.dateDebut);
        const result = await createCalendarTask({
          titre: input.titre,
          description: input.description,
          assigneA: input.assigneA,
          dateDebut: dateDebutObj,
          dateFin: input.dateFin ? new Date(input.dateFin) : undefined,
          touteJournee: input.touteJournee,
          crmLeadId: input.crmLeadId,
          rappelEmail: input.rappelEmail,
          rappelMinutesAvant: input.rappelMinutesAvant,
          statut: input.statut,
          creePar,
        });
        // Alerte email + notif in-app : nouvelle tâche assignée
        const calDestMap: Record<string, "Maria" | "Manon" | "Elodie" | "Hanna"> = { Maria: "Maria", Manon: "Manon", Elodie: "Elodie", Hanna: "Hanna" };
        const calDest = calDestMap[input.assigneA] ?? "Maria";
        sendCalendarTaskAlert({ taskId: (result as any)?.insertId ?? 0, titre: input.titre, description: input.description, assigneA: input.assigneA, dateDebut: dateDebutObj, dateFin: input.dateFin ? new Date(input.dateFin) : null, creePar }).catch(console.error);
        createNotification({ destinataire: calDest, type: "nouvelle_tache", titre: `Nouvelle tâche : ${input.titre}`, message: `Assignée par ${creePar} pour le ${dateDebutObj.toLocaleDateString("fr-FR")}`, lien: "/dashboard/calendar" }).catch(console.error);
        createNotification({ destinataire: "Owner", type: "nouvelle_tache", titre: `Nouvelle tâche : ${input.titre}`, message: `Assignée à ${input.assigneA} par ${creePar} pour le ${dateDebutObj.toLocaleDateString("fr-FR")}`, lien: "/dashboard/calendar" }).catch(console.error);
        return { success: true, insertId: (result as any)?.insertId };
      }),

    // Mettre à jour une tâche
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titre: z.string().min(1).optional(),
        description: z.string().optional(),
        assigneA: z.enum(["Maria", "Manon", "Elodie", "Hanna", "Marie"]).optional(),
        dateDebut: z.string().optional(),
        dateFin: z.string().optional(),
        touteJournee: z.boolean().optional(),
        crmLeadId: z.number().optional(),
        rappelEmail: z.boolean().optional(),
        rappelMinutesAvant: z.number().optional(),
        statut: z.enum(["a_faire", "en_cours", "termine"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, dateDebut, dateFin, ...rest } = input;
        // Récupérer la tâche avant la mise à jour pour savoir si on passe à terminé
        const taskBefore = await getCalendarTaskById(id);
        await updateCalendarTask(id, {
          ...rest,
          ...(dateDebut ? { dateDebut: new Date(dateDebut) } : {}),
          ...(dateFin ? { dateFin: new Date(dateFin) } : {}),
        });
        // Enregistrer l'historique si le statut change
        if (input.statut && taskBefore && input.statut !== taskBefore.statut) {
          const mysql2 = await import("mysql2/promise");
          const histConn = await mysql2.default.createConnection(process.env.DATABASE_URL!);
          await histConn.execute(
            "INSERT INTO calendar_task_history (taskId, statut, changedBy) VALUES (?, ?, ?)",
            [id, input.statut, ctx.user?.name ?? ctx.user?.email ?? "Inconnu"]
          );
          await histConn.end();
        }
        // Si on marque terminé et que la tâche avait un créateur, lui envoyer une notif
        if (input.statut === "termine" && taskBefore && taskBefore.creePar) {
          // Chercher l'email du créateur dans les users
          const db = await (await import("./db")).getDb();
          if (db) {
            const { users } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const creatorRows = await db.select().from(users).where(eq(users.name, taskBefore.creePar)).limit(1);
            const creator = creatorRows[0];
            if (creator?.email) {
              sendTacheTermineeNotif({
                titre: taskBefore.titre,
                assigneA: taskBefore.assigneA,
                dateDebut: new Date(taskBefore.dateDebut),
                creePar: taskBefore.creePar,
                destinataireEmail: creator.email,
                destinataireNom: creator.name ?? creator.email,
              }).catch(console.error);
              // Notification in-app ciblée par email
              const roleCreator = creator.role ?? "user";
              const destType: "Courtier" | "Agent" = roleCreator === "courtier" ? "Courtier" : "Agent";
              createNotification({
                destinataire: destType,
                destinataireEmail: creator.email,
                type: "statut_change",
                titre: `✅ Votre demande a été traitée`,
                message: `"${taskBefore.titre}" a été marquée comme terminée par ${taskBefore.assigneA}.`,
                lien: "/portail",
              }).catch(console.error);
            }
          }
        }
        return { success: true };
      }),

    // Historique des statuts d'une tâche
    getHistory: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        const mysql2 = await import("mysql2/promise");
        const conn = await mysql2.default.createConnection(process.env.DATABASE_URL!);
        const [rows] = await conn.execute(
          "SELECT * FROM calendar_task_history WHERE taskId = ? ORDER BY changedAt ASC",
          [input.taskId]
        ) as any[];
        await conn.end();
        return rows as Array<{ id: number; taskId: number; statut: string; changedBy: string; changedAt: string }>;
      }),

    // Supprimer une tâche
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCalendarTask(input.id);
        return { success: true };
      }),

    // Mes demandes (pour courtiers/agents dans leur portail)
    mesDemandes: protectedProcedure
      .input(z.object({
        assigneA: z.enum(["Maria", "Manon", "Elodie", "Hanna", "Marie"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const userName = ctx.user?.name ?? "";
        const tasks = await getCalendarTasks({
          creePar: userName,
          ...(input?.assigneA ? { assigneA: input.assigneA } : {}),
        });
        // Trier par date décroissante (les plus récentes en premier)
        return tasks.sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
      }),

      // Créneaux bloqués (accès public pour PriseRdv)
    getBlockedSlotsPublic: publicProcedure
      .input(z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getBlockedSlots(input?.dateFrom, input?.dateTo);
      }),

    // ─── PRISE DE RDV PUBLIQUE ────────────────────────────────────────────
    bookRdv: publicProcedure
      .input(z.object({
        typeRdv: z.enum(["welcome_call", "point_personnalise", "point_immobilier"]),
        nom: z.string().min(1),
        prenom: z.string().min(1),
        email: z.string().email(),
        telephone: z.string().min(1),
        message: z.string().optional(),
        dateDebut: z.string(),
        dateFin: z.string(),
      }))
      .mutation(async ({ input }) => {
        const typeLabel = input.typeRdv === "welcome_call" ? "Welcome Call" : input.typeRdv === "point_personnalise" ? "Point Personnalisé" : "Point Immobilier";
        const assigneA: "Maria" | "Elodie" = input.typeRdv === "point_immobilier" ? "Elodie" : "Maria";
        const dateDebutObj = new Date(input.dateDebut);
        const dateFinObj = new Date(input.dateFin);
        const nomComplet = `${input.prenom} ${input.nom}`;
        const description = `📞 ${typeLabel} avec ${nomComplet}\nEmail : ${input.email}\nTél : ${input.telephone}${input.message ? `\n\nMessage : ${input.message}` : ""}`        // ─── VÉRIFICATION ANTI-DOUBLON ──────────────────────────────────────────────
        // Vérifier qu'aucun RDV n'existe déjà sur ce créneau pour ce membre
        // Marge de ±15 minutes pour éviter les collisions de créneaux adjacents
        const ANTI_DOUBLON_MARGIN_MS = 15 * 60 * 1000; // 15 minutes
        const existingTasks = await getCalendarTasks({
          assigneA,
          from: new Date(dateDebutObj.getTime() - ANTI_DOUBLON_MARGIN_MS),
          to: new Date(dateDebutObj.getTime() + ANTI_DOUBLON_MARGIN_MS),
        });    if (existingTasks.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Ce créneau (${dateDebutObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}) est déjà réservé. Veuillez choisir un autre horaire.`,
          });
        }

        // Créer la tâche dans le calendrier (Maria ou Elodie selon le type)
        await createCalendarTask({
          titre: `${typeLabel} — ${nomComplet}`,
          description,
          assigneA,
          dateDebut: dateDebutObj,
          dateFin: dateFinObj,
          touteJournee: false,
          rappelEmail: true,
          rappelMinutesAvant: 30,
          statut: "a_faire",
          creePar: `${nomComplet} (lead)`,
        });

        // Notification in-app pour le membre assigné
        createNotification({
          destinataire: assigneA,
          type: "nouvelle_tache",
          titre: `Nouveau RDV : ${typeLabel}`,
          message: `${nomComplet} a pris un ${typeLabel} le ${dateDebutObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" })} à ${dateDebutObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}`,
          lien: "/dashboard/calendar",
        }).catch(console.error);

        // Email de confirmation au lead + alerte Maria
        sendRdvConfirmation({
          nomLead: nomComplet,
          emailLead: input.email,
          typeRdv: typeLabel,
          dateDebut: dateDebutObj,
          dateFin: dateFinObj,
          message: input.message,
        }).catch(console.error);
        // Log automatique dans la timeline si le lead existe dans le CRM
        getCrmLeadByEmail(input.email).then(lead => {
          if (lead) {
            addLeadActivity({
              crmLeadId: lead.id,
              type: "rdv_pris",
              auteur: nomComplet,
              titre: `RDV ${typeLabel} pris`,
              contenu: `Date : ${dateDebutObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" })} à ${dateDebutObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}${input.message ? `\nMessage : ${input.message}` : ""}`,
            }).catch(console.error);
          }
        }).catch(console.error);
        return { success: true };;
      }),

    // Procédure publique : retourner les heures déjà réservées pour un jour donné (anti-doublon côté client)
    getBookedSlotsByDate: publicProcedure
      .input(z.object({
        date: z.string(), // YYYY-MM-DD (en heure Paris)
        assigneA: z.enum(["Maria", "Elodie"]),
      }))
      .query(async ({ input }) => {
        // La date est en heure Paris — on cherche la journée entière en UTC
        // Paris = UTC+1 en hiver, UTC+2 en été. On prend une fenêtre large (UTC-2 à UTC+3) pour couvrir les deux.
        const [year, month, day] = input.date.split("-").map(Number);
        // Minuit Paris = 22h UTC (heure d'été) ou 23h UTC (heure d'hiver)
        // On prend de 21h UTC (j-1) à 23h UTC (j) pour couvrir toute la journée Paris
        const from = new Date(Date.UTC(year, month - 1, day - 1, 21, 0, 0));
        const to = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
        const tasks = await getCalendarTasks({ assigneA: input.assigneA, from, to });
        // Retourner les heures au format HH:MM en heure Paris
        return tasks.map(t => {
          const d = new Date(t.dateDebut);
          // Convertir en heure Paris pour correspondre à ce que le lead a sélectionné
          return d.toLocaleTimeString("fr-FR", {
            timeZone: "Europe/Paris",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        });
      }),

    // Lister les créneaux bloqués
    listBlockedSlots: protectedProcedure
      .input(z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getBlockedSlots(input?.dateFrom, input?.dateTo);
      }),

    // Créer un créneau bloqué
    addBlockedSlot: protectedProcedure
      .input(z.object({
        date: z.string(),
        heure: z.string().optional(),
        typeRdv: z.enum(["welcome_call", "point_personnalise", "point_immobilier", "tous"]).optional(),
        raison: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createBlockedSlot({
          date: input.date,
          heure: input.heure ?? null,
          typeRdv: input.typeRdv ?? null,
          raison: input.raison ?? null,
          creePar: ctx.user?.name ?? "Maria",
        });
        return { success: true };
      }),

    // Supprimer un créneau bloqué
    removeBlockedSlot: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBlockedSlot(input.id);
        return { success: true };
      }),

    // Générer un PDF de prévisualisation d'un bien pour validation avant envoi
    previewBienPdf: protectedProcedure
      .input(z.object({ bienId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const { biens } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [bien] = await db!.select().from(biens).where(eq(biens.id, input.bienId)).limit(1);
        if (!bien) throw new Error("Bien introuvable");

        const pdfBuffer = await generateBienPdf({
          reference: `SF-${String(bien.id).padStart(6, "0")}`,
          typeBien: bien.typeBien ?? "appartement",
          adresse: bien.adresse ?? "",
          ville: bien.ville ?? undefined,
          codePostal: bien.codePostal ?? undefined,
          surface: bien.surface ? Number(bien.surface) : undefined,
          nbPieces: bien.nbPieces ?? undefined,
          etage: bien.etage !== null && bien.etage !== undefined ? Number(bien.etage) : undefined,
          prix: bien.prix ? Number(bien.prix) : undefined,
          prixNetVendeur: bien.prixNetVendeur ? Number(bien.prixNetVendeur) : undefined,
          honorairesAgence: bien.honorairesAgence ? Number(bien.honorairesAgence) : undefined,
          description: bien.description ?? undefined,
          dpeLettre: bien.dpeLettre ?? undefined,
          dpeConso: bien.dpeValeur ? Number(bien.dpeValeur) : undefined,
          gesLettre: bien.gesLettre ?? undefined,
          gesConso: bien.gesValeur ? Number(bien.gesValeur) : undefined,
          chargesAnnuelles: bien.chargesAnnuelles ? Number(bien.chargesAnnuelles) : undefined,
          taxeFonciere: bien.taxeFonciere ? Number(bien.taxeFonciere) : undefined,
          anneeConstruction: bien.anneeConstruction ?? undefined,
          etatBien: bien.etatBien ?? undefined,
          balconTerrasse: bien.balcon ?? false,
          parkingGarage: bien.parking ?? false,
          cave: bien.cave ?? false,
          ascenseur: bien.ascenseur ?? false,
          calme: false,
          lumineux: false,
          // Photos depuis la base de données
          photos: (() => {
            const urls: string[] = [];
            if (bien.photoPrincipaleUrl) urls.push(bien.photoPrincipaleUrl);
            if (bien.photosUrls) {
              try {
                const extra = JSON.parse(bien.photosUrls) as string[];
                urls.push(...extra.filter((u) => u && u !== bien.photoPrincipaleUrl));
              } catch { /* ignore */ }
            }
            return urls;
          })(),
          // Signature fixe : toujours Élodie, jamais le nom de l'agent du bien
          agentNom: "Élodie",
          agentPoste: "Responsable Pôle Immo",
          agentEmail: "elodie@sigmafactory.fr",
          agentTelephone: undefined,
        });

        // Upload sur S3 et retourner l'URL
        const key = `bien-previews/SF-${bien.id}-preview-${Date.now()}.pdf`;
        const { url } = await storagePut(key, pdfBuffer, "application/pdf");
        return { url, bienId: bien.id, titre: bien.titre ?? `Bien SF-${bien.id}` };
      }),

    // Envoyer la fiche bien à un lead après validation manuelle
    proposerBienAuLead: protectedProcedure
      .input(z.object({
        bienId: z.number(),
        crmLeadId: z.number(),
        pdfUrl: z.string(),
        messagePersonnalise: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        const { biens, crmLeads } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [bien] = await db!.select().from(biens).where(eq(biens.id, input.bienId)).limit(1);
        const [lead] = await db!.select().from(crmLeads).where(eq(crmLeads.id, input.crmLeadId)).limit(1);
        if (!bien || !lead) throw new Error("Bien ou lead introuvable");

        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        const prixFmt = bien.prix ? `${Number(bien.prix).toLocaleString("fr-FR")} € FAI` : "Prix sur demande";
        const typeLabel = (bien.typeBien ?? "bien").charAt(0).toUpperCase() + (bien.typeBien ?? "bien").slice(1).replace(/_/g, " ");
        const surface = bien.surface ? `${bien.surface} m²` : "";
        const ville = bien.ville ?? bien.adresse ?? "";

        const messageHtml = input.messagePersonnalise
          ? `<p style="color:#333;font-size:15px;line-height:1.6">${input.messagePersonnalise.replace(/\n/g, "<br>")}</p>`
          : `<p style="color:#333;font-size:15px;line-height:1.6">Suite à notre échange, nous avons sélectionné pour vous un bien qui correspond à vos critères de recherche.</p>`;

        await resend.emails.send({
          from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
          to: lead.email,
          subject: `✨ Sigma Factory — Proposition de bien : ${typeLabel}${surface ? ` ${surface}` : ""}${ville ? ` à ${ville}` : ""}`,
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#fff">
              <div style="background:#0d0d0d;padding:28px 32px">
                <h1 style="color:#C9A84C;font-size:22px;margin:0;letter-spacing:2px">SIGMA FACTORY</h1>
                <p style="color:#888;font-size:11px;margin:6px 0 0">Votre conseillère immobilière</p>
              </div>
              <div style="padding:32px">
                <h2 style="color:#0d0d0d;font-size:18px;margin:0 0 16px">Bonjour ${lead.prenom},</h2>
                ${messageHtml}
                <div style="background:#f9f6ee;border-left:3px solid #C9A84C;padding:16px 20px;margin:20px 0">
                  <p style="color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Bien sélectionné</p>
                  <p style="color:#0d0d0d;font-size:17px;font-weight:bold;margin:0">${typeLabel}${surface ? ` &mdash; ${surface}` : ""}</p>
                  ${ville ? `<p style="color:#555;font-size:13px;margin:4px 0 0">${ville}</p>` : ""}
                  <p style="color:#C9A84C;font-size:20px;font-weight:bold;margin:12px 0 0">${prixFmt}</p>
                </div>
                <a href="${input.pdfUrl}" style="display:inline-block;background:#C9A84C;color:#0d0d0d;padding:14px 28px;text-decoration:none;font-weight:bold;font-size:14px;margin:8px 0 24px">Télécharger la fiche complète (PDF)</a>
                <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:16px">Pour toute question, répondez directement à cet email ou contactez Maria au <strong>maria@sigmaipf.fr</strong>.</p>
              </div>
              <div style="background:#0d0d0d;padding:14px 32px;text-align:center">
                <p style="color:#C9A84C;font-size:10px;margin:0;letter-spacing:1px">SIGMA FACTORY &mdash; Document confidentiel &mdash; Réservé à ${lead.prenom} ${lead.nom}</p>
              </div>
            </div>
          `,
        });

        // Notifier l'équipe interne
        await createNotification({
          destinataire: "Elodie",
          type: "nouvelle_tache",
          titre: `Fiche bien envoyée à ${lead.prenom} ${lead.nom}`,
          message: `${typeLabel}${surface ? ` ${surface}` : ""} — ${prixFmt}`,
          lien: "/dashboard/reseau",
        });

        // Enregistrer l'envoi dans l'historique
        const { bienPropositions, crmLeads: crmLeadsTable } = await import("../drizzle/schema");
        const { sql: sqlExpr } = await import("drizzle-orm");
        await db!.insert(bienPropositions).values({
          bienId: input.bienId,
          crmLeadId: input.crmLeadId,
          pdfUrl: input.pdfUrl,
          messagePersonnalise: input.messagePersonnalise ?? null,
          envoyePar: ctx.user?.email ?? ctx.user?.name ?? "Elodie",
          emailDestinataire: lead.email ?? null,
          statut: "sent",
        });

        // Mettre à jour le compteur nbBiensPresentes (= nombre réel d'envois dans bien_propositions)
        await db!.execute(sqlExpr`UPDATE crm_leads SET nbBiensPresentes = (SELECT COUNT(*) FROM bien_propositions WHERE crmLeadId = ${input.crmLeadId} AND statut_bp = 'sent') WHERE id = ${input.crmLeadId}`);

        return { success: true, leadEmail: lead.email };
      }),

    // Historique des fiches proposées à un lead
    getPropositionsLead: protectedProcedure
      .input(z.object({ crmLeadId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const { bienPropositions, biens, offMarketBiens } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const rows = await db!.select({
          id: bienPropositions.id,
          bienId: bienPropositions.bienId,
          offMarketBienId: bienPropositions.offMarketBienId,
          source: bienPropositions.source,
          bienTitreSnapshot: bienPropositions.bienTitreSnapshot,
          pdfUrl: bienPropositions.pdfUrl,
          messagePersonnalise: bienPropositions.messagePersonnalise,
          envoyePar: bienPropositions.envoyePar,
          emailDestinataire: bienPropositions.emailDestinataire,
          statut: bienPropositions.statut,
          createdAt: bienPropositions.createdAt,
          // Champs bien classique
          bienTypeBien: biens.typeBien,
          bienAdresse: biens.adresse,
          bienVille: biens.ville,
          bienSurface: biens.surface,
          bienPrix: biens.prix,
          bienReference: biens.id,
          // Champs bien off-market
          omTitre: offMarketBiens.titre,
          omTypeBien: offMarketBiens.typeBien,
          omRegion: offMarketBiens.region,
          omPrixBien: offMarketBiens.prixBien,
          omRentabiliteBrute: offMarketBiens.rentabiliteBrute,
          omImagePrincipale: offMarketBiens.imagePrincipale,
        })
          .from(bienPropositions)
          .leftJoin(biens, eq(bienPropositions.bienId, biens.id))
          .leftJoin(offMarketBiens, eq(bienPropositions.offMarketBienId, offMarketBiens.id))
          .where(eq(bienPropositions.crmLeadId, input.crmLeadId))
          .orderBy(desc(bienPropositions.createdAt));
        return rows;
      }),

    // Vérifier si un bien a déjà été proposé à un lead (doublon)
    checkDoublon: protectedProcedure
      .input(z.object({ bienId: z.number(), crmLeadId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const { bienPropositions } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [existing] = await db!.select({ id: bienPropositions.id, createdAt: bienPropositions.createdAt })
          .from(bienPropositions)
          .where(and(
            eq(bienPropositions.bienId, input.bienId),
            eq(bienPropositions.crmLeadId, input.crmLeadId),
            eq(bienPropositions.statut, "sent"),
          ))
          .limit(1);
        return { alreadySent: !!existing, sentAt: existing?.createdAt ?? null };
      }),

    // Historique des propositions d'un bien (pour la fiche de détail)
    listPropositionsByBien: protectedProcedure
      .input(z.object({ bienId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const { bienPropositions, crmLeads } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const rows = await db!.select({
          id: bienPropositions.id,
          crmLeadId: bienPropositions.crmLeadId,
          pdfUrl: bienPropositions.pdfUrl,
          emailDestinataire: bienPropositions.emailDestinataire,
          statut: bienPropositions.statut,
          createdAt: bienPropositions.createdAt,
          leadPrenom: crmLeads.prenom,
          leadNom: crmLeads.nom,
          leadEmail: crmLeads.email,
        })
          .from(bienPropositions)
          .leftJoin(crmLeads, eq(bienPropositions.crmLeadId, crmLeads.id))
          .where(eq(bienPropositions.bienId, input.bienId))
          .orderBy(desc(bienPropositions.createdAt));
        return rows;
      }),
    // Compteur de fiches envoyées par lead (pour le dashboard)
    getStatsParLead: protectedProcedure
      .query(async () => {
        const db = await getDb();
        const { bienPropositions } = await import("../drizzle/schema");
        const { count, eq } = await import("drizzle-orm");
        const rows = await db!.select({
          crmLeadId: bienPropositions.crmLeadId,
          total: count(bienPropositions.id),
        })
          .from(bienPropositions)
          .where(eq(bienPropositions.statut, "sent"))
          .groupBy(bienPropositions.crmLeadId);
        return rows;
      }),
    // ─── Pièces jointes sur les tâches calendrier ──────────────────────────────
    uploadAttachment: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { nanoid: nid } = await import("nanoid");
        const ext = input.fileName.split(".").pop() ?? "bin";
        const fileKey = `calendar-attachments/${input.taskId}/${nid(10)}.${ext}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const mysql2 = await import("mysql2/promise");
        const conn = await mysql2.default.createConnection(process.env.DATABASE_URL!);
        await conn.execute(
          "INSERT INTO calendar_task_attachments (task_id, file_name, file_url, file_key, file_size, mime_type, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [input.taskId, input.fileName, url, fileKey, input.fileSize, input.mimeType, ctx.user?.name ?? "Équipe", Date.now()]
        );
        await conn.end();
        return { url, fileName: input.fileName };
      }),
    listAttachments: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        const mysql2 = await import("mysql2/promise");
        const conn = await mysql2.default.createConnection(process.env.DATABASE_URL!);
        const [rows] = await conn.execute(
          "SELECT * FROM calendar_task_attachments WHERE task_id = ? ORDER BY created_at ASC",
          [input.taskId]
        ) as any[];
        await conn.end();
        return rows as Array<{ id: number; task_id: number; file_name: string; file_url: string; file_key: string; file_size: number; mime_type: string; uploaded_by: string; created_at: number }>;
      }),
    deleteAttachment: protectedProcedure
      .input(z.object({ attachmentId: z.number() }))
      .mutation(async ({ input }) => {
        const mysql2 = await import("mysql2/promise");
        const conn = await mysql2.default.createConnection(process.env.DATABASE_URL!);
        await conn.execute("DELETE FROM calendar_task_attachments WHERE id = ?", [input.attachmentId]);
        await conn.end();
        return { success: true };
      }),
  }),

  // ─── NOTIFICATIONS IN-APP ──────────────────────────────────────────────────────────────────────────────────────
  notifications: router({
    // Lister les notifications du membre connecté
    list: protectedProcedure
      .input(z.object({
        destinataire: z.enum(["Maria", "Manon", "Elodie", "Hanna", "Marie", "Owner"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const dest = input?.destinataire ?? resolveNotifDest(ctx.user?.name ?? "", ctx.user?.email ?? "");
        const userEmail = ctx.user?.email ?? "";
        // Pour les courtiers/agents (non membres équipe), récupérer les notifs ciblées par email
        const isTeamMember = ["Maria", "Manon", "Elodie", "Hanna", "Marie", "Owner"].includes(dest);
        if (!isTeamMember && userEmail) {
          return getNotifications(undefined, userEmail);
        }
        return getNotifications(dest);
      }),

    // Compter les non lues
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const dest = resolveNotifDest(ctx.user?.name ?? "", ctx.user?.email ?? "");
        const count = await getUnreadNotificationCount(dest);
        return { count };
      }),

    // Marquer une notif comme lue
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationRead(input.id);
        return { success: true };
      }),

    // Marquer toutes comme lues
    markAllRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const dest = resolveNotifDest(ctx.user?.name ?? "", ctx.user?.email ?? "");
        await markAllNotificationsRead(dest);
        return { success: true };
      }),

    // Compter les non lues par page (lien)
    countByPage: protectedProcedure
      .query(async ({ ctx }) => {
        const dest = resolveNotifDest(ctx.user?.name ?? "", ctx.user?.email ?? "");
        return getUnreadCountByPage(dest);
      }),
  }),
  ambassadeurs: ambassadeursRouter,
  courtiers: courtiersRouter,
  financement: financementRouter,
  commissions: commissionsRouter,
  triggers: triggersRouter,
  partnerDocs: partnerDocsRouter,
  // ── OFF MARKET BIENS ──
  offMarket: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        statut: z.string().optional(),
        region: z.string().optional(),
        typeBien: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getOffMarketBiens(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const bien = await getOffMarketBienById(input.id);
        if (!bien) throw new TRPCError({ code: 'NOT_FOUND' });
        return bien;
      }),
    updateStatut: protectedProcedure
      .input(z.object({
        id: z.number(),
        statut: z.enum(['disponible', 'sous_compromis', 'vendu', 'archive']),
      }))
      .mutation(async ({ input }) => {
        await updateOffMarketBienStatut(input.id, input.statut);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteOffMarketBien(input.id);
        return { success: true };
      }),
    getEnvois: protectedProcedure
      .input(z.object({ bienId: z.number() }))
      .query(async ({ input }) => {
        const { getEnvoisParBien } = await import('./db');
        return getEnvoisParBien(input.bienId);
      }),
    proposerAuLead: protectedProcedure
      .input(z.object({
        offMarketId: z.number(),
        crmLeadId: z.number(),
        messagePersonnalise: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        const { crmLeads } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const bien = await getOffMarketBienById(input.offMarketId);
        const [lead] = await db!.select().from(crmLeads).where(eq(crmLeads.id, input.crmLeadId)).limit(1);
        if (!bien || !lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bien ou lead introuvable' });
        
        // Générer le PDF de la fiche Off Market (sans adresse — règle de confidentialité)
        let pdfUrl: string | null = null;
        try {
          pdfUrl = await generateOffMarketPdf({
            id: bien.id,
            titre: bien.titre,
            typeBien: bien.typeBien,
            region: bien.region,
            prixBien: bien.prixBien,
            honoraires: bien.honoraires,
            travauxEstimation: bien.travauxEstimation,
            investissementTotal: bien.investissementTotal,
            nbLots: bien.nbLots,
            surfaceTotale: bien.surfaceTotale,
            rentabiliteBrute: bien.rentabiliteBrute,
            rentabilitePotentielleLd: bien.rentabilitePotentielleLd,
            rentabilitePotentielleCd: bien.rentabilitePotentielleCd,
            revenusAnnuels: bien.revenusAnnuels,
            revenusPotenlielsLd: bien.revenusPotenlielsLd,
            revenusPotentielsCd: bien.revenusPotentielsCd,
            situation: bien.situation,
            lots: bien.lots,
            images: bien.images,
            imagePrincipale: bien.imagePrincipale,
          });
        } catch (pdfErr) {
          console.error('[OffMarket] PDF generation failed:', pdfErr);
          // Continue sans PDF si la génération échoue
        }
        
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const prixFmt = bien.prixBien ? `${Number(bien.prixBien).toLocaleString('fr-FR')} €` : 'Prix sur demande';
        const typeLabel = (bien.typeBien ?? 'Bien immobilier').charAt(0).toUpperCase() + (bien.typeBien ?? 'Bien immobilier').slice(1).replace(/_/g, ' ');
        const region = bien.region ?? '';
        const messageHtml = input.messagePersonnalise
          ? `<p style="color:#333;font-size:15px;line-height:1.6">${input.messagePersonnalise.replace(/\n/g, '<br>')}</p>`
          : `<p style="color:#333;font-size:15px;line-height:1.6">Suite à notre échange, nous avons sélectionné pour vous une opportunité off market exclusive qui correspond à vos critères d'investissement.</p>`;
        const pdfButtonHtml = pdfUrl
          ? `<a href="${pdfUrl}" style="display:inline-block;background:#C9A84C;color:#0d0d0d;padding:14px 28px;text-decoration:none;font-weight:bold;font-size:14px;margin:8px 0 24px">📄 Télécharger la fiche confidentielle (PDF)</a>`
          : '';
        await resend.emails.send({
          from: 'Sigma Factory <noreply@fa.sigma-factory.fr>',
          to: lead.email,
          subject: `✨ Sigma Factory — Opportunité Off Market : ${typeLabel}${region ? ` — ${region}` : ''}`,
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#fff">
              <div style="background:#0d0d0d;padding:28px 32px">
                <h1 style="color:#C9A84C;font-size:22px;margin:0;letter-spacing:2px">SIGMA FACTORY</h1>
                <p style="color:#888;font-size:11px;margin:6px 0 0">Pôle Immobilier — Biens Off Market</p>
              </div>
              <div style="padding:32px">
                <h2 style="color:#0d0d0d;font-size:18px;margin:0 0 16px">Bonjour ${lead.prenom},</h2>
                ${messageHtml}
                <div style="background:#f9f6ee;border-left:3px solid #C9A84C;padding:16px 20px;margin:20px 0">
                  <p style="color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Opportunité Off Market — Accès Confidentiel</p>
                  <p style="color:#0d0d0d;font-size:17px;font-weight:bold;margin:0">${typeLabel}</p>
                  ${region ? `<p style="color:#555;font-size:13px;margin:4px 0 0">${region}</p>` : ''}
                  <p style="color:#C9A84C;font-size:20px;font-weight:bold;margin:12px 0 0">${prixFmt}</p>
                </div>
                ${pdfButtonHtml}
                <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:16px">Ce bien vous est proposé en exclusivité. Pour toute question, contactez Élodie : <strong>elodie@sigmaipf.fr</strong>.</p>
              </div>
              <div style="background:#0d0d0d;padding:14px 32px;text-align:center">
                <p style="color:#C9A84C;font-size:10px;margin:0;letter-spacing:1px">SIGMA FACTORY — Document confidentiel — Réservé à ${lead.prenom} ${lead.nom}</p>
              </div>
            </div>
          `,
        });
        addLeadActivity({ crmLeadId: input.crmLeadId, type: 'email_envoye', auteur: ctx.user?.name ?? 'Élodie', titre: `Fiche Off Market envoyée : ${typeLabel}${region ? ` — ${region}` : ''}`, contenu: `${prixFmt}` }).catch(console.error);
        // Enregistrer l'envoi dans l'historique bienPropositions (pour retrouver depuis la fiche lead)
        try {
          const { bienPropositions: bp } = await import("../drizzle/schema");
          const { sql: sqlExpr2 } = await import("drizzle-orm");
          await db!.insert(bp).values({
            bienId: null as any,
            offMarketBienId: bien.id,
            source: 'off_market',
            bienTitreSnapshot: `${typeLabel}${region ? ` — ${region}` : ''} — ${prixFmt}`,
            crmLeadId: input.crmLeadId,
            pdfUrl: pdfUrl ?? undefined,
            messagePersonnalise: input.messagePersonnalise ?? undefined,
            envoyePar: ctx.user?.name ?? 'Élodie',
            emailDestinataire: lead.email,
            statut: 'sent',
          } as any);
          // Mettre à jour le compteur nbBiensPresentes
          await db!.execute(sqlExpr2`UPDATE crm_leads SET nbBiensPresentes = (SELECT COUNT(*) FROM bien_propositions WHERE crmLeadId = ${input.crmLeadId} AND statut_bp = 'sent') WHERE id = ${input.crmLeadId}`);
        } catch (insertErr) {
          console.error('[OffMarket] Erreur enregistrement historique:', insertErr);
        }
        return { success: true, leadEmail: lead.email, pdfUrl };
      }),
    // Historique des leads à qui ce bien off-market a été envoyé
    listEnvoisBien: protectedProcedure
      .input(z.object({ offMarketBienId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const { bienPropositions, crmLeads } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        const rows = await db!.select({
          id: bienPropositions.id,
          crmLeadId: bienPropositions.crmLeadId,
          pdfUrl: bienPropositions.pdfUrl,
          messagePersonnalise: bienPropositions.messagePersonnalise,
          emailDestinataire: bienPropositions.emailDestinataire,
          envoyePar: bienPropositions.envoyePar,
          statut: bienPropositions.statut,
          createdAt: bienPropositions.createdAt,
          leadPrenom: crmLeads.prenom,
          leadNom: crmLeads.nom,
          leadEmail: crmLeads.email,
          leadTelephone: crmLeads.telephone,
        })
          .from(bienPropositions)
          .leftJoin(crmLeads, eq(bienPropositions.crmLeadId, crmLeads.id))
          .where(eq(bienPropositions.offMarketBienId as any, input.offMarketBienId))
          .orderBy(desc(bienPropositions.createdAt));
        return rows;
      }),
    create: protectedProcedure
      .input(z.object({
        titre: z.string().min(1),
        typeBien: z.string().optional(),
        region: z.string().optional(),
        departement: z.string().optional(),
        prixBien: z.number().optional(),
        honoraires: z.number().optional(),
        travauxEstimation: z.number().optional(),
        investissementTotal: z.number().optional(),
        nbLots: z.number().optional(),
        surfaceTotale: z.string().optional(),
        rentabiliteBrute: z.string().optional(),
        rentabilitePotentielleLd: z.string().optional(),
        rentabilitePotentielleCd: z.string().optional(),
        revenusAnnuels: z.number().optional(),
        revenusPotenlielsLd: z.number().optional(),
        revenusPotentielsCd: z.number().optional(),
        situation: z.string().optional(),
        images: z.string().optional(),
        imagePrincipale: z.string().optional(),
        statut: z.enum(['disponible', 'sous_compromis', 'vendu', 'archive']).default('disponible'),
      }))
      .mutation(async ({ input }) => {
        const now = Date.now();
        const result = await createOffMarketBien({
          titre: input.titre,
          typeBien: input.typeBien,
          region: input.region,
          departement: input.departement,
          prixBien: input.prixBien,
          honoraires: input.honoraires,
          travauxEstimation: input.travauxEstimation,
          investissementTotal: input.investissementTotal,
          nbLots: input.nbLots,
          surfaceTotale: input.surfaceTotale,
          rentabiliteBrute: input.rentabiliteBrute,
          rentabilitePotentielleLd: input.rentabilitePotentielleLd,
          rentabilitePotentielleCd: input.rentabilitePotentielleCd,
          revenusAnnuels: input.revenusAnnuels,
          revenusPotenlielsLd: input.revenusPotenlielsLd,
          revenusPotentielsCd: input.revenusPotentielsCd,
          situation: input.situation,
          images: input.images,
          imagePrincipale: input.imagePrincipale,
          statut: input.statut,
          source: 'off_market',
          createdAt: now,
          updatedAt: now,
        } as any);
        return { success: true, id: (result as any)?.insertId };
      }),
    uploadImage: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
        base64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, 'base64');
        const key = `off-market-images/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),
    updateGeocoords: protectedProcedure
      .input(z.object({ id: z.number(), latitude: z.string(), longitude: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const { offMarketBiens } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(offMarketBiens)
          .set({ latitude: input.latitude, longitude: input.longitude })
          .where(eq(offMarketBiens.id, input.id));
        return { success: true };
      }),
    geocodeByRegion: protectedProcedure
      .input(z.object({ id: z.number(), region: z.string(), departement: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { geocodeAdresse } = await import('./geocode');
        const coords = await geocodeAdresse('', '', input.departement ?? input.region + ', France');
        if (!coords) throw new TRPCError({ code: 'NOT_FOUND', message: 'Géocodage impossible pour cette région' });
        const db = await getDb();
        if (!db) return { success: false, latitude: coords.latitude, longitude: coords.longitude };
        const { offMarketBiens } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(offMarketBiens)
          .set({ latitude: coords.latitude, longitude: coords.longitude })
          .where(eq(offMarketBiens.id, input.id));
        return { success: true, latitude: coords.latitude, longitude: coords.longitude };
      }),
    previewPdf: protectedProcedure
      .input(z.object({ offMarketId: z.number() }))
      .mutation(async ({ input }) => {
        const bien = await getOffMarketBienById(input.offMarketId);
        if (!bien) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bien Off Market introuvable' });
        // generateOffMarketPdf retourne directement une URL S3 (elle fait elle-même le storagePut en interne)
        const url = await generateOffMarketPdf({
          id: bien.id,
          titre: bien.titre,
          typeBien: bien.typeBien,
          region: bien.region,
          prixBien: bien.prixBien,
          honoraires: bien.honoraires,
          travauxEstimation: bien.travauxEstimation,
          investissementTotal: bien.investissementTotal,
          nbLots: bien.nbLots,
          surfaceTotale: bien.surfaceTotale,
          rentabiliteBrute: bien.rentabiliteBrute,
          rentabilitePotentielleLd: bien.rentabilitePotentielleLd,
          rentabilitePotentielleCd: bien.rentabilitePotentielleCd,
          revenusAnnuels: bien.revenusAnnuels,
          revenusPotenlielsLd: bien.revenusPotenlielsLd,
          revenusPotentielsCd: bien.revenusPotentielsCd,
          situation: bien.situation,
          lots: bien.lots,
          images: bien.images,
          imagePrincipale: bien.imagePrincipale,
        });
        return { url };
      }),
  }),
  // ── ADMIN : Gestion de la liste blanche ──
  admin: router({
    // Lister tous les emails autorisés
    listWhitelist: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { allowedEmails } = await import("../drizzle/schema");
        const { asc } = await import("drizzle-orm");
        const list = await db!.select().from(allowedEmails).orderBy(asc(allowedEmails.createdAt));
        return list;
      }),

    // Ajouter un email autorisé
    addWhitelist: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        nom: z.string().min(1),
        role: z.enum(["user", "admin", "direction", "agent"]).default("user"),
        sendWelcomeEmail: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { allowedEmails } = await import("../drizzle/schema");
        await db!.insert(allowedEmails).values({
          email: input.email.toLowerCase().trim(),
          nom: input.nom.trim(),
          role: input.role,
          actif: true,
        } as any);
        // Envoyer l'email de bienvenue si demandé
        if (input.sendWelcomeEmail) {
          const { sendBienvenueAcces } = await import("./mailer");
          sendBienvenueAcces({
            destinataireEmail: input.email.toLowerCase().trim(),
            destinataireNom: input.nom.trim(),
            role: input.role,
          }).catch(console.error);
        }
        return { success: true };
      }),

    // Supprimer un email autorisé
    removeWhitelist: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { allowedEmails } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db!.delete(allowedEmails).where(eq(allowedEmails.id, input.id));
        return { success: true };
      }),

    // Modifier le rôle d'un email
    updateWhitelistRole: protectedProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["user", "admin", "direction", "agent"]),
        nom: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { allowedEmails } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db!.update(allowedEmails)
          .set({ nom: input.nom, role: input.role } as any)
          .where(eq(allowedEmails.id, input.id));
        return { success: true };
      }),
    // Activer / désactiver un accès sans le supprimer
    toggleWhitelistActif: protectedProcedure
      .input(z.object({ id: z.number(), actif: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { allowedEmails } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db!.update(allowedEmails)
          .set({ actif: input.actif } as any)
          .where(eq(allowedEmails.id, input.id));
        return { success: true };
      }),
    // Renvoyer l'email de bienvenue
    resendWelcomeEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { allowedEmails } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db!.select().from(allowedEmails).where(eq(allowedEmails.id, input.id)).limit(1);
        if (!result.length) throw new TRPCError({ code: "NOT_FOUND" });
        const entry = result[0];
        const { sendBienvenueAcces } = await import("./mailer");
        await sendBienvenueAcces({
          destinataireEmail: entry.email,
          destinataireNom: entry.nom ?? entry.email,
          role: entry.role,
        });
        return { success: true };
      }),
  }),
  // ── Génération PDF dossier complet (état civil + mandat + tableau courtage) ──
  dossier: router({
    generatePdf: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { leads, mandatsRecherche, dossiersFinancement } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const [lead] = await db!.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
        const mandats = await db!.select().from(mandatsRecherche)
          .where(eq(mandatsRecherche.leadId, input.leadId))
          .orderBy(desc(mandatsRecherche.createdAt)).limit(1);
        const dossiers = await db!.select().from(dossiersFinancement)
          .where(eq(dossiersFinancement.leadId, input.leadId))
          .orderBy(desc(dossiersFinancement.createdAt)).limit(1);
        const pdfBuffer = await generateDossierPdf({
          lead: lead ?? null,
          mandat: mandats[0] ?? null,
          financement: dossiers[0] ?? null,
        });
        const nomFichier = `dossiers/${input.leadId}-${Date.now()}.pdf`;
        const { url } = await storagePut(nomFichier, pdfBuffer, "application/pdf");
        return { url };
      }),
    sendToCourtier: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        courtierEmail: z.string().email(),
        courtierNom: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { crmLeads, leads, mandatsRecherche, dossiersFinancement } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const [crmLead] = await db!.select().from(crmLeads).where(eq(crmLeads.id, input.crmLeadId)).limit(1);
        if (!crmLead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead CRM introuvable" });
        // Générer le PDF dossier complet si fiche d'état civil disponible
        let pdfUrl: string | null = null;
        if ((crmLead as any).leadId) {
          const [lead] = await db!.select().from(leads).where(eq(leads.id, (crmLead as any).leadId)).limit(1);
          const mandats = await db!.select().from(mandatsRecherche)
            .where(eq(mandatsRecherche.leadId, (crmLead as any).leadId))
            .orderBy(desc(mandatsRecherche.createdAt)).limit(1);
          const dossiers = await db!.select().from(dossiersFinancement)
            .where(eq(dossiersFinancement.leadId, (crmLead as any).leadId))
            .orderBy(desc(dossiersFinancement.createdAt)).limit(1);
          const pdfBuffer = await generateDossierPdf({
            lead: lead ?? null,
            mandat: mandats[0] ?? null,
            financement: dossiers[0] ?? null,
          });
          const nomFichier = `dossiers/${input.crmLeadId}-courtier-${Date.now()}.pdf`;
          const { url } = await storagePut(nomFichier, pdfBuffer, "application/pdf");
          pdfUrl = url;
        }
        // Sauvegarder l'email du courtier
        await db!.update(crmLeads)
          .set({ courtierEmail: input.courtierEmail, courtierAssigne: input.courtierNom ?? (crmLead as any).courtierAssigne } as any)
          .where(eq(crmLeads.id, input.crmLeadId));
        // Envoyer l'email au courtier
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const nomLead = `${(crmLead as any).prenom} ${(crmLead as any).nom}`;
        const courtierNomDisplay = input.courtierNom ?? "Courtier partenaire";
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#C9A84C,#F0D080,#C9A84C);padding:24px 32px;">
      <div style="font-size:11px;letter-spacing:3px;color:#000;text-transform:uppercase;font-weight:600;">Sigma Factory \u2014 Dossier client</div>
      <div style="font-size:20px;font-weight:700;color:#000;margin-top:6px;">Dossier \u00e0 traiter : ${nomLead}</div>
    </div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:#D4AF37;color:#000;font-weight:bold;font-size:11px;padding:3px 12px;border-radius:20px;margin-bottom:20px;">Nouveau dossier courtage</span>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">Bonjour ${courtierNomDisplay},<br><br>Sigma Factory vous transmet le dossier complet de <strong style="color:#fff;">${nomLead}</strong> pour traitement courtage.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;width:40%;">Client</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${nomLead}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Email client</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${(crmLead as any).email}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">T\u00e9l\u00e9phone</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${(crmLead as any).telephone ?? "\u2014"}</td></tr>
        ${pdfUrl ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Dossier complet</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:13px;"><a href="${pdfUrl}" style="color:#D4AF37;">T\u00e9l\u00e9charger le dossier PDF \u2197</a></td></tr>` : ""}
      </table>
      <div style="margin-top:24px;text-align:center;">
        ${pdfUrl ? `<a href="${pdfUrl}" style="background:#D4AF37;color:#000;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">\ud83d\udcc4 T\u00e9l\u00e9charger le dossier PDF</a>` : `<p style="color:#aaa;font-size:13px;">Le dossier PDF sera disponible une fois la fiche d'\u00e9tat civil compl\u00e9t\u00e9e.</p>`}
      </div>
    </div>
    <div style="background:#0d0d0d;padding:14px 32px;text-align:center;font-size:11px;color:#444;border-top:1px solid #1e1e1e;">Sigma Factory \u2014 Confidentiel</div>
  </div>
</body></html>`;
        const { error } = await resend.emails.send({
          from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
          to: input.courtierEmail,
          cc: "manondubost@sigmaipf.fr",
          subject: `Dossier client \u00e0 traiter \u2014 ${nomLead}`,
          html,
        });
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erreur envoi email : " + JSON.stringify(error) });
        return { success: true, pdfUrl };
      }),
  }),

  portefeuille: router({
    exportPdf: protectedProcedure
      .input(z.object({
        sources: z.array(z.enum(["ambassadeur", "pap", "off_market"])).optional(),
      }))
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        const { biens, offMarketBiens } = await import("../drizzle/schema");
        const { eq, and, or } = await import("drizzle-orm");

        // Récupérer tous les biens ambassadeurs publiés
        const biensAmb = await db!.select().from(biens)
          .where(and(eq(biens.statutBien, "publie"), eq(biens.source, "ambassadeur"))).limit(200);

        // Récupérer tous les biens PAP (source pap_scrape)
        const biensPap = await db!.select().from(biens)
          .where(eq(biens.source, "pap_scrape")).limit(200);

        // Récupérer tous les biens Off Market
        const biensOM = await db!.select().from(offMarketBiens).limit(200);

        // Construire la liste unifiée
        const allBiens = [
          ...biensAmb.map((b: any) => ({
            id: b.id,
            titre: b.titre ?? `Bien #${b.id}`,
            typeBien: b.typeBien,
            ville: b.ville,
            region: b.region,
            departement: b.departement,
            surface: b.surface,
            prix: b.prix,
            rentabiliteBrute: b.rentabiliteBrute,
            statut: b.statutBien,
            source: "ambassadeur" as const,
            photoPrincipaleUrl: b.photoPrincipaleUrl,
            reference: b.reference,
            nbLots: b.nbLots,
          })),
          ...biensPap.map((b: any) => ({
            id: b.id,
            titre: b.titre ?? `PAP #${b.id}`,
            typeBien: b.typeBien,
            ville: b.ville,
            region: b.region,
            surface: b.surface,
            prix: b.prix,
            rentabiliteBrute: b.rentabiliteBrute,
            statut: b.statutBien ?? "disponible",
            source: "pap" as const,
            photoPrincipaleUrl: b.photoPrincipaleUrl,
          })),
          ...biensOM.map((b: any) => ({
            id: b.id,
            titre: b.titre ?? `Off Market #${b.id}`,
            typeBien: b.typeBien,
            region: b.region,
            departement: b.departement,
            surface: b.surfaceTotale,
            prix: b.prixBien,
            rentabiliteBrute: b.rentabiliteBrute,
            statut: "disponible",
            source: "off_market" as const,
            imagePrincipale: b.imagePrincipale,
            investissementTotal: b.investissementTotal,
          })),
        ];

        const pdfBuffer = await generatePortefeuillePdf(allBiens);
        const nomFichier = `portefeuille/portefeuille-${Date.now()}.pdf`;
        const { url } = await storagePut(nomFichier, pdfBuffer, "application/pdf");
        return { url, total: allBiens.length };
      }),
  }),
  courtierSoumissions: router({
    // Lister toutes les soumissions pour un lead CRM
    list: protectedProcedure
      .input(z.object({ crmLeadId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB non disponible" });
        return db.select().from(courtierSoumissions)
          .where(eq(courtierSoumissions.crmLeadId, input.crmLeadId))
          .orderBy(desc(courtierSoumissions.createdAt));
      }),

    // Ajouter une nouvelle soumission
    add: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        courtierNom: z.string().min(1),
        courtierEmail: z.string().email().optional(),
        courtierCabinet: z.string().optional(),
        dateEnvoi: z.number().optional(), // timestamp ms, défaut = maintenant
        note: z.string().optional(),
        resumeSituation: z.string().optional(),
        zipDocumentsUrl: z.string().optional(),
        tableauCourtagePdfUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB non disponible" });
        const now = Date.now();
        await db.insert(courtierSoumissions).values({
          crmLeadId: input.crmLeadId,
          courtierNom: input.courtierNom,
          courtierEmail: input.courtierEmail,
          courtierCabinet: input.courtierCabinet,
          dateEnvoi: input.dateEnvoi ?? now,
          reponse: "en_attente",
          selectionne: false,
          note: input.note,
          resumeSituation: input.resumeSituation,
          zipDocumentsUrl: input.zipDocumentsUrl,
          tableauCourtagePdfUrl: input.tableauCourtagePdfUrl,
          creePar: ctx.user?.email ?? "Manon",
          createdAt: now,
          updatedAt: now,
        });
        // Passer le statutCourtage du lead à 'en_cours' dès qu'un courtier est contacté
        await db.update(crmLeads)
          .set({ statutCourtage: "en_cours" } as any)
          .where(eq(crmLeads.id, input.crmLeadId));
        return { success: true };
      }),

    // Mettre à jour la réponse / sélection d'une soumission
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        reponse: z.enum(["en_attente", "ok_enveloppe", "regroupement", "refus", "sans_suite"]).optional(),
        montantEnveloppe: z.number().optional(),
        selectionne: z.boolean().optional(),
        note: z.string().optional(),
        courtierNom: z.string().optional(),
        courtierEmail: z.string().optional(),
        courtierCabinet: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB non disponible" });
        const { id, ...fields } = input;
        await db.update(courtierSoumissions)
          .set({ ...fields, updatedAt: Date.now() })
          .where(eq(courtierSoumissions.id, id));
        return { success: true };
      }),

    // Supprimer une soumission
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB non disponible" });
        await db.delete(courtierSoumissions).where(eq(courtierSoumissions.id, input.id));
        return { success: true };
      }),

    // Upload d'un fichier zip de documents pour une soumission courtier
    uploadZip: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        fileBase64: z.string(),
        nom: z.string(),
        mimeType: z.string().default("application/zip"),
      }))
      .mutation(async ({ input }) => {
        const ext = input.nom.split(".").pop() ?? "zip";
        const fileKey = `courtier-dossiers/${input.crmLeadId}/zip-${Date.now()}.${ext}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url, fileKey };
      }),

    // Envoyer un email enrichi au courtier lors du contact (tableau de courtage + zip + résumé)
    sendContactEmail: protectedProcedure
      .input(z.object({
        crmLeadId: z.number(),
        courtierEmail: z.string().email(),
        courtierNom: z.string(),
        resumeSituation: z.string().optional(),
        tableauCourtagePdfUrl: z.string().optional(),
        zipDocumentsUrl: z.string().optional(),
        zipNom: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB non disponible" });
        const [crmLead] = await db.select().from(crmLeads).where(eq(crmLeads.id, input.crmLeadId)).limit(1);
        if (!crmLead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead CRM introuvable" });
        const nomLead = `${(crmLead as any).prenom} ${(crmLead as any).nom}`;
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const resumeHtml = input.resumeSituation
          ? `<div style="background:#1a1a1a;border-left:3px solid #D4AF37;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;"><p style="color:#D4AF37;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Résumé de la situation</p><p style="color:#ddd;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${input.resumeSituation.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>`
          : "";
        const attachmentsHtml = [
          input.tableauCourtagePdfUrl ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;width:40%;">Tableau de courtage</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:13px;"><a href="${input.tableauCourtagePdfUrl}" style="color:#D4AF37;">Télécharger le PDF ↗</a></td></tr>` : "",
          input.zipDocumentsUrl ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Documents client</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:13px;"><a href="${input.zipDocumentsUrl}" style="color:#D4AF37;">Télécharger le dossier ZIP ↗</a></td></tr>` : "",
        ].join("");
        const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#C9A84C,#F0D080,#C9A84C);padding:24px 32px;">
      <div style="font-size:11px;letter-spacing:3px;color:#000;text-transform:uppercase;font-weight:600;">Sigma Factory — Dossier courtage</div>
      <div style="font-size:20px;font-weight:700;color:#000;margin-top:6px;">Dossier à étudier : ${nomLead}</div>
    </div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:#D4AF37;color:#000;font-weight:bold;font-size:11px;padding:3px 12px;border-radius:20px;margin-bottom:20px;">Nouveau dossier courtage</span>
      <p style="color:#aaa;font-size:14px;margin:0 0 16px;">Bonjour ${input.courtierNom},<br><br>Sigma Factory vous transmet le dossier de <strong style="color:#fff;">${nomLead}</strong> pour étude courtage.</p>
      ${resumeHtml}
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;width:40%;">Client</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${nomLead}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Email client</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${(crmLead as any).email}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Téléphone</td><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${(crmLead as any).telephone ?? "—"}</td></tr>
        ${attachmentsHtml}
      </table>
    </div>
    <div style="background:#0d0d0d;padding:14px 32px;text-align:center;font-size:11px;color:#444;border-top:1px solid #1e1e1e;">Sigma Factory — Confidentiel</div>
  </div>
</body></html>`;
        const { error } = await resend.emails.send({
          from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
          to: input.courtierEmail,
          cc: "manondubost@sigmaipf.fr",
          subject: `Dossier courtage à étudier — ${nomLead}`,
          html,
        });
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erreur envoi email : " + JSON.stringify(error) });
        return { success: true };
      }),

    // Stats globales par courtier pour la vue réseau
    statsReseau: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB non disponible" });

      const toutes = await db.select().from(courtierSoumissions);

      // Grouper par nom de courtier
      const parCourtier: Record<string, {
        courtierNom: string;
        courtierEmail: string | null;
        courtierCabinet: string | null;
        total: number;
        enAttente: number;
        okEnveloppe: number;
        regroupement: number;
        refus: number;
        sansSuite: number;
        selectionne: number;
        montantMoyen: number | null;
        dernierContact: number | null;
      }> = {};

      for (const s of toutes) {
        const key = s.courtierNom.trim().toUpperCase();
        if (!parCourtier[key]) {
          parCourtier[key] = {
            courtierNom: s.courtierNom,
            courtierEmail: s.courtierEmail,
            courtierCabinet: s.courtierCabinet,
            total: 0,
            enAttente: 0,
            okEnveloppe: 0,
            regroupement: 0,
            refus: 0,
            sansSuite: 0,
            selectionne: 0,
            montantMoyen: null,
            dernierContact: null,
          };
        }
        const c = parCourtier[key];
        c.total++;
        if (s.reponse === "en_attente") c.enAttente++;
        else if (s.reponse === "ok_enveloppe") c.okEnveloppe++;
        else if (s.reponse === "regroupement") c.regroupement++;
        else if (s.reponse === "refus") c.refus++;
        else if (s.reponse === "sans_suite") c.sansSuite++;
        if (s.selectionne) c.selectionne++;
        if (s.dateEnvoi && (!c.dernierContact || s.dateEnvoi > c.dernierContact)) {
          c.dernierContact = s.dateEnvoi;
        }
        // Calcul montant moyen enveloppe
        if (s.reponse === "ok_enveloppe" && s.montantEnveloppe) {
          const enveloppesOk = toutes.filter(x => x.courtierNom.trim().toUpperCase() === key && x.reponse === "ok_enveloppe" && x.montantEnveloppe);
          c.montantMoyen = Math.round(enveloppesOk.reduce((sum, x) => sum + (x.montantEnveloppe ?? 0), 0) / enveloppesOk.length);
        }
      }

      return Object.values(parCourtier).sort((a, b) => b.total - a.total);
    }),
  }),
  marie: marieRouter,
});
export type AppRouter = typeof appRouter;

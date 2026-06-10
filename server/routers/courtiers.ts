import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb, createNotification } from "../db";
import { courtiers, dossiersCourtagge, commissionsCourtage, allowedEmails, ambassadeurs, notificationsInApp, assignationsFinancement, dossiersFinancement, users } from "../../drizzle/schema";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import { generateConventionCourtierPdf } from "../conventionCourtierGenerator";
import { storagePut } from "../storage";
import { sendNouveauCourtierNotif, sendBienvenueCourtier } from "../mailer";
import { notifyOwner } from "../_core/notification";
import { geocodeAdresse } from "../geocode";

export const courtiersRouter = router({
  // ─── INSCRIPTION PUBLIQUE ─────────────────────────────────────────────────
  inscrire: publicProcedure
    .input(z.object({
      nom: z.string().min(1),
      prenom: z.string().min(1),
      email: z.string().email(),
      telephone: z.string().min(1),
      adresse: z.string().min(1),
      codePostal: z.string().min(1),
      ville: z.string().min(1),
      statut: z.enum(["auto_entrepreneur", "eirl", "eurl", "sasu", "sarl", "autre"]),
      siret: z.string().optional(),
      cabinetNom: z.string().optional(),
      numeroOrias: z.string().optional(),
      // Informations juridiques
      denominationSociale: z.string().optional(),
      formeJuridique: z.string().optional(),
      capitalSocial: z.string().optional(),
      adresseSiegeSocial: z.string().optional(),
      villeGreffe: z.string().optional(),
      numeroRCS: z.string().optional(),
      representantLegalNom: z.string().optional(),
      representantLegalFonction: z.string().optional(),
      specialites: z.array(z.string()).optional(),
      codeParrain: z.string().optional(), // email ou code du parrain
      signatureNom: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      // Vérifier si email déjà inscrit
      const existing = await db.select().from(courtiers).where(eq(courtiers.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new Error("Un courtier avec cet email est déjà inscrit.");
      }

      // Résoudre le parrain (peut être un courtier ou un ambassadeur)
      let parrainId: number | null = null;
      let parrainAmbassadeurId: number | null = null;
      let niveau: "1" | "2" = "1";
      let parrainNom: string | undefined;
      let parrainType: string | undefined;
      let parrainEmail: string | undefined;

      if (input.codeParrain) {
        // Chercher parmi les courtiers (par code parrain ou email)
        const parrainCourtier = await db.select().from(courtiers)
          .where(eq(courtiers.codeParrain, input.codeParrain)).limit(1);
        if (parrainCourtier.length > 0) {
          parrainId = parrainCourtier[0].id;
          niveau = "1";
          parrainNom = `${parrainCourtier[0].prenom} ${parrainCourtier[0].nom}`;
          parrainEmail = parrainCourtier[0].email;
          parrainType = "courtier";
        } else {
          // Chercher parmi les ambassadeurs
          const { ambassadeurs } = await import("../../drizzle/schema");
          const parrainAmb = await db.select().from(ambassadeurs)
            .where(eq(ambassadeurs.codeParrain, input.codeParrain)).limit(1);
          if (parrainAmb.length > 0) {
            parrainAmbassadeurId = parrainAmb[0].id;
            niveau = "1";
            parrainNom = `${parrainAmb[0].prenom} ${parrainAmb[0].nom}`;
            parrainEmail = parrainAmb[0].email;
            parrainType = "agent";
          }
        }
      }
      // Auto-rattacher au compte master Sigma courtier si aucun parrain trouvé
      if (!parrainId && !parrainAmbassadeurId) {
        parrainId = 30002; // Sigma Factory master courtier
        parrainNom = "Sigma Factory";
        parrainType = "courtier";
      }

      const dateSignature = new Date().toLocaleDateString("fr-FR");

      // Insérer le courtier
      const [result] = await db.insert(courtiers).values({
        nom: input.nom,
        prenom: input.prenom,
        email: input.email,
        telephone: input.telephone,
        adresse: input.adresse,
        codePostal: input.codePostal,
        ville: input.ville,
        statut: input.statut,
        siret: input.siret,
        cabinetNom: input.cabinetNom,
        numeroOrias: input.numeroOrias,
        denominationSociale: input.denominationSociale,
        formeJuridique: input.formeJuridique,
        capitalSocial: input.capitalSocial,
        adresseSiegeSocial: input.adresseSiegeSocial,
        villeGreffe: input.villeGreffe,
        numeroRCS: input.numeroRCS,
        representantLegalNom: input.representantLegalNom,
        representantLegalFonction: input.representantLegalFonction,
        specialites: input.specialites ? JSON.stringify(input.specialites) : null,
        parrainId,
        parrainAmbassadeurId,
        niveau,
        conventionSignee: true,
        dateSignature: new Date(),
        signatureNom: input.signatureNom,
        statutInterne: "actif",
      });

      const courtierId = (result as any).insertId as number;

      // Géocodage automatique de l'adresse
      try {
        const coords = await geocodeAdresse(input.adresse, input.codePostal, input.ville);
        if (coords) {
          await db.update(courtiers)
            .set({ latitude: coords.latitude, longitude: coords.longitude })
            .where(eq(courtiers.id, courtierId));
        }
      } catch (geoErr) {
        console.error("[courtiers.inscrire] Erreur géocodage:", geoErr);
      }

      // Générer le code parrain unique
      const nomClean = input.nom.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 8);
      const codeParrainCourtier = `SIG-${nomClean}-${String(courtierId).padStart(4, "0")}`;
      await db.update(courtiers).set({ codeParrain: codeParrainCourtier }).where(eq(courtiers.id, courtierId));

      // ─── ACTIONS CRITIQUES (toujours exécutées, indépendantes du PDF) ──────
      // 1. Accès portail : ajouter dans allowed_emails (BLOQUANT — doit précéder registerLocalUser)
      const [existingAllowed] = await db.select().from(allowedEmails)
        .where(eq(allowedEmails.email, input.email.toLowerCase())).limit(1);
      if (!existingAllowed) {
        await db.insert(allowedEmails).values({
          email: input.email.toLowerCase(),
          nom: `${input.prenom} ${input.nom}`,
          role: "courtier",
          actif: true,
        });
      } else {
        await db.update(allowedEmails)
          .set({ role: "courtier", actif: true })
          .where(eq(allowedEmails.email, input.email.toLowerCase()));
      }

      // 1b. Le courtier créera son compte lui-même via /register (même système fiable que les agents)

      // 2. Notifications in-app Manon + Owner
      await Promise.all([
        createNotification({
          destinataire: "Manon",
          type: "nouveau_courtier",
          titre: `🎉 Nouveau courtier : ${input.prenom} ${input.nom}`,
          message: `${input.statut.replace(/_/g, " ")} — ${input.ville} — ${input.email}${parrainNom ? ` — Parrain : ${parrainNom}` : ""}`,
          lien: "/dashboard/courtiers",
        }),
        createNotification({
          destinataire: "Owner",
          type: "nouveau_courtier",
          titre: `🎉 Nouveau courtier : ${input.prenom} ${input.nom}`,
          message: `${input.statut.replace(/_/g, " ")} — ${input.ville} — ${input.email}`,
          lien: "/dashboard/courtiers",
        }),
      ]).catch(console.error);
      // 3. Notification in-app au parrain
      const isRealParrain = (parrainId && parrainId !== 30002) || !!parrainAmbassadeurId;
      if (isRealParrain && parrainEmail) {
        db.insert(notificationsInApp).values({
          destinataireEmail: parrainEmail,
          type: "nouveau_filleul",
          titre: `🎉 Nouveau filleul : ${input.prenom} ${input.nom}`,
          message: `${input.prenom} ${input.nom} vient de rejoindre le réseau grâce à votre parrainage !`,
          lien: "/dashboard/portail",
          lu: false,
          createdAt: Date.now(),
        }).catch(console.error);
      }
      // 4. Email Manon + Owner + parrain
      sendNouveauCourtierNotif({
        prenom: input.prenom, nom: input.nom, email: input.email,
        telephone: input.telephone, ville: input.ville,
        statut: input.statut, cabinetNom: input.cabinetNom,
        numeroOrias: input.numeroOrias, codeParrain: codeParrainCourtier,
        parrainNom, parrainEmail,
      }).catch(console.error);
      // 5. notifyOwner
      notifyOwner({
        title: `🎉 Nouveau courtier : ${input.prenom} ${input.nom}`,
        content: `${input.statut.replace(/_/g, " ")} — ${input.ville}\nEmail : ${input.email}\nTél : ${input.telephone}${parrainNom ? `\nParrain : ${parrainNom}` : ""}`,
      }).catch(console.error);

      // ─── GÉNÉRATION PDF (optionnelle — ne bloque pas l'inscription) ──────────
      let conventionUrl: string | null = null;
      try {
        const pdfBuffer = await generateConventionCourtierPdf({
          nom: input.nom,
          prenom: input.prenom,
          email: input.email,
          telephone: input.telephone,
          adresse: input.adresse,
          codePostal: input.codePostal,
          ville: input.ville,
          statut: input.statut,
          siret: input.siret,
          cabinetNom: input.cabinetNom,
          numeroOrias: input.numeroOrias,
          courtierId,
          dateSignature,
          signatureNom: input.signatureNom,
          parrainNom,
          parrainType,
        });
        const fileKey = `conventions/courtier-${courtierId}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
        await db.update(courtiers)
          .set({ conventionPdfUrl: url, conventionPdfKey: fileKey })
          .where(eq(courtiers.id, courtierId));
        conventionUrl = url;
        // Email de bienvenue avec lien PDF + invitation à créer son compte
        const portailUrl = "https://www.sigmafactory.org/portail";
        sendBienvenueCourtier({
          prenom: input.prenom, nom: input.nom, email: input.email,
          codeParrain: codeParrainCourtier, portailUrl, conventionUrl: url,
        }).catch(console.error);
      } catch (pdfErr) {
        console.error("[courtiers.inscrire] Erreur génération PDF (non bloquant):", pdfErr);
        // Email de bienvenue sans PDF + invitation à créer son compte
        const portailUrl = "https://www.sigmafactory.org/portail";
        sendBienvenueCourtier({
          prenom: input.prenom, nom: input.nom, email: input.email,
          codeParrain: codeParrainCourtier, portailUrl,
        }).catch(console.error);
      }
      return { success: true, courtierId, conventionUrl, codeParrain: codeParrainCourtier };
    }),

  // ─── LISTE COURTIERS (ADMIN / MANON) ─────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      statut: z.enum(["en_attente", "actif", "suspendu", "resilie", "tous"]).default("tous"),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      // Jointure LEFT avec users pour récupérer la date de dernière connexion
      const { getTableColumns } = await import("drizzle-orm");
      const rows = await db
        .select({ ...getTableColumns(courtiers), lastSignedIn: users.lastSignedIn })
        .from(courtiers)
        .leftJoin(users, eq(courtiers.userId, users.id))
        .orderBy(desc(courtiers.createdAt));
      let filtered = rows;
      if (input?.statut && input.statut !== "tous") {
        filtered = filtered.filter((c) => c.statutInterne === input!.statut);
      }
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter((c) =>
          c.nom.toLowerCase().includes(s) ||
          c.prenom.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          (c.cabinetNom?.toLowerCase().includes(s) ?? false)
        );
      }
      return filtered;
    }),

  // ─── QUOTA HEBDOMADAIRE (léger, pour AssigneeSelect) ─────────────────────────────────
  quotaHebdo: protectedProcedure
    .query(async () => {
      const db = (await getDb())!;
      const allCourtiers = await db.select().from(courtiers);
      const allAssignations = await db.select().from(assignationsFinancement);
      // Fenêtre lundi → dimanche
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return allCourtiers.map((c: any) => {
        const hebdo = allAssignations.filter((a: any) => {
          if (a.courtierId !== c.id) return false;
          const d = new Date(a.createdAt ?? 0);
          return d >= monday && d <= sunday;
        }).length;
        let regions: string[] = [];
        try { regions = JSON.parse(c.regionsOperation ?? "[]"); } catch {}
        return {
          courtierNom: `${c.prenom ?? ""} ${c.nom}`.trim(),
          hebdo,
          regions,
        };
      });
    }),

  // ─── DÉTAIL COURTIER ─────────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [courtier] = await db.select().from(courtiers).where(eq(courtiers.id, input.id)).limit(1);
      if (!courtier) throw new Error("Courtier introuvable");

      // Filleuls directs (N1) — parmi les courtiers
      const filleulsCourtiers = await db.select().from(courtiers)
        .where(eq(courtiers.parrainId, input.id));

      // Filleuls directs (N1) — parmi les ambassadeurs (via parrainCourtierId dans ambassadeurs)
      const filleulsAmbassadeurs = await db.select().from(ambassadeurs)
        .where(eq(ambassadeurs.parrainCourtierId, input.id));

      // Dossiers
      const dossiers = await db.select().from(dossiersCourtagge)
        .where(eq(dossiersCourtagge.courtierId, input.id))
        .orderBy(desc(dossiersCourtagge.createdAt));

      // Commissions
      const comms = await db.select().from(commissionsCourtage)
        .where(and(
          eq(commissionsCourtage.beneficiaireType, "courtier"),
          eq(commissionsCourtage.beneficiaireId, input.id)
        ));

      const totalCommissions = comms.reduce((s: number, c: typeof comms[0]) => s + c.montantHt, 0);
      const commissionsPayees = comms.filter((c: typeof comms[0]) => c.statut === "paye").reduce((s: number, c: typeof comms[0]) => s + c.montantHt, 0);

      // Assignations de financement (dossiers leads envoyés par Manon)
      const assignations = await db.select().from(assignationsFinancement)
        .where(eq(assignationsFinancement.courtierId, input.id))
        .orderBy(desc(assignationsFinancement.createdAt));
      const assignationsAvecDossier = await Promise.all(
        assignations.map(async (a: typeof assignations[0]) => {
          const [dossier] = await db.select().from(dossiersFinancement)
            .where(eq(dossiersFinancement.id, a.dossierFinancementId)).limit(1);
          return { assignation: a, dossier: dossier ?? null };
        })
      );
      return {
        courtier,
        filleulsCourtiers,
        filleulsAmbassadeurs,
        dossiers,
        commissions: comms,
        assignationsFinancement: assignationsAvecDossier,
        stats: {
          totalDossiers: dossiers.length,
          dossiersActifs: dossiers.filter((d: typeof dossiers[0]) => ["nouveau", "en_cours", "en_attente_banque"].includes(d.statut)).length,
          dossiersFinalisés: dossiers.filter((d: typeof dossiers[0]) => d.statut === "finalise").length,
          totalCommissions,
          commissionsPayees,
          commissionsEnAttente: totalCommissions - commissionsPayees,
          totalFilleuls: filleulsCourtiers.length + filleulsAmbassadeurs.length,
          dossiersLeads: assignations.length,
          dossiersLeadsEnCours: assignations.filter((a: typeof assignations[0]) => a.statut === "en_cours").length,
          dossiersLeadsValides: assignations.filter((a: typeof assignations[0]) => a.statut === "valide").length,
        }
      };
    }),

  // ─── MON PROFIL (pour le courtier connecté) ──────────────────────────────────
  monProfil: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    // 1ère tentative : par userId (lien déjà établi)
    let [courtier] = await db.select().from(courtiers)
      .where(eq(courtiers.userId, ctx.user.id)).limit(1);

    // Fallback : par email (inscription faite avant connexion Manus)
    if (!courtier && ctx.user.email) {
      const [byEmail] = await db.select().from(courtiers)
        .where(eq(courtiers.email, ctx.user.email)).limit(1);
      if (byEmail) {
        // Lier le userId pour les prochaines connexions
        await db.update(courtiers)
          .set({ userId: ctx.user.id })
          .where(eq(courtiers.id, byEmail.id));
        courtier = { ...byEmail, userId: ctx.user.id };
      }
    }

    return courtier ?? null;
  }),
  // ─── METTRE À JOUR STATUT ─────────────────────────────────────────────────
  updateStatut: protectedProcedure
    .input(z.object({
      id: z.number(),
      statutInterne: z.enum(["en_attente", "actif", "suspendu", "resilie"]),
      notesInternes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(courtiers)
        .set({
          statutInterne: input.statutInterne,
          ...(input.notesInternes !== undefined ? { notesInternes: input.notesInternes } : {}),
        })
        .where(eq(courtiers.id, input.id));
      return { success: true };
    }),

  // ─── DOSSIERS COURTAGE ────────────────────────────────────────────────────
  dossiers: {
    list: protectedProcedure
      .input(z.object({
        courtierId: z.number().optional(),
        statut: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = (await getDb())!;
        let rows = await db.select().from(dossiersCourtagge).orderBy(desc(dossiersCourtagge.createdAt));
        if (input?.courtierId) {
          rows = rows.filter((d: typeof rows[0]) => d.courtierId === input!.courtierId);
        }
        if (input?.statut) {
          rows = rows.filter((d: typeof rows[0]) => d.statut === input!.statut);
        }
        return rows;
      }),

    create: protectedProcedure
      .input(z.object({
        courtierId: z.number(),
        clientNom: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientTelephone: z.string().optional(),
        typeDossier: z.enum(["credit_immobilier", "credit_professionnel", "rachat_credit", "credit_conso", "autre"]),
        montantFinancement: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        const [result] = await db.insert(dossiersCourtagge).values({
          ...input,
          statut: "nouveau",
          commissionsCalculees: false,
        });
        return { success: true, id: (result as any).insertId };
      }),

    updateStatut: protectedProcedure
      .input(z.object({
        id: z.number(),
        statut: z.enum(["nouveau", "en_cours", "en_attente_banque", "accepte", "refuse", "finalise", "annule"]),
        honorairesTotal: z.number().optional(),
        dateEncaissement: z.string().optional(),
        notesInternes: z.string().optional(),
        assigneA: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        const { id, ...updates } = input;

        // Calculer les parts si honoraires fournis
        const extraUpdates: Record<string, any> = {};
        if (updates.honorairesTotal) {
          extraUpdates.commissionSigmaHt = Math.round(updates.honorairesTotal * 0.25);
          extraUpdates.partCourtierHt = Math.round(updates.honorairesTotal * 0.75);
        }

        await db.update(dossiersCourtagge)
          .set({ ...updates, ...extraUpdates })
          .where(eq(dossiersCourtagge.id, id));

        // Si finalise et honoraires, calculer les commissions réseau
        if (input.statut === "finalise" && input.honorairesTotal) {
          const [dossier] = await db.select().from(dossiersCourtagge).where(eq(dossiersCourtagge.id, id)).limit(1);
          if (dossier && !dossier.commissionsCalculees) {
            await calculerCommissionsReseau(db, dossier.id, dossier.courtierId, extraUpdates.commissionSigmaHt);
          }
        }

        return { success: true };
      }),
  },

  // ─── COMMISSIONS RÉSEAU ───────────────────────────────────────────────────
  commissions: {
    list: protectedProcedure
      .input(z.object({
        beneficiaireType: z.enum(["courtier", "ambassadeur"]).optional(),
        beneficiaireId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = (await getDb())!;
        let rows = await db.select().from(commissionsCourtage).orderBy(desc(commissionsCourtage.createdAt));
        if (input?.beneficiaireType) rows = rows.filter((c: typeof rows[0]) => c.beneficiaireType === input!.beneficiaireType);
        if (input?.beneficiaireId) rows = rows.filter((c: typeof rows[0]) => c.beneficiaireId === input!.beneficiaireId);
        return rows;
      }),

    valider: protectedProcedure
      .input(z.object({
        id: z.number(),
        valideParNom: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        await db.update(commissionsCourtage)
          .set({ valideParAdmin: true, valideParNom: input.valideParNom })
          .where(eq(commissionsCourtage.id, input.id));
        return { success: true };
      }),

    marquerPaye: protectedProcedure
      .input(z.object({
        id: z.number(),
        reference: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        await db.update(commissionsCourtage)
          .set({
            statut: "paye",
            datePaiement: new Date().toLocaleDateString("fr-FR"),
            ...(input.reference ? { reference: input.reference } : {}),
          })
          .where(eq(commissionsCourtage.id, input.id));
        return { success: true };
      }),
  },

  // ─── RÉSOUDRE UN CODE PARRAIN (public) ──────────────────────────────────────
  resoudreParrain: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const code = input.code.trim();
      if (!code) return null;

      // Chercher parmi les courtiers (par code parrain ou email)
      const [courtier] = await db.select().from(courtiers)
        .where(or(
          eq(courtiers.codeParrain, code),
          eq(courtiers.email, code)
        ))
        .limit(1);
      if (courtier) {
        return { id: courtier.id, idType: "courtier" as const, nom: `${courtier.prenom} ${courtier.nom}`, type: "courtier" as const, code: courtier.codeParrain ?? code };
      }

      // Chercher parmi les ambassadeurs (par code parrain ou email)
      const { ambassadeurs: ambTable } = await import("../../drizzle/schema");
      const [ambassadeur] = await db.select().from(ambTable)
        .where(or(
          eq(ambTable.codeParrain, code),
          eq(ambTable.email, code)
        ))
        .limit(1);
      if (ambassadeur) {
        return { id: ambassadeur.id, idType: "agent" as const, nom: `${ambassadeur.prenom} ${ambassadeur.nom}`, type: "agent" as const, code: ambassadeur.codeParrain ?? code };
      }

      // Code spécial Sigma
      if (code === "SIG-SIGMA-0001") {
        return { id: 3, idType: "agent" as const, nom: "Sigma Factory", type: "sigma" as const, code };
      }

      return null;
    }),

  // ─── MON RÉSEAU (filleuls + commissions parrainage) ────────────────────────────────────────────
  monReseau: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    // Trouver le courtier connecté (avec fallback email)
    let [courtier] = await db.select().from(courtiers)
      .where(eq(courtiers.userId, ctx.user.id)).limit(1);
    if (!courtier && ctx.user.email) {
      const [byEmail] = await db.select().from(courtiers)
        .where(eq(courtiers.email, ctx.user.email)).limit(1);
      if (byEmail) {
        await db.update(courtiers).set({ userId: ctx.user.id }).where(eq(courtiers.id, byEmail.id));
        courtier = { ...byEmail, userId: ctx.user.id };
      }
    }
    if (!courtier) return { filleulsCourtiers: [], filleulsAgents: [], commissions: [], stats: { totalFilleuls: 0, commissionsTotal: 0, commissionsPayees: 0, commissionsEnAttente: 0 } };
    const { ambassadeurs: ambTable } = await import("../../drizzle/schema");

    // Filleuls courtiers (parrainés par ce courtier)
    const filleulsCourtiers = await db.select().from(courtiers)
      .where(eq(courtiers.parrainId, courtier.id));

    // Filleuls agents (ambassadeurs parrainés par ce courtier)
    const filleulsAgents = await db.select().from(ambTable)
      .where(eq(ambTable.parrainCourtierId, courtier.id));

    // Commissions de parrainage générées par ce courtier
    const comms = await db.select().from(commissionsCourtage)
      .where(and(
        eq(commissionsCourtage.beneficiaireType, "courtier"),
        eq(commissionsCourtage.beneficiaireId, courtier.id)
      ))
      .orderBy(desc(commissionsCourtage.createdAt));

    const commissionsTotal = comms.reduce((s: number, c: typeof comms[0]) => s + c.montantHt, 0);
    const commissionsPayees = comms.filter((c: typeof comms[0]) => c.statut === "paye").reduce((s: number, c: typeof comms[0]) => s + c.montantHt, 0);

    return {
      filleulsCourtiers: filleulsCourtiers.map((f: typeof filleulsCourtiers[0]) => ({
        id: f.id, nom: f.nom, prenom: f.prenom, email: f.email,
        statutInterne: f.statutInterne, ville: f.ville,
        createdAt: f.createdAt, codeParrain: f.codeParrain,
      })),
      filleulsAgents: filleulsAgents.map((f: typeof filleulsAgents[0]) => ({
        id: f.id, nom: f.nom, prenom: f.prenom, email: f.email,
        statutInterne: f.statutInterne, ville: f.ville,
        createdAt: f.createdAt, codeParrain: f.codeParrain,
      })),
      commissions: comms,
      stats: {
        totalFilleuls: filleulsCourtiers.length + filleulsAgents.length,
        commissionsTotal,
        commissionsPayees,
        commissionsEnAttente: commissionsTotal - commissionsPayees,
      },
    };
  }),

  // ─── ARBORESCENCE COURTIERS (pour le dashboard réseau) ─────────────────────────────────────────────────────────────
  arborescence: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const tous = await db.select().from(courtiers).orderBy(courtiers.createdAt);
    // N1 = sans parrain courtier OU rattaché au compte master Sigma Factory (id 30002)
    // On exclut le compte master lui-même (id 30002) de l'affichage
    const SIGMA_MASTER_ID = 30002;
    const n1 = tous.filter((c: typeof tous[0]) =>
      c.id !== SIGMA_MASTER_ID && (!c.parrainId || c.parrainId === SIGMA_MASTER_ID)
    );
    return n1.map((parent: typeof tous[0]) => ({
      ...parent,
      filleuls: tous.filter((f: typeof tous[0]) => f.parrainId === parent.id && f.id !== SIGMA_MASTER_ID),
    }));
  }),
  // ─── SUPPRIMER UN COURTIER (protégé) ─────────────────────────────────────────────────────────────────────────────────
  // ─── RENVOYER EMAIL DE BIENVENUE ─────────────────────────────────────────────
  renvoyerEmailBienvenue: protectedProcedure
    .input(z.object({ id: z.number(), origin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [courtier] = await db.select().from(courtiers).where(eq(courtiers.id, input.id)).limit(1);
      if (!courtier) return { success: false, message: "Courtier introuvable" };
      const portailUrl = "https://www.sigmafactory.org/portail";
      const sent = await sendBienvenueCourtier({
        prenom: courtier.prenom,
        nom: courtier.nom,
        email: courtier.email,
        codeParrain: courtier.codeParrain || "",
        portailUrl,
        conventionUrl: courtier.conventionPdfUrl || undefined,
      });
      return { success: sent, message: sent ? `Email envoyé à ${courtier.email}` : "Erreur envoi email" };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(courtiers).where(eq(courtiers.id, input.id));
      return { success: true };
    }),

  // ─── METTRE À JOUR LES RÉGIONS D'OPÉRATION ─────────────────────────────────
  updateRegions: protectedProcedure
    .input(z.object({
      id: z.number(),
      regionsOperation: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(courtiers)
        .set({ regionsOperation: JSON.stringify(input.regionsOperation) })
        .where(eq(courtiers.id, input.id));
      return { success: true };
    }),

  // ─── METTRE À JOUR SES PROPRES RÉGIONS (portail courtier) ────────────────────
  updateMesRegions: protectedProcedure
    .input(z.object({ regionsOperation: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [courtier] = await db.select().from(courtiers).where(eq(courtiers.userId, ctx.user.id)).limit(1);
      if (!courtier) throw new Error("Profil courtier introuvable");
      await db.update(courtiers)
        .set({ regionsOperation: JSON.stringify(input.regionsOperation) })
        .where(eq(courtiers.id, courtier.id));
      return { success: true };
    }),

  statsGlobales: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalCourtiers: 0, courtiersActifs: 0, dossiersEnCours: 0, dossiersValides: 0 };
    const tousCourtiers = await db.select().from(courtiers);
    const tousD = await db.select().from(dossiersCourtagge);
    return {
      totalCourtiers: tousCourtiers.length,
      courtiersActifs: tousCourtiers.filter((c: any) => c.statutInterne === "actif").length,
      dossiersEnCours: tousD.filter((d: any) => d.statut === "en_cours").length,
      dossiersValides: tousD.filter((d: any) => d.statut === "valide").length,
    };
  }),
});

// ─── HELPER : Calcul automatique des commissions réseau ───────────────────────
async function calculerCommissionsReseau(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, dossierCourtageId: number, courtierId: number, commissionSigmaHt: number) {
  const { courtiers: courtiersTable, ambassadeurs } = await import("../../drizzle/schema");

  // Récupérer le courtier apporteur
  const [courtier] = await db.select().from(courtiersTable).where(eq(courtiersTable.id, courtierId)).limit(1);
  if (!courtier) return;

  const commissionsToInsert = [];

  // Parrain N1 (courtier)
  if (courtier.parrainId) {
    commissionsToInsert.push({
      dossierCourtageId,
      beneficiaireType: "courtier" as const,
      beneficiaireId: courtier.parrainId,
      niveau: "1" as const,
      tauxPourcent: 10,
      commissionSigmaHt,
      montantHt: Math.round(commissionSigmaHt * 0.10),
      statut: "a_payer" as const,
      valideParAdmin: false,
    });

    // Grand-parrain N2 (courtier)
    const [parrainN1] = await db.select().from(courtiersTable).where(eq(courtiersTable.id, courtier.parrainId)).limit(1);
    if (parrainN1?.parrainId) {
      commissionsToInsert.push({
        dossierCourtageId,
        beneficiaireType: "courtier" as const,
        beneficiaireId: parrainN1.parrainId,
        niveau: "2" as const,
        tauxPourcent: 5,
        commissionSigmaHt,
        montantHt: Math.round(commissionSigmaHt * 0.05),
        statut: "a_payer" as const,
        valideParAdmin: false,
      });
    } else if (parrainN1?.parrainAmbassadeurId) {
      // Grand-parrain N2 est un ambassadeur
      commissionsToInsert.push({
        dossierCourtageId,
        beneficiaireType: "ambassadeur" as const,
        beneficiaireId: parrainN1.parrainAmbassadeurId,
        niveau: "2" as const,
        tauxPourcent: 5,
        commissionSigmaHt,
        montantHt: Math.round(commissionSigmaHt * 0.05),
        statut: "a_payer" as const,
        valideParAdmin: false,
      });
    }
  } else if (courtier.parrainAmbassadeurId) {
    // Parrain N1 est un ambassadeur
    commissionsToInsert.push({
      dossierCourtageId,
      beneficiaireType: "ambassadeur" as const,
      beneficiaireId: courtier.parrainAmbassadeurId,
      niveau: "1" as const,
      tauxPourcent: 10,
      commissionSigmaHt,
      montantHt: Math.round(commissionSigmaHt * 0.10),
      statut: "a_payer" as const,
      valideParAdmin: false,
    });

    // Grand-parrain N2 de l'ambassadeur
    const [parrainAmb] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, courtier.parrainAmbassadeurId)).limit(1);
    if (parrainAmb?.parrainId) {
      commissionsToInsert.push({
        dossierCourtageId,
        beneficiaireType: "ambassadeur" as const,
        beneficiaireId: parrainAmb.parrainId,
        niveau: "2" as const,
        tauxPourcent: 5,
        commissionSigmaHt,
        montantHt: Math.round(commissionSigmaHt * 0.05),
        statut: "a_payer" as const,
        valideParAdmin: false,
      });
    }
  }

  if (commissionsToInsert.length > 0) {
    await db.insert(commissionsCourtage).values(commissionsToInsert);
  }

  // Marquer le dossier comme calculé
  await db.update(dossiersCourtagge)
    .set({ commissionsCalculees: true })
    .where(eq(dossiersCourtagge.id, dossierCourtageId));
}

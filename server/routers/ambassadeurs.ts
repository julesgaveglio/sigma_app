import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ambassadeurs, biens, commissions, propositions, crmLeads, mandatsRecherche, courtiers, matchingDossiers, notificationsInApp, allowedEmails, offMarketBiens, users, Ambassadeur, Bien, Commission, MatchingDossier } from "../../drizzle/schema";
import { eq, and, desc, or, inArray, getTableColumns } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { generateContratPdf } from "../contratGenerator";
import { notifyOwner } from "../_core/notification";
import { sendNouvelAmbassadeurNotif, sendBienvenueAmbassadeur, sendNouveauFilleulNotif } from "../mailer";
import { createNotification } from "../db";
import { geocodeAdresse } from "../geocode";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const AmbassadeurSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email(),
  telephone: z.string().min(1),
  adresse: z.string().min(1),
  codePostal: z.string().min(1),
  ville: z.string().min(1),
  statut: z.enum(["agent_immobilier", "mandataire", "courtier", "auto_entrepreneur", "autre"]),
  siret: z.string().optional(),
  activitePrincipale: z.string().optional(),
  parrainId: z.number().optional(),
  signatureNom: z.string().min(1),
  signatureAcceptee: z.literal(true),
});

const BienSchema = z.object({
  ambassadeurId: z.number(),
  titre: z.string().min(1),
  typeBien: z.enum(["appartement", "maison", "villa", "terrain", "local_commercial", "autre"]),
  transaction: z.enum(["vente", "location"]).default("vente"),
  usage: z.enum(["residence_principale", "residence_secondaire", "investissement_locatif", "professionnel"]),
  adresse: z.string().min(1),
  codePostal: z.string().min(1),
  ville: z.string().min(1),
  departement: z.string().optional(),
  region: z.string().optional(),
  surface: z.number().min(1),
  surfaceTerrain: z.number().optional(),
  nbPieces: z.number().optional(),
  nbChambres: z.number().optional(),
  nbSallesBain: z.number().optional(),
  nbEtages: z.number().optional(),
  etage: z.number().optional(),
  anneeConstruction: z.number().optional(),
  etatBien: z.enum(["neuf", "bon_etat", "a_renover", "a_rafraichir"]),
  travauxEstimes: z.number().optional(),
  dpeLettre: z.enum(["A", "B", "C", "D", "E", "F", "G", "NC"]).optional(),
  dpeValeur: z.number().optional(),
  gesLettre: z.enum(["A", "B", "C", "D", "E", "F", "G", "NC"]).optional(),
  gesValeur: z.number().optional(),
  balcon: z.boolean().optional(),
  terrasse: z.boolean().optional(),
  jardin: z.boolean().optional(),
  parking: z.boolean().optional(),
  garage: z.boolean().optional(),
  cave: z.boolean().optional(),
  ascenseur: z.boolean().optional(),
  gardien: z.boolean().optional(),
  piscine: z.boolean().optional(),
  exposition: z.string().optional(),
  vue: z.string().optional(),
  prix: z.number().min(1),
  prixNetVendeur: z.number().optional(),
  honorairesAgence: z.number().optional(),
  prixNegociable: z.boolean().optional(),
  chargesAnnuelles: z.number().optional(),
  taxeFonciere: z.number().optional(),
  photosUrls: z.array(z.string()).optional(),
  description: z.string().optional(),
  pointsForts: z.string().optional(),
});

const CommissionSchema = z.object({
  ambassadeurId: z.number(),
  bienId: z.number().optional(),
  crmLeadId: z.number().optional(),
  descriptionVente: z.string().optional(),
  commissionSigmaHt: z.number(),
  dateEncaissement: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export const ambassadeursRouter = router({
  // ── Onboarding public ──────────────────────────────────────────────────────
  inscrire: publicProcedure
    .input(AmbassadeurSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      const { signatureAcceptee: _sig, ...data } = input;
      // Auto-rattacher au compte master Sigma si aucun parrain fourni
      if (!data.parrainId) {
        data.parrainId = 3; // Sigma Factory master (id=3)
      }
      const niveau: "1" | "2" = "1"; // Tous les filleuls directs de Sigma sont N1
      
      const [result] = await db.insert(ambassadeurs).values({
        ...data,
        niveau,
        contratSigne: true,
        dateSignature: new Date(),
        signatureNom: data.signatureNom,
        statutInterne: "actif",
      });
      
      const ambassadeurId = (result as { insertId: number }).insertId;

      // Géocodage automatique de l'adresse
      try {
        const coords = await geocodeAdresse(data.adresse, data.codePostal, data.ville);
        if (coords) {
          await db.update(ambassadeurs)
            .set({ latitude: coords.latitude, longitude: coords.longitude })
            .where(eq(ambassadeurs.id, ambassadeurId));
        }
      } catch (geoErr) {
        console.error("[ambassadeurs.inscrire] Erreur géocodage:", geoErr);
      }
      
      // Générer le code parrain unique
      const nomClean = data.nom.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 8);
      const codeParrain = `SIG-${nomClean}-${String(ambassadeurId).padStart(4, "0")}`;
      await db.update(ambassadeurs).set({ codeParrain }).where(eq(ambassadeurs.id, ambassadeurId));

      // 1. Accès portail : ajouter dans allowed_emails (BLOQUANT — doit précéder registerLocalUser)
      const [existingAllowedAmb] = await db.select().from(allowedEmails)
        .where(eq(allowedEmails.email, data.email.toLowerCase())).limit(1);
      if (!existingAllowedAmb) {
        await db.insert(allowedEmails).values({
          email: data.email.toLowerCase(),
          nom: `${data.prenom} ${data.nom}`,
          role: "agent",
          actif: true,
        });
      } else {
        await db.update(allowedEmails)
          .set({ role: "agent", actif: true })
          .where(eq(allowedEmails.email, data.email.toLowerCase()));
      }

      // 2. L'ambassadeur créera son compte lui-même via /register (même système fiable que les agents)

      try {
        const pdfBuffer = await generateContratPdf({
          ...data,
          niveau,
          ambassadeurId,
          dateSignature: new Date().toLocaleDateString("fr-FR"),
        });
        
        const key = `contrats/ambassadeur-${ambassadeurId}-${nanoid(8)}.pdf`;
        const { url } = await storagePut(key, pdfBuffer, "application/pdf");
        
        await db.update(ambassadeurs)
          .set({ contratPdfUrl: url, contratPdfKey: key })
          .where(eq(ambassadeurs.id, ambassadeurId));
        
        await notifyOwner({
          title: `🤝 Nouvel ambassadeur : ${data.prenom} ${data.nom}`,
          content: `Niveau ${niveau} — ${data.statut.replace(/_/g, " ")} — ${data.ville}\nEmail : ${data.email}\nTél : ${data.telephone}${data.parrainId ? `\nParrain ID : ${data.parrainId}` : ""}`,
        });

        // Notification in-app Élodie + Owner
        await Promise.all([
          createNotification({
            destinataire: "Elodie",
            type: "nouvel_ambassadeur",
            titre: `🤝 Nouvel agent : ${data.prenom} ${data.nom}`,
            message: `${data.statut.replace(/_/g, " ")} — ${data.ville} — ${data.email}`,
            lien: "/dashboard/reseau",
          }),
          createNotification({
            destinataire: "Owner",
            type: "nouvel_ambassadeur",
            titre: `🤝 Nouvel agent : ${data.prenom} ${data.nom}`,
            message: `${data.statut.replace(/_/g, " ")} — ${data.ville} — ${data.email}`,
            lien: "/dashboard/reseau",
          }),
        ]);

        // Email Élodie + Owner
        sendNouvelAmbassadeurNotif({
          prenom: data.prenom, nom: data.nom, email: data.email,
          telephone: data.telephone, ville: data.ville,
          statut: data.statut, niveau,
          codeParrain,
        }).catch(console.error);

        // Email de bienvenue à l'ambassadeur avec invitation à créer son compte
        const portailUrl = "https://www.sigmafactory.org/portail";
        sendBienvenueAmbassadeur({
          prenom: data.prenom, nom: data.nom, email: data.email,
          codeParrain, portailUrl, contratUrl: url,
        }).catch(console.error);
        // Notification au parrain (si parrain réel, pas Sigma Factory master id=3)
        if (data.parrainId && data.parrainId !== 3) {
          try {
            const [parrain] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, data.parrainId));
            if (parrain?.email) {
              // Notif in-app pour le parrain
              await db.insert(notificationsInApp).values({
                destinataireEmail: parrain.email,
                type: "nouveau_filleul",
                titre: `🎉 Nouveau filleul agent : ${data.prenom} ${data.nom}`,
                message: `${data.statut.replace(/_/g, " ")} — ${data.ville}`,
                lien: "/dashboard/portail",
                lu: false,
                createdAt: Date.now(),
              });
              // Email au parrain
              sendNouveauFilleulNotif({
                parrainPrenom: parrain.prenom,
                parrainEmail: parrain.email,
                filleulPrenom: data.prenom,
                filleulNom: data.nom,
                filleulStatut: data.statut,
                filleulVille: data.ville,
                type: "agent",
              }).catch(console.error);
            }
          } catch (parrainErr) {
            console.error("[ambassadeurs.inscrire] Erreur notif parrain:", parrainErr);
          }
        }
        return { success: true, ambassadeurId, contratUrl: url, codeParrain };
      } catch (e) {
        console.error("[ambassadeurs.inscrire] Erreur génération/upload PDF:", e);
        // Email de bienvenue sans PDF avec invitation à créer son compte
        const portailUrl = "https://www.sigmafactory.org/portail";
        sendBienvenueAmbassadeur({
          prenom: data.prenom, nom: data.nom, email: data.email,
          codeParrain, portailUrl,
        }).catch(console.error);
        return { success: true, ambassadeurId, contratUrl: null, codeParrain };
      }
    }),

  // ── Liste des ambassadeurs ─────────────────────────────────────────────────
  list: publicProcedure
    .input(z.object({
      statut: z.string().optional(),
      niveau: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        console.error("[ambassadeurs.list] DB is null");
        return [];
      }
      
      try {
        // Jointure LEFT avec users pour récupérer la date de dernière connexion
        let rows = await db
          .select({ ...getTableColumns(ambassadeurs), lastSignedIn: users.lastSignedIn })
          .from(ambassadeurs)
          .leftJoin(users, eq(ambassadeurs.userId, users.id))
          .orderBy(desc(ambassadeurs.createdAt));
        console.log("[ambassadeurs.list] Fetched", rows.length, "ambassadeurs");
        
        if (input?.statut) rows = rows.filter((a) => a.statutInterne === input.statut as any);
        if (input?.niveau) rows = rows.filter((a) => a.niveau === input.niveau as any);
        if (input?.search) {
          const s = input.search.toLowerCase();
          rows = rows.filter((a) =>
            a.nom.toLowerCase().includes(s) ||
            a.prenom.toLowerCase().includes(s) ||
            a.email.toLowerCase().includes(s) ||
            a.ville.toLowerCase().includes(s)
          );
        }
        
        console.log("[ambassadeurs.list] Returning", rows.length, "ambassadeurs after filters");
        return rows;
      } catch (error) {
        console.error("[ambassadeurs.list] Error:", error);
        throw error;
      }
    }),

  // ── Arborescence réseau ────────────────────────────────────────────────────
  arborescence: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const tous: Ambassadeur[] = await db.select().from(ambassadeurs).orderBy(ambassadeurs.createdAt);
    
    // Sigma Factory (id=3) est la racine — afficher uniquement Sigma avec ses filleuls directs
    const sigma = tous.find((a: Ambassadeur) => a.id === 3);
    const filleulsDeSigma = tous.filter((a: Ambassadeur) => a.parrainId === 3);
    const result = filleulsDeSigma.map((parent: Ambassadeur) => ({
      ...parent,
      filleuls: tous.filter((f: Ambassadeur) => f.parrainId === parent.id),
    }));
    // Ajouter Sigma en tête avec ses filleuls directs
    if (sigma) {
      return [{ ...sigma, filleuls: filleulsDeSigma }];
    }
    return result;
  }),

  // ── Détail ambassadeur ─────────────────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      const [amb] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, input.id));
      if (!amb) throw new Error("Ambassadeur introuvable");
      
      const biensList = await db.select().from(biens).where(eq(biens.ambassadeurId, input.id));
      const commissionsList = await db.select().from(commissions).where(eq(commissions.ambassadeurId, input.id));
      const filleuls = await db.select().from(ambassadeurs).where(eq(ambassadeurs.parrainId, input.id));
      // Filleuls courtiers (réseau croisé : courtiers dont cet ambassadeur est le parrain)
      const filleulsCourtiers = await db.select().from(courtiers).where(eq(courtiers.parrainAmbassadeurId, input.id));
      
      // Stats calculées
      const totalCommissions = commissionsList.reduce((s: number, c: Commission) => s + c.montantHt, 0);
      const commissionsPayees = commissionsList.filter((c: Commission) => c.statut === "paye").reduce((s: number, c: Commission) => s + c.montantHt, 0);
      const ventesConclues = commissionsList.filter((c: Commission) => c.niveau === "0").length;
      const biensActifs = biensList.filter((b: Bien) => b.statutBien === "publie").length;
      const biensVendus = biensList.filter((b: Bien) => b.statutBien === "vendu").length;
      return {
        ...amb,
        biens: biensList,
        commissions: commissionsList,
        filleuls,
        filleulsCourtiers,
        stats: {
          totalBiens: biensList.length,
          biensActifs,
          biensVendus,
          ventesConclues,
          totalFilleuls: filleuls.length + filleulsCourtiers.length,
          totalCommissions,
          commissionsPayees,
          commissionsEnAttente: totalCommissions - commissionsPayees,
        }
      };
    }),

  // ── Mettre à jour le statut ────────────────────────────────────────────────
  updateStatut: protectedProcedure
    .input(z.object({
      id: z.number(),
      statut: z.enum(["en_attente", "actif", "suspendu", "resilie"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      await db.update(ambassadeurs)
        .set({ statutInterne: input.statut, notesInternes: input.notes })
        .where(eq(ambassadeurs.id, input.id));
      return { success: true };
    }),

  // ── Biens ──────────────────────────────────────────────────────────────────
  listBiens: publicProcedure
    .input(z.object({
      ambassadeurId: z.number().optional(),
      statut: z.string().optional(),
      typeBien: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let rows: Bien[] = await db.select().from(biens).orderBy(desc(biens.createdAt));
      
      if (input?.ambassadeurId) rows = rows.filter((b: Bien) => b.ambassadeurId === input.ambassadeurId);
      if (input?.statut) rows = rows.filter((b: Bien) => b.statutBien === input.statut);
      if (input?.typeBien) rows = rows.filter((b: Bien) => b.typeBien === input.typeBien);
      if (input?.search) {
        const s = input.search.toLowerCase();
        rows = rows.filter((b: Bien) =>
          b.titre.toLowerCase().includes(s) ||
          b.ville.toLowerCase().includes(s) ||
          b.adresse.toLowerCase().includes(s)
        );
      }
      
      return rows;
    }),

  // ── Créer un bien ──────────────────────────────────────────────────────────
  creerBien: publicProcedure
    .input(BienSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      const [amb] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, input.ambassadeurId));
      if (!amb) throw new Error("Ambassadeur introuvable");
      
      const reference = `SIGMA-${Date.now().toString(36).toUpperCase()}`;
      
      const [result] = await db.insert(biens).values({
        ...input,
        reference,
        statutBien: "publie",
        valideParAdmin: true,
        photosUrls: input.photosUrls ? JSON.stringify(input.photosUrls) : null,
      });
      
      const bienId = (result as { insertId: number }).insertId;

      // Géocodage automatique du bien
      try {
        const coords = await geocodeAdresse(input.adresse, input.codePostal, input.ville);
        if (coords) {
          await db.update(biens)
            .set({ latitude: coords.latitude, longitude: coords.longitude })
            .where(eq(biens.id, bienId));
        }
      } catch (geoErr) {
        console.error("[ambassadeurs.creerBien] Erreur géocodage:", geoErr);
      }

      await notifyOwner({
        title: `🏠 Nouveau bien soumis par ${amb.prenom} ${amb.nom}`,
        content: `${input.titre} — ${input.typeBien} ${input.surface}m² — ${input.ville}\nRéf : ${reference} — Prix : ${input.prix.toLocaleString("fr-FR")} €`,
      });
      
      return { success: true, bienId, reference };
    }),

  // ── Valider / mettre à jour le statut d'un bien ────────────────────────────
  updateBienStatut: protectedProcedure
    .input(z.object({
      id: z.number(),
      statut: z.enum(["en_attente_validation", "publie", "sous_compromis", "vendu", "retire"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      await db.update(biens).set({
        statutBien: input.statut,
        valideParAdmin: input.statut === "publie",
        notesAdmin: input.notes,
      }).where(eq(biens.id, input.id));
      return { success: true };
    }),

  // ── Matching leads ↔ biens ─────────────────────────────────────────────────
  matchingLeads: protectedProcedure
    .input(z.object({
      crmLeadId: z.number(),
      modeElargi: z.number().min(0).max(2).default(0),
      criteresSup: z.object({
        budgetMaxOverride: z.number().optional(),
        localisationOverride: z.string().optional(),
        surfaceMinOverride: z.number().optional(),
        nbPiecesMinOverride: z.number().optional(),
        typeBienOverride: z.string().optional(),
        balconTerrasse: z.boolean().optional(),
        parking: z.boolean().optional(),
        cave: z.boolean().optional(),
        ascenseur: z.boolean().optional(),
        jardin: z.boolean().optional(),
        piscine: z.boolean().optional(),
        dpeMax: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { biens: [], mandat: null };
      const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, input.crmLeadId));
      if (!lead) throw new Error("Lead introuvable");
      // Mandat par mandatId ou par email
      let mandat = lead.mandatId
        ? (await db.select().from(mandatsRecherche).where(eq(mandatsRecherche.id, lead.mandatId)))[0] ?? null
        : null;
      if (!mandat && lead.email) {
        const [byEmail] = await db.select().from(mandatsRecherche)
          .where(eq(mandatsRecherche.email, lead.email))
          .orderBy(desc(mandatsRecherche.createdAt)).limit(1);
        mandat = byEmail ?? null;
      }
      const c = input.criteresSup ?? {};
      const budgetBase = c.budgetMaxOverride ?? mandat?.budgetMax ?? null;
      const budgetMult = input.modeElargi === 0 ? 1.05 : input.modeElargi === 1 ? 1.20 : 1.40;
      const budgetMax = budgetBase ? budgetBase * budgetMult : null;
      const typeBien = c.typeBienOverride ?? mandat?.typeBien ?? null;
      const surfaceMin = c.surfaceMinOverride ?? mandat?.surfaceMin ?? null;
      const nbPiecesMin = c.nbPiecesMinOverride ?? mandat?.nbPiecesMin ?? null;
      const localisation = (c.localisationOverride ?? mandat?.localisation ?? "").toLowerCase().trim();
      const DPE = ["A","B","C","D","E","F","G"];
      const dpeMaxIdx = c.dpeMax ? DPE.indexOf(c.dpeMax) : -1;
      // Tous les biens publiés + en attente
      const tousBiens: Bien[] = await db.select().from(biens)
        .where(or(eq(biens.statutBien, "publie"), eq(biens.statutBien, "en_attente_validation")))
        .orderBy(desc(biens.createdAt));
      // Agents
      const agentIds = Array.from(new Set(tousBiens.map(b => b.ambassadeurId).filter((id): id is number => id !== null)));
      const agents = agentIds.length > 0
        ? await db.select({ id: ambassadeurs.id, prenom: ambassadeurs.prenom, nom: ambassadeurs.nom, telephone: ambassadeurs.telephone, email: ambassadeurs.email }).from(ambassadeurs).where(inArray(ambassadeurs.id, agentIds))
        : [];
      const agentMap = new Map(agents.map(a => [a.id, a]));
      const scored = tousBiens.map((b: Bien) => {
        let score = 0;
        const raisons: string[] = [];
        const blocages: string[] = [];
        // Budget
        if (budgetMax && b.prix) {
          if (b.prix <= (budgetBase ?? 0)) { score += 30; raisons.push("Budget OK"); }
          else if (b.prix <= budgetMax) { score += 20; raisons.push("Budget lég. dépassé"); }
          else blocages.push(`Prix ${(b.prix/1000).toFixed(0)}k€ > budget`);
        }
        // Type
        if (typeBien) {
          if (b.typeBien === typeBien) { score += 20; raisons.push("Type OK"); }
          else blocages.push(`Type ${b.typeBien} ≠ ${typeBien}`);
        }
        // Localisation
        if (localisation) {
          const villeMatch = b.ville.toLowerCase().includes(localisation) || localisation.includes(b.ville.toLowerCase());
          const deptMatch = b.departement?.toLowerCase().includes(localisation) || localisation.includes(b.departement?.toLowerCase() ?? "");
          const cpMatch = b.codePostal?.startsWith(localisation.replace(/\D/g, "").substring(0, 2));
          if (villeMatch) { score += 20; raisons.push("Ville exacte"); }
          else if ((deptMatch || cpMatch) && input.modeElargi >= 1) { score += 12; raisons.push("Même département"); }
          else if (input.modeElargi >= 2) { score += 5; raisons.push("Région élargie"); }
          else blocages.push(`Localisation ${b.ville} ≠ ${localisation}`);
        }
        // Surface
        if (surfaceMin && b.surface) {
          if (b.surface >= surfaceMin) { score += 15; raisons.push(`${b.surface}m² ≥ ${surfaceMin}m²`); }
          else if (input.modeElargi >= 1 && b.surface >= surfaceMin * 0.85) { score += 8; raisons.push("Surface proche"); }
          else blocages.push(`${b.surface}m² < ${surfaceMin}m²`);
        }
        // Pièces
        if (nbPiecesMin && b.nbPieces) {
          if (b.nbPieces >= nbPiecesMin) { score += 10; raisons.push(`${b.nbPieces}p ≥ ${nbPiecesMin}p`); }
          else if (input.modeElargi >= 1 && b.nbPieces >= nbPiecesMin - 1) { score += 5; raisons.push("Pièces proches"); }
          else blocages.push(`${b.nbPieces}p < ${nbPiecesMin}p`);
        }
        // DPE
        if (dpeMaxIdx >= 0 && b.dpeLettre && b.dpeLettre !== "NC") {
          const idx = DPE.indexOf(b.dpeLettre);
          if (idx <= dpeMaxIdx) { score += 5; raisons.push(`DPE ${b.dpeLettre}`); }
          else blocages.push(`DPE ${b.dpeLettre} > ${c.dpeMax}`);
        }
        // Équipements
        if (c.balconTerrasse && (b.balcon || b.terrasse)) { score += 2; raisons.push("Balcon/Terrasse"); }
        if (c.parking && (b.parking || b.garage)) { score += 2; raisons.push("Parking"); }
        if (c.cave && b.cave) { score += 2; raisons.push("Cave"); }
        if (c.ascenseur && b.ascenseur) { score += 2; raisons.push("Ascenseur"); }
        if (c.jardin && b.jardin) { score += 2; raisons.push("Jardin"); }
        if (c.piscine && b.piscine) { score += 2; raisons.push("Piscine"); }
        // Bonus
        if (b.statutBien === "publie") score += 5;
        if (b.photoPrincipaleUrl) score += 3;
        return { ...b, score, pourcentage: Math.min(score, 100), raisons, blocages, agent: (b.ambassadeurId != null ? agentMap.get(b.ambassadeurId) : undefined) ?? null };
      });
      // ── Biens Off Market ──
      const offMarketBiensDispos = await db.select().from(offMarketBiens)
        .where(or(eq(offMarketBiens.statut, "disponible"), eq(offMarketBiens.statut, "sous_compromis")))
        .orderBy(desc(offMarketBiens.createdAt));
      const scoredOffMarket = offMarketBiensDispos.map((b) => {
        let score = 0;
        const raisons: string[] = [];
        const blocages: string[] = [];
        const prix = b.investissementTotal ?? b.prixBien ?? null;
        // Budget
        if (budgetMax && prix) {
          if (prix <= (budgetBase ?? 0)) { score += 30; raisons.push("Budget OK"); }
          else if (prix <= budgetMax) { score += 20; raisons.push("Budget lég. dépassé"); }
          else blocages.push(`Prix ${(prix/1000).toFixed(0)}k€ > budget`);
        }
        // Type
        if (typeBien) {
          const t = (b.typeBien ?? "").toLowerCase();
          if (t === typeBien.toLowerCase() || t.includes(typeBien.toLowerCase())) { score += 20; raisons.push("Type OK"); }
          else blocages.push(`Type ${b.typeBien} ≠ ${typeBien}`);
        }
        // Localisation (par région/département)
        if (localisation) {
          const regionMatch = (b.region ?? "").toLowerCase().includes(localisation) || localisation.includes((b.region ?? "").toLowerCase());
          const deptMatch = (b.departement ?? "").toLowerCase().includes(localisation) || localisation.includes((b.departement ?? "").toLowerCase());
          if (regionMatch || deptMatch) { score += 15; raisons.push("Région/Dépt OK"); }
          else if (input.modeElargi >= 2) { score += 3; raisons.push("Zone élargie"); }
          else blocages.push(`Localisation ${b.region} ≠ ${localisation}`);
        }
        // Surface
        if (surfaceMin && b.surfaceTotale) {
          const surf = Number(b.surfaceTotale);
          if (surf >= surfaceMin) { score += 15; raisons.push(`${surf}m² ≥ ${surfaceMin}m²`); }
          else if (input.modeElargi >= 1 && surf >= surfaceMin * 0.85) { score += 8; raisons.push("Surface proche"); }
          else blocages.push(`${surf}m² < ${surfaceMin}m²`);
        }
        // Bonus
        if (b.statut === "disponible") score += 5;
        if (b.imagePrincipale) score += 3;
        if (b.rentabiliteBrute && Number(b.rentabiliteBrute) > 6) { score += 5; raisons.push(`Rentabilité ${b.rentabiliteBrute}%`); }
        return {
          id: b.id,
          titre: b.titre,
          typeBien: b.typeBien ?? "",
          region: b.region ?? "",
          departement: b.departement ?? "",
          prix: prix,
          surface: b.surfaceTotale ? Number(b.surfaceTotale) : null,
          rentabiliteBrute: b.rentabiliteBrute ? Number(b.rentabiliteBrute) : null,
          imagePrincipale: b.imagePrincipale,
          statut: b.statut ?? "disponible",
          source: "off_market" as const,
          score,
          pourcentage: Math.min(score, 100),
          raisons,
          blocages,
        };
      });
      return {
        biens: scored.sort((a, b) => b.score - a.score).slice(0, 20),
        biensOffMarket: scoredOffMarket.sort((a, b) => b.score - a.score).slice(0, 10),
        mandat
      };
    }),

  // ── Proposer des biens à un lead ───────────────────────────────────────────
  proposerBiens: protectedProcedure
    .input(z.object({
      crmLeadId: z.number(),
      bienIds: z.array(z.number()).max(3),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      // Supprimer les anciennes propositions
      await db.delete(propositions).where(eq(propositions.crmLeadId, input.crmLeadId));
      
      // Créer les nouvelles
      for (let i = 0; i < input.bienIds.length; i++) {
        await db.insert(propositions).values({
          crmLeadId: input.crmLeadId,
          bienId: input.bienIds[i],
          ordre: i + 1,
          notes: input.notes,
        });
      }
      
      await db.update(crmLeads)
        .set({ nbBiensPresentes: input.bienIds.length })
        .where(eq(crmLeads.id, input.crmLeadId));
      
      return { success: true };
    }),

  // ── Propositions d'un lead ─────────────────────────────────────────────────
  propositionsLead: protectedProcedure
    .input(z.object({ crmLeadId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const props = await db.select().from(propositions)
        .where(eq(propositions.crmLeadId, input.crmLeadId))
        .orderBy(propositions.ordre);
      
      const enriched = await Promise.all(props.map(async (p) => {
        const [bien] = await db.select().from(biens).where(eq(biens.id, p.bienId));
        const amb = bien
          ? (bien.ambassadeurId != null ? (await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, bien.ambassadeurId)))[0] : undefined)
          : null;
        return { ...p, bien: bien ?? null, ambassadeur: amb ?? null };
      }));
      
      return enriched;
    }),

  // ── Commissions ────────────────────────────────────────────────────────────
  listCommissions: protectedProcedure
    .input(z.object({
      ambassadeurId: z.number().optional(),
      statut: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let rows: Commission[] = await db.select().from(commissions).orderBy(desc(commissions.createdAt));
      if (input?.ambassadeurId) rows = rows.filter((c: Commission) => c.ambassadeurId === input.ambassadeurId);
      if (input?.statut) rows = rows.filter((c: Commission) => c.statut === input.statut);
      return rows;
    }),

  creerCommission: protectedProcedure
    .input(CommissionSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      const [amb] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, input.ambassadeurId));
      if (!amb) throw new Error("Ambassadeur introuvable");
      
      // Commission directe pour l'ambassadeur (niveau 0 = direct)
      const tauxDirect = amb.niveau === "1" ? 50 : 50; // 50% de la comm Sigma pour l'ambassadeur direct
      const montantDirect = Math.round(input.commissionSigmaHt * tauxDirect / 100);
      
      await db.insert(commissions).values({
        ambassadeurId: input.ambassadeurId,
        bienId: input.bienId,
        crmLeadId: input.crmLeadId,
        descriptionVente: input.descriptionVente,
        commissionSigmaHt: input.commissionSigmaHt,
        dateEncaissement: input.dateEncaissement,
        niveau: "0",
        tauxPourcent: tauxDirect,
        montantHt: montantDirect,
        reference: input.reference,
        statut: "a_payer",
      });
      
      // Rétrocommission N1 (10%) pour l'ambassadeur ou son parrain
      const tauxN1 = 10;
      const montantN1 = Math.round(input.commissionSigmaHt * tauxN1 / 100);
      
      if (amb.niveau === "2" && amb.parrainId) {
        // L'ambassadeur est N2 → son parrain (N1) touche 10%
        await db.insert(commissions).values({
          ambassadeurId: amb.parrainId,
          bienId: input.bienId,
          crmLeadId: input.crmLeadId,
          descriptionVente: input.descriptionVente,
          commissionSigmaHt: input.commissionSigmaHt,
          dateEncaissement: input.dateEncaissement,
          niveau: "1",
          tauxPourcent: tauxN1,
          montantHt: montantN1,
          reference: input.reference,
          statut: "a_payer",
        });
        
        // Le parrain N1 a-t-il lui-même un parrain ? (N2 → 5%)
        const [parrain] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, amb.parrainId));
        if (parrain?.parrainId) {
          const tauxN2 = 5;
          const montantN2 = Math.round(input.commissionSigmaHt * tauxN2 / 100);
          await db.insert(commissions).values({
            ambassadeurId: parrain.parrainId,
            bienId: input.bienId,
            crmLeadId: input.crmLeadId,
            descriptionVente: input.descriptionVente,
            commissionSigmaHt: input.commissionSigmaHt,
            dateEncaissement: input.dateEncaissement,
            niveau: "2",
            tauxPourcent: tauxN2,
            montantHt: montantN2,
            reference: input.reference,
            statut: "a_payer",
          });
        }
      }
      
      return { success: true };
    }),

  validerCommission: protectedProcedure
    .input(z.object({ id: z.number(), valideParNom: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      
      await db.update(commissions)
        .set({
          statut: "paye",
          datePaiement: new Date().toLocaleDateString("fr-FR"),
          valideParAdmin: true,
          valideParNom: input.valideParNom ?? ctx.user?.name ?? "Admin",
        })
        .where(eq(commissions.id, input.id));
      return { success: true };
    }),

  // ── Mon profil (pour l'ambassadeur connecté) ────────────────────────────────────
  monProfil: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    // 1ère tentative : par userId (lien déjà établi)
    let [ambassadeur] = await db.select().from(ambassadeurs)
      .where(eq(ambassadeurs.userId, ctx.user.id)).limit(1);

    // Fallback : par email (inscription faite avant connexion Manus)
    if (!ambassadeur && ctx.user.email) {
      const [byEmail] = await db.select().from(ambassadeurs)
        .where(eq(ambassadeurs.email, ctx.user.email)).limit(1);
      if (byEmail) {
        // Lier le userId pour les prochaines connexions
        await db.update(ambassadeurs)
          .set({ userId: ctx.user.id })
          .where(eq(ambassadeurs.id, byEmail.id));
        ambassadeur = { ...byEmail, userId: ctx.user.id };
      }
    }

    return ambassadeur ?? null;
  }),

  // ── Stats réseau ───────────────────────────────────────────────────────────
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, actifs: 0, n1: 0, n2: 0, biensDispos: 0, totalRetros: 0, commissionsCount: 0 };
    
    const tous: Ambassadeur[] = await db.select().from(ambassadeurs);
    const tousB: Bien[] = await db.select().from(biens);
    const tousC: Commission[] = await db.select().from(commissions);
    
    const actifs = tous.filter((a: Ambassadeur) => a.statutInterne === "actif").length;
    const n1 = tous.filter((a: Ambassadeur) => a.niveau === "1").length;
    const n2 = tous.filter((a: Ambassadeur) => a.niveau === "2").length;
    const biensDispos = tousB.filter((b: Bien) => b.statutBien === "publie").length;
    const commissionsPayees = tousC.filter((c: Commission) => c.statut === "paye");
    const totalRetros = commissionsPayees.reduce((sum: number, c: Commission) => sum + (c.montantHt || 0), 0);
    
    return { total: tous.length, actifs, n1, n2, biensDispos, totalRetros, commissionsCount: commissionsPayees.length };
  }),

  // ── Supprimer un ambassadeur (protégé) ──────────────────────────────────────────────────────────────────────────────────
  // ── Mon réseau agent (filleuls + commissions parrainage) ──────────────────────────────────
  monReseau: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const [amb] = await db.select().from(ambassadeurs)
      .where(eq(ambassadeurs.userId, ctx.user.id)).limit(1);
    if (!amb) return { filleulsAgents: [], commissions: [], stats: { totalFilleuls: 0, commissionsTotal: 0, commissionsPayees: 0, commissionsEnAttente: 0 } };

    const filleulsAgents = await db.select().from(ambassadeurs)
      .where(eq(ambassadeurs.parrainId, amb.id));

    const comms = await db.select().from(commissions)
      .where(eq(commissions.ambassadeurId, amb.id))
      .orderBy(desc(commissions.createdAt));

    const commissionsTotal = comms.reduce((s: number, c: Commission) => s + (c.montantHt || 0), 0);
    const commissionsPayeesTotal = comms.filter((c: Commission) => c.statut === "paye").reduce((s: number, c: Commission) => s + (c.montantHt || 0), 0);

    return {
      filleulsAgents: filleulsAgents.map((f: Ambassadeur) => ({
        id: f.id, nom: f.nom, prenom: f.prenom, email: f.email,
        statutInterne: f.statutInterne, ville: f.ville,
        createdAt: f.createdAt, codeParrain: f.codeParrain,
      })),
      commissions: comms,
      stats: {
        totalFilleuls: filleulsAgents.length,
        commissionsTotal,
        commissionsPayees: commissionsPayeesTotal,
        commissionsEnAttente: commissionsTotal - commissionsPayeesTotal,
      },
    };
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(ambassadeurs).where(eq(ambassadeurs.id, input.id));
      return { success: true };
    }),

  // ── Upload media/document pour un bien (public, accessible depuis le formulaire agent) ────────
  uploadBienMedia: publicProcedure
    .input(z.object({
      bienId: z.number(),
      ambassadeurId: z.number(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      categorie: z.enum(["photo", "titre_propriete", "taxe_fonciere", "diagnostic", "plan", "autre"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");

      // Vérifier que le bien appartient à cet ambassadeur
      const [bien] = await db.select().from(biens).where(eq(biens.id, input.bienId));
      if (!bien || bien.ambassadeurId !== input.ambassadeurId) throw new Error("Bien introuvable ou accès refusé");

      // Décoder le base64
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.fileName.split(".").pop() ?? "bin";
      const key = `biens/${input.bienId}/${input.categorie}/${nanoid(12)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Mettre à jour le bien selon la catégorie
      if (input.categorie === "photo") {
        // Ajouter l'URL au tableau JSON photosUrls
        const existingUrls: string[] = bien.photosUrls ? JSON.parse(bien.photosUrls as string) : [];
        const newUrls = [...existingUrls, url];
        // Si c'est la première photo, la définir comme photo principale
        const updates: Record<string, unknown> = { photosUrls: JSON.stringify(newUrls) };
        if (!bien.photoPrincipaleUrl) {
          updates.photoPrincipaleUrl = url;
          updates.photoPrincipaleKey = key;
        }
        await db.update(biens).set(updates).where(eq(biens.id, input.bienId));
      } else if (input.categorie === "plan") {
        await db.update(biens).set({ planUrl: url }).where(eq(biens.id, input.bienId));
      } else if (input.categorie === "diagnostic") {
        await db.update(biens).set({ dpeDocUrl: url }).where(eq(biens.id, input.bienId));
      }
      // Pour titre_propriete, taxe_fonciere, autre : on stocke dans photosUrls avec un tag JSON
      // (extension future : table dédiée bien_documents)

      return { success: true, url, fileKey: key };
    }),

  // ── Modifier un bien (agent = son propre bien, admin/direction = tout bien) ────────────────────
  updateBien: protectedProcedure
    .input(z.object({
      id: z.number(),
      titre: z.string().min(1).optional(),
      prix: z.number().optional(),
      surface: z.number().optional(),
      nbPieces: z.number().optional(),
      nbChambres: z.number().optional(),
      description: z.string().optional(),
      pointsForts: z.string().optional(),
      etatBien: z.enum(["neuf", "bon_etat", "a_renover", "a_rafraichir"]).optional(),
      travauxEstimes: z.number().optional(),
      prixNegociable: z.boolean().optional(),
      chargesAnnuelles: z.number().optional(),
      taxeFonciere: z.number().optional(),
      balcon: z.boolean().optional(),
      terrasse: z.boolean().optional(),
      jardin: z.boolean().optional(),
      parking: z.boolean().optional(),
      garage: z.boolean().optional(),
      cave: z.boolean().optional(),
      ascenseur: z.boolean().optional(),
      piscine: z.boolean().optional(),
      dpeLettre: z.enum(["A","B","C","D","E","F","G","NC"]).optional(),
      dpeValeur: z.number().optional(),
      photoPrincipaleUrl: z.string().optional(),
      photoPrincipaleKey: z.string().optional(),
      photosUrls: z.string().optional(), // JSON array
      statutBien: z.enum(["en_attente_validation","publie","sous_compromis","vendu","retire"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      const [bien] = await db.select().from(biens).where(eq(biens.id, input.id));
      if (!bien) throw new Error("Bien introuvable");
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "direction";
      if (!isAdmin) {
        // Vérifier que l'agent est propriétaire du bien
        const [agent] = await db.select().from(ambassadeurs)
          .where(eq(ambassadeurs.userId, ctx.user.id));
        if (!agent || agent.id !== bien.ambassadeurId) {
          throw new Error("Vous n'êtes pas autorisé à modifier ce bien");
        }
        // Les agents ne peuvent pas changer le statut de publication (seul admin)
        if (input.statutBien && input.statutBien !== bien.statutBien) {
          throw new Error("Seul un administrateur peut modifier le statut de publication");
        }
      }
      const { id, ...updates } = input;
      await db.update(biens).set(updates as any).where(eq(biens.id, id));
      return { success: true };
    }),

  // ── MATCHING PIPELINE ─────────────────────────────────────────────────────
  // Créer ou récupérer le dossier de matching pour un lead
  matchingGetOrCreateDossier: protectedProcedure
    .input(z.object({ crmLeadId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      const [existing] = await db.select().from(matchingDossiers)
        .where(and(
          eq(matchingDossiers.crmLeadId, input.crmLeadId),
          or(
            eq(matchingDossiers.statut, "en_cours"),
            eq(matchingDossiers.statut, "proposition_1"),
            eq(matchingDossiers.statut, "proposition_2"),
            eq(matchingDossiers.statut, "proposition_3"),
            eq(matchingDossiers.statut, "offre"),
            eq(matchingDossiers.statut, "signature_notaire"),
          )
        ))
        .orderBy(desc(matchingDossiers.createdAt))
        .limit(1);
      if (existing) return existing;
      const [result] = await db.insert(matchingDossiers).values({
        crmLeadId: input.crmLeadId,
        statut: "en_cours",
      });
      const [created] = await db.select().from(matchingDossiers)
        .where(eq(matchingDossiers.crmLeadId, input.crmLeadId))
        .orderBy(desc(matchingDossiers.createdAt))
        .limit(1);
      return created;
    }),

  // Lister tous les dossiers de matching (pour l'onglet Matching Leads)
  matchingListDossiers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const dossiers: MatchingDossier[] = await db.select().from(matchingDossiers)
      .orderBy(desc(matchingDossiers.updatedAt));
    // Enrichir avec lead + bien
    const leadIds = Array.from(new Set(dossiers.map(d => d.crmLeadId)));
    const bienIds = Array.from(new Set(dossiers.map(d => d.bienId).filter(Boolean) as number[]));
    const [leadsData, biensData] = await Promise.all([
      leadIds.length > 0 ? db.select({ id: crmLeads.id, nom: crmLeads.nom, prenom: crmLeads.prenom, email: crmLeads.email, telephone: crmLeads.telephone, mandatId: crmLeads.mandatId }).from(crmLeads).where(inArray(crmLeads.id, leadIds)) : [],
      bienIds.length > 0 ? db.select({ id: biens.id, titre: biens.titre, ville: biens.ville, prix: biens.prix, surface: biens.surface, typeBien: biens.typeBien, photoPrincipaleUrl: biens.photoPrincipaleUrl, statutBien: biens.statutBien }).from(biens).where(inArray(biens.id, bienIds)) : [],
    ]);
    const leadMap = new Map(leadsData.map(l => [l.id, l]));
    const bienMap = new Map(biensData.map(b => [b.id, b]));
    return dossiers.map(d => ({
      ...d,
      lead: leadMap.get(d.crmLeadId) ?? null,
      bien: d.bienId ? bienMap.get(d.bienId) ?? null : null,
    }));
  }),

  // Mettre à jour le statut du dossier de matching
  matchingUpdateDossier: protectedProcedure
    .input(z.object({
      id: z.number(),
      statut: z.enum(["en_cours","proposition_1","proposition_2","proposition_3","offre","signature_notaire","vendu","abandonne"]).optional(),
      bienId: z.number().nullable().optional(),
      notes: z.string().optional(),
      modeElargi: z.number().min(0).max(2).optional(),
      criteresSup: z.string().optional(), // JSON
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      const now = Date.now();
      const updates: Record<string, any> = {};
      if (input.statut !== undefined) {
        updates.statut = input.statut;
        if (input.statut === "proposition_1" || input.statut === "proposition_2" || input.statut === "proposition_3") updates.dateProposition = now;
        if (input.statut === "offre") updates.dateOffre = now;
        if (input.statut === "signature_notaire") updates.dateSignature = now;
        if (input.statut === "vendu") updates.dateVente = now;
      }
      if (input.bienId !== undefined) updates.bienId = input.bienId;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.modeElargi !== undefined) updates.modeElargi = input.modeElargi;
      if (input.criteresSup !== undefined) updates.criteresSup = input.criteresSup;
      await db.update(matchingDossiers).set(updates).where(eq(matchingDossiers.id, input.id));
      // Si offre ou plus → marquer le bien comme sous_compromis
      if (input.bienId && (input.statut === "offre" || input.statut === "signature_notaire")) {
        await db.update(biens).set({ statutBien: "sous_compromis" }).where(eq(biens.id, input.bienId));
      }
      // Si vendu → marquer le bien comme vendu
      if (input.bienId && input.statut === "vendu") {
        await db.update(biens).set({ statutBien: "vendu" }).where(eq(biens.id, input.bienId));
      }
      return { success: true };
    }),

  // Supprimer un dossier de matching
  matchingDeleteDossier: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de données indisponible");
      await db.delete(matchingDossiers).where(eq(matchingDossiers.id, input.id));
      return { success: true };
    }),


  // ── Carte du réseau : tous les points géolocalisés ────────────────────────
  getCarteReseau: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { agents: [], courtiers_: [], biens_: [] };

    const agents = await db
      .select({
        id: ambassadeurs.id,
        nom: ambassadeurs.nom,
        prenom: ambassadeurs.prenom,
        ville: ambassadeurs.ville,
        codePostal: ambassadeurs.codePostal,
        adresse: ambassadeurs.adresse,
        statut: ambassadeurs.statut,
        niveau: ambassadeurs.niveau,
        latitude: ambassadeurs.latitude,
        longitude: ambassadeurs.longitude,
      })
      .from(ambassadeurs)
      .where(eq(ambassadeurs.statutInterne, "actif"));

    const courtiersData = await db
      .select({
        id: courtiers.id,
        nom: courtiers.nom,
        prenom: courtiers.prenom,
        ville: courtiers.ville,
        codePostal: courtiers.codePostal,
        adresse: courtiers.adresse,
        denominationSociale: courtiers.denominationSociale,
        latitude: courtiers.latitude,
        longitude: courtiers.longitude,
      })
      .from(courtiers)
      .where(eq(courtiers.statutInterne, "actif"));

    const biensData = await db
      .select({
        id: biens.id,
        titre: biens.titre,
        ville: biens.ville,
        codePostal: biens.codePostal,
        adresse: biens.adresse,
        typeBien: biens.typeBien,
        prix: biens.prix,
        surface: biens.surface,
        latitude: biens.latitude,
        longitude: biens.longitude,
        statutBien: biens.statutBien,
        photoPrincipaleUrl: biens.photoPrincipaleUrl,
        ambassadeurId: biens.ambassadeurId,
      })
      .from(biens)
      .where(inArray(biens.statutBien, ["publie", "sous_compromis"]));

    const offMarketData = await db
      .select({
        id: offMarketBiens.id,
        titre: offMarketBiens.titre,
        region: offMarketBiens.region,
        typeBien: offMarketBiens.typeBien,
        prixBien: offMarketBiens.prixBien,
        latitude: offMarketBiens.latitude,
        longitude: offMarketBiens.longitude,
        statut: offMarketBiens.statut,
      })
      .from(offMarketBiens)
      .where(inArray(offMarketBiens.statut, ["disponible", "sous_compromis"]));

    return { agents, courtiers_: courtiersData, biens_: biensData, offMarket: offMarketData };
  }),

  // ── Mise à jour des coordonnées GPS (géocodage côté client) ───────────────
  updateAgentGeocoords: publicProcedure
    .input(z.object({ id: z.number(), latitude: z.string(), longitude: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(ambassadeurs).set({ latitude: input.latitude, longitude: input.longitude }).where(eq(ambassadeurs.id, input.id));
      return { success: true };
    }),

  updateCourtierGeocoords: publicProcedure
    .input(z.object({ id: z.number(), latitude: z.string(), longitude: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(courtiers).set({ latitude: input.latitude, longitude: input.longitude }).where(eq(courtiers.id, input.id));
      return { success: true };
    }),

  // ── Géocodage batch des entrées existantes ──────────────────────────────────
  geocodeAll: protectedProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) return { success: false, agents: 0, courtiers: 0, biens: 0 };

      let agentsCount = 0, courtiersCount = 0, biensCount = 0;

      // Géocoder les agents sans coordonnées
      const agentsSansCoords = await db.select().from(ambassadeurs)
        .where(and(eq(ambassadeurs.statutInterne, "actif")));
      for (const a of agentsSansCoords) {
        if (a.latitude && a.longitude) continue;
        try {
          const coords = await geocodeAdresse(a.adresse, a.codePostal, a.ville);
          if (coords) {
            await db.update(ambassadeurs)
              .set({ latitude: coords.latitude, longitude: coords.longitude })
              .where(eq(ambassadeurs.id, a.id));
            agentsCount++;
          }
        } catch (e) { console.error("[geocodeAll] agent", a.id, e); }
      }

      // Géocoder les courtiers sans coordonnées
      const courtiersSansCoords = await db.select().from(courtiers);
      for (const c of courtiersSansCoords) {
        if (c.latitude && c.longitude) continue;
        try {
          const coords = await geocodeAdresse(c.adresse, c.codePostal, c.ville);
          if (coords) {
            await db.update(courtiers)
              .set({ latitude: coords.latitude, longitude: coords.longitude })
              .where(eq(courtiers.id, c.id));
            courtiersCount++;
          }
        } catch (e) { console.error("[geocodeAll] courtier", c.id, e); }
      }

      // Géocoder les biens sans coordonnées
      const biensSansCoords = await db.select().from(biens);
      for (const b of biensSansCoords) {
        if (b.latitude && b.longitude) continue;
        try {
          const coords = await geocodeAdresse(b.adresse, b.codePostal, b.ville);
          if (coords) {
            await db.update(biens)
              .set({ latitude: coords.latitude, longitude: coords.longitude })
              .where(eq(biens.id, b.id));
            biensCount++;
          }
        } catch (e) { console.error("[geocodeAll] bien", b.id, e); }
      }

      return { success: true, agents: agentsCount, courtiers: courtiersCount, biens: biensCount };
    }),

  // ── Renvoyer l'email de bienvenue à un ambassadeur ──────────────────────────────────
  renvoyerEmailBienvenue: protectedProcedure
    .input(z.object({ id: z.number(), origin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false, message: "DB indisponible" };

      const [amb] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, input.id));
      if (!amb) return { success: false, message: "Ambassadeur introuvable" };

      const origin = input.origin || "https://www.sigmafactory.org";
      const portailUrl = `${origin}/portail`;

      const sent = await sendBienvenueAmbassadeur({
        prenom: amb.prenom,
        nom: amb.nom,
        email: amb.email,
        codeParrain: amb.codeParrain || "",
        portailUrl,
        contratUrl: amb.contratPdfUrl || undefined,
      });

      return { success: sent, message: sent ? `Email envoyé à ${amb.email}` : "Erreur envoi email" };
    }),

  // ── Liste des médias d'un bien ────────────────────────────────────────────────────────────────
  // ─── METTRE À JOUR LES RÉGIONS D'OPÉRATION (admin) ─────────────────────────────────
  updateRegions: protectedProcedure
    .input(z.object({
      id: z.number(),
      regionsOperation: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(ambassadeurs)
        .set({ regionsOperation: JSON.stringify(input.regionsOperation) })
        .where(eq(ambassadeurs.id, input.id));
      return { success: true };
    }),

  // ─── METTRE À JOUR SES PROPRES RÉGIONS (portail agent) ─────────────────────────────────
  updateMesRegions: protectedProcedure
    .input(z.object({ regionsOperation: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const [agent] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.userId, ctx.user.id)).limit(1);
      if (!agent) throw new Error("Profil agent introuvable");
      await db.update(ambassadeurs)
        .set({ regionsOperation: JSON.stringify(input.regionsOperation) })
        .where(eq(ambassadeurs.id, agent.id));
      return { success: true };
    }),

  listBienMedias: publicProcedure
    .input(z.object({ bienId: z.number(), ambassadeurId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { photos: [], planUrl: null, dpeDocUrl: null };

      const [bien] = await db.select().from(biens).where(eq(biens.id, input.bienId));
      if (!bien || bien.ambassadeurId !== input.ambassadeurId) return { photos: [], planUrl: null, dpeDocUrl: null };

      const photos: string[] = bien.photosUrls ? JSON.parse(bien.photosUrls as string) : [];
      return {
        photos,
        planUrl: bien.planUrl ?? null,
        dpeDocUrl: bien.dpeDocUrl ?? null,
        photoPrincipaleUrl: bien.photoPrincipaleUrl ?? null,
      };
    }),
});

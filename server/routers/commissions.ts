import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { transactionsCourtage, transactionsImmo } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { ROLE_EMAILS, OWNER_EMAILS } from "../mailer";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Email alerte Hanna ───────────────────────────────────────────────────────
async function sendTransactionAlert(opts: {
  type: "courtage" | "immo";
  partenaireId: number;
  montant: number;
  detail: string;
  partPartenaire: number;
  partSigma: number;
}) {
  const to = [...(ROLE_EMAILS.Hanna ?? []), ...OWNER_EMAILS];
  const typeLabel = opts.type === "courtage" ? "Courtage" : "Immobilier";
  const subject = `Nouvelle transaction ${typeLabel} déclarée — ${opts.detail}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <span style="font-size:24px;font-weight:bold;color:#f59e0b">Sigma Factory</span>
      </div>
      <h2 style="color:#f59e0b;margin-bottom:16px">Nouvelle transaction ${typeLabel}</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px">Partenaire ID</td><td style="padding:8px 0;color:#fff;font-size:14px">#${opts.partenaireId}</td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px">Détail</td><td style="padding:8px 0;color:#fff;font-size:14px">${opts.detail}</td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px">Montant brut</td><td style="padding:8px 0;color:#f59e0b;font-size:16px;font-weight:bold">${opts.montant.toLocaleString("fr-FR")} €</td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px">Part partenaire</td><td style="padding:8px 0;color:#4ade80;font-size:14px">${opts.partPartenaire.toLocaleString("fr-FR")} €</td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px">Part Sigma</td><td style="padding:8px 0;color:#e5e5e5;font-size:14px">${opts.partSigma.toLocaleString("fr-FR")} €</td></tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#1a1a1a;border-radius:8px;border:1px solid #333">
        <p style="margin:0;font-size:13px;color:#9ca3af">⚠️ Cette transaction est en attente de validation. Connectez-vous au dashboard pour valider.</p>
      </div>
    </div>
  `;
  try {
    await resend.emails.send({ from: "Sigma Factory <noreply@sigmaipf.fr>", to, subject, html });
  } catch (e) { console.warn("sendTransactionAlert email failed:", e); }
}

// ─── Calcul commissions courtage ──────────────────────────────────────────────
// 75% courtier, 25% Sigma
// Sur la part Sigma : 10% parrain N1, 5% parrain N2
function calcCommissionCourtage(montant: number) {
  const partCourtier = Math.round(montant * 0.75);
  const partSigma = montant - partCourtier;
  const partParrainN1 = Math.round(partSigma * 0.10);
  const partParrainN2 = Math.round(partSigma * 0.05);
  const partSigmaNet = partSigma - partParrainN1 - partParrainN2;
  return { partCourtier, partSigma: partSigmaNet, partParrainN1, partParrainN2 };
}

// ─── Calcul commissions immo ──────────────────────────────────────────────────
// 50% agent, 50% Sigma
// Sur la part Sigma : 10% parrain N1, 5% parrain N2
function calcCommissionImmo(montant: number) {
  const partAgent = Math.round(montant * 0.50);
  const partSigma = montant - partAgent;
  const partParrainN1 = Math.round(partSigma * 0.10);
  const partParrainN2 = Math.round(partSigma * 0.05);
  const partSigmaNet = partSigma - partParrainN1 - partParrainN2;
  return { partAgent, partSigma: partSigmaNet, partParrainN1, partParrainN2 };
}

export const commissionsRouter = router({

  // ─── COURTAGE ────────────────────────────────────────────────────────────────

  // Saisie enveloppe obtenue (étape 1)
  saisirEnveloppe: protectedProcedure
    .input(z.object({
      courtierId: z.number(),
      leadNom: z.string().optional(),
      dossierRef: z.string().optional(),
      montantEnveloppe: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(transactionsCourtage).values({
        courtierId: input.courtierId,
        leadNom: input.leadNom,
        dossierRef: input.dossierRef,
        montantEnveloppe: input.montantEnveloppe,
        dateEnveloppe: now,
        statut: "en_attente",
        createdAt: now,
        updatedAt: now,
      });
      const id = (result as any).insertId as number;
      // Notification Hanna
      try {
        await notifyOwner({
          title: `Enveloppe courtage déclarée — ${input.leadNom ?? "Lead inconnu"}`,
          content: `Courtier #${input.courtierId} a obtenu une enveloppe de ${input.montantEnveloppe.toLocaleString("fr-FR")} €\nDossier : ${input.dossierRef ?? "—"}`,
        });
        await sendTransactionAlert({
          type: "courtage",
          partenaireId: input.courtierId,
          montant: input.montantEnveloppe,
          detail: input.leadNom ?? input.dossierRef ?? "Enveloppe obtenue",
          partPartenaire: Math.round(input.montantEnveloppe * 0.75),
          partSigma: Math.round(input.montantEnveloppe * 0.25),
        });
      } catch (e) { console.warn("Notification enveloppe failed:", e); }
      return { id };
    }),

  // Saisie commission finale (étape 2 — crédit validé)
  saisirCommissionCourtage: protectedProcedure
    .input(z.object({
      transactionId: z.number(),
      montantCommission: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const calc = calcCommissionCourtage(input.montantCommission);
      const now = Date.now();
      await db.update(transactionsCourtage)
        .set({
          montantCommission: input.montantCommission,
          dateValidation: now,
          partCourtier: calc.partCourtier,
          partSigma: calc.partSigma,
          partParrainN1: calc.partParrainN1,
          partParrainN2: calc.partParrainN2,
          updatedAt: now,
        })
        .where(eq(transactionsCourtage.id, input.transactionId));
      // Notification Hanna — commission finale
      try {
        await notifyOwner({
          title: `Commission courtage finale déclarée — ${input.montantCommission.toLocaleString("fr-FR")} €`,
          content: `Transaction #${input.transactionId}\nCommission : ${input.montantCommission.toLocaleString("fr-FR")} €\nPart courtier : ${calc.partCourtier.toLocaleString("fr-FR")} €\nPart Sigma : ${calc.partSigma.toLocaleString("fr-FR")} €`,
        });
        await sendTransactionAlert({
          type: "courtage",
          partenaireId: input.transactionId,
          montant: input.montantCommission,
          detail: `Commission finale — Transaction #${input.transactionId}`,
          partPartenaire: calc.partCourtier,
          partSigma: calc.partSigma,
        });
      } catch (e) { console.warn("Notification commission failed:", e); }
      return { ...calc };
    }),

  // Créer directement une transaction courtage complète (enveloppe + commission en une fois)
  creerTransactionCourtage: protectedProcedure
    .input(z.object({
      courtierId: z.number(),
      leadNom: z.string().optional(),
      dossierRef: z.string().optional(),
      montantEnveloppe: z.number().positive().optional(),
      montantCommission: z.number().positive().optional(),
      parrainN1Id: z.number().optional(),
      parrainN2Id: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      let calc = { partCourtier: 0, partSigma: 0, partParrainN1: 0, partParrainN2: 0 };
      if (input.montantCommission) {
        calc = calcCommissionCourtage(input.montantCommission);
      }
      const [result] = await db.insert(transactionsCourtage).values({
        courtierId: input.courtierId,
        leadNom: input.leadNom,
        dossierRef: input.dossierRef,
        montantEnveloppe: input.montantEnveloppe,
        dateEnveloppe: input.montantEnveloppe ? now : undefined,
        montantCommission: input.montantCommission,
        dateValidation: input.montantCommission ? now : undefined,
        partCourtier: calc.partCourtier || undefined,
        partSigma: calc.partSigma || undefined,
        partParrainN1: calc.partParrainN1 || undefined,
        partParrainN2: calc.partParrainN2 || undefined,
        parrainN1Id: input.parrainN1Id,
        parrainN2Id: input.parrainN2Id,
        statut: "en_attente",
        createdAt: now,
        updatedAt: now,
      });
      const id = (result as any).insertId as number;
      // Notification Hanna
      const montantRef = input.montantCommission ?? input.montantEnveloppe ?? 0;
      const partRef = input.montantCommission ? calc.partCourtier : Math.round(montantRef * 0.75);
      const partSigmaRef = input.montantCommission ? calc.partSigma : Math.round(montantRef * 0.25);
      try {
        await notifyOwner({
          title: `Transaction courtage déclarée — ${input.leadNom ?? "Lead inconnu"}`,
          content: `Courtier #${input.courtierId}\nMontant : ${montantRef.toLocaleString("fr-FR")} €\nPart courtier : ${partRef.toLocaleString("fr-FR")} €\nPart Sigma : ${partSigmaRef.toLocaleString("fr-FR")} €`,
        });
        await sendTransactionAlert({
          type: "courtage",
          partenaireId: input.courtierId,
          montant: montantRef,
          detail: input.leadNom ?? input.dossierRef ?? `Transaction #${id}`,
          partPartenaire: partRef,
          partSigma: partSigmaRef,
        });
      } catch (e) { console.warn("Notification creerTransactionCourtage failed:", e); }
      return { id, ...calc };
    }),

  // Liste des transactions courtage (pour Hanna + courtier lui-même)
  listTransactionsCourtage: protectedProcedure
    .input(z.object({ courtierId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const rows = await db.select().from(transactionsCourtage)
        .orderBy(desc(transactionsCourtage.createdAt));
      if (input?.courtierId) {
        return rows.filter((r: typeof rows[0]) => r.courtierId === input.courtierId);
      }
      return rows;
    }),

  // Validation Hanna — changer le statut d'une transaction courtage
  validerTransactionCourtage: protectedProcedure
    .input(z.object({
      id: z.number(),
      statut: z.enum(["en_attente", "valide", "paiement_initie", "paye"]),
      noteHanna: z.string().optional(),
      valideePar: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(transactionsCourtage)
        .set({
          statut: input.statut,
          noteHanna: input.noteHanna,
          valideePar: input.valideePar,
          valideeAt: now,
          updatedAt: now,
        })
        .where(eq(transactionsCourtage.id, input.id));
      return { ok: true };
    }),

  // ─── IMMO ─────────────────────────────────────────────────────────────────────

  // Créer une transaction immo
  creerTransactionImmo: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      adresseBien: z.string().optional(),
      typeTransaction: z.enum(["vente", "location"]).default("vente"),
      montantHonoraires: z.number().positive(),
      dateTransaction: z.number().optional(),
      parrainN1Id: z.number().optional(),
      parrainN2Id: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const calc = calcCommissionImmo(input.montantHonoraires);
      const [result] = await db.insert(transactionsImmo).values({
        agentId: input.agentId,
        adresseBien: input.adresseBien,
        typeTransaction: input.typeTransaction,
        montantHonoraires: input.montantHonoraires,
        dateTransaction: input.dateTransaction ?? now,
        partAgent: calc.partAgent,
        partSigma: calc.partSigma,
        partParrainN1: calc.partParrainN1,
        partParrainN2: calc.partParrainN2,
        parrainN1Id: input.parrainN1Id,
        parrainN2Id: input.parrainN2Id,
        statut: "en_attente",
        createdAt: now,
        updatedAt: now,
      });
      const id = (result as any).insertId as number;
      // Notification Hanna
      try {
        await notifyOwner({
          title: `Transaction immobilière déclarée — ${input.adresseBien ?? "Bien inconnu"}`,
          content: `Agent #${input.agentId}\nType : ${input.typeTransaction}\nHonoraires : ${input.montantHonoraires.toLocaleString("fr-FR")} €\nPart agent : ${calc.partAgent.toLocaleString("fr-FR")} €\nPart Sigma : ${calc.partSigma.toLocaleString("fr-FR")} €`,
        });
        await sendTransactionAlert({
          type: "immo",
          partenaireId: input.agentId,
          montant: input.montantHonoraires,
          detail: input.adresseBien ?? `Transaction #${id}`,
          partPartenaire: calc.partAgent,
          partSigma: calc.partSigma,
        });
      } catch (e) { console.warn("Notification creerTransactionImmo failed:", e); }
      return { id, ...calc };
    }),

  // Liste des transactions immo
  listTransactionsImmo: protectedProcedure
    .input(z.object({ agentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const rows = await db.select().from(transactionsImmo)
        .orderBy(desc(transactionsImmo.createdAt));
      if (input?.agentId) {
        return rows.filter((r: typeof rows[0]) => r.agentId === input.agentId);
      }
      return rows;
    }),

  // Validation Hanna — changer le statut d'une transaction immo
  validerTransactionImmo: protectedProcedure
    .input(z.object({
      id: z.number(),
      statut: z.enum(["en_attente", "valide", "paiement_initie", "paye"]),
      noteHanna: z.string().optional(),
      valideePar: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(transactionsImmo)
        .set({
          statut: input.statut,
          noteHanna: input.noteHanna,
          valideePar: input.valideePar,
          valideeAt: now,
          updatedAt: now,
        })
        .where(eq(transactionsImmo.id, input.id));
      return { ok: true };
    }),

  // ─── CALCUL PREVIEW (sans sauvegarder) ───────────────────────────────────────
  calculerPreviewCourtage: protectedProcedure
    .input(z.object({ montant: z.number().positive() }))
    .query(({ input }) => calcCommissionCourtage(input.montant)),

  calculerPreviewImmo: protectedProcedure
    .input(z.object({ montant: z.number().positive() }))
    .query(({ input }) => calcCommissionImmo(input.montant)),
});

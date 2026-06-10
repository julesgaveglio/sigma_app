import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  assignationsFinancement, courtiers,
  ambassadeurs, biens, notificationsInApp,
  AssignationFinancement
} from "../../drizzle/schema";
import { eq, desc, and, lt, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { ROLE_EMAILS, OWNER_EMAILS } from "../mailer";

const DASHBOARD_URL = "https://www.sigmafactory.org";
const DELAI_COURTIER_MS = 72 * 60 * 60 * 1000; // 72 heures
const DELAI_AGENT_JOURS = 30; // 30 jours sans bien posé

// ─── Email alerte retard ──────────────────────────────────────────────────────
async function sendRetardAlert(opts: {
  type: "courtier" | "agent";
  nom: string;
  detail: string;
  destinataire: "Manon" | "Elodie";
  lien: string;
}) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = [
      ...(ROLE_EMAILS[opts.destinataire] ?? []),
      ...OWNER_EMAILS,
    ];
    const typeLabel = opts.type === "courtier" ? "Courtier" : "Agent immobilier";
    const subject = opts.type === "courtier"
      ? `⚠️ Retard 72h — ${opts.nom} n'a pas traité son dossier`
      : `⚠️ Inactivité 30j — ${opts.nom} n'a posé aucun bien`;
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#C9A84C,#F0D080,#C9A84C);padding:24px 32px;">
      <div style="font-size:11px;letter-spacing:3px;color:#000;text-transform:uppercase;font-weight:600;">Sigma Factory — Alerte Partenaire</div>
      <div style="font-size:20px;font-weight:700;color:#000;margin-top:6px;">⚠️ ${typeLabel} en retard</div>
    </div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:#ef4444;color:#fff;font-weight:bold;font-size:11px;padding:3px 12px;border-radius:20px;margin-bottom:20px;">ALERTE RETARD</span>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">${opts.type === "courtier"
        ? `Le courtier <strong style="color:#fff;">${opts.nom}</strong> n'a pas traité son dossier depuis plus de 72 heures. Son statut a été automatiquement passé en <strong style="color:#f59e0b;">Suspendu</strong>.`
        : `L'agent <strong style="color:#fff;">${opts.nom}</strong> n'a posé aucun bien depuis plus de 30 jours. Son statut a été automatiquement passé en <strong style="color:#f59e0b;">Suspendu</strong>.`
      }</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;width:40%;">Partenaire</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${opts.nom}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Détail</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${opts.detail}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Nouveau statut</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#f59e0b;font-size:13px;font-weight:bold;">Suspendu</td>
        </tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${opts.lien}" style="background:#D4AF37;color:#000;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">Voir le dashboard</a>
      </div>
    </div>
    <div style="background:#0d0d0d;padding:14px 32px;text-align:center;font-size:11px;color:#444;border-top:1px solid #1e1e1e;">
      Sigma Factory — Système de gestion interne
    </div>
  </div>
</body>
</html>`;
    await resend.emails.send({
      from: "Sigma Factory <noreply@sigmaipf.fr>",
      to,
      subject,
      html,
    });
  } catch (e) {
    console.warn("[Triggers] Email alerte retard failed:", e);
  }
}

export const triggersRouter = router({
  // ─── VÉRIFIER LES RETARDS COURTIERS (> 72h sans traitement) ───────────────
  checkRetardsCourtiers: protectedProcedure
    .query(async () => {
      const db = (await getDb())!;
      const now = Date.now();
      const seuilRetard = now - DELAI_COURTIER_MS;

      // Récupérer toutes les assignations "en_attente" créées il y a > 72h
      const assignationsEnRetard = await db.select().from(assignationsFinancement)
        .where(
          and(
            eq(assignationsFinancement.statut, "en_attente"),
            lt(assignationsFinancement.createdAt, seuilRetard)
          )
        );

      const resultats: {
        courtierId: number;
        courtierNom: string;
        courtierEmail: string;
        nbDossiersEnRetard: number;
        ancienneAssignationMs: number;
        statutInterne: string;
        enRetard: boolean;
      }[] = [];

      if (assignationsEnRetard.length === 0) return resultats;

      // Regrouper par courtier
      const courtierIdsSet = new Set(assignationsEnRetard.map((a: AssignationFinancement) => a.courtierId));
      const courtierIds = Array.from(courtierIdsSet);
      const courtiersList = await db.select().from(courtiers)
        .where(inArray(courtiers.id, courtierIds));

      for (const courtier of courtiersList) {
        const dossiersCourtier = assignationsEnRetard.filter(
          (a: AssignationFinancement) => a.courtierId === courtier.id
        );
        if (dossiersCourtier.length === 0) continue;

        const plusAncien = Math.min(...dossiersCourtier.map((a: AssignationFinancement) => a.createdAt));
        resultats.push({
          courtierId: courtier.id,
          courtierNom: `${courtier.prenom} ${courtier.nom}`,
          courtierEmail: courtier.email,
          nbDossiersEnRetard: dossiersCourtier.length,
          ancienneAssignationMs: plusAncien,
          statutInterne: courtier.statutInterne,
          enRetard: true,
        });
      }

      return resultats;
    }),

  // ─── DÉCLENCHER LE TRIGGER COURTIER (passer en suspendu + notifier) ────────
  declencherTriggerCourtier: protectedProcedure
    .input(z.object({ courtierId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Récupérer le courtier
      const [courtier] = await db.select().from(courtiers)
        .where(eq(courtiers.id, input.courtierId))
        .limit(1);
      if (!courtier) return { success: false, message: "Courtier introuvable" };

      // Passer en suspendu
      await db.update(courtiers)
        .set({
          statutInterne: "suspendu",
          notesInternes: `[AUTO] Suspendu automatiquement le ${new Date().toLocaleDateString("fr-FR")} pour retard > 72h sur dossier(s) de financement.`,
        })
        .where(eq(courtiers.id, input.courtierId));

      // Récupérer les dossiers en retard
      const seuilRetard = now - DELAI_COURTIER_MS;
      const assignationsEnRetard = await db.select().from(assignationsFinancement)
        .where(
          and(
            eq(assignationsFinancement.courtierId, input.courtierId),
            eq(assignationsFinancement.statut, "en_attente"),
            lt(assignationsFinancement.createdAt, seuilRetard)
          )
        );

      // Notification in-app pour Manon
      await db.insert(notificationsInApp).values({
        destinataireEmail: "manondubost@sigmaipf.fr",
        type: "trigger_retard_courtier",
        titre: `⚠️ Courtier suspendu — ${courtier.prenom} ${courtier.nom}`,
        message: `${assignationsEnRetard.length} dossier(s) non traité(s) depuis > 72h. Statut passé en Suspendu automatiquement.`,
        lien: `/dashboard/courtiers`,
        lu: false,
        createdAt: now,
      });

      // Email Manon + Owner
      const detail = `${assignationsEnRetard.length} dossier(s) de financement non traité(s) depuis plus de 72h`;
      await sendRetardAlert({
        type: "courtier",
        nom: `${courtier.prenom} ${courtier.nom}`,
        detail,
        destinataire: "Manon",
        lien: `${DASHBOARD_URL}/dashboard/courtiers`,
      });

      return { success: true, message: `${courtier.prenom} ${courtier.nom} suspendu` };
    }),

  // ─── VÉRIFIER L'INACTIVITÉ DES AGENTS (> 30j sans bien posé) ──────────────
  checkInactiviteAgents: protectedProcedure
    .query(async () => {
      const db = (await getDb())!;
      const now = new Date();

      // Récupérer tous les agents actifs
      const agentsActifs = await db.select().from(ambassadeurs)
        .where(eq(ambassadeurs.statutInterne, "actif"));

      const resultats: {
        agentId: number;
        agentNom: string;
        agentEmail: string;
        dernierBienDate: string | null;
        nbBiensTotaux: number;
        joursInactivite: number;
        statutInterne: string;
        inactif: boolean;
      }[] = [];

      for (const agent of agentsActifs) {
        // Récupérer le dernier bien posé
        const biensAgent = await db.select().from(biens)
          .where(eq(biens.ambassadeurId, agent.id))
          .orderBy(desc(biens.createdAt))
          .limit(1);

        let dernierBienDate: string | null = null;
        let joursInactivite = 0;
        let inactif = false;

        if (biensAgent.length === 0) {
          // Jamais posé de bien — calculer depuis la date d'inscription
          const dateInscription = new Date(agent.createdAt);
          joursInactivite = Math.floor((now.getTime() - dateInscription.getTime()) / (24 * 60 * 60 * 1000));
          inactif = joursInactivite >= DELAI_AGENT_JOURS;
        } else {
          const dernierBien = new Date(biensAgent[0].createdAt);
          dernierBienDate = dernierBien.toISOString();
          joursInactivite = Math.floor((now.getTime() - dernierBien.getTime()) / (24 * 60 * 60 * 1000));
          inactif = joursInactivite >= DELAI_AGENT_JOURS;
        }

        // Compter le total de biens
        const tousBiens = await db.select().from(biens)
          .where(eq(biens.ambassadeurId, agent.id));

        if (inactif) {
          resultats.push({
            agentId: agent.id,
            agentNom: `${agent.prenom} ${agent.nom}`,
            agentEmail: agent.email,
            dernierBienDate,
            nbBiensTotaux: tousBiens.length,
            joursInactivite,
            statutInterne: agent.statutInterne,
            inactif: true,
          });
        }
      }

      return resultats;
    }),

  // ─── DÉCLENCHER LE TRIGGER AGENT (passer en suspendu + notifier) ───────────
  declencherTriggerAgent: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Récupérer l'agent
      const [agent] = await db.select().from(ambassadeurs)
        .where(eq(ambassadeurs.id, input.agentId))
        .limit(1);
      if (!agent) return { success: false, message: "Agent introuvable" };

      // Calculer jours d'inactivité
      const biensAgent = await db.select().from(biens)
        .where(eq(biens.ambassadeurId, input.agentId))
        .orderBy(desc(biens.createdAt))
        .limit(1);

      const dateRef = biensAgent.length > 0
        ? new Date(biensAgent[0].createdAt)
        : new Date(agent.createdAt);
      const joursInactivite = Math.floor((Date.now() - dateRef.getTime()) / (24 * 60 * 60 * 1000));

      // Passer en suspendu
      await db.update(ambassadeurs)
        .set({
          statutInterne: "suspendu",
          notesInternes: `[AUTO] Suspendu automatiquement le ${new Date().toLocaleDateString("fr-FR")} pour inactivité > ${DELAI_AGENT_JOURS}j (${joursInactivite}j sans bien posé).`,
        })
        .where(eq(ambassadeurs.id, input.agentId));

      // Notification in-app pour Élodie
      await db.insert(notificationsInApp).values({
        destinataireEmail: "elodie@sigmafactory.fr",
        type: "trigger_inactivite_agent",
        titre: `⚠️ Agent suspendu — ${agent.prenom} ${agent.nom}`,
        message: `Aucun bien posé depuis ${joursInactivite} jours. Statut passé en Suspendu automatiquement.`,
        lien: `/dashboard/reseau`,
        lu: false,
        createdAt: now,
      });

      // Email Élodie + Owner
      const detail = `Aucun bien posé depuis ${joursInactivite} jours (seuil : ${DELAI_AGENT_JOURS}j)`;
      await sendRetardAlert({
        type: "agent",
        nom: `${agent.prenom} ${agent.nom}`,
        detail,
        destinataire: "Elodie",
        lien: `${DASHBOARD_URL}/dashboard/reseau`,
      });

      return { success: true, message: `${agent.prenom} ${agent.nom} suspendu` };
    }),

  // ─── RÉACTIVER UN COURTIER (manuel, par Manon) ─────────────────────────────
  reactiverCourtier: protectedProcedure
    .input(z.object({ courtierId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(courtiers)
        .set({ statutInterne: "actif" })
        .where(eq(courtiers.id, input.courtierId));
      return { success: true };
    }),

  // ─── RÉACTIVER UN AGENT (manuel, par Élodie) ──────────────────────────────
  reactiverAgent: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(ambassadeurs)
        .set({ statutInterne: "actif" })
        .where(eq(ambassadeurs.id, input.agentId));
      return { success: true };
    }),
});

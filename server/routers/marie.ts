/**
 * Router Marie — Pipe Avis & Témoignages
 *
 * Fonctionnalités :
 *   1. Assignation de Marie depuis le CRM Pipeline (Manon/Élodie)
 *   2. Checkbox "Testimony Marie fait" → notifie Manon ou Élodie
 *   3. CRUD du pipe avis (4 étapes : avis_a_faire → avis_effectue → en_montage → montage_ok)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, desc, asc } from "drizzle-orm";
import { avisPipe, crmLeads } from "../../drizzle/schema";
import { createNotification } from "../db";
import { Resend } from "resend";

const MARIE_EMAIL = "mariecabut@sigmaipf.fr";
const MANON_EMAIL = "manondubost@sigmaipf.fr";
const ELODIE_EMAIL = "elodie@sigmafactory.fr";
const OWNER_EMAILS = ["contact@sigmafactory.fr"];

async function sendMarieAssignmentEmail(data: {
  leadNom: string;
  leadEmail?: string | null;
  leadTelephone?: string | null;
  etapeSource: "courtage" | "immo";
  assignePar: string;
}) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const etapeLabel = data.etapeSource === "courtage" ? "Courtage (Manon)" : "Immo (Élodie)";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif"><div style="max-width:520px;margin:0 auto;background:#111"><div style="background:#000;padding:24px 32px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SIGMA <span style="color:#C9A84C">FACTORY</span></div><div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Avis & Témoignages</div></div><div style="padding:32px"><h2 style="color:#fff;margin:0 0 8px">Nouvelle assignation — Avis client</h2><p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 20px">Bonjour Marie,<br><br><strong style="color:#fff">${data.assignePar}</strong> t'a assigné(e) pour récolter le témoignage du client suivant :</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:16px 20px;margin:0 0 24px"><p style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px">Client</p><p style="color:#fff;font-size:16px;font-weight:bold;margin:0 0 8px">${data.leadNom}</p>${data.leadEmail ? `<p style="color:#aaa;font-size:13px;margin:0 0 4px">Email : <a href="mailto:${data.leadEmail}" style="color:#C9A84C">${data.leadEmail}</a></p>` : ""}${data.leadTelephone ? `<p style="color:#aaa;font-size:13px;margin:0">Tél : ${data.leadTelephone}</p>` : ""}</div><div style="background:#1a1a0a;border:1px solid rgba(201,168,76,0.2);padding:12px 16px;margin:0 0 24px"><p style="color:#C9A84C;font-size:11px;font-weight:bold;margin:0 0 4px">Étape source</p><p style="color:#fff;font-size:14px;margin:0">${etapeLabel}</p></div><a href="https://www.sigmafactory.org/dashboard/avis-pipe" style="display:block;background:#C9A84C;color:#000;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center;padding:14px 28px;margin:0 0 20px">VOIR MON PIPE AVIS</a><p style="color:#555;font-size:12px">Une question ? <a href="mailto:assistance.direction@sigmaipf.fr" style="color:#C9A84C">assistance.direction@sigmaipf.fr</a></p></div><div style="padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;text-align:center">Sigma Factory — Accès réservé à l'équipe interne</div></div></body></html>`;
    await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: MARIE_EMAIL,
      cc: OWNER_EMAILS,
      subject: `Assignation Avis — ${data.leadNom} (${etapeLabel})`,
      html,
    });
  } catch (e) {
    console.error("[Marie] Erreur email assignation:", e);
  }
}

async function sendTestimonyDoneEmail(data: {
  leadNom: string;
  etapeSource: "courtage" | "immo";
}) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const destinataire = data.etapeSource === "courtage" ? MANON_EMAIL : ELODIE_EMAIL;
    const destinataireNom = data.etapeSource === "courtage" ? "Manon" : "Élodie";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif"><div style="max-width:520px;margin:0 auto;background:#111"><div style="background:#000;padding:24px 32px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SIGMA <span style="color:#C9A84C">FACTORY</span></div></div><div style="padding:32px"><h2 style="color:#fff;margin:0 0 8px">✅ Témoignage récolté — ${data.leadNom}</h2><p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 20px">Bonjour ${destinataireNom},<br><br>Marie a marqué le témoignage de <strong style="color:#fff">${data.leadNom}</strong> comme effectué. Le dossier passe maintenant en phase de montage.</p><a href="https://www.sigmafactory.org/dashboard/pipeline" style="display:block;background:#C9A84C;color:#000;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center;padding:14px 28px;margin:0 0 20px">VOIR LE PIPELINE</a></div></div></body></html>`;
    await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: destinataire,
      cc: OWNER_EMAILS,
      subject: `Témoignage effectué — ${data.leadNom}`,
      html,
    });
  } catch (e) {
    console.error("[Marie] Erreur email testimony done:", e);
  }
}

export const marieRouter = router({
  // ─── Assigner Marie à un lead CRM ──────────────────────────────────────────
  assignerMarie: protectedProcedure
    .input(z.object({
      crmLeadId: z.number(),
      etapeSource: z.enum(["courtage", "immo"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Récupérer le lead
      const [lead] = await db!.select().from(crmLeads).where(eq(crmLeads.id, input.crmLeadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead introuvable" });

      // Mettre à jour le lead CRM
      await db!.update(crmLeads)
        .set({ marieAssignee: true, marieAssigneeEtape: input.etapeSource } as any)
        .where(eq(crmLeads.id, input.crmLeadId));

      // Créer ou mettre à jour l'entrée dans le pipe avis
      const existing = await db!.select().from(avisPipe).where(eq(avisPipe.crmLeadId, input.crmLeadId)).limit(1);
      if (existing.length === 0) {
        await db!.insert(avisPipe).values({
          crmLeadId: input.crmLeadId,
          leadNom: `${lead.prenom} ${lead.nom}`,
          leadEmail: lead.email,
          leadTelephone: lead.telephone ?? null,
          etape: "avis_a_faire",
          etapeSource: input.etapeSource,
        } as any);
      }

      // Notification in-app pour Marie
      await createNotification({
        destinataire: "Marie",
        type: "assignation",
        titre: "Nouvelle assignation — Avis client",
        contenu: `${ctx.user.name} t'a assigné(e) pour le témoignage de ${lead.prenom} ${lead.nom}`,
        lienPage: "/dashboard/avis-pipe",
        crmLeadId: input.crmLeadId,
      });

      // Email à Marie
      sendMarieAssignmentEmail({
        leadNom: `${lead.prenom} ${lead.nom}`,
        leadEmail: lead.email,
        leadTelephone: lead.telephone ?? null,
        etapeSource: input.etapeSource,
        assignePar: ctx.user.name ?? "L'équipe",
      }).catch(console.error);

      return { success: true };
    }),

  // ─── Marquer Testimony Marie comme fait ────────────────────────────────────
  marquerTestimony: protectedProcedure
    .input(z.object({
      crmLeadId: z.number(),
      fait: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      const [lead] = await db!.select().from(crmLeads).where(eq(crmLeads.id, input.crmLeadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      await db!.update(crmLeads)
        .set({ testimonyMarieFait: input.fait } as any)
        .where(eq(crmLeads.id, input.crmLeadId));

      // Si fait = true, avancer le pipe avis à "avis_effectue"
      if (input.fait) {
        await db!.update(avisPipe)
          .set({ etape: "avis_effectue" } as any)
          .where(eq(avisPipe.crmLeadId, input.crmLeadId));

        // Notifier Manon ou Élodie selon l'étape source
        const etapeSource = (lead as any).marieAssigneeEtape ?? "courtage";
        const destinataireNotif = etapeSource === "courtage" ? "Manon" : "Elodie";
        await createNotification({
          destinataire: destinataireNotif,
          type: "statut_change",
          titre: "Témoignage effectué",
          contenu: `Marie a marqué le témoignage de ${lead.prenom} ${lead.nom} comme effectué`,
          lienPage: "/dashboard/pipeline",
          crmLeadId: input.crmLeadId,
        });

        sendTestimonyDoneEmail({
          leadNom: `${lead.prenom} ${lead.nom}`,
          etapeSource,
        }).catch(console.error);
      }

      return { success: true };
    }),

  // ─── Lister le pipe avis (vue Marie) ───────────────────────────────────────
  listAvisPipe: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const items = await db!.select().from(avisPipe).orderBy(asc(avisPipe.createdAt));
      return items;
    }),

  // ─── Mettre à jour l'étape du pipe avis ────────────────────────────────────
  updateEtapeAvis: protectedProcedure
    .input(z.object({
      id: z.number(),
      etape: z.enum(["avis_a_faire", "avis_effectue", "en_montage", "montage_ok"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db!.update(avisPipe)
        .set({ etape: input.etape, notes: input.notes ?? null } as any)
        .where(eq(avisPipe.id, input.id));
      return { success: true };
    }),

  // ─── Statistiques globales du pipe avis ───────────────────────────────────────────────────
  statsAvis: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const items = await db!.select().from(avisPipe);

      const total = items.length;
      const aFaire = items.filter(i => i.etape === "avis_a_faire").length;
      const effectue = items.filter(i => i.etape === "avis_effectue").length;
      const enMontage = items.filter(i => i.etape === "en_montage").length;
      const montageOk = items.filter(i => i.etape === "montage_ok").length;
      const courtage = items.filter(i => i.etapeSource === "courtage").length;
      const immo = items.filter(i => i.etapeSource === "immo").length;

      // Stats du mois en cours
      const now = new Date();
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
      const ceMois = items.filter(i => new Date(i.createdAt) >= debutMois).length;
      const montageOkCeMois = items.filter(i =>
        i.etape === "montage_ok" && new Date(i.updatedAt) >= debutMois
      ).length;

      const tauxConversion = total > 0 ? Math.round((montageOk / total) * 100) : 0;

      return {
        total, aFaire, effectue, enMontage, montageOk,
        courtage, immo, ceMois, montageOkCeMois, tauxConversion,
      };
    }),

  // ─── Supprimer une entrée du pipe avis ──────────────────────────────────────────────────────────
  deleteAvisEntry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "direction") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      await db!.delete(avisPipe).where(eq(avisPipe.id, input.id));
      return { success: true };
    }),

  // ─── Récupérer les leads CRM assignés à Marie ──────────────────────────────
  leadsAssignes: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const items = await db!.select().from(crmLeads)
        .where(eq(crmLeads.marieAssignee as any, true))
        .orderBy(desc(crmLeads.updatedAt));
      return items;
    }),
});

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { feedbacks } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  amelioration: "Amélioration",
  question: "Question",
  autre: "Autre",
};

const PRIORITE_LABELS: Record<string, string> = {
  faible: "Faible",
  normale: "Normale",
  haute: "Haute",
  critique: "CRITIQUE",
};

export const feedbacksRouter = router({
  // Procédure publique — tout le monde peut soumettre
  soumettre: publicProcedure
    .input(z.object({
      type: z.enum(["bug", "amelioration", "question", "autre"]),
      priorite: z.enum(["faible", "normale", "haute", "critique"]).default("normale"),
      titre: z.string().min(3).max(255),
      description: z.string().min(10),
      page: z.string().optional(),
      auteur: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const now = Date.now();
      const [result] = await db.insert(feedbacks).values({
        type: input.type,
        priorite: input.priorite,
        titre: input.titre,
        description: input.description,
        page: input.page ?? null,
        auteur: input.auteur ?? null,
        email: input.email || null,
        statut: "nouveau",
        createdAt: now,
        updatedAt: now,
      });

      // Notification owner
      const typeLabel = TYPE_LABELS[input.type] ?? input.type;
      const prioriteLabel = PRIORITE_LABELS[input.priorite] ?? input.priorite;
      await notifyOwner({
        title: `[${typeLabel}] ${input.titre} — Priorité : ${prioriteLabel}`,
        content: `**Page :** ${input.page ?? "Non précisée"}\n**Auteur :** ${input.auteur ?? "Anonyme"} (${input.email || "sans email"})\n\n${input.description}`,
      });

      return { id: (result as any).insertId, success: true };
    }),

  // Liste des feedbacks — admin uniquement
  liste: protectedProcedure
    .input(z.object({
      statut: z.enum(["nouveau", "en_cours", "resolu", "ignore", "tous"]).default("tous"),
      type: z.enum(["bug", "amelioration", "question", "autre", "tous"]).default("tous"),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input?.statut && input.statut !== "tous") {
        conditions.push(eq(feedbacks.statut, input.statut as any));
      }
      if (input?.type && input.type !== "tous") {
        conditions.push(eq(feedbacks.type, input.type as any));
      }

      const rows = conditions.length > 0
        ? await db.select().from(feedbacks).where(and(...conditions)).orderBy(desc(feedbacks.createdAt))
        : await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));

      return rows;
    }),

  // Mettre à jour le statut — admin uniquement
  updateStatut: protectedProcedure
    .input(z.object({
      id: z.number(),
      statut: z.enum(["nouveau", "en_cours", "resolu", "ignore"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(feedbacks)
        .set({ statut: input.statut, updatedAt: Date.now() })
        .where(eq(feedbacks.id, input.id));
      return { success: true };
    }),

  // Supprimer — admin uniquement
  supprimer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(feedbacks).where(eq(feedbacks.id, input.id));
      return { success: true };
    }),

  // Stats rapides — admin uniquement
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, nouveau: 0, en_cours: 0, critique: 0 };

    const rows = await db.select().from(feedbacks);
    return {
      total: rows.length,
      nouveau: rows.filter(r => r.statut === "nouveau").length,
      en_cours: rows.filter(r => r.statut === "en_cours").length,
      critique: rows.filter(r => r.priorite === "critique").length,
    };
  }),
});

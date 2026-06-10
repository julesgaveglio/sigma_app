import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { storagePut } from "../storage";
import { sendCourtierDocumentAlert, sendAgentDocumentAlert } from "../mailer";
import mysql from "mysql2/promise";

async function getConn() {
  return mysql.createConnection(process.env.DATABASE_URL!);
}

function randomSuffix() {
  return Math.random().toString(36).substring(2, 10);
}

export const partnerDocsRouter = router({

  // ─── COURTIER DOCUMENTS ────────────────────────────────────────────────────

  uploadCourtierDoc: protectedProcedure
    .input(z.object({
      courtierId: z.number(),
      courtierNom: z.string(),
      courtierEmail: z.string(),
      fileBase64: z.string(),
      nom: z.string(),
      mimeType: z.string(),
      taille: z.number(),
      envoyePar: z.enum(["courtier", "manon"]),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.nom.split(".").pop() ?? "bin";
      const key = `courtier-docs/${input.courtierId}/${Date.now()}-${randomSuffix()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      const conn = await getConn();
      const [result] = await conn.execute(
        `INSERT INTO courtier_documents (courtier_id, nom, url, file_key, mime_type, taille, envoye_par, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.courtierId, input.nom, url, key, input.mimeType, input.taille, input.envoyePar, Date.now()]
      );
      await conn.end();

      // Email notification
      await sendCourtierDocumentAlert({
        partnerNom: input.courtierNom,
        partnerEmail: input.courtierEmail,
        nomFichier: input.nom,
        envoyePar: input.envoyePar,
      });

      return { success: true, url, id: (result as any).insertId };
    }),

  listCourtierDocs: protectedProcedure
    .input(z.object({ courtierId: z.number() }))
    .query(async ({ input }) => {
      const conn = await getConn();
      const [rows] = await conn.execute(
        `SELECT id, nom, url, file_key, mime_type, taille, envoye_par, uploaded_at
         FROM courtier_documents WHERE courtier_id = ? ORDER BY uploaded_at DESC`,
        [input.courtierId]
      );
      await conn.end();
      return (rows as any[]).map(r => ({
        id: r.id as number,
        nom: r.nom as string,
        url: r.url as string,
        fileKey: r.file_key as string,
        mimeType: r.mime_type as string,
        taille: r.taille as number,
        envoyePar: r.envoye_par as "courtier" | "manon",
        uploadedAt: r.uploaded_at as number,
      }));
    }),

  deleteCourtierDoc: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input }) => {
      const conn = await getConn();
      await conn.execute(`DELETE FROM courtier_documents WHERE id = ?`, [input.documentId]);
      await conn.end();
      return { success: true };
    }),

  // ─── AGENT DOCUMENTS ───────────────────────────────────────────────────────

  uploadAgentDoc: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      agentNom: z.string(),
      agentEmail: z.string(),
      fileBase64: z.string(),
      nom: z.string(),
      mimeType: z.string(),
      taille: z.number(),
      envoyePar: z.enum(["agent", "elodie"]),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.nom.split(".").pop() ?? "bin";
      const key = `agent-docs/${input.agentId}/${Date.now()}-${randomSuffix()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      const conn = await getConn();
      const [result] = await conn.execute(
        `INSERT INTO agent_documents (agent_id, nom, url, file_key, mime_type, taille, envoye_par, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.agentId, input.nom, url, key, input.mimeType, input.taille, input.envoyePar, Date.now()]
      );
      await conn.end();

      // Email notification
      await sendAgentDocumentAlert({
        partnerNom: input.agentNom,
        partnerEmail: input.agentEmail,
        nomFichier: input.nom,
        envoyePar: input.envoyePar,
      });

      return { success: true, url, id: (result as any).insertId };
    }),

  listAgentDocs: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }) => {
      const conn = await getConn();
      const [rows] = await conn.execute(
        `SELECT id, nom, url, file_key, mime_type, taille, envoye_par, uploaded_at
         FROM agent_documents WHERE agent_id = ? ORDER BY uploaded_at DESC`,
        [input.agentId]
      );
      await conn.end();
      return (rows as any[]).map(r => ({
        id: r.id as number,
        nom: r.nom as string,
        url: r.url as string,
        fileKey: r.file_key as string,
        mimeType: r.mime_type as string,
        taille: r.taille as number,
        envoyePar: r.envoye_par as "agent" | "elodie",
        uploadedAt: r.uploaded_at as number,
      }));
    }),

  deleteAgentDoc: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input }) => {
      const conn = await getConn();
      await conn.execute(`DELETE FROM agent_documents WHERE id = ?`, [input.documentId]);
      await conn.end();
      return { success: true };
    }),
});

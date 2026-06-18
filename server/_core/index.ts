import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { schedulePAPScraperJob } from "../jobs/schedulePAPScraper";
import { scheduleCourtierRelanceJob } from "../jobs/scheduleCourtierRelance";
import { scheduleUserIdLinkJob } from "../jobs/scheduleUserIdLinkJob";
import { scheduleCleanExpiredTokensJob } from "../jobs/scheduleCleanExpiredTokens";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Log environment variables for debugging
  console.log("[Server] Starting...");
  console.log("[Server] DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
  console.log("[Server] NODE_ENV:", process.env.NODE_ENV);
  
  // Test database connection
  const db = await getDb();
  if (db) {
    console.log("[Server] Database connection: SUCCESS");
  } else {
    console.error("[Server] Database connection: FAILED");
  }
  
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // ─── WEBHOOK FATHOM ──────────────────────────────────────────────────────
  app.post("/api/webhooks/fathom", async (req, res) => {
    try {
      const secret = process.env.FATHOM_WEBHOOK_SECRET;
      if (secret) {
        const sig = req.headers["x-fathom-signature"] || req.headers["x-webhook-signature"];
        if (sig !== secret) {
          console.warn("[Fathom Webhook] Signature invalide");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      const payload = req.body;
      console.log("[Fathom Webhook] Event recu:", JSON.stringify(payload).slice(0, 200));

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      // Extraire les infos du payload Fathom
      const title = payload.title || payload.call_title || "";
      const summary = payload.summary || payload.ai_summary || "";
      const recordedBy = payload.recorded_by || payload.recorder_name || payload.recorder_email || "";
      const callUrl = payload.url || payload.call_url || "";
      const callDate = payload.created_at || payload.call_date || payload.recorded_at;

      // Extraire le type de RDV (R1, R2, R3) et le prenom du prospect
      const rdvMatch = title.match(/R(\d)/i);
      const rdvType = rdvMatch ? `R${rdvMatch[1]}` : "R1";

      let prospectName = "";
      const cleaned = title.replace(/\(.*?\)/g, "").replace(/R\d/gi, "").replace(/RDV/gi, "").replace(/avec\s+\w+/gi, "").trim();
      const firstWord = cleaned.split(/\s+/)[0];
      if (firstWord && firstWord.length > 1) prospectName = firstWord;

      // Debrief auto
      let debrief = "En decouverte";
      const lowerSummary = summary.toLowerCase();
      if (title.toLowerCase().includes("disqua")) {
        debrief = "Disqualifie";
      } else if (lowerSummary.includes("willing to purchase") || lowerSummary.includes("ready to") || lowerSummary.includes("accepted") || lowerSummary.includes("prêt à")) {
        const amountMatch = summary.match(/([\d\s,.]+)\s*(?:€|EUR|euros?)/i);
        debrief = amountMatch ? `Quasi close ${amountMatch[1].replace(/[\s,]/g, "")}€` : "Quasi close";
      } else if (lowerSummary.includes("interest") || lowerSummary.includes("intéress") || lowerSummary.includes("exploring")) {
        const amountMatch = summary.match(/([\d\s,.]+)\s*(?:€|EUR|euros?)/i);
        debrief = amountMatch ? `Interesse ${amountMatch[1].replace(/[\s,]/g, "")}€` : "Interesse";
      }

      // Invitees / prospect email
      const prospectEmail = payload.prospect_email || payload.invitee_email ||
        (payload.invitees && payload.invitees[0]?.email) || "";
      const actionItems = payload.action_items ? JSON.stringify(payload.action_items) : "";

      const { fathomCalls } = await import("../../drizzle/schema");
      await db.insert(fathomCalls).values({
        fathomRecordingId: String(payload.recording_id || payload.id || ""),
        fathomCallId: String(payload.call_id || ""),
        title,
        recordedBy,
        summary,
        actionItems,
        prospectName,
        prospectEmail,
        rdvType,
        debrief,
        callUrl,
        callDate: callDate ? new Date(callDate) : new Date(),
        rawPayload: JSON.stringify(payload),
      });

      console.log(`[Fathom Webhook] Call stocke: ${prospectName} (${rdvType}) — ${debrief}`);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[Fathom Webhook] Erreur:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // Endpoint pour le cron recap (lecture des calls du jour)
  app.get("/api/webhooks/fathom/today", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.FATHOM_WEBHOOK_SECRET || process.env.JWT_SECRET;
      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });

      const { fathomCalls } = await import("../../drizzle/schema");
      const { gte } = await import("drizzle-orm");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const calls = await db.select().from(fathomCalls)
        .where(gte(fathomCalls.createdAt, today))
        .orderBy(fathomCalls.createdAt);

      res.json({ calls, count: calls.length });
    } catch (error) {
      console.error("[Fathom API] Erreur:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // ─── WEBHOOK BONZAI — Paiements Bonzai Pro ──────────────────────────
  app.post("/api/webhooks/bonzai", async (req, res) => {
    try {
      const payload = req.body;
      console.log("[Bonzai Webhook] Event recu:", JSON.stringify(payload).slice(0, 500));

      const eventType = payload.event_type;
      if (!eventType) {
        return res.status(400).json({ error: "Missing event_type" });
      }

      const user = payload.user || {};
      const product = payload.product || {};
      const order = payload.order || {};
      const vendor = payload.vendor || {};

      if (eventType === "product_access_granted") {
        console.log(`[Bonzai] ACCES ACCORDE: ${user.name} (${user.email}) → produit "${product.name}" | order #${payload.order_id} | type: ${payload.type}`);

        // Stocker dans fathom_calls en reutilisant la table existante comme log generique
        // TODO: creer une table dediee bonzai_events si besoin
        const db = await getDb();
        if (db) {
          const { fathomCalls } = await import("../../drizzle/schema");
          await db.insert(fathomCalls).values({
            fathomRecordingId: `bonzai-${payload.id || Date.now()}`,
            fathomCallId: String(payload.order_id || ""),
            title: `Paiement Bonzai: ${product.name}`,
            recordedBy: vendor.name || "Bonzai",
            summary: `${user.name} (${user.email}) a achete "${product.name}" — type: ${payload.type}, order #${payload.order_id}`,
            actionItems: "",
            prospectName: user.name || "",
            prospectEmail: user.email || "",
            rdvType: "PAIEMENT",
            debrief: `Achat ${product.name}`,
            callUrl: "",
            callDate: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date(),
            rawPayload: JSON.stringify(payload),
          });
          console.log(`[Bonzai] Paiement stocke en BDD`);
        }
      } else if (eventType === "product_access_revoked") {
        console.log(`[Bonzai] ACCES REVOQUE: ${user.name} (${user.email}) → produit "${product.name}"`);
      } else {
        console.log(`[Bonzai] Event inconnu: ${eventType}`);
      }

      res.status(200).json({ ok: true, event: eventType });
    } catch (error) {
      console.error("[Bonzai Webhook] Erreur:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // ─── WEBHOOK SIGMA-WON — Pont CRM Sales → App Delivery ─────────────
  app.post("/api/webhooks/sigma-won", async (req, res) => {
    try {
      // Auth via X-Inter-Service-Token (meme cle partagee entre les 2 apps)
      const token = req.headers["x-inter-service-token"];
      const expectedToken = process.env.INTER_SERVICE_API_KEY;
      if (!expectedToken || token !== expectedToken) {
        console.warn("[Sigma-Won] Token invalide ou manquant");
        return res.status(401).json({ error: "Invalid token" });
      }

      const payload = req.body;
      console.log("[Sigma-Won] Event recu:", JSON.stringify(payload).slice(0, 300));

      if (payload.event !== "opportunity.won") {
        return res.status(200).json({ ok: true, skipped: true, reason: "event not opportunity.won" });
      }

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const sigmaOppId = payload.sigma_opportunity_id;
      if (!sigmaOppId) {
        return res.status(400).json({ error: "Missing sigma_opportunity_id" });
      }

      const contact = payload.contact || {};
      const opportunity = payload.opportunity || {};

      // Deduplication : verifier si ce sigma_opportunity_id existe deja
      const { crmLeads, crmNotes } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const existing = await db.select({ id: crmLeads.id })
        .from(crmLeads)
        .where(eq(crmLeads.sigmaOpportunityId, sigmaOppId))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[Sigma-Won] Dedup: opp ${sigmaOppId} deja importee → crm_lead #${existing[0]!.id}`);
        return res.status(200).json({ ok: true, duplicate: true, crm_lead_id: existing[0]!.id });
      }

      // Mapper la formule depuis l'offre CRM
      let formule: "starter" | "premium" | "sdt_starter" | "sdt_premium" | null = null;
      const offreKind = opportunity.offre?.kind || opportunity.offre_kind;
      if (offreKind) {
        const mapping: Record<string, typeof formule> = {
          "idrh": "premium",
          "idrh_starter": "starter",
          "hzc": "premium",
          "atypique": "premium",
          "treso": "sdt_premium",
          "sdt": "sdt_starter",
        };
        formule = mapping[offreKind.toLowerCase()] ?? null;
      }

      // Creer le crm_lead en etape welcome_call
      const result = await db.insert(crmLeads).values({
        nom: contact.last_name || "Inconnu",
        prenom: contact.first_name || "Inconnu",
        email: contact.email || "",
        telephone: contact.phone || null,
        formule,
        montantFormule: opportunity.amount_cents ? Math.round(opportunity.amount_cents / 100) : null,
        etape: "welcome_call",
        statut: "actif",
        responsable: "Maria",
        sigmaOpportunityId: sigmaOppId,
      });

      const newId = result[0]?.insertId;

      // Ajouter une note d'import
      if (newId) {
        await db.insert(crmNotes).values({
          crmLeadId: newId,
          etape: "welcome_call",
          auteur: "Systeme (CRM Sales)",
          contenu: `Lead importe depuis CRM Sales — Opportunite ${sigmaOppId} gagnee le ${payload.won_at || "date inconnue"}. Montant: ${opportunity.amount_cents ? (opportunity.amount_cents / 100) + "€" : "non renseigne"}.`,
        });
      }

      console.log(`[Sigma-Won] crm_lead #${newId} cree pour ${contact.first_name} ${contact.last_name} (opp ${sigmaOppId})`);
      res.status(200).json({ ok: true, crm_lead_id: newId });
    } catch (error) {
      console.error("[Sigma-Won] Erreur:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Initialiser le job quotidien du scraper PAP
    try {
      schedulePAPScraperJob();
      scheduleCourtierRelanceJob();
      scheduleUserIdLinkJob();
      scheduleCleanExpiredTokensJob();
    } catch (error) {
      console.error("Erreur initialisation job PAP:", error);
    }
  });
}

startServer().catch(console.error);

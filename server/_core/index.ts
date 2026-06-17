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

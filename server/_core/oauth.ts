import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { isEmailAllowed } from "../localAuth";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Vérifier le rôle dans allowedEmails pour l'assigner automatiquement
      let roleToAssign: "user" | "admin" | "direction" | "agent" | "courtier" | undefined = undefined;
      if (userInfo.email) {
        const allowed = await isEmailAllowed(userInfo.email);
        if (allowed.allowed && allowed.role) {
          roleToAssign = allowed.role;
        }
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
        ...(roleToAssign ? { role: roleToAssign } : {}),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Extraire l'origin depuis le state (URL de callback encodée en base64)
      // Le state contient l'URL complète du callback incluant le domaine d'origine
      let redirectTo = "/dashboard";
      let originHostname: string | undefined;
      try {
        const decoded = Buffer.from(state, "base64").toString("utf-8");
        const callbackUrl = new URL(decoded);
        redirectTo = callbackUrl.origin + "/dashboard";
        // Extraire le hostname pour le cookie (ex: sigmafactory.org)
        const hostname = callbackUrl.hostname;
        const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
        if (hostname && !LOCAL_HOSTS.has(hostname)) {
          originHostname = hostname;
        }
      } catch {
        redirectTo = "/dashboard";
      }

      const cookieOptions = getSessionCookieOptions(req);

      // Si le domaine d'origine est différent du domaine du serveur,
      // poser le cookie sur le domaine d'origine pour que la session soit valide après redirection
      if (originHostname) {
        cookieOptions.domain = originHostname;
      }

      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, redirectTo);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(role: "admin" | "user" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@sigmaipf.fr",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("demandes.submit", () => {
  it("rejette une soumission avec des champs manquants", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.demandes.submit({
        nom: "",
        prenom: "Jean",
        telephone: "0612345678",
        email: "jean@test.fr",
        sujet: "Test",
        demande: "Description test",
        priorite: "normal",
      })
    ).rejects.toThrow();
  });

  it("rejette un email invalide", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.demandes.submit({
        nom: "Dupont",
        prenom: "Jean",
        telephone: "0612345678",
        email: "email-invalide",
        sujet: "Test",
        demande: "Description test",
        priorite: "normal",
      })
    ).rejects.toThrow();
  });
});

describe("demandes.list", () => {
  it("autorise l'accès à tout utilisateur connecté (y compris non-admin)", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    // demandes.list est ouvert à toute l'équipe connectée
    const result = await caller.demandes.list({});
    expect(result).toHaveProperty("items");
  });
});

describe("demandes.updateStatut", () => {
  it("interdit la mise à jour aux non-admins", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.demandes.updateStatut({ id: 1, statut: "effectuee" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("demandes.exportCsv", () => {
  it("interdit l'export aux non-admins", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.demandes.exportCsv()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

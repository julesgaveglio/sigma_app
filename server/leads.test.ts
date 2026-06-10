import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-user", email: "admin@sigma.fr",
      name: "Admin Sigma", loginMethod: "manus", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2, openId: "regular-user", email: "user@example.com",
      name: "Regular User", loginMethod: "manus", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("leads.list — accès admin", () => {
  it("retourne une liste pour un admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.leads.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("refuse l'accès à un utilisateur non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.leads.list({})).rejects.toThrow();
  });
});

describe("leads.submit — soumission publique", () => {
  it("accepte une soumission valide", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.leads.submit({
      nom: "Dupont",
      prenoms: "Jean Pierre",
      email: "jean.dupont@test.fr",
      telephonePortable: "0612345678",
      situationFamiliale: "celibataire",
      nationalite: "francais",
    });
    expect(result.success).toBe(true);
    expect(typeof result.leadId).toBe("number");
  });

  it("rejette une soumission sans nom", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.leads.submit({ nom: "", prenoms: "Jean" })).rejects.toThrow();
  });

  it("rejette une soumission sans prénoms", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.leads.submit({ nom: "Dupont", prenoms: "" })).rejects.toThrow();
  });
});

describe("leads.updateStatut — mise à jour statut", () => {
  it("refuse la mise à jour à un non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.leads.updateStatut({ id: 1, statut: "traite" })).rejects.toThrow();
  });
});

describe("auth.logout", () => {
  it("efface le cookie de session", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: { id: 1, openId: "test", email: null, name: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: (name: string) => clearedCookies.push(name) } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

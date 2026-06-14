import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "./db";
import { users, allowedEmails } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { Resend } from "resend";

// ─── LISTE BLANCHE ────────────────────────────────────────────────────────────

export async function isEmailAllowed(email: string): Promise<{ allowed: boolean; nom?: string; role?: "user" | "admin" | "direction" | "agent" | "courtier" }> {
  const db = await getDb();
  if (!db) return { allowed: false };
  const result = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email.toLowerCase())).limit(1);
  if (result.length === 0) return { allowed: false };
  // Bloquer les comptes désactivés
  if (!(result[0] as any).actif) return { allowed: false };
  return { allowed: true, nom: result[0].nom ?? undefined, role: result[0].role };
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────

export async function registerLocalUser(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Base de données indisponible" };

  const { allowed, role } = await isEmailAllowed(email.toLowerCase());
  if (!allowed) return { success: false, error: "Cet email n'est pas autorisé à accéder à l'application." };

  // Vérifier si l'email existe déjà
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  
  if (existing.length > 0) {
    const existingUser = existing[0] as any;
    // Si le compte existe déjà avec un mot de passe local, bloquer
    if (existingUser.passwordHash) {
      return { success: false, error: "Un compte existe déjà avec cet email." };
    }
    // Sinon (compte OAuth sans mot de passe), on lui ajoute un mot de passe
    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users).set({
      passwordHash,
      loginMethod: "local",
      name: name || existingUser.name,
    } as any).where(eq(users.email, email.toLowerCase()));
    return { success: true };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const openId = `local_${crypto.randomBytes(16).toString("hex")}`;

  await db.insert(users).values({
    openId,
    name,
    email: email.toLowerCase(),
    loginMethod: "local",
    role: role ?? "user",
    passwordHash,
  } as any);

  return { success: true };
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export async function loginLocalUser(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Base de données indisponible" };

  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (result.length === 0) return { success: false, error: "Email ou mot de passe incorrect." };

  const user = result[0] as any;
  if (!user.passwordHash) return { success: false, error: "Ce compte utilise une autre méthode de connexion." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { success: false, error: "Email ou mot de passe incorrect." };

  // Mettre à jour lastSignedIn
  await db.update(users).set({ lastSignedIn: new Date() } as any).where(eq(users.id, user.id));

  return { success: true, user };
}

// ─── RESET PASSWORD (mot de passe temporaire) ─────────────────────────────────
// Sans email externe : génère un mot de passe temporaire et notifie l'admin
// L'admin communique le mot de passe temporaire au membre concerné

function generateTempPassword(): string {
  // Format lisible : 3 groupes de 4 caractères alphanumériques
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) pwd += "-";
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Base de données indisponible" };

  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (result.length === 0) {
    // Ne pas révéler si l'email existe ou non (sécurité)
    return { success: true };
  }

  const user = result[0] as any;

  // Générer un mot de passe temporaire lisible
  const tempPassword = generateTempPassword();
  const tempPasswordHash = await bcrypt.hash(tempPassword, 12);

  // Stocker le mot de passe temporaire et l'expiration
  // Fonctionne aussi pour les users sans passwordHash (premier accès)
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

  // Si le user n'a pas encore de passwordHash, en créer un placeholder
  // pour que loginWithTempPassword puisse fonctionner ensuite
  const updateData: Record<string, any> = {
    resetToken: tempPasswordHash,
    resetTokenExpiry: expiry,
  };
  if (!user.passwordHash) {
    // Mettre un hash placeholder — sera remplacé par le vrai hash lors du login avec le temp password
    updateData.passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
  }

  await db.update(users).set(updateData as any).where(eq(users.id, user.id));

  // Envoyer le mot de passe temporaire directement à l'utilisateur par email
  const appUrl = (process.env.VITE_APP_URL || "https://app.sigmafactory.fr").replace(/\/$/, "");
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: user.email,
      subject: "Votre mot de passe temporaire — Sigma Factory",
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#111">
  <div style="background:#000;padding:24px 32px;border-bottom:2px solid #C9A84C">
    <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SIGMA <span style="color:#C9A84C">FACTORY</span></div>
  </div>
  <div style="padding:32px">
    <h2 style="color:#fff;margin:0 0 8px">Mot de passe temporaire</h2>
    <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 24px">Voici ton mot de passe temporaire, valable <strong style="color:#fff">24 heures</strong>.</p>
    <div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.5);padding:20px 24px;text-align:center;margin-bottom:24px">
      <div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Ton mot de passe temporaire</div>
      <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:3px;font-family:monospace">${tempPassword}</div>
    </div>
    <p style="color:#aaa;font-size:13px;line-height:1.6;margin:0 0 20px">Pour te connecter :<br>1. Va sur <a href="${appUrl}/login" style="color:#C9A84C">${appUrl.replace("https://", "")}/login</a><br>2. Saisis ton email et ce mot de passe temporaire<br>3. Une fois connecté(e), change ton mot de passe dans tes paramètres.</p>
    <a href="${appUrl}/login" style="display:block;background:#C9A84C;color:#000;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center;padding:14px 28px">SE CONNECTER →</a>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;text-align:center">Sigma Factory — Accès réservé à l'équipe interne</div>
</div></body></html>`,
    });
    console.log("[Auth] Email mot de passe temporaire envoyé à", user.email);
    // Notifier l'admin aussi (sans le MDP)
    notifyOwner({
      title: `🔑 Reset mot de passe — ${user.name ?? user.email}`,
      content: `${user.name ?? user.email} a demandé un reset. L'email avec le mot de passe temporaire a été envoyé directement à ${user.email}.`,
    }).catch(console.error);
  } catch (err) {
    console.error("[Auth] Erreur envoi email reset:", err);
  }

  return { success: true };
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Base de données indisponible" };

  // Chercher l'utilisateur par email (le resetToken est un hash bcrypt, pas comparable avec eq())
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (result.length === 0) return { success: false, error: "Lien invalide ou expiré." };

  const user = result[0] as any;
  if (!user.resetToken || !user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
    return { success: false, error: "Ce lien a expiré. Veuillez faire une nouvelle demande." };
  }

  // Vérifier le token avec bcrypt (le resetToken stocké est un hash bcrypt)
  const validToken = await bcrypt.compare(token, user.resetToken);
  if (!validToken) return { success: false, error: "Lien invalide ou expiré." };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({
    passwordHash,
    resetToken: null,
    resetTokenExpiry: null,
  } as any).where(eq(users.id, user.id));

  return { success: true };
}

// ─── LOGIN AVEC MOT DE PASSE TEMPORAIRE ──────────────────────────────────────
// Permet de se connecter avec le mot de passe temporaire généré lors du reset

export async function loginWithTempPassword(email: string, tempPassword: string): Promise<{ success: boolean; user?: any; error?: string; isTempPassword?: boolean }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Base de données indisponible" };

  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (result.length === 0) return { success: false, error: "Email ou mot de passe incorrect." };

  const user = result[0] as any;

  // Vérifier si un mot de passe temporaire est en attente
  if (user.resetToken && user.resetTokenExpiry && new Date(user.resetTokenExpiry) > new Date()) {
    const validTemp = await bcrypt.compare(tempPassword, user.resetToken);
    if (validTemp) {
      // Connexion avec le mot de passe temporaire — définir comme mot de passe permanent
      const newHash = await bcrypt.hash(tempPassword, 12);
      await db.update(users).set({
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
        lastSignedIn: new Date(),
      } as any).where(eq(users.id, user.id));
      return { success: true, user, isTempPassword: true };
    }
  }

  return { success: false, error: "Email ou mot de passe incorrect." };
}

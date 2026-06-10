import { getDb, createNotification } from "../server/db";
import { courtiers, allowedEmails, notifications, notificationsInApp, ambassadeurs } from "../drizzle/schema";
import { like, eq, and } from "drizzle-orm";
import { sendNouveauCourtierNotif } from "../server/mailer";
import { sendBienvenueCourtier } from "../server/mailer";

const db = await getDb();
if (!db) { console.error("DB indisponible"); process.exit(1); }

// 1. Trouver Julien Soumillon
const [julien] = await db.select().from(courtiers).where(like(courtiers.nom, "%Soumillon%")).limit(1);
if (!julien) { console.error("Julien Soumillon introuvable en base"); process.exit(1); }

console.log("=== JULIEN SOUMILLON ===");
console.log("ID:", julien.id);
console.log("Email:", julien.email);
console.log("Statut:", julien.statutInterne);
console.log("Code parrain:", julien.codeParrain);
console.log("Parrain ID (courtier):", julien.parrainId);
console.log("Parrain ID (ambassadeur):", julien.parrainAmbassadeurId);
console.log("Convention PDF:", julien.conventionPdfUrl ? "✓ OUI" : "✗ NON");
console.log("");

// 2. Vérifier accès portail (allowedEmails)
const [allowed] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, julien.email.toLowerCase())).limit(1);
console.log("=== ACCÈS PORTAIL ===");
console.log("Email dans allowedEmails:", allowed ? `✓ OUI (rôle: ${allowed.role})` : "✗ NON — pas d'accès !");
console.log("");

// 3. Vérifier email de bienvenue (notif in-app à lui-même = proxy)
// On vérifie via notificationsInApp si une notif de bienvenue lui a été envoyée
const [notifJulien] = await db.select().from(notificationsInApp)
  .where(and(eq(notificationsInApp.destinataireEmail, julien.email.toLowerCase()), like(notificationsInApp.titre, "%bienvenue%")))
  .limit(1);
console.log("=== EMAIL BIENVENUE ===");
// On ne peut pas savoir si l'email a été envoyé sans log Resend, on vérifie juste allowedEmails
console.log("(Email de bienvenue envoyé via Resend — vérifiable dans les logs Resend)");
console.log("");

// 4. Vérifier le parrain
console.log("=== PARRAIN ===");
let parrainInfo = null;
if (julien.parrainId && julien.parrainId !== 30002) {
  const [parrain] = await db.select().from(courtiers).where(eq(courtiers.id, julien.parrainId)).limit(1);
  if (parrain) parrainInfo = { nom: `${parrain.prenom} ${parrain.nom}`, email: parrain.email, type: "courtier" };
} else if (julien.parrainAmbassadeurId) {
  const [parrain] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, julien.parrainAmbassadeurId)).limit(1);
  if (parrain) parrainInfo = { nom: `${parrain.prenom} ${parrain.nom}`, email: parrain.email, type: "agent" };
}
if (parrainInfo) {
  console.log("Parrain:", parrainInfo.nom, `(${parrainInfo.type})`, parrainInfo.email);
  // Vérifier si notif in-app envoyée au parrain
  const [notifParrain] = await db.select().from(notificationsInApp)
    .where(and(eq(notificationsInApp.destinataireEmail, parrainInfo.email), like(notificationsInApp.titre, "%Soumillon%")))
    .limit(1);
  console.log("Notif in-app parrain:", notifParrain ? "✓ OUI" : "✗ NON");
} else {
  console.log("Parrain: Sigma Factory (master) — pas de notif parrain attendue");
}
console.log("");

// 5. Vérifier notif in-app Manon
const [notifManon] = await db.select().from(notifications)
  .where(and(eq(notifications.destinataire, "Manon"), like(notifications.titre, "%Soumillon%")))
  .limit(1);
console.log("=== NOTIFICATION MANON ===");
console.log("Notif in-app Manon:", notifManon ? "✓ OUI" : "✗ NON");
console.log("");

// ─── CORRECTIONS AUTOMATIQUES ────────────────────────────────────────────────

let fixApplied = false;

// Fix 1 : Activer si en_attente
if (julien.statutInterne === "en_attente") {
  await db.update(courtiers).set({ statutInterne: "actif" }).where(eq(courtiers.id, julien.id));
  console.log("🔧 FIX: Statut mis à 'actif'");
  fixApplied = true;
}

// Fix 2 : Ajouter dans allowedEmails si absent
if (!allowed) {
  await db.insert(allowedEmails).values({
    email: julien.email.toLowerCase(),
    nom: `${julien.prenom} ${julien.nom}`,
    role: "courtier",
  });
  console.log("🔧 FIX: Email ajouté dans allowedEmails");
  fixApplied = true;
}

// Fix 3 : Envoyer email de bienvenue si pas d'accès (on renvoie dans tous les cas car on ne sait pas s'il l'a reçu)
const portailUrl = "https://www.sigmafactory.org/portail-membre";
const sent = await sendBienvenueCourtier({
  prenom: julien.prenom,
  nom: julien.nom,
  email: julien.email,
  codeParrain: julien.codeParrain ?? "",
  portailUrl,
  contratUrl: julien.conventionPdfUrl ?? undefined,
});
console.log("📧 Email bienvenue renvoyé à Julien:", sent ? "✓ OUI" : "✗ ERREUR");

// Fix 4 : Notif in-app Manon si absente
if (!notifManon) {
  await createNotification({
    destinataire: "Manon",
    type: "nouveau_courtier",
    titre: `🎉 Nouveau filleul courtier : ${julien.prenom} ${julien.nom}`,
    message: `${julien.prenom} ${julien.nom} vient de rejoindre le réseau.`,
    lien: "/courtiers",
  });
  console.log("🔧 FIX: Notif in-app Manon créée");
  fixApplied = true;
}

// Fix 5 : Notif in-app parrain si absent
if (parrainInfo) {
  const [notifParrain] = await db.select().from(notificationsInApp)
    .where(and(eq(notificationsInApp.destinataireEmail, parrainInfo.email), like(notificationsInApp.titre, "%Soumillon%")))
    .limit(1);
  if (!notifParrain) {
    await db.insert(notificationsInApp).values({
      destinataireEmail: parrainInfo.email,
      type: "nouveau_filleul",
      titre: `🎉 Nouveau filleul : ${julien.prenom} ${julien.nom}`,
      message: `${julien.prenom} ${julien.nom} vient de rejoindre le réseau grâce à votre parrainage !`,
      lien: "/portail-membre",
      lu: false,
      createdAt: Date.now(),
    });
    console.log("🔧 FIX: Notif in-app parrain créée");
    fixApplied = true;
  }
  // Email au parrain
  const emailParrain = await sendNouveauCourtierNotif({
    prenom: julien.prenom,
    nom: julien.nom,
    email: julien.email,
    telephone: julien.telephone,
    ville: julien.ville,
    statut: julien.statut,
    cabinetNom: julien.cabinetNom ?? undefined,
    parrainNom: parrainInfo.nom,
    parrainEmail: parrainInfo.email,
  });
  console.log("📧 Email notif parrain envoyé:", emailParrain ? "✓ OUI" : "✗ ERREUR");
} else {
  // Pas de parrain externe — juste notifier Manon + Owner
  const emailManon = await sendNouveauCourtierNotif({
    prenom: julien.prenom,
    nom: julien.nom,
    email: julien.email,
    telephone: julien.telephone,
    ville: julien.ville,
    statut: julien.statut,
    cabinetNom: julien.cabinetNom ?? undefined,
  });
  console.log("📧 Email notif Manon+Owner envoyé:", emailManon ? "✓ OUI" : "✗ ERREUR");
}

if (!fixApplied) {
  console.log("\n✅ Tout était déjà en ordre, aucune correction nécessaire.");
} else {
  console.log("\n✅ Corrections appliquées avec succès.");
}

process.exit(0);

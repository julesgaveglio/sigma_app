import { getDb, createNotification } from "../server/db";
import { courtiers, notifications, notificationsInApp } from "../drizzle/schema";
import { like, eq, and } from "drizzle-orm";
import { sendNouveauCourtierNotif } from "../server/mailer";

const db = await getDb();
if (!db) { console.error("DB indisponible"); process.exit(1); }

// 1. Trouver Pierre Aries
const [pierre] = await db.select().from(courtiers).where(like(courtiers.nom, "%Aries%")).limit(1);
if (!pierre) { console.error("Pierre Aries introuvable"); process.exit(1); }
console.log("Courtier trouvé:", pierre.id, pierre.prenom, pierre.nom, pierre.email);

// 2. Vérifier si notif in-app déjà créée pour Manon
const existingNotifs = await db.select().from(notifications)
  .where(and(eq(notifications.destinataire, "Manon"), like(notifications.titre, "%Pierre%Aries%")))
  .limit(1);
console.log("Notif in-app Manon existante:", existingNotifs.length > 0 ? "OUI" : "NON");

if (existingNotifs.length === 0) {
  await createNotification({
    destinataire: "Manon",
    type: "nouveau_courtier",
    titre: "🎉 Nouveau filleul courtier : Pierre Aries",
    message: "Pierre Aries vient de rejoindre le réseau grâce à votre parrainage !",
    lien: "/courtiers",
  });
  console.log("✓ Notif in-app Manon créée");
}

// 3. Envoyer l'email à Manon (sendNouveauCourtierNotif envoie à manondubost@sigmaipf.fr + owner)
const sent = await sendNouveauCourtierNotif({
  prenom: pierre.prenom,
  nom: pierre.nom,
  email: pierre.email,
  telephone: pierre.telephone,
  ville: pierre.ville,
  statut: pierre.statut,
  cabinetNom: pierre.cabinetNom ?? undefined,
  numeroOrias: pierre.numeroOrias ?? undefined,
  parrainNom: "Manon Dubost",
  parrainEmail: undefined, // Manon est déjà dans les destinataires fixes
});
console.log("Email envoyé à Manon:", sent ? "✓ OUI" : "✗ ERREUR");

process.exit(0);

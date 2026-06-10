import { getDb } from "../server/db";
import { courtiers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateConventionCourtierPdf } from "../server/conventionCourtierGenerator";
import { storagePut } from "../server/storage";
import { sendBienvenueCourtier } from "../server/mailer";

async function run() {
  const db = (await getDb());
  if (!db) { console.error("DB indisponible"); process.exit(1); }

  const [c] = await db.select().from(courtiers).where(eq(courtiers.email, "daniel.barcelo@ymanci.com")).limit(1);
  if (!c) { console.log("Courtier non trouvé"); process.exit(0); }

  console.log(`Génération du PDF pour ${c.prenom} ${c.nom}...`);
  
  const pdfBuffer = await generateConventionCourtierPdf({
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone ?? "",
    adresse: c.adresse ?? "",
    codePostal: c.codePostal ?? "",
    ville: c.ville ?? "",
    cabinet: c.cabinet ?? "",
    siret: c.siret ?? "",
    dateSignature: c.dateSignature ? new Date(c.dateSignature).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
    codeParrain: c.codeParrain,
  });

  const fileKey = `conventions/courtier-${c.id}-${Date.now()}.pdf`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
  console.log("PDF uploadé:", url);

  await db.update(courtiers).set({ conventionPdfUrl: url }).where(eq(courtiers.id, c.id));
  console.log("URL sauvegardée en base");

  // Envoyer l'email avec le contrat
  const sent = await sendBienvenueCourtier({
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    codeParrain: c.codeParrain,
    portailUrl: "https://www.sigmafactory.org/portail-membre",
    conventionUrl: url,
  });
  console.log("Email envoyé:", sent ? "OUI" : "NON");

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

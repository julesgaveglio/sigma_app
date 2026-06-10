import { getDb } from "../server/db";
import { courtiers } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";
import { generateConventionCourtierPdf } from "../server/conventionCourtierGenerator";
import { storagePut } from "../server/storage";

const db = await getDb();
if (!db) { console.error("DB indisponible"); process.exit(1); }

// Récupérer Julien Soumillon
const [julien] = await db.select().from(courtiers).where(like(courtiers.nom, "%Soumillon%")).limit(1);
if (!julien) { console.error("Julien Soumillon introuvable"); process.exit(1); }

console.log("Courtier:", julien.id, julien.prenom, julien.nom);
console.log("Convention PDF existante:", julien.conventionPdfUrl ?? "AUCUNE");

if (julien.conventionPdfUrl) {
  console.log("PDF déjà présent, rien à faire.");
  process.exit(0);
}

// Générer le PDF
console.log("Génération du PDF...");
const dateSignature = julien.dateSignature
  ? new Date(julien.dateSignature).toLocaleDateString("fr-FR")
  : new Date().toLocaleDateString("fr-FR");

const pdfBuffer = await generateConventionCourtierPdf({
  nom: julien.nom,
  prenom: julien.prenom,
  email: julien.email,
  telephone: julien.telephone,
  adresse: julien.adresse ?? "",
  codePostal: julien.codePostal ?? "",
  ville: julien.ville,
  statut: julien.statut,
  siret: julien.siret ?? undefined,
  cabinetNom: julien.cabinetNom ?? undefined,
  numeroOrias: julien.numeroOrias ?? undefined,
  denominationSociale: julien.denominationSociale ?? undefined,
  formeJuridique: julien.formeJuridique ?? undefined,
  capitalSocial: julien.capitalSocial ?? undefined,
  adresseSiegeSocial: julien.adresseSiegeSocial ?? undefined,
  villeGreffe: julien.villeGreffe ?? undefined,
  numeroRCS: julien.numeroRCS ?? undefined,
  representantLegalNom: julien.representantLegalNom ?? undefined,
  representantLegalFonction: julien.representantLegalFonction ?? undefined,
  courtierId: julien.id,
  dateSignature,
  signatureNom: julien.signatureNom ?? `${julien.prenom} ${julien.nom}`,
  parrainNom: "Manon Dubost",
  parrainType: "courtier",
});

console.log("PDF généré, taille:", pdfBuffer.length, "bytes");

// Upload S3
const fileKey = `conventions/courtier-${julien.id}-${Date.now()}.pdf`;
const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
console.log("PDF uploadé:", url);

// Mettre à jour en base
await db.update(courtiers)
  .set({ conventionPdfUrl: url, conventionPdfKey: fileKey })
  .where(eq(courtiers.id, julien.id));

console.log("✅ Convention PDF de Julien Soumillon enregistrée en base.");
process.exit(0);

import { generateConventionCourtierPdf } from "../server/conventionCourtierGenerator";

try {
  const buf = await generateConventionCourtierPdf({
    nom: "Test",
    prenom: "Test",
    email: "test@test.fr",
    telephone: "0600000000",
    adresse: "1 rue test",
    codePostal: "75001",
    ville: "Paris",
    statut: "eirl",
    siret: "12345678901234",
    courtierId: 999,
    dateSignature: "09/04/2026",
    signatureNom: "Test Test",
  });
  console.log("PDF OK taille=" + buf.length);
} catch (e: any) {
  console.error("PDF ERREUR=" + e.message);
}
process.exit(0);

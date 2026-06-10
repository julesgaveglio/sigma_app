import { generateContratPdf } from "./contratGenerator.js";
import { generateConventionCourtierPdf } from "./conventionCourtierGenerator.js";
import { writeFileSync } from "fs";

async function main() {
  // Test 1 : Contrat agent
  console.log("=== Test contrat agent ===");
  try {
    const buf = await generateContratPdf({
      nom: "Dupont",
      prenom: "Jean",
      email: "jean.dupont@test.fr",
      telephone: "0612345678",
      ville: "Paris",
      codePostal: "75001",
      adresse: "12 rue de la Paix",
      statut: "agent_immobilier",
      signatureNom: "Jean Dupont",
      niveau: "1",
      ambassadeurId: 1,
      dateSignature: "03/04/2026",
    });
    writeFileSync("/tmp/test-contrat-agent.pdf", buf);
    console.log("OK contrat agent taille:", buf.length);
  } catch (e: any) {
    console.error("ERREUR contrat agent:", e.message);
  }

  // Test 2 : Convention courtier
  console.log("=== Test convention courtier ===");
  try {
    const buf = await generateConventionCourtierPdf({
      nom: "Martin",
      prenom: "Sophie",
      email: "sophie.martin@courtage.fr",
      telephone: "0698765432",
      ville: "Lyon",
      codePostal: "69001",
      adresse: "5 place Bellecour",
      statut: "courtier",
      numeroOrias: "12345678",
      cabinetNom: "SM Courtage",
      specialites: "credit_immobilier, credit_pro",
      signatureNom: "Sophie Martin",
      courtierId: 1,
      dateSignature: "03/04/2026",
    });
    writeFileSync("/tmp/test-convention-courtier.pdf", buf);
    console.log("OK convention courtier taille:", buf.length);
  } catch (e: any) {
    console.error("ERREUR convention courtier:", e.message);
  }
}

main();

import { generateBienPdf } from "./server/pdfBien";
import { storagePut } from "./server/storage";

async function main() {
  console.log("Génération du PDF v5...");
  const pdfBuffer = await generateBienPdf({
    reference: "SF-000001",
    typeBien: "villa",
    adresse: "107 D RUE DE LA MOISSON",
    ville: "AUREILHAN",
    codePostal: "65800",
    surface: 180,
    nbPieces: 5,
    prix: 475000,
    prixNetVendeur: 455000,
    honorairesAgence: 20000,
    description: "Villa comme neuve prête à aménager, proche de tous commerces et écoles dans un environnement agréable. Idéale pour résidence principale ou location haut standing.\n\nChauffage gainable pompe à chaleur. Piscine au sel avec mur filtrant. Grande terrasse au sud partiellement couverte. Terrasse au nord. Garage + grand local. Peut être vendue meublée.",
    dpeLettre: "A",
    gesLettre: "A",
    chargesAnnuelles: 1800,
    taxeFonciere: 1400,
    anneeConstruction: 2025,
    etatBien: "neuf",
    balconTerrasse: true,
    parkingGarage: true,
    calme: true,
    lumineux: true,
    photos: [
      "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/biens/1/photo/nzn2-5vtOBAt.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/biens/1/photo/djG-2Gs5SPLQ.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/biens/1/photo/i10bxF4iJowe.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/biens/1/photo/Thon7G1iq1X-.jpg",
    ],
    agentNom: "Jérôme Chibau",
    agentEmail: "jerome.chibau@iadfrance.fr",
    agentTelephone: "06 12 34 56 78",
  });

  console.log(`PDF généré : ${pdfBuffer.length} octets`);
  const key = `bien-previews/SF-000001-v5-${Date.now()}.pdf`;
  const { url } = await storagePut(key, pdfBuffer, "application/pdf");
  console.log("PDF uploadé :", url);
}

main().catch(console.error);

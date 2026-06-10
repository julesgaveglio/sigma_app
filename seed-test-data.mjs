import { createConnection } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);
console.log("✅ Connexion DB établie");

// ─── LEADS (État Civil) ────────────────────────────────────────────────────────
const leadsData = [
  {
    nom: "Martin", prenoms: "Sophie Claire", dateNaissance: "1985-03-15",
    lieuNaissance: "Lyon, Rhône", nationalite: "francais", situationFamiliale: "marie",
    adresse: "12 rue des Lilas, 75008 Paris",
    telephonePortable: "0612345678", email: "sophie.martin@email.fr",
    profession: "Architecte", statut: "nouveau",
  },
  {
    nom: "Dubois", prenoms: "Thomas Jean", dateNaissance: "1978-07-22",
    lieuNaissance: "Bordeaux, Gironde", nationalite: "francais", situationFamiliale: "celibataire",
    adresse: "45 avenue Victor Hugo, 33000 Bordeaux",
    telephonePortable: "0698765432", email: "thomas.dubois@gmail.com",
    profession: "Chef d'entreprise", statut: "en_cours",
  },
  {
    nom: "Lefebvre", prenoms: "Marie Hélène", dateNaissance: "1990-11-08",
    lieuNaissance: "Marseille, Bouches-du-Rhône", nationalite: "francais", situationFamiliale: "pacs",
    adresse: "8 boulevard Longchamp, 13001 Marseille",
    telephonePortable: "0645123789", email: "marie.lefebvre@outlook.fr",
    profession: "Médecin", statut: "traite",
  },
  {
    nom: "Benali", prenoms: "Karim Youssef", dateNaissance: "1982-05-30",
    lieuNaissance: "Casablanca, Maroc", nationalite: "etranger", situationFamiliale: "marie",
    adresse: "23 rue de la Paix, 69002 Lyon",
    telephonePortable: "0677889900", email: "karim.benali@yahoo.fr",
    profession: "Ingénieur", statut: "nouveau",
  },
  {
    nom: "Rousseau", prenoms: "Isabelle Anne", dateNaissance: "1975-09-14",
    lieuNaissance: "Nantes, Loire-Atlantique", nationalite: "francais", situationFamiliale: "divorce",
    adresse: "56 rue du Commerce, 44000 Nantes",
    telephonePortable: "0623456789", email: "isabelle.rousseau@sfr.fr",
    profession: "Directrice commerciale", statut: "en_cours",
  },
];

for (const lead of leadsData) {
  await conn.execute(
    `INSERT INTO leads (nom, prenoms, dateNaissance, lieuNaissance, nationalite, situationFamiliale, adresse, telephonePortable, email, profession, statut, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [lead.nom, lead.prenoms, lead.dateNaissance, lead.lieuNaissance, lead.nationalite,
     lead.situationFamiliale, lead.adresse, lead.telephonePortable, lead.email,
     lead.profession, lead.statut]
  );
}
console.log(`✅ ${leadsData.length} leads État Civil insérés`);

// ─── MANDATS DE RECHERCHE ──────────────────────────────────────────────────────
const mandatsData = [
  {
    nom: "Martin", prenoms: "Sophie Claire", email: "sophie.martin@email.fr", telephone: "0612345678",
    typeBien: "appartement", usage: "residence_principale",
    localisation: "Paris 8e, Paris 16e", surfaceMin: 80, surfaceMax: 120,
    nbPiecesMin: 3, nbPiecesMax: 4, etage: "haut", exposition: "sud",
    parkingGarage: true, cave: true, gardien: false, lumineux: true, calme: true,
    budgetMax: null, modeFinancement: null,
    typeMandat: "exclusif", statut: "nouveau", assigneA: null, notesInternes: null,
  },
  {
    nom: "Dubois", prenoms: "Thomas Jean", email: "thomas.dubois@gmail.com", telephone: "0698765432",
    typeBien: "maison", usage: "residence_principale",
    localisation: "Bordeaux, Mérignac, Pessac", surfaceMin: 150, surfaceMax: 250,
    nbPiecesMin: 4, nbPiecesMax: 6, etage: null, exposition: "sud-ouest",
    parkingGarage: true, cave: false, gardien: false, lumineux: true, calme: true,
    budgetMax: 650000, modeFinancement: "credit",
    typeMandat: "simple", statut: "en_cours", assigneA: "Hanna", notesInternes: "Enveloppe courtage en cours",
  },
  {
    nom: "Benali", prenoms: "Karim Youssef", email: "karim.benali@yahoo.fr", telephone: "0677889900",
    typeBien: "appartement", usage: "investissement_locatif",
    localisation: "Lyon 6e, Lyon 2e", surfaceMin: 60, surfaceMax: 90,
    nbPiecesMin: 2, nbPiecesMax: 3, etage: "milieu", exposition: "est",
    parkingGarage: false, cave: true, gardien: true, lumineux: false, calme: false,
    budgetMax: null, modeFinancement: null,
    typeMandat: "exclusif", statut: "nouveau", assigneA: null, notesInternes: null,
  },
  {
    nom: "Rousseau", prenoms: "Isabelle Anne", email: "isabelle.rousseau@sfr.fr", telephone: "0623456789",
    typeBien: "maison", usage: "residence_principale",
    localisation: "Nantes, Saint-Herblain", surfaceMin: 120, surfaceMax: 180,
    nbPiecesMin: 4, nbPiecesMax: 5, etage: null, exposition: "sud",
    parkingGarage: true, cave: true, gardien: false, lumineux: true, calme: true,
    budgetMax: 480000, modeFinancement: "credit",
    typeMandat: "simple", statut: "en_attente_retour", assigneA: "Hanna", notesInternes: "Attend validation enveloppe",
  },
];

for (const m of mandatsData) {
  await conn.execute(
    `INSERT INTO mandats_recherche (nom, prenoms, email, telephone, typeBien, \`usage\`, localisation, surfaceMin, surfaceMax, nbPiecesMin, nbPiecesMax, etage, exposition, parkingGarage, cave, gardien, lumineux, calme, budgetMax, modeFinancement, typeMandat, statut, assigneA, notesInternes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [m.nom, m.prenoms, m.email, m.telephone, m.typeBien, m.usage, m.localisation,
     m.surfaceMin, m.surfaceMax, m.nbPiecesMin, m.nbPiecesMax, m.etage, m.exposition,
     m.parkingGarage ? 1 : 0, m.cave ? 1 : 0, m.gardien ? 1 : 0,
     m.lumineux ? 1 : 0, m.calme ? 1 : 0,
     m.budgetMax, m.modeFinancement, m.typeMandat, m.statut, m.assigneA, m.notesInternes]
  );
}
console.log(`✅ ${mandatsData.length} mandats de recherche insérés`);

// ─── HEXA DOSSIERS ─────────────────────────────────────────────────────────────
const hexaData = [
  {
    civilite: "Mme", nom: "Martin", prenom: "Sophie", email: "sophie.martin@email.fr",
    mobile: "0612345678", fixe: null, adresse: "12 rue des Lilas", codePostal: "75008",
    ville: "Paris", villeNaissance: "Lyon", paysNaissance: "France", montant: 3500,
    statut: "nouveau", lienPaiement: null, paiementInitie: false, paiementRecu: false,
    assigneA: null, notesInternes: null,
  },
  {
    civilite: "M.", nom: "Dubois", prenom: "Thomas", email: "thomas.dubois@gmail.com",
    mobile: "0698765432", fixe: "0556781234", adresse: "45 avenue Victor Hugo", codePostal: "33000",
    ville: "Bordeaux", villeNaissance: "Bordeaux", paysNaissance: "France", montant: 5000,
    statut: "lien_envoye", lienPaiement: "https://hexacoop.fr/paiement/abc123", paiementInitie: true, paiementRecu: false,
    assigneA: "Hanna", notesInternes: "Lien envoyé le 28/03",
  },
  {
    civilite: "Mme", nom: "Lefebvre", prenom: "Marie", email: "marie.lefebvre@outlook.fr",
    mobile: "0645123789", fixe: null, adresse: "8 boulevard Longchamp", codePostal: "13001",
    ville: "Marseille", villeNaissance: "Marseille", paysNaissance: "France", montant: 7500,
    statut: "paiement_recu", lienPaiement: "https://hexacoop.fr/paiement/def456", paiementInitie: true, paiementRecu: true,
    assigneA: "Hanna", notesInternes: "Paiement confirmé le 30/03",
  },
  {
    civilite: "M.", nom: "Benali", prenom: "Karim", email: "karim.benali@yahoo.fr",
    mobile: "0677889900", fixe: null, adresse: "23 rue de la Paix", codePostal: "69002",
    ville: "Lyon", villeNaissance: "Casablanca", paysNaissance: "Maroc", montant: 2500,
    statut: "en_cours", lienPaiement: null, paiementInitie: false, paiementRecu: false,
    assigneA: "Hanna", notesInternes: "Dossier en cours de traitement",
  },
  {
    civilite: "Mme", nom: "Rousseau", prenom: "Isabelle", email: "isabelle.rousseau@sfr.fr",
    mobile: "0623456789", fixe: "0240123456", adresse: "56 rue du Commerce", codePostal: "44000",
    ville: "Nantes", villeNaissance: "Nantes", paysNaissance: "France", montant: 4000,
    statut: "lien_envoye", lienPaiement: "https://hexacoop.fr/paiement/ghi789", paiementInitie: true, paiementRecu: false,
    assigneA: "Hanna", notesInternes: "Relance à faire",
  },
];

for (const h of hexaData) {
  await conn.execute(
    `INSERT INTO hexa_dossiers (civilite, nom, prenom, email, mobile, fixe, adresse, codePostal, ville, villeNaissance, paysNaissance, montant, statut, lienPaiement, paiementInitie, paiementRecu, assigneA, notesInternes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [h.civilite, h.nom, h.prenom, h.email, h.mobile, h.fixe, h.adresse, h.codePostal,
     h.ville, h.villeNaissance, h.paysNaissance, h.montant, h.statut, h.lienPaiement,
     h.paiementInitie ? 1 : 0, h.paiementRecu ? 1 : 0, h.assigneA, h.notesInternes]
  );
}
console.log(`✅ ${hexaData.length} dossiers Sigma Crédit insérés`);

await conn.end();
console.log("\n🎉 Seed terminé !");
console.log("   → 5 leads État Civil (statuts variés)");
console.log("   → 4 mandats de recherche (2 avec budget, 2 sans)");
console.log("   → 5 dossiers Sigma Crédit (1 paiement reçu, 2 liens envoyés, 1 en cours, 1 nouveau)");

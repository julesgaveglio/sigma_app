import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const mandats = [
  {
    nom: 'Lefebvre', prenoms: 'Marie', email: 'marie.lefebvre@example.com', telephone: '0645678901',
    adresse: '12 rue du Moulin, 75015 Paris', dateNaissance: '15/03/1985', lieuNaissance: 'Bordeaux',
    nationalite: 'Française', situationFamiliale: 'Mariée',
    typeBien: 'appartement', usageBien: 'residence_principale',
    nbPiecesMin: 3, nbPiecesMax: 4, surfaceMin: 65, surfaceMax: 90,
    localisation: 'Paris 15e, Paris 14e, Issy-les-Moulineaux',
    etatBien: 'les_deux', travauxAcceptes: 'selon_prix',
    balconTerrasse: 1, parkingGarage: 1, cave: 1, ascenseur: 1, gardien: 0,
    calme: 1, lumineux: 1, procheTransports: 1, procheEcoles: 1, accessibilitePmr: 0, animaux: 0,
    budgetMax: 450000, modeFinancement: 'credit', apportPersonnel: 80000,
    accordBancaire: 'en_cours', banqueCourtier: 'Manon Dubost - Sigma Courtage',
    revenusNets: 5200, typeMandat: 'exclusif', dureeMandat: 3,
    statut: 'en_cours', notesInternes: 'Accord bancaire en attente. Visite prévue semaine prochaine.',
    assigneA: 'Elodie'
  },
  {
    nom: 'Moreau', prenoms: 'Thomas', email: 'thomas.moreau@example.com', telephone: '0656789012',
    adresse: '5 avenue Victor Hugo, 69006 Lyon', dateNaissance: '22/07/1979', lieuNaissance: 'Lyon',
    nationalite: 'Française', situationFamiliale: 'Célibataire',
    typeBien: 'maison', usageBien: 'investissement_locatif',
    nbPiecesMin: 4, nbPiecesMax: 6, surfaceMin: 100, surfaceMax: 150,
    localisation: 'Lyon 6e, Lyon 3e, Villeurbanne',
    etatBien: 'ancien', travauxAcceptes: 'oui',
    balconTerrasse: 0, parkingGarage: 1, cave: 1, ascenseur: 0, gardien: 0,
    calme: 1, lumineux: 0, procheTransports: 1, procheEcoles: 0, accessibilitePmr: 0, animaux: 1,
    budgetMax: 380000, modeFinancement: 'mixte', apportPersonnel: 120000,
    accordBancaire: 'oui', banqueCourtier: 'Crédit Agricole',
    revenusNets: 4800, typeMandat: 'simple', dureeMandat: 6,
    statut: 'nouveau', notesInternes: 'Investisseur expérimenté. Cherche rendement locatif > 5%.',
    assigneA: 'Elodie'
  },
  {
    nom: 'Petit', prenoms: 'Isabelle', email: 'isabelle.petit@example.com', telephone: '0667890123',
    adresse: '8 rue des Lilas, 33000 Bordeaux', dateNaissance: '10/11/1991', lieuNaissance: 'Toulouse',
    nationalite: 'Française', situationFamiliale: 'Pacsée',
    typeBien: 'appartement', usageBien: 'residence_principale',
    nbPiecesMin: 2, nbPiecesMax: 3, surfaceMin: 45, surfaceMax: 65,
    localisation: 'Bordeaux Centre, Bordeaux Chartrons, Mérignac',
    etatBien: 'neuf', travauxAcceptes: 'non',
    balconTerrasse: 1, parkingGarage: 0, cave: 0, ascenseur: 1, gardien: 0,
    calme: 1, lumineux: 1, procheTransports: 1, procheEcoles: 1, accessibilitePmr: 0, animaux: 0,
    budgetMax: 280000, modeFinancement: 'credit', apportPersonnel: 40000,
    accordBancaire: 'non', banqueCourtier: 'En attente courtier',
    revenusNets: 3200, typeMandat: 'exclusif', dureeMandat: 3,
    statut: 'en_attente_retour', notesInternes: 'Attend retour courtier pour accord bancaire. Très motivée.',
    assigneA: 'Elodie'
  }
];

// Vérifier le nom de la colonne usage
const [cols] = await conn.execute("SHOW COLUMNS FROM mandats_recherche LIKE 'usage%'");
const usageCol = cols.length > 0 ? cols[0].Field : 'usage';
console.log('Colonne usage:', usageCol);

for (const m of mandats) {
  const usageVal = m.usageBien;
  await conn.execute(
    `INSERT INTO mandats_recherche (nom, prenoms, email, telephone, adresse, dateNaissance, lieuNaissance, nationalite, situationFamiliale, typeBien, \`${usageCol}\`, nbPiecesMin, nbPiecesMax, surfaceMin, surfaceMax, localisation, etatBien, travauxAcceptes, balconTerrasse, parkingGarage, cave, ascenseur, gardien, calme, lumineux, procheTransports, procheEcoles, accessibilitePmr, animaux, budgetMax, modeFinancement, apportPersonnel, accordBancaire, banqueCourtier, revenusNets, typeMandat, dureeMandat, statut, notesInternes, assigneA)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [m.nom, m.prenoms, m.email, m.telephone, m.adresse, m.dateNaissance, m.lieuNaissance, m.nationalite, m.situationFamiliale, m.typeBien, usageVal, m.nbPiecesMin, m.nbPiecesMax, m.surfaceMin, m.surfaceMax, m.localisation, m.etatBien, m.travauxAcceptes, m.balconTerrasse, m.parkingGarage, m.cave, m.ascenseur, m.gardien, m.calme, m.lumineux, m.procheTransports, m.procheEcoles, m.accessibilitePmr, m.animaux, m.budgetMax, m.modeFinancement, m.apportPersonnel, m.accordBancaire, m.banqueCourtier, m.revenusNets, m.typeMandat, m.dureeMandat, m.statut, m.notesInternes, m.assigneA]
  );
  console.log(`Mandat créé: ${m.prenom || m.prenoms} ${m.nom}`);
}

console.log('3 mandats créés pour Élodie ✓');
await conn.end();

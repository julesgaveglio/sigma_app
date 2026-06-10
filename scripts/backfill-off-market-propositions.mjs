import mysql2 from 'mysql2/promise';

// Mapping manuel des activités vers les biens off-market
// Basé sur : type dans le titre de l'activité + prix dans contenu + region dans le titre
// Format titre activité : "Fiche Off Market envoyée : {TypeLabel} — {region}"
// Format contenu : "{prix} €"

async function run() {
  const conn = await mysql2.createConnection(process.env.DATABASE_URL);

  // 1. Récupérer toutes les activités off-market sans doublon dans bienPropositions
  const [activites] = await conn.execute(
    `SELECT la.id as actId, la.crmLeadId, la.titre, la.contenu, la.auteur, la.createdAt,
            cl.email as leadEmail, cl.prenom, cl.nom
     FROM lead_activities la
     LEFT JOIN crm_leads cl ON cl.id = la.crmLeadId
     WHERE la.type = 'email_envoye' AND la.titre LIKE '%Fiche Off Market%'
     ORDER BY la.createdAt ASC`
  );

  console.log(`\n${activites.length} activité(s) off-market trouvée(s)\n`);

  // 2. Récupérer tous les biens off-market
  const [biens] = await conn.execute(
    `SELECT id, titre, type_bien, region, prix_bien FROM off_market_biens`
  );

  // 3. Parser le prix depuis le contenu de l'activité (ex: "145 000 €" → 145000)
  function parsePrix(contenu) {
    if (!contenu) return null;
    return parseInt(contenu.replace(/[^\d]/g, ''), 10) || null;
  }

  // 4. Parser type+region depuis le titre de l'activité
  // "Fiche Off Market envoyée : Immeuble De Rapport — Grand Est" → { type: "Immeuble De Rapport", region: "Grand Est" }
  function parseTitreActivite(titre) {
    const match = titre.match(/Fiche Off Market envoy[ée]+ : (.+?) — (.+)$/);
    if (!match) return null;
    return { typeLabel: match[1].trim(), region: match[2].trim() };
  }

  // 5. Normaliser un type_bien (ex: "immeuble_de_rapport" → "Immeuble De Rapport")
  function normalizeType(typeBien) {
    if (!typeBien) return '';
    return typeBien.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  let inserted = 0;
  let skipped = 0;

  for (const act of activites) {
    const parsed = parseTitreActivite(act.titre);
    const prixActivite = parsePrix(act.contenu);

    if (!parsed) {
      console.log(`⚠️  Impossible de parser le titre: "${act.titre}"`);
      skipped++;
      continue;
    }

    // Chercher le bien correspondant par type + region + prix
    let bien = biens.find(b => {
      const typeNorm = normalizeType(b.type_bien);
      const regionMatch = b.region?.toLowerCase() === parsed.region.toLowerCase();
      const typeMatch = typeNorm.toLowerCase() === parsed.typeLabel.toLowerCase();
      const prixMatch = prixActivite && b.prix_bien === prixActivite;
      return regionMatch && typeMatch && prixMatch;
    });

    // Si pas de match exact par prix, essayer sans prix (prendre le plus récent)
    if (!bien) {
      bien = biens.find(b => {
        const typeNorm = normalizeType(b.type_bien);
        const regionMatch = b.region?.toLowerCase() === parsed.region.toLowerCase();
        const typeMatch = typeNorm.toLowerCase() === parsed.typeLabel.toLowerCase();
        return regionMatch && typeMatch;
      });
    }

    if (!bien) {
      console.log(`❌ Aucun bien trouvé pour: "${act.titre}" (prix: ${prixActivite})`);
      skipped++;
      continue;
    }

    // Vérifier si cet enregistrement existe déjà dans bienPropositions
    const [existing] = await conn.execute(
      `SELECT id FROM bien_propositions 
       WHERE offMarketBienId = ? AND crmLeadId = ? AND createdAt = ?`,
      [bien.id, act.crmLeadId, act.createdAt]
    );

    if (existing.length > 0) {
      console.log(`⏭️  Déjà présent: lead ${act.crmLeadId} → bien ${bien.id} (${act.createdAt})`);
      skipped++;
      continue;
    }

    // Insérer dans bienPropositions
    const titreSnapshot = `${normalizeType(bien.type_bien)}${parsed.region ? ` — ${parsed.region}` : ''} — ${act.contenu}`;
    await conn.execute(
      `INSERT INTO bien_propositions 
       (bienId, offMarketBienId, source, bienTitreSnapshot, crmLeadId, pdfUrl, envoyePar, emailDestinataire, statut_bp, createdAt)
       VALUES (NULL, ?, 'off_market', ?, ?, NULL, ?, ?, 'sent', ?)`,
      [bien.id, titreSnapshot, act.crmLeadId, act.auteur ?? 'Élodie', act.leadEmail ?? '', act.createdAt]
    );

    console.log(`✅ Inséré: lead ${act.crmLeadId} (${act.prenom} ${act.nom}) → bien ${bien.id} "${bien.titre}" le ${act.createdAt}`);
    inserted++;
  }

  console.log(`\n📊 Résultat: ${inserted} inséré(s), ${skipped} ignoré(s)`);
  await conn.end();
}

run().catch(e => {
  console.error('Erreur:', e.message);
  process.exit(1);
});

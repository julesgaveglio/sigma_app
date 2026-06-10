import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Activités email mandat loggées
const [activities] = await conn.execute(`
  SELECT la.titre, la.contenu, la.createdAt, cl.nom, cl.email
  FROM lead_activities la
  JOIN crm_leads cl ON la.crmLeadId = cl.id
  WHERE la.titre LIKE '%mandat%' OR la.titre LIKE '%Mandat%'
  ORDER BY la.createdAt DESC
  LIMIT 35
`);

console.log(`\n📧 Activités email mandat loggées : ${activities.length}`);
activities.forEach(a => {
  console.log(`  ✅ ${a.nom} (${a.email}) — ${a.titre} — ${new Date(a.createdAt).toLocaleString('fr-FR')}`);
});

// 2. Leads sans activité email mandat (potentiellement non reçus)
const [allLeads] = await conn.execute(`
  SELECT cl.id, cl.nom, cl.email
  FROM crm_leads cl
  WHERE cl.etape = 'recherche_bien'
    AND (cl.mandatSigne = 0 OR cl.mandatSigne IS NULL)
    AND cl.id NOT IN (
      SELECT DISTINCT crmLeadId FROM lead_activities
      WHERE titre LIKE '%mandat%' OR titre LIKE '%Mandat%'
    )
`);

if (allLeads.length > 0) {
  console.log(`\n⚠️  Leads sans log d'envoi email mandat (${allLeads.length}) :`);
  allLeads.forEach(l => console.log(`  - ${l.nom} (${l.email})`));
} else {
  console.log('\n✅ Tous les leads recherche_bien ont un log d\'envoi email mandat.');
}

await conn.end();

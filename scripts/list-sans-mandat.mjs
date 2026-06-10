import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
const [leads] = await conn.execute(
  `SELECT id, nom, prenom, email, telephone, mandatSigne, budgetMax, zoneRecherche 
   FROM crm_leads 
   WHERE etape = 'recherche_bien' AND (mandatSigne IS NULL OR mandatSigne = 0) 
   ORDER BY nom`
);
console.log('Total sans mandat:', leads.length);
for (const r of leads) {
  console.log(`${r.id} | ${r.nom} ${r.prenoms} | ${r.email} | budget:${r.budgetMax} | mandatSigne:${r.mandatSigne}`);
}
await conn.end();
process.exit(0);

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT id, nom, prenoms, email, telephone, etape, mandatSigne, budgetMax, zoneRecherche
  FROM crm_leads 
  WHERE etape = 'recherche_bien' AND (mandatSigne = 0 OR mandatSigne IS NULL)
  ORDER BY createdAt DESC
`);
console.log('Leads sans mandat signé (' + rows.length + ') :');
rows.forEach(r => console.log(JSON.stringify({
  id: r.id,
  nom: r.nom,
  prenoms: r.prenoms,
  email: r.email,
  budget: r.budgetMax,
  zone: r.zoneRecherche
})));
await conn.end();

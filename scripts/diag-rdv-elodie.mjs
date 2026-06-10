import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const conn = await createConnection(process.env.DATABASE_URL);

// 1. Julie FAALOUS et Yann DANET
const [rdvs] = await conn.execute(
  `SELECT id, titre, type_rdv, date_debut, assigne_a, statut, cree_par
   FROM calendar_tasks
   WHERE titre LIKE '%FAALOUS%' OR titre LIKE '%Faalous%' OR titre LIKE '%faalous%'
      OR titre LIKE '%DANET%' OR titre LIKE '%Danet%' OR titre LIKE '%danet%'
   ORDER BY date_debut DESC`
);
console.log('=== RDV Julie FAALOUS & Yann DANET ===');
rdvs.forEach(r => console.log(JSON.stringify(r)));

// 2. Tous les RDV Point Immobilier récents
const [immoRdvs] = await conn.execute(
  `SELECT id, titre, type_rdv, date_debut, assigne_a, statut
   FROM calendar_tasks
   WHERE type_rdv = 'point_immobilier'
   ORDER BY date_debut DESC
   LIMIT 30`
);
console.log('\n=== Tous les RDV Point Immobilier ===');
immoRdvs.forEach(r => console.log(JSON.stringify(r)));

// 3. Doublons : même date_debut pour point_immobilier
const [doublons] = await conn.execute(
  `SELECT date_debut, COUNT(*) as nb, GROUP_CONCAT(id) as ids, GROUP_CONCAT(titre SEPARATOR ' | ') as titres
   FROM calendar_tasks
   WHERE type_rdv = 'point_immobilier'
   GROUP BY date_debut
   HAVING COUNT(*) > 1`
);
console.log('\n=== DOUBLONS Point Immobilier ===');
doublons.forEach(r => console.log(JSON.stringify(r)));

// 4. RDV avec mauvais type (welcome_call ou point_personnalise pour des leads immo)
const [mauvaisType] = await conn.execute(
  `SELECT ct.id, ct.titre, ct.type_rdv, ct.date_debut, ct.assigne_a
   FROM calendar_tasks ct
   JOIN crm_leads cl ON ct.titre LIKE CONCAT('%', cl.nom, '%')
   WHERE cl.etape = 'recherche_bien' AND ct.type_rdv != 'point_immobilier'
   LIMIT 10`
);
console.log('\n=== RDV avec mauvais type pour leads Immo ===');
mauvaisType.forEach(r => console.log(JSON.stringify(r)));

await conn.end();

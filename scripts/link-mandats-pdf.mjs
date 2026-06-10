/**
 * Ajoute la colonne mandatSignePdfUrl à crm_leads,
 * lie les 5 PDFs uploadés aux fiches correspondantes,
 * et marque mandatSigne=true pour les 9 leads importés.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Ajouter la colonne si absente
const [cols] = await conn.execute('DESCRIBE crm_leads');
const existing = cols.map(c => c.Field);
if (!existing.includes('mandatSignePdfUrl')) {
  await conn.execute('ALTER TABLE crm_leads ADD COLUMN mandatSignePdfUrl VARCHAR(1024) NULL');
  console.log('✅ Colonne mandatSignePdfUrl ajoutée');
} else {
  console.log('ℹ️  Colonne mandatSignePdfUrl déjà présente');
}

// 2. Correspondance email → URL PDF
const pdfMap = [
  {
    email: 'angele.verdon@gmail.com',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/MOHAMEDNahirMarc&VERDONAngèleMarie_7a1cf114.pdf',
    nom: 'Verdon (Nahir & Angèle)',
  },
  {
    email: 'yveline.larichesse@gmail.com',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/YvelineLARICHESSE_38f79efb.pdf',
    nom: 'Larichesse Yveline',
  },
  {
    email: 'taleb_zizou@yahoo.fr',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/DjidaHADADCHAépouseTALEBetYazidTALEB_f8c9d06a.pdf',
    nom: 'Hadadcha & Taleb',
  },
  {
    email: 'karim.zeggai86@gmail.com',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/Abdel-KarimZEGGAIetBaharAKSUNGERZEGGAI_eff6ecb0.pdf',
    nom: 'Zeggai & Aksunger',
  },
  {
    email: 'benperros74@gmail.com',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/MonsieurBENOIT,SERGE,JEAN,MICHELPERROS_ed3288d1.pdf',
    nom: 'Perros Benoit',
  },
];

// 3. Lier les PDFs
for (const entry of pdfMap) {
  const [rows] = await conn.execute(
    'SELECT id FROM crm_leads WHERE email = ? LIMIT 1',
    [entry.email]
  );
  if (rows.length === 0) {
    console.warn(`⚠️  Lead introuvable pour ${entry.email}`);
    continue;
  }
  await conn.execute(
    'UPDATE crm_leads SET mandatSignePdfUrl = ?, mandatSigne = 1 WHERE email = ?',
    [entry.url, entry.email]
  );
  console.log(`📎 PDF lié : ${entry.nom} (${entry.email})`);
}

// 4. Marquer mandatSigne=true pour les 9 leads importés (tous ont signé)
const emails9 = [
  'chantaldisidi@hotmail.com',
  'taleb_zizou@yahoo.fr',
  'benperros74@gmail.com',
  'patou.d06g@gmail.com',
  'smousterji@yahoo.com',
  'karim.zeggai86@gmail.com',
  'yveline.larichesse@gmail.com',
  'angele.verdon@gmail.com',
  'b_fady@hotmail.fr',
];

const placeholders = emails9.map(() => '?').join(',');
const [result] = await conn.execute(
  `UPDATE crm_leads SET mandatSigne = 1 WHERE email IN (${placeholders})`,
  emails9
);
console.log(`\n✅ mandatSigne=true appliqué à ${result.affectedRows} leads`);

// 5. Vérification finale
const [check] = await conn.execute(
  `SELECT prenom, nom, email, mandatSigne, mandatSignePdfUrl IS NOT NULL as hasPdf 
   FROM crm_leads WHERE email IN (${placeholders}) ORDER BY nom`,
  emails9
);
console.log('\n─── Récapitulatif ───────────────────────────────────');
for (const row of check) {
  console.log(`  ${row.mandatSigne ? '✅' : '❌'} ${row.prenom} ${row.nom} | PDF: ${row.hasPdf ? '📎 oui' : '— non'}`);
}
console.log('─────────────────────────────────────────────────────');

await conn.end();

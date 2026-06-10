import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const pdfMap = [
  {
    email: 'b_fady@hotmail.fr',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/FadilaBENFRIDépouseGUILLEMARD-CHATetLaurantGUILLEMARD-CHAT_3c4dd8d9.pdf',
    nom: 'Fadila & Laurant Guillemard-Chat',
  },
  {
    email: 'smousterji@yahoo.com',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/SoufianeMOUSTERJI_5628933c.pdf',
    nom: 'Soufiane Mousterji',
  },
  {
    email: 'patou.d06g@gmail.com',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/DAVERManueletDAVERPatriciaNéeGoubert_968b8a4f.pdf',
    nom: 'Manuel & Patricia Daver',
  },
  {
    email: 'chantaldisidi@hotmail.com',
    url: 'https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/ChantalDISIDIMVWANDULUNGUMBUMUNGANGA_4a196454.pdf',
    nom: 'Chantal Disidi Mvwandulu',
  },
];

for (const entry of pdfMap) {
  await conn.execute(
    'UPDATE crm_leads SET mandatSignePdfUrl = ?, mandatSigne = 1 WHERE email = ?',
    [entry.url, entry.email]
  );
  console.log(`📎 PDF lié : ${entry.nom}`);
}

// Vérification finale — tous les 9 leads
const emails9 = [
  'chantaldisidi@hotmail.com', 'taleb_zizou@yahoo.fr', 'benperros74@gmail.com',
  'patou.d06g@gmail.com', 'smousterji@yahoo.com', 'karim.zeggai86@gmail.com',
  'yveline.larichesse@gmail.com', 'angele.verdon@gmail.com', 'b_fady@hotmail.fr',
];
const placeholders = emails9.map(() => '?').join(',');
const [rows] = await conn.execute(
  `SELECT prenom, nom, mandatSigne, mandatSignePdfUrl IS NOT NULL as hasPdf 
   FROM crm_leads WHERE email IN (${placeholders}) ORDER BY nom`,
  emails9
);

console.log('\n─── Récapitulatif final (9/9) ───────────────────────');
for (const r of rows) {
  console.log(`  ${r.mandatSigne ? '✅' : '❌'} ${r.prenom} ${r.nom} | PDF: ${r.hasPdf ? '📎 oui' : '❌ manquant'}`);
}
console.log('─────────────────────────────────────────────────────');

await conn.end();

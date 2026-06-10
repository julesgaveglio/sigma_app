/**
 * Import des 9 leads Mandats de Recherche dans crm_leads
 * Étape : recherche_bien (Élodie)
 * Envoi email Point Immobilier via API interne
 */
import mysql from 'mysql2/promise';
import { Resend } from 'resend';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const resend = new Resend(process.env.RESEND_API_KEY);

// Données extraites du fichier CRM_Mandats_Sigma_Factory.xlsx
const leads = [
  {
    prenom: "Chantal",
    nom: "Disidi Mvwandulu Ngumbu Munganga",
    email: "chantaldisidi@hotmail.com",
    telephone: "06.62.26.69.55",
    numeroMandat: "202603130015",
    projetType: "Rés. principale",
    budgetMax: 100000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "1h30 autour de Creil — Oise, Aisne, Val-d'Oise, Somme sud",
    villeResidence: "Creil",
    departement: "60",
    codePostal: "60100",
    dateSignatureMandat: "23/03/2026",
  },
  {
    prenom: "Djida & Yazid",
    nom: "Hadadcha ép. Taleb & Taleb",
    email: "taleb_zizou@yahoo.fr",
    telephone: "07.68.49.36.53",
    numeroMandat: "02603130020",
    projetType: "RP + IL",
    budgetMax: 115000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "RP : 1h30 autour de Brest — Finistère, Côtes-d'Armor ouest · IL : France entière",
    villeResidence: "Brest",
    departement: "29",
    codePostal: "29200",
    dateSignatureMandat: "23/02/2026",
  },
  {
    prenom: "Benoit Serge Jean Michel",
    nom: "Perros",
    email: "benperros74@gmail.com",
    telephone: "07.86.10.71.22",
    numeroMandat: "202602230003",
    projetType: "Invest. locatif",
    budgetMax: 250000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "France entière",
    villeResidence: "Rumilly",
    departement: "74",
    codePostal: "74150",
    dateSignatureMandat: null,
  },
  {
    prenom: "Manuel & Patricia",
    nom: "Daver née Goubert",
    email: "patou.d06g@gmail.com",
    telephone: "06.13.96.61.23",
    numeroMandat: "202603230027",
    projetType: "Invest. locatif",
    budgetMax: 140000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "France entière",
    villeResidence: "Contes",
    departement: "06",
    codePostal: "06390",
    dateSignatureMandat: "23/02/2026",
  },
  {
    prenom: "Soufiane",
    nom: "Mousterji",
    email: "smousterji@yahoo.com",
    telephone: "06.98.95.49.46",
    numeroMandat: "202603130021",
    projetType: "Rés. principale",
    budgetMax: 170000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "1h30 autour de Saint-Cloud — Paris, Hauts-de-Seine, Yvelines, Essonne, Val-de-Marne",
    villeResidence: "Saint-Cloud",
    departement: "92",
    codePostal: "92210",
    dateSignatureMandat: "23/03/2026",
  },
  {
    prenom: "Abdel-Karim & Bahar",
    nom: "Aksunger Zeggai",
    email: "karim.zeggai86@gmail.com",
    telephone: "06.13.87.05.11",
    numeroMandat: "202602230002",
    projetType: "Invest. locatif",
    budgetMax: 350000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "France entière",
    villeResidence: "Montataire",
    departement: "60",
    codePostal: "60160",
    dateSignatureMandat: null,
  },
  {
    prenom: "Yveline",
    nom: "Larichesse",
    email: "yveline.larichesse@gmail.com",
    telephone: "06.41.16.60.61",
    numeroMandat: "202603110008",
    projetType: "Rés. principale",
    budgetMax: 125000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "1h30 autour de Palaiseau — Essonne, Paris, Hauts-de-Seine, Val-de-Marne, Yvelines",
    villeResidence: "Palaiseau",
    departement: "91",
    codePostal: "91120",
    dateSignatureMandat: "23/03/2026",
  },
  {
    prenom: "Nahir Marc Mohamed & Angèle Marie",
    nom: "Verdon",
    email: "angele.verdon@gmail.com",
    telephone: "06.79.73.68.22",
    numeroMandat: "202603130029",
    projetType: "Invest. locatif",
    budgetMax: 250000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "France entière",
    villeResidence: "Saint-Pierre-du-Chemin",
    departement: "85",
    codePostal: "85120",
    dateSignatureMandat: "23/03/2026",
  },
  {
    prenom: "Fadila & Laurant",
    nom: "Benfrid ép. Guillemard-Chat",
    email: "b_fady@hotmail.fr",
    telephone: "06.60.84.23.57",
    numeroMandat: "02603130019",
    projetType: "Invest. locatif",
    budgetMax: 130000,
    typeBien: "Maison / Immeuble · Neuf, Ancien, À rénover",
    zoneRecherche: "France entière",
    villeResidence: "Le Blanc-Mesnil",
    departement: "93",
    codePostal: "93150",
    dateSignatureMandat: "23/03/2026",
  },
];

const RDV_URL = "https://www.sigmafactory.org/rdv/point-immobilier";

let inserted = 0;
let skipped = 0;
let emailsSent = 0;
let emailsFailed = 0;

for (const lead of leads) {
  // Vérifier si le lead existe déjà (par email)
  const [existing] = await conn.execute(
    'SELECT id FROM crm_leads WHERE email = ? LIMIT 1',
    [lead.email]
  );
  
  if (existing.length > 0) {
    console.log(`⏭️  Déjà présent (${lead.email}) — mise à jour des données mandat`);
    await conn.execute(
      `UPDATE crm_leads SET 
        numeroMandat = ?, projetType = ?, budgetMax = ?, typeBien = ?,
        zoneRecherche = ?, villeResidence = ?, departement = ?, codePostal = ?,
        dateSignatureMandat = ?, etape = 'recherche_bien', responsable = 'Elodie'
       WHERE email = ?`,
      [lead.numeroMandat, lead.projetType, lead.budgetMax, lead.typeBien,
       lead.zoneRecherche, lead.villeResidence, lead.departement, lead.codePostal,
       lead.dateSignatureMandat, lead.email]
    );
    skipped++;
    continue;
  }

  // Insérer le nouveau lead
  await conn.execute(
    `INSERT INTO crm_leads 
      (nom, prenom, email, telephone, etape, responsable, statut,
       numeroMandat, projetType, budgetMax, typeBien, zoneRecherche,
       villeResidence, departement, codePostal, dateSignatureMandat,
       welcomeCallFait, etatCivilRempli, mandatRempli, tableauCourtageRempli,
       accesPodia, documentsDeposes, avisDepose, discoursClair, avisRetourExp,
       enveloppeOk, mandatSigne, nbBiensPresentes, offreAcceptee,
       avisStatut, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'recherche_bien', 'Elodie', 'actif',
             ?, ?, ?, ?, ?,
             ?, ?, ?, ?,
             1, 1, 1, 1,
             1, 1, 1, 1, 1,
             1, 1, 0, 0,
             'en_attente', NOW(), NOW())`,
    [lead.nom, lead.prenom, lead.email, lead.telephone,
     lead.numeroMandat, lead.projetType, lead.budgetMax, lead.typeBien, lead.zoneRecherche,
     lead.villeResidence, lead.departement, lead.codePostal, lead.dateSignatureMandat]
  );
  inserted++;
  console.log(`✅ Inséré : ${lead.prenom} ${lead.nom} (${lead.email})`);

  // Envoyer l'email Point Immobilier
  const nomComplet = `${lead.prenom} ${lead.nom}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div><div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pole Immobilier</div></div><div style="padding:36px"><h2 style="margin:0 0 6px;color:#fff">Félicitations, votre financement est validé !</h2><p style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Prochaine étape — Recherche de bien</p><p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 20px">Bonjour ${nomComplet},<br><br>Votre enveloppe de financement a été validée. Vous passez maintenant à l'étape <strong style="color:#fff">Recherche de Bien</strong> avec <strong style="color:#C9A84C">Élodie</strong>, votre conseillère immobilière dédiée chez Sigma Factory.<br><br>Élodie va vous accompagner dans la recherche du bien idéal correspondant à votre projet${lead.projetType ? ` (${lead.projetType})` : ''} et à votre budget${lead.budgetMax ? ` de ${lead.budgetMax.toLocaleString('fr-FR')} €` : ''}.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:18px 22px;margin:20px 0"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Votre prochaine étape</div><div style="color:#fff;font-size:15px;font-weight:bold">Point Immobilier avec Élodie</div><div style="color:#aaa;font-size:13px;margin-top:6px">Premier échange pour lancer votre recherche de bien — 45 min</div></div><div style="text-align:center;margin:28px 0"><a href="${RDV_URL}" style="background:#C9A84C;color:#000;text-decoration:none;padding:14px 32px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">PRENDRE MON RENDEZ-VOUS</a></div><p style="color:#555;font-size:12px;line-height:1.6">En cas de question : <a href="mailto:elodie@sigmafactory.fr" style="color:#C9A84C">elodie@sigmafactory.fr</a></p></div><div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center">Sigma Factory — Pôle Immobilier</div></div></body></html>`;

  const { error } = await resend.emails.send({
    from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
    to: lead.email,
    subject: `Votre financement est validé — Prenez votre Point Immobilier avec Élodie`,
    html,
  });

  if (error) {
    console.error(`  ❌ Email échoué pour ${lead.email}:`, error.message);
    emailsFailed++;
  } else {
    console.log(`  📧 Email envoyé à ${lead.email}`);
    emailsSent++;
  }

  // Petite pause pour ne pas surcharger l'API Resend
  await new Promise(r => setTimeout(r, 500));
}

await conn.end();

console.log('\n─────────────────────────────────────');
console.log(`✅ Leads insérés     : ${inserted}`);
console.log(`⏭️  Déjà présents    : ${skipped}`);
console.log(`📧 Emails envoyés   : ${emailsSent}`);
console.log(`❌ Emails échoués   : ${emailsFailed}`);
console.log('─────────────────────────────────────');

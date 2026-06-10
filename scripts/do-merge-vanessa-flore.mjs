import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== FUSION Vanessa Flore ===\n");

// ── Stratégie ──────────────────────────────────────────────────────────────────
// GARDER  : lead 960001 (état civil), mandat 270001, crm_lead 210002
// ENRICHIR: mandat 270001 avec les données manquantes du mandat 210001
// ENRICHIR: état civil 960001 avec les données manquantes du 870001
// SUPPRIMER: mandat 210001, lead 870001 (état civil doublon)
// Le crm_lead 210002 reste intact (leadId=960001, mandatId=270001)

// ── 1. Enrichir le mandat 270001 avec les données du 210001 ───────────────────
// 210001 a : localisation plus précise (les deux sont bonnes, on fusionne)
// 210001 a : autresCriteres différents → on fusionne les deux textes
// 270001 a : autresCriteres plus détaillés → on les garde en priorité

const [[m1]] = await conn.query("SELECT * FROM mandats_recherche WHERE id = 210001");
const [[m2]] = await conn.query("SELECT * FROM mandats_recherche WHERE id = 270001");

// Fusionner localisation : combiner les deux si différents
const loc1 = (m1.localisation || "").trim();
const loc2 = (m2.localisation || "").trim();
let locFusionnee = loc2; // 270001 est la base
if (loc1 && !loc2.toLowerCase().includes(loc1.toLowerCase().slice(0, 20))) {
  locFusionnee = loc2 + "\n\nComplément : " + loc1;
}

// Fusionner autresCriteres
const ac1 = (m1.autresCriteres || "").trim();
const ac2 = (m2.autresCriteres || "").trim();
let acFusionne = ac2; // 270001 est plus détaillé
if (ac1 && !ac2.toLowerCase().includes(ac1.toLowerCase().slice(0, 30))) {
  acFusionne = ac2 + "\n\nComplément (saisie initiale) : " + ac1;
}

await conn.query(
  `UPDATE mandats_recherche SET localisation = ?, autresCriteres = ?, updatedAt = NOW() WHERE id = 270001`,
  [locFusionnee, acFusionne]
);
console.log("✅ Mandat 270001 enrichi avec les données du 210001");

// ── 2. Enrichir l'état civil 960001 avec les données du 870001 ────────────────
// 870001 a : conjointTelephoneTravail = +41768435309
// 960001 a : conjointTelephoneDomicile = +41768435309 (même numéro, champ différent)
// 870001 a : nationalite = francais (les deux ont la même)
// Différence : 870001 a telephoneTravail = 0238363997 → déjà dans 960001
// Pas de données manquantes critiques, mais on s'assure que 960001 a tout

const [[ec1]] = await conn.query("SELECT * FROM leads WHERE id = 870001");
const [[ec2]] = await conn.query("SELECT * FROM leads WHERE id = 960001");

// Champs à compléter dans 960001 si vides
const updates = {};
const fieldsToCheck = [
  'nomJeuneFille', 'profession', 'telephoneDomicile', 'telephoneTravail', 'telephonePortable',
  'conjointNom', 'conjointNomJeuneFille', 'conjointPrenoms', 'conjointProfession',
  'conjointDateNaissance', 'conjointLieuNaissance', 'conjointAdresse',
  'conjointTelephoneDomicile', 'conjointTelephoneTravail', 'conjointTelephonePortable',
  'conjointEmail', 'communeMariage', 'dateMariage', 'contratMariage', 'regimeMatrimonial',
  'situationFamiliale', 'nationalite', 'notes'
];

for (const f of fieldsToCheck) {
  const v2 = ec2[f];
  const v1 = ec1[f];
  if ((v2 === null || v2 === undefined || v2 === '') && (v1 !== null && v1 !== undefined && v1 !== '')) {
    updates[f] = v1;
    console.log(`  → Récupération depuis 870001 : ${f} = ${v1}`);
  }
}

// Cas spécial : conjointTelephoneTravail dans 870001 = +41768435309
// Dans 960001 c'est dans conjointTelephoneDomicile → vérifier si conjointTelephoneTravail est vide
if (!ec2.conjointTelephoneTravail && ec1.conjointTelephoneTravail) {
  updates.conjointTelephoneTravail = ec1.conjointTelephoneTravail;
  console.log(`  → Récupération conjointTelephoneTravail = ${ec1.conjointTelephoneTravail}`);
}

if (Object.keys(updates).length > 0) {
  const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
  const values = [...Object.values(updates), 960001];
  await conn.query(`UPDATE leads SET ${setClauses}, updatedAt = NOW() WHERE id = ?`, values);
  console.log(`✅ État civil 960001 enrichi (${Object.keys(updates).length} champs)`);
} else {
  console.log("✅ État civil 960001 déjà complet, rien à enrichir");
}

// ── 3. Supprimer le mandat doublon 210001 ─────────────────────────────────────
await conn.query("DELETE FROM mandats_recherche WHERE id = 210001");
console.log("✅ Mandat doublon 210001 supprimé");

// ── 4. Supprimer l'état civil doublon 870001 ──────────────────────────────────
await conn.query("DELETE FROM leads WHERE id = 870001");
console.log("✅ État civil doublon 870001 supprimé");

// ── 5. Vérification finale ────────────────────────────────────────────────────
const [[mFinal]] = await conn.query("SELECT id, nom, prenoms, email, localisation, autresCriteres FROM mandats_recherche WHERE id = 270001");
const [[ecFinal]] = await conn.query("SELECT id, nom, prenoms, email, profession, conjointNom, conjointPrenoms, conjointTelephoneTravail, conjointTelephoneDomicile FROM leads WHERE id = 960001");
const [[crmFinal]] = await conn.query("SELECT id, nom, prenom, email, etape, mandatId, leadId FROM crm_leads WHERE id = 210002");

console.log("\n=== RÉSULTAT FINAL ===");
console.log("Mandat 270001:", JSON.stringify(mFinal, null, 2));
console.log("État civil 960001:", JSON.stringify(ecFinal, null, 2));
console.log("CRM Lead 210002:", JSON.stringify(crmFinal, null, 2));

await conn.end();
console.log("\n🎉 Fusion terminée avec succès !");

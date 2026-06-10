import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── 1. Récupérer les deux mandats ──────────────────────────────────────────────
const [[m1]] = await conn.query("SELECT * FROM mandats_recherche WHERE id = 210001");
const [[m2]] = await conn.query("SELECT * FROM mandats_recherche WHERE id = 270001");

console.log("\n=== MANDAT 210001 (lead 870001) ===");
for (const [k, v] of Object.entries(m1)) {
  if (v !== null && v !== undefined && v !== '' && v !== 0) console.log(`  ${k}: ${v}`);
}

console.log("\n=== MANDAT 270001 (lead 960001) ===");
for (const [k, v] of Object.entries(m2)) {
  if (v !== null && v !== undefined && v !== '' && v !== 0) console.log(`  ${k}: ${v}`);
}

// ── 2. Récupérer les deux leads CRM ───────────────────────────────────────────
const [[crm1]] = await conn.query("SELECT * FROM crm_leads WHERE leadId = 870001");
const [[crm2]] = await conn.query("SELECT * FROM crm_leads WHERE leadId = 960001 OR id = 210002");

console.log("\n=== CRM LEAD (leadId 870001) ===");
if (crm1) {
  for (const [k, v] of Object.entries(crm1)) {
    if (v !== null && v !== undefined && v !== '' && v !== 0) console.log(`  ${k}: ${v}`);
  }
} else console.log("  (non trouvé)");

console.log("\n=== CRM LEAD (leadId 960001 / id 210002) ===");
if (crm2) {
  for (const [k, v] of Object.entries(crm2)) {
    if (v !== null && v !== undefined && v !== '' && v !== 0) console.log(`  ${k}: ${v}`);
  }
} else console.log("  (non trouvé)");

// ── 3. Récupérer les leads état civil ─────────────────────────────────────────
const [[ec1]] = await conn.query("SELECT * FROM leads WHERE id = 870001").catch(() => [[null]]);
const [[ec2]] = await conn.query("SELECT * FROM leads WHERE id = 960001").catch(() => [[null]]);

console.log("\n=== ÉTAT CIVIL lead 870001 ===");
if (ec1) {
  for (const [k, v] of Object.entries(ec1)) {
    if (v !== null && v !== undefined && v !== '') console.log(`  ${k}: ${v}`);
  }
} else console.log("  (non trouvé)");

console.log("\n=== ÉTAT CIVIL lead 960001 ===");
if (ec2) {
  for (const [k, v] of Object.entries(ec2)) {
    if (v !== null && v !== undefined && v !== '') console.log(`  ${k}: ${v}`);
  }
} else console.log("  (non trouvé)");

// ── 4. Chercher les activités liées ───────────────────────────────────────────
const [acts1] = await conn.query("SELECT id, type, titre, createdAt FROM lead_activities WHERE crmLeadId IN (SELECT id FROM crm_leads WHERE leadId = 870001) ORDER BY createdAt").catch(() => [[]]);
const [acts2] = await conn.query("SELECT id, type, titre, createdAt FROM lead_activities WHERE crmLeadId = 210002 ORDER BY createdAt").catch(() => [[]]);

console.log(`\n=== ACTIVITÉS lead 870001 : ${acts1.length} ===`);
acts1.forEach(a => console.log(`  [${a.id}] ${a.type} — ${a.titre} (${a.createdAt})`));

console.log(`\n=== ACTIVITÉS lead 210002 (960001) : ${acts2.length} ===`);
acts2.forEach(a => console.log(`  [${a.id}] ${a.type} — ${a.titre} (${a.createdAt})`));

await conn.end();
console.log("\n✅ Diagnostic terminé.");

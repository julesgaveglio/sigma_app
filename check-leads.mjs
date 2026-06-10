import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Colonnes de la table leads
const [cols] = await conn.execute("DESCRIBE leads");
console.log("\n=== COLONNES TABLE LEADS ===");
console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));

// Derniers leads
const [leads] = await conn.execute("SELECT * FROM leads ORDER BY id DESC LIMIT 5");
console.log("\n=== DERNIERS LEADS ===");
console.table(leads.map(r => ({ id: r.id, nom: r.nom, prenoms: r.prenoms, email: r.email })));

// Derniers leads CRM
const [crmLeads] = await conn.execute("SELECT * FROM crm_leads ORDER BY id DESC LIMIT 5");
console.log("\n=== DERNIERS LEADS CRM ===");
console.table(crmLeads.map(r => ({ id: r.id, nom: r.nom, prenom: r.prenom, email: r.email, etape: r.etape, lead_id: r.lead_id })));

// Derniers mandats
const [mandats] = await conn.execute("SELECT * FROM mandats_recherche ORDER BY id DESC LIMIT 5");
console.log("\n=== DERNIERS MANDATS ===");
console.table(mandats.map(r => ({ id: r.id, lead_id: r.lead_id, email_lead: r.email_lead })));

// Derniers dossiers financement
const [dossiers] = await conn.execute("SELECT * FROM dossiers_financement ORDER BY id DESC LIMIT 5");
console.log("\n=== DERNIERS DOSSIERS FINANCEMENT ===");
console.table(dossiers.map(r => ({ id: r.id, lead_id: r.lead_id, email_emprunteur1: r.email_emprunteur1 })));

await conn.end();

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Chercher dans users
const users = await db.execute(sql`SELECT id, name, email, role FROM users WHERE name LIKE '%MAILLET%' OR name LIKE '%Nicolas%' OR email LIKE '%maillet%' LIMIT 10`);
console.log("USERS:", JSON.stringify(users[0], null, 2));

// Chercher dans demandes_custom_care
const demandes = await db.execute(sql`SELECT id, prenom, nom, email, statut, created_at FROM demandes_custom_care WHERE nom LIKE '%MAILLET%' OR prenom LIKE '%Nicolas%' OR email LIKE '%maillet%' LIMIT 10`);
console.log("DEMANDES CUSTOM CARE:", JSON.stringify(demandes[0], null, 2));

// Chercher dans crm_leads
const crmLeads = await db.execute(sql`SELECT id, prenom, nom, email FROM crm_leads WHERE nom LIKE '%MAILLET%' OR prenom LIKE '%Nicolas%' OR email LIKE '%maillet%' LIMIT 10`);
console.log("CRM LEADS:", JSON.stringify(crmLeads[0], null, 2));

// Chercher dans leads (état civil)
const leads = await db.execute(sql`SELECT id, prenom, nom, email FROM leads WHERE nom LIKE '%MAILLET%' OR prenom LIKE '%Nicolas%' OR email LIKE '%maillet%' LIMIT 10`);
console.log("LEADS ETAT CIVIL:", JSON.stringify(leads[0], null, 2));

await conn.end();

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL!);

// Mettre à jour etatCivilRempli=1 et leadId=930001 pour Vanessa Obi (CRM id 210002)
const [result] = await db.execute(
  "UPDATE crm_leads SET etat_civil_rempli = 1, lead_id = 930001 WHERE id = 210002"
) as any;
console.log("Mise à jour CRM Vanessa:", result.affectedRows, "ligne(s) modifiée(s)");

// Vérifier
const [rows] = await db.execute(
  "SELECT id, nom, prenom, email, etat_civil_rempli, lead_id FROM crm_leads WHERE id = 210002"
) as any;
console.log("État après correction:", JSON.stringify(rows[0], null, 2));

await db.end();

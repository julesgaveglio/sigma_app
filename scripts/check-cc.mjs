import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Dernières demandes custom care
const demandes = await db.execute(sql`SELECT id, prenom, nom, email, statut, created_at FROM demandes_custom_care ORDER BY created_at DESC LIMIT 15`);
console.log("DERNIÈRES DEMANDES CC:", JSON.stringify(demandes[0], null, 2));

// Tous les users avec leur rôle
const users = await db.execute(sql`SELECT id, name, email, role FROM users ORDER BY created_at DESC LIMIT 20`);
console.log("USERS RÉCENTS:", JSON.stringify(users[0], null, 2));

await conn.end();

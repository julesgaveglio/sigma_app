import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const admins = [
  { email: "othmanehiyadi@sigmaipf.fr", name: "Othman Hiyadi" },
  { email: "assistance.direction@sigmaipf.fr", name: "Hanna" },
  { email: "maria@sigmaipf.fr", name: "Maria (Pôle entrée en relation)" },
  { email: "manondubost@sigmaipf.fr", name: "Manon Dubost (Pôle courtage)" },
  { email: "sigmaipf@gmail.com", name: "Direction Sigma" },
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  for (const admin of admins) {
    // Upsert : si l'utilisateur existe déjà (via OAuth), on met à jour son rôle
    // Sinon on crée une entrée pré-enregistrée avec un openId basé sur l'email
    const openId = `pre_${admin.email.replace(/[^a-z0-9]/gi, "_")}`;
    
    await connection.execute(
      `INSERT INTO users (openId, name, email, role, loginMethod, lastSignedIn, createdAt, updatedAt)
       VALUES (?, ?, ?, 'admin', 'email', NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE role = 'admin', name = ?, email = ?`,
      [openId, admin.name, admin.email, admin.name, admin.email]
    );
    console.log(`✅ Admin configuré : ${admin.name} (${admin.email})`);
  }

  // Mettre à jour aussi par email si l'utilisateur s'est déjà connecté via OAuth
  for (const admin of admins) {
    await connection.execute(
      `UPDATE users SET role = 'admin' WHERE email = ?`,
      [admin.email]
    );
  }

  console.log("\n✅ Tous les accès admin ont été configurés.");
  await connection.end();
}

main().catch(console.error);

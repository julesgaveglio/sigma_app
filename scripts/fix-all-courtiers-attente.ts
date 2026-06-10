import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL!;

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: u.username,
    password: u.password,
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

async function main() {
  const conn = await createConnection(parseDbUrl(DB_URL));

  // 1. Trouver tous les courtiers en attente
  const [courtiers] = await conn.execute(
    `SELECT id, prenom, nom, email, statutInterne FROM courtiers WHERE statutInterne = 'en_attente'`
  ) as any[];

  console.log(`\n=== Courtiers en attente : ${courtiers.length} ===`);
  courtiers.forEach((c: any) => console.log(`  - ${c.prenom} ${c.nom} (${c.email})`));

  if (courtiers.length === 0) {
    console.log("Aucun courtier en attente. Tout est OK !");
    await conn.end();
    return;
  }

  const now = Date.now();

  for (const c of courtiers) {
    // 2. Activer le courtier
    await conn.execute(
      `UPDATE courtiers SET statutInterne = 'actif', updatedAt = ? WHERE id = ?`,
      [now, c.id]
    );

    // 3. Vérifier si l'email est dans allowedEmails
    const [existing] = await conn.execute(
      `SELECT id FROM allowed_emails WHERE email = ?`,
      [c.email]
    ) as any[];

    if (existing.length === 0) {
      await conn.execute(
        `INSERT INTO allowed_emails (email, role, createdAt) VALUES (?, 'courtier', ?)`,
        [c.email, now]
      );
      console.log(`  ✓ ${c.prenom} ${c.nom} → activé + accès portail créé`);
    } else {
      console.log(`  ✓ ${c.prenom} ${c.nom} → activé (accès portail déjà présent)`);
    }
  }

  console.log(`\n✅ ${courtiers.length} courtier(s) activé(s) avec succès.`);
  console.log("⚠️  Pensez à leur envoyer l'email de bienvenue depuis leur fiche dans le dashboard.");

  await conn.end();
}

main().catch(console.error);

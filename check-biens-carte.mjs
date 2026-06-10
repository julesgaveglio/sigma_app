import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(
  "SELECT id, titre, ville, latitude, longitude, statut_bien FROM biens"
);
console.log("Biens en base :", JSON.stringify(rows, null, 2));

await conn.end();

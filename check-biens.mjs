import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [biens] = await conn.execute(
  "SELECT id, titre, ville, latitude, longitude, statut_bien FROM biens LIMIT 20"
);
console.log("Total biens récupérés:", biens.length);
console.log("Biens avec coords:", biens.filter(b => b.latitude && b.longitude).length);
const statuts = [...new Set(biens.map(b => b.statut_bien))];
console.log("Statuts présents:", statuts);
biens.forEach(b => console.log(b));

await conn.end();

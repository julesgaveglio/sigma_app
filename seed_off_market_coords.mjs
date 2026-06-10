import { createConnection } from "mysql2/promise";

// Coordonnées GPS approximatives des centres de régions françaises
const REGION_COORDS = {
  "Grand Est": { lat: 48.5734, lng: 7.7521 },
  "Hauts-de-France": { lat: 50.4801, lng: 2.7937 },
  "Île-de-France": { lat: 48.8566, lng: 2.3522 },
  "Normandie": { lat: 49.1829, lng: 0.3707 },
  "Bretagne": { lat: 48.2020, lng: -2.9326 },
  "Pays de la Loire": { lat: 47.7632, lng: -0.3299 },
  "Centre-Val de Loire": { lat: 47.7516, lng: 1.6751 },
  "Bourgogne-Franche-Comté": { lat: 47.2805, lng: 4.9994 },
  "Auvergne-Rhône-Alpes": { lat: 45.7597, lng: 4.8422 },
  "Provence-Alpes-Côte d'Azur": { lat: 43.9352, lng: 6.0679 },
  "PACA": { lat: 43.9352, lng: 6.0679 },
  "Occitanie": { lat: 43.6047, lng: 1.4442 },
  "Nouvelle-Aquitaine": { lat: 44.8378, lng: -0.5792 },
  "Corse": { lat: 42.0396, lng: 9.0129 },
};

const conn = await createConnection(process.env.DATABASE_URL);

// Récupérer tous les biens sans coordonnées
const [biens] = await conn.execute(
  "SELECT id, titre, region FROM off_market_biens WHERE latitude IS NULL OR longitude IS NULL"
);

console.log(`${biens.length} biens à géolocaliser...`);

let updated = 0;
for (const bien of biens) {
  const region = bien.region;
  if (!region) continue;

  // Chercher les coordonnées de la région
  let coords = null;
  for (const [key, val] of Object.entries(REGION_COORDS)) {
    if (region.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(region.toLowerCase())) {
      coords = val;
      break;
    }
  }

  if (!coords) {
    console.log(`⚠️ Région non trouvée: "${region}" pour bien #${bien.id}`);
    continue;
  }

  // Ajouter un léger décalage aléatoire pour éviter la superposition exacte
  const jitter = 0.3;
  const lat = (coords.lat + (Math.random() - 0.5) * jitter).toFixed(6);
  const lng = (coords.lng + (Math.random() - 0.5) * jitter).toFixed(6);

  await conn.execute(
    "UPDATE off_market_biens SET latitude = ?, longitude = ? WHERE id = ?",
    [lat, lng, bien.id]
  );
  console.log(`✅ Bien #${bien.id} (${region}): ${lat}, ${lng}`);
  updated++;
}

console.log(`\n✅ ${updated} biens géolocalisés sur ${biens.length}`);
await conn.end();

/**
 * Seed : Sigma Factory comme parrain racine du réseau
 * - Crée l'entrée Sigma dans la table ambassadeurs (si elle n'existe pas)
 * - Génère les codes parrain pour tous les membres sans code
 */
import { getDb } from "./db.js";
import { ambassadeurs, courtiers } from "../drizzle/schema.js";
import { eq, isNull } from "drizzle-orm";

function generateCode(nom: string, id: number): string {
  const clean = nom.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 8);
  return `SIG-${clean}-${String(id).padStart(4, "0")}`;
}

async function main() {
  const db = (await getDb())!;

  // ── 1. Créer Sigma comme parrain racine ────────────────────────────────────
  const existing = await db.select().from(ambassadeurs).where(eq(ambassadeurs.email, "sigmaipf@gmail.com"));
  
  if (existing.length === 0) {
    const [result] = await db.insert(ambassadeurs).values({
      nom: "Factory",
      prenom: "Sigma",
      email: "sigmaipf@gmail.com",
      telephone: "0000000000",
      adresse: "Siège Sigma Factory",
      codePostal: "75000",
      ville: "Paris",
      statut: "autre",
      niveau: "1",
      contratSigne: false,
      signatureNom: "Sigma Factory",
      statutInterne: "actif",
      codeParrain: "SIG-SIGMA-0001",
    });
    const sigmaId = (result as { insertId: number }).insertId;
    console.log("✅ Sigma Factory créé comme parrain racine — ID:", sigmaId, "| Code: SIG-SIGMA-0001");
  } else {
    // Mettre à jour le code parrain si absent
    if (!existing[0].codeParrain) {
      await db.update(ambassadeurs).set({ codeParrain: "SIG-SIGMA-0001" }).where(eq(ambassadeurs.id, existing[0].id));
    }
    console.log("ℹ️  Sigma Factory existe déjà — ID:", existing[0].id, "| Code:", existing[0].codeParrain || "SIG-SIGMA-0001");
  }

  // ── 2. Générer les codes parrain pour les ambassadeurs sans code ───────────
  const ambsSansCode = await db.select().from(ambassadeurs).where(isNull(ambassadeurs.codeParrain));
  console.log(`\n📋 ${ambsSansCode.length} ambassadeur(s) sans code parrain — génération en cours...`);
  
  for (const amb of ambsSansCode) {
    const code = generateCode(amb.nom, amb.id);
    await db.update(ambassadeurs).set({ codeParrain: code }).where(eq(ambassadeurs.id, amb.id));
    console.log(`  ✅ ${amb.prenom} ${amb.nom} → ${code}`);
  }

  // ── 3. Générer les codes parrain pour les courtiers sans code ─────────────
  const courtiersSansCode = await db.select().from(courtiers).where(isNull(courtiers.codeParrain));
  console.log(`\n📋 ${courtiersSansCode.length} courtier(s) sans code parrain — génération en cours...`);
  
  for (const c of courtiersSansCode) {
    const code = generateCode(c.nom, c.id);
    await db.update(courtiers).set({ codeParrain: code }).where(eq(courtiers.id, c.id));
    console.log(`  ✅ ${c.prenom} ${c.nom} → ${code}`);
  }

  console.log("\n=== TERMINÉ ===");
  console.log("✅ Sigma Factory = parrain racine du réseau (code: SIG-SIGMA-0001)");
  console.log("✅ Tous les membres ont maintenant un code parrain unique");
  process.exit(0);
}

main().catch(console.error);

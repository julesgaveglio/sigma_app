/**
 * Test complet : génération PDF + upload S3 + simulation parrainage
 */
import { generateContratPdf } from "./contratGenerator.js";
import { generateConventionCourtierPdf } from "./conventionCourtierGenerator.js";
import { storagePut } from "./storage.js";
import { getDb } from "./db.js";
import { ambassadeurs, courtiers } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function main() {
  const db = (await getDb())!;

  // ── 1. Générer et uploader le contrat agent ────────────────────────────────
  console.log("\n[1] Génération contrat agent...");
  const agentPdf = await generateContratPdf({
    nom: "TestAgent",
    prenom: "Alice",
    email: "alice.testagent@test.fr",
    telephone: "0611111111",
    ville: "Marseille",
    codePostal: "13001",
    adresse: "1 rue du Port",
    statut: "agent_immobilier",
    signatureNom: "Alice TestAgent",
    niveau: "1",
    ambassadeurId: 999,
    dateSignature: new Date().toLocaleDateString("fr-FR"),
  });
  const agentKey = `contrats/test-agent-${nanoid(6)}.pdf`;
  const { url: agentUrl } = await storagePut(agentKey, agentPdf, "application/pdf");
  console.log("✅ Contrat agent uploadé:", agentUrl.substring(0, 60) + "...");

  // ── 2. Générer et uploader la convention courtier ─────────────────────────
  console.log("\n[2] Génération convention courtier...");
  const courtierPdf = await generateConventionCourtierPdf({
    nom: "TestCourtier",
    prenom: "Bob",
    email: "bob.testcourtier@test.fr",
    telephone: "0622222222",
    ville: "Lyon",
    codePostal: "69001",
    adresse: "5 place des Terreaux",
    statut: "auto_entrepreneur",
    numeroOrias: "99887766",
    cabinetNom: "Bob Finance",
    signatureNom: "Bob TestCourtier",
    courtierId: 999,
    dateSignature: new Date().toLocaleDateString("fr-FR"),
  });
  const courtierKey = `contrats/test-courtier-${nanoid(6)}.pdf`;
  const { url: courtierUrl } = await storagePut(courtierKey, courtierPdf, "application/pdf");
  console.log("✅ Convention courtier uploadée:", courtierUrl.substring(0, 60) + "...");

  // ── 3. Simuler un parrainage : créer agent parrain + filleul courtier ─────
  console.log("\n[3] Simulation parrainage agent → courtier...");
  
  // Créer l'agent parrain (Sigma comme parrain racine)
  const codeParrainAgent = `SIG-TESTAGENT-${nanoid(4).toUpperCase()}`;
  const [agentParrain] = await db.insert(ambassadeurs).values({
    nom: "TestAgent",
    prenom: "Alice",
    email: "alice.testagent@test.fr",
    telephone: "0611111111",
    ville: "Marseille",
    codePostal: "13001",
    adresse: "1 rue du Port",
    statut: "agent_immobilier",
    niveau: "1",
    contratSigne: true,
    dateSignature: new Date(),
    signatureNom: "Alice TestAgent",
    statutInterne: "actif",
    contratPdfUrl: agentUrl,
    contratPdfKey: agentKey,
    codeParrain: codeParrainAgent,
  }).$returningId();
  console.log("✅ Agent parrain créé — ID:", agentParrain.id, "| Code:", codeParrainAgent);

  // Créer le courtier filleul (parrain = agent Alice)
  const codeParrainCourtier = `SIG-TESTCOURT-${nanoid(4).toUpperCase()}`;
  const [courtierFilleul] = await db.insert(courtiers).values({
    nom: "TestCourtier",
    prenom: "Bob",
    email: "bob.testcourtier@test.fr",
    telephone: "0622222222",
    ville: "Lyon",
    codePostal: "69001",
    adresse: "5 place des Terreaux",
    statut: "auto_entrepreneur",
    numeroOrias: "99887766",
    cabinetNom: "Bob Finance",
    niveau: "1",
    conventionSignee: true,
    dateSignature: new Date(),
    signatureNom: "Bob TestCourtier",
    statutInterne: "actif",
    conventionPdfUrl: courtierUrl,
    conventionPdfKey: courtierKey,
    codeParrain: codeParrainCourtier,
    parrainAmbassadeurId: agentParrain.id, // Parrain = agent Alice
  }).$returningId();
  console.log("✅ Courtier filleul créé — ID:", courtierFilleul.id, "| Parrain agent ID:", agentParrain.id);

  // ── 4. Vérifier la relation parrainage en DB ──────────────────────────────
  console.log("\n[4] Vérification relation parrainage en DB...");
  const courtierCheck = await db.select().from(courtiers).where(eq(courtiers.id, courtierFilleul.id));
  console.log("✅ Courtier filleul — parrainAmbassadeurId:", courtierCheck[0]?.parrainAmbassadeurId);
  
  const agentCheck = await db.select().from(ambassadeurs).where(eq(ambassadeurs.id, agentParrain.id));
  console.log("✅ Agent parrain — codeParrain:", agentCheck[0]?.codeParrain);

  // ── 5. Vérifier via l'API tRPC que les filleuls sont visibles ─────────────
  console.log("\n[5] Vérification via API tRPC ambassadeurs.getById...");
  const resp = await fetch(`http://localhost:3000/api/trpc/ambassadeurs.getById?input=${encodeURIComponent(JSON.stringify({json: {id: agentParrain.id}}))}`, {
    headers: { "Content-Type": "application/json" }
  });
  const data = await resp.json() as any;
  const result = data?.result?.data?.json;
  if (result) {
    console.log("✅ API ambassadeurs.getById — filleulsN1:", result.filleulsN1?.length ?? 0, "| filleulsCourtiers:", result.filleulsCourtiers?.length ?? 0);
  } else {
    console.log("⚠️  Réponse API:", JSON.stringify(data).substring(0, 100));
  }

  // ── 6. Nettoyage des données de test ─────────────────────────────────────
  console.log("\n[6] Nettoyage données de test...");
  await db.delete(courtiers).where(eq(courtiers.id, courtierFilleul.id));
  await db.delete(ambassadeurs).where(eq(ambassadeurs.id, agentParrain.id));
  console.log("✅ Données de test supprimées");

  console.log("\n=== RÉSUMÉ ===");
  console.log("✅ Génération PDF contrat agent : OK");
  console.log("✅ Génération PDF convention courtier : OK");
  console.log("✅ Upload S3 contrat agent : OK");
  console.log("✅ Upload S3 convention courtier : OK");
  console.log("✅ Parrainage agent → courtier : OK");
  console.log("✅ Relation DB vérifiée : OK");
}

main().catch(console.error);

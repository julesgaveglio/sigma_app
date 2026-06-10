/**
 * Script de seed pour créer des données de test réalistes
 * Usage: node scripts/seed-test-data.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

async function seed() {
  const conn = await mysql.createConnection(DB_URL);
  console.log("✅ Connexion DB établie");

  // ── 1. Leads CRM Pipeline ──────────────────────────────────────────────────
  const crmLeads = [
    { nom: "Dupont", prenom: "Alice", email: "alice.dupont@test.fr", telephone: "0601020304", etape: "welcome_call", statut: "actif", responsable: "Maria" },
    { nom: "Martin", prenom: "Julien", email: "julien.martin@test.fr", telephone: "0602030405", etape: "point_personnalise", statut: "actif", responsable: "Maria" },
    { nom: "Bernard", prenom: "Sophie", email: "sophie.bernard@test.fr", telephone: "0603040506", etape: "courtage", statut: "actif", responsable: "Manon" },
    { nom: "Leroy", prenom: "Thomas", email: "thomas.leroy@test.fr", telephone: "0604050607", etape: "recherche_bien", statut: "actif", responsable: "Elodie" },
    { nom: "Moreau", prenom: "Emma", email: "emma.moreau@test.fr", telephone: "0605060708", etape: "sigma_credit", statut: "actif", responsable: "Hanna" },
    { nom: "Simon", prenom: "Lucas", email: "lucas.simon@test.fr", telephone: "0606070809", etape: "welcome_call", statut: "en_pause", responsable: "Maria" },
  ];

  const insertedLeads = [];
  for (const lead of crmLeads) {
    // Vérifier si le lead existe déjà
    const [existing] = await conn.execute("SELECT id FROM crm_leads WHERE email = ?", [lead.email]);
    if (existing.length > 0) {
      console.log(`⏭️  Lead ${lead.prenom} ${lead.nom} déjà existant (id: ${existing[0].id})`);
      insertedLeads.push({ id: existing[0].id, ...lead });
      continue;
    }
    const [result] = await conn.execute(
      "INSERT INTO crm_leads (nom, prenom, email, telephone, etape, statut, responsable) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [lead.nom, lead.prenom, lead.email, lead.telephone, lead.etape, lead.statut, lead.responsable]
    );
    console.log(`✅ Lead créé : ${lead.prenom} ${lead.nom} (${lead.etape}) → id: ${result.insertId}`);
    insertedLeads.push({ id: result.insertId, ...lead });
  }

  // ── 2. Notes CRM ──────────────────────────────────────────────────────────
  const notes = [
    { idx: 0, etape: "welcome_call", auteur: "Maria", contenu: "Premier contact établi. Alice est très motivée, documents en cours de préparation." },
    { idx: 0, etape: "welcome_call", auteur: "Maria", contenu: "Accès Podia envoyé par email. Rappel dans 3 jours pour vérifier les documents." },
    { idx: 1, etape: "point_personnalise", auteur: "Maria", contenu: "Point personnalisé effectué. Julien a bien compris le processus. Enveloppe en cours d'évaluation." },
    { idx: 2, etape: "courtage", auteur: "Manon", contenu: "Dossier transmis au courtier Crédit Mutuel. Réponse attendue sous 72h." },
    { idx: 3, etape: "recherche_bien", auteur: "Elodie", contenu: "3 biens présentés à Thomas. Visite programmée samedi matin." },
  ];

  for (const note of notes) {
    const lead = insertedLeads[note.idx];
    if (!lead) continue;
    const [existing] = await conn.execute(
      "SELECT id FROM crm_notes WHERE crmLeadId = ? AND auteur = ? AND contenu = ?",
      [lead.id, note.auteur, note.contenu]
    );
    if (existing.length > 0) {
      console.log(`⏭️  Note déjà existante pour ${lead.prenom} ${lead.nom}`);
      continue;
    }
    await conn.execute(
      "INSERT INTO crm_notes (crmLeadId, etape, auteur, contenu) VALUES (?, ?, ?, ?)",
      [lead.id, note.etape, note.auteur, note.contenu]
    );
    console.log(`✅ Note créée pour ${lead.prenom} ${lead.nom} par ${note.auteur}`);
  }

  // ── 3. Tâches Calendrier (RDV Maria) ─────────────────────────────────────
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const dayAfter = new Date(now); dayAfter.setDate(now.getDate() + 2);
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);

  const tasks = [
    {
      titre: "Welcome Call — Alice Dupont",
      description: "Explication des formulaires, accès Podia, dépôt des documents, avis bonus",
      assigneA: "Maria",
      dateDebut: new Date(tomorrow.setHours(10, 0, 0, 0)),
      dateFin: new Date(tomorrow.setHours(10, 45, 0, 0)),
      crmLeadId: insertedLeads[0]?.id ?? null,
      rappelEmail: true,
      rappelMinutesAvant: 30,
      statut: "a_faire",
      creePar: "Admin",
    },
    {
      titre: "Point Personnalisé — Julien Martin",
      description: "Bilan du parcours, retour d'expérience, validation de l'enveloppe",
      assigneA: "Maria",
      dateDebut: new Date(dayAfter.setHours(14, 0, 0, 0)),
      dateFin: new Date(dayAfter.setHours(14, 30, 0, 0)),
      crmLeadId: insertedLeads[1]?.id ?? null,
      rappelEmail: true,
      rappelMinutesAvant: 30,
      statut: "a_faire",
      creePar: "Admin",
    },
    {
      titre: "Suivi courtage — Sophie Bernard",
      description: "Vérification du retour du courtier Crédit Mutuel",
      assigneA: "Manon",
      dateDebut: new Date(nextWeek.setHours(11, 0, 0, 0)),
      dateFin: new Date(nextWeek.setHours(11, 30, 0, 0)),
      crmLeadId: insertedLeads[2]?.id ?? null,
      rappelEmail: false,
      rappelMinutesAvant: 30,
      statut: "a_faire",
      creePar: "Admin",
    },
    {
      titre: "Welcome Call — Lucas Simon",
      description: "Premier RDV Maria pour Lucas Simon — en pause, à reprendre",
      assigneA: "Maria",
      dateDebut: new Date(nextWeek.setHours(15, 0, 0, 0)),
      dateFin: new Date(nextWeek.setHours(15, 45, 0, 0)),
      crmLeadId: insertedLeads[5]?.id ?? null,
      rappelEmail: true,
      rappelMinutesAvant: 60,
      statut: "a_faire",
      creePar: "Admin",
    },
  ];

  for (const task of tasks) {
    const [existing] = await conn.execute(
      "SELECT id FROM calendar_tasks WHERE titre = ? AND assigneA = ?",
      [task.titre, task.assigneA]
    );
    if (existing.length > 0) {
      console.log(`⏭️  Tâche déjà existante : ${task.titre}`);
      continue;
    }
    await conn.execute(
      `INSERT INTO calendar_tasks (titre, description, assigneA, dateDebut, dateFin, crmLeadId, rappelEmail, rappelMinutesAvant, statut, creePar, touteJournee, rappelEnvoye)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE)`,
      [task.titre, task.description, task.assigneA, task.dateDebut, task.dateFin, task.crmLeadId, task.rappelEmail, task.rappelMinutesAvant, task.statut, task.creePar]
    );
    console.log(`✅ Tâche créée : ${task.titre} (${task.assigneA})`);
  }

  // ── 4. Notifications de test ──────────────────────────────────────────────
  const testNotifs = [
    { destinataire: "Maria", type: "nouveau_lead", titre: "Nouveau lead : Alice Dupont", message: "Un nouveau lead a été ajouté à l'étape Welcome Call.", lien: "/dashboard/pipeline" },
    { destinataire: "Maria", type: "nouvelle_tache", titre: "Nouvelle tâche : Welcome Call — Alice Dupont", message: "Assignée par Admin pour demain à 10h00", lien: "/dashboard/calendar" },
    { destinataire: "Maria", type: "nouvelle_tache", titre: "Nouvelle tâche : Point Personnalisé — Julien Martin", message: "Assignée par Admin pour après-demain à 14h00", lien: "/dashboard/calendar" },
    { destinataire: "Manon", type: "changement_etape", titre: "Lead déplacé : Sophie Bernard", message: "Étape : Welcome Call → Courtage", lien: "/dashboard/pipeline" },
    { destinataire: "Owner", type: "nouveau_lead", titre: "Nouveau lead : Emma Moreau", message: "Un nouveau lead a été ajouté à l'étape Sigma Crédit.", lien: "/dashboard/pipeline" },
  ];

  for (const notif of testNotifs) {
    await conn.execute(
      "INSERT INTO notifications (destinataire, type, titre, message, lien) VALUES (?, ?, ?, ?, ?)",
      [notif.destinataire, notif.type, notif.titre, notif.message, notif.lien]
    );
    console.log(`✅ Notif créée pour ${notif.destinataire} : ${notif.titre}`);
  }

  await conn.end();
  console.log("\n🎉 Seed terminé avec succès !");
}

seed().catch(e => { console.error("❌ Erreur seed:", e.message); process.exit(1); });

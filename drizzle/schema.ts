import { bigint, boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "direction", "agent", "courtier"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const allowedEmails = mysqlTable("allowed_emails", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  nom: varchar("nom", { length: 128 }),
  role: mysqlEnum("role", ["user", "admin", "direction", "agent", "courtier"]).default("user").notNull(),
  actif: boolean("actif").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AllowedEmail = typeof allowedEmails.$inferSelect;
export type InsertAllowedEmail = typeof allowedEmails.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── LEADS ───────────────────────────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),

  // Identité principale
  nom: varchar("nom", { length: 128 }).notNull(),
  nomJeuneFille: varchar("nomJeuneFille", { length: 128 }),
  prenoms: varchar("prenoms", { length: 256 }).notNull(),
  profession: varchar("profession", { length: 128 }),
  dateNaissance: varchar("dateNaissance", { length: 32 }),
  lieuNaissance: varchar("lieuNaissance", { length: 128 }),
  adresse: text("adresse"),
  ville: varchar("ville", { length: 128 }),
  codePostal: varchar("codePostal", { length: 10 }),
  telephoneDomicile: varchar("telephoneDomicile", { length: 32 }),
  telephoneTravail: varchar("telephoneTravail", { length: 32 }),
  telephonePortable: varchar("telephonePortable", { length: 32 }),
  email: varchar("email", { length: 320 }),

  // Conjoint
  conjointNom: varchar("conjointNom", { length: 128 }),
  conjointNomJeuneFille: varchar("conjointNomJeuneFille", { length: 128 }),
  conjointPrenoms: varchar("conjointPrenoms", { length: 256 }),
  conjointProfession: varchar("conjointProfession", { length: 128 }),
  conjointDateNaissance: varchar("conjointDateNaissance", { length: 32 }),
  conjointLieuNaissance: varchar("conjointLieuNaissance", { length: 128 }),
  conjointAdresse: text("conjointAdresse"),
  conjointTelephoneDomicile: varchar("conjointTelephoneDomicile", { length: 32 }),
  conjointTelephoneTravail: varchar("conjointTelephoneTravail", { length: 32 }),
  conjointTelephonePortable: varchar("conjointTelephonePortable", { length: 32 }),
  conjointEmail: varchar("conjointEmail", { length: 320 }),

  // Mariage
  communeMariage: varchar("communeMariage", { length: 128 }),
  dateMariage: varchar("dateMariage", { length: 32 }),
  contratMariage: boolean("contratMariage").default(false),
  regimeMatrimonial: varchar("regimeMatrimonial", { length: 128 }),
  regimeMatrimonialType: mysqlEnum("regimeMatrimonialType", ["communaute_reduite_acquets", "communaute_universelle", "separation_biens", "participation_acquets", "autre"]),
  projetSeulOuDeux: mysqlEnum("projetSeulOuDeux", ["seul", "a_deux"]),
  notaireContratNom: varchar("notaireContratNom", { length: 128 }),
  notaireContratLieu: varchar("notaireContratLieu", { length: 128 }),
  notaireContratDate: varchar("notaireContratDate", { length: 32 }),

  // Changement de régime
  changementRegime: boolean("changementRegime").default(false),
  nouveauRegime: varchar("nouveauRegime", { length: 128 }),
  notaireChangementNom: varchar("notaireChangementNom", { length: 128 }),
  notaireChangementLieu: varchar("notaireChangementLieu", { length: 128 }),
  notaireChangementDate: varchar("notaireChangementDate", { length: 32 }),
  tribunalHomologation: varchar("tribunalHomologation", { length: 128 }),
  dateHomologation: varchar("dateHomologation", { length: 32 }),

  // Situation familiale
  situationFamiliale: mysqlEnum("situationFamiliale", [
    "celibataire", "marie", "divorce", "instance_divorce", "pacs", "veuf"
  ]).default("celibataire"),

  // Instance de divorce
  avocatNomAdresse: text("avocatNomAdresse"),

  // Divorcé
  tribunalDivorce: varchar("tribunalDivorce", { length: 128 }),
  dateDivorce: varchar("dateDivorce", { length: 32 }),
  exConjointNomPrenom: varchar("exConjointNomPrenom", { length: 256 }),

  // PACS
  datePacs: varchar("datePacs", { length: 32 }),
  partenairePacs: varchar("partenairePacs", { length: 256 }),

  // Nationalité
  nationalite: mysqlEnum("nationalite", [
    "francais", "francais_etranger", "etranger"
  ]).default("francais"),

  // Statut et métadonnées
  statut: mysqlEnum("statut", ["nouveau", "en_cours", "traite", "archive"]).default("nouveau").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  type: mysqlEnum("type", ["cni", "passeport", "titre_sejour", "autre"]).notNull(),
  filename: varchar("filename", { length: 256 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 64 }),
  size: int("size"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── CUSTOM CARE ─────────────────────────────────────────────────────────────

export const demandes = mysqlTable("demandes", {
  id: int("id").autoincrement().primaryKey(),

  // Informations lead
  nom: varchar("nom", { length: 128 }).notNull(),
  prenom: varchar("prenom", { length: 128 }).notNull(),
  telephone: varchar("telephone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),

  // Demande
  sujet: varchar("sujet", { length: 256 }).notNull(),
  demande: text("demande").notNull(),
  priorite: mysqlEnum("priorite", [
    "hyper_urgent", "tres_urgent", "urgent", "normal", "faible"
  ]).default("normal").notNull(),

  // Gestion Hanna
  statut: mysqlEnum("statut", [
    "nouvelle", "en_cours", "en_attente_retour", "standby", "effectuee", "annulee"
  ]).default("nouvelle").notNull(),
  notesInternes: text("notesInternes"),
  assigneA: varchar("assigneA", { length: 128 }),
  createdBy: varchar("createdBy", { length: 128 }),
  assignedAt: timestamp("assignedAt"),

  // Origine de la demande : true = soumise par le client lui-même, false = créée par l'équipe
  soumisParClient: tinyint("soumis_par_client").default(0).notNull(),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Demande = typeof demandes.$inferSelect;
export type InsertDemande = typeof demandes.$inferInsert;

// ─── DEMANDE DOCUMENTS ───────────────────────────────────────────────────────
export const demandeDocuments = mysqlTable("demande_documents", {
  id: int("id").autoincrement().primaryKey(),
  demandeId: int("demandeId").notNull().references(() => demandes.id, { onDelete: "cascade" }),
  // Fichier S3
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  nom: varchar("nom", { length: 256 }).notNull(),
  taille: int("taille").notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  // Sens : 'lead' = envoyé par le lead/équipe, 'hanna' = envoyé par Hanna
  envoyePar: mysqlEnum("envoyePar", ["lead", "hanna"]).notNull(),
  // Métadonnées
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});
export type DemandeDocument = typeof demandeDocuments.$inferSelect;
export type InsertDemandeDocument = typeof demandeDocuments.$inferInsert;

// ─── MANDAT DE RECHERCHE ─────────────────────────────────────────────────────────────────────────

export const mandatsRecherche = mysqlTable("mandats_recherche", {
  id: int("id").autoincrement().primaryKey(),

  // Lien optionnel avec la fiche état civil
  leadId: int("leadId"),

  // Identité acquéreur (pré-remplie depuis l'état civil si lié)
  nom: varchar("nom", { length: 128 }).notNull(),
  prenoms: varchar("prenoms", { length: 256 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telephone: varchar("telephone", { length: 32 }).notNull(),
  adresse: text("adresse"),
  dateNaissance: varchar("dateNaissance", { length: 32 }),
  lieuNaissance: varchar("lieuNaissance", { length: 128 }),
  nationalite: varchar("nationalite", { length: 64 }),
  situationFamiliale: varchar("situationFamiliale", { length: 64 }),

  // Description du bien recherché
  typeBien: mysqlEnum("typeBien", ["appartement", "maison", "villa", "terrain", "local_commercial", "autre"]).notNull(),
  usage: mysqlEnum("usage", ["residence_principale", "residence_secondaire", "investissement_locatif"]).notNull(),
  nbPiecesMin: int("nbPiecesMin"),
  nbPiecesMax: int("nbPiecesMax"),
  surfaceMin: int("surfaceMin"),
  surfaceMax: int("surfaceMax"),
  etage: varchar("etage", { length: 64 }),
  localisation: text("localisation").notNull(),
  etatBien: mysqlEnum("etatBien", ["neuf", "ancien", "les_deux"]).default("les_deux"),
  travauxAcceptes: mysqlEnum("travauxAcceptes", ["oui", "non", "selon_prix"]).default("selon_prix"),

  // Critères booléens
  balconTerrasse: boolean("balconTerrasse").default(false),
  parkingGarage: boolean("parkingGarage").default(false),
  cave: boolean("cave").default(false),
  ascenseur: boolean("ascenseur").default(false),
  gardien: boolean("gardien").default(false),
  calme: boolean("calme").default(false),
  lumineux: boolean("lumineux").default(false),
  procheTransports: boolean("procheTransports").default(false),
  procheEcoles: boolean("procheEcoles").default(false),
  accessibilitePmr: boolean("accessibilitePmr").default(false),
  animaux: boolean("animaux").default(false),
  exposition: varchar("exposition", { length: 32 }),
  autresCriteres: text("autresCriteres"),

  // Budget & Financement
  budgetMax: int("budgetMax"),
  modeFinancement: mysqlEnum("modeFinancement", ["comptant", "credit", "mixte"]),
  apportPersonnel: int("apportPersonnel"),
  accordBancaire: mysqlEnum("accordBancaire", ["oui", "non", "en_cours"]).default("non"),
  banqueCourtier: varchar("banqueCourtier", { length: 128 }),
  revenusNets: int("revenusNets"),

  // Type de mandat
  typeMandat: mysqlEnum("typeMandat", ["simple", "exclusif"]).default("simple"),
  dureeMandat: int("dureeMandat").default(3),

  // Gestion Hanna
  statut: mysqlEnum("statut", [
    "nouveau", "en_cours", "en_attente_retour", "standby", "traite", "annule"
  ]).default("nouveau").notNull(),
  notesInternes: text("notesInternes"),
  assigneA: varchar("assigneA", { length: 128 }),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MandatRecherche = typeof mandatsRecherche.$inferSelect;
export type InsertMandatRecherche = typeof mandatsRecherche.$inferInsert;

// ─── HEXA — CRÉDIT D'IMPÔT SIGMA ──────────────────────────────────────────────────────────────────────────────────

export const hexaDossiers = mysqlTable("hexa_dossiers", {
  id: int("id").autoincrement().primaryKey(),

  // Identité (champs Hexa Coop étape 1)
  civilite: mysqlEnum("civilite", ["M.", "Mme", "Mme M.", "M. Mme"]),
  nom: varchar("nom", { length: 128 }).notNull(),
  prenom: varchar("prenom", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),

  // Informations personnelles
  dateNaissance: varchar("dateNaissance", { length: 32 }),
  situationFamiliale: mysqlEnum("situationFamiliale", ["celibataire", "marie", "pacse", "divorce", "veuf"]),
  profession: varchar("profession", { length: 128 }),

  // Coordonnées (champs Hexa Coop étape 2)
  mobile: varchar("mobile", { length: 32 }),
  fixe: varchar("fixe", { length: 32 }),
  adresse: varchar("adresse", { length: 256 }).notNull(),
  codePostal: varchar("codePostal", { length: 10 }).notNull(),
  ville: varchar("ville", { length: 128 }).notNull(),
  paysNaissance: varchar("paysNaissance", { length: 128 }).notNull(),
  villeNaissance: varchar("villeNaissance", { length: 128 }).notNull(),

  // Formule souscrite
  formule: mysqlEnum("formule", ["starter", "premium", "sdt_starter", "sdt_premium"]),
  // Mode de paiement
  modePaiement: mysqlEnum("modePaiement", ["comptant", "deux_fois", "cinquante_pourcent"]),
  // Montant demandé (calculé automatiquement selon formule + mode)
  montant: int("montant").notNull(),
  montantTotal: int("montantTotal"),  // montant total de la formule (avant réduction)
  montantAcompte: int("montantAcompte"), // montant du 1er versement si paiement fractionné

  // Gestion Hanna
  statut: mysqlEnum("statut", [
    "nouveau", "en_cours", "lien_envoye", "paiement_recu", "annule"
  ]).default("nouveau").notNull(),
  notesInternes: text("notesInternes"),
  assigneA: varchar("assigneA", { length: 128 }),
  lienPaiement: text("lienPaiement"),
  paiementInitie: boolean("paiementInitie").default(false).notNull(),
  paiementRecu: boolean("paiementRecu").default(false).notNull(),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HexaDossier = typeof hexaDossiers.$inferSelect;
export type InsertHexaDossier = typeof hexaDossiers.$inferInsert;

// ─── CRM PIPELINE — TEAM DELIVERY ────────────────────────────────────────────

export const crmLeads = mysqlTable("crm_leads", {
  id: int("id").autoincrement().primaryKey(),

  // Identité du lead (peut être liée aux autres modules)
  nom: varchar("nom", { length: 128 }).notNull(),
  prenom: varchar("prenom", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telephone: varchar("telephone", { length: 32 }),

  // Formule souscrite (syncée depuis hexa_dossiers)
  formule: mysqlEnum("formule", ["starter", "premium", "sdt_starter", "sdt_premium"]),
  modePaiement: mysqlEnum("modePaiement", ["comptant", "deux_fois", "cinquante_pourcent"]),
  montantFormule: int("montantFormule"),  // montant payé par le lead
  // Liens vers les autres modules (optionnels)
  leadId: int("leadId"),           // lien vers leads (état civil)
  mandatId: int("mandatId"),        // lien vers mandats_recherche
  hexaId: int("hexaId"),            // lien vers hexa_dossiers

  // Pipeline — étape actuelle
  etape: mysqlEnum("etape", [
    "welcome_call",
    "sigma_cash",
    "sigma_credit",
    "point_personnalise",
    "courtage",
    "recherche_bien"
  ]).default("welcome_call").notNull(),

  // Responsable par étape
  responsable: varchar("responsable", { length: 128 }),

  // Suivi Welcome Call (Maria)
  welcomeCallFait: boolean("welcomeCallFait").default(false).notNull(),
  etatCivilRempli: boolean("etatCivilRempli").default(false).notNull(),
  mandatRempli: boolean("mandatRempli").default(false).notNull(),
  tableauCourtageRempli: boolean("tableauCourtageRempli").default(false).notNull(),
  accesPodia: boolean("accesPodia").default(false).notNull(),
  documentsDeposes: boolean("documentsDeposes").default(false).notNull(),
  avisDepose: boolean("avisDepose").default(false).notNull(),
  // Statut avis : en_attente | depose | pas_davis (avec note obligatoire)
  avisStatut: mysqlEnum("avisStatut", ["en_attente", "depose", "pas_davis"]).default("en_attente").notNull(),
  avisNote: text("avisNote"),
  discoursClair: boolean("discoursClair").default(false).notNull(),

  // Suivi Point Personnalisé (Maria)
  avisRetourExp: boolean("avisRetourExp").default(false).notNull(),
  enveloppeOk: boolean("enveloppeOk").default(false).notNull(),
  mandatSigne: boolean("mandatSigne").default(false).notNull(),

  // Suivi Courtage (Manon)
  courtierAssigne: varchar("courtierAssigne", { length: 128 }),
  courtierEmail: varchar("courtierEmail", { length: 320 }),  // email du courtier pour envoi dossier
  enveloppeValidee: int("enveloppeValidee"),   // montant en euros
  enveloppeDate: varchar("enveloppeDate", { length: 32 }),
  statutCourtage: mysqlEnum("statutCourtage", ["a_contacter", "en_cours", "effectue"]).default("a_contacter").notNull(),

  // Données Mandat de Recherche (Immo — Élodie)
  numeroMandat: varchar("numeroMandat", { length: 32 }),
  projetType: mysqlEnum("projetType", ["Rés. principale", "Invest. locatif", "RP + IL"]),
  budgetMax: int("budgetMax"),                        // budget maximum en euros
  typeBien: varchar("typeBien", { length: 255 }),     // ex: Maison / Immeuble · Neuf, Ancien...
  zoneRecherche: text("zoneRecherche"),               // zone géographique de recherche
  villeResidence: varchar("villeResidence", { length: 128 }),
  departement: varchar("departement", { length: 8 }),
  codePostal: varchar("codePostal", { length: 10 }),
  dateSignatureMandat: varchar("dateSignatureMandat", { length: 32 }),
  mandatSignePdfUrl: varchar("mandatSignePdfUrl", { length: 1024 }),  // URL S3 du PDF mandat signé

  // Suivi Recherche bien (Élodie)
  agentAssigne: varchar("agentAssigne", { length: 128 }),
  nbBiensPresentes: int("nbBiensPresentes").default(0).notNull(),
  offreAcceptee: boolean("offreAcceptee").default(false).notNull(),

  // Suivi Avis & Témoignages (Marie)
  marieAssignee: boolean("marieAssignee").default(false).notNull(),
  testimonyMarieFait: boolean("testimonyMarieFait").default(false).notNull(),
  marieAssigneeEtape: mysqlEnum("marieAssigneeEtape", ["courtage", "immo"]),  // étape qui a déclenché l'assignation

  // Notes globales et statut
  notes: text("notes"),
  statut: mysqlEnum("statut", ["actif", "en_pause", "cloture", "perdu"]).default("actif").notNull(),

  // Pont CRM Sales (sigma-ecosystem) — deduplication webhook won
  sigmaOpportunityId: varchar("sigmaOpportunityId", { length: 64 }),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = typeof crmLeads.$inferInsert;

// Notes d'historique par étape
export const crmNotes = mysqlTable("crm_notes", {
  id: int("id").autoincrement().primaryKey(),
  crmLeadId: int("crmLeadId").notNull(),
  etape: varchar("etape", { length: 64 }).notNull(),
  auteur: varchar("auteur", { length: 128 }),
  contenu: text("contenu").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrmNote = typeof crmNotes.$inferSelect;

// Documents attachés à un lead CRM (uploadés par l'équipe)
export const crmLeadDocuments = mysqlTable("crm_lead_documents", {
  id: int("id").autoincrement().primaryKey(),
  crmLeadId: int("crmLeadId").notNull(),
  // Fichier S3
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  nom: varchar("nom", { length: 256 }).notNull(),
  taille: int("taille"),
  mimeType: varchar("mimeType", { length: 128 }),
  // Qui a uploadé
  uploadePar: varchar("uploadePar", { length: 128 }),
  // Métadonnées
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type CrmLeadDocument = typeof crmLeadDocuments.$inferSelect;
export type InsertCrmLeadDocument = typeof crmLeadDocuments.$inferInsert;

// ─── HISTORIQUE VERSIONS MANDAT SIGNÉ ────────────────────────────────────────
export const mandatVersions = mysqlTable("mandat_versions", {
  id: int("id").autoincrement().primaryKey(),
  crmLeadId: int("crmLeadId").notNull(),
  // Fichier S3
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  nom: varchar("nom", { length: 256 }).notNull(),
  // Numéro de version (auto-incrémenté par logique applicative)
  version: int("version").default(1).notNull(),
  // Qui a uploadé
  uploadePar: varchar("uploadePar", { length: 128 }),
  // Métadonnées
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type MandatVersion = typeof mandatVersions.$inferSelect;
export type InsertMandatVersion = typeof mandatVersions.$inferInsert;

// ─── PIPE AVIS MARIE ──────────────────────────────────────────────────────────
export const avisPipe = mysqlTable("avis_pipe", {
  id: int("id").autoincrement().primaryKey(),
  crmLeadId: int("crmLeadId").notNull(),
  leadNom: varchar("leadNom", { length: 256 }).notNull(),
  leadEmail: varchar("leadEmail", { length: 320 }),
  leadTelephone: varchar("leadTelephone", { length: 32 }),
  etape: mysqlEnum("etape", ["avis_a_faire", "avis_effectue", "en_montage", "montage_ok"]).notNull().default("avis_a_faire"),
  etapeSource: mysqlEnum("etapeSource", ["courtage", "immo"]).notNull().default("courtage"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AvisPipe = typeof avisPipe.$inferSelect;
export type InsertAvisPipe = typeof avisPipe.$inferInsert;
export type InsertCrmNote = typeof crmNotes.$inferInsert;

// ─── CALENDRIER INTERNE ───────────────────────────────────────────────────────

export const calendarTasks = mysqlTable("calendar_tasks", {
  id: int("id").autoincrement().primaryKey(),
  // Contenu de la tâche
  titre: varchar("titre", { length: 256 }).notNull(),
  description: text("description"),
  // Membre assigné (Maria=bleu, Manon=violet, Elodie=vert, Hanna=or)
  assigneA: mysqlEnum("assigneA", ["Maria", "Manon", "Elodie", "Hanna", "Marie"]).notNull(),
  // Date et heure
  dateDebut: timestamp("dateDebut").notNull(),
  dateFin: timestamp("dateFin"),
  // Journée entière
  touteJournee: boolean("touteJournee").default(false).notNull(),
  // Lien optionnel vers un lead CRM
  crmLeadId: int("crmLeadId"),
  // Rappel
  rappelEmail: boolean("rappelEmail").default(false).notNull(),
  rappelMinutesAvant: int("rappelMinutesAvant").default(30),
  rappelEnvoye: boolean("rappelEnvoye").default(false).notNull(),
  // Statut
  statut: mysqlEnum("statut", ["a_faire", "en_cours", "termine"]).default("a_faire").notNull(),
  // Créateur
  creePar: varchar("creePar", { length: 128 }),
  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CalendarTask = typeof calendarTasks.$inferSelect;
export type InsertCalendarTask = typeof calendarTasks.$inferInsert;

// ─── NOTIFICATIONS IN-APP ─────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  // Destinataire (membre de l'équipe)
  destinataire: mysqlEnum("destinataire", ["Maria", "Manon", "Elodie", "Hanna", "Marie", "Owner"]).notNull(),
  // Type d'action
  type: mysqlEnum("type", ["nouveau_lead", "changement_etape", "nouvelle_note", "nouvelle_tache", "rappel_rdv", "nouvel_ambassadeur", "nouveau_courtier", "assignation"]).notNull(),
  // Contenu
  titre: varchar("titre", { length: 256 }).notNull(),
  message: text("message").notNull(),
  // Lien optionnel
  lien: varchar("lien", { length: 512 }),
  // Statut
  lu: boolean("lu").default(false).notNull(),
  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── MODULE AMBASSADEURS SIGMA ────────────────────────────────────────────────

// Table principale des ambassadeurs
export const ambassadeurs = mysqlTable("ambassadeurs", {
  id: int("id").autoincrement().primaryKey(),

  // Identité
  nom: varchar("nom", { length: 128 }).notNull(),
  prenom: varchar("prenom", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telephone: varchar("telephone", { length: 32 }).notNull(),
  adresse: text("adresse").notNull(),
  codePostal: varchar("codePostal", { length: 10 }).notNull(),
  ville: varchar("ville", { length: 128 }).notNull(),

  // Statut professionnel
  statut: mysqlEnum("statut", [
    "agent_immobilier", "mandataire", "courtier", "auto_entrepreneur", "autre"
  ]).notNull(),
  siret: varchar("siret", { length: 32 }),
  activitePrincipale: text("activitePrincipale"),

  // Réseau MLM
  parrainId: int("parrainId"),   // null = recruté directement par Élodie (niveau 1)
  parrainCourtierId: int("parrainCourtierId"),  // Si parrain est un courtier (réseau croisé)
  niveau: mysqlEnum("niveau", ["1", "2"]).default("1").notNull(),

  // Contrat & signature électronique
  contratSigne: boolean("contratSigne").default(false).notNull(),
  dateSignature: timestamp("dateSignature"),
  signatureNom: varchar("signatureNom", { length: 256 }),  // "Lu et approuvé - Prénom NOM"
  contratPdfUrl: text("contratPdfUrl"),   // URL S3 du PDF signé
  contratPdfKey: varchar("contratPdfKey", { length: 512 }),

  // Statut interne
  statutInterne: mysqlEnum("statutInterne", [
    "en_attente", "actif", "suspendu", "resilie"
  ]).default("en_attente").notNull(),
  notesInternes: text("notesInternes"),

  // Code parrain unique pour le recrutement
  codeParrain: varchar("codeParrain", { length: 32 }),

   // Lien vers user Manus (si l'ambassadeur se connecte)
  userId: int("userId"),
  // Géolocalisation (calculée à partir de l'adresse)
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  // Régions / départements d'opération (JSON array ex: '["\u00cele-de-France","69"]')
  regionsOperation: text("regionsOperation"),
  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Ambassadeur = typeof ambassadeurs.$inferSelect;
export type InsertAmbassadeur = typeof ambassadeurs.$inferInsert;

// ─── PORTEFEUILLE DE BIENS ────────────────────────────────────────────────────

export const biens = mysqlTable("biens", {
  id: int("id").autoincrement().primaryKey(),

  // Agent qui soumet le bien (nullable pour les biens scrappés)
  ambassadeurId: int("ambassadeurId"),

  // Source du bien : "ambassadeur" ou "pap_scrape"
  source: mysqlEnum("source", ["ambassadeur", "pap_scrape"]).default("ambassadeur").notNull(),

  // Identification du bien
  reference: varchar("reference", { length: 64 }),
  titre: varchar("titre", { length: 256 }).notNull(),

  // Type et caractéristiques
  typeBien: mysqlEnum("typeBien", [
    "appartement", "maison", "villa", "terrain", "local_commercial", "autre"
  ]).notNull(),
  transaction: mysqlEnum("transaction", ["vente", "location"]).default("vente").notNull(),
  usage: mysqlEnum("usage", [
    "residence_principale", "residence_secondaire", "investissement_locatif", "professionnel"
  ]).notNull(),

  // Localisation
  adresse: text("adresse").notNull(),
  codePostal: varchar("codePostal", { length: 10 }).notNull(),
  ville: varchar("ville", { length: 128 }).notNull(),
  departement: varchar("departement", { length: 64 }),
  region: varchar("region", { length: 64 }),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),

  // Caractéristiques physiques
  surface: int("surface").notNull(),          // m²
  surfaceTerrain: int("surfaceTerrain"),       // m² terrain
  nbPieces: int("nbPieces"),
  nbChambres: int("nbChambres"),
  nbSallesBain: int("nbSallesBain"),
  nbEtages: int("nbEtages"),
  etage: int("etage"),
  anneeConstruction: int("anneeConstruction"),

  // État et travaux
  etatBien: mysqlEnum("etatBien", ["neuf", "bon_etat", "a_renover", "a_rafraichir"]).notNull(),
  travauxEstimes: int("travauxEstimes"),       // € estimés

  // DPE
  dpeLettre: mysqlEnum("dpeLettre", ["A", "B", "C", "D", "E", "F", "G", "NC"]).default("NC"),
  dpeValeur: int("dpeValeur"),                 // kWh/m²/an
  gesLettre: mysqlEnum("gesLettre", ["A", "B", "C", "D", "E", "F", "G", "NC"]).default("NC"),
  gesValeur: int("gesValeur"),

  // Équipements (booléens)
  balcon: boolean("balcon").default(false),
  terrasse: boolean("terrasse").default(false),
  jardin: boolean("jardin").default(false),
  parking: boolean("parking").default(false),
  garage: boolean("garage").default(false),
  cave: boolean("cave").default(false),
  ascenseur: boolean("ascenseur").default(false),
  gardien: boolean("gardien").default(false),
  piscine: boolean("piscine").default(false),
  digicode: boolean("digicode").default(false),
  interphone: boolean("interphone").default(false),
  pmr: boolean("pmr").default(false),

  // Exposition et environnement
  exposition: varchar("exposition", { length: 32 }),
  vue: varchar("vue", { length: 128 }),
  environnement: varchar("environnement", { length: 128 }),

  // Prix
  prix: int("prix").notNull(),                 // € FAI (= prixNetVendeur + honorairesAgence)
  prixNetVendeur: int("prixNetVendeur"),        // € net vendeur (sans frais d'agence)
  honorairesAgence: int("honorairesAgence"),   // € honoraires d'agence
  prixNegociable: boolean("prixNegociable").default(false),
  chargesAnnuelles: int("chargesAnnuelles"),   // €/an
  taxeFonciere: int("taxeFonciere"),           // €/an

  // Photos et médias (URLs S3)
  photoPrincipaleUrl: text("photoPrincipaleUrl"),
  photoPrincipaleKey: varchar("photoPrincipaleKey", { length: 512 }),
  photosUrls: text("photosUrls"),              // JSON array d'URLs
  planUrl: text("planUrl"),
  dpeDocUrl: text("dpeDocUrl"),

  // Description
  description: text("description"),
  pointsForts: text("pointsForts"),
  
  // URL source (pour PAP, Seloger, etc.)
  urlSource: text("urlSource"),

  // Statut de publication
  statutBien: mysqlEnum("statutBien", [
    "en_attente_validation", "publie", "sous_compromis", "vendu", "retire"
  ]).default("en_attente_validation").notNull(),
  valideParAdmin: boolean("valideParAdmin").default(false).notNull(),
  notesAdmin: text("notesAdmin"),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bien = typeof biens.$inferSelect;
export type InsertBien = typeof biens.$inferInsert;

// ─── PROPOSITIONS BIENS → LEADS ───────────────────────────────────────────────

export const propositions = mysqlTable("propositions", {
  id: int("id").autoincrement().primaryKey(),

  // Lien CRM lead
  crmLeadId: int("crmLeadId").notNull(),

  // Bien proposé
  bienId: int("bienId").notNull(),

  // Ordre de présentation (1, 2 ou 3)
  ordre: int("ordre").default(1).notNull(),

  // Suivi
  presente: boolean("presente").default(false).notNull(),
  datePresentation: timestamp("datePresentation"),
  reactionClient: mysqlEnum("reactionClient", [
    "interesse", "pas_interesse", "a_visiter", "visite_faite", "offre_faite"
  ]),
  notes: text("notes"),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Proposition = typeof propositions.$inferSelect;
export type InsertProposition = typeof propositions.$inferInsert;

// ─── COMMISSIONS AMBASSADEURS ─────────────────────────────────────────────────

export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),

  // Vente concernée
  crmLeadId: int("crmLeadId"),
  bienId: int("bienId"),
  descriptionVente: text("descriptionVente"),  // si pas de lien direct

  // Montant commission Sigma encaissée (base de calcul)
  commissionSigmaHt: int("commissionSigmaHt").notNull(),  // € HT
  dateEncaissement: varchar("dateEncaissement", { length: 32 }).notNull(),

  // Bénéficiaire
  ambassadeurId: int("ambassadeurId").notNull(),

  // Calcul
  niveau: mysqlEnum("niveau", ["0", "1", "2"]).notNull(),  // 0=direct, 1=filleul N1, 2=filleul N2
  tauxPourcent: int("tauxPourcent").notNull(),              // 50, 10 ou 5
  montantHt: int("montantHt").notNull(),                   // € HT calculé

  // Statut paiement
  statut: mysqlEnum("statut", ["a_payer", "facture_recue", "paye"]).default("a_payer").notNull(),
  datePaiement: varchar("datePaiement", { length: 32 }),
  reference: varchar("reference", { length: 128 }),

  // Validé par admin
  valideParAdmin: boolean("valideParAdmin").default(false).notNull(),
  valideParNom: varchar("valideParNom", { length: 128 }),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;

// ─── COURTIERS PARTENAIRES ────────────────────────────────────────────────────

export const courtiers = mysqlTable("courtiers", {
  id: int("id").autoincrement().primaryKey(),

  // Identité
  nom: varchar("nom", { length: 128 }).notNull(),
  prenom: varchar("prenom", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telephone: varchar("telephone", { length: 32 }).notNull(),
  adresse: text("adresse").notNull(),
  codePostal: varchar("codePostal", { length: 10 }).notNull(),
  ville: varchar("ville", { length: 128 }).notNull(),

  // Statut professionnel courtier
  statut: mysqlEnum("statut", [
    "auto_entrepreneur", "eirl", "eurl", "sasu", "sarl", "autre"
  ]).notNull(),
  siret: varchar("siret", { length: 32 }),
  cabinetNom: varchar("cabinetNom", { length: 256 }),
  // Informations juridiques
  denominationSociale: varchar("denominationSociale", { length: 256 }),
  formeJuridique: varchar("formeJuridique", { length: 64 }),
  capitalSocial: varchar("capitalSocial", { length: 64 }),
  adresseSiegeSocial: text("adresseSiegeSocial"),
  villeGreffe: varchar("villeGreffe", { length: 128 }),
  numeroRCS: varchar("numeroRCS", { length: 64 }),
  numeroOrias: varchar("numeroOrias", { length: 32 }),
  representantLegalNom: varchar("representantLegalNom", { length: 256 }),
  representantLegalFonction: varchar("representantLegalFonction", { length: 128 }),
  specialites: text("specialites"), // JSON array: ["credit_immo", "pro", "conso", "rachat"]

  // Réseau d'affiliation croisé (agent ou courtier parrain)
  parrainId: int("parrainId"),         // ID dans la table courtiers (si parrain est courtier)
  parrainAmbassadeurId: int("parrainAmbassadeurId"), // ID dans ambassadeurs (si parrain est agent)
  niveau: mysqlEnum("niveau", ["1", "2"]).default("1").notNull(),

  // Convention & signature électronique
  conventionSignee: boolean("conventionSignee").default(false).notNull(),
  dateSignature: timestamp("dateSignature"),
  signatureNom: varchar("signatureNom", { length: 256 }),
  conventionPdfUrl: text("conventionPdfUrl"),
  conventionPdfKey: varchar("conventionPdfKey", { length: 512 }),
  contratSigneUrl: text("contratSigneUrl"),
  contratSigneKey: varchar("contratSigneKey", { length: 512 }),

  // Statut interne
  statutInterne: mysqlEnum("statutInterne", [
    "en_attente", "actif", "suspendu", "resilie"
  ]).default("en_attente").notNull(),
  notesInternes: text("notesInternes"),

  // Code parrain unique pour le recrutement
  codeParrain: varchar("codeParrain", { length: 32 }),

  // Lien vers user (si le courtier se connecte au dashboard)
  userId: int("userId"),
  // Géolocalisation (calculée à partir de l'adresse)
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  // Régions / départements d'opération (JSON array ex: '["\u00cele-de-France","69"]')
  regionsOperation: text("regionsOperation"),
  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Courtier = typeof courtiers.$inferSelect;
export type InsertCourtier = typeof courtiers.$inferInsert;

// ─── DOSSIERS COURTAGE ────────────────────────────────────────────────────────

export const dossiersCourtagge = mysqlTable("dossiers_courtage", {
  id: int("id").autoincrement().primaryKey(),

  // Courtier apporteur
  courtierId: int("courtierId").notNull(),

  // Client
  clientNom: varchar("clientNom", { length: 256 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientTelephone: varchar("clientTelephone", { length: 32 }),

  // Dossier
  typeDossier: mysqlEnum("typeDossier", [
    "credit_immobilier", "credit_professionnel", "rachat_credit", "credit_conso", "autre"
  ]).notNull(),
  montantFinancement: int("montantFinancement"), // € demandé
  description: text("description"),

  // Résultat financier
  honorairesTotal: int("honorairesTotal"),       // € HT total encaissé par Sigma
  commissionSigmaHt: int("commissionSigmaHt"),   // 25% des honoraires = Part Sigma
  partCourtierHt: int("partCourtierHt"),         // 75% des honoraires
  dateEncaissement: varchar("dateEncaissement", { length: 32 }),

  // Statut
  statut: mysqlEnum("statut", [
    "nouveau", "en_cours", "en_attente_banque", "accepte", "refuse", "finalise", "annule"
  ]).default("nouveau").notNull(),
  notesInternes: text("notesInternes"),
  assigneA: varchar("assigneA", { length: 128 }), // membre équipe Sigma en charge

  // Commissions réseau générées (booléen pour savoir si déjà calculées)
  commissionsCalculees: boolean("commissionsCalculees").default(false).notNull(),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DossierCourtage = typeof dossiersCourtagge.$inferSelect;
export type InsertDossierCourtage = typeof dossiersCourtagge.$inferInsert;

// ─── COMMISSIONS RÉSEAU COURTAGE ──────────────────────────────────────────────

export const commissionsCourtage = mysqlTable("commissions_courtage", {
  id: int("id").autoincrement().primaryKey(),

  // Dossier source
  dossierCourtageId: int("dossierCourtageId").notNull(),

  // Bénéficiaire (peut être un courtier ou un ambassadeur/agent)
  beneficiaireType: mysqlEnum("beneficiaireType", ["courtier", "ambassadeur"]).notNull(),
  beneficiaireId: int("beneficiaireId").notNull(), // ID dans courtiers ou ambassadeurs

  // Calcul
  niveau: mysqlEnum("niveau", ["1", "2"]).notNull(),
  tauxPourcent: int("tauxPourcent").notNull(),  // 10 ou 5
  commissionSigmaHt: int("commissionSigmaHt").notNull(), // base de calcul (Part Sigma)
  montantHt: int("montantHt").notNull(),        // € HT calculé

  // Statut paiement
  statut: mysqlEnum("statut", ["a_payer", "facture_recue", "paye"]).default("a_payer").notNull(),
  datePaiement: varchar("datePaiement", { length: 32 }),
  reference: varchar("reference", { length: 128 }),

  // Validé par admin
  valideParAdmin: boolean("valideParAdmin").default(false).notNull(),
  valideParNom: varchar("valideParNom", { length: 128 }),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommissionCourtage = typeof commissionsCourtage.$inferSelect;
export type InsertCommissionCourtage = typeof commissionsCourtage.$inferInsert;

// ─── SALES CRM — CLOSERS ─────────────────────────────────────────────────────

export const closers = mysqlTable("closers", {
  id: int("id").autoincrement().primaryKey(),
  nom: varchar("nom", { length: 128 }).notNull(),
  prenom: varchar("prenom", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  actif: boolean("actif").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Closer = typeof closers.$inferSelect;
export type InsertCloser = typeof closers.$inferInsert;

// ─── SALES CRM — CLOSES ──────────────────────────────────────────────────────

export const closes = mysqlTable("closes", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id"),  // Regroupement des calls par email (R1→R2→Closé)

  // Closer (nom saisi manuellement, pas de compte)
  closerNom: varchar("closerNom", { length: 128 }).notNull(),

  // Lead contact
  leadNom: varchar("leadNom", { length: 256 }).notNull(),
  leadEmail: varchar("leadEmail", { length: 320 }),
  leadTelephone: varchar("leadTelephone", { length: 32 }),

  // Offre
  offre: mysqlEnum("offre", ["IDRH", "HZC", "SDT"]).notNull(),

  // Résultat de l'appel
  show: boolean("show").notNull(),                 // true = show, false = no-show
  pitche: boolean("pitche").default(false).notNull(), // pitché ou pas pitché
  resultat: mysqlEnum("resultat", ["close", "non_close", "r2", "perdu"]),  // résultat si show
  lienFathom: text("lienFathom"),

  // Formule vendue (si show + pitché)
  formule: mysqlEnum("formule", ["Starter", "Premium"]),

  // Mode de paiement
  modePaiement: mysqlEnum("modePaiement", ["une_fois", "deux_fois", "trois_fois"]),

  // Montants globaux (en centimes pour éviter les flottants)
  montantGenere: int("montantGenere").default(0).notNull(),   // € TTC généré
  montantEncaisse: int("montantEncaisse").default(0).notNull(), // € TTC encaissé

  // Détail par mode de paiement (en centimes)
  montantCb: int("montantCb"),                    // CB Stripe
  montantVirement: int("montantVirement"),         // Virement Qonto/Stripe
  montantCreditImpot: int("montantCreditImpot"),   // Crédit d'impôt
  montantPrelevement: int("montantPrelevement"),   // Prélèvement
  datePrelevement: varchar("datePrelevement", { length: 32 }),
  // Suivi encaissement différé (virement, crédit d'impôt)
  dateVirementPrevu: varchar("dateVirementPrevu", { length: 32 }),   // Date prévue du virement/crédit d'impôt
  statutEncaissement: mysqlEnum("statutEncaissement", ["en_attente", "initie", "recu"]).default("en_attente"),
  // Commentaire
  commentaire: text("commentaire"),

  // Date du call
  dateCall: timestamp("dateCall").defaultNow().notNull(),

  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Close = typeof closes.$inferSelect;
export type InsertClose = typeof closes.$inferInsert;

// ─── DOSSIERS FINANCEMENT (remplis par les leads) ───────────────────────────────
export const dossiersFinancement = mysqlTable("dossiers_financement", {
  id: int("id").autoincrement().primaryKey(),
  // Lien optionnel avec la fiche état civil
  leadId: int("leadId"),
  // Emprunteur 1
  emprunteur1Nom: varchar("emprunteur1Nom", { length: 255 }).notNull(),
  emprunteur1Prenom: varchar("emprunteur1Prenom", { length: 255 }).notNull(),
  emprunteur1DateNaissance: varchar("emprunteur1DateNaissance", { length: 32 }),
  emprunteur1Nationalite: varchar("emprunteur1Nationalite", { length: 128 }),
  emprunteur1SituationMatrimoniale: varchar("emprunteur1SituationMatrimoniale", { length: 64 }),
  emprunteur1NbEnfants: int("emprunteur1NbEnfants"),
  emprunteur1Proprietaire: boolean("emprunteur1Proprietaire").default(false),
  emprunteur1Activite: varchar("emprunteur1Activite", { length: 128 }),
  emprunteur1Anciennete: varchar("emprunteur1Anciennete", { length: 64 }),
  emprunteur1StatutPro: varchar("emprunteur1StatutPro", { length: 128 }),
  emprunteur1SalaireAvis2024: int("emprunteur1SalaireAvis2024"),
  emprunteur1SalaireAvis2025: int("emprunteur1SalaireAvis2025"),
  emprunteur1SalaireCumul2025: int("emprunteur1SalaireCumul2025"),
  emprunteur1SalaireNet2026: int("emprunteur1SalaireNet2026"),
  emprunteur1AutresRevenus: int("emprunteur1AutresRevenus"),
  emprunteur1AutresCharges: int("emprunteur1AutresCharges"),
  emprunteur1EpargneLiquide: int("emprunteur1EpargneLiquide"),
  emprunteur1EpargneNonLiquide: int("emprunteur1EpargneNonLiquide"),
  emprunteur1Apport: int("emprunteur1Apport"),
  // Emprunteur 2 (optionnel)
  emprunteur2Nom: varchar("emprunteur2Nom", { length: 255 }),
  emprunteur2Prenom: varchar("emprunteur2Prenom", { length: 255 }),
  emprunteur2DateNaissance: varchar("emprunteur2DateNaissance", { length: 32 }),
  emprunteur2Nationalite: varchar("emprunteur2Nationalite", { length: 128 }),
  emprunteur2Activite: varchar("emprunteur2Activite", { length: 128 }),
  emprunteur2Anciennete: varchar("emprunteur2Anciennete", { length: 64 }),
  emprunteur2StatutPro: varchar("emprunteur2StatutPro", { length: 128 }),
  emprunteur2SalaireAvis2024: int("emprunteur2SalaireAvis2024"),
  emprunteur2SalaireAvis2025: int("emprunteur2SalaireAvis2025"),
  emprunteur2SalaireCumul2025: int("emprunteur2SalaireCumul2025"),
  emprunteur2SalaireNet2026: int("emprunteur2SalaireNet2026"),
  emprunteur2EpargneLiquide: int("emprunteur2EpargneLiquide"),
  emprunteur2EpargneNonLiquide: int("emprunteur2EpargneNonLiquide"),
  emprunteur2Apport: int("emprunteur2Apport"),
  // Patrimoine immobilier (JSON array)
  patrimoineJson: text("patrimoineJson"),
  // Projet
  montantProjet: int("montantProjet").notNull(),
  duree: int("duree").notNull(),
  regimeFiscal: varchar("regimeFiscal", { length: 128 }),
  objetFinancement: varchar("objetFinancement", { length: 255 }),
  incidentsATD: boolean("incidentsATD").default(false),
  personneGarante: boolean("personneGarante").default(false),
  commentaire: text("commentaire"),
  // Statut interne (géré par Manon)
  statut: mysqlEnum("statut", ["nouveau", "en_cours", "assigne", "traite"]).default("nouveau").notNull(),
  noteManon: text("noteManon"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type DossierFinancement = typeof dossiersFinancement.$inferSelect;
export type InsertDossierFinancement = typeof dossiersFinancement.$inferInsert;

// ─── DOCUMENTS DOSSIER FINANCEMENT (joints par Manon avant envoi au courtier) ──────────────
export const docsDossierFinancement = mysqlTable("docs_dossier_financement", {
  id: int("id").autoincrement().primaryKey(),
  dossierFinancementId: int("dossierFinancementId").notNull(),
  nom: varchar("nom", { length: 255 }).notNull(),       // nom affiché (ex: "CNI recto")
  type: varchar("type", { length: 64 }).notNull(),       // "cni", "bulletin_salaire", "avis_imposition", "releve_bancaire", "autre"
  url: text("url").notNull(),                            // URL S3
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 64 }),
  size: int("size"),
  uploadePar: varchar("uploadePar", { length: 128 }),    // email de Manon
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export type DocDossierFinancement = typeof docsDossierFinancement.$inferSelect;
export type InsertDocDossierFinancement = typeof docsDossierFinancement.$inferInsert;

// ─── ASSIGNATIONS FINANCEMENT (Manon assigne un dossier à un courtier) ─────────────────
export const assignationsFinancement = mysqlTable("assignations_financement", {
  id: int("id").autoincrement().primaryKey(),
  dossierFinancementId: int("dossierFinancementId").notNull(),
  courtierId: int("courtierId").notNull(),
  // Statut du traitement par le courtier
  statut: mysqlEnum("statut", ["en_attente", "en_cours", "valide", "refuse"]).default("en_attente").notNull(),
  noteCourtier: text("noteCourtier"), // commentaire du courtier
  noteManon: text("noteManon"),       // commentaire de Manon sur cette assignation
  assignePar: varchar("assignePar", { length: 128 }), // email de Manon
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type AssignationFinancement = typeof assignationsFinancement.$inferSelect;
export type InsertAssignationFinancement = typeof assignationsFinancement.$inferInsert;

// ─── NOTIFICATIONS IN-APP ─────────────────────────────────────────────────────
export const notificationsInApp = mysqlTable("notifications_in_app", {
  id: int("id").autoincrement().primaryKey(),
  destinataireEmail: varchar("destinataireEmail", { length: 320 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  titre: varchar("titre", { length: 255 }).notNull(),
  message: text("message").notNull(),
  lien: varchar("lien", { length: 512 }),
  lu: boolean("lu").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export type NotificationInApp = typeof notificationsInApp.$inferSelect;
export type InsertNotificationInApp = typeof notificationsInApp.$inferInsert;

// ─── Feedbacks / Signalements ─────────────────────────────────────────────────────
export const feedbacks = mysqlTable("feedbacks", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["bug", "amelioration", "question", "autre"]).notNull().default("bug"),
  priorite: mysqlEnum("priorite", ["faible", "normale", "haute", "critique"]).notNull().default("normale"),
  titre: varchar("titre", { length: 255 }).notNull(),
  description: text("description").notNull(),
  page: varchar("page", { length: 255 }),
  auteur: varchar("auteur", { length: 255 }),
  email: varchar("email", { length: 255 }),
  statut: mysqlEnum("statut", ["nouveau", "en_cours", "resolu", "ignore"]).notNull().default("nouveau"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;

// ─── TRANSACTIONS COURTAGE (commissions partenaires courtiers) ────────────────
export const transactionsCourtage = mysqlTable("transactions_courtage", {
  id: int("id").autoincrement().primaryKey(),
  courtierId: int("courtierId").notNull(),
  leadNom: varchar("leadNom", { length: 255 }),
  dossierRef: varchar("dossierRef", { length: 255 }),
  // Étape 1 : enveloppe obtenue
  montantEnveloppe: int("montantEnveloppe"),
  dateEnveloppe: bigint("date_enveloppe", { mode: "number" }),
  // Étape 2 : commission finale (crédit validé)
  montantCommission: int("montantCommission"),
  dateValidation: bigint("date_validation", { mode: "number" }),
  // Répartition calculée automatiquement (75% courtier, 25% Sigma, 10%/5% parrainage sur part Sigma)
  partCourtier: int("partCourtier"),
  partParrainN1: int("partParrainN1"),
  partParrainN2: int("partParrainN2"),
  partSigma: int("partSigma"),
  parrainN1Id: int("parrainN1Id"),
  parrainN2Id: int("parrainN2Id"),
  // Statut validation Hanna
  statut: mysqlEnum("statut_tc", ["en_attente", "valide", "paiement_initie", "paye"]).default("en_attente").notNull(),
  noteHanna: text("noteHanna"),
  valideePar: varchar("valideePar", { length: 128 }),
  valideeAt: bigint("validee_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type TransactionCourtage = typeof transactionsCourtage.$inferSelect;
export type InsertTransactionCourtage = typeof transactionsCourtage.$inferInsert;

// ─── TRANSACTIONS IMMO (commissions partenaires agents) ───────────────────────
export const transactionsImmo = mysqlTable("transactions_immo", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  adresseBien: varchar("adresseBien", { length: 512 }),
  typeTransaction: mysqlEnum("type_transaction", ["vente", "location"]).default("vente").notNull(),
  montantHonoraires: int("montantHonoraires").notNull(),
  dateTransaction: bigint("date_transaction", { mode: "number" }),
  // Répartition calculée automatiquement (50% agent, 50% Sigma, 10%/5% parrainage sur part Sigma)
  partAgent: int("partAgent"),
  partParrainN1: int("partParrainN1"),
  partParrainN2: int("partParrainN2"),
  partSigma: int("partSigma"),
  parrainN1Id: int("parrainN1Id"),
  parrainN2Id: int("parrainN2Id"),
  // Statut validation Hanna
  statut: mysqlEnum("statut_ti", ["en_attente", "valide", "paiement_initie", "paye"]).default("en_attente").notNull(),
  noteHanna: text("noteHanna"),
  valideePar: varchar("valideePar", { length: 128 }),
  valideeAt: bigint("validee_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type TransactionImmo = typeof transactionsImmo.$inferSelect;
export type InsertTransactionImmo = typeof transactionsImmo.$inferInsert;

// ─── MATCHING DOSSIERS ────────────────────────────────────────────────────────
// Pipeline de suivi matching pour chaque lead en recherche de bien
export const matchingDossiers = mysqlTable("matching_dossiers", {
  id: int("id").autoincrement().primaryKey(),
  // Lead CRM concerné
  crmLeadId: int("crmLeadId").notNull(),
  // Bien sélectionné pour ce dossier (null = dossier en cours sans bien choisi)
  bienId: int("bienId"),
  // Pipeline de suivi
  statut: mysqlEnum("statut_md", [
    "en_cours",
    "proposition_1",
    "proposition_2",
    "proposition_3",
    "offre",
    "signature_notaire",
    "vendu",
    "abandonne",
  ]).default("en_cours").notNull(),
  // Critères d'élargissement sauvegardés
  modeElargi: int("modeElargi").default(0),
  criteresSup: text("criteresSup"), // JSON des overrides manuels
  // Notes internes Élodie
  notes: text("notes"),
  // Dates clés (timestamps ms)
  dateProposition: bigint("date_proposition", { mode: "number" }),
  dateOffre: bigint("date_offre", { mode: "number" }),
  dateSignature: bigint("date_signature", { mode: "number" }),
  dateVente: bigint("date_vente", { mode: "number" }),
  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MatchingDossier = typeof matchingDossiers.$inferSelect;
export type InsertMatchingDossier = typeof matchingDossiers.$inferInsert;

// ─── CRÉNEAUX BLOQUÉS ────────────────────────────────────────────────────────
export const blockedSlots = mysqlTable("blocked_slots", {
  id: int("id").autoincrement().primaryKey(),
  // Date au format YYYY-MM-DD
  date: varchar("date", { length: 10 }).notNull(),
  // Heure au format HH:MM (ex: "14:00") — null = journée entière bloquée
  heure: varchar("heure", { length: 5 }),
  // Type de RDV concerné : welcome_call, point_personnalise, ou null = tous
  typeRdv: mysqlEnum("typeRdv", ["welcome_call", "point_personnalise", "point_immobilier", "tous"]),
  // Raison optionnelle (congé, réunion, etc.)
  raison: varchar("raison", { length: 255 }),
  creePar: varchar("creePar", { length: 100 }).default("Maria"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type InsertBlockedSlot = typeof blockedSlots.$inferInsert;

// ─── HISTORIQUE DES FICHES BIENS PROPOSÉES AUX LEADS ─────────────────────────

export const bienPropositions = mysqlTable("bien_propositions", {
  id: int("id").autoincrement().primaryKey(),
  // Bien classique proposé (table biens) — null si bien off-market
  bienId: int("bienId"),
  // Bien off-market proposé (table off_market_biens) — null si bien classique
  offMarketBienId: int("offMarketBienId"),
  // Source : 'bien' | 'off_market'
  source: varchar("source", { length: 20 }).default("bien"),
  // Titre snapshot au moment de l'envoi (pour retrouver même si le bien est supprimé)
  bienTitreSnapshot: varchar("bienTitreSnapshot", { length: 512 }),
  // Lead destinataire (crm_leads)
  crmLeadId: int("crmLeadId").notNull(),
  // URL du PDF envoyé
  pdfUrl: varchar("pdfUrl", { length: 1024 }),
  // Message personnalisé envoyé avec la fiche
  messagePersonnalise: text("messagePersonnalise"),
  // Qui a envoyé (email de l'agent Sigma Factory)
  envoyePar: varchar("envoyePar", { length: 320 }),
  // Email du lead destinataire au moment de l'envoi
  emailDestinataire: varchar("emailDestinataire", { length: 320 }),
  // Statut : sent = envoyé, preview = prévisualisé seulement
  statut: mysqlEnum("statut_bp", ["sent", "preview"]).default("sent").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BienProposition = typeof bienPropositions.$inferSelect;
export type InsertBienProposition = typeof bienPropositions.$inferInsert;

// ─── TABLEAU DE COURTAGE ─────────────────────────────────────────────────────
export const tableauxCourtage = mysqlTable("tableaux_courtage", {
  id: int("id").autoincrement().primaryKey(),
  // Liens
  leadId: int("leadId"),
  mandatId: int("mandatId"),
  // Identité (préremplie)
  nom: varchar("nom", { length: 128 }).notNull(),
  prenoms: varchar("prenoms", { length: 256 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telephone: varchar("telephone", { length: 32 }).notNull(),
  // Situation professionnelle
  situationPro: mysqlEnum("situationPro", [
    "salarie_cdi", "salarie_cdd", "fonctionnaire", "independant",
    "chef_entreprise", "retraite", "sans_emploi", "autre"
  ]).notNull(),
  employeur: varchar("employeur", { length: 128 }),
  ancienneteEmploi: varchar("ancienneteEmploi", { length: 64 }),
  // Revenus acquéreur (mensuel net)
  salaireNet: int("salaireNet"),
  autresRevenus: int("autresRevenus"),
  natureAutresRevenus: varchar("natureAutresRevenus", { length: 256 }),
  // Revenus conjoint
  conjointSituationPro: mysqlEnum("conjointSituationPro", [
    "salarie_cdi", "salarie_cdd", "fonctionnaire", "independant",
    "chef_entreprise", "retraite", "sans_emploi", "autre", "non_applicable"
  ]).default("non_applicable"),
  conjointSalaireNet: int("conjointSalaireNet"),
  conjointAutresRevenus: int("conjointAutresRevenus"),
  // Charges mensuelles
  loyerActuel: int("loyerActuel"),
  creditImmobilier: int("creditImmobilier"),
  creditAuto: int("creditAuto"),
  creditConso: int("creditConso"),
  autresCharges: int("autresCharges"),
  // Apport et épargne
  apportPersonnel: int("apportPersonnel"),
  origineApport: mysqlEnum("origineApport", [
    "epargne_personnelle", "donation_familiale", "vente_bien",
    "participation_entreprise", "autre"
  ]),
  epargneResiduelle: int("epargneResiduelle"),
  // Situation bancaire
  banquePrincipale: varchar("banquePrincipale", { length: 128 }),
  incidentsFinanciers: mysqlEnum("incidentsFinanciers", ["oui", "non"]).default("non"),
  detailsIncidents: text("detailsIncidents"),
  // Financement souhaité
  montantEmprunte: int("montantEmprunte"),
  dureeEmprunt: int("dureeEmprunt"),
  accordBancaire: mysqlEnum("accordBancaire_tc", ["oui", "non", "en_cours"]).default("non"),
  nomBanqueAccord: varchar("nomBanqueAccord", { length: 128 }),
  montantAccord: int("montantAccord"),
  // Commentaires
  commentaires: text("commentaires"),
  // Métadonnées
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TableauCourtage = typeof tableauxCourtage.$inferSelect;
export type InsertTableauCourtage = typeof tableauxCourtage.$inferInsert;

// ─── LEAD ACTIVITIES — Timeline complète par lead ────────────────────────────
// Centralise TOUTES les actions sur un lead : notes manuelles, emails envoyés,
// RDV pris, changements d'étape, mises à jour importantes.
export const leadActivities = mysqlTable("lead_activities", {
  id: int("id").autoincrement().primaryKey(),
  // Lead concerné
  crmLeadId: int("crmLeadId").notNull(),
  // Type d'activité
  type: mysqlEnum("type", [
    "note",
    "email_envoye",
    "rdv_pris",
    "rdv_confirme",
    "etape_changee",
    "champ_modifie",
    "document",
    "appel",
    "autre",
  ]).notNull(),
  // Auteur de l'action (membre de l'équipe ou "Système" pour les automatiques)
  auteur: varchar("auteur", { length: 128 }).notNull().default("Système"),
  // Titre court de l'activité
  titre: varchar("titre", { length: 256 }).notNull(),
  // Contenu détaillé (note complète, corps de l'email, etc.)
  contenu: text("contenu"),
  // Métadonnée optionnelle (ex: ancienne étape → nouvelle étape)
  meta: text("meta"),
  // Date de l'activité
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = typeof leadActivities.$inferInsert;

// ─── BIENS OFF MARKET ────────────────────────────────────────────────────────
export const offMarketBiens = mysqlTable("off_market_biens", {
  id: int("id").autoincrement().primaryKey(),
  titre: varchar("titre", { length: 200 }).notNull(),
  typeBien: varchar("type_bien", { length: 100 }),
  region: varchar("region", { length: 100 }),
  departement: text("departement"),
  prixBien: int("prix_bien"),
  honoraires: int("honoraires"),
  travauxEstimation: int("travaux_estimation"),
  investissementTotal: int("investissement_total"),
  nbLots: int("nb_lots").default(0),
  lots: text("lots"),
  surfaceTotale: decimal("surface_totale", { precision: 10, scale: 2 }),
  rentabiliteBrute: decimal("rentabilite_brute", { precision: 5, scale: 2 }),
  rentabilitePotentielleLd: decimal("rentabilite_potentielle_ld", { precision: 5, scale: 2 }),
  rentabilitePotentielleCd: decimal("rentabilite_potentielle_cd", { precision: 5, scale: 2 }),
  revenusAnnuels: int("revenus_annuels"),
  revenusPotenlielsLd: int("revenus_potentiels_ld"),
  revenusPotentielsCd: int("revenus_potentiels_cd"),
  situation: text("situation"),
  images: text("images"),
  imagePrincipale: text("image_principale"),
  statut: mysqlEnum("statut", ["disponible", "sous_compromis", "vendu", "archive"]).default("disponible"),
  source: varchar("source", { length: 50 }).default("off_market"),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type OffMarketBien = typeof offMarketBiens.$inferSelect;
export type InsertOffMarketBien = typeof offMarketBiens.$inferInsert;

// ─── SOUMISSIONS COURTIER (suivi multi-courtiers par dossier) ────────────────
// Chaque ligne = un courtier contacté pour un lead CRM donné
export const courtierSoumissions = mysqlTable("courtier_soumissions", {
  id: int("id").autoincrement().primaryKey(),
  // Lead CRM concerné (étape courtage)
  crmLeadId: int("crmLeadId").notNull(),
  // Courtier contacté
  courtierNom: varchar("courtierNom", { length: 255 }).notNull(),
  courtierEmail: varchar("courtierEmail", { length: 320 }),
  courtierCabinet: varchar("courtierCabinet", { length: 255 }),
  // Date d'envoi du dossier
  dateEnvoi: bigint("dateEnvoi", { mode: "number" }).notNull(),
  // Réponse du courtier
  reponse: mysqlEnum("reponse", [
    "en_attente",      // Pas encore de réponse
    "ok_enveloppe",    // Accord de principe avec enveloppe
    "regroupement",    // Propose un regroupement de crédits
    "refus",           // Refus
    "sans_suite",      // Sans suite (pas de réponse après relance)
  ]).default("en_attente").notNull(),
  // Montant de l'enveloppe si réponse ok_enveloppe
  montantEnveloppe: int("montantEnveloppe"),
  // Courtier sélectionné comme attributaire final
  selectionne: boolean("selectionne").default(false).notNull(),
  // Notes libres de Manon sur cette soumission
  note: text("note"),
  // Résumé de la situation du client (rédigé par Manon lors du contact)
  resumeSituation: text("resumeSituation"),
  // URL du zip de documents envoyé au courtier (S3)
  zipDocumentsUrl: varchar("zipDocumentsUrl", { length: 1024 }),
  // URL du tableau de courtage PDF envoyé
  tableauCourtagePdfUrl: varchar("tableauCourtagePdfUrl", { length: 1024 }),
  // Qui a créé cette soumission
  creePar: varchar("creePar", { length: 128 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});
export type CourtierSoumission = typeof courtierSoumissions.$inferSelect;
export type InsertCourtierSoumission = typeof courtierSoumissions.$inferInsert;

// ─── FATHOM CALLS (webhook) ────────────────────────────────────────────────

export const fathomCalls = mysqlTable("fathom_calls", {
  id: int("id").autoincrement().primaryKey(),
  fathomRecordingId: varchar("fathomRecordingId", { length: 64 }),
  fathomCallId: varchar("fathomCallId", { length: 64 }),
  title: varchar("title", { length: 512 }),
  recordedBy: varchar("recordedBy", { length: 256 }),
  summary: text("summary"),
  actionItems: text("actionItems"),
  prospectName: varchar("prospectName", { length: 256 }),
  prospectEmail: varchar("prospectEmail", { length: 320 }),
  rdvType: varchar("rdvType", { length: 16 }),
  debrief: varchar("debrief", { length: 512 }),
  callUrl: varchar("callUrl", { length: 1024 }),
  callDate: timestamp("callDate"),
  rawPayload: text("rawPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FathomCall = typeof fathomCalls.$inferSelect;
export type InsertFathomCall = typeof fathomCalls.$inferInsert;

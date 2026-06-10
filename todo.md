# Sigma Factory — État Civil App TODO

- [x] Schéma BDD (table leads + documents)
- [x] Migration DB (pnpm db:push)
- [x] Design system noir et or (index.css + fonts)
- [x] Formulaire multi-étapes : Étape 1 — Identité personnelle
- [x] Formulaire multi-étapes : Étape 2 — Conjoint
- [x] Formulaire multi-étapes : Étape 3 — Mariage & régime matrimonial
- [x] Formulaire multi-étapes : Étape 4 — Situation familiale (divorce, PACS)
- [x] Formulaire multi-étapes : Étape 5 — Nationalité & documents
- [x] Upload sécurisé CNI/passeport/titre de séjour (S3)
- [x] Champs conditionnels dynamiques
- [x] Validation temps réel en français
- [x] Page de confirmation après soumission
- [x] Notification owner à chaque nouvelle soumission
- [x] Tableau de bord admin (route protégée)
- [x] Liste des leads avec recherche et filtres
- [x] Vue détaillée d'un lead
- [x] Export CSV/Excel
- [x] Tests vitest (8/8 passés)
- [x] Checkpoint final
- [x] Navbar commune sur les dashboards (État Civil + Custom Care)
- [x] Liens de navigation entre les deux espaces admin

## Mandat de Recherche (Onglet 3)
- [x] Table mandats_recherche dans schema.ts + db:push
- [x] Helpers DB pour mandats
- [x] Routes tRPC (create, list, getById, updateStatus)
- [x] Formulaire mandat multi-étapes (identité, bien recherché, budget, financement, critères)
- [x] Lien automatique post-soumission état civil vers formulaire mandat
- [x] Dashboard Hanna onglet Mandat de Recherche
- [x] AdminNav mis à jour avec 3 onglets
- [x] Tests vitest mandat (17/17 passés)
- [x] Checkpoint

## UX — Navigation & Liens croisés
- [x] Bouton retour vers /customcare/dashboard dans le formulaire Custom Care (header + page de confirmation)
- [x] Lien croisé dans le dashboard État Civil : afficher les mandats associés à un lead
- [x] Lien croisé dans le dashboard Mandats : afficher la fiche État Civil associée
- [x] Checkpoint

## Budget optionnel dans le Mandat de Recherche
- [x] Schéma DB : budgetMax devient nullable
- [x] Route tRPC submit : budgetMax optionnel (z.number().optional())
- [x] Formulaire : champ budget optionnel avec libellé et message contextuel courtage
- [x] Dashboard : afficher "À définir" si budget absent
- [x] Tests mis à jour (32/32 passés)
- [x] Checkpoint

## Module Hexa — Crédit d'impôt Sigma
- [x] Table hexa_dossiers dans schema.ts + db:push
- [x] Helpers DB + routes tRPC Hexa (create, list, getById, updateStatut)
- [x] Formulaire public /hexa (2 étapes : identité/montant + coordonnées)
- [x] Email notification Hanna + team à chaque nouveau dossier
- [x] Dashboard admin onglet Hexa (liste, fiche détail, gestion statut, lien paiement, export CSV)
- [x] AdminNav mis à jour avec 4 onglets
- [x] Tests vitest : 32/32 passés
- [x] Checkpoint

## Hexa — Suivi paiement (colonnes dashboard)

- [x] Champs DB : paiementInitie (boolean) + paiementRecu (boolean) + migration
- [x] Route tRPC updateStatut : accepter paiementInitie et paiementRecu
- [x] Dashboard : 2 colonnes toggle Paiement initié / Paiement reçu
- [x] Fiche détail : cases à cocher paiement initié / reçu
- [x] Checkpoint

## CRM Pipeline — Team Delivery
- [x] Table crm_leads dans schema.ts + db:push
- [x] Helpers DB + routes tRPC CRM (create, list, getById, updateEtape, addNote)
- [x] Vue Kanban 4 colonnes (Welcome Call / Courtage / Recherche bien / Sigma Crédit)
- [x] Fiche lead complète : données État Civil + Mandat + Hexa agrégées
- [x] Historique des étapes + notes internes par étape
- [x] AdminNav 5e onglet Pipeline
- [x] Tests vitest CRM (52/52 passés)
- [x] Checkpoint

## CRM Pipeline — Corrections & Améliorations
- [x] Corriger erreur React #31 dans LeadDetail (objet Date rendu comme texte)
- [x] Ajouter drag & drop entre colonnes Kanban
- [x] Ordre étapes : Sigma Crédit (Hanna) en 1er
- [x] Checkpoint

## Calendrier interne — Team Delivery
- [ ] Tables DB : calendar_tasks + migration
- [ ] Helpers DB + routes tRPC (create, list, update, delete)
- [ ] Page Calendrier : vue semaine + vue mois, couleurs par membre
- [ ] Filtres par membre (Maria=bleu, Manon=violet, Élodie=vert)
- [ ] Modal création/édition tâche : titre, date/heure, membre assigné, lead CRM lié, rappel
- [ ] Hanna peut créer des tâches pour n'importe quel membre
- [ ] Notifications email de rappel automatique
- [ ] Notification in-app (badge + toast)
- [ ] AdminNav 6e onglet Calendrier
- [ ] Tests vitest
- [ ] Checkpoint

## Kanban & Calendrier Maria — Corrections UI
- [x] Kanban Pipeline : mettre les 5 colonnes sur une seule ligne avec scroll horizontal
- [x] Calendrier : ajouter vue dédiée Maria (filtre Welcome Call + Point Personnalisé)

## Alertes email + notifs dashboard
- [ ] Configurer les adresses email par rôle (Maria, Manon, Élodie, Hanna, Owner)
- [ ] Email + notif : nouveau lead dans le Pipeline (responsable concerné + owner)
- [ ] Email + notif : changement d'étape dans le Pipeline (nouveau responsable + owner)
- [ ] Email + notif : nouvelle note ajoutée sur un lead (responsable + owner)
- [ ] Email + notif : assignation d'une tâche Calendrier (membre assigné + owner)
- [ ] Email + notif : rappel RDV Calendrier (membre assigné)
- [ ] Notifs in-app : badge compteur dans AdminNav + liste dans un panneau
- [ ] Données de test : leads CRM + RDV Maria Welcome Call + Point Personnalisé
- [ ] Tests vitest mis à jour
- [ ] Checkpoint

## Badges notifs + Export CSV
- [x] Badge rouge sur les onglets de navigation (compteur notifs non lues par page)
- [x] Bouton export CSV dans le Pipeline (étape, statut, responsable)

## Restriction d'accès Sigma Crédit (Hexa)
- [x] Ajouter un garde d'accès sur la page Hexa (Hanna/Direction uniquement)
- [x] Afficher un message d'erreur si un autre membre tente d'accéder

## Correction route Custom Care 404
- [x] Corriger la route Custom Care dans AdminNav (lien incorrect)
- [x] Vérifier que la route existe dans App.tsx

## Préparation démo équipe
- [x] Données de test Hexa (2-3 dossiers Sigma Crédit)
- [x] Données de test Custom Care (2-3 demandes)
- [x] Bouton "Planifier RDV" dans la fiche lead du Pipeline

## Tests workflow complet + données Mandats
- [x] Créer 3 mandats de recherche immobilière pour Élodie
- [x] Tester workflow : formulaire État Civil → Pipeline → RDV Calendrier

## Nouvelles étapes — Réseau & Commissions

- [x] Page de parrainage partageable /parrainage/:code (lien pré-rempli avec code parrain, CTA agent/courtier)
- [x] Tableau de bord commissions enrichi dans le portail membre (totaux, en attente, payé, historique mensuel)
- [x] Confirmation visuelle du parrain dans les formulaires d'inscription (badge vert + nom affiché)
- [x] Pré-remplissage automatique du code parrain via ?parrain=CODE dans l'URL
- [x] Procédure backend publique resoudreParrain (courtiers + ambassadeurs + email)

## Correction légale des pourcentages de rétrocommission

- [x] Agents immobiliers : 50% correcté dans PageParrainage, AmbassadeurOnboarding (accueil + contrat + article 3), contratGenerator.ts (PDF)
- [x] Courtiers : 75% conservé (déjà correct dans InscriptionCourtier + conventionCourtierGenerator.ts)
- [x] PageParrainage : 2 colonnes séparées Agent (50%) / Courtier (75%)

## Module Sales CRM — Closers

- [x] Table `closes` en BDD avec champs lead (nom, email, téléphone) + migration SQL directe
- [x] Procédures tRPC publique `sales.soumettre` (closers sans compte) + protégées `sales.stats`, `sales.liste`, `sales.supprimer`
- [x] Formulaire public `/sales/close` — tous les champs (closer, lead, offre, show/no-show, pitché, lien Fathom, formule, paiement, CB/virement/crédit impôt/prélèvement + date, commentaire, date call)
- [x] Dashboard financier `/dashboard/sales` — KPIs globaux + par closer (taux closing, no-show, CA TTC/HT, CA moyen)
- [x] Filtres quotidien / hebdomadaire / mensuel
- [x] Calcul HT 20% automatique
- [x] Calcul frais bancaires (CB Stripe 1.4%+0.25€, Virement 0.3%, Prélèvement 0.3%)
- [x] Graphiques recharts (CA par closer, calls Shows/No Shows/Closes par closer)
- [x] Alertes performance : taux closing < 20% ou no-show > 35% signalés en rouge avec icône
- [x] Accès dashboard réservé aux utilisateurs connectés (direction uniquement)
- [x] Formulaire de saisie accessible publiquement (closers sans compte)
- [x] 64/64 tests passés

## Sales CRM — Reste à encaisser + Prévisionnel + Design Premium

- [ ] Procédure tRPC : calcul reste à encaisser global + par closer
- [ ] Procédure tRPC : prévisionnel mensuel (timeline encaissements futurs basée sur modes de paiement)
- [ ] Dashboard : KPI "Reste à encaisser" + "Prévisionnel N+1/N+2/N+3"
- [ ] Graphique prévisionnel : timeline mensuelle encaissements attendus vs réalisés
- [ ] Refonte design dashboard or/noir premium (branding cohérent)
- [ ] Refonte design formulaire /sales/close (branding cohérent)

## Corrections Sales + Navigation + Suppression

- [ ] Retirer les champs frais bancaires du formulaire closer (calcul auto côté serveur)
- [ ] Activer la suppression dans tous les dashboards (Sales, Pipeline, Hexa, Mandats, État Civil)
- [x] Retirer les champs frais bancaires du formulaire closer (calcul auto côté serveur)
- [x] Activer la suppression dans tous les dashboards (Sales, Pipeline, Hexa, Mandats, État Civil)
- [x] Ajouter l'onglet Sales dans AdminNav

## Corrections UX — Navigation et suppression
- [ ] Bouton retour dans SalesDashboard (vers /dashboard)
- [ ] Bouton retour dans SalesClose (vers /dashboard/sales)
- [ ] Suppression dans CrmPipeline (leads)
- [ ] Vérifier suppression dans ReseauDashboard (ambassadeurs)
- [ ] Diagnostiquer les liens du tableau de nomenclature

## Corrections Pipeline — Ordre colonnes Kanban
- [x] Réorganiser les colonnes : Sigma Crédit → Welcome Call → Courtage → Point Personnalisé → Recherche de bien

## Sales Dashboard — Export CSV + Graphique CA + Filtres
- [x] Procédure tRPC sales.graphiqueCA (jour/semaine/mois/année) avec données CA généré/encaissé/closes
- [x] Procédure tRPC sales.exportCsv (filtrée par période + closer, CSV complet avec HT/frais)
- [x] Onglet Historique : filtres Aujourd'hui/Semaine/Mois/Année/Tout + filtre par closer + bouton Export CSV
- [x] Nouvel onglet "Graphique CA" avec sélecteur Jour/Semaine/Mois/Année, barres CA généré vs encaissé, courbe closes, tableau détail

## Landing Page d'accueil
- [ ] Page d'accueil / avec 4 parcours : client, agent (50% + parrainage), courtier (75% + parrainage), équipe interne + login
- [ ] Déplacer FormEtatCivil vers /etat-civil (garder alias / pour compatibilité)
- [ ] Branding or/noir premium, messages accrocheurs personnalisés par profil

## Système de triggers — Alertes retard partenaires
- [ ] Trigger courtier : dossier non traité > 72h → badge rouge sur carte + email Manon
- [ ] Trigger courtier : passage automatique statut "inactif" si > 72h sans traitement
- [ ] Trigger agent immo : aucun bien posé depuis X jours → badge rouge + email Élodie
- [ ] Trigger agent immo : passage automatique statut "inactif" si inactivité prolongée
- [ ] Dashboard Manon : indicateur rouge sur les courtiers en retard (colonne dédiée)
- [ ] Dashboard Élodie : indicateur rouge sur les agents en retard
- [ ] Portail courtier : bannière d'alerte si dossier en retard (> 72h)
- [ ] Portail agent : bannière d'alerte si inactivité détectée
- [ ] Cron job ou calcul à la volée pour détecter les retards

## Système de Triggers Automatiques (2026-04-04)

- [x] Routeur triggers.ts — checkRetardsCourtiers (dossiers non traités > 72h)
- [x] Routeur triggers.ts — declencherTriggerCourtier (suspend + notifie Manon)
- [x] Routeur triggers.ts — checkInactiviteAgents (agents sans bien > 30 jours)
- [x] Routeur triggers.ts — declencherTriggerAgent (suspend + notifie Élodie)
- [x] Routeur triggers.ts — reactiverCourtier / reactiverAgent
- [x] CourtiersDashboard — panneau d'alertes rouge courtiers en retard
- [x] ReseauDashboard — panneau d'alertes rouge agents inactifs
- [x] CourtierPortail — bannière orange (dossiers en retard) + rouge (compte suspendu)
- [x] PortailMembre — bannière rouge suspension (agent ou courtier)

## Gestion documentaire Custom Care — Bidirectionnelle (2026-04-04)

- [ ] Schéma BDD — table demandeDocuments (demandeId, url, fileKey, nom, taille, mimeType, envoyePar: lead|hanna, uploadedAt)
- [ ] Migration pnpm db:push
- [ ] Backend — procédure uploadDocument (S3 + DB) accessible lead et Hanna
- [ ] Backend — procédure listDocuments (par demandeId)
- [ ] Backend — procédure deleteDocument (Hanna uniquement)
- [ ] Backend — notification email Hanna quand lead joint un fichier
- [ ] Backend — notification email lead quand Hanna envoie un document
- [ ] Frontend CustomCareForm — section pièces jointes (input file, upload S3, liste fichiers joints)
- [ ] Frontend CustomCareDashboard — onglet/section documents dans le détail d'une demande
- [ ] Frontend CustomCareDashboard — bouton "Envoyer un document" côté Hanna
- [ ] Frontend CustomCareDashboard — affichage des documents reçus du lead

## Gestion documentaire Custom Care (bidirectionnelle)
- [x] Table demande_documents créée en BDD (migration SQL directe)
- [x] Backend : procédure uploadDocument (S3, lead + hanna)
- [x] Backend : procédure listDocuments (par demandeId)
- [x] Backend : procédure deleteDocument (admin/direction)
- [x] Email automatique à Hanna quand un lead joint un fichier
- [x] Email automatique au lead quand Hanna envoie un document
- [x] CustomCareForm : section pièces jointes avec drag & drop
- [x] CustomCareDashboard : section documents dans le panneau de détail
- [x] Hanna peut voir les documents du lead et en envoyer en retour

## Gestion documentaire Manon↔Courtiers et Élodie↔Agents
- [ ] Table courtier_documents créée en BDD
- [ ] Table agent_documents créée en BDD
- [ ] Backend : procédures upload/list/delete pour courtiers
- [ ] Backend : procédures upload/list/delete pour agents
- [ ] Portail courtier : section documents (envoyer à Manon + recevoir)
- [ ] Dashboard Manon : section documents dans le panneau courtier
- [ ] Portail agent : section documents (envoyer à Élodie + recevoir)
- [ ] Dashboard Élodie : section documents dans le panneau agent

## Documents partenaires bidirectionnels (Manon↔Courtiers / Élodie↔Agents)
- [x] Table courtier_documents créée en BDD (SQL direct)
- [x] Table agent_documents créée en BDD (SQL direct)
- [x] Routeur partnerDocs.ts avec procédures upload/list/delete
- [x] Fonctions email mailer (sendCourtierDocumentAlert, sendAgentDocumentAlert)
- [x] Composant réutilisable PartnerDocumentsSection
- [x] Portail courtier : onglet Documents (envoyer à Manon + recevoir de Manon)
- [x] Dashboard Manon : section documents dans panneau de détail courtier
- [x] Portail membre : onglet Documents (agent → Élodie / courtier → Manon)
- [x] Dashboard Élodie : section documents dans dialog de détail agent

## Notifications arrivée ambassadeur + UX parcours (2026-04-04)
- [x] Notifications in-app Manon à chaque nouveau courtier (type: nouveau_courtier)
- [x] Notifications in-app Élodie à chaque nouvel agent (type: nouvel_ambassadeur)
- [x] Email sendNouveauCourtierNotif → Manon + Owner
- [x] Email sendNouvelAmbassadeurNotif → Élodie + Owner
- [x] Email de bienvenue au courtier avec lien portail + convention PDF
- [x] Email de bienvenue à l'agent avec lien portail + contrat PDF
- [x] Page confirmation AmbassadeurOnboarding : code parrain + lien parrainage + bouton "Accéder à mon espace"
- [x] Page confirmation InscriptionCourtier : code parrain + lien parrainage + bouton "Accéder à mon espace courtier"

## Page /rejoindre + Onglet Mon réseau (2026-04-04)
- [ ] Page /rejoindre : route dédiée avec pré-remplissage code parrain (courtier ou agent)
- [ ] Page /rejoindre : choix du type (courtier / agent) avec redirection vers le bon formulaire
- [ ] Portail courtier : onglet "Mon réseau" — liste filleuls courtiers + agents + statuts + commissions
- [ ] Portail agent : onglet "Mon réseau" — liste filleuls + statuts + commissions générées
- [ ] Backend : procédure monReseau pour courtiers (filleuls + commissions parrainage)
- [ ] Backend : procédure monReseau pour agents (filleuls + commissions parrainage)

## Page /rejoindre + Onglet Mon réseau (complété)
- [x] Page /rejoindre?parrain=CODE avec pré-remplissage automatique du code parrain
- [x] Choix du type (Agent ou Courtier) sur la page /rejoindre
- [x] Affichage du nom du parrain sur la page /rejoindre
- [x] Onglet "Mon réseau" portail courtier : KPIs + lien rejoindre + filleuls agents + filleuls courtiers + historique commissions
- [x] Onglet "Mon réseau" portail agent : KPIs + lien rejoindre + filleuls agents + filleuls courtiers
- [x] Correction lien de parrainage : /rejoindre?parrain=CODE (au lieu de /parrainage/CODE)
- [x] Procédure backend monReseau pour courtiers (filleuls + commissions)
- [x] Procédure backend monReseau pour ambassadeurs (filleuls + commissions)
- [x] SalesClose: closer texte libre, supprimer nom lead, résultats enrichis, date+heure, détail CA

## Corrections SalesClose — Accès et doublons
- [ ] Supprimer bouton retour dashboard dans SalesClose (closers n'ont pas accès)
- [ ] Ajouter colonne leadId dans table closes (regroupement par email)
- [ ] Backend: lier R2 au même lead si email déjà connu, pas de doublon CA
- [ ] Dashboard Sales: afficher parcours R1→R2→Closé par lead

## Audit tunnel agent/courtier — 07/04/2026

- [ ] Corriger 404 /portail-membre (route manquante dans App.tsx → pointe vers /dashboard/portail)
- [ ] Corriger bouton "Ajouter aux favoris" ambassadeur (ouvre /portail-membre qui n'existe pas)
- [ ] Statut ambassadeur actif par défaut à l'inscription (pas "en_attente")
- [ ] Ajouter champs juridiques courtier : dénomination sociale, forme juridique, capital social, adresse siège, ville greffe RCS, numéro RCS, numéro ORIAS, représentant légal (nom/prénom/fonction)
- [ ] Mettre à jour formulaire InscriptionCourtier avec les nouveaux champs juridiques
- [ ] Formulaire dépôt documents bien immo (plaquette Élodie Basso) avec upload S3
- [ ] Stocker les docs bien immo dans la fiche lead (regroupement pièces)
- [ ] Vue compteur dossiers courtage pour Manon (envoi dossier + compteur par courtier)
- [ ] Fusionner onglet Ambassadeurs dans onglet Réseau (doublon)
- [ ] Notifications membres quand dépôt fichier ou note
- [ ] Fiche lead complète : paiement + historique + docs + formulaires + notes

## Géocodage automatique des adresses
- [x] Créer helper server/geocode.ts (Google Maps Geocoding API via proxy Manus)
- [x] Intégrer géocodage dans mutation création/mise à jour des ambassadeurs
- [x] Intégrer géocodage dans mutation création/mise à jour des courtiers
- [x] Intégrer géocodage dans mutation création/mise à jour des biens immobiliers
- [x] Géocoder les entrées existantes sans coordonnées GPS (procédure admin)

## Email bienvenue avec infos connexion
- [ ] Améliorer template email bienvenue agent (URL portail + instructions connexion)
- [ ] Améliorer template email bienvenue courtier (URL portail + instructions connexion)
- [ ] Ajouter procédure admin renvoyerEmailBienvenue (ambassadeur + courtier)
- [ ] Envoyer email récapitulatif à Mélanie et Jérôme

## Convention courtier avec signature électronique
- [ ] Ajouter étapes "Convention" + "Signature" dans InscriptionCourtier.tsx
- [ ] Rédiger le texte de la convention de partenariat courtier Sigma Factory
- [ ] Générer le PDF convention courtier côté serveur (router courtiers)
- [ ] Envoyer le PDF par email au courtier à l'inscription (noreply@fa.sigma-factory.fr)

## Page RDV publique Maria (Welcome Call / Point Personnalisé)
- [ ] Analyser le calendrier existant dans le dashboard
- [ ] Créer page /rdv publique : choix type (WC/PP) + sélection créneau
- [ ] Backend : procédure créerRdv (public) + lister créneaux disponibles
- [ ] Connecter réservation au calendrier dashboard Maria
- [ ] Notification email + in-app à Maria à chaque réservation
- [ ] Lien unique : https://sigmacivil-ds69focn.manus.space/rdv

## Dossier Courtage PDF pour Manon (2026-04-09)
- [ ] Créer table tableau_courtage dans schema.ts (revenus, charges, apport, situation bancaire)
- [ ] Migrer la table en base (SQL direct)
- [ ] Créer procédures tRPC saveTableauCourtage + getTableauCourtage
- [ ] Créer formulaire public /tableau-courtage (suite du parcours lead)
- [ ] Ajouter route dans App.tsx
- [ ] Créer pdfDossier.ts (état civil + mandat + tableau courtage, sans données Hexa)
- [ ] Ajouter procédure tRPC generateDossierPdf
- [ ] Ajouter bouton "Télécharger dossier PDF" dans la fiche CRM du lead


## Sourcing PAP — Biens de particuliers (2026-04-12)
- [ ] Migration BDD : ajouter champ `source` dans table `biens`, rendre `ambassadeurId` nullable
- [ ] Créer scraper PAP (top 50 quotidien, 60k-500k, national, particuliers uniquement)
- [ ] Job quotidien pour exécuter le scraper
- [ ] Gestion des biens disparus : marquer "vendu" ou "retire"
- [ ] Ajouter filtre "Source" dans ReseauDashboard
- [ ] Vérifier que le matching automatique inclut les biens scrappés
- [ ] Restreindre l'accès aux biens scrappés à l'équipe uniquement (Hanna, Maria, Manon, Elodie, Othmane)
- [ ] Tester le système complet en production


## Statut Paiement Initié dans GESTION INTERNE
- [ ] Ajouter option "Paiement initié" au dropdown Statut dans GESTION INTERNE
- [ ] Synchroniser avec section SUIVI PAIEMENT
- [ ] Tester et déployer en production


## Corrections Urgentes (2026-04-13)
- [x] Ajouter statut "Paiement initié" au dropdown GESTION INTERNE (HexaDashboard)
- [x] Ajouter colonne urlSource à table biens
- [x] Changer ambassadeurs.list de protectedProcedure à publicProcedure
- [x] Changer ambassadeurs.listBiens de protectedProcedure à publicProcedure
- [x] Tester que les données s'affichent correctement (4 ambassadeurs, 43 biens)


## Téléchargement Contrat Courtier
- [x] Ajouter champ contratSigneUrl à table courtiers
- [x] Ajouter bouton "Télécharger contrat" dans fiche courtier
- [x] Tester en production


## Notifications Custom Care
- [x] Ajouter champ createdBy à table demandes
- [x] Ajouter notifications in-app quand quelqu'un est assigné
- [x] Afficher le créateur dans la fiche Custom Care
- [x] Ajouter Hanna à la liste des membres notifiés
- [x] Tester notifications en production

## RDV Elodie — Prise de RDV Immo (2026-04-14)
- [x] Étendre bookRdv côté serveur pour supporter le type "point_immobilier" assigné à Elodie
- [x] Créer la page publique /rdv/point-immobilier (PriseRdvElodie) avec les créneaux Elodie
- [x] Ajouter la route /rdv/point-immobilier dans App.tsx
- [x] Intégrer le lien de RDV Elodie dans les emails Courtage (enveloppe de financement obtenue)

## Mail Point Immobilier — Aperçu & Déclenchement Manuel

- [x] Créer une page d'aperçu HTML du mail Point Immobilier (/mail-preview/point-immobilier)
- [x] Ajouter une procédure tRPC sendPointImmobilierEmail pour l'envoi manuel
- [x] Ajouter un bouton "Envoyer mail Point Immobilier" dans RechercheBienBoard
- [x] Tester l'envoi en live

## Biens Off Market
- [ ] Extraire photos et données des 26 biens depuis Excel
- [ ] Créer table off_market_biens en BDD
- [ ] Créer procédures tRPC CRUD off market
- [ ] Créer page OffMarketBoard (liste + fiche détail)
- [ ] Supprimer adresse dans PDFs envoyés aux leads (PAP, Ambassadeur, Off Market)

## Correction doubles RDV + Blocage créneaux perso Élodie (2026-04-15)
- [ ] Empêcher les doubles réservations : vérifier les RDV existants dans calendar_tasks avant de confirmer bookRdv
- [ ] Masquer les créneaux déjà pris dans PriseRdvElodie.tsx (requête publique getBookedSlotsByDate)
- [ ] Permettre à Élodie de bloquer des créneaux perso depuis son dashboard (addBlockedSlot avec typeRdv=point_immobilier)


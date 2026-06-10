import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PartnerDocumentsSection from "@/components/PartnerDocumentsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText, Users, TrendingUp, Plus, Clock, AlertCircle,
  FolderOpen, Download, Eye, ChevronDown, ChevronUp, CheckCircle, XCircle, Inbox, Euro,
  AlertTriangle, MapPin, X
} from "lucide-react";

const REGIONS_FRANCE = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire",
  "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie",
  "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  "Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"
];

const TYPE_LABELS: Record<string, string> = {
  credit_immobilier: "Crédit immobilier",
  credit_professionnel: "Crédit professionnel",
  rachat_credit: "Rachat de crédit",
  credit_conso: "Crédit consommation",
  autre: "Autre",
};

const STATUT_COLORS: Record<string, string> = {
  nouveau: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  en_cours: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  en_attente_banque: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  accepte: "bg-green-500/10 text-green-400 border-green-500/20",
  refuse: "bg-red-500/10 text-red-400 border-red-500/20",
  finalise: "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20",
  annule: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const ASSIGNATION_STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  en_cours: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  valide: "bg-green-500/10 text-green-400 border-green-500/20",
  refuse: "bg-red-500/10 text-red-400 border-red-500/20",
};
const ASSIGNATION_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  valide: "Validé",
  refuse: "Refusé",
};

// ─── Bouton Contacter Manon (assignation bidirectionnelle courtier → Manon) ────
function ContactManonButton({ courtierId, courtierNom }: { courtierId?: number; courtierNom: string }) {
  const [open, setOpen] = useState(false);
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const createTask = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success("Demande envoyée à Manon !");
      setOpen(false); setSujet(""); setMessage("");
    },
    onError: (e) => toast.error(e.message),
  });
  const handleSubmit = () => {
    if (!sujet.trim()) { toast.error("Veuillez indiquer un sujet"); return; }
    const now = new Date();
    const debut = new Date(now.getTime() + 24 * 60 * 60 * 1000); // demain
    debut.setHours(10, 0, 0, 0);
    createTask.mutate({
      titre: `Courtier ${courtierNom} — ${sujet}`,
      assigneA: "Manon",
      dateDebut: debut.toISOString(),
      touteJournee: false,
      description: message || `Demande de contact de ${courtierNom}`,
      rappelEmail: true,
      rappelMinutesAvant: 30,
      statut: "a_faire",
    });
  };
  return (
    <div className="bg-[#111] border border-[#C9A84C]/30 p-3 mb-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#C9A84C] font-semibold text-sm">Contacter Manon</p>
          <p className="text-gray-500 text-xs">Créer une tâche dans le calendrier de Manon</p>
        </div>
        <Button size="sm" onClick={() => setOpen(!open)} className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold text-xs">
          {open ? "Annuler" : "Envoyer une demande"}
        </Button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Sujet *</Label>
            <Input value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Ex: Question sur le dossier Dupont" className="bg-black border-gray-700 text-white text-sm" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Message (optionnel)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Détails de votre demande..." className="bg-black border-gray-700 text-white text-sm" rows={2} />
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={createTask.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold text-xs w-full">
            {createTask.isPending ? "Envoi..." : "Envoyer à Manon"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Carte dossier reçu de Manon ─────────────────────────────────────────────
function DossierRecuCard({ item, onRefetch }: { item: any; onRefetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(item.assignation.noteCourtier ?? "");
  const [statut, setStatut] = useState(item.assignation.statut);
  const utils = trpc.useUtils();

  const updateMutation = trpc.financement.updateAssignation.useMutation({
    onSuccess: () => {
      toast.success("Statut mis à jour");
      utils.financement.mesAssignations.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const dossier = item.dossier;
  if (!dossier) return null;

  return (
    <div className="bg-[#111] border border-gray-800 overflow-hidden">
      {/* Ligne principale */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">
              {dossier.emprunteur1Prenom} {dossier.emprunteur1Nom}
            </span>
            <Badge className={`text-xs border ${ASSIGNATION_STATUT_COLORS[item.assignation.statut] ?? ""}`}>
              {ASSIGNATION_STATUT_LABELS[item.assignation.statut] ?? item.assignation.statut}
            </Badge>
            {item.docs?.length > 0 && (
              <span className="text-xs text-[#C9A84C] flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {item.docs.length} doc(s) joint(s)
              </span>
            )}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">
            {dossier.montantProjet?.toLocaleString("fr-FR")} € · {dossier.duree} mois · apport {dossier.apportPersonnel?.toLocaleString("fr-FR")} €
          </div>
        </div>
        <div className="text-xs text-gray-600">
          {new Date(item.assignation.createdAt).toLocaleDateString("fr-FR")}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </div>

      {/* Détail expandé */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-5 bg-[#0d0d0d]">
          {/* Infos emprunteur */}
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Emprunteur principal</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Nom complet", value: `${dossier.emprunteur1Prenom} ${dossier.emprunteur1Nom}` },
                { label: "Date de naissance", value: dossier.emprunteur1DateNaissance ?? "—" },
                { label: "Nationalité", value: dossier.emprunteur1Nationalite ?? "—" },
                { label: "Situation matrimoniale", value: dossier.emprunteur1SituationMatrimoniale ?? "—" },
                { label: "Activité", value: dossier.emprunteur1Activite ?? "—" },
                { label: "Statut pro", value: dossier.emprunteur1StatutPro ?? "—" },
                { label: "Revenus nets/mois", value: dossier.emprunteur1RevenusMensuelsNets ? `${dossier.emprunteur1RevenusMensuelsNets.toLocaleString("fr-FR")} €` : "—" },
                { label: "Charges mensuelles", value: dossier.chargesMensuelles ? `${dossier.chargesMensuelles.toLocaleString("fr-FR")} €` : "—" },
                { label: "Nb enfants", value: dossier.emprunteur1NbEnfants?.toString() ?? "—" },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-gray-600 mb-0.5">{f.label}</p>
                  <p className="text-white text-sm">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Co-emprunteur si présent */}
          {dossier.emprunteur2Nom && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Co-emprunteur</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Nom complet", value: `${dossier.emprunteur2Prenom ?? ""} ${dossier.emprunteur2Nom}` },
                  { label: "Activité", value: dossier.emprunteur2Activite ?? "—" },
                  { label: "Revenus nets/mois", value: dossier.emprunteur2RevenusMensuelsNets ? `${dossier.emprunteur2RevenusMensuelsNets.toLocaleString("fr-FR")} €` : "—" },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-600 mb-0.5">{f.label}</p>
                    <p className="text-white text-sm">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projet */}
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Projet immobilier</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Montant projet", value: dossier.montantProjet ? `${dossier.montantProjet.toLocaleString("fr-FR")} €` : "—" },
                { label: "Apport personnel", value: dossier.apportPersonnel ? `${dossier.apportPersonnel.toLocaleString("fr-FR")} €` : "—" },
                { label: "Durée", value: dossier.duree ? `${dossier.duree} mois` : "—" },
                { label: "Taux envisagé", value: dossier.tauxEnvisage ? `${dossier.tauxEnvisage}%` : "—" },
                { label: "Type de bien", value: dossier.typeBien ?? "—" },
                { label: "Localisation", value: dossier.localisationBien ?? "—" },
                { label: "Usage", value: dossier.usageBien ?? "—" },
                { label: "Loyers HC", value: dossier.loyersHC ? `${dossier.loyersHC.toLocaleString("fr-FR")} €` : "—" },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-gray-600 mb-0.5">{f.label}</p>
                  <p className="text-white text-sm">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents joints */}
          {item.docs && item.docs.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Documents joints par Manon</p>
              <div className="space-y-1">
                {item.docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between bg-black p-2 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#C9A84C]" />
                      <span className="text-white text-xs">{doc.nom}</span>
                      <span className="text-gray-600 text-xs uppercase">{doc.type}</span>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#C9A84C] text-xs hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voir
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note de Manon */}
          {item.assignation.noteManon && (
            <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/20 p-3 rounded">
              <p className="text-xs text-[#C9A84C] font-semibold mb-1">Note de Manon</p>
              <p className="text-gray-300 text-sm italic">"{item.assignation.noteManon}"</p>
            </div>
          )}

          {/* Mettre à jour le statut */}
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Votre retour</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "en_attente", label: "En attente", color: "border-yellow-500/40 hover:bg-yellow-500/10 hover:text-yellow-400" },
                { value: "en_cours", label: "En cours", color: "border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400" },
                { value: "valide", label: "Validé ✅", color: "border-green-500/40 hover:bg-green-500/10 hover:text-green-400" },
                { value: "refuse", label: "Refusé ❌", color: "border-red-500/40 hover:bg-red-500/10 hover:text-red-400" },
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatut(s.value)}
                  className={`px-3 py-1.5 text-xs rounded border transition-all ${
                    statut === s.value
                      ? "border-[#C9A84C] bg-[#C9A84C]/20 text-[#C9A84C]"
                      : `border-gray-700 text-gray-400 ${s.color}`
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Votre note pour Manon (facultatif)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-black border-gray-700 text-white text-sm resize-none"
              rows={2}
            />
            <Button
              size="sm"
              className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold"
              onClick={() => updateMutation.mutate({
                assignationId: item.assignation.id,
                statut: statut as any,
                noteCourtier: note || undefined,
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Envoi..." : "Enregistrer le retour"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CourtierPortail() {
  const [activeTab, setActiveTab] = useState<"dossiers" | "recus" | "reseau" | "commissions" | "documents" | "demandes" | "profil">("recus");
  const [mesRegions, setMesRegions] = useState<string[]>([]);
  const updateMesRegions = trpc.courtiers.updateMesRegions.useMutation({
    onSuccess: () => toast.success("Régions mises à jour !"),
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // ─── Mes demandes à Manon ─────────────────────────────────────────────────────
  const { data: mesDemandes = [], refetch: refetchDemandes } = trpc.calendar.mesDemandes.useQuery(
    { assigneA: "Manon" },
    { enabled: activeTab === "demandes" }
  );
  // ─── Formulaire déclaration commission ───────────────────────────────────────
  const [showDeclarer, setShowDeclarer] = useState(false);
  const [declForm, setDeclForm] = useState({
    leadNom: "", dossierRef: "",
    montantEnveloppe: "", montantCommission: "",
  });
  // Calcul preview en temps réel
  const montantComm = parseInt(declForm.montantCommission) || 0;
  const previewCourtier = Math.round(montantComm * 0.75);
  const previewSigma = montantComm - previewCourtier;
  const previewParrainN1 = Math.round(previewSigma * 0.10);
  const previewParrainN2 = Math.round(previewSigma * 0.05);
  const previewSigmaNet = previewSigma - previewParrainN1 - previewParrainN2;
  const [showNewDossier, setShowNewDossier] = useState(false);
  const [newDossier, setNewDossier] = useState({
    clientNom: "", clientEmail: "", clientTelephone: "",
    typeDossier: "" as any, montantFinancement: "", description: "",
  });

  const { data: profil } = trpc.courtiers.monProfil.useQuery();
  // Initialiser les régions depuis le profil
  const [regionsInitialized, setRegionsInitialized] = useState(false);
  if (profil && !regionsInitialized) {
    if ((profil as any).regionsOperation) {
      try { setMesRegions(JSON.parse((profil as any).regionsOperation)); } catch {}
    }
    setRegionsInitialized(true);
  }
  const { data: dossiers = [], refetch: refetchDossiers } = trpc.courtiers.dossiers.list.useQuery(
    { courtierId: profil?.id },
    { enabled: !!profil?.id }
  );
  // Transactions commissions (nouveau module)
  const { data: transactionsCourtage = [], refetch: refetchTransactions } = trpc.commissions.listTransactionsCourtage.useQuery(
    { courtierId: profil?.id },
    { enabled: !!profil?.id }
  );
  const creerTransactionMut = trpc.commissions.creerTransactionCourtage.useMutation({
    onSuccess: () => { toast.success("Commission déclarée !"); setShowDeclarer(false); setDeclForm({ leadNom: "", dossierRef: "", montantEnveloppe: "", montantCommission: "" }); refetchTransactions(); },
    onError: (e) => toast.error(e.message),
  });
  // Legacy commissions réseau
  const { data: commissions = [] } = trpc.courtiers.commissions.list.useQuery(
    { beneficiaireType: "courtier", beneficiaireId: profil?.id },
    { enabled: !!profil?.id }
  );
  const { data: detail } = trpc.courtiers.getById.useQuery(
    { id: profil?.id! },
    { enabled: !!profil?.id }
  );
  const { data: assignations = [], refetch: refetchAssignations } = trpc.financement.mesAssignations.useQuery(
    undefined,
    { enabled: activeTab === "recus" }
  );

  const createDossier = trpc.courtiers.dossiers.create.useMutation({
    onSuccess: () => {
      toast.success("Dossier créé avec succès");
      setShowNewDossier(false);
      setNewDossier({ clientNom: "", clientEmail: "", clientTelephone: "", typeDossier: "" as any, montantFinancement: "", description: "" });
      refetchDossiers();
    },
    onError: (e) => toast.error(e.message),
  });

  // Mon réseau (filleuls + commissions parrainage)
  const { data: monReseau } = trpc.courtiers.monReseau.useQuery(
    undefined,
    { enabled: activeTab === "reseau" }
  );

  const totalCommissions = commissions.reduce((s: number, c: any) => s + c.montantHt, 0);
  const commissionsPayees = commissions.filter((c: any) => c.statut === "paye").reduce((s: number, c: any) => s + c.montantHt, 0);

  const nbNouveauxRecus = assignations.filter((a: any) => a.assignation.statut === "en_attente").length;

  if (!profil) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <div className="bg-[#111] border border-gray-800 p-12 max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-[#C9A84C] mx-auto mb-4" />
            <h2 className="text-white font-bold text-lg mb-2">Profil courtier non trouvé</h2>
            <p className="text-gray-500 text-sm mb-6">
              Votre compte n'est pas encore lié à un profil courtier.
              Inscrivez-vous via le formulaire de partenariat.
            </p>
            <a href="/inscription-courtier" className="inline-block bg-[#C9A84C] text-black font-bold px-6 py-2 hover:bg-[#b8943e]">
              S'inscrire comme courtier
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Dossiers en retard (assignés mais non traités depuis > 72h)
  const dossiersEnRetard = assignations.filter((a: any) => {
    if (a.assignation.statut !== "en_attente") return false;
    const assignedAt = new Date(a.assignation.createdAt).getTime();
    return Date.now() - assignedAt > 72 * 60 * 60 * 1000;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Bannière suspension */}
        {profil.statutInterne === "suspendu" && (
          <div className="border border-red-500/60 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-bold text-sm">Compte suspendu</p>
              <p className="text-red-300 text-xs mt-0.5">Votre compte a été suspendu automatiquement suite à des dossiers non traités. Contactez Manon pour réactiver votre accès.</p>
            </div>
          </div>
        )}
        {/* Bannière dossiers en retard */}
        {dossiersEnRetard.length > 0 && profil.statutInterne !== "suspendu" && (
          <div className="border border-orange-500/60 bg-orange-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-400 font-bold text-sm">{dossiersEnRetard.length} dossier(s) en retard — plus de 72h sans traitement</p>
              <p className="text-orange-300 text-xs mt-0.5">Veuillez traiter ces dossiers rapidement pour éviter la suspension de votre compte. Allez dans l'onglet "Dossiers reçus".</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Mon espace courtier</h1>
            <p className="text-[#C9A84C] text-sm mt-1">{profil.prenom} {profil.nom} {profil.cabinetNom ? `— ${profil.cabinetNom}` : ""}</p>
          </div>
          <Badge className={`border ${profil.statutInterne === "actif" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
            {profil.statutInterne === "actif" ? "Actif" : "En attente de validation"}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#111] border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <Inbox className="w-7 h-7 text-[#C9A84C]" />
              <div>
                <div className="text-2xl font-black text-white">{assignations.length}</div>
                <div className="text-gray-500 text-xs">Dossiers reçus</div>
              </div>
            </div>
          </div>
          <div className="bg-[#111] border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-7 h-7 text-yellow-400" />
              <div>
                <div className="text-2xl font-black text-white">{dossiers.filter((d: any) => ["nouveau", "en_cours", "en_attente_banque"].includes(d.statut)).length}</div>
                <div className="text-gray-500 text-xs">Mes dossiers en cours</div>
              </div>
            </div>
          </div>
          <div className="bg-[#111] border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <Users className="w-7 h-7 text-blue-400" />
              <div>
                <div className="text-2xl font-black text-white">{detail?.stats.totalFilleuls ?? 0}</div>
                <div className="text-gray-500 text-xs">Filleuls réseau</div>
              </div>
            </div>
          </div>
          <div className="bg-[#111] border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-green-400" />
              <div>
                <div className="text-xl font-black text-white">
                  {(totalCommissions / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </div>
                <div className="text-gray-500 text-xs">Commissions réseau</div>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 border-b border-gray-800">
          {[
            { key: "recus", label: "Dossiers reçus", icon: <Inbox className="w-4 h-4" />, badge: nbNouveauxRecus },
            { key: "dossiers", label: "Mes dossiers", icon: <FolderOpen className="w-4 h-4" /> },
            { key: "commissions", label: "Mes commissions", icon: <Euro className="w-4 h-4" /> },
            { key: "reseau", label: "Réseau & Commissions", icon: <TrendingUp className="w-4 h-4" /> },
            { key: "documents", label: "Documents", icon: <FileText className="w-4 h-4" /> },
            { key: "demandes", label: "Mes demandes", icon: <AlertTriangle className="w-4 h-4" /> },
            { key: "profil", label: "Mon profil", icon: <MapPin className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Dossiers reçus ── */}
        {activeTab === "recus" && (
          <div className="space-y-3">
            {/* Bouton Contacter Manon */}
            <ContactManonButton courtierId={profil?.id} courtierNom={profil ? `${profil.prenom} ${profil.nom}` : ""} />
            {assignations.length === 0 ? (
              <div className="bg-[#111] border border-gray-800 p-12 text-center">
                <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                <p className="text-gray-500">Aucun dossier reçu pour l'instant</p>
                <p className="text-gray-600 text-xs mt-1">Manon vous assignera des dossiers de courtage ici</p>
              </div>
            ) : (
              assignations.map((item: any) => (
                <DossierRecuCard key={item.assignation.id} item={item} onRefetch={refetchAssignations} />
              ))
            )}
          </div>
        )}

        {/* ── Onglet Mes dossiers ── */}
        {activeTab === "dossiers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Mes dossiers clients</h2>
              <Button
                size="sm"
                onClick={() => setShowNewDossier(!showNewDossier)}
                className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold gap-1"
              >
                <Plus className="w-3 h-3" />
                Nouveau dossier
              </Button>
            </div>

            {showNewDossier && (
              <div className="bg-[#111] border border-[#C9A84C]/30 p-4 space-y-3">
                <h3 className="text-[#C9A84C] font-bold text-sm">Nouveau dossier client</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Nom du client *</Label>
                    <Input value={newDossier.clientNom} onChange={e => setNewDossier(f => ({ ...f, clientNom: e.target.value }))} className="bg-black border-gray-700 text-white text-sm" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Type de dossier *</Label>
                    <Select value={newDossier.typeDossier} onValueChange={v => setNewDossier(f => ({ ...f, typeDossier: v as any }))}>
                      <SelectTrigger className="bg-black border-gray-700 text-white text-sm"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent className="bg-[#111] border-gray-700">
                        {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Email client</Label>
                    <Input type="email" value={newDossier.clientEmail} onChange={e => setNewDossier(f => ({ ...f, clientEmail: e.target.value }))} className="bg-black border-gray-700 text-white text-sm" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Montant financement (€)</Label>
                    <Input type="number" value={newDossier.montantFinancement} onChange={e => setNewDossier(f => ({ ...f, montantFinancement: e.target.value }))} className="bg-black border-gray-700 text-white text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowNewDossier(false)} className="border-gray-700 text-gray-400">Annuler</Button>
                  <Button
                    size="sm"
                    disabled={!newDossier.clientNom || !newDossier.typeDossier || createDossier.isPending}
                    onClick={() => createDossier.mutate({
                      courtierId: profil.id,
                      clientNom: newDossier.clientNom,
                      clientEmail: newDossier.clientEmail || undefined,
                      clientTelephone: newDossier.clientTelephone || undefined,
                      typeDossier: newDossier.typeDossier,
                      montantFinancement: newDossier.montantFinancement ? parseInt(newDossier.montantFinancement) * 100 : undefined,
                    })}
                    className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold"
                  >
                    Créer le dossier
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-[#111] border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 p-3">Client</th>
                    <th className="text-left text-xs text-gray-500 p-3">Type</th>
                    <th className="text-left text-xs text-gray-500 p-3">Montant</th>
                    <th className="text-left text-xs text-gray-500 p-3">Statut</th>
                    <th className="text-left text-xs text-gray-500 p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-600 py-10 text-sm">Aucun dossier</td></tr>
                  )}
                  {dossiers.map((d: any) => (
                    <tr key={d.id} className="border-b border-gray-800/50 hover:bg-[#1a1a1a]">
                      <td className="p-3">
                        <div className="text-white text-sm font-medium">{d.clientNom}</div>
                        {d.clientEmail && <div className="text-gray-600 text-xs">{d.clientEmail}</div>}
                      </td>
                      <td className="p-3 text-gray-400 text-xs">{TYPE_LABELS[d.typeDossier] || d.typeDossier}</td>
                      <td className="p-3 text-gray-400 text-sm">{d.montantFinancement ? `${(d.montantFinancement / 100).toLocaleString("fr-FR")} €` : "—"}</td>
                      <td className="p-3">
                        <Badge className={`text-xs border ${STATUT_COLORS[d.statut] || ""}`}>{d.statut.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="p-3 text-gray-600 text-xs">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Onglet Mes commissions ── */}
        {activeTab === "commissions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Mes commissions courtage</h3>
              <Button onClick={() => setShowDeclarer(v => !v)} className="bg-[#C9A84C] text-black hover:bg-[#b8943d] text-sm">
                <Plus className="w-4 h-4 mr-1" /> Déclarer une commission
              </Button>
            </div>

            {/* Formulaire déclaration */}
            {showDeclarer && (
              <div className="bg-[#111] border border-[#C9A84C]/30 p-4 space-y-3">
                <h4 className="text-[#C9A84C] font-semibold text-sm">Nouvelle déclaration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs">Nom du lead / client</Label>
                    <Input value={declForm.leadNom} onChange={e => setDeclForm(f => ({ ...f, leadNom: e.target.value }))} placeholder="Ex: Jean Dupont" className="bg-black border-gray-700 text-white text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Référence dossier (optionnel)</Label>
                    <Input value={declForm.dossierRef} onChange={e => setDeclForm(f => ({ ...f, dossierRef: e.target.value }))} placeholder="Ex: DOC-2024-001" className="bg-black border-gray-700 text-white text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Montant enveloppe obtenue (€)</Label>
                    <Input type="number" value={declForm.montantEnveloppe} onChange={e => setDeclForm(f => ({ ...f, montantEnveloppe: e.target.value }))} placeholder="Ex: 250000" className="bg-black border-gray-700 text-white text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Commission totale reçue (€) *</Label>
                    <Input type="number" value={declForm.montantCommission} onChange={e => setDeclForm(f => ({ ...f, montantCommission: e.target.value }))} placeholder="Ex: 3000" className="bg-black border-gray-700 text-white text-sm mt-1" />
                  </div>
                </div>
                {/* Calcul preview */}
                {montantComm > 0 && (
                  <div className="bg-black border border-gray-800 p-3 mt-2">
                    <div className="text-gray-400 text-xs mb-2 font-semibold">Répartition calculée automatiquement</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Votre part (75%)</span><span className="text-green-400 font-bold">{previewCourtier.toLocaleString("fr-FR")} €</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Parrain N1 (10% Sigma)</span><span className="text-yellow-400">{previewParrainN1.toLocaleString("fr-FR")} €</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Part Sigma</span><span className="text-gray-400">{previewSigmaNet.toLocaleString("fr-FR")} €</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Parrain N2 (5% Sigma)</span><span className="text-yellow-400">{previewParrainN2.toLocaleString("fr-FR")} €</span></div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => {
                      if (!profil?.id) return;
                      if (!declForm.montantCommission) { toast.error("La commission totale est obligatoire"); return; }
                      creerTransactionMut.mutate({
                        courtierId: profil.id,
                        leadNom: declForm.leadNom || undefined,
                        dossierRef: declForm.dossierRef || undefined,
                        montantEnveloppe: declForm.montantEnveloppe ? parseInt(declForm.montantEnveloppe) : undefined,
                        montantCommission: parseInt(declForm.montantCommission),
                      });
                    }}
                    disabled={creerTransactionMut.isPending}
                    className="bg-[#C9A84C] text-black hover:bg-[#b8943d] text-sm"
                  >
                    {creerTransactionMut.isPending ? "Envoi..." : "Enregistrer"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDeclarer(false)} className="text-gray-500 text-sm">Annuler</Button>
                </div>
              </div>
            )}

            {/* Liste des transactions */}
            {transactionsCourtage.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Euro className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune commission déclarée pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactionsCourtage.map((t: any) => (
                  <div key={t.id} className="bg-[#111] border border-gray-800 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-semibold text-sm">{t.leadNom || "Client anonyme"}</div>
                        {t.dossierRef && <div className="text-gray-500 text-xs">Réf : {t.dossierRef}</div>}
                        <div className="text-gray-600 text-xs mt-0.5">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <div className="text-right">
                        {t.montantCommission && <div className="text-white font-bold">{t.montantCommission.toLocaleString("fr-FR")} €</div>}
                        {t.montantEnveloppe && <div className="text-gray-500 text-xs">Enveloppe : {t.montantEnveloppe.toLocaleString("fr-FR")} €</div>}
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                          t.statut === "paye" ? "bg-green-500/10 text-green-400" :
                          t.statut === "paiement_initie" ? "bg-blue-500/10 text-blue-400" :
                          t.statut === "valide" ? "bg-[#C9A84C]/10 text-[#C9A84C]" :
                          "bg-gray-500/10 text-gray-400"
                        }`}>
                          {t.statut === "paye" ? "✓ Payé" : t.statut === "paiement_initie" ? "⏳ Paiement initié" : t.statut === "valide" ? "✓ Validé" : "⏳ En attente"}
                        </span>
                      </div>
                    </div>
                    {t.partCourtier && (
                      <div className="mt-2 pt-2 border-t border-gray-800 grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-gray-600">Votre part</span><div className="text-green-400 font-bold">{t.partCourtier.toLocaleString("fr-FR")} €</div></div>
                        <div><span className="text-gray-600">Parrain N1</span><div className="text-yellow-400">{(t.partParrainN1 || 0).toLocaleString("fr-FR")} €</div></div>
                        <div><span className="text-gray-600">Part Sigma</span><div className="text-gray-400">{(t.partSigma || 0).toLocaleString("fr-FR")} €</div></div>
                      </div>
                    )}
                    {t.noteHanna && <div className="mt-2 text-xs text-blue-300 bg-blue-500/5 p-2">Note Hanna : {t.noteHanna}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Réseau & Commissions ── */}
        {activeTab === "reseau" && (
          <div className="space-y-6">
            {/* KPIs réseau */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total filleuls", value: monReseau?.stats.totalFilleuls ?? 0, color: "text-white" },
                { label: "Commissions générées", value: ((monReseau?.stats.commissionsTotal ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-white" },
                { label: "Commissions payées", value: ((monReseau?.stats.commissionsPayees ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-green-400" },
                { label: "En attente", value: ((monReseau?.stats.commissionsEnAttente ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-yellow-400" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-[#111] border border-gray-800 p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{kpi.label}</p>
                  <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Lien de parrainage */}
            <div className="bg-[#111] border border-[#C9A84C]/20 p-4">
              <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">Mon lien de parrainage</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black text-[#C9A84C] text-xs p-2 font-mono break-all">
                  {window.location.origin}/rejoindre?parrain={profil.codeParrain}
                </code>
                <Button size="sm" variant="outline" className="border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10 shrink-0"
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/rejoindre?parrain=${profil.codeParrain}`); toast.success("Lien copié !"); }}>
                  Copier
                </Button>
              </div>
              <p className="text-gray-600 text-xs mt-2">Partagez ce lien pour recruter des courtiers ou agents dans votre réseau</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Filleuls courtiers */}
              <div className="bg-[#111] border border-gray-800 p-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C9A84C]" />
                  Courtiers parrainés ({monReseau?.filleulsCourtiers.length ?? 0})
                </h3>
                {!monReseau?.filleulsCourtiers.length ? (
                  <p className="text-gray-600 text-xs text-center py-4">Aucun courtier parrainé pour l'instant</p>
                ) : (
                  <div className="space-y-2">
                    {monReseau.filleulsCourtiers.map((f: any) => (
                      <div key={f.id} className="bg-black p-2 flex items-center justify-between">
                        <div>
                          <div className="text-white text-xs font-medium">{f.prenom} {f.nom}</div>
                          <div className="text-gray-600 text-xs">{f.email}</div>
                        </div>
                        <Badge className={`text-xs border ${
                          f.statutInterne === "actif" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          f.statutInterne === "suspendu" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}>{f.statutInterne}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filleuls agents */}
              <div className="bg-[#111] border border-gray-800 p-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C9A84C]" />
                  Agents parrainés ({monReseau?.filleulsAgents.length ?? 0})
                </h3>
                {!monReseau?.filleulsAgents.length ? (
                  <p className="text-gray-600 text-xs text-center py-4">Aucun agent parrainé pour l'instant</p>
                ) : (
                  <div className="space-y-2">
                    {monReseau.filleulsAgents.map((f: any) => (
                      <div key={f.id} className="bg-black p-2 flex items-center justify-between">
                        <div>
                          <div className="text-white text-xs font-medium">{f.prenom} {f.nom}</div>
                          <div className="text-gray-600 text-xs">{f.email}</div>
                        </div>
                        <Badge className={`text-xs border ${
                          f.statutInterne === "actif" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          f.statutInterne === "suspendu" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}>{f.statutInterne}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Historique commissions réseau */}
            <div className="bg-[#111] border border-gray-800 p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#C9A84C]" />
                Historique des commissions de parrainage
              </h3>
              {!monReseau?.commissions.length ? (
                <p className="text-gray-600 text-xs text-center py-4">Aucune commission de parrainage générée pour l'instant</p>
              ) : (
                <div className="space-y-1">
                  {monReseau.commissions.slice(0, 10).map((c: any) => (
                    <div key={c.id} className="bg-black p-2 flex items-center justify-between">
                      <div className="text-gray-400 text-xs">Niveau {c.niveau} — {c.tauxPourcent}% · {new Date(c.createdAt).toLocaleDateString("fr-FR")}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-bold">+{(c.montantHt / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
                        <Badge className={`text-xs ${c.statut === "paye" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                          {c.statut === "paye" ? "Payé" : "En attente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Onglet Mes demandes ── */}
        {activeTab === "demandes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C9A84C]" />
                Mes demandes envoyées à Manon
              </h3>
              <button onClick={() => refetchDemandes()} className="text-xs text-gray-500 hover:text-gray-300 underline">Actualiser</button>
            </div>
            {mesDemandes.length === 0 ? (
              <div className="bg-[#111] border border-gray-800 p-10 text-center">
                <p className="text-gray-500 text-sm">Aucune demande envoyée pour l’instant.</p>
                <p className="text-gray-600 text-xs mt-1">Utilisez le bouton « Envoyer une demande » dans l’onglet « Dossiers reçus ».</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mesDemandes.map(task => {
                  const statutColors: Record<string, string> = {
                    a_faire: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                    en_cours: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    termine: "bg-green-500/10 text-green-400 border-green-500/20",
                  };
                  const statutLabels: Record<string, string> = {
                    a_faire: "À faire",
                    en_cours: "En cours",
                    termine: "Terminé",
                  };
                  return (
                    <div key={task.id} className="bg-[#111] border border-gray-800 p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{task.titre}</p>
                        {task.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{task.description}</p>}
                        <p className="text-gray-600 text-xs mt-1">
                          {new Date(task.dateDebut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                          {" à "}
                          {new Date(task.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                        </p>
                      </div>
                      <span className={`text-xs border px-2 py-0.5 whitespace-nowrap ${statutColors[task.statut] ?? ""}`}>
                        {statutLabels[task.statut] ?? task.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Documents ── */}
        {/* ── Onglet Mon Profil ── */}
        {activeTab === "profil" && profil && (
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#C9A84C]" />
                Régions d'opération
              </h3>
              <p className="text-zinc-500 text-sm mb-4">Indiquez les régions où vous exercez. Manon utilisera cette information pour vous assigner les dossiers correspondants.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {mesRegions.map(r => (
                  <span key={r} className="flex items-center gap-1 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 rounded-full px-3 py-1 text-sm">
                    {r}
                    <button onClick={() => setMesRegions(prev => prev.filter(x => x !== r))} className="hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {mesRegions.length === 0 && <span className="text-gray-600 text-sm italic">Aucune région renseignée</span>}
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  onChange={e => {
                    const val = e.target.value;
                    if (val && !mesRegions.includes(val)) setMesRegions(prev => [...prev, val]);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Ajouter une région...</option>
                  {REGIONS_FRANCE.filter(r => !mesRegions.includes(r)).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <Button
                  onClick={() => updateMesRegions.mutate({ regionsOperation: mesRegions })}
                  disabled={updateMesRegions.isPending}
                  className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-semibold"
                >
                  Sauvegarder
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "documents" && profil && (
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C9A84C]" />
              Échange de documents avec Manon
            </h3>
            <p className="text-zinc-500 text-sm mb-5">Envoyez des documents à Manon ou consultez les documents qu'elle vous a transmis.</p>
            <PartnerDocumentsSection
              partnerType="courtier"
              partnerId={profil.id}
              partnerNom={`${profil.prenom ?? ""} ${profil.nom}`}
              partnerEmail={profil.email}
              viewAs="partner"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

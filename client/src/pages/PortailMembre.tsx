import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import PartnerDocumentsSection from "@/components/PartnerDocumentsSection";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users,
  FileText,
  TrendingUp,
  Copy,
  Home,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Award,
  Share2,
  BarChart2,
  Wallet,
  AlertCircle,
  AlertTriangle,
  Pencil,
  X,
  Save,
  Lock,
  MessageSquare,
  MapPin,
} from "lucide-react";

const REGIONS_FRANCE = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire",
  "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie",
  "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  "Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"
];
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statutBadge(statut: string) {
  const map: Record<string, { label: string; color: string }> = {
    en_attente: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    actif:      { label: "Actif",      color: "bg-green-500/20 text-green-400 border-green-500/30" },
    suspendu:   { label: "Suspendu",   color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    resilie:    { label: "Résilié",    color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const s = map[statut] ?? { label: statut, color: "bg-zinc-700 text-zinc-300" };
  return <span className={`px-2 py-0.5 rounded text-xs border ${s.color}`}>{s.label}</span>;
}

function commissionBadge(statut: string) {
  if (statut === "paye") return <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Payée</span>;
  if (statut === "valide") return <span className="text-blue-400 flex items-center gap-1"><Clock size={12} /> Validée</span>;
  if (statut === "annule") return <span className="text-red-400 flex items-center gap-1"><XCircle size={12} /> Annulée</span>;
  return <span className="text-yellow-400 flex items-center gap-1"><Clock size={12} /> En attente</span>;
}

function formatMois(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ─── Composant ContactResponsableForm ────────────────────────────────────────

function ContactResponsableForm({ isAgent, membreNom }: { isAgent: boolean; membreNom: string }) {
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const createTask = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success(`Demande envoyée à ${isAgent ? "Élodie" : "Manon"} !`);
      setSujet("");
      setMessage("");
      setSending(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi. Réessayez.");
      setSending(false);
    },
  });

  const handleSend = () => {
    if (!sujet.trim()) { toast.error("Veuillez indiquer un sujet."); return; }
    setSending(true);
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    createTask.mutate({
      titre: `📨 Message de ${membreNom || (isAgent ? "un agent" : "un courtier")} — ${sujet}`,
      assigneA: isAgent ? "Elodie" : "Manon",
      dateDebut: now.toISOString(),
      dateFin: inOneHour.toISOString(),
      description: message || undefined,
      statut: "a_faire",
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Envoyez un message à {isAgent ? "Élodie" : "Manon"} — une tâche sera créée dans son calendrier.
      </p>
      <Input
        placeholder="Sujet *"
        value={sujet}
        onChange={e => setSujet(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
      />
      <textarea
        placeholder="Message (optionnel)"
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
      />
      <Button
        onClick={handleSend}
        disabled={sending || !sujet.trim()}
        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
      >
        {sending ? "Envoi..." : `Envoyer à ${isAgent ? "Élodie" : "Manon"}`}
      </Button>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function PortailMembre() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"apercu" | "commissions" | "reseau" | "dossiers" | "documents" | "demandes" | "profil">("apercu");
  const [mesRegions, setMesRegions] = useState<string[]>([]);
  const [regionsInitialized, setRegionsInitialized] = useState(false);

  // ─── Mes demandes envoyées au responsable ────────────────────────────────────
  const { data: mesDemandes = [], refetch: refetchDemandes } = trpc.calendar.mesDemandes.useQuery(
    {},
    { enabled: activeTab === "demandes" }
  );
  const [editingBien, setEditingBien] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showChangeMdp, setShowChangeMdp] = useState(false);
  const [mdpForm, setMdpForm] = useState({ current: "", next: "", confirm: "" });
  const changeMdp = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès !");
      setShowChangeMdp(false);
      setMdpForm({ current: "", next: "", confirm: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // Profils
  const { data: profilAmbassadeur, isLoading: loadingAmb } = trpc.ambassadeurs.monProfil.useQuery();
  const { data: profilCourtier, isLoading: loadingCourt } = trpc.courtiers.monProfil.useQuery();

  // Données ambassadeur
  const { data: detailAmb } = trpc.ambassadeurs.byId.useQuery(
    { id: profilAmbassadeur?.id ?? 0 },
    { enabled: !!profilAmbassadeur }
  );

  // Données courtier
  const { data: detailCourt } = trpc.courtiers.getById.useQuery(
    { id: profilCourtier?.id ?? 0 },
    { enabled: !!profilCourtier }
  );

  const utils = trpc.useUtils();
  const updateBien = trpc.ambassadeurs.updateBien.useMutation({
    onSuccess: () => {
      toast.success("Bien mis à jour");
      setEditingBien(null);
      utils.ambassadeurs.byId.invalidate({ id: profilAmbassadeur?.id ?? 0 });
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Calculs dérivés (hooks avant tout return conditionnel) ────────────────
  const _isAgent = !!profilAmbassadeur;
  const _allCommissions = _isAgent ? (detailAmb?.commissions ?? []) : (detailCourt?.commissions ?? []);
  const historiqueParMois = useMemo(() => {
    const moisMap: Record<string, { mois: string; total: number; paye: number; count: number }> = {};
    _allCommissions.forEach((c: any) => {
      const dateRef = c.dateEncaissement ?? c.createdAt;
      if (!dateRef) return;
      const d = new Date(dateRef);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!moisMap[key]) {
        moisMap[key] = {
          mois: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
          total: 0,
          paye: 0,
          count: 0,
        };
      }
      moisMap[key].total += c.montantHt ?? 0;
      if (c.statut === "paye") moisMap[key].paye += c.montantHt ?? 0;
      moisMap[key].count++;
    });
    return Object.entries(moisMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v);
  }, [_allCommissions]);

  // ─── Auth guard ────────────────────────────────────────────────────────────
  if (authLoading || loadingAmb || loadingCourt) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // ─── Pas encore inscrit dans le réseau ────────────────────────────────────
  if (!profilAmbassadeur && !profilCourtier) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Award className="mx-auto mb-4 text-amber-500" size={48} />
            <h2 className="text-white text-xl font-semibold mb-2">Vous n'êtes pas encore inscrit dans le réseau</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Pour rejoindre le réseau Sigma Factory, inscrivez-vous en tant qu'agent ou courtier.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate("/ambassadeur")}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                <Home size={16} className="mr-2" /> Agent Immo
              </Button>
              <Button
                onClick={() => navigate("/inscription-courtier")}
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                <CreditCard size={16} className="mr-2" /> Courtier
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Détermine le type de membre ──────────────────────────────────────────
  const isAgent = !!profilAmbassadeur;
  const profil = isAgent ? profilAmbassadeur : profilCourtier!;

  // Initialiser les régions depuis le profil (une seule fois) — dans useEffect pour éviter setState en render
  useEffect(() => {
    if (profil && !regionsInitialized) {
      const raw = (profil as any).regionsOperation;
      if (raw) { try { setMesRegions(JSON.parse(raw)); } catch {} }
      setRegionsInitialized(true);
    }
  }, [profil, regionsInitialized]);

  const updateMesRegionsCourtier = trpc.courtiers.updateMesRegions.useMutation({
    onSuccess: () => toast.success("Régions mises à jour !"),
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
  const updateMesRegionsAgent = trpc.ambassadeurs.updateMesRegions.useMutation({
    onSuccess: () => toast.success("Régions mises à jour !"),
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
  const handleSaveRegions = () => {
    if (isAgent) updateMesRegionsAgent.mutate({ regionsOperation: mesRegions });
    else updateMesRegionsCourtier.mutate({ regionsOperation: mesRegions });
  };
  const typeLabel = isAgent ? "Agent Immobilier" : "Courtier";
  const codeParrain = profil.codeParrain ?? "—";
  const lienParrainage = `${window.location.origin}/rejoindre?parrain=${encodeURIComponent(codeParrain)}`;
  const contratUrl = isAgent ? profilAmbassadeur?.contratPdfUrl : profilCourtier?.conventionPdfUrl;
  const contratSigne = isAgent ? profilAmbassadeur?.contratSigne : profilCourtier?.conventionSignee;

  // Filleuls
  const filleulsAgentsN1 = isAgent
    ? (detailAmb?.filleuls ?? [])
    : (detailCourt?.filleulsAmbassadeurs ?? []);
  const filleulsCourtiersN1 = isAgent
    ? (detailAmb?.filleulsCourtiers ?? [])
    : (detailCourt?.filleulsCourtiers ?? []);
  const totalFilleuls = filleulsAgentsN1.length + filleulsCourtiersN1.length;

  // Commissions
  const allCommissions = isAgent ? (detailAmb?.commissions ?? []) : (detailCourt?.commissions ?? []);
  const totalCommissions = allCommissions.reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0);
  const commissionsPayeesArr = allCommissions.filter((c: any) => c.statut === "paye");
  const commissionsEnAttenteArr = allCommissions.filter((c: any) => c.statut === "a_payer" || c.statut === "valide");
  const totalPaye = commissionsPayeesArr.reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0);
  const totalEnAttente = commissionsEnAttenteArr.reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0);

  // Dossiers/Biens
  const dossiers = isAgent ? (detailAmb?.biens ?? []) : (detailCourt?.dossiers ?? []);

  const copyCode = () => {
    navigator.clipboard.writeText(codeParrain);
    setCopiedCode(true);
    toast.success("Code copié !");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(lienParrainage);
    setCopiedLink(true);
    toast.success("Lien de parrainage copié !");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Bannière suspension */}
      {profil.statutInterne === "suspendu" && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-6 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div>
            <span className="text-red-400 font-bold text-sm">Compte suspendu</span>
            <span className="text-red-300 text-xs ml-2">
              {isAgent
                ? "Votre compte a été suspendu automatiquement (inactivité > 30 jours). Contactez Élodie pour réactiver votre accès."
                : "Votre compte a été suspendu automatiquement (dossier non traité > 72h). Contactez Manon pour réactiver votre accès."
              }
            </span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Award size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">{typeLabel}</p>
              <h1 className="text-white font-semibold leading-tight">
                {profil.prenom} {profil.nom}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statutBadge(profil.statutInterne)}
            {contratUrl && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs"
                onClick={() => window.open(contratUrl, "_blank")}
              >
                <FileText size={13} className="mr-1" /> Télécharger mon contrat
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
              onClick={() => setShowChangeMdp(true)}
            >
              <Lock size={13} className="mr-1" /> Mot de passe
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Code parrain + lien partageable */}
        <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/30">
          <CardContent className="py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-amber-400/80 mb-1">Votre code parrain</p>
                <p className="text-2xl font-mono font-bold text-amber-400 tracking-widest">{codeParrain}</p>
                <p className="text-xs text-zinc-500 mt-1">Partagez ce code pour recruter dans votre réseau</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyCode}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                >
                  <Copy size={14} className="mr-1.5" />
                  {copiedCode ? "Copié !" : "Code"}
                </Button>
                <Button
                  onClick={copyLink}
                  size="sm"
                  variant="outline"
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                >
                  <Share2 size={14} className="mr-1.5" />
                  {copiedLink ? "Copié !" : "Lien d'invitation"}
                </Button>
                <Button
                  onClick={() => navigate(`/parrainage/${encodeURIComponent(codeParrain)}`)}
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <ChevronRight size={14} className="mr-1" /> Voir la page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                {isAgent ? <Home size={13} className="text-zinc-500" /> : <CreditCard size={13} className="text-zinc-500" />}
                <p className="text-xs text-zinc-400">{isAgent ? "Biens soumis" : "Dossiers"}</p>
              </div>
              <p className="text-2xl font-bold text-white">{dossiers.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={13} className="text-zinc-500" />
                <p className="text-xs text-zinc-400">Filleuls réseau</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalFilleuls}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={13} className="text-zinc-500" />
                <p className="text-xs text-zinc-400">Commissions payées</p>
              </div>
              <p className="text-2xl font-bold text-green-400">{totalPaye.toLocaleString("fr-FR")} €</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={13} className="text-zinc-500" />
                <p className="text-xs text-zinc-400">En attente</p>
              </div>
              <p className="text-2xl font-bold text-amber-400">{totalEnAttente.toLocaleString("fr-FR")} €</p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 border-b border-zinc-800">
          {[
            { id: "apercu", label: "Aperçu", icon: BarChart2 },
            { id: "commissions", label: `Commissions (${allCommissions.length})`, icon: TrendingUp },
            { id: "reseau", label: `Réseau (${totalFilleuls})`, icon: Users },
            { id: "dossiers", label: isAgent ? `Biens (${dossiers.length})` : `Dossiers (${dossiers.length})`, icon: isAgent ? Home : CreditCard },
            { id: "documents", label: "Documents", icon: FileText },
            { id: "demandes", label: "Mes demandes", icon: AlertTriangle },
            { id: "profil", label: "Mon profil", icon: MapPin },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ONGLET APERÇU ── */}
        {activeTab === "apercu" && (
          <div className="space-y-6">
            {/* Résumé financier */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <TrendingUp size={16} className="text-amber-500" /> Résumé financier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-zinc-400 mb-1">Total généré</p>
                    <p className="text-xl font-bold text-white">{totalCommissions.toLocaleString("fr-FR")} €</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                    <p className="text-xs text-green-400/80 mb-1">Payé</p>
                    <p className="text-xl font-bold text-green-400">{totalPaye.toLocaleString("fr-FR")} €</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-4 text-center border border-amber-500/20">
                    <p className="text-xs text-amber-400/80 mb-1">En attente</p>
                    <p className="text-xl font-bold text-amber-400">{totalEnAttente.toLocaleString("fr-FR")} €</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dernières commissions */}
            {allCommissions.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <Clock size={16} className="text-amber-500" /> Dernières commissions
                  </CardTitle>
                  <button
                    onClick={() => setActiveTab("commissions")}
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    Voir tout →
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allCommissions.slice(0, 5).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2">
                        <div>
                          <p className="text-sm text-white">{c.description ?? c.typeDossier ?? "Commission réseau"}</p>
                          <p className="text-xs text-zinc-500">{formatMois(c.dateEncaissement ?? c.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-amber-400">{(c.montantHt ?? 0).toLocaleString("fr-FR")} €</p>
                          <div className="text-xs">{commissionBadge(c.statut)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Réseau rapide */}
            {totalFilleuls > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <Users size={16} className="text-amber-500" /> Mon réseau
                  </CardTitle>
                  <button
                    onClick={() => setActiveTab("reseau")}
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    Voir tout →
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {filleulsAgentsN1.length > 0 && (
                      <div className="flex-1 bg-zinc-800/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{filleulsAgentsN1.length}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Agent{filleulsAgentsN1.length > 1 ? "s" : ""} N1</p>
                      </div>
                    )}
                    {filleulsCourtiersN1.length > 0 && (
                      <div className="flex-1 bg-zinc-800/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{filleulsCourtiersN1.length}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Courtier{filleulsCourtiersN1.length > 1 ? "s" : ""} N1</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacter le responsable */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <MessageSquare size={16} className="text-amber-500" /> Contacter {isAgent ? "Élodie" : "Manon"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContactResponsableForm isAgent={isAgent} membreNom={profil ? `${(profil as any).prenom ?? ""} ${(profil as any).nom ?? ""}`.trim() : ""} />
              </CardContent>
            </Card>

            {/* Vide */}
            {dossiers.length === 0 && allCommissions.length === 0 && totalFilleuls === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <ChevronRight size={32} className="mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-400">Votre espace est prêt.</p>
                  <p className="text-zinc-500 text-sm mt-1">
                    {isAgent
                      ? "Vos biens soumis et vos commissions apparaîtront ici."
                      : "Vos dossiers et vos commissions apparaîtront ici."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── ONGLET COMMISSIONS ── */}
        {activeTab === "commissions" && (
          <div className="space-y-6">
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
                <p className="text-xs text-zinc-400 mb-1">Total généré</p>
                <p className="text-xl font-bold text-white">{totalCommissions.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-zinc-500 mt-0.5">{allCommissions.length} commission{allCommissions.length > 1 ? "s" : ""}</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <p className="text-xs text-green-400/80 mb-1">Payé</p>
                <p className="text-xl font-bold text-green-400">{totalPaye.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-green-400/50 mt-0.5">{commissionsPayeesArr.length} paiement{commissionsPayeesArr.length > 1 ? "s" : ""}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
                <p className="text-xs text-amber-400/80 mb-1">En attente</p>
                <p className="text-xl font-bold text-amber-400">{totalEnAttente.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-amber-400/50 mt-0.5">{commissionsEnAttenteArr.length} en cours</p>
              </div>
            </div>

            {/* Historique mensuel */}
            {historiqueParMois.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <BarChart2 size={16} className="text-amber-500" /> Historique mensuel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historiqueParMois.map((m, i) => {
                      const maxTotal = Math.max(...historiqueParMois.map(x => x.total), 1);
                      const pct = Math.round((m.total / maxTotal) * 100);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300 capitalize">{m.mois}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-green-400">{m.paye.toLocaleString("fr-FR")} € payé</span>
                              <span className="text-white font-semibold">{m.total.toLocaleString("fr-FR")} € total</span>
                              <span className="text-zinc-500">{m.count} ligne{m.count > 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Liste détaillée */}
            {allCommissions.length > 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white">Détail des commissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allCommissions.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2.5">
                        <div>
                          <p className="text-sm text-white">{c.description ?? c.typeDossier ?? "Commission réseau"}</p>
                          <p className="text-xs text-zinc-500">{formatMois(c.dateEncaissement ?? c.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-amber-400">{(c.montantHt ?? 0).toLocaleString("fr-FR")} €</p>
                          <div className="text-xs">{commissionBadge(c.statut)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-10 text-center">
                  <TrendingUp size={28} className="mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-400">Aucune commission pour le moment.</p>
                  <p className="text-zinc-500 text-sm mt-1">Vos commissions apparaîtront ici dès validation d'un dossier.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── ONGLET RÉSEAU ── */}
        {activeTab === "reseau" && (
          <div className="space-y-4">
            {/* KPIs réseau */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total filleuls", value: totalFilleuls, color: "text-white" },
                { label: "Commissions générées", value: (totalCommissions / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-white" },
                { label: "Payées", value: (totalPaye / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-green-400" },
                { label: "En attente", value: (totalEnAttente / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-amber-400" },
              ].map(kpi => (
                <Card key={kpi.label} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{kpi.label}</p>
                    <p className={`text-lg font-black ${kpi.color}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Lien de parrainage enrichi */}
            <Card className="bg-zinc-900 border-amber-500/20">
              <CardContent className="pt-4 pb-4">
                <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Mon lien de parrainage</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-zinc-950 text-amber-300 text-xs p-2 rounded font-mono break-all">
                    {lienParrainage}
                  </code>
                  <Button size="sm" variant="outline"
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 shrink-0"
                    onClick={copyLink}>
                    <Share2 size={12} className="mr-1" /> {copiedLink ? "Copié !" : "Copier"}
                  </Button>
                </div>
                <p className="text-zinc-600 text-xs mt-2">Ce lien pré-remplit automatiquement votre code parrain dans le formulaire d'inscription</p>
              </CardContent>
            </Card>

            {/* Filleuls */}
            {totalFilleuls === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-10 text-center">
                  <Users size={28} className="mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-400">Votre réseau est vide pour l'instant.</p>
                  <p className="text-zinc-500 text-sm mt-1">Partagez votre lien ci-dessus pour recruter vos premiers filleuls.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {filleulsAgentsN1.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-white">
                        <Home size={14} className="text-amber-500" />
                        Agents parrainés ({filleulsAgentsN1.length}) — <span className="text-amber-400">10% résiduel</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {filleulsAgentsN1.map((f: any) => (
                          <div key={f.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2">
                            <div>
                              <span className="text-sm text-white">{f.prenom} {f.nom}</span>
                              <span className="text-xs text-zinc-500 ml-2">{f.ville}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {statutBadge(f.statutInterne)}
                              <span className="text-xs text-zinc-600">{new Date(f.createdAt).toLocaleDateString("fr-FR")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {filleulsCourtiersN1.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-white">
                        <CreditCard size={14} className="text-amber-500" />
                        Courtiers parrainés ({filleulsCourtiersN1.length}) — <span className="text-amber-400">10% résiduel</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {filleulsCourtiersN1.map((f: any) => (
                          <div key={f.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2">
                            <div>
                              <span className="text-sm text-white">{f.prenom} {f.nom}</span>
                              <span className="text-xs text-zinc-500 ml-2">{f.ville}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {statutBadge(f.statutInterne)}
                              <span className="text-xs text-zinc-600">{new Date(f.createdAt).toLocaleDateString("fr-FR")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ONGLET DOSSIERS / BIENS ── */}
        {activeTab === "dossiers" && (
          <div className="space-y-4">
            {/* CTA Déposer un bien (agent uniquement) */}
            {isAgent && (
              <div className="flex justify-end">
                <Button
                  onClick={() => navigate("/ambassadeur/bien")}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                >
                  <Home size={14} className="mr-2" /> Déposer un bien
                </Button>
              </div>
            )}
            {dossiers.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-10 text-center">
                  {isAgent ? <Home size={28} className="mx-auto mb-3 text-zinc-600" /> : <CreditCard size={28} className="mx-auto mb-3 text-zinc-600" />}
                  <p className="text-zinc-400">{isAgent ? "Aucun bien soumis pour l'instant." : "Aucun dossier pour l'instant."}</p>
                  {isAgent && (
                    <Button
                      onClick={() => navigate("/ambassadeur/bien")}
                      className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                      size="sm"
                    >
                      <Home size={13} className="mr-1.5" /> Soumettre mon premier bien
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {dossiers.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            {isAgent
                              ? (d.titre ?? d.adresse ?? `Bien #${d.id}`)
                              : (d.clientNom ?? `Dossier #${d.id}`)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {isAgent
                              ? `${d.typeBien ?? ""} — ${d.ville ?? ""}`
                              : `${d.typeDossier?.replace(/_/g, " ") ?? ""}`}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString("fr-FR") : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">
                            {isAgent ? (d.statutBien ?? "—") : (d.statut ?? "—")}
                          </span>
                          {isAgent && d.prix && (
                            <span className="text-xs text-amber-400">{(d.prix / 1000).toFixed(0)}k€</span>
                          )}
                          {!isAgent && d.montantFinancement && (
                            <span className="text-xs text-amber-400">{(d.montantFinancement / 1000).toFixed(0)}k€</span>
                          )}
                          {isAgent && (
                            <Button size="sm" variant="ghost" onClick={() => { setEditingBien(d); setEditForm({ titre: d.titre ?? "", prix: d.prix ?? "", surface: d.surface ?? "", nbPieces: d.nbPieces ?? "", description: d.description ?? "", pointsForts: d.pointsForts ?? "" }); }}
                              className="h-7 w-7 p-0 text-zinc-500 hover:text-amber-400">
                              <Pencil size={13} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── ONGLET MES DEMANDES ── */}
        {activeTab === "demandes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Mes demandes envoyées à {isAgent ? "Élodie" : "Manon"}
              </h3>
              <button onClick={() => refetchDemandes()} className="text-xs text-zinc-500 hover:text-zinc-300 underline">Actualiser</button>
            </div>
            {mesDemandes.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-10 text-center">
                  <MessageSquare size={28} className="mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-400">Aucune demande envoyée pour l’instant.</p>
                  <p className="text-zinc-500 text-sm mt-1">Utilisez le formulaire dans l’onglet « Aperçu » pour contacter {isAgent ? "Élodie" : "Manon"}.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {mesDemandes.map((task: any) => {
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
                    <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{task.titre}</p>
                        {task.description && <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{task.description}</p>}
                        <p className="text-zinc-600 text-xs mt-1">
                          {new Date(task.dateDebut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                          {" à "}
                          {new Date(task.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                        </p>
                      </div>
                      <span className={`text-xs border px-2 py-0.5 rounded whitespace-nowrap ${statutColors[task.statut] ?? ""}`}>
                        {statutLabels[task.statut] ?? task.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET DOCUMENTS ── */}
        {activeTab === "documents" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Échange de documents avec {isAgent ? "Élodie" : "Manon"}
              </CardTitle>
              <p className="text-zinc-500 text-sm">Envoyez des documents ou consultez ceux qui vous ont été transmis.</p>
            </CardHeader>
            <CardContent>
              {isAgent && profilAmbassadeur ? (
                <PartnerDocumentsSection
                  partnerType="agent"
                  partnerId={profilAmbassadeur.id}
                  partnerNom={`${profilAmbassadeur.prenom ?? ""} ${profilAmbassadeur.nom}`}
                  partnerEmail={profilAmbassadeur.email}
                  viewAs="partner"
                />
              ) : profilCourtier ? (
                <PartnerDocumentsSection
                  partnerType="courtier"
                  partnerId={profilCourtier.id}
                  partnerNom={`${profilCourtier.prenom ?? ""} ${profilCourtier.nom}`}
                  partnerEmail={profilCourtier.email}
                  viewAs="partner"
                />
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* ── Onglet Mon Profil ── */}
        {activeTab === "profil" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Régions d'opération
              </CardTitle>
              <p className="text-zinc-500 text-sm">Indiquez les régions où vous exercez. {isAgent ? "Élodie" : "Manon"} utilisera cette information pour vous assigner les dossiers correspondants.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {mesRegions.map(r => (
                  <span key={r} className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-3 py-1 text-sm">
                    {r}
                    <button onClick={() => setMesRegions(prev => prev.filter(x => x !== r))} className="hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {mesRegions.length === 0 && <span className="text-zinc-600 text-sm italic">Aucune région renseignée</span>}
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
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
                  onClick={handleSaveRegions}
                  disabled={updateMesRegionsCourtier.isPending || updateMesRegionsAgent.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>

    <Dialog open={!!editingBien} onOpenChange={open => !open && setEditingBien(null)}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-bold flex items-center gap-2">
            <Pencil size={16} className="text-amber-400" />
            Modifier le bien
          </DialogTitle>
        </DialogHeader>
        {editingBien && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Titre</label>
              <Input value={editForm.titre} onChange={e => setEditForm(f => ({ ...f, titre: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Prix (€)</label>
                <Input type="number" value={editForm.prix} onChange={e => setEditForm(f => ({ ...f, prix: Number(e.target.value) }))} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Surface (m²)</label>
                <Input type="number" value={editForm.surface} onChange={e => setEditForm(f => ({ ...f, surface: Number(e.target.value) }))} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Pièces</label>
                <Input type="number" value={editForm.nbPieces} onChange={e => setEditForm(f => ({ ...f, nbPieces: Number(e.target.value) }))} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Description</label>
              <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 rounded resize-none focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Points forts</label>
              <textarea value={editForm.pointsForts} onChange={e => setEditForm(f => ({ ...f, pointsForts: e.target.value }))} rows={2} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 rounded resize-none focus:outline-none focus:border-amber-500/50" placeholder="Calme, lumineux, vue dégagée..." />
            </div>
            <p className="text-zinc-500 text-xs">Le statut de publication ne peut être modifié que par l’équipe Sigma.</p>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setEditingBien(null)} className="text-zinc-400 hover:text-white">
                <X size={14} className="mr-1" /> Annuler
              </Button>
              <Button onClick={() => updateBien.mutate({ id: editingBien.id, ...editForm })} disabled={updateBien.isPending} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                <Save size={14} className="mr-1" /> {updateBien.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modale changement de mot de passe */}
    <Dialog open={showChangeMdp} onOpenChange={setShowChangeMdp}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white font-bold flex items-center gap-2">
            <Lock size={16} className="text-amber-400" />
            Changer mon mot de passe
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Mot de passe actuel</label>
            <Input
              type="password"
              value={mdpForm.current}
              onChange={e => setMdpForm(f => ({ ...f, current: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Votre mot de passe actuel"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Nouveau mot de passe</label>
            <Input
              type="password"
              value={mdpForm.next}
              onChange={e => setMdpForm(f => ({ ...f, next: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Au moins 8 caractères"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Confirmer le nouveau mot de passe</label>
            <Input
              type="password"
              value={mdpForm.confirm}
              onChange={e => setMdpForm(f => ({ ...f, confirm: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Confirmez le nouveau mot de passe"
            />
          </div>
          {mdpForm.next && mdpForm.confirm && mdpForm.next !== mdpForm.confirm && (
            <p className="text-red-400 text-xs">Les mots de passe ne correspondent pas.</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => { setShowChangeMdp(false); setMdpForm({ current: "", next: "", confirm: "" }); }} className="text-zinc-400 hover:text-white">
              <X size={14} className="mr-1" /> Annuler
            </Button>
            <Button
              onClick={() => {
                if (mdpForm.next !== mdpForm.confirm) {
                  toast.error("Les mots de passe ne correspondent pas.");
                  return;
                }
                if (mdpForm.next.length < 8) {
                  toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
                  return;
                }
                changeMdp.mutate({ currentPassword: mdpForm.current, newPassword: mdpForm.next });
              }}
              disabled={changeMdp.isPending || !mdpForm.current || !mdpForm.next || !mdpForm.confirm}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              <Save size={14} className="mr-1" /> {changeMdp.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

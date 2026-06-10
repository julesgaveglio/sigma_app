import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import LeadTimeline from "@/components/LeadTimeline";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, RefreshCw, CheckCircle2, Clock, AlertCircle, Home, Download, Mail, Phone, CalendarDays } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RechercheLead {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  statut: "actif" | "en_pause" | "cloture" | "perdu";
  agentAssigne: string | null;
  nbBiensPresentes: number;
  offreAcceptee: boolean;
  leadId: number | null;
  mandatId: number | null;
  hexaId: number | null;
  courtierAssigne: string | null;
  enveloppeValidee: number | null;
  formule: string | null;
  // Mandat de Recherche
  numeroMandat: string | null;
  projetType: string | null;
  budgetMax: number | null;
  typeBien: string | null;
  zoneRecherche: string | null;
  villeResidence: string | null;
  departement: string | null;
  codePostal: string | null;
  dateSignatureMandat: string | null;
  mandatSignePdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CONFIG = {
  actif:    { label: "Actif",    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  en_pause: { label: "En pause", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  cloture:  { label: "Clôturé",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  perdu:    { label: "Perdu",    color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const FORMULE_LABELS: Record<string, string> = {
  starter: "Starter",
  premium: "Premium",
  sdt_starter: "SDT Starter",
  sdt_premium: "SDT Premium",
};

function getRechercheStatus(lead: RechercheLead): { label: string; color: string; icon: React.ReactNode } {
  if (lead.offreAcceptee) {
    return {
      label: "Offre acceptée",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (lead.nbBiensPresentes > 0) {
    return {
      label: `${lead.nbBiensPresentes} bien${lead.nbBiensPresentes > 1 ? "s" : ""} présenté${lead.nbBiensPresentes > 1 ? "s" : ""}`,
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  }
  if (lead.agentAssigne) {
    return {
      label: "Agent assigné",
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  }
  return {
    label: "À traiter",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  };
}

// ─── Fiche détail Recherche bien ─────────────────────────────────────────────

function RechercheBienDetail({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: rawLead, isLoading } = trpc.crm.getById.useQuery({ id: leadId });
  const updateMutation = trpc.crm.update.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate({});
      utils.crm.getById.invalidate({ id: leadId });
      toast.success("Sauvegardé");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });
  const sendEmailMutation = trpc.crm.sendPointImmobilierEmail.useMutation({
    onSuccess: (data) => toast.success(`Email Point Immobilier envoyé à ${data.email} ✓`),
    onError: (err) => toast.error(err.message),
  });
  const [isUploadingMandat, setIsUploadingMandat] = useState(false);
  const [isSendingMandatInvit, setIsSendingMandatInvit] = useState(false);
  const sendMandatInvitMutation = trpc.crm.sendMandatInvitation.useMutation({
    onSuccess: (data) => toast.success(`Invitation mandat envoyée à ${data.email}`),
    onError: (e) => toast.error("Erreur envoi : " + e.message),
  });
  const handleSendMandatInvit = async () => {
    if (isSendingMandatInvit) return;
    setIsSendingMandatInvit(true);
    try { await sendMandatInvitMutation.mutateAsync({ id: leadId }); }
    finally { setIsSendingMandatInvit(false); }
  };
  const uploadMandatMutation = trpc.crm.uploadMandatSigne.useMutation({
    onSuccess: () => {
      utils.crm.getById.invalidate({ id: leadId });
      utils.crm.list.invalidate({});
      toast.success("Mandat signé uploadé ✓ Mandat coché automatiquement !");
    },
    onError: (e) => toast.error("Erreur upload : " + e.message),
  });
  const handleUploadMandat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Seuls les fichiers PDF sont acceptés."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 10 Mo)."); return; }
    setIsUploadingMandat(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))));
      await uploadMandatMutation.mutateAsync({ crmLeadId: leadId, fileBase64: base64, fileName: file.name });
    } finally {
      setIsUploadingMandat(false);
      e.target.value = "";
    }
  };

  const [agentNom, setAgentNom] = useState("");
  const [nbBiens, setNbBiens] = useState("");
  const [offreAcceptee, setOffreAcceptee] = useState(false);
  const lead = rawLead as any;

  // Initialisation dans useEffect pour éviter setState pendant le render
  useEffect(() => {
    if (lead) {
      setAgentNom(lead.agentAssigne ?? "");
      setNbBiens(lead.nbBiensPresentes ? String(lead.nbBiensPresentes) : "0");
      setOffreAcceptee(!!lead.offreAcceptee);
    }
  }, [lead?.id]);

  const handleSave = () => {
    updateMutation.mutate({
      id: leadId,
      agentAssigne: agentNom || undefined,
      nbBiensPresentes: nbBiens ? parseInt(nbBiens) : 0,
      offreAcceptee,
    } as any);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lead) return <p className="text-zinc-500 text-sm p-6">Lead introuvable.</p>;

  return (
    <div className="space-y-5">
      {/* Identité */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Identité du client</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Nom :</span>
            <span className="text-white font-medium">{lead.prenom} {lead.nom}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300">{lead.email}</span>
          </div>
          {lead.telephone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-300">{lead.telephone}</span>
            </div>
          )}
          {lead.formule && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Formule :</span>
              <span className="text-amber-400 font-medium">{FORMULE_LABELS[lead.formule] ?? lead.formule}</span>
            </div>
          )}
          {lead.enveloppeValidee && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Enveloppe :</span>
              <span className="text-emerald-400 font-medium">{lead.enveloppeValidee.toLocaleString("fr-FR")} €</span>
            </div>
          )}
          {lead.courtierAssigne && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Courtier :</span>
              <span className="text-zinc-300">{lead.courtierAssigne}</span>
            </div>
          )}
        </div>
        {/* Modules liés */}
        <div className="flex gap-2 mt-3">
          <span className={`text-xs px-2 py-0.5 rounded border ${lead.leadId ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            État Civil {lead.leadId ? "✓" : "–"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${lead.mandatId ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            Mandat {lead.mandatId ? "✓" : "–"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${lead.hexaId ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
            Crédit {lead.hexaId ? "✓" : "–"}
          </span>
        </div>
      </div>

      {/* Suivi recherche bien */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-3">Suivi Recherche bien</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Agent assigné</label>
            <Input
              value={agentNom}
              onChange={(e) => setAgentNom(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-sm h-8"
              placeholder="Nom de l'agent"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Biens présentés</label>
            <Input
              value={nbBiens}
              onChange={(e) => setNbBiens(e.target.value)}
              type="number"
              min="0"
              className="bg-zinc-800 border-zinc-700 text-sm h-8"
              placeholder="0"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer group w-fit">
            <input
              type="checkbox"
              checked={offreAcceptee}
              onChange={(e) => setOffreAcceptee(e.target.checked)}
              className="w-4 h-4 accent-teal-500"
            />
            <span className={`text-sm transition-colors ${offreAcceptee ? "text-teal-400 font-medium" : "text-zinc-300 group-hover:text-white"}`}>
              Offre acceptée ✓
            </span>
          </label>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="sm"
            className="bg-teal-700 hover:bg-teal-600 text-white h-8 px-4 text-xs"
          >
            {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button
            onClick={() => sendEmailMutation.mutate({ id: leadId })}
            disabled={sendEmailMutation.isPending}
            size="sm"
            variant="outline"
            className="border-[#C9A84C]/60 text-[#C9A84C] hover:bg-[#C9A84C]/10 bg-transparent h-8 px-4 text-xs gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" />
            {sendEmailMutation.isPending ? "Envoi en cours..." : "Envoyer mail Point Immobilier"}
          </Button>
        </div>
      </div>

      {/* Mandat de recherche */}
      {(lead.numeroMandat || lead.budgetMax || lead.zoneRecherche || lead.projetType) && (
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>📋</span> Mandat de Recherche
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.numeroMandat && (
              <div className="col-span-2 flex items-center gap-2 flex-wrap">
                <span className="text-zinc-500">N° Mandat :</span>
                <span className="text-zinc-200 font-mono text-xs">{lead.numeroMandat}</span>
                {lead.dateSignatureMandat && lead.dateSignatureMandat !== '—' && (
                  <span className="text-zinc-500 text-xs ml-1">Signé le {lead.dateSignatureMandat}</span>
                )}
                {lead.mandatSignePdfUrl && (
                  <a
                    href={lead.mandatSignePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                  >
                    <span>📄</span> Mandat signé
                  </a>
                )}
              </div>
            )}
            {lead.projetType && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Projet :</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">{lead.projetType}</span>
              </div>
            )}
            {lead.budgetMax && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Budget max :</span>
                <span className="text-emerald-400 font-bold">{lead.budgetMax.toLocaleString('fr-FR')} €</span>
              </div>
            )}
            {lead.villeResidence && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Domicile :</span>
                <span className="text-zinc-200">{lead.villeResidence}{lead.departement ? ` (${lead.departement})` : ''}</span>
              </div>
            )}
            {lead.typeBien && (
              <div className="col-span-2">
                <span className="text-zinc-500">Type de bien :</span> <span className="text-white">{lead.typeBien}</span>
              </div>
            )}
            {lead.zoneRecherche && (
              <div className="col-span-2">
                <span className="text-zinc-500">Zone :</span> <span className="text-white leading-relaxed">{lead.zoneRecherche}</span>
              </div>
            )}
          </div>
          {/* Bouton upload mandat signé */}
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadMandat}
                disabled={isUploadingMandat}
              />
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isUploadingMandat
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer'
              }`}>
                {isUploadingMandat ? (
                  <><span className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" /> Upload en cours...</>
                ) : (
                  <>📂 {lead.mandatSignePdfUrl ? 'Remplacer le mandat signé' : 'Uploader le mandat signé'}</>
                )}
              </span>
            </label>
          </div>
          {/* Bouton rattrapage : renvoyer invitation mandat */}
          {lead && !lead.mandatRempli && (
            <div className="mt-2">
              <button
                onClick={handleSendMandatInvit}
                disabled={isSendingMandatInvit}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  isSendingMandatInvit
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border border-amber-800/50 cursor-pointer'
                }`}
              >
                {isSendingMandatInvit ? (
                  <><span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin inline-block" /> Envoi en cours...</>
                ) : (
                  <>📧 Renvoyer l'invitation mandat</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timeline des activités */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <LeadTimeline crmLeadId={leadId} nomLead={lead ? `${lead.prenom} ${lead.nom}` : undefined} />
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function RechercheBienBoard() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | "actif" | "en_pause" | "cloture" | "perdu">("tous");
  const [filterOffre, setFilterOffre] = useState<"tous" | "acceptee" | "en_cours">("tous");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const { data: rawLeads, isLoading, refetch } = trpc.crm.list.useQuery({
    etape: "recherche_bien",
    limit: 200,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const leads: RechercheLead[] = ((rawLeads as any)?.items ?? []) as RechercheLead[];

  // Filtres
  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.nom.toLowerCase().includes(q)
      || l.prenom.toLowerCase().includes(q)
      || l.email.toLowerCase().includes(q)
      || (l.agentAssigne ?? "").toLowerCase().includes(q);
    const matchStatut = filterStatut === "tous" || l.statut === filterStatut;
    const matchOffre =
      filterOffre === "tous"
      || (filterOffre === "acceptee" && l.offreAcceptee)
      || (filterOffre === "en_cours" && !l.offreAcceptee);
    return matchSearch && matchStatut && matchOffre;
  });

  // Statistiques
  const total = leads.length;
  const aTraiter = leads.filter((l) => !l.agentAssigne).length;
  const avecAgent = leads.filter((l) => !!l.agentAssigne).length;
  const offreAcceptee = leads.filter((l) => l.offreAcceptee).length;
  const totalBiens = leads.reduce((sum, l) => sum + (l.nbBiensPresentes ?? 0), 0);

  const exportCSV = () => {
    const rows = [
      ["Prénom", "Nom", "Email", "Téléphone", "Statut", "Agent assigné", "Biens présentés", "Offre acceptée", "Enveloppe (€)", "Formule", "Dernière action"],
      ...filtered.map((l) => [
        l.prenom,
        l.nom,
        l.email,
        l.telephone ?? "",
        l.statut,
        l.agentAssigne ?? "",
        String(l.nbBiensPresentes ?? 0),
        l.offreAcceptee ? "Oui" : "Non",
        l.enveloppeValidee ? String(l.enveloppeValidee) : "",
        l.formule ?? "",
        new Date(l.updatedAt).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recherche-bien-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-2xl">🏠</span>
              Recherche bien — Élodie
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Tous les leads en étape Recherche bien · Mise à jour en temps réel
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportCSV}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-400 hover:text-white h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              onClick={() => refetch()}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-400 hover:text-white h-8 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total leads", value: total, color: "text-white", bg: "bg-zinc-900 border-zinc-800" },
            { label: "À traiter", value: aTraiter, color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" },
            { label: "Agent assigné", value: avecAgent, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
            { label: "Offre acceptée", value: offreAcceptee, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
            { label: "Biens présentés", value: totalBiens, color: "text-teal-400", bg: "bg-teal-500/5 border-teal-500/20" },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl p-4 border ${kpi.bg}`}>
              <p className="text-xs text-zinc-500 mb-1">{kpi.label}</p>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un lead ou agent..."
              className="pl-9 bg-zinc-900 border-zinc-700 text-sm h-9"
            />
          </div>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 h-9"
          >
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="en_pause">En pause</option>
            <option value="cloture">Clôturé</option>
            <option value="perdu">Perdu</option>
          </select>
          <select
            value={filterOffre}
            onChange={(e) => setFilterOffre(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 h-9"
          >
            <option value="tous">Toutes les offres</option>
            <option value="acceptee">Offre acceptée</option>
            <option value="en_cours">En recherche</option>
          </select>
        </div>

        {/* Résultats */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {leads.length === 0
                ? "Aucun lead en étape Recherche bien pour l'instant."
                : "Aucun résultat pour ces filtres."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-600 mb-4">
              {filtered.length} lead{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
            </p>

            {/* Vue tableau (desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Client</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Statut</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Agent assigné</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Avancement</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Enveloppe</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Dernière action</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3">Modules</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const status = getRechercheStatus(lead);
                    const statutCfg = STATUT_CONFIG[lead.statut] ?? STATUT_CONFIG.actif;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="border-b border-zinc-900 hover:bg-zinc-900/60 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-white group-hover:text-teal-300 transition-colors">
                            {lead.prenom} {lead.nom}
                          </p>
                          <p className="text-xs text-zinc-500 truncate max-w-48">{lead.email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statutCfg.color}`}>
                            {statutCfg.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {lead.agentAssigne ? (
                            <span className="text-white text-xs font-medium">{lead.agentAssigne}</span>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">Non assigné</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {lead.enveloppeValidee ? (
                            <span className="text-xs text-emerald-400 font-medium">
                              {lead.enveloppeValidee.toLocaleString("fr-FR")} €
                            </span>
                          ) : (
                            <span className="text-zinc-700 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {lead.updatedAt ? (() => {
                            const diff = Date.now() - new Date(lead.updatedAt).getTime();
                            const days = Math.floor(diff / 86400000);
                            return (
                              <span className={`text-xs ${
                                days >= 7 ? "text-red-400" :
                                days >= 3 ? "text-amber-400" :
                                "text-zinc-400"
                              }`}>
                                {days === 0 ? "Aujourd'hui" : days === 1 ? "Hier" : `Il y a ${days}j`}
                              </span>
                            );
                          })() : <span className="text-zinc-700 text-xs">—</span>}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.leadId ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
                              EC
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.mandatId ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
                              M
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.hexaId ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
                              H
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vue cartes (mobile) */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filtered.map((lead) => {
                const status = getRechercheStatus(lead);
                const statutCfg = STATUT_CONFIG[lead.statut] ?? STATUT_CONFIG.actif;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-teal-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white text-sm">{lead.prenom} {lead.nom}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{lead.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statutCfg.color}`}>
                        {statutCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Home className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      {lead.agentAssigne ? (
                        <span className="text-xs text-zinc-300">{lead.agentAssigne}</span>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Aucun agent assigné</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${status.color}`}>
                      {status.icon}
                      <span>{status.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal fiche détail */}
      <Dialog open={!!selectedLeadId} onOpenChange={(open) => { if (!open) setSelectedLeadId(null); }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Home className="w-5 h-5 text-teal-400" />
              Suivi Recherche bien
            </DialogTitle>
          </DialogHeader>
          {selectedLeadId && (
            <RechercheBienDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

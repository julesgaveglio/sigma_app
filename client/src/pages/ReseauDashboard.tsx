import { useState, useMemo, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import PartnerDocumentsSection from "@/components/PartnerDocumentsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Home, TrendingUp, ChevronRight, ChevronDown, ChevronUp,
  Search, Filter, Eye, CheckCircle, Clock, XCircle, Star, MapPin,
  Euro, Maximize2, Building2, UserCheck, UserX, AlertCircle, ArrowLeft, Trash2,
  AlertTriangle, RefreshCw, Map, Send, FileText, Plus, Mail, Phone, MapPin as MapPinIcon, Download, FileDown
} from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";
import { CarteReseau } from "@/components/CarteReseau";

const STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  actif: "bg-green-500/10 text-green-400 border-green-500/30",
  suspendu: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  resilie: "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUT_BIEN_COLORS: Record<string, string> = {
  en_attente_validation: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  publie: "bg-green-500/10 text-green-400 border-green-500/30",
  sous_compromis: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  vendu: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  retire: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente", actif: "Actif", suspendu: "Suspendu", resilie: "Résilié",
  en_attente_validation: "À valider", publie: "Publié", sous_compromis: "Sous compromis",
  vendu: "Vendu", retire: "Retiré",
};

export default function ReseauDashboard() {
  const searchStr = useSearch();
  const urlParams = searchStr ? new URLSearchParams(searchStr) : new URLSearchParams();
  const urlBienId = parseInt(urlParams.get("bienId") ?? "");
  const urlTab = urlParams.get("tab") ?? "";

  const [activeTab, setActiveTab] = useState(urlTab || "reseau");
  const [highlightedBienId, setHighlightedBienId] = useState<number | null>(isNaN(urlBienId) ? null : urlBienId);
  const highlightedBienRef = useRef<HTMLDivElement | null>(null);

  // Basculer sur l'onglet biens et scroller vers le bien si ?bienId= dans l'URL
  useEffect(() => {
    if (!isNaN(urlBienId) && urlTab === "biens") {
      setActiveTab("biens");
      setHighlightedBienId(urlBienId);
      const timer = setTimeout(() => {
        if (highlightedBienRef.current) {
          highlightedBienRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        // Effacer la surbrillance après 3s
        setTimeout(() => setHighlightedBienId(null), 3000);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [urlBienId, urlTab]);
  const [searchAmb, setSearchAmb] = useState("");
  const [searchBien, setSearchBien] = useState("");
  const [filtreStatutAmb, setFiltreStatutAmb] = useState("all");
  const [filtreStatutBien, setFiltreStatutBien] = useState("all");
  const [filtreSourceBien, setFiltreSourceBien] = useState<"all" | "ambassadeur" | "pap_scrape" | "off_market">("all");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedAmb, setSelectedAmb] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedLeadForMatching, setSelectedLeadForMatching] = useState<number | null>(null);
  const [selectedBiensForLead, setSelectedBiensForLead] = useState<number[]>([]);
  const [showMatchingDialog, setShowMatchingDialog] = useState(false);
  // Matching pipeline
  const [matchingActiveDossier, setMatchingActiveDossier] = useState<any | null>(null);
  const [matchingModeElargi, setMatchingModeElargi] = useState(0);
  const [showMatchingPipeline, setShowMatchingPipeline] = useState(false);
  const [matchingNotesEdit, setMatchingNotesEdit] = useState("");
  // Modale prévisualisation fiche bien
  const [showProposerModal, setShowProposerModal] = useState(false);
  const [proposerBienId, setProposerBienId] = useState<number | null>(null);
  const [proposerPdfUrl, setProposerPdfUrl] = useState<string | null>(null);
  const [proposerMessage, setProposerMessage] = useState("");
  const [proposerStep, setProposerStep] = useState<"preview" | "confirm" | "done">("preview");
  const [matchingLeadSearch, setMatchingLeadSearch] = useState("");
  const [typeReseau, setTypeReseau] = useState<"agents" | "courtiers">("agents");
  const [expandedCourtierNodes, setExpandedCourtierNodes] = useState<Set<number>>(new Set());
  const [selectedCourtier, setSelectedCourtier] = useState<number | null>(null);
  const [searchCourtier, setSearchCourtier] = useState("");
  const [filtreStatutCourtier, setFiltreStatutCourtier] = useState("tous");
  const [showAssignerDossier, setShowAssignerDossier] = useState(false);
  const [selectedDossierToAssign, setSelectedDossierToAssign] = useState<number | null>(null);
  const [noteAssignation, setNoteAssignation] = useState("");
  const [searchDossierAssign, setSearchDossierAssign] = useState("");
  // Panneau de détail d'un bien ambassadeur
  const [selectedBienDetail, setSelectedBienDetail] = useState<any | null>(null);

  const { data: stats } = trpc.ambassadeurs.stats.useQuery();
  const { data: statsCourtiers } = trpc.courtiers.statsGlobales.useQuery();
  const { data: ambassadeursList } = trpc.ambassadeurs.list.useQuery({ search: searchAmb, statut: filtreStatutAmb === "all" ? undefined : filtreStatutAmb });
  const { data: arborescence } = trpc.ambassadeurs.arborescence.useQuery();
  const { data: arborescenceCourtiers } = trpc.courtiers.arborescence.useQuery();
  const { data: courtierDetail } = trpc.courtiers.getById.useQuery({ id: selectedCourtier! }, { enabled: !!selectedCourtier });
  const { data: courtiersList } = trpc.courtiers.list.useQuery({ search: searchCourtier || undefined, statut: filtreStatutCourtier as any });
  const { data: dossiersFinancement = [] } = trpc.financement.lister.useQuery(undefined, { enabled: showAssignerDossier });
  const { data: biensList } = trpc.ambassadeurs.listBiens.useQuery({ search: searchBien, statut: filtreStatutBien === "all" ? undefined : filtreStatutBien });
  const { data: offMarketBiensList } = trpc.offMarket.list.useQuery({ search: searchBien || undefined, limit: 200 });
  const { data: ambDetail } = trpc.ambassadeurs.byId.useQuery({ id: selectedAmb! }, { enabled: !!selectedAmb });
  const utils = trpc.useUtils();
  const { data: crmLeads } = trpc.crm.list.useQuery();
  const { data: matchingBiens } = trpc.ambassadeurs.matchingLeads.useQuery(
    { crmLeadId: selectedLeadForMatching!, modeElargi: matchingModeElargi },
    { enabled: !!selectedLeadForMatching }
  );
  const { data: matchingDossiers = [], refetch: refetchDossiers } = trpc.ambassadeurs.matchingListDossiers.useQuery();
  // Queries pour le panneau de détail d'un bien ambassadeur
  const { data: bienDetailMedias } = trpc.ambassadeurs.listBienMedias.useQuery(
    { bienId: selectedBienDetail?.id ?? 0, ambassadeurId: selectedBienDetail?.ambassadeurId ?? 0 },
    { enabled: !!selectedBienDetail }
  );
  const { data: bienDetailPropositions = [] } = trpc.calendar.listPropositionsByBien.useQuery(
    { bienId: selectedBienDetail?.id ?? 0 },
    { enabled: !!selectedBienDetail }
  );
  const { data: matchingLeadDetail } = trpc.crm.getById.useQuery(
    { id: matchingActiveDossier?.crmLeadId! },
    { enabled: !!matchingActiveDossier?.crmLeadId }
  );
  const deleteCrmLead = trpc.crm.delete.useMutation({
    onSuccess: () => { utils.crm.list.invalidate(); toast.success("Lead supprimé"); },
    onError: (e) => toast.error(e.message),
  });
  const getOrCreateDossier = trpc.ambassadeurs.matchingGetOrCreateDossier.useMutation({
    onSuccess: (dossier) => {
      setMatchingActiveDossier(dossier);
      setMatchingNotesEdit(dossier?.notes ?? "");
      setShowMatchingPipeline(true);
      refetchDossiers();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateDossier = trpc.ambassadeurs.matchingUpdateDossier.useMutation({
    onSuccess: () => { refetchDossiers(); toast.success("Dossier mis à jour"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDossier = trpc.ambassadeurs.matchingDeleteDossier.useMutation({
    onSuccess: () => { refetchDossiers(); setShowMatchingPipeline(false); toast.success("Dossier supprimé"); },
    onError: (e) => toast.error(e.message),
  });


  // ─── Triggers inactivité agents ──────────────────────────────────────────
  const { data: agentsInactifs = [], refetch: refetchInactifs } = trpc.triggers.checkInactiviteAgents.useQuery();
  const declencherTriggerAgent = trpc.triggers.declencherTriggerAgent.useMutation({
    onSuccess: (data) => {
      toast.success(data.message ?? "Agent suspendu et Élodie notifiée");
      utils.ambassadeurs.list.invalidate();
      refetchInactifs();
    },
    onError: (e) => toast.error(e.message),
  });
  const reactiverAgent = trpc.triggers.reactiverAgent.useMutation({
    onSuccess: () => { toast.success("Agent réactivé"); utils.ambassadeurs.list.invalidate(); refetchInactifs(); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatutAmb = trpc.ambassadeurs.updateStatut.useMutation({
    onSuccess: () => utils.ambassadeurs.list.invalidate(),
  });

  const updateStatutBien = trpc.ambassadeurs.updateBienStatut.useMutation({
    onSuccess: () => utils.ambassadeurs.listBiens.invalidate(),
  });

  const deleteAmb = trpc.ambassadeurs.delete.useMutation({
    onSuccess: () => utils.ambassadeurs.list.invalidate(),
  });

  const handleDeleteAmb = (id: number, nom: string) => {
    if (window.confirm(`Supprimer l'agent ${nom} ? Cette action est irréversible.`)) {
      deleteAmb.mutate({ id });
    }
  };

  const updateStatutCourtier = trpc.courtiers.updateStatut.useMutation({
    onSuccess: () => {
      utils.courtiers.arborescence.invalidate();
      utils.courtiers.list.invalidate();
      utils.courtiers.getById.invalidate({ id: selectedCourtier! });
      toast.success("Statut mis à jour");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCourtier = trpc.courtiers.delete.useMutation({
    onSuccess: () => {
      utils.courtiers.arborescence.invalidate();
      utils.courtiers.list.invalidate();
      setSelectedCourtier(null);
      toast.success("Courtier supprimé");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDeleteCourtier = (id: number, nom: string) => {
    if (window.confirm(`Supprimer le courtier ${nom} ? Cette action est irréversible.`)) {
      deleteCourtier.mutate({ id });
    }
  };

  const renvoyerBienvenue = trpc.courtiers.renvoyerEmailBienvenue.useMutation({
    onSuccess: (r) => toast.success(r.message ?? "Email envoyé"),
    onError: (e) => toast.error(e.message),
  });
  const renvoyerBienvenueAmb = trpc.ambassadeurs.renvoyerEmailBienvenue.useMutation({
    onSuccess: (r) => toast.success(r.message ?? "Email envoyé"),
    onError: (e) => toast.error(e.message),
  });

  const assignerDossier = trpc.financement.assigner.useMutation({
    onSuccess: (r) => {
      toast.success(`Dossier assigné à ${courtierDetail?.courtier.prenom} ${courtierDetail?.courtier.nom}`);
      setShowAssignerDossier(false);
      setSelectedDossierToAssign(null);
      setNoteAssignation("");
      utils.courtiers.getById.invalidate({ id: selectedCourtier! });
    },
    onError: (e) => toast.error(e.message),
  });

  const dossiersFiltered = useMemo(() => {
    if (!dossiersFinancement) return [];
    const q = searchDossierAssign.toLowerCase();
    return (dossiersFinancement as any[]).filter((d: any) =>
      !q || `${d.emprunteur1Prenom} ${d.emprunteur1Nom}`.toLowerCase().includes(q)
    );
  }, [dossiersFinancement, searchDossierAssign]);

  // Vérifier si ce bien a déjà été proposé au lead sélectionné
  const { data: doublonCheck } = trpc.calendar.checkDoublon.useQuery(
    { bienId: proposerBienId!, crmLeadId: selectedLeadForMatching! },
    { enabled: !!proposerBienId && !!selectedLeadForMatching }
  );

  // Stats fiches envoyées par lead
  const { data: statsParLead } = trpc.calendar.getStatsParLead.useQuery();
  const getFichesCount = (leadId: number) => {
    return statsParLead?.find((s: any) => s.crmLeadId === leadId)?.total ?? 0;
  };

  const previewBienPdf = trpc.calendar.previewBienPdf.useMutation({
    onSuccess: (data) => {
      setProposerPdfUrl(data.url);
      setProposerStep("confirm");
    },
    onError: (e) => toast.error("Erreur génération PDF : " + e.message),
  });
  const proposerBienAuLead = trpc.calendar.proposerBienAuLead.useMutation({
    onSuccess: () => {
      setProposerStep("done");
      toast.success("Fiche bien envoyée au lead !");
    },
    onError: (e) => toast.error("Erreur envoi : " + e.message),
  });
  const handleOpenProposer = (bienId: number) => {
    setProposerBienId(bienId);
    setProposerPdfUrl(null);
    setProposerMessage("");
    setProposerStep("preview");
    setShowProposerModal(true);
    previewBienPdf.mutate({ bienId });
  };
  const proposerBiens = trpc.ambassadeurs.proposerBiens.useMutation({
    onSuccess: () => {
      setShowMatchingDialog(false);
      setSelectedBiensForLead([]);
      utils.crm.list.invalidate();
    },
  });

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCourtierNode = (id: number) => {
    setExpandedCourtierNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBienSelection = (id: number) => {
    setSelectedBiensForLead(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AdminNav />
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111] border border-[#222] text-gray-400 hover:text-white hover:border-[#C9A84C] transition-colors" title="Retour">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              Réseau <span className="text-[#C9A84C]">Agents</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Gestion du réseau d'affiliation Sigma Factory</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/ambassadeur/bien">
            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm">
              <Building2 className="mr-2 w-4 h-4" />
              Déposer un bien
            </Button>
          </a>
          <a href="/ambassadeur" target="_blank">
            <Button className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold text-sm">
              <Users className="mr-2 w-4 h-4" />
              Page de recrutement
            </Button>
          </a>
        </div>
      </div>

      {/* ── Panneau alertes inactivité agents ── */}
      {agentsInactifs.length > 0 && (
        <div className="border border-red-500/40 bg-red-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-red-400 font-bold text-sm">{agentsInactifs.length} agent(s) inactif(s) — aucun bien posé depuis plus de 30 jours</h3>
          </div>
          <div className="space-y-2">
            {agentsInactifs.map((a: any) => (
              <div key={a.agentId} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <div className="text-white font-semibold text-sm">{a.agentNom}</div>
                    <div className="text-red-300 text-xs">
                      {a.nbBiensTotaux === 0 ? "Aucun bien posé" : `Dernier bien : ${a.dernierBienDate ? new Date(a.dernierBienDate).toLocaleDateString("fr-FR") : "—"}`}
                      {" · "}{a.joursInactivite}j d'inactivité · {a.agentEmail}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.statutInterne !== "suspendu" && (
                    <Button
                      size="sm"
                      onClick={() => declencherTriggerAgent.mutate({ agentId: a.agentId })}
                      disabled={declencherTriggerAgent.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Suspendre + Notifier Élodie
                    </Button>
                  )}
                  {a.statutInterne === "suspendu" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reactiverAgent.mutate({ agentId: a.agentId })}
                      disabled={reactiverAgent.isPending}
                      className="border-green-500/40 text-green-400 hover:bg-green-500/10 text-xs gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réactiver
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats globales réseau */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Agents actifs", value: stats?.actifs ?? 0, sub: `${stats?.total ?? 0} au total`, icon: Users, color: "text-green-400" },
          { label: "Courtiers actifs", value: statsCourtiers?.courtiersActifs ?? 0, sub: `${statsCourtiers?.totalCourtiers ?? 0} au total`, icon: Building2, color: "text-[#C9A84C]" },
          { label: "Biens disponibles", value: stats?.biensDispos ?? 0, sub: "dans le portefeuille", icon: Home, color: "text-purple-400" },
          { label: "Dossiers validés", value: statsCourtiers?.dossiersValides ?? 0, sub: `${statsCourtiers?.dossiersEnCours ?? 0} en cours`, icon: TrendingUp, color: "text-blue-400" },
        ].map((s, i) => (
          <div key={i} className="bg-[#111] border border-[#222] p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#111] border border-[#222]">
          <TabsTrigger value="reseau" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-black text-gray-400">
            <Users className="mr-2 w-4 h-4" /> Réseau
          </TabsTrigger>
          <TabsTrigger value="ambassadeurs" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-black text-gray-400">
            <UserCheck className="mr-2 w-4 h-4" /> Liste Agents
          </TabsTrigger>
          <TabsTrigger value="biens" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-black text-gray-400">
            <Home className="mr-2 w-4 h-4" /> Portefeuille de biens
          </TabsTrigger>
          <TabsTrigger value="courtiers" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-black text-gray-400">
            <Building2 className="mr-2 w-4 h-4" /> Liste Courtiers
          </TabsTrigger>
          <TabsTrigger value="matching" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-black text-gray-400">
            <TrendingUp className="mr-2 w-4 h-4" /> Matching leads
          </TabsTrigger>
          <TabsTrigger value="carte" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-black text-gray-400">
            <Map className="mr-2 w-4 h-4" /> Carte du réseau
          </TabsTrigger>
        </TabsList>

        {/* ONGLET RÉSEAU — Arborescence */}
        <TabsContent value="reseau" className="mt-4">
          <div className="bg-[#111] border border-[#222] p-6">
            {/* Sélecteur type réseau */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Arborescence du réseau</h3>
              <Select value={typeReseau} onValueChange={(v) => setTypeReseau(v as "agents" | "courtiers")}>
                <SelectTrigger className="w-44 bg-[#1a1a1a] border-[#333] text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333]">
                  <SelectItem value="agents" className="text-white">Agents immo</SelectItem>
                  <SelectItem value="courtiers" className="text-white">Courtiers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Arborescence Agents */}
            {typeReseau === "agents" && (!arborescence?.length ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun agent pour l'instant</p>
                <p className="text-xs mt-1">Partagez la page de recrutement pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {arborescence.map((parent: any) => (
                  <div key={parent.id} className="border border-[#222]">
                    {/* Ambassadeur N1 */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a1a1a]"
                      onClick={() => toggleNode(parent.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center">
                          <span className="text-[#C9A84C] text-xs font-black">N1</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">{parent.prenom} {parent.nom}</p>
                          <p className="text-gray-400 text-xs">{parent.email} — {parent.ville}</p>
                        </div>
                        <Badge className={`text-xs border ${STATUT_COLORS[parent.statutInterne] ?? ""}`}>
                          {STATUT_LABELS[parent.statutInterne]}
                        </Badge>
                        {parent.filleuls?.length > 0 && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                            {parent.filleuls.length} filleul{parent.filleuls.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={e => { e.stopPropagation(); setSelectedAmb(parent.id); }}
                          className="text-gray-400 hover:text-white h-7 px-2"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {expandedNodes.has(parent.id) ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>

                    {/* Filleuls N2 */}
                    {expandedNodes.has(parent.id) && parent.filleuls?.length > 0 && (
                      <div className="border-t border-[#222] bg-[#0d0d0d]">
                        {parent.filleuls.map((filleul: any) => (
                          <div key={filleul.id} className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] last:border-0">
                            <div className="flex items-center gap-3 ml-8">
                              <div className="w-6 h-6 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <span className="text-blue-400 text-xs font-black">N2</span>
                              </div>
                              <div>
                                <p className="text-gray-200 font-medium text-sm">{filleul.prenom} {filleul.nom}</p>
                                <p className="text-gray-500 text-xs">{filleul.email} — {filleul.ville}</p>
                              </div>
                              <Badge className={`text-xs border ${STATUT_COLORS[filleul.statutInterne] ?? ""}`}>
                                {STATUT_LABELS[filleul.statutInterne]}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedAmb(filleul.id)}
                              className="text-gray-400 hover:text-white h-7 px-2"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
               </div>
            ))}

            {/* Arborescence Courtiers */}
            {typeReseau === "courtiers" && (!arborescenceCourtiers?.length ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun courtier pour l'instant</p>
                <p className="text-xs mt-1">Partagez la page d'inscription courtier pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {arborescenceCourtiers.map((parent: any) => (
                  <div key={parent.id} className="border border-[#222]">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a1a1a]"
                      onClick={() => toggleCourtierNode(parent.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                          <span className="text-blue-400 text-xs font-black">N1</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">{parent.prenom} {parent.nom}</p>
                          <p className="text-gray-400 text-xs">{parent.email} — {parent.ville}</p>
                          {parent.codeParrain && <p className="text-[#C9A84C] text-xs font-mono mt-0.5">{parent.codeParrain}</p>}
                        </div>
                        <Badge className={`text-xs border ${STATUT_COLORS[parent.statutInterne] ?? ""}`}>
                          {STATUT_LABELS[parent.statutInterne]}
                        </Badge>
                        {parent.filleuls?.length > 0 && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                            {parent.filleuls.length} filleul{parent.filleuls.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={e => { e.stopPropagation(); setSelectedCourtier(parent.id); }}
                          className="text-gray-400 hover:text-white h-7 px-2"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {expandedCourtierNodes.has(parent.id) ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>
                    {expandedCourtierNodes.has(parent.id) && parent.filleuls?.length > 0 && (
                      <div className="border-t border-[#222] bg-[#0d0d0d]">
                        {parent.filleuls.map((filleul: any) => (
                          <div key={filleul.id} className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] last:border-0">
                            <div className="flex items-center gap-3 ml-8">
                              <div className="w-6 h-6 bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
                                <span className="text-[#C9A84C] text-xs font-black">N2</span>
                              </div>
                              <div>
                                <p className="text-gray-200 font-medium text-sm">{filleul.prenom} {filleul.nom}</p>
                                <p className="text-gray-500 text-xs">{filleul.email} — {filleul.ville}</p>
                                {filleul.codeParrain && <p className="text-[#C9A84C] text-xs font-mono">{filleul.codeParrain}</p>}
                              </div>
                              <Badge className={`text-xs border ${STATUT_COLORS[filleul.statutInterne] ?? ""}`}>
                                {STATUT_LABELS[filleul.statutInterne]}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedCourtier(filleul.id)}
                              className="text-gray-400 hover:text-white h-7 px-2"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* DIALOG DÉTAIL COURTIER */}
        <Dialog open={!!selectedCourtier} onOpenChange={open => { if (!open) { setSelectedCourtier(null); setShowAssignerDossier(false); setSelectedDossierToAssign(null); setNoteAssignation(""); } }}>
          <DialogContent className="bg-[#111] border-[#222] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-lg">Fiche courtier</DialogTitle>
            </DialogHeader>
            {courtierDetail && (
              <div className="space-y-5">
                {/* En-tête identité */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-black text-white">{courtierDetail.courtier.prenom} {courtierDetail.courtier.nom}</p>
                    {courtierDetail.courtier.cabinetNom && <p className="text-[#C9A84C] text-sm font-medium">{courtierDetail.courtier.cabinetNom}</p>}
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="flex items-center gap-1 text-gray-400 text-xs"><Mail className="w-3 h-3" />{courtierDetail.courtier.email}</span>
                      <span className="flex items-center gap-1 text-gray-400 text-xs"><Phone className="w-3 h-3" />{courtierDetail.courtier.telephone}</span>
                      {courtierDetail.courtier.ville && <span className="flex items-center gap-1 text-gray-400 text-xs"><MapPinIcon className="w-3 h-3" />{courtierDetail.courtier.ville}</span>}
                    </div>
                    <p className="text-[#C9A84C] font-mono text-xs mt-1">Code parrain : {courtierDetail.courtier.codeParrain}</p>
                  </div>
                  <Badge className={`text-xs border ${STATUT_COLORS[courtierDetail.courtier.statutInterne] ?? ""} shrink-0`}>
                    {STATUT_LABELS[courtierDetail.courtier.statutInterne]}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Dossiers", value: courtierDetail.stats.totalDossiers, color: "text-white" },
                    { label: "Filleuls", value: courtierDetail.stats.totalFilleuls, color: "text-white" },
                    { label: "Commissions", value: (courtierDetail.stats.totalCommissions / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-[#C9A84C]" },
                    { label: "Payées", value: (courtierDetail.stats.commissionsPayees / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), color: "text-green-400" },
                  ].map(s => (
                    <div key={s.label} className="bg-[#1a1a1a] border border-[#222] p-3 text-center">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{s.label}</p>
                      <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* ─── SECTION ASSIGNER UN DOSSIER ─── */}
                <div className="border border-[#C9A84C]/30 bg-[#C9A84C]/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#C9A84C] text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Assigner un dossier de financement
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#C9A84C] hover:bg-[#C9A84C]/10 h-7 px-2 text-xs"
                      onClick={() => setShowAssignerDossier(v => !v)}
                    >
                      {showAssignerDossier ? "Masquer" : <><Plus className="w-3 h-3 mr-1" />Choisir un dossier</>}
                    </Button>
                  </div>
                  {showAssignerDossier && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <Input
                          value={searchDossierAssign}
                          onChange={e => setSearchDossierAssign(e.target.value)}
                          placeholder="Rechercher un lead (nom)..."
                          className="pl-8 h-8 text-xs bg-[#111] border-[#333] text-white placeholder:text-gray-600"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {dossiersFiltered.length === 0 ? (
                          <p className="text-gray-500 text-xs text-center py-3">Aucun dossier disponible</p>
                        ) : dossiersFiltered.map((d: any) => (
                          <div
                            key={d.id}
                            onClick={() => setSelectedDossierToAssign(d.id === selectedDossierToAssign ? null : d.id)}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer border text-xs ${
                              selectedDossierToAssign === d.id
                                ? "border-[#C9A84C] bg-[#C9A84C]/10"
                                : "border-[#222] bg-[#111] hover:border-[#333]"
                            }`}
                          >
                            <div>
                              <p className="text-white font-medium">{d.emprunteur1Prenom} {d.emprunteur1Nom}</p>
                              <p className="text-gray-500">{d.montantProjet?.toLocaleString("fr-FR")} € · {d.duree} mois</p>
                            </div>
                            <Badge className={`text-xs border ${STATUT_COLORS[d.statut] ?? "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
                              {STATUT_LABELS[d.statut] ?? d.statut}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      {selectedDossierToAssign && (
                        <>
                          <Textarea
                            value={noteAssignation}
                            onChange={e => setNoteAssignation(e.target.value)}
                            placeholder="Note pour le courtier (optionnel)..."
                            className="text-xs bg-[#111] border-[#333] text-white placeholder:text-gray-600 min-h-[60px]"
                          />
                          <Button
                            size="sm"
                            className="w-full bg-[#C9A84C] hover:bg-[#b8963e] text-black font-semibold h-8 text-xs"
                            disabled={assignerDossier.isPending}
                            onClick={() => assignerDossier.mutate({
                              dossierFinancementId: selectedDossierToAssign,
                              courtierIds: [courtierDetail.courtier.id],
                              noteManon: noteAssignation || undefined,
                            })}
                          >
                            <Send className="w-3.5 h-3.5 mr-2" />
                            {assignerDossier.isPending ? "Envoi..." : "Assigner ce dossier"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-[#222] pt-4 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Statut</p>
                    <Select
                      value={courtierDetail.courtier.statutInterne}
                      onValueChange={v => updateStatutCourtier.mutate({ id: courtierDetail.courtier.id, statutInterne: v as any })}
                    >
                      <SelectTrigger className={`w-full h-9 text-sm border ${STATUT_COLORS[courtierDetail.courtier.statutInterne] ?? ""} bg-transparent`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#333]">
                        <SelectItem value="en_attente" className="text-yellow-400">En attente</SelectItem>
                        <SelectItem value="actif" className="text-green-400">Actif</SelectItem>
                        <SelectItem value="suspendu" className="text-orange-400">Suspendu</SelectItem>
                        <SelectItem value="resilie" className="text-red-400">Résilié</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 justify-end">
                    {courtierDetail.courtier.contratSigneUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 bg-transparent text-xs h-8"
                        onClick={() => window.open(courtierDetail.courtier.contratSigneUrl ?? undefined, '_blank')}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Télécharger contrat
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#333] text-gray-300 hover:text-white bg-transparent text-xs h-8"
                      onClick={() => renvoyerBienvenue.mutate({ id: courtierDetail.courtier.id })}
                      disabled={renvoyerBienvenue.isPending}
                    >
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Renvoyer email bienvenue
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10 bg-transparent text-xs h-8"
                      onClick={() => handleDeleteCourtier(courtierDetail.courtier.id, `${courtierDetail.courtier.prenom} ${courtierDetail.courtier.nom}`)}
                      disabled={deleteCourtier.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>

                {courtierDetail.filleulsCourtiers.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Filleuls courtiers ({courtierDetail.filleulsCourtiers.length})</p>
                    <div className="space-y-1">
                      {courtierDetail.filleulsCourtiers.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between bg-[#1a1a1a] px-3 py-2">
                          <span className="text-gray-200 text-sm">{f.prenom} {f.nom}</span>
                          <Badge className={`text-xs border ${STATUT_COLORS[f.statutInterne] ?? ""}`}>{STATUT_LABELS[f.statutInterne]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ONGLET LISTE AGENTS — Tableau filtrable */}
        <TabsContent value="ambassadeurs" className="mt-4">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchAmb}
                  onChange={e => setSearchAmb(e.target.value)}
                  placeholder="Rechercher un ambassadeur..."
                  className="pl-9 bg-[#111] border-[#222] text-white placeholder:text-gray-600"
                />
              </div>
              <Select value={filtreStatutAmb} onValueChange={setFiltreStatutAmb}>
                <SelectTrigger className="w-44 bg-[#111] border-[#222] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#333]">
                  <SelectItem value="all" className="text-white">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente" className="text-white">En attente</SelectItem>
                  <SelectItem value="actif" className="text-white">Actif</SelectItem>
                  <SelectItem value="suspendu" className="text-white">Suspendu</SelectItem>
                  <SelectItem value="resilie" className="text-white">Résilié</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-[#111] border border-[#222] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Ambassadeur</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Niveau</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Statut</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Ville</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Inscription</th>
                    <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Dernière connexion</th>
                    <th className="text-right p-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!ambassadeursList?.length ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">Aucun agent</td>
                    </tr>
                  ) : ambassadeursList.map((amb: any) => (
                    <tr key={amb.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                      <td className="p-3">
                        <p className="text-white font-medium">{amb.prenom} {amb.nom}</p>
                        <p className="text-gray-500 text-xs">{amb.email}</p>
                      </td>
                      <td className="p-3">
                        <Badge className={`text-xs border ${amb.niveau === "1" ? "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}`}>
                          Niveau {amb.niveau} — {amb.niveau === "1" ? "10%" : "5%"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Select
                          value={amb.statutInterne}
                          onValueChange={v => updateStatutAmb.mutate({ id: amb.id, statut: v as any })}
                        >
                          <SelectTrigger className={`w-36 h-7 text-xs border ${STATUT_COLORS[amb.statutInterne]} bg-transparent`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111] border-[#333]">
                            <SelectItem value="en_attente" className="text-white text-xs">En attente</SelectItem>
                            <SelectItem value="actif" className="text-white text-xs">Actif</SelectItem>
                            <SelectItem value="suspendu" className="text-white text-xs">Suspendu</SelectItem>
                            <SelectItem value="resilie" className="text-white text-xs">Résilié</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-gray-300 text-xs">{amb.ville}</td>
                      <td className="p-3 text-gray-400 text-xs">
                        {new Date(amb.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3">
                        {(amb as any).lastSignedIn ? (
                          <div>
                            <div className="text-xs text-gray-300">{new Date((amb as any).lastSignedIn).toLocaleDateString("fr-FR")}</div>
                            <div className="text-xs text-gray-600">{new Date((amb as any).lastSignedIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 italic">Jamais connecté</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedAmb(amb.id)}
                            className="text-gray-400 hover:text-[#C9A84C] h-7 px-2"
                            title="Voir le détail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAmb(amb.id, `${amb.prenom} ${amb.nom}`)}
                            className="text-gray-500 hover:text-red-400 h-7 px-2"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ONGLET BIENS */}
        <TabsContent value="biens" className="mt-4">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchBien}
                  onChange={e => setSearchBien(e.target.value)}
                  placeholder="Rechercher un bien..."
                  className="pl-9 bg-[#111] border-[#222] text-white placeholder:text-gray-600"
                />
              </div>
              <Select value={filtreStatutBien} onValueChange={setFiltreStatutBien}>
                <SelectTrigger className="w-48 bg-[#111] border-[#222] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#333]">
                  <SelectItem value="all" className="text-white">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente_validation" className="text-white">À valider</SelectItem>
                  <SelectItem value="publie" className="text-white">Publié</SelectItem>
                  <SelectItem value="sous_compromis" className="text-white">Sous compromis</SelectItem>
                  <SelectItem value="vendu" className="text-white">Vendu</SelectItem>
                  <SelectItem value="retire" className="text-white">Retiré</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtreSourceBien} onValueChange={(v: any) => setFiltreSourceBien(v)}>
                <SelectTrigger className="w-48 bg-[#111] border-[#222] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#333]">
                  <SelectItem value="all" className="text-white">Toutes sources</SelectItem>
                  <SelectItem value="ambassadeur" className="text-white">Ambassadeurs</SelectItem>
                  <SelectItem value="pap_scrape" className="text-white">PAP</SelectItem>
                  <SelectItem value="off_market" className="text-white">Off Market</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={async () => {
                  try {
                    setExportingPdf(true);
                    const result = await utils.client.portefeuille.exportPdf.mutate({});
                    window.open(result.url, "_blank");
                    toast.success(`PDF généré — ${result.total} biens`, { description: "Le PDF s'ouvre dans un nouvel onglet" });
                  } catch (e: any) {
                    toast.error("Erreur lors de la génération du PDF", { description: e.message });
                  } finally {
                    setExportingPdf(false);
                  }
                }}
                disabled={exportingPdf}
                className="bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20 shrink-0"
              >
                {exportingPdf ? (
                  <><span className="animate-spin mr-2">&#9696;</span>Génération...</>
                ) : (
                  <><FileDown className="mr-2 w-4 h-4" />Export PDF</>
                )}
              </Button>
            </div>

            {/* Biens Off Market */}
            {(filtreSourceBien === "all" || filtreSourceBien === "off_market") && (offMarketBiensList?.items ?? []).length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">💎 Biens Off Market</span>
                  <span className="text-xs text-gray-500">({(offMarketBiensList?.items ?? []).filter((b: any) => filtreStatutBien === 'all' || (filtreStatutBien === 'publie' && b.statut === 'disponible') || b.statut === filtreStatutBien).length})</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(offMarketBiensList?.items ?? []).filter((b: any) => filtreStatutBien === 'all' || (filtreStatutBien === 'publie' && b.statut === 'disponible') || b.statut === filtreStatutBien).map((bien: any) => (
                    <div
                      key={`om-${bien.id}`}
                      className="bg-[#111] border border-emerald-500/20 p-5 space-y-3 hover:border-emerald-500/40 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/dashboard/off-market?id=${bien.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-white font-bold truncate">{bien.titre}</p>
                          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {bien.region ?? bien.departement ?? '—'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Badge className="text-xs border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            {bien.statut === 'disponible' ? 'Disponible' : bien.statut === 'sous_compromis' ? 'Sous compromis' : bien.statut === 'vendu' ? 'Vendu' : 'Archivé'}
                          </Badge>
                          <Badge className="text-xs border bg-emerald-900/30 text-emerald-300 border-emerald-500/20">Off Market</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Euro className="w-3.5 h-3.5" />
                          {bien.prixBien ? Number(bien.prixBien).toLocaleString('fr-FR') + ' €' : '—'}
                        </span>
                        {bien.surfaceTotale && <span className="flex items-center gap-1 text-gray-300"><Maximize2 className="w-3.5 h-3.5" /> {bien.surfaceTotale} m²</span>}
                        {bien.typeBien && <span className="flex items-center gap-1 text-gray-300"><Building2 className="w-3.5 h-3.5" /> {bien.typeBien}</span>}
                        {bien.rentabiliteBrute && <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 border border-emerald-500/20">{Number(bien.rentabiliteBrute).toFixed(2)}% brut</span>}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
                        <p className="text-gray-500 text-xs">Invest. total : {bien.investissementTotal ? Number(bien.investissementTotal).toLocaleString('fr-FR') + ' €' : '—'}</p>
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/dashboard/off-market?id=${bien.id}`; }}
                          className="h-7 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                        >
                          Voir la fiche
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {!biensList?.length || !biensList.filter((b: any) => filtreSourceBien === "all" || b.source === filtreSourceBien).length ? (
                filtreSourceBien === "off_market" ? null : (
                <div className="col-span-2 text-center py-12 text-gray-500 bg-[#111] border border-[#222]">
                  <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun bien dans le portefeuille</p>
                  <p className="text-xs mt-1">Les agents actifs peuvent soumettre des biens</p>
                </div>)
              ) : filtreSourceBien === "off_market" ? null : biensList.filter((b: any) => filtreSourceBien === "all" || b.source === filtreSourceBien).map((bien: any) => {
                const isClickable = bien.source === "pap_scrape" && bien.urlSource;
                const handleBienClick = () => {
                  if (isClickable) window.open(bien.urlSource, "_blank");
                };
                const isHighlighted = highlightedBienId === bien.id;
                return (
                <div
                  key={bien.id}
                  ref={isHighlighted ? highlightedBienRef : undefined}
                  className={`bg-[#111] border p-5 space-y-3 hover:border-[#C9A84C]/30 transition-all ${
                    isHighlighted
                      ? "border-[#C9A84C] shadow-lg shadow-[#C9A84C]/20 ring-1 ring-[#C9A84C]/40"
                      : "border-[#222]"
                  } ${isClickable ? "cursor-pointer" : ""}`}
                  onClick={handleBienClick}
                >
                  {bien.source === "pap_scrape" && (
                    <div className="mb-3 h-40 bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/20 rounded flex items-center justify-center">
                      <div className="text-center">
                        <Home className="w-12 h-12 mx-auto text-[#C9A84C]/50 mb-2" />
                        <p className="text-xs text-[#C9A84C]/70">Cliquez pour voir l'annonce PAP</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold">{bien.titre}</p>
                      <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {bien.ville} ({bien.codePostal})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`text-xs border ${STATUT_BIEN_COLORS[bien.statutBien] ?? ""}`}>
                        {STATUT_LABELS[bien.statutBien]}
                      </Badge>
                      <Badge className="text-xs border bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30">
                        {bien.source === "pap_scrape" ? "PAP" : "Ambassadeur"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1 text-[#C9A84C] font-bold">
                      <Euro className="w-3.5 h-3.5" />
                      {bien.prix?.toLocaleString("fr-FR")} € FAI
                    </span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <Maximize2 className="w-3.5 h-3.5" /> {bien.surface} m²
                    </span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <Building2 className="w-3.5 h-3.5" /> {bien.typeBien}
                    </span>
                    {bien.dpeLettre && bien.dpeLettre !== "NC" && (
                      <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 border border-green-500/20">DPE {bien.dpeLettre}</span>
                    )}
                  </div>

                  {/* Décomposition du prix */}
                  {(bien.prixNetVendeur || bien.honorairesAgence) && (
                    <div className="flex items-center gap-3 text-xs bg-[#0d0d0d] border border-[#1e1e1e] px-3 py-2">
                      {bien.prixNetVendeur && (
                        <span className="text-gray-400">
                          Net vendeur : <span className="text-white font-semibold">{Number(bien.prixNetVendeur).toLocaleString("fr-FR")} €</span>
                        </span>
                      )}
                      {bien.prixNetVendeur && bien.honorairesAgence && (
                        <span className="text-gray-600">+</span>
                      )}
                      {bien.honorairesAgence && (
                        <span className="text-gray-400">
                          Honoraires : <span className="text-white font-semibold">{Number(bien.honorairesAgence).toLocaleString("fr-FR")} €</span>
                        </span>
                      )}
                      {bien.honorairesAgence && bien.prix && (
                        <span className="ml-auto text-gray-600">
                          ({Math.round((Number(bien.honorairesAgence) / Number(bien.prix)) * 100)}% honoraires)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
                    <p className="text-gray-500 text-xs">Réf. {bien.reference}</p>
                    <div className="flex gap-2">
                      {bien.statutBien === "en_attente_validation" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatutBien.mutate({ id: bien.id, statut: "publie" })}
                          className="h-7 text-xs bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                        >
                          <CheckCircle className="mr-1 w-3 h-3" /> Valider
                        </Button>
                      )}
                      <Select
                        value={bien.statutBien}
                        onValueChange={v => updateStatutBien.mutate({ id: bien.id, statut: v as any })}
                      >
                        <SelectTrigger className="w-36 h-7 text-xs bg-[#0d0d0d] border-[#333] text-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-[#333]">
                          <SelectItem value="en_attente_validation" className="text-white text-xs">À valider</SelectItem>
                          <SelectItem value="publie" className="text-white text-xs">Publié</SelectItem>
                          <SelectItem value="sous_compromis" className="text-white text-xs">Sous compromis</SelectItem>
                          <SelectItem value="vendu" className="text-white text-xs">Vendu</SelectItem>
                          <SelectItem value="retire" className="text-white text-xs">Retiré</SelectItem>
                        </SelectContent>
                      </Select>
                      {bien.source !== "pap_scrape" && (
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setSelectedBienDetail(bien); }}
                          className="h-7 text-xs bg-[#1a1a1a] text-gray-300 border border-[#333] hover:border-[#C9A84C]/40 hover:text-[#C9A84C]"
                        >
                          📄 Voir la fiche
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleOpenProposer(bien.id)}
                        className="h-7 text-xs bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20"
                      >
                        📧 Proposer à un lead
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        {/* ONGLET COURTIERSS — Liste */}
        <TabsContent value="courtiers" className="mt-4">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchCourtier}
                  onChange={e => setSearchCourtier(e.target.value)}
                  placeholder="Rechercher un courtier..."
                  className="pl-9 bg-[#111] border-[#222] text-white placeholder:text-gray-600"
                />
              </div>
              <Select value={filtreStatutCourtier} onValueChange={setFiltreStatutCourtier}>
                <SelectTrigger className="w-44 bg-[#111] border-[#222] text-white">
                  <Filter className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333]">
                  <SelectItem value="tous" className="text-white">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente" className="text-yellow-400">En attente</SelectItem>
                  <SelectItem value="actif" className="text-green-400">Actif</SelectItem>
                  <SelectItem value="suspendu" className="text-orange-400">Suspendu</SelectItem>
                  <SelectItem value="resilie" className="text-red-400">Résilié</SelectItem>
                </SelectContent>
              </Select>
              <a href="/inscription-courtier" target="_blank">
                <Button className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold text-sm whitespace-nowrap">
                  <Users className="mr-2 w-4 h-4" /> Inscrire un courtier
                </Button>
              </a>
            </div>

            {!courtiersList?.length ? (
              <div className="text-center py-16 text-gray-500 bg-[#111] border border-[#222]">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun courtier trouvé</p>
              </div>
            ) : (
              <div className="bg-[#111] border border-[#222] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#222]">
                      <th className="text-left px-4 py-3 text-gray-400 text-xs uppercase tracking-wider font-medium">Courtier</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-xs uppercase tracking-wider font-medium">Contact</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-xs uppercase tracking-wider font-medium">Code parrain</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-xs uppercase tracking-wider font-medium">Statut</th>
                      <th className="text-right px-4 py-3 text-gray-400 text-xs uppercase tracking-wider font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courtiersList.map((c: any) => (
                      <tr key={c.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#1a1a1a]">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-semibold">{c.prenom} {c.nom}</p>
                            {c.cabinetNom && <p className="text-gray-500 text-xs">{c.cabinetNom}</p>}
                            <p className="text-gray-500 text-xs">{c.ville}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-300 text-xs">{c.email}</p>
                          <p className="text-gray-500 text-xs">{c.telephone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#C9A84C] font-mono text-xs">{c.codeParrain ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={c.statutInterne}
                            onValueChange={v => updateStatutCourtier.mutate({ id: c.id, statutInterne: v as any })}
                          >
                            <SelectTrigger className={`w-36 h-7 text-xs border ${STATUT_COLORS[c.statutInterne] ?? ""} bg-transparent`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-[#333]">
                              <SelectItem value="en_attente" className="text-yellow-400 text-xs">En attente</SelectItem>
                              <SelectItem value="actif" className="text-green-400 text-xs">Actif</SelectItem>
                              <SelectItem value="suspendu" className="text-orange-400 text-xs">Suspendu</SelectItem>
                              <SelectItem value="resilie" className="text-red-400 text-xs">Résilié</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedCourtier(c.id)}
                              className="text-gray-400 hover:text-white h-7 px-2"
                              title="Voir le détail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCourtier(c.id, `${c.prenom} ${c.nom}`)}
                              className="text-gray-400 hover:text-red-400 h-7 px-2"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ONGLET MATCHING */}
        <TabsContent value="matching" className="mt-4">
          {showMatchingPipeline && matchingActiveDossier ? (
            /* ─── VUE PIPELINE DOSSIER ─── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setShowMatchingPipeline(false)} className="text-gray-400 hover:text-white gap-1">
                  <ArrowLeft className="w-4 h-4" /> Retour aux leads
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  if (window.confirm("Supprimer ce dossier de matching ?")) deleteDossier.mutate({ id: matchingActiveDossier.id });
                }} className="text-red-400 hover:text-red-300 gap-1">
                  <Trash2 className="w-4 h-4" /> Supprimer le dossier
                </Button>
              </div>

              {/* Lead info + critères mandat */}
              {(() => {
                const lead = crmLeads?.items?.find((l: any) => l.id === matchingActiveDossier.crmLeadId);
                const mandat = (matchingLeadDetail as any)?.mandat;
                return lead ? (
                  <div className="bg-[#111] border border-[#222] p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-bold text-lg">{lead.prenom} {lead.nom}</p>
                        <p className="text-gray-400 text-sm">{lead.email} · {lead.telephone}</p>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">{matchingActiveDossier.statut?.replace(/_/g, " ")}</Badge>
                    </div>

                    {/* Budget & critères du mandat */}
                    {mandat ? (
                      <div className="border-t border-[#1e1e1e] pt-3 space-y-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Critères de recherche</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          {mandat.budgetMax && (
                            <div className="col-span-2 flex items-center gap-2">
                              <span className="text-gray-400">Budget max :</span>
                              <span className="text-[#C9A84C] font-bold text-base">{Number(mandat.budgetMax).toLocaleString("fr-FR")} €</span>
                              {mandat.apportPersonnel && (
                                <span className="text-gray-500 text-xs">(apport : {Number(mandat.apportPersonnel).toLocaleString("fr-FR")} €)</span>
                              )}
                            </div>
                          )}
                          {mandat.typeBien && (
                            <div className="flex gap-1">
                              <span className="text-gray-500">Type :</span>
                              <span className="text-white capitalize">{mandat.typeBien.replace(/_/g, " ")}</span>
                            </div>
                          )}
                          {mandat.localisation && (
                            <div className="flex gap-1">
                              <span className="text-gray-500">Zone :</span>
                              <span className="text-white">{mandat.localisation}</span>
                            </div>
                          )}
                          {(mandat.surfaceMin || mandat.surfaceMax) && (
                            <div className="flex gap-1">
                              <span className="text-gray-500">Surface :</span>
                              <span className="text-white">
                                {mandat.surfaceMin ? `${mandat.surfaceMin} m²` : ""}
                                {mandat.surfaceMin && mandat.surfaceMax ? " – " : ""}
                                {mandat.surfaceMax ? `${mandat.surfaceMax} m²` : ""}
                              </span>
                            </div>
                          )}
                          {(mandat.nbPiecesMin || mandat.nbPiecesMax) && (
                            <div className="flex gap-1">
                              <span className="text-gray-500">Pièces :</span>
                              <span className="text-white">
                                {mandat.nbPiecesMin ?? ""}{mandat.nbPiecesMin && mandat.nbPiecesMax ? "–" : ""}{mandat.nbPiecesMax ?? ""}
                              </span>
                            </div>
                          )}
                          {mandat.etatBien && (
                            <div className="flex gap-1">
                              <span className="text-gray-500">État :</span>
                              <span className="text-white capitalize">{mandat.etatBien.replace(/_/g, " ")}</span>
                            </div>
                          )}
                          {mandat.modeFinancement && (
                            <div className="flex gap-1">
                              <span className="text-gray-500">Financement :</span>
                              <span className="text-white capitalize">{mandat.modeFinancement}</span>
                            </div>
                          )}
                        </div>
                        {/* Critères booléens */}
                        {["balconTerrasse","parkingGarage","cave","ascenseur","calme","lumineux","procheTransports","procheEcoles"].some(k => (mandat as any)[k]) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[{k:"balconTerrasse",l:"Balcon/Terrasse"},{k:"parkingGarage",l:"Parking"},{k:"cave",l:"Cave"},{k:"ascenseur",l:"Ascenseur"},{k:"calme",l:"Calme"},{k:"lumineux",l:"Lumineux"},{k:"procheTransports",l:"Transports"},{k:"procheEcoles",l:"Écoles"}]
                              .filter(({k}) => (mandat as any)[k])
                              .map(({k,l}) => (
                                <span key={k} className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 px-2 py-0.5">{l}</span>
                              ))}
                          </div>
                        )}
                        {mandat.autresCriteres && (
                          <p className="text-gray-400 text-xs italic">"{mandat.autresCriteres}"</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-xs border-t border-[#1e1e1e] pt-2">Aucun mandat de recherche lié — les critères de matching sont basés sur les données CRM.</p>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Pipeline statuts */}
              <div className="bg-[#111] border border-[#222] p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Pipeline</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: "en_cours", label: "En cours" },
                    { v: "proposition_1", label: "Proposition 1" },
                    { v: "proposition_2", label: "Proposition 2" },
                    { v: "proposition_3", label: "Proposition 3" },
                    { v: "offre", label: "Offre" },
                    { v: "signature_notaire", label: "Signature notaire" },
                    { v: "vendu", label: "Bien vendu" },
                    { v: "abandonne", label: "Abandonné" },
                  ] as const).map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => updateDossier.mutate({ id: matchingActiveDossier.id, statut: v })}
                      className={`px-3 py-1.5 text-xs border transition-colors ${
                        matchingActiveDossier.statut === v
                          ? "bg-[#C9A84C] text-black border-[#C9A84C] font-bold"
                          : "bg-transparent text-gray-400 border-[#333] hover:border-[#C9A84C]/50 hover:text-[#C9A84C]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode élargi + matching biens */}
              <div className="bg-[#111] border border-[#222] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Biens correspondants</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">Mode élargi :</span>
                    {[0, 1, 2].map(m => (
                      <button key={m} onClick={() => { setMatchingModeElargi(m); setSelectedLeadForMatching(matchingActiveDossier.crmLeadId); }}
                        className={`px-2 py-0.5 text-xs border ${ matchingModeElargi === m ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10" : "border-[#333] text-gray-500 hover:border-[#555]" }`}>
                        {m === 0 ? "Strict" : m === 1 ? "Élargi" : "Très élargi"}
                      </button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => setSelectedLeadForMatching(matchingActiveDossier.crmLeadId)} className="text-gray-400 hover:text-white h-6 px-2">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {!selectedLeadForMatching ? (
                  <Button size="sm" onClick={() => setSelectedLeadForMatching(matchingActiveDossier.crmLeadId)} className="bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20 text-xs">
                    <TrendingUp className="mr-1 w-3 h-3" /> Lancer le matching
                  </Button>
                ) : !matchingBiens ? (
                  <p className="text-gray-500 text-sm">Calcul en cours...</p>
                ) : !matchingBiens.biens?.length ? (
                  <p className="text-gray-500 text-sm">Aucun bien correspondant. Essayez le mode Élargi.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {matchingBiens.biens.map((bien: any) => (
                      <div key={bien.id}
                        onClick={() => updateDossier.mutate({ id: matchingActiveDossier.id, bienId: bien.id })}
                        className={`p-3 border cursor-pointer transition-colors ${ matchingActiveDossier.bienId === bien.id ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#222] hover:border-[#333]" }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-semibold text-sm">{bien.titre}</p>
                              <Badge className={`text-xs ${ bien.pourcentage >= 70 ? "bg-green-500/10 text-green-400 border-green-500/30" : bien.pourcentage >= 40 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30" }`}>
                                {bien.pourcentage}%
                              </Badge>
                              <Badge className={STATUT_BIEN_COLORS[bien.statutBien] ?? ""} variant="outline">
                                {STATUT_LABELS[bien.statutBien] ?? bien.statutBien}
                              </Badge>
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">{bien.adresse}, {bien.ville} • {bien.surface}m² • {bien.nbPieces}p • {bien.prix?.toLocaleString("fr-FR")}€</p>
                            {bien.raisons?.length > 0 && <p className="text-green-400 text-xs mt-1">✓ {bien.raisons.join(" • ")}</p>}
                            {bien.blocages?.length > 0 && <p className="text-red-400 text-xs">✗ {bien.blocages.join(" • ")}</p>}
                            {bien.agent && <p className="text-gray-500 text-xs mt-0.5">Agent : {bien.agent.prenom} {bien.agent.nom} • {bien.agent.telephone}</p>}
                          </div>
                          {bien.photoPrincipaleUrl && <img src={bien.photoPrincipaleUrl} className="w-16 h-12 object-cover shrink-0" alt="" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Biens Off Market */}
              <div className="bg-[#111] border border-[#1a1a1a] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider">Biens Off Market</p>
                  <Badge className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30">
                    {matchingBiens?.biensOffMarket?.length ?? 0} résultats
                  </Badge>
                </div>
                {!matchingBiens?.biensOffMarket?.length ? (
                  <p className="text-gray-500 text-sm">Aucun bien Off Market correspondant.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {matchingBiens.biensOffMarket.map((bien: any) => (
                      <div key={bien.id} className="p-3 border border-[#222] hover:border-[#C9A84C]/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-semibold text-sm">{bien.titre}</p>
                              <Badge className={`text-xs ${ bien.pourcentage >= 70 ? "bg-green-500/10 text-green-400 border-green-500/30" : bien.pourcentage >= 40 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30" }`}>
                                {bien.pourcentage}%
                              </Badge>
                              <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Off Market</Badge>
                              {bien.rentabiliteBrute && <Badge className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">{bien.rentabiliteBrute}% brut</Badge>}
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">{bien.region} {bien.departement ? `— ${bien.departement}` : ""} • {bien.surface ? `${bien.surface}m²` : ""} • {bien.prix?.toLocaleString("fr-FR")} €</p>
                            {bien.raisons?.length > 0 && <p className="text-green-400 text-xs mt-1">✓ {bien.raisons.join(" • ")}</p>}
                            {bien.blocages?.length > 0 && <p className="text-red-400 text-xs">✗ {bien.blocages.join(" • ")}</p>}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {bien.imagePrincipale && <img src={bien.imagePrincipale} className="w-16 h-12 object-cover" alt="" />}
                            <button
                              onClick={() => window.open(`/dashboard/off-market?id=${bien.id}`, "_blank")}
                              className="text-xs text-[#C9A84C] hover:underline text-center"
                            >
                              Voir la fiche ↗
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-[#111] border border-[#222] p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Notes internes</p>
                <textarea
                  value={matchingNotesEdit}
                  onChange={e => setMatchingNotesEdit(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#333] text-white text-sm p-2 resize-none focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="Notes sur ce dossier..."
                />
                <Button size="sm" onClick={() => updateDossier.mutate({ id: matchingActiveDossier.id, notes: matchingNotesEdit })} className="mt-2 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20 text-xs">
                  Sauvegarder les notes
                </Button>
              </div>
            </div>
          ) : (
            /* ─── VUE LISTE LEADS ─── */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input value={matchingLeadSearch} onChange={e => setMatchingLeadSearch(e.target.value)} placeholder="Rechercher un lead..." className="pl-9 bg-[#111] border-[#333] text-white h-9" />
                </div>
              </div>

              {/* Dossiers actifs */}
              {(matchingDossiers as any[]).filter((d: any) => d.statut !== "vendu" && d.statut !== "abandonne").length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Dossiers en cours ({(matchingDossiers as any[]).filter((d: any) => d.statut !== "vendu" && d.statut !== "abandonne").length})</p>
                  <div className="bg-[#111] border border-[#222] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-[#222]">
                        <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase">Lead</th>
                        <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase">Statut pipeline</th>
                        <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase">Bien sélectionné</th>
                        <th className="text-right p-3 text-gray-400 font-medium text-xs uppercase">Actions</th>
                      </tr></thead>
                      <tbody>
                        {(matchingDossiers as any[]).filter((d: any) => d.statut !== "vendu" && d.statut !== "abandonne").map((d: any) => (
                          <tr key={d.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                            <td className="p-3">
                              <p className="text-white font-medium">{d.lead?.prenom} {d.lead?.nom}</p>
                              <p className="text-gray-500 text-xs">{d.lead?.email}</p>
                            </td>
                            <td className="p-3">
                              <Badge className={`text-xs ${
                                d.statut === "en_cours" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                d.statut === "offre" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                                d.statut === "signature_notaire" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                                "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30"
                              }`}>
                                {d.statut?.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {d.bien ? (
                                <p className="text-gray-300 text-xs">{d.bien.titre} • {d.bien.prix?.toLocaleString("fr-FR")}€</p>
                              ) : <span className="text-gray-600 text-xs">Aucun bien sélectionné</span>}
                            </td>
                            <td className="p-3 text-right">
                              <Button size="sm" onClick={() => { setMatchingActiveDossier(d); setMatchingNotesEdit(d.notes ?? ""); setShowMatchingPipeline(true); }} className="h-7 text-xs bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20">
                                <Eye className="mr-1 w-3 h-3" /> Ouvrir
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tous les leads CRM */}
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Tous les leads CRM</p>
                <div className="bg-[#111] border border-[#222] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#222]">
                      <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase">Lead</th>
                      <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase">Étape CRM</th>
                      <th className="text-left p-3 text-gray-400 font-medium text-xs uppercase">Dossier matching</th>
                      <th className="text-right p-3 text-gray-400 font-medium text-xs uppercase">Actions</th>
                    </tr></thead>
                    <tbody>
                      {!crmLeads?.items?.length ? (
                        <tr><td colSpan={4} className="text-center py-8 text-gray-500">Aucun lead dans le CRM</td></tr>
                      ) : crmLeads.items
                          .filter((l: any) => !matchingLeadSearch || `${l.prenom} ${l.nom} ${l.email}`.toLowerCase().includes(matchingLeadSearch.toLowerCase()))
                          .map((lead: any) => {
                            const dossierExistant = (matchingDossiers as any[]).find((d: any) => d.crmLeadId === lead.id && d.statut !== "vendu" && d.statut !== "abandonne");
                            return (
                              <tr key={lead.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                                <td className="p-3">
                                  <p className="text-white font-medium">{lead.prenom} {lead.nom}</p>
                                  <p className="text-gray-500 text-xs">{lead.email}</p>
                                </td>
                                <td className="p-3">
                                  <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-xs">
                                    {lead.etape?.replace(/_/g, " ") ?? "—"}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  {dossierExistant ? (
                                    <Badge className="bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30 text-xs">
                                      {dossierExistant.statut?.replace(/_/g, " ")}
                                    </Badge>
                                  ) : <span className="text-gray-600 text-xs">Pas de dossier</span>}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button size="sm" onClick={() => {
                                      if (dossierExistant) { setMatchingActiveDossier(dossierExistant); setMatchingNotesEdit(dossierExistant.notes ?? ""); setShowMatchingPipeline(true); }
                                      else getOrCreateDossier.mutate({ crmLeadId: lead.id });
                                    }} className="h-7 text-xs bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20">
                                      <TrendingUp className="mr-1 w-3 h-3" /> {dossierExistant ? "Ouvrir" : "Créer dossier"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => {
                                      if (window.confirm(`Supprimer le lead ${lead.prenom} ${lead.nom} ?`)) deleteCrmLead.mutate({ id: lead.id });
                                    }} className="h-7 px-2 text-gray-500 hover:text-red-400">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
         </TabsContent>

        {/* ONGLET CARTE DU RÉSEAU */}
        <TabsContent value="carte" className="mt-4">
          <div className="bg-[#111] border border-[#222] p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Carte du réseau Sigma Factory</h3>
              <span className="text-xs text-gray-500">Agents · Courtiers · Biens immobiliers</span>
            </div>
            <CarteReseau isVisible={activeTab === "carte"} />
          </div>
        </TabsContent>
      </Tabs>
      {/* Dialog détail ambassadeur */}
      <Dialog open={!!selectedAmb} onOpenChange={open => !open && setSelectedAmb(null)}>
        <DialogContent className="bg-[#111] border border-[#222] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-black text-lg">
              {ambDetail?.prenom} {ambDetail?.nom}
              <span className="ml-2 text-[#C9A84C] text-sm font-normal">
                Niveau {ambDetail?.niveau} — {ambDetail?.niveau === "1" ? "10%" : "5%"}
              </span>
            </DialogTitle>
          </DialogHeader>
          {ambDetail && (
            <div className="space-y-4 text-sm">
              {/* Stats rapides */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#0d0d0d] p-3 border border-[#222] text-center">
                  <p className="text-[#C9A84C] text-xl font-black">{(ambDetail as any).stats?.totalBiens ?? ambDetail.biens?.length ?? 0}</p>
                  <p className="text-gray-400 text-xs mt-1">Biens soumis</p>
                </div>
                <div className="bg-[#0d0d0d] p-3 border border-[#222] text-center">
                  <p className="text-green-400 text-xl font-black">{(ambDetail as any).stats?.ventesConclues ?? 0}</p>
                  <p className="text-gray-400 text-xs mt-1">Ventes conclues</p>
                </div>
                <div className="bg-[#0d0d0d] p-3 border border-[#222] text-center">
                  <p className="text-blue-400 text-xl font-black">{(ambDetail as any).stats?.totalFilleuls ?? (ambDetail.filleuls?.length ?? 0)}</p>
                  <p className="text-gray-400 text-xs mt-1">Filleuls</p>
                </div>
                <div className="bg-[#0d0d0d] p-3 border border-[#222] text-center">
                  <p className="text-[#C9A84C] text-xl font-black">{((ambDetail as any).stats?.commissionsPayees ?? 0).toLocaleString("fr-FR")}€</p>
                  <p className="text-gray-400 text-xs mt-1">Commissions payées</p>
                </div>
              </div>
              {/* Infos contact + profil */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d0d0d] p-3 border border-[#222]">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Contact</p>
                  <p className="text-white">{ambDetail.email}</p>
                  <p className="text-gray-300">{ambDetail.telephone}</p>
                  <p className="text-gray-300 text-xs mt-1">{ambDetail.adresse}, {ambDetail.codePostal} {ambDetail.ville}</p>
                </div>
                <div className="bg-[#0d0d0d] p-3 border border-[#222]">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Profil</p>
                  <p className="text-white capitalize">{ambDetail.statut?.replace(/_/g, " ")}</p>
                  {ambDetail.siret && <p className="text-gray-300 text-xs">SIRET : {ambDetail.siret}</p>}
                  {(ambDetail as any).codeParrain && <p className="text-[#C9A84C] text-xs mt-1">Code parrain : {(ambDetail as any).codeParrain}</p>}
                  <p className="text-gray-400 text-xs mt-1">Inscrit le {new Date(ambDetail.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              {/* Contrat + Renvoyer bienvenue */}
              <div className="flex gap-2">
                {ambDetail.contratPdfUrl && (
                  <a href={ambDetail.contratPdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" className="w-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20">
                      Télécharger le contrat signé
                    </Button>
                  </a>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                  disabled={renvoyerBienvenueAmb.isPending}
                  onClick={() => renvoyerBienvenueAmb.mutate({ id: ambDetail.id })}
                >
                  {renvoyerBienvenueAmb.isPending ? "Envoi..." : "Renvoyer email bienvenue"}
                </Button>
              </div>
              {/* Filleuls agents */}
              {ambDetail.filleuls?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Filleuls agents ({ambDetail.filleuls.length})</p>
                  <div className="space-y-1">
                    {ambDetail.filleuls.map((f: any) => (
                      <div key={f.id} className="bg-[#0d0d0d] p-2 border border-[#222] flex items-center justify-between">
                        <div>
                          <span className="text-white text-xs">{f.prenom} {f.nom}</span>
                          <span className="text-gray-500 text-xs ml-2">{f.ville}</span>
                        </div>
                        <Badge className={`text-xs border ${STATUT_COLORS[f.statutInterne] ?? ""}`}>{STATUT_LABELS[f.statutInterne]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Filleuls courtiers */}
              {ambDetail.filleulsCourtiers?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Filleuls courtiers ({ambDetail.filleulsCourtiers.length})</p>
                  <div className="space-y-1">
                    {ambDetail.filleulsCourtiers.map((c: any) => (
                      <div key={c.id} className="bg-[#0d0d0d] p-2 border border-[#C9A84C]/20 flex items-center justify-between">
                        <div>
                          <span className="text-white text-xs">{c.prenom} {c.nom}</span>
                          {c.cabinetNom && <span className="text-gray-500 text-xs ml-2">— {c.cabinetNom}</span>}
                        </div>
                        <Badge className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20">Courtier N1</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Biens soumis */}
              {ambDetail.biens?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Biens soumis ({ambDetail.biens.length})</p>
                  <div className="space-y-1">
                    {ambDetail.biens.map((b: any) => (
                      <div key={b.id} className="bg-[#0d0d0d] p-2 border border-[#222] flex items-center justify-between">
                        <div>
                          <span className="text-white text-xs">{b.titre}</span>
                          <span className="text-gray-500 text-xs ml-2">— {b.ville} — {b.prix?.toLocaleString("fr-FR")}€</span>
                        </div>
                        <Badge className={`text-xs border ${STATUT_BIEN_COLORS[b.statutBien] ?? ""}`}>{STATUT_LABELS[b.statutBien]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents bidirectionnels Élodie ↔ Agent */}
              <div className="border-t border-[#222] pt-4">
                <PartnerDocumentsSection
                  partnerType="agent"
                  partnerId={ambDetail.id}
                  partnerNom={`${ambDetail.prenom ?? ""} ${ambDetail.nom}`}
                  partnerEmail={ambDetail.email}
                  viewAs="admin"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog matching biens */}
      <Dialog open={showMatchingDialog} onOpenChange={setShowMatchingDialog}>
        <DialogContent className="bg-[#111] border border-[#222] text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-black">
              Proposer des biens au lead
              <span className="ml-2 text-gray-400 text-sm font-normal">
                {selectedBiensForLead.length}/3 sélectionnés
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!matchingBiens?.biens?.length ? (
              <div className="text-center py-8 text-gray-500">
                <Home className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aucun bien disponible correspondant aux critères</p>
              </div>
            ) : matchingBiens.biens.map((bien: any) => (
              <div
                key={bien.id}
                onClick={() => toggleBienSelection(bien.id)}
                className={`p-4 border cursor-pointer transition-colors ${selectedBiensForLead.includes(bien.id) ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#222] hover:border-[#333]"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{bien.titre}</p>
                      {bien.score > 0 && (
                        <Badge className="bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30 text-xs">
                          Score {bien.score}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{bien.adresse}, {bien.ville}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-[#C9A84C] font-bold">{bien.prix?.toLocaleString("fr-FR")} €</span>
                      <span className="text-gray-300">{bien.surface} m²</span>
                      <span className="text-gray-300">{bien.typeBien}</span>
                      {bien.dpeLettre && bien.dpeLettre !== "NC" && <span className="text-green-400 text-xs">DPE {bien.dpeLettre}</span>}
                    </div>
                  </div>
                  <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 ${selectedBiensForLead.includes(bien.id) ? "border-[#C9A84C] bg-[#C9A84C]" : "border-[#444]"}`}>
                    {selectedBiensForLead.includes(bien.id) && <CheckCircle className="w-3 h-3 text-black" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowMatchingDialog(false)} className="border-[#333] text-gray-400">
              Annuler
            </Button>
            <Button
              disabled={selectedBiensForLead.length === 0 || proposerBiens.isPending}
              onClick={() => proposerBiens.mutate({ crmLeadId: selectedLeadForMatching!, bienIds: selectedBiensForLead })}
              className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
            >
              Proposer {selectedBiensForLead.length} bien{selectedBiensForLead.length > 1 ? "s" : ""} à ce lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modale Proposer ce bien — prévisualisation PDF avant envoi */}
      <Dialog open={showProposerModal} onOpenChange={(o) => { if (!o) setShowProposerModal(false); }}>
        <DialogContent className="bg-[#111] border border-[#222] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-black">
              {proposerStep === "done" ? "✅ Fiche envoyée" : "📧 Proposer ce bien à un lead"}
            </DialogTitle>
          </DialogHeader>

          {proposerStep === "preview" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-12 h-12 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Génération du PDF en cours...</p>
            </div>
          )}

          {proposerStep === "confirm" && proposerPdfUrl && (
            <div className="space-y-4">
              {/* Aperçu PDF */}
              <div className="bg-[#0d0d0d] border border-[#222] p-4 rounded">
                <p className="text-[#C9A84C] text-xs uppercase tracking-widest mb-3">Aperçu du PDF généré</p>
                <a
                  href={proposerPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 px-4 py-2 text-sm hover:bg-[#C9A84C]/20 transition-colors"
                >
                  📄 Ouvrir la fiche PDF (nouvel onglet)
                </a>
                <p className="text-gray-500 text-xs mt-2">Vérifiez le contenu avant d'envoyer au lead.</p>
              </div>

              {/* Sélection du lead */}
              <div>
                <p className="text-gray-300 text-sm mb-2">Lead destinataire</p>
                <Select
                  value={selectedLeadForMatching ? String(selectedLeadForMatching) : ""}
                  onValueChange={(v) => setSelectedLeadForMatching(Number(v))}
                >
                  <SelectTrigger className="bg-[#0d0d0d] border-[#333] text-white">
                    <SelectValue placeholder="Sélectionner un lead..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#333]">
                    {crmLeads?.items?.map((lead: any) => {
                      const count = getFichesCount(lead.id);
                      return (
                        <SelectItem key={lead.id} value={String(lead.id)} className="text-white">
                          {lead.prenom} {lead.nom} — {lead.email}
                          {count > 0 && (
                            <span className="ml-2 text-xs text-amber-400 font-semibold">
                              ({count} fiche{count > 1 ? "s" : ""} envoyée{count > 1 ? "s" : ""})
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Alerte doublon */}
                {doublonCheck?.alreadySent && (
                  <div className="mt-2 bg-orange-500/10 border border-orange-500/30 rounded px-3 py-2 flex items-start gap-2">
                    <span className="text-orange-400 text-sm">⚠️</span>
                    <div>
                      <p className="text-orange-400 text-xs font-semibold">Ce bien a déjà été proposé à ce lead</p>
                      {doublonCheck.sentAt && (
                        <p className="text-orange-300/70 text-xs">
                          Envoyé le {new Date(doublonCheck.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      )}
                      <p className="text-orange-300/60 text-xs mt-0.5">Vous pouvez quand même renvoyer si nécessaire.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message personnalisé */}
              <div>
                <p className="text-gray-300 text-sm mb-2">Message personnalisé <span className="text-gray-600">(optionnel)</span></p>
                <Textarea
                  value={proposerMessage}
                  onChange={(e) => setProposerMessage(e.target.value)}
                  placeholder="Suite à notre échange, voici un bien qui correspond à vos critères..."
                  className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowProposerModal(false)} className="border-[#333] text-gray-400">
                  Annuler
                </Button>
                <Button
                  disabled={!selectedLeadForMatching || proposerBienAuLead.isPending}
                  onClick={() => proposerBienAuLead.mutate({
                    bienId: proposerBienId!,
                    crmLeadId: selectedLeadForMatching!,
                    pdfUrl: proposerPdfUrl!,
                    messagePersonnalise: proposerMessage || undefined,
                  })}
                  className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
                >
                  {proposerBienAuLead.isPending ? "Envoi..." : "✉️ Envoyer la fiche au lead"}
                </Button>
              </div>
            </div>
          )}

          {proposerStep === "done" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-white font-semibold">Fiche bien envoyée avec succès !</p>
              <p className="text-gray-400 text-sm">Le lead a reçu la fiche PDF par email.</p>
              <Button onClick={() => setShowProposerModal(false)} className="bg-[#C9A84C] text-black font-bold">
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── PANNEAU LATÉRAL DE DÉTAIL D'UN BIEN AMBASSADEUR ─── */}
      {selectedBienDetail && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/60" onClick={() => setSelectedBienDetail(null)} />
          {/* Panneau */}
          <div className="w-full max-w-xl bg-[#0d0d0d] border-l border-[#222] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] sticky top-0 bg-[#0d0d0d] z-10">
              <div>
                <h2 className="text-white font-bold text-lg">{selectedBienDetail.titre}</h2>
                <p className="text-gray-400 text-sm">{selectedBienDetail.ville} ({selectedBienDetail.codePostal}) — Réf. {selectedBienDetail.reference}</p>
              </div>
              <button onClick={() => setSelectedBienDetail(null)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* Photos */}
              {bienDetailMedias && (bienDetailMedias.photos.length > 0 || bienDetailMedias.photoPrincipaleUrl) && (
                <div>
                  <h3 className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider mb-3">Photos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {bienDetailMedias.photoPrincipaleUrl && (
                      <img src={bienDetailMedias.photoPrincipaleUrl} alt="Photo principale" className="w-full h-36 object-cover border border-[#222]" />
                    )}
                    {bienDetailMedias.photos.slice(0, 5).map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full h-36 object-cover border border-[#222]" />
                    ))}
                  </div>
                </div>
              )}

              {/* Infos financières */}
              <div>
                <h3 className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider mb-3">Informations</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Prix FAI", value: selectedBienDetail.prix ? `${Number(selectedBienDetail.prix).toLocaleString("fr-FR")} €` : "—" },
                    { label: "Net vendeur", value: selectedBienDetail.prixNetVendeur ? `${Number(selectedBienDetail.prixNetVendeur).toLocaleString("fr-FR")} €` : "—" },
                    { label: "Honoraires", value: selectedBienDetail.honorairesAgence ? `${Number(selectedBienDetail.honorairesAgence).toLocaleString("fr-FR")} €` : "—" },
                    { label: "Surface", value: selectedBienDetail.surface ? `${selectedBienDetail.surface} m²` : "—" },
                    { label: "Pièces", value: selectedBienDetail.nbPieces ?? "—" },
                    { label: "Type", value: selectedBienDetail.typeBien ?? "—" },
                    { label: "DPE", value: selectedBienDetail.dpeLettre && selectedBienDetail.dpeLettre !== "NC" ? selectedBienDetail.dpeLettre : "—" },
                    { label: "Statut", value: selectedBienDetail.statutBien ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#111] border border-[#1e1e1e] px-3 py-2">
                      <p className="text-gray-500 text-xs">{label}</p>
                      <p className="text-white font-semibold text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selectedBienDetail.description && (
                <div>
                  <h3 className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedBienDetail.description}</p>
                </div>
              )}

              {/* Historique des propositions */}
              <div>
                <h3 className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider mb-3">
                  Historique des propositions ({bienDetailPropositions.length})
                </h3>
                {bienDetailPropositions.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune proposition envoyée pour ce bien.</p>
                ) : (
                  <div className="space-y-2">
                    {bienDetailPropositions.map((prop: any) => (
                      <div key={prop.id} className="bg-[#111] border border-[#1e1e1e] px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">
                            {prop.leadPrenom} {prop.leadNom}
                          </p>
                          <p className="text-gray-500 text-xs">{prop.emailDestinataire}</p>
                          <p className="text-gray-600 text-xs">{new Date(prop.createdAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                        {prop.pdfUrl && (
                          <a href={prop.pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#C9A84C] hover:underline">
                            PDF ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer — bouton Proposer */}
            <div className="px-6 py-4 border-t border-[#1a1a1a] sticky bottom-0 bg-[#0d0d0d]">
              <Button
                onClick={() => { setSelectedBienDetail(null); handleOpenProposer(selectedBienDetail.id); }}
                className="w-full bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
              >
                📧 Proposer à un lead
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

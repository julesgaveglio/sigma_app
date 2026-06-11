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

/* ── Design tokens ─────────────────────────────────────────── */
const T = {
  bg: "var(--background)",
  surface: "var(--surface)",
  raised: "var(--surface-raised)",
  border: "var(--border)",
  borderSubtle: "var(--border-subtle)",
  fg: "var(--foreground)",
  muted: "var(--foreground-muted)",
  faint: "var(--foreground-faint)",
  gold: "var(--gold)",
  goldMuted: "var(--gold-muted)",
  destructive: "var(--destructive)",
  success: "var(--success)",
  headerBg: "var(--surface-header)",
} as const;

const font = {
  display: "'Cormorant Garamond', serif",
  body: "'Hanken Grotesk', sans-serif",
} as const;

/* ── Statut styling (design-system badges) ─────────────────── */
const STATUT_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  en_attente: { label: "En attente", color: T.gold, bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  actif: { label: "Actif", color: T.success, bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  suspendu: { label: "Suspendu", color: T.muted, bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  resilie: { label: "Resilie", color: T.destructive, bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
};

const STATUT_BIEN_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  en_attente_validation: { label: "A valider", color: T.gold, bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  publie: { label: "Publie", color: T.success, bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  sous_compromis: { label: "Sous compromis", color: T.muted, bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  vendu: { label: "Vendu", color: T.fg, bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  retire: { label: "Retire", color: T.faint, bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" },
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente", actif: "Actif", suspendu: "Suspendu", resilie: "Résilié",
  en_attente_validation: "À valider", publie: "Publié", sous_compromis: "Sous compromis",
  vendu: "Vendu", retire: "Retiré",
};

/* ── Shared inline style helpers ───────────────────────────── */
const labelStyle: React.CSSProperties = {
  fontFamily: font.body,
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.muted,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: font.body,
  fontSize: "13px",
  fontWeight: 400,
  color: T.fg,
};

const bodyMutedStyle: React.CSSProperties = {
  ...bodyStyle,
  color: T.faint,
  fontSize: "12px",
};

const cardStyle: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: "2px",
};

const raisedStyle: React.CSSProperties = {
  background: T.raised,
  border: `1px solid ${T.border}`,
  borderRadius: "2px",
};

const inputStyle: React.CSSProperties = {
  background: T.raised,
  border: `1px solid ${T.border}`,
  borderRadius: "2px",
  padding: "10px 14px",
  fontSize: "13px",
  fontFamily: font.body,
  color: T.fg,
  outline: "none",
};

function StatutBadgeInline({ statut, map }: { statut: string; map?: Record<string, { label: string; color: string; bg: string; border: string }> }) {
  const styles = map ?? STATUT_STYLES;
  const s = styles[statut] ?? { label: statut, color: T.faint, bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: font.body,
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
    }}>
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

/* ── Backward-compat: keep STATUT_COLORS for Select triggers ─ */
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
    <div className="min-h-screen" style={{ background: T.bg }}>
      <AdminNav />
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }} className="space-y-10">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="flex items-center justify-center transition-colors duration-300"
            style={{ width: "32px", height: "32px", borderRadius: "2px", background: T.surface, border: `1px solid ${T.border}`, color: T.faint }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.fg; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.faint; }}
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </a>
          <div>
            <h1 style={{
              fontFamily: font.display,
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.fg,
            }}>
              Reseau Agents
            </h1>
            <p style={{ fontFamily: font.body, fontSize: "13px", color: T.muted, marginTop: "4px" }}>
              Gestion du reseau d'affiliation Sigma Factory
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/ambassadeur/bien">
            <button
              className="flex items-center gap-2 transition-colors duration-300"
              style={{
                padding: "10px 20px",
                borderRadius: "2px",
                border: `1px solid ${T.border}`,
                background: "transparent",
                color: T.fg,
                fontFamily: font.body,
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = T.muted)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
            >
              <Building2 className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              Deposer un bien
            </button>
          </a>
          <a href="/ambassadeur" target="_blank">
            <button style={{
              padding: "10px 20px",
              borderRadius: "2px",
              background: T.gold,
              color: T.bg,
              fontFamily: font.body,
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
            }} className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              Page de recrutement
            </button>
          </a>
        </div>
      </div>

      {/* ── Panneau alertes inactivite agents ── */}
      {agentsInactifs.length > 0 && (
        <div style={{ border: `1px solid ${T.destructive}40`, background: `${T.destructive}08`, borderRadius: "2px", padding: "20px" }} className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: T.destructive, strokeWidth: 1.5 }} />
            <span style={{ fontFamily: font.body, fontSize: "12px", fontWeight: 500, color: T.destructive }}>
              {agentsInactifs.length} agent(s) inactif(s) — aucun bien pose depuis plus de 30 jours
            </span>
          </div>
          <div className="space-y-2">
            {agentsInactifs.map((a: any) => (
              <div key={a.agentId} className="flex items-center justify-between" style={{ background: `${T.destructive}0A`, border: `1px solid ${T.destructive}20`, borderRadius: "2px", padding: "12px 16px" }}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: T.destructive, strokeWidth: 1.5 }} />
                  <div>
                    <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{a.agentNom}</p>
                    <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>
                      {a.nbBiensTotaux === 0 ? "Aucun bien pose" : `Dernier bien : ${a.dernierBienDate ? new Date(a.dernierBienDate).toLocaleDateString("fr-FR") : "—"}`}
                      {" · "}{a.joursInactivite}j d'inactivite · {a.agentEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.statutInterne !== "suspendu" && (
                    <button
                      onClick={() => declencherTriggerAgent.mutate({ agentId: a.agentId })}
                      disabled={declencherTriggerAgent.isPending}
                      className="flex items-center gap-1.5 transition-colors duration-300"
                      style={{ padding: "6px 12px", borderRadius: "2px", background: T.destructive, color: T.fg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
                    >
                      <AlertTriangle className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                      Suspendre + Notifier
                    </button>
                  )}
                  {a.statutInterne === "suspendu" && (
                    <button
                      onClick={() => reactiverAgent.mutate({ agentId: a.agentId })}
                      disabled={reactiverAgent.isPending}
                      className="flex items-center gap-1.5 transition-colors duration-300"
                      style={{ padding: "6px 12px", borderRadius: "2px", background: "transparent", color: T.success, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", border: `1px solid ${T.success}40`, cursor: "pointer" }}
                    >
                      <RefreshCw className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                      Reactiver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats globales reseau (KPI cards) ── */}
      <div className="grid grid-cols-4 gap-px" style={{ background: T.border, border: `1px solid ${T.border}`, borderRadius: "2px" }}>
        {[
          { label: "Agents actifs", value: stats?.actifs ?? 0, sub: `${stats?.total ?? 0} au total` },
          { label: "Courtiers actifs", value: statsCourtiers?.courtiersActifs ?? 0, sub: `${statsCourtiers?.totalCourtiers ?? 0} au total` },
          { label: "Biens disponibles", value: stats?.biensDispos ?? 0, sub: "dans le portefeuille" },
          { label: "Dossiers valides", value: statsCourtiers?.dossiersValides ?? 0, sub: `${statsCourtiers?.dossiersEnCours ?? 0} en cours` },
        ].map((s, i) => (
          <div key={i} style={{ background: T.bg, padding: "24px" }}>
            <p className="tabular-nums" style={{
              fontFamily: font.display,
              fontSize: "32px",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: i === 0 ? T.gold : T.fg,
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}>
              {s.value}
            </p>
            <p style={{ ...labelStyle, marginTop: "8px" }}>{s.label}</p>
            <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "2px" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-0" style={{ marginBottom: "-1px" }}>
            {[
              { value: "reseau", label: "Reseau", icon: Users },
              { value: "ambassadeurs", label: "Liste Agents", icon: UserCheck },
              { value: "biens", label: "Portefeuille de biens", icon: Home },
              { value: "courtiers", label: "Liste Courtiers", icon: Building2 },
              { value: "matching", label: "Matching leads", icon: TrendingUp },
              { value: "carte", label: "Carte du reseau", icon: Map },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="flex items-center gap-2 transition-colors duration-300"
                style={{
                  padding: "12px 20px",
                  fontFamily: font.body,
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: activeTab === tab.value ? T.gold : T.faint,
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab.value ? `2px solid ${T.gold}` : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                <tab.icon className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ONGLET RESEAU — Arborescence
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="reseau" className="mt-8">
          <div style={cardStyle} className="p-8">
            {/* Selecteur type reseau */}
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg, letterSpacing: "0.04em" }}>
                Arborescence du reseau
              </h3>
              <Select value={typeReseau} onValueChange={(v) => setTypeReseau(v as "agents" | "courtiers")}>
                <SelectTrigger className="w-44" style={{ ...inputStyle, padding: "8px 12px", fontSize: "12px" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: T.raised, border: `1px solid ${T.border}` }}>
                  <SelectItem value="agents" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Agents immo</SelectItem>
                  <SelectItem value="courtiers" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Courtiers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Arborescence Agents */}
            {typeReseau === "agents" && (!arborescence?.length ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: T.border, strokeWidth: 1.5 }} />
                <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun agent pour l'instant</p>
                <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "4px" }}>Partagez la page de recrutement pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {arborescence.map((parent: any) => (
                  <div key={parent.id} style={{ border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                    {/* Ambassadeur N1 */}
                    <div
                      className="flex items-center justify-between cursor-pointer transition-colors duration-300"
                      style={{ padding: "16px 20px" }}
                      onClick={() => toggleNode(parent.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: "28px", height: "28px",
                          background: `${T.gold}10`, border: `1px solid ${T.gold}30`,
                          borderRadius: "2px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: T.gold, fontSize: "10px", fontFamily: font.body, fontWeight: 600, letterSpacing: "0.04em" }}>N1</span>
                        </div>
                        <div>
                          <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{parent.prenom} {parent.nom}</p>
                          <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{parent.email} — {parent.ville}</p>
                        </div>
                        <StatutBadgeInline statut={parent.statutInterne} />
                        {parent.filleuls?.length > 0 && (
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "2px 8px", borderRadius: "2px",
                            fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            color: T.muted, background: "rgba(107,101,96,0.08)", border: "1px solid rgba(107,101,96,0.15)",
                          }}>
                            {parent.filleuls.length} filleul{parent.filleuls.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedAmb(parent.id); }}
                          className="transition-opacity duration-300 hover:opacity-70"
                          style={{ padding: "4px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                        </button>
                        {expandedNodes.has(parent.id) ? <ChevronUp className="w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} />}
                      </div>
                    </div>

                    {/* Filleuls N2 */}
                    {expandedNodes.has(parent.id) && parent.filleuls?.length > 0 && (
                      <div style={{ borderTop: `1px solid ${T.border}`, background: T.headerBg }}>
                        {parent.filleuls.map((filleul: any) => (
                          <div key={filleul.id} className="flex items-center justify-between" style={{ padding: "12px 20px", borderBottom: `1px solid ${T.borderSubtle}` }}>
                            <div className="flex items-center gap-3" style={{ marginLeft: "32px" }}>
                              <div style={{
                                width: "24px", height: "24px",
                                background: "rgba(107,101,96,0.08)", border: "1px solid rgba(107,101,96,0.15)",
                                borderRadius: "2px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <span style={{ color: T.muted, fontSize: "9px", fontFamily: font.body, fontWeight: 600 }}>N2</span>
                              </div>
                              <div>
                                <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{filleul.prenom} {filleul.nom}</p>
                                <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{filleul.email} — {filleul.ville}</p>
                              </div>
                              <StatutBadgeInline statut={filleul.statutInterne} />
                            </div>
                            <button
                              onClick={() => setSelectedAmb(filleul.id)}
                              className="transition-opacity duration-300 hover:opacity-70"
                              style={{ padding: "4px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                            >
                              <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                            </button>
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
              <div className="text-center py-16">
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: T.border, strokeWidth: 1.5 }} />
                <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun courtier pour l'instant</p>
                <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "4px" }}>Partagez la page d'inscription courtier pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {arborescenceCourtiers.map((parent: any) => (
                  <div key={parent.id} style={{ border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                    <div
                      className="flex items-center justify-between cursor-pointer transition-colors duration-300"
                      style={{ padding: "16px 20px" }}
                      onClick={() => toggleCourtierNode(parent.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: "28px", height: "28px",
                          background: "rgba(107,101,96,0.08)", border: "1px solid rgba(107,101,96,0.15)",
                          borderRadius: "2px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: T.muted, fontSize: "10px", fontFamily: font.body, fontWeight: 600 }}>N1</span>
                        </div>
                        <div>
                          <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{parent.prenom} {parent.nom}</p>
                          <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{parent.email} — {parent.ville}</p>
                          {parent.codeParrain && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.gold, marginTop: "2px" }}>{parent.codeParrain}</p>}
                        </div>
                        <StatutBadgeInline statut={parent.statutInterne} />
                        {parent.filleuls?.length > 0 && (
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "2px 8px", borderRadius: "2px",
                            fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            color: T.muted, background: "rgba(107,101,96,0.08)", border: "1px solid rgba(107,101,96,0.15)",
                          }}>
                            {parent.filleuls.length} filleul{parent.filleuls.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedCourtier(parent.id); }}
                          className="transition-opacity duration-300 hover:opacity-70"
                          style={{ padding: "4px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                        </button>
                        {expandedCourtierNodes.has(parent.id) ? <ChevronUp className="w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} />}
                      </div>
                    </div>
                    {expandedCourtierNodes.has(parent.id) && parent.filleuls?.length > 0 && (
                      <div style={{ borderTop: `1px solid ${T.border}`, background: T.headerBg }}>
                        {parent.filleuls.map((filleul: any) => (
                          <div key={filleul.id} className="flex items-center justify-between" style={{ padding: "12px 20px", borderBottom: `1px solid ${T.borderSubtle}` }}>
                            <div className="flex items-center gap-3" style={{ marginLeft: "32px" }}>
                              <div style={{
                                width: "24px", height: "24px",
                                background: `${T.gold}10`, border: `1px solid ${T.gold}20`,
                                borderRadius: "2px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <span style={{ color: T.gold, fontSize: "9px", fontFamily: font.body, fontWeight: 600 }}>N2</span>
                              </div>
                              <div>
                                <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{filleul.prenom} {filleul.nom}</p>
                                <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{filleul.email} — {filleul.ville}</p>
                                {filleul.codeParrain && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.gold }}>{filleul.codeParrain}</p>}
                              </div>
                              <StatutBadgeInline statut={filleul.statutInterne} />
                            </div>
                            <button
                              onClick={() => setSelectedCourtier(filleul.id)}
                              className="transition-opacity duration-300 hover:opacity-70"
                              style={{ padding: "4px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                            >
                              <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                            </button>
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

        {/* ── DIALOG DETAIL COURTIER ── */}
        <Dialog open={!!selectedCourtier} onOpenChange={open => { if (!open) { setSelectedCourtier(null); setShowAssignerDossier(false); setSelectedDossierToAssign(null); setNoteAssignation(""); } }}>
          <DialogContent style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", color: T.fg, maxWidth: "640px", maxHeight: "90vh", overflowY: "auto" }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg, letterSpacing: "0.02em" }}>Fiche courtier</DialogTitle>
            </DialogHeader>
            {courtierDetail && (
              <div className="space-y-6">
                {/* En-tete identite */}
                <div className="flex items-start justify-between">
                  <div>
                    <p style={{ fontFamily: font.display, fontSize: "22px", fontWeight: 600, color: T.fg, letterSpacing: "0.02em" }}>{courtierDetail.courtier.prenom} {courtierDetail.courtier.nom}</p>
                    {courtierDetail.courtier.cabinetNom && <p style={{ fontFamily: font.body, fontSize: "13px", color: T.gold, marginTop: "2px" }}>{courtierDetail.courtier.cabinetNom}</p>}
                    <div className="flex flex-wrap gap-4 mt-3">
                      <span className="flex items-center gap-1.5" style={{ fontFamily: font.body, fontSize: "12px", color: T.muted }}><Mail className="w-3 h-3" style={{ strokeWidth: 1.5 }} />{courtierDetail.courtier.email}</span>
                      <span className="flex items-center gap-1.5" style={{ fontFamily: font.body, fontSize: "12px", color: T.muted }}><Phone className="w-3 h-3" style={{ strokeWidth: 1.5 }} />{courtierDetail.courtier.telephone}</span>
                      {courtierDetail.courtier.ville && <span className="flex items-center gap-1.5" style={{ fontFamily: font.body, fontSize: "12px", color: T.muted }}><MapPinIcon className="w-3 h-3" style={{ strokeWidth: 1.5 }} />{courtierDetail.courtier.ville}</span>}
                    </div>
                    <p style={{ fontFamily: font.body, fontSize: "11px", color: T.gold, marginTop: "4px" }}>Code parrain : {courtierDetail.courtier.codeParrain}</p>
                  </div>
                  <StatutBadgeInline statut={courtierDetail.courtier.statutInterne} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-px" style={{ background: T.border, borderRadius: "2px" }}>
                  {[
                    { label: "Dossiers", value: courtierDetail.stats.totalDossiers },
                    { label: "Filleuls", value: courtierDetail.stats.totalFilleuls },
                    { label: "Commissions", value: (courtierDetail.stats.totalCommissions / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) },
                    { label: "Payees", value: (courtierDetail.stats.commissionsPayees / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) },
                  ].map(s => (
                    <div key={s.label} style={{ background: T.bg, padding: "16px", textAlign: "center" }}>
                      <p style={labelStyle}>{s.label}</p>
                      <p className="tabular-nums" style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg, marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* ─── SECTION ASSIGNER UN DOSSIER ─── */}
                <div style={{ border: `1px solid ${T.gold}30`, background: `${T.gold}05`, borderRadius: "2px", padding: "20px" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="flex items-center gap-2" style={{ ...labelStyle, color: T.gold }}>
                      <FileText className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> Assigner un dossier de financement
                    </p>
                    <button
                      onClick={() => setShowAssignerDossier(v => !v)}
                      style={{ fontFamily: font.body, fontSize: "11px", fontWeight: 500, color: T.gold, background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.04em" }}
                    >
                      {showAssignerDossier ? "Masquer" : "+ Choisir un dossier"}
                    </button>
                  </div>
                  {showAssignerDossier && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.faint, strokeWidth: 1.5 }} />
                        <input
                          value={searchDossierAssign}
                          onChange={e => setSearchDossierAssign(e.target.value)}
                          placeholder="Rechercher un lead (nom)..."
                          style={{ ...inputStyle, width: "100%", paddingLeft: "32px", fontSize: "12px" }}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {dossiersFiltered.length === 0 ? (
                          <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, textAlign: "center", padding: "12px" }}>Aucun dossier disponible</p>
                        ) : dossiersFiltered.map((d: any) => (
                          <div
                            key={d.id}
                            onClick={() => setSelectedDossierToAssign(d.id === selectedDossierToAssign ? null : d.id)}
                            className="flex items-center justify-between cursor-pointer transition-colors duration-300"
                            style={{
                              padding: "8px 12px",
                              border: `1px solid ${selectedDossierToAssign === d.id ? T.gold : T.border}`,
                              background: selectedDossierToAssign === d.id ? `${T.gold}0A` : T.surface,
                              borderRadius: "2px",
                            }}
                          >
                            <div>
                              <p style={{ fontFamily: font.body, fontSize: "12px", fontWeight: 500, color: T.fg }}>{d.emprunteur1Prenom} {d.emprunteur1Nom}</p>
                              <p className="tabular-nums" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, fontVariantNumeric: "tabular-nums" }}>{d.montantProjet?.toLocaleString("fr-FR")} EUR · {d.duree} mois</p>
                            </div>
                            <StatutBadgeInline statut={d.statut} />
                          </div>
                        ))}
                      </div>
                      {selectedDossierToAssign && (
                        <>
                          <textarea
                            value={noteAssignation}
                            onChange={e => setNoteAssignation(e.target.value)}
                            placeholder="Note pour le courtier (optionnel)..."
                            rows={2}
                            style={{ ...inputStyle, width: "100%", resize: "none", fontSize: "12px" }}
                            onFocus={e => (e.target.style.borderColor = T.gold)}
                            onBlur={e => (e.target.style.borderColor = T.border)}
                          />
                          <button
                            disabled={assignerDossier.isPending}
                            onClick={() => assignerDossier.mutate({
                              dossierFinancementId: selectedDossierToAssign,
                              courtierIds: [courtierDetail.courtier.id],
                              noteManon: noteAssignation || undefined,
                            })}
                            className="flex items-center justify-center gap-2 w-full transition-colors duration-300"
                            style={{ padding: "10px", borderRadius: "2px", background: T.gold, color: T.bg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
                          >
                            <Send className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                            {assignerDossier.isPending ? "Envoi..." : "Assigner ce dossier"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "20px" }} className="grid grid-cols-2 gap-3">
                  <div>
                    <p style={{ ...labelStyle, marginBottom: "8px" }}>Statut</p>
                    <Select
                      value={courtierDetail.courtier.statutInterne}
                      onValueChange={v => updateStatutCourtier.mutate({ id: courtierDetail.courtier.id, statutInterne: v as any })}
                    >
                      <SelectTrigger className={`w-full h-9 text-sm border ${STATUT_COLORS[courtierDetail.courtier.statutInterne] ?? ""} bg-transparent`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: T.raised, border: `1px solid ${T.border}` }}>
                        <SelectItem value="en_attente" style={{ color: T.gold, fontFamily: font.body, fontSize: "12px" }}>En attente</SelectItem>
                        <SelectItem value="actif" style={{ color: T.success, fontFamily: font.body, fontSize: "12px" }}>Actif</SelectItem>
                        <SelectItem value="suspendu" style={{ color: T.muted, fontFamily: font.body, fontSize: "12px" }}>Suspendu</SelectItem>
                        <SelectItem value="resilie" style={{ color: T.destructive, fontFamily: font.body, fontSize: "12px" }}>Resilie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 justify-end">
                    {courtierDetail.courtier.contratSigneUrl && (
                      <button
                        onClick={() => window.open(courtierDetail.courtier.contratSigneUrl ?? undefined, '_blank')}
                        className="flex items-center justify-center gap-1.5 transition-colors duration-300"
                        style={{ padding: "8px 12px", borderRadius: "2px", border: `1px solid ${T.gold}40`, background: "transparent", color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                      >
                        <Download className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                        Telecharger contrat
                      </button>
                    )}
                    <button
                      onClick={() => renvoyerBienvenue.mutate({ id: courtierDetail.courtier.id })}
                      disabled={renvoyerBienvenue.isPending}
                      className="flex items-center justify-center gap-1.5 transition-colors duration-300"
                      style={{ padding: "8px 12px", borderRadius: "2px", border: `1px solid ${T.border}`, background: "transparent", color: T.fg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      <Mail className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                      Renvoyer email bienvenue
                    </button>
                    <button
                      onClick={() => handleDeleteCourtier(courtierDetail.courtier.id, `${courtierDetail.courtier.prenom} ${courtierDetail.courtier.nom}`)}
                      disabled={deleteCourtier.isPending}
                      className="flex items-center justify-center gap-1.5 transition-colors duration-300"
                      style={{ padding: "8px 12px", borderRadius: "2px", border: `1px solid ${T.destructive}40`, background: "transparent", color: T.destructive, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                      Supprimer
                    </button>
                  </div>
                </div>

                {courtierDetail.filleulsCourtiers.length > 0 && (
                  <div>
                    <p style={{ ...labelStyle, marginBottom: "8px" }}>Filleuls courtiers ({courtierDetail.filleulsCourtiers.length})</p>
                    <div className="space-y-1">
                      {courtierDetail.filleulsCourtiers.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between" style={{ background: T.raised, padding: "8px 12px", borderRadius: "2px" }}>
                          <span style={{ fontFamily: font.body, fontSize: "13px", color: T.fg }}>{f.prenom} {f.nom}</span>
                          <StatutBadgeInline statut={f.statutInterne} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════
            ONGLET LISTE AGENTS — Tableau filtrable
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="ambassadeurs" className="mt-8">
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} />
                <input
                  value={searchAmb}
                  onChange={e => setSearchAmb(e.target.value)}
                  placeholder="Rechercher un ambassadeur..."
                  className="w-full focus:outline-none"
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                  onFocus={e => (e.target.style.borderColor = T.gold)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>
              <Select value={filtreStatutAmb} onValueChange={setFiltreStatutAmb}>
                <SelectTrigger className="w-44" style={{ ...inputStyle }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <SelectItem value="all" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Tous les statuts</SelectItem>
                  <SelectItem value="en_attente" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>En attente</SelectItem>
                  <SelectItem value="actif" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Actif</SelectItem>
                  <SelectItem value="suspendu" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Suspendu</SelectItem>
                  <SelectItem value="resilie" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Resilie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Ambassadeur", "Niveau", "Statut", "Ville", "Inscription", "Derniere connexion", ""].map(h => (
                      <th key={h} className={`text-left px-5 py-3 ${h === "" ? "text-right" : ""}`} style={{ ...labelStyle, background: T.headerBg }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!ambassadeursList?.length ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12" style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun agent</td>
                    </tr>
                  ) : ambassadeursList.map((amb: any) => (
                    <tr
                      key={amb.id}
                      className="transition-colors duration-300"
                      style={{ borderBottom: `1px solid ${T.borderSubtle}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3">
                        <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{amb.prenom} {amb.nom}</p>
                        <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{amb.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "2px 8px", borderRadius: "2px",
                          fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          color: amb.niveau === "1" ? T.gold : T.muted,
                          background: amb.niveau === "1" ? `${T.gold}10` : "rgba(107,101,96,0.08)",
                          border: `1px solid ${amb.niveau === "1" ? `${T.gold}30` : "rgba(107,101,96,0.15)"}`,
                        }}>
                          Niveau {amb.niveau} — {amb.niveau === "1" ? "10%" : "5%"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Select
                          value={amb.statutInterne}
                          onValueChange={v => updateStatutAmb.mutate({ id: amb.id, statut: v as any })}
                        >
                          <SelectTrigger className={`w-36 h-7 text-xs border ${STATUT_COLORS[amb.statutInterne]} bg-transparent`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <SelectItem value="en_attente" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>En attente</SelectItem>
                            <SelectItem value="actif" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>Actif</SelectItem>
                            <SelectItem value="suspendu" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>Suspendu</SelectItem>
                            <SelectItem value="resilie" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>Resilie</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3" style={{ fontFamily: font.body, fontSize: "12px", color: T.muted }}>{amb.ville}</td>
                      <td className="px-5 py-3 tabular-nums" style={{ fontFamily: font.body, fontSize: "12px", color: T.faint, fontVariantNumeric: "tabular-nums" }}>
                        {new Date(amb.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-5 py-3">
                        {(amb as any).lastSignedIn ? (
                          <div>
                            <div className="tabular-nums" style={{ fontFamily: font.body, fontSize: "12px", color: T.fg, fontVariantNumeric: "tabular-nums" }}>{new Date((amb as any).lastSignedIn).toLocaleDateString("fr-FR")}</div>
                            <div className="tabular-nums" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, fontVariantNumeric: "tabular-nums" }}>{new Date((amb as any).lastSignedIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        ) : (
                          <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, fontStyle: "italic" }}>Jamais connecte</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedAmb(amb.id)}
                            className="transition-opacity duration-300 hover:opacity-70"
                            style={{ padding: "6px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                            title="Voir le detail"
                          >
                            <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                          </button>
                          <button
                            onClick={() => handleDeleteAmb(amb.id, `${amb.prenom} ${amb.nom}`)}
                            className="transition-colors duration-300"
                            style={{ padding: "6px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                            title="Supprimer"
                            onMouseEnter={e => (e.currentTarget.style.color = T.destructive)}
                            onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
                          >
                            <Trash2 className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            ONGLET BIENS
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="biens" className="mt-8">
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} />
                <input
                  value={searchBien}
                  onChange={e => setSearchBien(e.target.value)}
                  placeholder="Rechercher un bien..."
                  className="w-full focus:outline-none"
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                  onFocus={e => (e.target.style.borderColor = T.gold)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>
              <Select value={filtreStatutBien} onValueChange={setFiltreStatutBien}>
                <SelectTrigger className="w-48" style={{ ...inputStyle }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <SelectItem value="all" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Tous les statuts</SelectItem>
                  <SelectItem value="en_attente_validation" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>A valider</SelectItem>
                  <SelectItem value="publie" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Publie</SelectItem>
                  <SelectItem value="sous_compromis" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Sous compromis</SelectItem>
                  <SelectItem value="vendu" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Vendu</SelectItem>
                  <SelectItem value="retire" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Retire</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtreSourceBien} onValueChange={(v: any) => setFiltreSourceBien(v)}>
                <SelectTrigger className="w-48" style={{ ...inputStyle }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <SelectItem value="all" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Toutes sources</SelectItem>
                  <SelectItem value="ambassadeur" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Ambassadeurs</SelectItem>
                  <SelectItem value="pap_scrape" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>PAP</SelectItem>
                  <SelectItem value="off_market" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Off Market</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={async () => {
                  try {
                    setExportingPdf(true);
                    const result = await utils.client.portefeuille.exportPdf.mutate({});
                    window.open(result.url, "_blank");
                    toast.success(`PDF genere — ${result.total} biens`, { description: "Le PDF s'ouvre dans un nouvel onglet" });
                  } catch (e: any) {
                    toast.error("Erreur lors de la generation du PDF", { description: e.message });
                  } finally {
                    setExportingPdf(false);
                  }
                }}
                disabled={exportingPdf}
                className="flex items-center gap-2 shrink-0 transition-colors duration-300"
                style={{ padding: "10px 16px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
              >
                {exportingPdf ? (
                  <>Generation...</>
                ) : (
                  <><FileDown className="w-4 h-4" style={{ strokeWidth: 1.5 }} />Export PDF</>
                )}
              </button>
            </div>

            {/* Biens Off Market */}
            {(filtreSourceBien === "all" || filtreSourceBien === "off_market") && (offMarketBiensList?.items ?? []).length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ ...labelStyle, color: T.success }}>Biens Off Market</span>
                  <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>({(offMarketBiensList?.items ?? []).filter((b: any) => filtreStatutBien === 'all' || (filtreStatutBien === 'publie' && b.statut === 'disponible') || b.statut === filtreStatutBien).length})</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(offMarketBiensList?.items ?? []).filter((b: any) => filtreStatutBien === 'all' || (filtreStatutBien === 'publie' && b.statut === 'disponible') || b.statut === filtreStatutBien).map((bien: any) => (
                    <div
                      key={`om-${bien.id}`}
                      className="cursor-pointer transition-colors duration-300"
                      style={{ ...cardStyle, padding: "24px" }}
                      onClick={() => window.location.href = `/dashboard/off-market?id=${bien.id}`}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${T.success}40`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <p style={{ fontFamily: font.body, fontSize: "14px", fontWeight: 500, color: T.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bien.titre}</p>
                          <p className="flex items-center gap-1 mt-1" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>
                            <MapPin className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> {bien.region ?? bien.departement ?? '—'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <StatutBadgeInline statut={bien.statut === 'disponible' ? 'publie' : bien.statut} map={STATUT_BIEN_STYLES} />
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "2px 8px", borderRadius: "2px",
                            fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            color: T.success, background: `${T.success}10`, border: `1px solid ${T.success}20`,
                          }}>Off Market</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 tabular-nums" style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 600, color: T.gold, fontVariantNumeric: "tabular-nums" }}>
                          <Euro className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                          {bien.prixBien ? Number(bien.prixBien).toLocaleString('fr-FR') + ' EUR' : '—'}
                        </span>
                        {bien.surfaceTotale && <span className="flex items-center gap-1" style={bodyMutedStyle}><Maximize2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> {bien.surfaceTotale} m2</span>}
                        {bien.typeBien && <span className="flex items-center gap-1" style={bodyMutedStyle}><Building2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> {bien.typeBien}</span>}
                        {bien.rentabiliteBrute && <span className="tabular-nums" style={{ fontSize: "10px", fontFamily: font.body, fontWeight: 500, color: T.success, padding: "2px 8px", border: `1px solid ${T.success}20`, borderRadius: "2px", background: `${T.success}08`, fontVariantNumeric: "tabular-nums" }}>{Number(bien.rentabiliteBrute).toFixed(2)}% brut</span>}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
                        <p className="tabular-nums" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, fontVariantNumeric: "tabular-nums" }}>Invest. total : {bien.investissementTotal ? Number(bien.investissementTotal).toLocaleString('fr-FR') + ' EUR' : '—'}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/dashboard/off-market?id=${bien.id}`; }}
                          className="transition-colors duration-300"
                          style={{ padding: "4px 12px", borderRadius: "2px", border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                        >
                          Voir la fiche
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {!biensList?.length || !biensList.filter((b: any) => filtreSourceBien === "all" || b.source === filtreSourceBien).length ? (
                filtreSourceBien === "off_market" ? null : (
                <div className="col-span-2 text-center py-16" style={cardStyle}>
                  <Home className="w-10 h-10 mx-auto mb-3" style={{ color: T.border, strokeWidth: 1.5 }} />
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun bien dans le portefeuille</p>
                  <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "4px" }}>Les agents actifs peuvent soumettre des biens</p>
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
                  className={`transition-colors duration-300 ${isClickable ? "cursor-pointer" : ""}`}
                  style={{
                    ...cardStyle,
                    padding: "24px",
                    borderColor: isHighlighted ? T.gold : T.border,
                  }}
                  onClick={handleBienClick}
                  onMouseEnter={e => { if (!isHighlighted) e.currentTarget.style.borderColor = `${T.gold}40`; }}
                  onMouseLeave={e => { if (!isHighlighted) e.currentTarget.style.borderColor = T.border; }}
                >
                  {bien.source === "pap_scrape" && (
                    <div className="mb-3 flex items-center justify-center" style={{ height: "120px", background: T.headerBg, border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                      <div className="text-center">
                        <Home className="w-10 h-10 mx-auto mb-2" style={{ color: T.faint, strokeWidth: 1.5 }} />
                        <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>Cliquez pour voir l'annonce PAP</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p style={{ fontFamily: font.body, fontSize: "14px", fontWeight: 500, color: T.fg }}>{bien.titre}</p>
                      <p className="flex items-center gap-1 mt-1" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>
                        <MapPin className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> {bien.ville} ({bien.codePostal})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <StatutBadgeInline statut={bien.statutBien} map={STATUT_BIEN_STYLES} />
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "2px 8px", borderRadius: "2px",
                        fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        color: T.gold, background: `${T.gold}10`, border: `1px solid ${T.gold}30`,
                      }}>
                        {bien.source === "pap_scrape" ? "PAP" : "Ambassadeur"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="flex items-center gap-1 tabular-nums" style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 600, color: T.gold, fontVariantNumeric: "tabular-nums" }}>
                      <Euro className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                      {bien.prix?.toLocaleString("fr-FR")} EUR FAI
                    </span>
                    <span className="flex items-center gap-1" style={bodyMutedStyle}>
                      <Maximize2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> {bien.surface} m2
                    </span>
                    <span className="flex items-center gap-1" style={bodyMutedStyle}>
                      <Building2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> {bien.typeBien}
                    </span>
                    {bien.dpeLettre && bien.dpeLettre !== "NC" && (
                      <span style={{ fontSize: "10px", fontFamily: font.body, fontWeight: 500, color: T.success, padding: "2px 8px", border: `1px solid ${T.success}20`, borderRadius: "2px", background: `${T.success}08` }}>DPE {bien.dpeLettre}</span>
                    )}
                  </div>

                  {/* Decomposition du prix */}
                  {(bien.prixNetVendeur || bien.honorairesAgence) && (
                    <div className="flex items-center gap-3 mt-3 tabular-nums" style={{ background: T.headerBg, border: `1px solid ${T.border}`, borderRadius: "2px", padding: "8px 12px", fontSize: "11px", fontFamily: font.body, fontVariantNumeric: "tabular-nums" }}>
                      {bien.prixNetVendeur && (
                        <span style={{ color: T.muted }}>
                          Net vendeur : <span style={{ color: T.fg, fontWeight: 500 }}>{Number(bien.prixNetVendeur).toLocaleString("fr-FR")} EUR</span>
                        </span>
                      )}
                      {bien.prixNetVendeur && bien.honorairesAgence && (
                        <span style={{ color: T.faint }}>+</span>
                      )}
                      {bien.honorairesAgence && (
                        <span style={{ color: T.muted }}>
                          Honoraires : <span style={{ color: T.fg, fontWeight: 500 }}>{Number(bien.honorairesAgence).toLocaleString("fr-FR")} EUR</span>
                        </span>
                      )}
                      {bien.honorairesAgence && bien.prix && (
                        <span style={{ marginLeft: "auto", color: T.faint }}>
                          ({Math.round((Number(bien.honorairesAgence) / Number(bien.prix)) * 100)}% honoraires)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
                    <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>Ref. {bien.reference}</p>
                    <div className="flex gap-2">
                      {bien.statutBien === "en_attente_validation" && (
                        <button
                          onClick={() => updateStatutBien.mutate({ id: bien.id, statut: "publie" })}
                          className="flex items-center gap-1 transition-colors duration-300"
                          style={{ padding: "4px 10px", borderRadius: "2px", border: `1px solid ${T.success}30`, background: `${T.success}08`, color: T.success, fontFamily: font.body, fontSize: "11px", fontWeight: 500, cursor: "pointer" }}
                        >
                          <CheckCircle className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Valider
                        </button>
                      )}
                      <Select
                        value={bien.statutBien}
                        onValueChange={v => updateStatutBien.mutate({ id: bien.id, statut: v as any })}
                      >
                        <SelectTrigger className="w-36 h-7 text-xs" style={{ background: T.headerBg, border: `1px solid ${T.border}`, borderRadius: "2px", color: T.muted, fontFamily: font.body, fontSize: "11px" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                          <SelectItem value="en_attente_validation" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>A valider</SelectItem>
                          <SelectItem value="publie" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>Publie</SelectItem>
                          <SelectItem value="sous_compromis" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>Sous compromis</SelectItem>
                          <SelectItem value="vendu" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>Vendu</SelectItem>
                          <SelectItem value="retire" style={{ color: T.fg, fontFamily: font.body, fontSize: "11px" }}>Retire</SelectItem>
                        </SelectContent>
                      </Select>
                      {bien.source !== "pap_scrape" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedBienDetail(bien); }}
                          className="transition-colors duration-300"
                          style={{ padding: "4px 10px", borderRadius: "2px", border: `1px solid ${T.border}`, background: T.raised, color: T.muted, fontFamily: font.body, fontSize: "11px", fontWeight: 500, cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.gold}40`; e.currentTarget.style.color = T.gold; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                        >
                          Voir la fiche
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenProposer(bien.id)}
                        className="transition-colors duration-300"
                        style={{ padding: "4px 10px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, cursor: "pointer" }}
                      >
                        Proposer a un lead
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            ONGLET COURTIERS — Liste
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="courtiers" className="mt-8">
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} />
                <input
                  value={searchCourtier}
                  onChange={e => setSearchCourtier(e.target.value)}
                  placeholder="Rechercher un courtier..."
                  className="w-full focus:outline-none"
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                  onFocus={e => (e.target.style.borderColor = T.gold)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>
              <Select value={filtreStatutCourtier} onValueChange={setFiltreStatutCourtier}>
                <SelectTrigger className="w-44" style={{ ...inputStyle }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: T.raised, border: `1px solid ${T.border}` }}>
                  <SelectItem value="tous" style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>Tous les statuts</SelectItem>
                  <SelectItem value="en_attente" style={{ color: T.gold, fontFamily: font.body, fontSize: "12px" }}>En attente</SelectItem>
                  <SelectItem value="actif" style={{ color: T.success, fontFamily: font.body, fontSize: "12px" }}>Actif</SelectItem>
                  <SelectItem value="suspendu" style={{ color: T.muted, fontFamily: font.body, fontSize: "12px" }}>Suspendu</SelectItem>
                  <SelectItem value="resilie" style={{ color: T.destructive, fontFamily: font.body, fontSize: "12px" }}>Resilie</SelectItem>
                </SelectContent>
              </Select>
              <a href="/inscription-courtier" target="_blank">
                <button style={{
                  padding: "10px 20px",
                  borderRadius: "2px",
                  background: T.gold,
                  color: T.bg,
                  fontFamily: font.body,
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }} className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> Inscrire un courtier
                </button>
              </a>
            </div>

            {!courtiersList?.length ? (
              <div className="text-center py-16" style={cardStyle}>
                <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: T.border, strokeWidth: 1.5 }} />
                <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun courtier trouve</p>
              </div>
            ) : (
              <div style={{ ...cardStyle, overflow: "hidden" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Courtier", "Contact", "Code parrain", "Statut", ""].map(h => (
                        <th key={h} className={`text-left px-5 py-3 ${h === "" ? "text-right" : ""}`} style={{ ...labelStyle, background: T.headerBg }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {courtiersList.map((c: any) => (
                      <tr
                        key={c.id}
                        className="transition-colors duration-300"
                        style={{ borderBottom: `1px solid ${T.borderSubtle}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-5 py-3">
                          <div>
                            <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{c.prenom} {c.nom}</p>
                            {c.cabinetNom && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{c.cabinetNom}</p>}
                            <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{c.ville}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p style={{ fontFamily: font.body, fontSize: "12px", color: T.fg }}>{c.email}</p>
                          <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{c.telephone}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontFamily: font.body, fontSize: "12px", color: T.gold }}>{c.codeParrain ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Select
                            value={c.statutInterne}
                            onValueChange={v => updateStatutCourtier.mutate({ id: c.id, statutInterne: v as any })}
                          >
                            <SelectTrigger className={`w-36 h-7 text-xs border ${STATUT_COLORS[c.statutInterne] ?? ""} bg-transparent`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ background: T.raised, border: `1px solid ${T.border}` }}>
                              <SelectItem value="en_attente" style={{ color: T.gold, fontFamily: font.body, fontSize: "11px" }}>En attente</SelectItem>
                              <SelectItem value="actif" style={{ color: T.success, fontFamily: font.body, fontSize: "11px" }}>Actif</SelectItem>
                              <SelectItem value="suspendu" style={{ color: T.muted, fontFamily: font.body, fontSize: "11px" }}>Suspendu</SelectItem>
                              <SelectItem value="resilie" style={{ color: T.destructive, fontFamily: font.body, fontSize: "11px" }}>Resilie</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedCourtier(c.id)}
                              className="transition-opacity duration-300 hover:opacity-70"
                              style={{ padding: "6px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                              title="Voir le detail"
                            >
                              <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                            </button>
                            <button
                              onClick={() => handleDeleteCourtier(c.id, `${c.prenom} ${c.nom}`)}
                              className="transition-colors duration-300"
                              style={{ padding: "6px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                              title="Supprimer"
                              onMouseEnter={e => (e.currentTarget.style.color = T.destructive)}
                              onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
                            >
                              <Trash2 className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                            </button>
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

        {/* ═══════════════════════════════════════════════════════
            ONGLET MATCHING
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="matching" className="mt-8">
          {showMatchingPipeline && matchingActiveDossier ? (
            /* ─── VUE PIPELINE DOSSIER ─── */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button onClick={() => setShowMatchingPipeline(false)} className="flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70" style={{ fontFamily: font.body, fontSize: "12px", color: T.muted, background: "transparent", border: "none", cursor: "pointer" }}>
                  <ArrowLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> Retour aux leads
                </button>
                <button onClick={() => {
                  if (window.confirm("Supprimer ce dossier de matching ?")) deleteDossier.mutate({ id: matchingActiveDossier.id });
                }} className="flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70" style={{ fontFamily: font.body, fontSize: "12px", color: T.destructive, background: "transparent", border: "none", cursor: "pointer" }}>
                  <Trash2 className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> Supprimer le dossier
                </button>
              </div>

              {/* Lead info + criteres mandat */}
              {(() => {
                const lead = crmLeads?.items?.find((l: any) => l.id === matchingActiveDossier.crmLeadId);
                const mandat = (matchingLeadDetail as any)?.mandat;
                return lead ? (
                  <div style={{ ...cardStyle, padding: "24px" }} className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p style={{ fontFamily: font.display, fontSize: "20px", fontWeight: 600, color: T.fg, letterSpacing: "0.02em" }}>{lead.prenom} {lead.nom}</p>
                        <p style={{ fontFamily: font.body, fontSize: "13px", color: T.muted, marginTop: "2px" }}>{lead.email} · {lead.telephone}</p>
                      </div>
                      <StatutBadgeInline statut={matchingActiveDossier.statut ?? "en_cours"} />
                    </div>

                    {/* Budget & criteres du mandat */}
                    {mandat ? (
                      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "16px" }} className="space-y-3">
                        <p style={labelStyle}>Criteres de recherche</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {mandat.budgetMax && (
                            <div className="col-span-2 flex items-center gap-2">
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.muted }}>Budget max :</span>
                              <span className="tabular-nums" style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.gold, fontVariantNumeric: "tabular-nums" }}>{Number(mandat.budgetMax).toLocaleString("fr-FR")} EUR</span>
                              {mandat.apportPersonnel && (
                                <span className="tabular-nums" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, fontVariantNumeric: "tabular-nums" }}>(apport : {Number(mandat.apportPersonnel).toLocaleString("fr-FR")} EUR)</span>
                              )}
                            </div>
                          )}
                          {mandat.typeBien && (
                            <div className="flex gap-1">
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.faint }}>Type :</span>
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg, textTransform: "capitalize" }}>{mandat.typeBien.replace(/_/g, " ")}</span>
                            </div>
                          )}
                          {mandat.localisation && (
                            <div className="flex gap-1">
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.faint }}>Zone :</span>
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg }}>{mandat.localisation}</span>
                            </div>
                          )}
                          {(mandat.surfaceMin || mandat.surfaceMax) && (
                            <div className="flex gap-1">
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.faint }}>Surface :</span>
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg }}>
                                {mandat.surfaceMin ? `${mandat.surfaceMin} m2` : ""}
                                {mandat.surfaceMin && mandat.surfaceMax ? " – " : ""}
                                {mandat.surfaceMax ? `${mandat.surfaceMax} m2` : ""}
                              </span>
                            </div>
                          )}
                          {(mandat.nbPiecesMin || mandat.nbPiecesMax) && (
                            <div className="flex gap-1">
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.faint }}>Pieces :</span>
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg }}>
                                {mandat.nbPiecesMin ?? ""}{mandat.nbPiecesMin && mandat.nbPiecesMax ? "–" : ""}{mandat.nbPiecesMax ?? ""}
                              </span>
                            </div>
                          )}
                          {mandat.etatBien && (
                            <div className="flex gap-1">
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.faint }}>Etat :</span>
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg, textTransform: "capitalize" }}>{mandat.etatBien.replace(/_/g, " ")}</span>
                            </div>
                          )}
                          {mandat.modeFinancement && (
                            <div className="flex gap-1">
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.faint }}>Financement :</span>
                              <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg, textTransform: "capitalize" }}>{mandat.modeFinancement}</span>
                            </div>
                          )}
                        </div>
                        {/* Criteres booleens */}
                        {["balconTerrasse","parkingGarage","cave","ascenseur","calme","lumineux","procheTransports","procheEcoles"].some(k => (mandat as any)[k]) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[{k:"balconTerrasse",l:"Balcon/Terrasse"},{k:"parkingGarage",l:"Parking"},{k:"cave",l:"Cave"},{k:"ascenseur",l:"Ascenseur"},{k:"calme",l:"Calme"},{k:"lumineux",l:"Lumineux"},{k:"procheTransports",l:"Transports"},{k:"procheEcoles",l:"Ecoles"}]
                              .filter(({k}) => (mandat as any)[k])
                              .map(({k,l}) => (
                                <span key={k} style={{ fontSize: "10px", fontFamily: font.body, fontWeight: 500, color: T.gold, padding: "2px 8px", border: `1px solid ${T.gold}20`, borderRadius: "2px", background: `${T.gold}08`, letterSpacing: "0.04em", textTransform: "uppercase" }}>{l}</span>
                              ))}
                          </div>
                        )}
                        {mandat.autresCriteres && (
                          <p style={{ fontFamily: font.body, fontSize: "12px", color: T.muted, fontStyle: "italic" }}>"{mandat.autresCriteres}"</p>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, borderTop: `1px solid ${T.border}`, paddingTop: "12px" }}>Aucun mandat de recherche lie — les criteres de matching sont bases sur les donnees CRM.</p>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Pipeline statuts */}
              <div style={{ ...cardStyle, padding: "24px" }}>
                <p style={{ ...labelStyle, marginBottom: "12px" }}>Pipeline</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: "en_cours", label: "En cours" },
                    { v: "proposition_1", label: "Proposition 1" },
                    { v: "proposition_2", label: "Proposition 2" },
                    { v: "proposition_3", label: "Proposition 3" },
                    { v: "offre", label: "Offre" },
                    { v: "signature_notaire", label: "Signature notaire" },
                    { v: "vendu", label: "Bien vendu" },
                    { v: "abandonne", label: "Abandonne" },
                  ] as const).map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => updateDossier.mutate({ id: matchingActiveDossier.id, statut: v })}
                      className="transition-colors duration-300"
                      style={{
                        padding: "6px 14px",
                        borderRadius: "2px",
                        fontSize: "11px",
                        fontFamily: font.body,
                        fontWeight: matchingActiveDossier.statut === v ? 600 : 400,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        border: `1px solid ${matchingActiveDossier.statut === v ? T.gold : T.border}`,
                        background: matchingActiveDossier.statut === v ? T.gold : "transparent",
                        color: matchingActiveDossier.statut === v ? T.bg : T.faint,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode elargi + matching biens */}
              <div style={{ ...cardStyle, padding: "24px" }}>
                <div className="flex items-center justify-between mb-4">
                  <p style={labelStyle}>Biens correspondants</p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>Mode elargi :</span>
                    {[0, 1, 2].map(m => (
                      <button key={m} onClick={() => { setMatchingModeElargi(m); setSelectedLeadForMatching(matchingActiveDossier.crmLeadId); }}
                        className="transition-colors duration-300"
                        style={{
                          padding: "3px 8px",
                          borderRadius: "2px",
                          fontSize: "10px",
                          fontFamily: font.body,
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          border: `1px solid ${matchingModeElargi === m ? T.gold : T.border}`,
                          color: matchingModeElargi === m ? T.gold : T.faint,
                          background: matchingModeElargi === m ? `${T.gold}0A` : "transparent",
                          cursor: "pointer",
                        }}>
                        {m === 0 ? "Strict" : m === 1 ? "Elargi" : "Tres elargi"}
                      </button>
                    ))}
                    <button onClick={() => setSelectedLeadForMatching(matchingActiveDossier.crmLeadId)} className="transition-opacity duration-300 hover:opacity-70" style={{ padding: "4px", color: T.muted, background: "transparent", border: "none", cursor: "pointer" }}>
                      <RefreshCw className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                    </button>
                  </div>
                </div>
                {!selectedLeadForMatching ? (
                  <button onClick={() => setSelectedLeadForMatching(matchingActiveDossier.crmLeadId)} className="flex items-center gap-1.5 transition-colors duration-300" style={{ padding: "6px 14px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>
                    <TrendingUp className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Lancer le matching
                  </button>
                ) : !matchingBiens ? (
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Calcul en cours...</p>
                ) : !matchingBiens.biens?.length ? (
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun bien correspondant. Essayez le mode Elargi.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {matchingBiens.biens.map((bien: any) => (
                      <div key={bien.id}
                        onClick={() => updateDossier.mutate({ id: matchingActiveDossier.id, bienId: bien.id })}
                        className="cursor-pointer transition-colors duration-300"
                        style={{
                          padding: "12px 16px",
                          borderRadius: "2px",
                          border: `1px solid ${matchingActiveDossier.bienId === bien.id ? T.gold : T.border}`,
                          background: matchingActiveDossier.bienId === bien.id ? `${T.gold}05` : "transparent",
                        }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{bien.titre}</p>
                              <span style={{
                                display: "inline-flex", padding: "1px 6px", borderRadius: "2px",
                                fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                                color: bien.pourcentage >= 70 ? T.success : bien.pourcentage >= 40 ? T.gold : T.destructive,
                                background: bien.pourcentage >= 70 ? `${T.success}10` : bien.pourcentage >= 40 ? `${T.gold}10` : `${T.destructive}10`,
                                border: `1px solid ${bien.pourcentage >= 70 ? `${T.success}30` : bien.pourcentage >= 40 ? `${T.gold}30` : `${T.destructive}30`}`,
                              }}>
                                {bien.pourcentage}%
                              </span>
                              <StatutBadgeInline statut={bien.statutBien} map={STATUT_BIEN_STYLES} />
                            </div>
                            <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "2px" }}>{bien.adresse}, {bien.ville} · {bien.surface}m2 · {bien.nbPieces}p · {bien.prix?.toLocaleString("fr-FR")} EUR</p>
                            {bien.raisons?.length > 0 && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.success, marginTop: "4px" }}>{bien.raisons.join(" · ")}</p>}
                            {bien.blocages?.length > 0 && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.destructive }}>{bien.blocages.join(" · ")}</p>}
                            {bien.agent && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "2px" }}>Agent : {bien.agent.prenom} {bien.agent.nom} · {bien.agent.telephone}</p>}
                          </div>
                          {bien.photoPrincipaleUrl && <img src={bien.photoPrincipaleUrl} className="w-16 h-12 object-cover shrink-0" style={{ borderRadius: "2px" }} alt="" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Biens Off Market */}
              <div style={{ ...cardStyle, padding: "24px" }}>
                <div className="flex items-center gap-2 mb-4">
                  <p style={{ ...labelStyle, color: T.gold }}>Biens Off Market</p>
                  <span style={{
                    display: "inline-flex", padding: "1px 6px", borderRadius: "2px",
                    fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                    color: T.gold, background: `${T.gold}10`, border: `1px solid ${T.gold}30`,
                  }}>
                    {matchingBiens?.biensOffMarket?.length ?? 0} resultats
                  </span>
                </div>
                {!matchingBiens?.biensOffMarket?.length ? (
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun bien Off Market correspondant.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {matchingBiens.biensOffMarket.map((bien: any) => (
                      <div key={bien.id} className="transition-colors duration-300" style={{ padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: "2px" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = `${T.gold}40`)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{bien.titre}</p>
                              <span style={{
                                display: "inline-flex", padding: "1px 6px", borderRadius: "2px",
                                fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                                color: bien.pourcentage >= 70 ? T.success : bien.pourcentage >= 40 ? T.gold : T.destructive,
                                background: bien.pourcentage >= 70 ? `${T.success}10` : bien.pourcentage >= 40 ? `${T.gold}10` : `${T.destructive}10`,
                                border: `1px solid ${bien.pourcentage >= 70 ? `${T.success}30` : bien.pourcentage >= 40 ? `${T.gold}30` : `${T.destructive}30`}`,
                              }}>
                                {bien.pourcentage}%
                              </span>
                              <span style={{ display: "inline-flex", padding: "1px 6px", borderRadius: "2px", fontSize: "10px", fontFamily: font.body, fontWeight: 500, color: T.success, background: `${T.success}10`, border: `1px solid ${T.success}30` }}>Off Market</span>
                              {bien.rentabiliteBrute && <span className="tabular-nums" style={{ display: "inline-flex", padding: "1px 6px", borderRadius: "2px", fontSize: "10px", fontFamily: font.body, fontWeight: 500, color: T.muted, background: `${T.muted}10`, border: `1px solid ${T.muted}20`, fontVariantNumeric: "tabular-nums" }}>{bien.rentabiliteBrute}% brut</span>}
                            </div>
                            <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "2px" }}>{bien.region} {bien.departement ? `— ${bien.departement}` : ""} · {bien.surface ? `${bien.surface}m2` : ""} · {bien.prix?.toLocaleString("fr-FR")} EUR</p>
                            {bien.raisons?.length > 0 && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.success, marginTop: "4px" }}>{bien.raisons.join(" · ")}</p>}
                            {bien.blocages?.length > 0 && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.destructive }}>{bien.blocages.join(" · ")}</p>}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {bien.imagePrincipale && <img src={bien.imagePrincipale} className="w-16 h-12 object-cover" style={{ borderRadius: "2px" }} alt="" />}
                            <button
                              onClick={() => window.open(`/dashboard/off-market?id=${bien.id}`, "_blank")}
                              style={{ fontFamily: font.body, fontSize: "11px", color: T.gold, background: "transparent", border: "none", cursor: "pointer", textAlign: "center" }}
                            >
                              Voir la fiche
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ ...cardStyle, padding: "24px" }}>
                <p style={{ ...labelStyle, marginBottom: "8px" }}>Notes internes</p>
                <textarea
                  value={matchingNotesEdit}
                  onChange={e => setMatchingNotesEdit(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, width: "100%", resize: "none" }}
                  placeholder="Notes sur ce dossier..."
                  onFocus={e => (e.target.style.borderColor = T.gold)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
                <button onClick={() => updateDossier.mutate({ id: matchingActiveDossier.id, notes: matchingNotesEdit })} className="flex items-center gap-1.5 mt-3 transition-colors duration-300" style={{ padding: "6px 14px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>
                  Sauvegarder les notes
                </button>
              </div>
            </div>
          ) : (
            /* ─── VUE LISTE LEADS ─── */
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.faint, strokeWidth: 1.5 }} />
                  <input
                    value={matchingLeadSearch}
                    onChange={e => setMatchingLeadSearch(e.target.value)}
                    placeholder="Rechercher un lead..."
                    className="w-full focus:outline-none"
                    style={{ ...inputStyle, paddingLeft: "36px" }}
                    onFocus={e => (e.target.style.borderColor = T.gold)}
                    onBlur={e => (e.target.style.borderColor = T.border)}
                  />
                </div>
              </div>

              {/* Dossiers actifs */}
              {(matchingDossiers as any[]).filter((d: any) => d.statut !== "vendu" && d.statut !== "abandonne").length > 0 && (
                <div>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Dossiers en cours ({(matchingDossiers as any[]).filter((d: any) => d.statut !== "vendu" && d.statut !== "abandonne").length})</p>
                  <div style={{ ...cardStyle, overflow: "hidden" }}>
                    <table className="w-full">
                      <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {["Lead", "Statut pipeline", "Bien selectionne", ""].map(h => (
                          <th key={h} className={`text-left px-5 py-3 ${h === "" ? "text-right" : ""}`} style={{ ...labelStyle, background: T.headerBg }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {(matchingDossiers as any[]).filter((d: any) => d.statut !== "vendu" && d.statut !== "abandonne").map((d: any) => (
                          <tr key={d.id} className="transition-colors duration-300" style={{ borderBottom: `1px solid ${T.borderSubtle}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <td className="px-5 py-3">
                              <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{d.lead?.prenom} {d.lead?.nom}</p>
                              <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{d.lead?.email}</p>
                            </td>
                            <td className="px-5 py-3">
                              <StatutBadgeInline statut={d.statut ?? "en_cours"} />
                            </td>
                            <td className="px-5 py-3">
                              {d.bien ? (
                                <p className="tabular-nums" style={{ fontFamily: font.body, fontSize: "12px", color: T.fg, fontVariantNumeric: "tabular-nums" }}>{d.bien.titre} · {d.bien.prix?.toLocaleString("fr-FR")} EUR</p>
                              ) : <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>Aucun bien selectionne</span>}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => { setMatchingActiveDossier(d); setMatchingNotesEdit(d.notes ?? ""); setShowMatchingPipeline(true); }} className="flex items-center gap-1.5 transition-colors duration-300" style={{ padding: "4px 10px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, cursor: "pointer" }}>
                                <Eye className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Ouvrir
                              </button>
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
                <p style={{ ...labelStyle, marginBottom: "8px" }}>Tous les leads CRM</p>
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  <table className="w-full">
                    <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Lead", "Etape CRM", "Dossier matching", ""].map(h => (
                        <th key={h} className={`text-left px-5 py-3 ${h === "" ? "text-right" : ""}`} style={{ ...labelStyle, background: T.headerBg }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {!crmLeads?.items?.length ? (
                        <tr><td colSpan={4} className="text-center py-12" style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun lead dans le CRM</td></tr>
                      ) : crmLeads.items
                          .filter((l: any) => !matchingLeadSearch || `${l.prenom} ${l.nom} ${l.email}`.toLowerCase().includes(matchingLeadSearch.toLowerCase()))
                          .map((lead: any) => {
                            const dossierExistant = (matchingDossiers as any[]).find((d: any) => d.crmLeadId === lead.id && d.statut !== "vendu" && d.statut !== "abandonne");
                            return (
                              <tr key={lead.id} className="transition-colors duration-300" style={{ borderBottom: `1px solid ${T.borderSubtle}` }}
                                onMouseEnter={e => (e.currentTarget.style.background = T.raised)}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                <td className="px-5 py-3">
                                  <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{lead.prenom} {lead.nom}</p>
                                  <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{lead.email}</p>
                                </td>
                                <td className="px-5 py-3">
                                  <span style={{
                                    display: "inline-flex", alignItems: "center",
                                    padding: "2px 8px", borderRadius: "2px",
                                    fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                                    letterSpacing: "0.06em", textTransform: "uppercase",
                                    color: T.faint, background: "rgba(58,54,50,0.08)", border: "1px solid rgba(58,54,50,0.2)",
                                  }}>
                                    {lead.etape?.replace(/_/g, " ") ?? "—"}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  {dossierExistant ? (
                                    <StatutBadgeInline statut={dossierExistant.statut ?? "en_cours"} />
                                  ) : <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>Pas de dossier</span>}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => {
                                      if (dossierExistant) { setMatchingActiveDossier(dossierExistant); setMatchingNotesEdit(dossierExistant.notes ?? ""); setShowMatchingPipeline(true); }
                                      else getOrCreateDossier.mutate({ crmLeadId: lead.id });
                                    }} className="flex items-center gap-1.5 transition-colors duration-300" style={{ padding: "4px 10px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, cursor: "pointer" }}>
                                      <TrendingUp className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> {dossierExistant ? "Ouvrir" : "Creer dossier"}
                                    </button>
                                    <button onClick={() => {
                                      if (window.confirm(`Supprimer le lead ${lead.prenom} ${lead.nom} ?`)) deleteCrmLead.mutate({ id: lead.id });
                                    }} className="transition-colors duration-300" style={{ padding: "6px", color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                                      onMouseEnter={e => (e.currentTarget.style.color = T.destructive)}
                                      onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                                    </button>
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

        {/* ═══════════════════════════════════════════════════════
            ONGLET CARTE DU RESEAU
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="carte" className="mt-8">
          <div style={{ ...cardStyle, padding: "32px" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg, letterSpacing: "0.04em" }}>Carte du reseau Sigma Factory</h3>
              <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>Agents · Courtiers · Biens immobiliers</span>
            </div>
            <CarteReseau isVisible={activeTab === "carte"} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog detail ambassadeur ── */}
      <Dialog open={!!selectedAmb} onOpenChange={open => !open && setSelectedAmb(null)}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", color: T.fg, maxWidth: "640px", maxHeight: "85vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: font.display, fontSize: "20px", fontWeight: 600, color: T.fg, letterSpacing: "0.02em" }}>
              {ambDetail?.prenom} {ambDetail?.nom}
              <span style={{ marginLeft: "8px", fontFamily: font.body, fontSize: "12px", fontWeight: 400, color: T.gold }}>
                Niveau {ambDetail?.niveau} — {ambDetail?.niveau === "1" ? "10%" : "5%"}
              </span>
            </DialogTitle>
          </DialogHeader>
          {ambDetail && (
            <div className="space-y-5">
              {/* Stats rapides */}
              <div className="grid grid-cols-4 gap-px" style={{ background: T.border, borderRadius: "2px" }}>
                {[
                  { label: "Biens soumis", value: (ambDetail as any).stats?.totalBiens ?? ambDetail.biens?.length ?? 0 },
                  { label: "Ventes conclues", value: (ambDetail as any).stats?.ventesConclues ?? 0 },
                  { label: "Filleuls", value: (ambDetail as any).stats?.totalFilleuls ?? (ambDetail.filleuls?.length ?? 0) },
                  { label: "Commissions", value: `${((ambDetail as any).stats?.commissionsPayees ?? 0).toLocaleString("fr-FR")} EUR` },
                ].map(s => (
                  <div key={s.label} style={{ background: T.bg, padding: "16px", textAlign: "center" }}>
                    <p className="tabular-nums" style={{ fontFamily: font.display, fontSize: "20px", fontWeight: 600, color: T.fg, fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                    <p style={{ ...labelStyle, marginTop: "4px", fontSize: "10px" }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Infos contact + profil */}
              <div className="grid grid-cols-2 gap-3">
                <div style={{ background: T.bg, padding: "16px", border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Contact</p>
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.fg }}>{ambDetail.email}</p>
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.fg }}>{ambDetail.telephone}</p>
                  <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "4px" }}>{ambDetail.adresse}, {ambDetail.codePostal} {ambDetail.ville}</p>
                </div>
                <div style={{ background: T.bg, padding: "16px", border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Profil</p>
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.fg, textTransform: "capitalize" }}>{ambDetail.statut?.replace(/_/g, " ")}</p>
                  {ambDetail.siret && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>SIRET : {ambDetail.siret}</p>}
                  {(ambDetail as any).codeParrain && <p style={{ fontFamily: font.body, fontSize: "11px", color: T.gold, marginTop: "4px" }}>Code parrain : {(ambDetail as any).codeParrain}</p>}
                  <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "4px" }}>Inscrit le {new Date(ambDetail.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              {/* Contrat + Renvoyer bienvenue */}
              <div className="flex gap-2">
                {ambDetail.contratPdfUrl && (
                  <a href={ambDetail.contratPdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 transition-colors duration-300" style={{ padding: "8px 12px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>
                      Telecharger le contrat signe
                    </button>
                  </a>
                )}
                <button
                  className="flex-1 transition-colors duration-300"
                  disabled={renvoyerBienvenueAmb.isPending}
                  onClick={() => renvoyerBienvenueAmb.mutate({ id: ambDetail.id })}
                  style={{ padding: "8px 12px", borderRadius: "2px", border: `1px solid ${T.border}`, background: "transparent", color: T.fg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  {renvoyerBienvenueAmb.isPending ? "Envoi..." : "Renvoyer email bienvenue"}
                </button>
              </div>
              {/* Filleuls agents */}
              {ambDetail.filleuls?.length > 0 && (
                <div>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Filleuls agents ({ambDetail.filleuls.length})</p>
                  <div className="space-y-1">
                    {ambDetail.filleuls.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between" style={{ background: T.bg, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                        <div>
                          <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg }}>{f.prenom} {f.nom}</span>
                          <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginLeft: "8px" }}>{f.ville}</span>
                        </div>
                        <StatutBadgeInline statut={f.statutInterne} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Filleuls courtiers */}
              {ambDetail.filleulsCourtiers?.length > 0 && (
                <div>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Filleuls courtiers ({ambDetail.filleulsCourtiers.length})</p>
                  <div className="space-y-1">
                    {ambDetail.filleulsCourtiers.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between" style={{ background: T.bg, padding: "8px 12px", border: `1px solid ${T.gold}20`, borderRadius: "2px" }}>
                        <div>
                          <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg }}>{c.prenom} {c.nom}</span>
                          {c.cabinetNom && <span style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginLeft: "8px" }}>— {c.cabinetNom}</span>}
                        </div>
                        <span style={{
                          display: "inline-flex", padding: "2px 8px", borderRadius: "2px",
                          fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          color: T.gold, background: `${T.gold}10`, border: `1px solid ${T.gold}20`,
                        }}>Courtier N1</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Biens soumis */}
              {ambDetail.biens?.length > 0 && (
                <div>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Biens soumis ({ambDetail.biens.length})</p>
                  <div className="space-y-1">
                    {ambDetail.biens.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between" style={{ background: T.bg, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                        <div>
                          <span style={{ fontFamily: font.body, fontSize: "12px", color: T.fg }}>{b.titre}</span>
                          <span className="tabular-nums" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginLeft: "8px", fontVariantNumeric: "tabular-nums" }}>— {b.ville} — {b.prix?.toLocaleString("fr-FR")} EUR</span>
                        </div>
                        <StatutBadgeInline statut={b.statutBien} map={STATUT_BIEN_STYLES} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents bidirectionnels */}
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "20px" }}>
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

      {/* ── Dialog matching biens ── */}
      <Dialog open={showMatchingDialog} onOpenChange={setShowMatchingDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", color: T.fg, maxWidth: "720px", maxHeight: "80vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg, letterSpacing: "0.02em" }}>
              Proposer des biens au lead
              <span style={{ marginLeft: "8px", fontFamily: font.body, fontSize: "12px", fontWeight: 400, color: T.muted }}>
                {selectedBiensForLead.length}/3 selectionnes
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {!matchingBiens?.biens?.length ? (
              <div className="text-center py-12">
                <Home className="w-10 h-10 mx-auto mb-3" style={{ color: T.border, strokeWidth: 1.5 }} />
                <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucun bien disponible correspondant aux criteres</p>
              </div>
            ) : matchingBiens.biens.map((bien: any) => (
              <div
                key={bien.id}
                onClick={() => toggleBienSelection(bien.id)}
                className="cursor-pointer transition-colors duration-300"
                style={{
                  padding: "16px",
                  borderRadius: "2px",
                  border: `1px solid ${selectedBiensForLead.includes(bien.id) ? T.gold : T.border}`,
                  background: selectedBiensForLead.includes(bien.id) ? `${T.gold}05` : "transparent",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>{bien.titre}</p>
                      {bien.score > 0 && (
                        <span className="tabular-nums" style={{
                          display: "inline-flex", padding: "1px 6px", borderRadius: "2px",
                          fontSize: "10px", fontFamily: font.body, fontWeight: 500,
                          color: T.gold, background: `${T.gold}10`, border: `1px solid ${T.gold}30`,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          Score {bien.score}%
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "2px" }}>{bien.adresse}, {bien.ville}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="tabular-nums" style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 600, color: T.gold, fontVariantNumeric: "tabular-nums" }}>{bien.prix?.toLocaleString("fr-FR")} EUR</span>
                      <span style={{ fontFamily: font.body, fontSize: "12px", color: T.muted }}>{bien.surface} m2</span>
                      <span style={{ fontFamily: font.body, fontSize: "12px", color: T.muted }}>{bien.typeBien}</span>
                      {bien.dpeLettre && bien.dpeLettre !== "NC" && <span style={{ fontFamily: font.body, fontSize: "10px", color: T.success }}>DPE {bien.dpeLettre}</span>}
                    </div>
                  </div>
                  <div style={{
                    width: "20px", height: "20px",
                    border: `2px solid ${selectedBiensForLead.includes(bien.id) ? T.gold : T.faint}`,
                    background: selectedBiensForLead.includes(bien.id) ? T.gold : "transparent",
                    borderRadius: "2px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {selectedBiensForLead.includes(bien.id) && <CheckCircle className="w-3 h-3" style={{ color: T.bg, strokeWidth: 1.5 }} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-3">
            <button onClick={() => setShowMatchingDialog(false)} style={{ padding: "10px 20px", borderRadius: "2px", border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
              Annuler
            </button>
            <button
              disabled={selectedBiensForLead.length === 0 || proposerBiens.isPending}
              onClick={() => proposerBiens.mutate({ crmLeadId: selectedLeadForMatching!, bienIds: selectedBiensForLead })}
              className="flex-1"
              style={{ padding: "10px 20px", borderRadius: "2px", background: T.gold, color: T.bg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", opacity: selectedBiensForLead.length === 0 ? 0.4 : 1 }}
            >
              Proposer {selectedBiensForLead.length} bien{selectedBiensForLead.length > 1 ? "s" : ""} a ce lead
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modale Proposer ce bien — previsualisation PDF avant envoi ── */}
      <Dialog open={showProposerModal} onOpenChange={(o) => { if (!o) setShowProposerModal(false); }}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", color: T.fg, maxWidth: "640px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg, letterSpacing: "0.02em" }}>
              {proposerStep === "done" ? "Fiche envoyee" : "Proposer ce bien a un lead"}
            </DialogTitle>
          </DialogHeader>

          {proposerStep === "preview" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div style={{ width: "40px", height: "40px", border: `3px solid ${T.gold}`, borderTop: "3px solid transparent", borderRadius: "50%" }} className="animate-spin" />
              <p style={{ fontFamily: font.body, fontSize: "13px", color: T.muted }}>Generation du PDF en cours...</p>
            </div>
          )}

          {proposerStep === "confirm" && proposerPdfUrl && (
            <div className="space-y-5">
              {/* Apercu PDF */}
              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "2px", padding: "20px" }}>
                <p style={{ ...labelStyle, marginBottom: "12px" }}>Apercu du PDF genere</p>
                <a
                  href={proposerPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-colors duration-300"
                  style={{ padding: "8px 16px", borderRadius: "2px", border: `1px solid ${T.gold}30`, background: `${T.gold}08`, color: T.gold, fontFamily: font.body, fontSize: "12px", fontWeight: 500, textDecoration: "none" }}
                >
                  <FileText className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> Ouvrir la fiche PDF (nouvel onglet)
                </a>
                <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "8px" }}>Verifiez le contenu avant d'envoyer au lead.</p>
              </div>

              {/* Selection du lead */}
              <div>
                <p style={{ fontFamily: font.body, fontSize: "13px", color: T.fg, marginBottom: "8px" }}>Lead destinataire</p>
                <Select
                  value={selectedLeadForMatching ? String(selectedLeadForMatching) : ""}
                  onValueChange={(v) => setSelectedLeadForMatching(Number(v))}
                >
                  <SelectTrigger style={{ ...inputStyle }}>
                    <SelectValue placeholder="Selectionner un lead..." />
                  </SelectTrigger>
                  <SelectContent style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    {crmLeads?.items?.map((lead: any) => {
                      const count = getFichesCount(lead.id);
                      return (
                        <SelectItem key={lead.id} value={String(lead.id)} style={{ color: T.fg, fontFamily: font.body, fontSize: "12px" }}>
                          {lead.prenom} {lead.nom} — {lead.email}
                          {count > 0 && (
                            <span style={{ marginLeft: "8px", fontSize: "11px", color: T.gold, fontWeight: 500 }}>
                              ({count} fiche{count > 1 ? "s" : ""} envoyee{count > 1 ? "s" : ""})
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Alerte doublon */}
                {doublonCheck?.alreadySent && (
                  <div className="flex items-start gap-2 mt-2" style={{ background: `${T.gold}08`, border: `1px solid ${T.gold}30`, borderRadius: "2px", padding: "10px 12px" }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: T.gold, strokeWidth: 1.5 }} />
                    <div>
                      <p style={{ fontFamily: font.body, fontSize: "11px", fontWeight: 500, color: T.gold }}>Ce bien a deja ete propose a ce lead</p>
                      {doublonCheck.sentAt && (
                        <p style={{ fontFamily: font.body, fontSize: "11px", color: T.muted }}>
                          Envoye le {new Date(doublonCheck.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      )}
                      <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, marginTop: "2px" }}>Vous pouvez quand meme renvoyer si necessaire.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message personnalise */}
              <div>
                <p style={{ fontFamily: font.body, fontSize: "13px", color: T.fg, marginBottom: "8px" }}>Message personnalise <span style={{ color: T.faint }}>(optionnel)</span></p>
                <textarea
                  value={proposerMessage}
                  onChange={(e) => setProposerMessage(e.target.value)}
                  placeholder="Suite a notre echange, voici un bien qui correspond a vos criteres..."
                  rows={3}
                  style={{ ...inputStyle, width: "100%", resize: "none" }}
                  onFocus={e => (e.target.style.borderColor = T.gold)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowProposerModal(false)} style={{ padding: "10px 20px", borderRadius: "2px", border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                  Annuler
                </button>
                <button
                  disabled={!selectedLeadForMatching || proposerBienAuLead.isPending}
                  onClick={() => proposerBienAuLead.mutate({
                    bienId: proposerBienId!,
                    crmLeadId: selectedLeadForMatching!,
                    pdfUrl: proposerPdfUrl!,
                    messagePersonnalise: proposerMessage || undefined,
                  })}
                  className="flex-1"
                  style={{ padding: "10px 20px", borderRadius: "2px", background: T.gold, color: T.bg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", opacity: !selectedLeadForMatching ? 0.4 : 1 }}
                >
                  {proposerBienAuLead.isPending ? "Envoi..." : "Envoyer la fiche au lead"}
                </button>
              </div>
            </div>
          )}

          {proposerStep === "done" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div style={{ width: "48px", height: "48px", background: `${T.success}10`, border: `1px solid ${T.success}30`, borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle className="w-6 h-6" style={{ color: T.success, strokeWidth: 1.5 }} />
              </div>
              <p style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg }}>Fiche bien envoyee avec succes</p>
              <p style={{ fontFamily: font.body, fontSize: "13px", color: T.muted }}>Le lead a recu la fiche PDF par email.</p>
              <button onClick={() => setShowProposerModal(false)} style={{ padding: "10px 28px", borderRadius: "2px", background: T.gold, color: T.bg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>
                Fermer
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── PANNEAU LATERAL DE DETAIL D'UN BIEN AMBASSADEUR ─── */}
      {selectedBienDetail && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelectedBienDetail(null)} />
          {/* Panneau */}
          <div className="w-full overflow-y-auto flex flex-col" style={{ maxWidth: "520px", background: T.surface, borderLeft: `1px solid ${T.border}` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
              <div>
                <h2 style={{ fontFamily: font.display, fontSize: "18px", fontWeight: 600, color: T.fg, letterSpacing: "0.02em" }}>{selectedBienDetail.titre}</h2>
                <p style={{ fontFamily: font.body, fontSize: "12px", color: T.faint, marginTop: "2px" }}>{selectedBienDetail.ville} ({selectedBienDetail.codePostal}) — Ref. {selectedBienDetail.reference}</p>
              </div>
              <button onClick={() => setSelectedBienDetail(null)} className="transition-opacity duration-300 hover:opacity-70" style={{ color: T.muted, background: "transparent", border: "none", cursor: "pointer", fontSize: "18px" }}>
                <span style={{ fontFamily: font.body }}>x</span>
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* Photos */}
              {bienDetailMedias && (bienDetailMedias.photos.length > 0 || bienDetailMedias.photoPrincipaleUrl) && (
                <div>
                  <p style={{ ...labelStyle, marginBottom: "12px" }}>Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {bienDetailMedias.photoPrincipaleUrl && (
                      <img src={bienDetailMedias.photoPrincipaleUrl} alt="Photo principale" className="w-full h-36 object-cover" style={{ borderRadius: "2px", border: `1px solid ${T.border}` }} />
                    )}
                    {bienDetailMedias.photos.slice(0, 5).map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full h-36 object-cover" style={{ borderRadius: "2px", border: `1px solid ${T.border}` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Infos financieres */}
              <div>
                <p style={{ ...labelStyle, marginBottom: "12px" }}>Informations</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Prix FAI", value: selectedBienDetail.prix ? `${Number(selectedBienDetail.prix).toLocaleString("fr-FR")} EUR` : "—" },
                    { label: "Net vendeur", value: selectedBienDetail.prixNetVendeur ? `${Number(selectedBienDetail.prixNetVendeur).toLocaleString("fr-FR")} EUR` : "—" },
                    { label: "Honoraires", value: selectedBienDetail.honorairesAgence ? `${Number(selectedBienDetail.honorairesAgence).toLocaleString("fr-FR")} EUR` : "—" },
                    { label: "Surface", value: selectedBienDetail.surface ? `${selectedBienDetail.surface} m2` : "—" },
                    { label: "Pieces", value: selectedBienDetail.nbPieces ?? "—" },
                    { label: "Type", value: selectedBienDetail.typeBien ?? "—" },
                    { label: "DPE", value: selectedBienDetail.dpeLettre && selectedBienDetail.dpeLettre !== "NC" ? selectedBienDetail.dpeLettre : "—" },
                    { label: "Statut", value: selectedBienDetail.statutBien ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "2px", padding: "10px 12px" }}>
                      <p style={{ fontFamily: font.body, fontSize: "10px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: T.faint }}>{label}</p>
                      <p className="tabular-nums" style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selectedBienDetail.description && (
                <div>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Description</p>
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.fg, lineHeight: 1.6 }}>{selectedBienDetail.description}</p>
                </div>
              )}

              {/* Historique des propositions */}
              <div>
                <p style={{ ...labelStyle, marginBottom: "12px" }}>
                  Historique des propositions ({bienDetailPropositions.length})
                </p>
                {bienDetailPropositions.length === 0 ? (
                  <p style={{ fontFamily: font.body, fontSize: "13px", color: T.faint }}>Aucune proposition envoyee pour ce bien.</p>
                ) : (
                  <div className="space-y-2">
                    {bienDetailPropositions.map((prop: any) => (
                      <div key={prop.id} className="flex items-center justify-between" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "2px", padding: "10px 12px" }}>
                        <div>
                          <p style={{ fontFamily: font.body, fontSize: "13px", fontWeight: 500, color: T.fg }}>
                            {prop.leadPrenom} {prop.leadNom}
                          </p>
                          <p style={{ fontFamily: font.body, fontSize: "11px", color: T.faint }}>{prop.emailDestinataire}</p>
                          <p className="tabular-nums" style={{ fontFamily: font.body, fontSize: "11px", color: T.faint, fontVariantNumeric: "tabular-nums" }}>{new Date(prop.createdAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                        {prop.pdfUrl && (
                          <a href={prop.pdfUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily: font.body, fontSize: "11px", color: T.gold, textDecoration: "none" }}>
                            PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer — bouton Proposer */}
            <div className="px-6 py-4 sticky bottom-0" style={{ background: T.surface, borderTop: `1px solid ${T.border}` }}>
              <button
                onClick={() => { setSelectedBienDetail(null); handleOpenProposer(selectedBienDetail.id); }}
                className="w-full transition-colors duration-300"
                style={{ padding: "12px 20px", borderRadius: "2px", background: T.gold, color: T.bg, fontFamily: font.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
              >
                Proposer a un lead
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

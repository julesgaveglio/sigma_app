import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, PhoneCall, DollarSign,
  BarChart3, AlertTriangle, ExternalLink, Trash2, RefreshCw,
  Clock, Calendar, ChevronRight, Target, Zap, ArrowLeft, Download,
  MessageSquare, Video, X, CreditCard, Banknote, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Area, Line, Legend
} from "recharts";

type Periode = "jour" | "semaine" | "mois";
type PeriodeGraph = "jour" | "semaine" | "mois" | "annee";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

// ─── Tooltip personnalise ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#111111",
      border: "1px solid #1E1E1E",
      borderRadius: "2px",
      padding: "12px 16px",
    }}>
      <p style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#6B6560",
        marginBottom: "8px",
      }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2" style={{ marginBottom: "4px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "1px", backgroundColor: p.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#6B6560" }}>{p.name} :</span>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", fontWeight: 500, color: "#F0EDE6", fontVariantNumeric: "tabular-nums" }}>
            {typeof p.value === "number" && p.name.includes("€") ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Carte KPI ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, sub2, alert, icon: Icon, accent = false, highlight = false }: {
  label: string; value: string; sub?: string; sub2?: string; alert?: boolean;
  icon: React.ElementType; accent?: boolean; highlight?: boolean;
}) {
  return (
    <div style={{
      padding: "20px",
      background: alert ? "rgba(160,64,64,0.06)" : "#0A0A0A",
      borderRight: "none",
    }}>
      <div className="flex items-start justify-between" style={{ marginBottom: "12px" }}>
        <p style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#6B6560",
        }}>{label}</p>
        <Icon style={{ width: "16px", height: "16px", color: "#3A3632", strokeWidth: 1.5 }} />
      </div>
      <p className="tabular-nums" style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "28px",
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: "0.02em",
        color: highlight ? "#C9A84C" : alert ? "#A04040" : "#F0EDE6",
      }}>{value}</p>
      {sub && <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#3A3632", marginTop: "6px" }}>{sub}</p>}
      {sub2 && <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", fontWeight: 500, color: accent ? "#4A7A5A" : "#3A3632", marginTop: "2px" }}>{sub2}</p>}
      {alert && (
        <div className="flex items-center gap-1" style={{ marginTop: "8px" }}>
          <AlertTriangle style={{ width: "12px", height: "12px", color: "#A04040", strokeWidth: 1.5 }} />
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#A04040" }}>En dessous de la moyenne</span>
        </div>
      )}
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
function StatutBadge({ show, pitche, formule }: { show: boolean; pitche: boolean; formule?: string | null }) {
  if (!show) return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "2px",
      fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500,
      letterSpacing: "0.06em", textTransform: "uppercase",
      color: "#A04040", background: "rgba(160,64,64,0.08)", border: "1px solid rgba(160,64,64,0.2)",
    }}>No Show</span>
  );
  if (!pitche) return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "2px",
      fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500,
      letterSpacing: "0.06em", textTransform: "uppercase",
      color: "#6B6560", background: "rgba(107,101,96,0.08)", border: "1px solid rgba(107,101,96,0.2)",
    }}>Non pitche</span>
  );
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "2px",
      fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500,
      letterSpacing: "0.06em", textTransform: "uppercase",
      color: "#4A7A5A", background: "rgba(74,122,90,0.08)", border: "1px solid rgba(74,122,90,0.2)",
    }}>Close {formule ? `· ${formule}` : ""}</span>
  );
}

export default function SalesDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [periode, setPeriode] = useState<Periode>("mois");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "graphique" | "previsionnel" | "closes" | "closers">("overview");
  const [periodeGraph, setPeriodeGraph] = useState<PeriodeGraph>("mois");
  const [filtreHistorique, setFiltreHistorique] = useState<"jour" | "semaine" | "mois" | "annee" | "tout">("tout");
  const [filtreCloser, setFiltreCloser] = useState<string>("tous");
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedClose, setSelectedClose] = useState<any | null>(null);

  const { data: stats, isLoading, refetch } = trpc.sales.stats.useQuery({ periode });
  const listeInput = filtreHistorique === "annee" ? "tout" : filtreHistorique;
  const { data: closes, refetch: refetchCloses } = trpc.sales.liste.useQuery({ periode: listeInput, closerNom: filtreCloser !== "tous" ? filtreCloser : undefined });
  const { data: graphData } = trpc.sales.graphiqueCA.useQuery({ periode: periodeGraph });
  const { data: listeClosers } = trpc.sales.listeClosers.useQuery();
  const { refetch: fetchCsv } = trpc.sales.exportCsv.useQuery(
    { periode: filtreHistorique, closerNom: filtreCloser !== "tous" ? filtreCloser : undefined },
    { enabled: false }
  );
  // ─── Fiche detail close ─────────────────────────────────────────────────────
  const CloseDetailModal = ({ c, onClose }: { c: any; onClose: () => void }) => {
    const reste = c.montantGenere - c.montantEncaisse;
    const statutLabel = !c.show ? "No Show" : c.resultat === "close" ? "Close" : c.resultat === "r2" ? "R2" : c.resultat === "perdu" ? "Perdu" : "Non close";
    const statutColor = !c.show ? "#3A3632" : c.resultat === "close" ? "#4A7A5A" : c.resultat === "r2" ? "#6B6560" : c.resultat === "perdu" ? "#A04040" : "#6B6560";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
        <div className="relative w-full mx-4" style={{
          maxWidth: "520px",
          background: "#111111",
          border: "1px solid #1E1E1E",
          borderRadius: "2px",
        }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between" style={{ padding: "20px 24px", borderBottom: "1px solid #1E1E1E" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>{c.leadNom || "Lead sans nom"}</div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "2px" }}>{c.leadEmail}{c.leadTelephone ? ` · ${c.leadTelephone}` : ""}</div>
            </div>
            <button onClick={onClose} className="transition-opacity duration-300 hover:opacity-70" style={{ color: "#6B6560", marginTop: "2px" }}>
              <X style={{ width: "16px", height: "16px", strokeWidth: 1.5 }} />
            </button>
          </div>
          {/* Infos principales */}
          <div style={{ padding: "24px" }}>
            <div className="grid grid-cols-3 gap-px" style={{ background: "#1E1E1E", borderRadius: "2px", marginBottom: "20px" }}>
              <div style={{ padding: "12px", background: "#111111", textAlign: "center" }}>
                <div className="label-uppercase" style={{ marginBottom: "4px", fontSize: "10px" }}>Closer</div>
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{c.closerNom}</div>
              </div>
              <div style={{ padding: "12px", background: "#111111", textAlign: "center" }}>
                <div className="label-uppercase" style={{ marginBottom: "4px", fontSize: "10px" }}>Date</div>
                <div className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#6B6560" }}>{new Date(c.dateCall).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div style={{ padding: "12px", background: "#111111", textAlign: "center" }}>
                <div className="label-uppercase" style={{ marginBottom: "4px", fontSize: "10px" }}>Resultat</div>
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, color: statutColor }}>{statutLabel}</div>
              </div>
            </div>
            {/* Offre & paiement */}
            <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: "16px" }}>
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560", padding: "4px 10px", background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px" }}>{c.offre}</span>
              {c.formule && <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#C9A84C", padding: "4px 10px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "2px" }}>{c.formule}</span>}
              {c.modePaiement && <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560", padding: "4px 10px", background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px" }}>{c.modePaiement === "une_fois" ? "Paiement 1x" : c.modePaiement === "deux_fois" ? "Paiement 2x" : "Paiement 3x"}</span>}
            </div>
            {/* Montants */}
            {c.montantGenere > 0 && (
              <div className="grid grid-cols-3 gap-px" style={{ background: "#1E1E1E", borderRadius: "2px", marginBottom: "16px" }}>
                <div style={{ padding: "12px", background: "#111111" }}>
                  <div className="label-uppercase" style={{ fontSize: "10px", marginBottom: "4px" }}>Genere</div>
                  <div className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 600, color: "#C9A84C" }}>{fmt(c.montantGenere)}</div>
                </div>
                <div style={{ padding: "12px", background: "#111111" }}>
                  <div className="label-uppercase" style={{ fontSize: "10px", marginBottom: "4px" }}>Encaisse</div>
                  <div className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 600, color: "#4A7A5A" }}>{fmt(c.montantEncaisse)}</div>
                </div>
                <div style={{ padding: "12px", background: "#111111" }}>
                  <div className="label-uppercase" style={{ fontSize: "10px", marginBottom: "4px" }}>Reste</div>
                  <div className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 600, color: reste > 0 ? "#6B6560" : "#3A3632" }}>{reste > 0 ? fmt(reste) : "—"}</div>
                </div>
              </div>
            )}
            {/* Detail paiement */}
            {c.montantGenere > 0 && (
              <div className="flex flex-wrap gap-3" style={{ marginBottom: "16px" }}>
                {c.montantCb > 0 && <span className="flex items-center gap-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560" }}><CreditCard style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} /> CB : {fmt(c.montantCb)}</span>}
                {c.montantVirement > 0 && <span className="flex items-center gap-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560" }}><Banknote style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} /> Virement : {fmt(c.montantVirement)}</span>}
                {c.montantPrelevement > 0 && <span className="flex items-center gap-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560" }}><FileText style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} /> Prelevement : {fmt(c.montantPrelevement)}</span>}
                {c.montantCreditImpot > 0 && <span className="flex items-center gap-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#C9A84C" }}><FileText style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} /> Credit impot : {fmt(c.montantCreditImpot)}</span>}
                {c.dateVirementPrevu && <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>Virement prevu : {c.dateVirementPrevu}</span>}
              </div>
            )}
            {/* Commentaire */}
            {c.commentaire && (
              <div style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "16px", marginBottom: "16px" }}>
                <div className="flex items-center gap-2" style={{ marginBottom: "8px" }}>
                  <MessageSquare style={{ width: "14px", height: "14px", color: "#6B6560", strokeWidth: 1.5 }} />
                  <span className="label-uppercase" style={{ fontSize: "10px" }}>Note du closer</span>
                </div>
                <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.commentaire}</p>
              </div>
            )}
            {/* Lien Fathom */}
            {c.lienFathom && (
              <a href={c.lienFathom} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 transition-colors duration-300"
                style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "14px", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                <Video style={{ width: "16px", height: "16px", color: "#6B6560", strokeWidth: 1.5, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>Enregistrement Fathom</div>
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lienFathom}</div>
                </div>
                <ExternalLink style={{ width: "14px", height: "14px", color: "#3A3632", strokeWidth: 1.5, flexShrink: 0 }} />
              </a>
            )}
            {!c.commentaire && !c.lienFathom && (
              <div style={{ textAlign: "center", padding: "16px 0", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#3A3632" }}>Aucune note ni enregistrement pour ce call.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const supprimerMut = trpc.sales.supprimer.useMutation({
    onSuccess: () => { refetch(); refetchCloses(); setDeleteId(null); }
  });

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const result = await fetchCsv();
      if (!result.data) return;
      const blob = new Blob(["\uFEFF" + result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sigma-sales-${filtreHistorique}-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
      <div className="flex flex-col items-center gap-3">
        <div style={{ width: "24px", height: "24px", border: "2px solid #C9A84C", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#3A3632" }}>Chargement...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center text-center p-6" style={{ background: "#0A0A0A" }}>
      <div>
        <Target style={{ width: "24px", height: "24px", color: "#3A3632", strokeWidth: 1.5, margin: "0 auto 16px" }} />
        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560", marginBottom: "16px" }}>Acces reserve a la direction Sigma.</p>
        <Link href="/login">
          <button style={{
            padding: "12px 28px",
            background: "#C9A84C",
            color: "#0A0A0A",
            fontSize: "11px",
            fontWeight: 500,
            fontFamily: "'Hanken Grotesk', sans-serif",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderRadius: "2px",
            border: "none",
            cursor: "pointer",
          }}>Se connecter</button>
        </Link>
      </div>
    </div>
  );

  const g = stats?.global;
  const parCloser = stats?.parCloser || [];
  const previsionnel = stats?.previsionnel || [];
  const prochainesEcheances = stats?.prochainesEcheances || [];
  const moyGlobal = stats?.moyenneClosingGlobal || 0;

  // Donnees graphique previsionnel
  const prevData = previsionnel.map(m => ({
    mois: m.label,
    "Encaisse (€)": Math.round(m.encaisse),
    "Attendu (€)": Math.round(m.attendu),
  }));

  // Donnees graphique par closer
  const closerChartData = parCloser.map(c => ({
    name: c.nom,
    "Genere": Math.round(c.caGenere),
    "Encaisse": Math.round(c.caEncaisse),
    "Reste": Math.round(c.resteAEncaisser),
  }));

  const tabs = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "graphique", label: "Graphique CA" },
    { id: "previsionnel", label: "Previsionnel" },
    { id: "closers", label: "Par closer" },
    { id: "closes", label: "Historique" },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", color: "#F0EDE6" }}>
      {/* Modale fiche detail close */}
      {selectedClose && <CloseDetailModal c={selectedClose} onClose={() => setSelectedClose(null)} />}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E1E1E" }}>
        <div className="flex items-center justify-between" style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px 24px" }}>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="flex items-center justify-center transition-colors duration-300"
                style={{ width: "32px", height: "32px", borderRadius: "2px", background: "transparent", border: "1px solid #1E1E1E", color: "#6B6560", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#C9A84C"; e.currentTarget.style.color = "#C9A84C"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
                title="Retour au dashboard">
                <ArrowLeft style={{ width: "16px", height: "16px", strokeWidth: 1.5 }} />
              </button>
            </Link>
            <div>
              <p className="label-uppercase" style={{ fontSize: "10px", color: "#C9A84C", letterSpacing: "0.2em" }}>SIGMA FACTORY</p>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em", marginTop: "2px" }}>Sales Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periode} onValueChange={v => setPeriode(v as Periode)}>
              <SelectTrigger style={{ background: "#111111", border: "1px solid #1E1E1E", color: "#F0EDE6", width: "144px", height: "32px", fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", borderRadius: "2px" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                <SelectItem value="jour" style={{ color: "#F0EDE6", fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif" }}>Aujourd'hui</SelectItem>
                <SelectItem value="semaine" style={{ color: "#F0EDE6", fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif" }}>Cette semaine</SelectItem>
                <SelectItem value="mois" style={{ color: "#F0EDE6", fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif" }}>Ce mois</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={() => { refetch(); refetchCloses(); }}
              className="flex items-center justify-center transition-colors duration-300"
              style={{ width: "32px", height: "32px", borderRadius: "2px", background: "transparent", border: "1px solid #1E1E1E", color: "#6B6560", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#F0EDE6"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
            >
              <RefreshCw style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
            </button>
            <Link href="/sales/close">
              <button className="flex items-center gap-1.5" style={{
                padding: "0 16px",
                height: "32px",
                background: "#C9A84C",
                color: "#0A0A0A",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                borderRadius: "2px",
                border: "none",
                cursor: "pointer",
              }}>+ Saisir un call <ChevronRight style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} /></button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", borderTop: "1px solid #1E1E1E" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="transition-colors duration-300"
              style={{
                padding: "12px 16px",
                fontSize: "12px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.02em",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === t.id ? "2px solid #C9A84C" : "2px solid transparent",
                color: activeTab === t.id ? "#F0EDE6" : "#6B6560",
                cursor: "pointer",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: "96px 0" }}>
            <div style={{ width: "24px", height: "24px", border: "2px solid #C9A84C", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
          </div>
        ) : (
          <>
            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {/* KPIs financiers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                  <KpiCard label="CA genere TTC" value={fmt(g?.caGenere || 0)} sub={`HT : ${fmt(g?.caHt || 0)}`} icon={DollarSign} highlight />
                  <KpiCard label="CA encaisse TTC" value={fmt(g?.caEncaisse || 0)} sub={`HT : ${fmt(g?.caEncaisseHt || 0)}`} icon={TrendingUp} accent />
                  <KpiCard
                    label="Reste a encaisser"
                    value={fmt(g?.resteAEncaisser || 0)}
                    sub={`HT : ${fmt(g?.resteHt || 0)}`}
                    sub2={g?.resteAEncaisser && g.resteAEncaisser > 0 ? "Encaissement en attente" : undefined}
                    icon={Clock}
                    accent={false}
                  />
                  <KpiCard label="Frais bancaires" value={fmt(g?.fraisBancaires || 0)} sub={`CB: ${fmt(g?.totalCb || 0)} | Vir: ${fmt(g?.totalVirement || 0)}`} icon={TrendingDown} />
                </div>

                {/* KPIs operationnels */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                  <KpiCard label="Total calls" value={String(g?.totalCalls || 0)} sub={`${g?.shows || 0} shows · ${g?.noShows || 0} no-shows`} icon={PhoneCall} />
                  <KpiCard label="Closes realises" value={String(g?.closes || 0)} sub={`CA moyen : ${fmt(g?.caMoyen || 0)}`} icon={Target} accent />
                  <KpiCard
                    label="Taux de closing"
                    value={pct(g?.tauxClosing || 0)}
                    sub={`${g?.closes || 0} closes / ${g?.shows || 0} shows`}
                    icon={TrendingUp}
                    alert={!!g?.tauxClosing && g.tauxClosing > 0 && g.tauxClosing < 20}
                  />
                  <KpiCard
                    label="Taux no-show"
                    value={pct(g?.tauxNoShow || 0)}
                    sub={`${g?.noShows || 0} absences / ${g?.totalCalls || 0} calls`}
                    icon={TrendingDown}
                    alert={!!g?.tauxNoShow && g.tauxNoShow > 30}
                  />
                </div>

                {/* Detail des encaissements */}
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <p className="label-uppercase" style={{ marginBottom: "16px" }}>Detail des encaissements</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "#1E1E1E", borderRadius: "2px" }}>
                    {[
                      { label: "CB Stripe", value: g?.totalCb || 0, frais: "Frais ~1.4% + 0.25EUR" },
                      { label: "Virement", value: g?.totalVirement || 0, frais: "Frais ~0.3% (Qonto/Stripe)" },
                      { label: "Prelevement", value: g?.totalPrelevement || 0, frais: "Frais ~0.3% (Qonto)" },
                      { label: "Credit d'impot", value: g?.totalCreditImpot || 0, frais: "Sans frais bancaires" },
                    ].map(item => (
                      <div key={item.label} style={{ padding: "16px", background: "#111111" }}>
                        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560", marginBottom: "4px" }}>{item.label}</p>
                        <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: "#F0EDE6", lineHeight: 1 }}>{fmt(item.value)}</p>
                        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "4px" }}>{item.frais}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Echeances */}
                {prochainesEcheances.length > 0 && (
                  <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
                      <Calendar style={{ width: "16px", height: "16px", color: "#6B6560", strokeWidth: 1.5 }} />
                      <p className="label-uppercase">Echeances dans les 30 prochains jours</p>
                    </div>
                    <div>
                      {prochainesEcheances.map((e, i) => (
                        <div key={i} className="flex items-center justify-between" style={{
                          padding: "12px 0",
                          borderBottom: i < prochainesEcheances.length - 1 ? "1px solid #151515" : "none",
                        }}>
                          <div className="flex items-center gap-3">
                            <Clock style={{ width: "14px", height: "14px", color: "#3A3632", strokeWidth: 1.5, flexShrink: 0 }} />
                            <div>
                              <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{e.leadNom}</p>
                              <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>{e.closerNom} · {e.offre}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 600, color: "#C9A84C" }}>{fmt(e.montant)}</p>
                            <p className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>{new Date(e.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ GRAPHIQUE CA ═══ */}
            {activeTab === "graphique" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Controles periode */}
                <div className="flex items-center justify-between">
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>Chiffre d'affaires</h2>
                  <div className="flex" style={{ border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                    {(["jour", "semaine", "mois", "annee"] as PeriodeGraph[]).map(p => (
                      <button key={p} onClick={() => setPeriodeGraph(p)}
                        className="transition-colors duration-300"
                        style={{
                          padding: "6px 14px",
                          fontSize: "11px",
                          fontWeight: 500,
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          background: periodeGraph === p ? "#161616" : "transparent",
                          color: periodeGraph === p ? "#F0EDE6" : "#6B6560",
                          border: "none",
                          borderRight: "1px solid #1E1E1E",
                          cursor: "pointer",
                        }}>
                        {p === "jour" ? "Jour" : p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : "Annee"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Graphique principal */}
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: "20px" }}>
                    <div>
                      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 600, color: "#F0EDE6" }}>CA Genere vs Encaisse</h3>
                      <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "2px" }}>
                        {periodeGraph === "jour" ? "Par heure aujourd'hui" : periodeGraph === "semaine" ? "Par jour cette semaine" : periodeGraph === "mois" ? "Par semaine ce mois" : "Par mois cette annee"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "1px", background: "#C9A84C" }} />Genere
                      </span>
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "1px", background: "#4A4A4A" }} />Encaisse
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={graphData || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#3A3632", fontSize: 11, fontFamily: "'Hanken Grotesk', sans-serif" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#3A3632", fontSize: 11, fontFamily: "'Hanken Grotesk', sans-serif" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="caGenere" name="CA Genere (€)" fill="#C9A84C" radius={[2,2,0,0]} maxBarSize={52} />
                        <Bar dataKey="caEncaisse" name="CA Encaisse (€)" fill="#4A4A4A" radius={[2,2,0,0]} maxBarSize={52} />
                        <Line type="monotone" dataKey="nbCloses" name="Closes" stroke="#3A3A3A" strokeWidth={2} dot={{ fill: "#3A3A3A", r: 3 }} yAxisId={0} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tableau detail */}
                {graphData && graphData.length > 0 && (
                  <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E1E1E" }}>
                      <p className="label-uppercase">Detail par periode</p>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                            {["Periode", "CA Genere", "CA Encaisse", "Reste", "Closes"].map(h => (
                              <th key={h} className="text-left label-uppercase" style={{ padding: "12px 20px", background: "#0D0D0D" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {graphData.filter(d => d.caGenere > 0 || d.nbCloses > 0).map((d, i) => (
                            <tr key={i} className="transition-colors duration-300"
                              style={{ borderBottom: "1px solid #151515" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <td style={{ padding: "12px 20px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{d.label}</td>
                              <td className="tabular-nums" style={{ padding: "12px 20px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#C9A84C" }}>{fmt(d.caGenere)}</td>
                              <td className="tabular-nums" style={{ padding: "12px 20px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#4A7A5A" }}>{fmt(d.caEncaisse)}</td>
                              <td className="tabular-nums" style={{ padding: "12px 20px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560" }}>{fmt(d.caGenere - d.caEncaisse)}</td>
                              <td className="tabular-nums" style={{ padding: "12px 20px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6" }}>{d.nbCloses}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ PREVISIONNEL ═══ */}
            {activeTab === "previsionnel" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* KPIs previsionnel */}
                <div className="grid grid-cols-3 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                  {(() => {
                    const now = new Date();
                    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                    const next1 = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`;
                    const next2 = `${now.getFullYear()}-${String(now.getMonth() + 3).padStart(2, "0")}`;
                    const getAttend = (key: string) => previsionnel.find(m => m.key === key)?.attendu || 0;
                    return [
                      { label: "Ce mois", key: thisMonth, icon: Zap },
                      { label: "Mois prochain", key: next1, icon: Calendar },
                      { label: "Dans 2 mois", key: next2, icon: TrendingUp },
                    ].map(item => (
                      <div key={item.key} style={{ padding: "24px", background: "#0A0A0A" }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: "12px" }}>
                          <item.icon style={{ width: "16px", height: "16px", color: "#3A3632", strokeWidth: 1.5 }} />
                          <span className="label-uppercase">{item.label}</span>
                        </div>
                        <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 600, color: "#C9A84C", lineHeight: 1 }}>{fmt(getAttend(item.key))}</p>
                        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "6px" }}>Encaissements attendus</p>
                      </div>
                    ));
                  })()}
                </div>

                {/* Graphique previsionnel */}
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: "20px" }}>
                    <p className="label-uppercase">Timeline des encaissements (6 mois glissants)</p>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "1px", background: "#C9A84C" }} />Encaisse
                      </span>
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "1px", background: "#4A4A4A" }} />Attendu
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={prevData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                        <XAxis dataKey="mois" tick={{ fill: "#3A3632", fontSize: 11, fontFamily: "'Hanken Grotesk', sans-serif" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#3A3632", fontSize: 11, fontFamily: "'Hanken Grotesk', sans-serif" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Encaisse (€)" fill="#C9A84C" radius={[2, 2, 0, 0]} maxBarSize={48} />
                        <Bar dataKey="Attendu (€)" fill="#4A4A4A" radius={[2, 2, 0, 0]} maxBarSize={48} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "12px", textAlign: "center" }}>Base sur les modes de paiement et dates de prelevement saisis</p>
                </div>

                {/* Recap reste a encaisser */}
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "8px" }}>Reste a encaisser total</p>
                      <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", fontWeight: 600, color: "#F0EDE6", lineHeight: 1 }}>{fmt(g?.resteAEncaisser || 0)}</p>
                      <p className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#3A3632", marginTop: "6px" }}>HT : {fmt(g?.resteHt || 0)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginBottom: "4px" }}>CA genere</p>
                      <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#6B6560" }}>{fmt(g?.caGenere || 0)}</p>
                      <div style={{ marginTop: "8px", height: "4px", background: "#1E1E1E", borderRadius: "2px", width: "160px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            background: "#C9A84C",
                            borderRadius: "2px",
                            width: `${g?.caGenere ? Math.min(100, (g.caEncaisse / g.caGenere) * 100) : 0}%`,
                            transition: "width 300ms ease",
                          }}
                        />
                      </div>
                      <p className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "4px" }}>
                        {g?.caGenere ? Math.round((g.caEncaisse / g.caGenere) * 100) : 0}% encaisse
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PAR CLOSER ═══ */}
            {activeTab === "closers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Graphique closers */}
                {parCloser.length > 0 && (
                  <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                    <p className="label-uppercase" style={{ marginBottom: "16px" }}>CA par closer (EUR TTC)</p>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={closerChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#3A3632", fontSize: 12, fontFamily: "'Hanken Grotesk', sans-serif" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#3A3632", fontSize: 11, fontFamily: "'Hanken Grotesk', sans-serif" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", paddingTop: 12 }} />
                          <Bar dataKey="Genere" fill="#C9A84C" radius={[2, 2, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Encaisse" fill="#4A4A4A" radius={[2, 2, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Reste" fill="#3A3A3A" radius={[2, 2, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Tableau closers */}
                {parCloser.length > 0 ? (
                  <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                            {["Closer", "Calls", "Shows", "No Shows", "Closes", "Tx Closing", "Tx No-Show", "CA genere", "Encaisse", "Reste a enc.", "CA moyen"].map(h => (
                              <th key={h} className="text-left label-uppercase" style={{ padding: "12px 16px", background: "#0D0D0D", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parCloser.map((c, i) => {
                            const closingAlert = c.tauxClosing < moyGlobal * 0.8 && c.calls >= 3;
                            const noShowAlert = c.tauxNoShow > 35;
                            return (
                              <tr key={i} className="transition-colors duration-300"
                                style={{ borderBottom: "1px solid #151515" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                <td style={{ padding: "14px 16px" }}>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center" style={{
                                      width: "28px", height: "28px", borderRadius: "2px",
                                      background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)",
                                      fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", fontWeight: 600, color: "#C9A84C",
                                    }}>
                                      {c.nom.charAt(0)}
                                    </div>
                                    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{c.nom}</span>
                                  </div>
                                </td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{c.calls}</td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560" }}>{c.shows}</td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: noShowAlert ? "#A04040" : "#3A3632", fontWeight: noShowAlert ? 600 : 400 }}>{c.noShows}</td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, color: "#4A7A5A" }}>{c.closes}</td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, color: closingAlert ? "#A04040" : "#F0EDE6" }}>
                                  {pct(c.tauxClosing)}
                                  {closingAlert && <AlertTriangle style={{ width: "12px", height: "12px", display: "inline", marginLeft: "4px", color: "#A04040", strokeWidth: 1.5 }} />}
                                </td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: noShowAlert ? "#A04040" : "#6B6560", fontWeight: noShowAlert ? 600 : 400 }}>
                                  {pct(c.tauxNoShow)}
                                  {noShowAlert && <AlertTriangle style={{ width: "12px", height: "12px", display: "inline", marginLeft: "4px", color: "#A04040", strokeWidth: 1.5 }} />}
                                </td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, color: "#C9A84C" }}>{fmt(c.caGenere)}</td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#4A7A5A" }}>{fmt(c.caEncaisse)}</td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px" }}>
                                  {c.resteAEncaisser > 0 ? (
                                    <span style={{ fontWeight: 500, color: "#6B6560" }}>{fmt(c.resteAEncaisser)}</span>
                                  ) : <span style={{ color: "#3A3632" }}>—</span>}
                                </td>
                                <td className="tabular-nums" style={{ padding: "14px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560" }}>{fmt(c.caMoyen)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "64px 0" }}>
                    <PhoneCall style={{ width: "40px", height: "40px", margin: "0 auto 12px", color: "#1E1E1E", strokeWidth: 1.5 }} />
                    <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#3A3632" }}>Aucune donnee sur cette periode.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ HISTORIQUE ═══ */}
            {activeTab === "closes" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Filtres */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex" style={{ border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                    {(["jour", "semaine", "mois", "annee", "tout"] as const).map(p => (
                      <button key={p} onClick={() => setFiltreHistorique(p)}
                        className="transition-colors duration-300"
                        style={{
                          padding: "6px 14px",
                          fontSize: "11px",
                          fontWeight: 500,
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          background: filtreHistorique === p ? "#161616" : "transparent",
                          color: filtreHistorique === p ? "#F0EDE6" : "#6B6560",
                          border: "none",
                          borderRight: "1px solid #1E1E1E",
                          cursor: "pointer",
                        }}>
                        {p === "jour" ? "Aujourd'hui" : p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : p === "annee" ? "Annee" : "Tout"}
                      </button>
                    ))}
                  </div>
                  {listeClosers && listeClosers.length > 1 && (
                    <Select value={filtreCloser} onValueChange={setFiltreCloser}>
                      <SelectTrigger style={{ background: "#111111", border: "1px solid #1E1E1E", color: "#F0EDE6", width: "160px", height: "32px", fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", borderRadius: "2px" }}>
                        <SelectValue placeholder="Tous les closers" />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                        <SelectItem value="tous" style={{ color: "#F0EDE6", fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif" }}>Tous les closers</SelectItem>
                        {listeClosers.map(c => (
                          <SelectItem key={c} value={c} style={{ color: "#F0EDE6", fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif" }}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <button onClick={handleExportCsv} disabled={exportLoading}
                    className="flex items-center gap-2 transition-colors duration-300 disabled:opacity-50"
                    style={{
                      marginLeft: "auto",
                      padding: "6px 16px",
                      fontSize: "11px",
                      fontWeight: 500,
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#6B6560",
                      border: "1px solid #1E1E1E",
                      borderRadius: "2px",
                      background: "transparent",
                      cursor: exportLoading ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={e => { if (!exportLoading) { e.currentTarget.style.borderColor = "#C9A84C"; e.currentTarget.style.color = "#C9A84C"; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
                  >
                    <Download style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
                    {exportLoading ? "Export..." : "Export CSV"}
                  </button>
                </div>

                {closes && closes.length > 0 ? (
                  <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
                    <div className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: "1px solid #1E1E1E" }}>
                      <div className="flex items-center gap-3">
                        <p className="label-uppercase">Calls filtres</p>
                        <span style={{
                          fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "10px", color: "#6B6560",
                          padding: "2px 8px", background: "rgba(107,101,96,0.08)", border: "1px solid rgba(107,101,96,0.15)", borderRadius: "2px",
                        }}>CA compte uniquement sur les calls "Close"</span>
                      </div>
                      <span className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>{closes.length} entrees</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                            {["Date", "Closer", "Lead", "Offre", "Resultat", "Paiement", "Genere", "Encaisse", "Reste", "Fathom", ""].map(h => (
                              <th key={h} className="text-left label-uppercase" style={{ padding: "12px 16px", background: "#0D0D0D", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {closes.map((c) => {
                            const reste = c.montantGenere - c.montantEncaisse;
                            return (
                              <tr key={c.id}
                                className="transition-colors duration-300 cursor-pointer"
                                style={{ borderBottom: "1px solid #151515" }}
                                onClick={() => setSelectedClose(c)}
                                onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                <td className="tabular-nums" style={{ padding: "12px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#3A3632", whiteSpace: "nowrap" }}>
                                  {new Date(c.dateCall).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td style={{ padding: "12px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{c.closerNom}</td>
                                <td style={{ padding: "12px 16px" }}>
                                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{c.leadNom}</div>
                                  {c.leadEmail && <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>{c.leadEmail}</div>}
                                  {c.leadTelephone && <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>{c.leadTelephone}</div>}
                                </td>
                                <td style={{ padding: "12px 16px" }}>
                                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560", padding: "2px 8px", background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px" }}>{c.offre}</span>
                                </td>
                                <td style={{ padding: "12px 16px" }}>
                                  <div className="flex flex-col gap-1">
                                    {!c.show ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", padding: "2px 8px", borderRadius: "2px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#3A3632", background: "rgba(58,54,50,0.08)", border: "1px solid rgba(58,54,50,0.2)" }}>No Show</span>
                                    ) : c.resultat === "close" ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", padding: "2px 8px", borderRadius: "2px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4A7A5A", background: "rgba(74,122,90,0.08)", border: "1px solid rgba(74,122,90,0.2)" }}>Close{c.formule ? ` · ${c.formule}` : ""}</span>
                                    ) : c.resultat === "r2" ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", padding: "2px 8px", borderRadius: "2px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B6560", background: "rgba(107,101,96,0.08)", border: "1px solid rgba(107,101,96,0.2)" }}>R2</span>
                                    ) : c.resultat === "perdu" ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", padding: "2px 8px", borderRadius: "2px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#A04040", background: "rgba(160,64,64,0.08)", border: "1px solid rgba(160,64,64,0.2)" }}>Perdu</span>
                                    ) : c.resultat === "non_close" ? (
                                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", padding: "2px 8px", borderRadius: "2px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B6560", background: "rgba(107,101,96,0.06)", border: "1px solid #1E1E1E" }}>Non close</span>
                                    ) : (
                                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", padding: "2px 8px", borderRadius: "2px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#3A3632", background: "transparent", border: "1px solid #1E1E1E" }}>Show</span>
                                    )}
                                    {/* Badge parcours multi-calls */}
                                    {c.leadId != null && (
                                      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "10px", color: "#C9A84C", fontWeight: 500 }} title="Parcours multi-calls (meme lead)">Parcours lie</span>
                                    )}
                                  </div>
                                </td>
                                <td className="tabular-nums" style={{ padding: "12px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#6B6560" }}>
                                  {c.modePaiement === "une_fois" ? "1x" : c.modePaiement === "deux_fois" ? "2x" : c.modePaiement === "trois_fois" ? "3x" : "—"}
                                </td>
                                <td className="tabular-nums" style={{ padding: "12px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9A84C" }}>{c.montantGenere > 0 ? fmt(c.montantGenere) : "—"}</td>
                                <td className="tabular-nums" style={{ padding: "12px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#4A7A5A" }}>{c.montantEncaisse > 0 ? fmt(c.montantEncaisse) : "—"}</td>
                                <td className="tabular-nums" style={{ padding: "12px 16px", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px" }}>
                                  {reste > 0 ? <span style={{ fontWeight: 500, color: "#6B6560" }}>{fmt(reste)}</span> : <span style={{ color: "#3A3632" }}>—</span>}
                                </td>
                                <td style={{ padding: "12px 16px" }}>
                                  {c.lienFathom ? (
                                    <a href={c.lienFathom} target="_blank" rel="noopener noreferrer"
                                      className="transition-opacity duration-300 hover:opacity-70"
                                      style={{ color: "#6B6560" }}
                                      onClick={e => e.stopPropagation()}>
                                      <ExternalLink style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
                                    </a>
                                  ) : <span style={{ color: "#1E1E1E" }}>—</span>}
                                </td>
                                <td style={{ padding: "12px 16px" }}>
                                  {deleteId === c.id ? (
                                    <div className="flex gap-2">
                                      <button onClick={(e) => { e.stopPropagation(); supprimerMut.mutate({ id: c.id }); }}
                                        style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", fontWeight: 500, color: "#A04040", background: "none", border: "none", cursor: "pointer" }}>Confirmer</button>
                                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(null); }}
                                        style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", background: "none", border: "none", cursor: "pointer" }}>Annuler</button>
                                    </div>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                                      className="transition-colors duration-300"
                                      style={{ color: "#3A3632", background: "none", border: "none", cursor: "pointer" }}
                                      onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                                      onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                                    >
                                      <Trash2 style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <PhoneCall style={{ width: "40px", height: "40px", margin: "0 auto 12px", color: "#1E1E1E", strokeWidth: 1.5 }} />
                    <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#3A3632" }}>Aucun call enregistre.</p>
                    <Link href="/sales/close">
                      <button style={{
                        marginTop: "16px",
                        padding: "12px 28px",
                        background: "#C9A84C",
                        color: "#0A0A0A",
                        fontSize: "11px",
                        fontWeight: 500,
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        borderRadius: "2px",
                        border: "none",
                        cursor: "pointer",
                      }}>Saisir le premier call</button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

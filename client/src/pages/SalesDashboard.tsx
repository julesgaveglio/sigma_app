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

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-[#c9a84c]/30 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-[#c9a84c] text-xs font-semibold mb-2 uppercase tracking-wider">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name} :</span>
          <span className="text-white font-medium">
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
    <div className={`relative rounded-xl p-5 border overflow-hidden ${
      highlight
        ? "bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5 border-[#c9a84c]/40"
        : alert
        ? "bg-red-500/5 border-red-500/30"
        : "bg-zinc-900/80 border-zinc-800"
    }`}>
      {highlight && <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full -translate-y-8 translate-x-8" />}
      <div className="flex items-start justify-between mb-3">
        <span className="text-zinc-500 text-xs uppercase tracking-widest font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          highlight ? "bg-[#c9a84c]/20" : alert ? "bg-red-500/20" : "bg-zinc-800"
        }`}>
          <Icon className={`w-4 h-4 ${highlight ? "text-[#c9a84c]" : alert ? "text-red-400" : "text-zinc-400"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${
        highlight ? "text-[#c9a84c]" : alert ? "text-red-400" : "text-white"
      }`}>{value}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1.5">{sub}</p>}
      {sub2 && <p className={`text-xs mt-0.5 font-medium ${accent ? "text-emerald-400" : "text-zinc-600"}`}>{sub2}</p>}
      {alert && (
        <div className="flex items-center gap-1 mt-2">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-red-400 text-xs">En dessous de la moyenne</span>
        </div>
      )}
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
function StatutBadge({ show, pitche, formule }: { show: boolean; pitche: boolean; formule?: string | null }) {
  if (!show) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">No Show</span>;
  if (!pitche) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">Non pitché</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">✓ Closé {formule ? `· ${formule}` : ""}</span>;
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
  // ─── Fiche détail close ─────────────────────────────────────────────────────
  const CloseDetailModal = ({ c, onClose }: { c: any; onClose: () => void }) => {
    const reste = c.montantGenere - c.montantEncaisse;
    const statutLabel = !c.show ? "No Show" : c.resultat === "close" ? "Closé" : c.resultat === "r2" ? "R2" : c.resultat === "perdu" ? "Perdu" : "Non closé";
    const statutColor = !c.show ? "text-zinc-500" : c.resultat === "close" ? "text-emerald-400" : c.resultat === "r2" ? "text-blue-400" : c.resultat === "perdu" ? "text-red-400" : "text-zinc-400";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-zinc-800">
            <div>
              <div className="text-white font-semibold text-base">{c.leadNom || "Lead sans nom"}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{c.leadEmail}{c.leadTelephone ? ` · ${c.leadTelephone}` : ""}</div>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Infos principales */}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Closer</div>
                <div className="text-white text-sm font-semibold">{c.closerNom}</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Date</div>
                <div className="text-zinc-300 text-xs">{new Date(c.dateCall).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Résultat</div>
                <div className={`text-sm font-semibold ${statutColor}`}>{statutLabel}</div>
              </div>
            </div>
            {/* Offre & paiement */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded font-mono">{c.offre}</span>
              {c.formule && <span className="bg-[#c9a84c]/10 text-[#c9a84c] text-xs px-2.5 py-1 rounded border border-[#c9a84c]/20">{c.formule}</span>}
              {c.modePaiement && <span className="bg-zinc-800 text-zinc-400 text-xs px-2.5 py-1 rounded">{c.modePaiement === "une_fois" ? "Paiement 1×" : c.modePaiement === "deux_fois" ? "Paiement 2×" : "Paiement 3×"}</span>}
            </div>
            {/* Montants */}
            {c.montantGenere > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-900/80 rounded-lg p-3">
                  <div className="text-[10px] text-zinc-600 mb-1">Généré</div>
                  <div className="text-[#c9a84c] font-bold text-sm">{fmt(c.montantGenere)}</div>
                </div>
                <div className="bg-zinc-900/80 rounded-lg p-3">
                  <div className="text-[10px] text-zinc-600 mb-1">Encaissé</div>
                  <div className="text-emerald-400 font-bold text-sm">{fmt(c.montantEncaisse)}</div>
                </div>
                <div className="bg-zinc-900/80 rounded-lg p-3">
                  <div className="text-[10px] text-zinc-600 mb-1">Reste</div>
                  <div className={`font-bold text-sm ${reste > 0 ? "text-blue-400" : "text-zinc-600"}`}>{reste > 0 ? fmt(reste) : "—"}</div>
                </div>
              </div>
            )}
            {/* Détail paiement */}
            {c.montantGenere > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                {c.montantCb > 0 && <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> CB : {fmt(c.montantCb)}</span>}
                {c.montantVirement > 0 && <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> Virement : {fmt(c.montantVirement)}</span>}
                {c.montantPrelevement > 0 && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Prélèvement : {fmt(c.montantPrelevement)}</span>}
                {c.montantCreditImpot > 0 && <span className="flex items-center gap-1 text-[#c9a84c]"><FileText className="w-3 h-3" /> Crédit impôt : {fmt(c.montantCreditImpot)}</span>}
                {c.dateVirementPrevu && <span className="text-zinc-600">Virement prévu : {c.dateVirementPrevu}</span>}
              </div>
            )}
            {/* Commentaire */}
            {c.commentaire && (
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Note du closer</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{c.commentaire}</p>
              </div>
            )}
            {/* Lien Fathom */}
            {c.lienFathom && (
              <a href={c.lienFathom} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-blue-950/30 border border-blue-800/30 rounded-xl p-4 hover:bg-blue-950/50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-blue-400 text-sm font-medium group-hover:text-blue-300">Enregistrement Fathom</div>
                  <div className="text-zinc-600 text-xs truncate">{c.lienFathom}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              </a>
            )}
            {!c.commentaire && !c.lienFathom && (
              <div className="text-center py-4 text-zinc-700 text-sm">Aucune note ni enregistrement pour ce call.</div>
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
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Chargement...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-center p-6">
      <div className="space-y-4">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
          <Target className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-zinc-400">Accès réservé à la direction Sigma.</p>
        <Link href="/login"><Button className="bg-[#c9a84c] hover:bg-[#b8963e] text-black font-semibold">Se connecter</Button></Link>
      </div>
    </div>
  );

  const g = stats?.global;
  const parCloser = stats?.parCloser || [];
  const previsionnel = stats?.previsionnel || [];
  const prochainesEcheances = stats?.prochainesEcheances || [];
  const moyGlobal = stats?.moyenneClosingGlobal || 0;

  // Données graphique prévisionnel
  const prevData = previsionnel.map(m => ({
    mois: m.label,
    "Encaissé (€)": Math.round(m.encaisse),
    "Attendu (€)": Math.round(m.attendu),
  }));

  // Données graphique par closer
  const closerChartData = parCloser.map(c => ({
    name: c.nom,
    "Généré": Math.round(c.caGenere),
    "Encaissé": Math.round(c.caEncaisse),
    "Reste": Math.round(c.resteAEncaisser),
  }));

  const tabs = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "graphique", label: "Graphique CA" },
    { id: "previsionnel", label: "Prévisionnel" },
    { id: "closers", label: "Par closer" },
    { id: "closes", label: "Historique" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Modale fiche détail close */}
      {selectedClose && <CloseDetailModal c={selectedClose} onClose={() => setSelectedClose(null)} />}
      {/* --- section --- */}
      <div className="border-b border-zinc-800/80 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-[#c9a84c] hover:border-[#c9a84c]/50 transition-colors" title="Retour au dashboard">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <p className="text-[#c9a84c] text-[10px] tracking-[0.2em] uppercase font-medium">SIGMA FACTORY</p>
              <h1 className="text-lg font-bold text-white tracking-tight">Sales Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periode} onValueChange={v => setPeriode(v as Periode)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="jour" className="text-white text-sm">Aujourd'hui</SelectItem>
                <SelectItem value="semaine" className="text-white text-sm">Cette semaine</SelectItem>
                <SelectItem value="mois" className="text-white text-sm">Ce mois</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => { refetch(); refetchCloses(); }}
              className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white h-8 w-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Link href="/sales/close">
              <Button className="bg-[#c9a84c] hover:bg-[#b8963e] text-black font-semibold h-8 text-sm px-4">
                <span className="flex items-center gap-1.5">+ Saisir un call <ChevronRight className="w-3.5 h-3.5" /></span>
              </Button>
            </Link>
          </div>
        </div>

        {/* --- section --- */}
        <div className="max-w-7xl mx-auto px-6 flex gap-0 border-t border-zinc-800/50">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === t.id
                  ? "border-[#c9a84c] text-[#c9a84c]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* --- section --- */}
            {/* --- section --- */}
            {/* --- section --- */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* --- section --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="CA généré TTC" value={fmt(g?.caGenere || 0)} sub={`HT : ${fmt(g?.caHt || 0)}`} icon={DollarSign} highlight />
                  <KpiCard label="CA encaissé TTC" value={fmt(g?.caEncaisse || 0)} sub={`HT : ${fmt(g?.caEncaisseHt || 0)}`} icon={TrendingUp} accent />
                  <KpiCard
                    label="Reste à encaisser"
                    value={fmt(g?.resteAEncaisser || 0)}
                    sub={`HT : ${fmt(g?.resteHt || 0)}`}
                    sub2={g?.resteAEncaisser && g.resteAEncaisser > 0 ? "⚡ Encaissement en attente" : undefined}
                    icon={Clock}
                    accent={false}
                  />
                  <KpiCard label="Frais bancaires" value={fmt(g?.fraisBancaires || 0)} sub={`CB: ${fmt(g?.totalCb || 0)} | Vir: ${fmt(g?.totalVirement || 0)}`} icon={TrendingDown} />
                </div>

                {/* --- section --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Total calls" value={String(g?.totalCalls || 0)} sub={`${g?.shows || 0} shows · ${g?.noShows || 0} no-shows`} icon={PhoneCall} />
                  <KpiCard label="Closes réalisés" value={String(g?.closes || 0)} sub={`CA moyen : ${fmt(g?.caMoyen || 0)}`} icon={Target} accent />
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

                {/* --- section --- */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-medium">Détail des encaissements</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "CB Stripe", value: g?.totalCb || 0, frais: "Frais ~1.4% + 0.25€", color: "text-blue-400" },
                      { label: "Virement", value: g?.totalVirement || 0, frais: "Frais ~0.3% (Qonto/Stripe)", color: "text-violet-400" },
                      { label: "Prélèvement", value: g?.totalPrelevement || 0, frais: "Frais ~0.3% (Qonto)", color: "text-amber-400" },
                      { label: "Crédit d'impôt", value: g?.totalCreditImpot || 0, frais: "Sans frais bancaires", color: "text-emerald-400" },
                    ].map(item => (
                      <div key={item.label} className="space-y-1">
                        <p className="text-zinc-500 text-xs">{item.label}</p>
                        <p className={`text-lg font-bold ${item.color}`}>{fmt(item.value)}</p>
                        <p className="text-zinc-700 text-xs">{item.frais}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- section --- */}
                {prochainesEcheances.length > 0 && (
                  <div className="bg-zinc-900/60 border border-[#c9a84c]/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-[#c9a84c]" />
                      <h3 className="text-xs text-[#c9a84c] uppercase tracking-widest font-medium">Échéances dans les 30 prochains jours</h3>
                    </div>
                    <div className="space-y-2">
                      {prochainesEcheances.map((e, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{e.leadNom}</p>
                              <p className="text-zinc-500 text-xs">{e.closerNom} · {e.offre}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[#c9a84c] font-semibold text-sm">{fmt(e.montant)}</p>
                            <p className="text-zinc-500 text-xs">{new Date(e.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- section --- */}
            {/* --- section --- */}
            {/* --- section --- */}
            {activeTab === "graphique" && (
              <div className="space-y-6">
                {/* --- section --- */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Chiffre d'affaires</h2>
                  <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                    {(["jour", "semaine", "mois", "annee"] as PeriodeGraph[]).map(p => (
                      <button key={p} onClick={() => setPeriodeGraph(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          periodeGraph === p
                            ? "bg-[#c9a84c] text-black"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}>
                        {p === "jour" ? "Jour" : p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : "Année"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* --- section --- */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-semibold text-white">CA Généré vs Encaissé</h3>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        {periodeGraph === "jour" ? "Par heure aujourd'hui" : periodeGraph === "semaine" ? "Par jour cette semaine" : periodeGraph === "mois" ? "Par semaine ce mois" : "Par mois cette année"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#c9a84c]" />Généré</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/70" />Encaissé</span>
                    </div>
                  </div>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={graphData || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="caGenere" name="CA Généré (€)" fill="#c9a84c" radius={[4,4,0,0]} maxBarSize={52} />
                        <Bar dataKey="caEncaisse" name="CA Encaissé (€)" fill="rgba(52,211,153,0.7)" radius={[4,4,0,0]} maxBarSize={52} />
                        <Line type="monotone" dataKey="nbCloses" name="Closes" stroke="#818cf8" strokeWidth={2} dot={{ fill: "#818cf8", r: 3 }} yAxisId={0} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* --- section --- */}
                {graphData && graphData.length > 0 && (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-zinc-800">
                      <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Détail par période</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/50">
                            {["Période", "CA Généré", "CA Encaissé", "Reste", "Closes"].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {graphData.filter(d => d.caGenere > 0 || d.nbCloses > 0).map((d, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                              <td className="px-4 py-3 text-zinc-400 font-medium">{d.label}</td>
                              <td className="px-4 py-3 text-[#c9a84c] font-semibold">{fmt(d.caGenere)}</td>
                              <td className="px-4 py-3 text-emerald-400">{fmt(d.caEncaisse)}</td>
                              <td className="px-4 py-3 text-blue-400">{fmt(d.caGenere - d.caEncaisse)}</td>
                              <td className="px-4 py-3 text-white">{d.nbCloses}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- section --- */}
            {activeTab === "previsionnel" && (
              <div className="space-y-6">
                {/* --- section --- */}
                <div className="grid grid-cols-3 gap-3">
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
                      <div key={item.key} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <item.icon className="w-4 h-4 text-[#c9a84c]" />
                          <span className="text-zinc-500 text-xs uppercase tracking-wider">{item.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-[#c9a84c]">{fmt(getAttend(item.key))}</p>
                        <p className="text-zinc-600 text-xs mt-1">Encaissements attendus</p>
                      </div>
                    ));
                  })()}
                </div>

                {/* --- section --- */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Timeline des encaissements (6 mois glissants)</h3>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#c9a84c]" />Encaissé</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500/60" />Attendu</span>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={prevData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                        <XAxis dataKey="mois" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Encaissé (€)" fill="#c9a84c" radius={[4, 4, 0, 0]} maxBarSize={48} />
                        <Bar dataKey="Attendu (€)" fill="rgba(59,130,246,0.5)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-zinc-700 text-xs mt-3 text-center">Basé sur les modes de paiement et dates de prélèvement saisis</p>
                </div>

                {/* --- section --- */}
                <div className="bg-gradient-to-r from-[#c9a84c]/10 to-transparent border border-[#c9a84c]/20 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#c9a84c] text-xs uppercase tracking-widest mb-1">Reste à encaisser total</p>
                      <p className="text-3xl font-bold text-white">{fmt(g?.resteAEncaisser || 0)}</p>
                      <p className="text-zinc-500 text-sm mt-1">HT : {fmt(g?.resteHt || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-500 text-xs mb-1">CA généré</p>
                      <p className="text-lg font-semibold text-zinc-300">{fmt(g?.caGenere || 0)}</p>
                      <div className="mt-2 h-2 bg-zinc-800 rounded-full w-40 overflow-hidden">
                        <div
                          className="h-full bg-[#c9a84c] rounded-full"
                          style={{ width: `${g?.caGenere ? Math.min(100, (g.caEncaisse / g.caGenere) * 100) : 0}%` }}
                        />
                      </div>
                      <p className="text-zinc-600 text-xs mt-1">
                        {g?.caGenere ? Math.round((g.caEncaisse / g.caGenere) * 100) : 0}% encaissé
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- section --- */}
            {/* --- section --- */}
            {/* --- section --- */}
            {activeTab === "closers" && (
              <div className="space-y-5">
                {/* --- section --- */}
                {parCloser.length > 0 && (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-medium">CA par closer (€ TTC)</h3>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={closerChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 12 }} />
                          <Bar dataKey="Généré" fill="#c9a84c" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Encaissé" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="Reste" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* --- section --- */}
                {parCloser.length > 0 ? (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900">
                            {["Closer", "Calls", "Shows", "No Shows", "Closes", "Tx Closing", "Tx No-Show", "CA généré", "Encaissé", "Reste à enc.", "CA moyen"].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parCloser.map((c, i) => {
                            const closingAlert = c.tauxClosing < moyGlobal * 0.8 && c.calls >= 3;
                            const noShowAlert = c.tauxNoShow > 35;
                            return (
                              <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#c9a84c]/15 flex items-center justify-center text-[#c9a84c] text-xs font-bold">
                                      {c.nom.charAt(0)}
                                    </div>
                                    <span className="font-medium text-white">{c.nom}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-300 font-medium">{c.calls}</td>
                                <td className="px-4 py-3.5 text-blue-400">{c.shows}</td>
                                <td className={`px-4 py-3.5 ${noShowAlert ? "text-red-400 font-semibold" : "text-zinc-500"}`}>{c.noShows}</td>
                                <td className="px-4 py-3.5 text-emerald-400 font-bold">{c.closes}</td>
                                <td className={`px-4 py-3.5 font-semibold ${closingAlert ? "text-red-400" : "text-white"}`}>
                                  {pct(c.tauxClosing)}
                                  {closingAlert && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-400" />}
                                </td>
                                <td className={`px-4 py-3.5 ${noShowAlert ? "text-red-400 font-semibold" : "text-zinc-400"}`}>
                                  {pct(c.tauxNoShow)}
                                  {noShowAlert && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-400" />}
                                </td>
                                <td className="px-4 py-3.5 text-[#c9a84c] font-semibold">{fmt(c.caGenere)}</td>
                                <td className="px-4 py-3.5 text-emerald-400">{fmt(c.caEncaisse)}</td>
                                <td className="px-4 py-3.5">
                                  {c.resteAEncaisser > 0 ? (
                                    <span className="text-blue-400 font-semibold">{fmt(c.resteAEncaisser)}</span>
                                  ) : <span className="text-zinc-600">—</span>}
                                </td>
                                <td className="px-4 py-3.5 text-zinc-300">{fmt(c.caMoyen)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-zinc-600">
                    <PhoneCall className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Aucune donnée sur cette période.</p>
                  </div>
                )}
              </div>
            )}

            {/* --- section --- */}
            {/* --- section --- */}
            {/* --- section --- */}
            {activeTab === "closes" && (
              <div className="space-y-4">
                {/* --- section --- */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                    {(["jour", "semaine", "mois", "annee", "tout"] as const).map(p => (
                      <button key={p} onClick={() => setFiltreHistorique(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          filtreHistorique === p
                            ? "bg-[#c9a84c] text-black"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}>
                        {p === "jour" ? "Aujourd'hui" : p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : p === "annee" ? "Année" : "Tout"}
                      </button>
                    ))}
                  </div>
                  {listeClosers && listeClosers.length > 1 && (
                    <Select value={filtreCloser} onValueChange={setFiltreCloser}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white w-40 h-8 text-xs">
                        <SelectValue placeholder="Tous les closers" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="tous" className="text-white text-xs">Tous les closers</SelectItem>
                        {listeClosers.map(c => (
                          <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <button onClick={handleExportCsv} disabled={exportLoading}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-[#c9a84c]/50 hover:text-[#c9a84c] text-zinc-400 text-xs font-medium rounded-lg transition-all disabled:opacity-50">
                    <Download className="w-3.5 h-3.5" />
                    {exportLoading ? "Export..." : "Export CSV"}
                  </button>
                </div>

                {closes && closes.length > 0 ? (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Calls filtrés</h3>
                        <span className="text-[10px] text-[#c9a84c]/70 bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-2 py-0.5 rounded-full">↪ CA compté uniquement sur les calls "Closé"</span>
                      </div>
                      <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{closes.length} entrées</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/50">
                            {["Date", "Closer", "Lead", "Offre", "Résultat", "Paiement", "Généré", "Encaissé", "Reste", "Fathom", ""].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {closes.map((c) => {
                            const reste = c.montantGenere - c.montantEncaisse;
                            return (
                              <tr key={c.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer" onClick={() => setSelectedClose(c)}>
                                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                                  {new Date(c.dateCall).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td className="px-4 py-3 text-white font-medium">{c.closerNom}</td>
                                <td className="px-4 py-3">
                                  <div className="text-white text-xs font-medium">{c.leadNom}</div>
                                  {c.leadEmail && <div className="text-zinc-600 text-xs">{c.leadEmail}</div>}
                                  {c.leadTelephone && <div className="text-zinc-600 text-xs">{c.leadTelephone}</div>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded font-mono">{c.offre}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    {!c.show ? (
                                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-medium">No Show</span>
                                    ) : c.resultat === "close" ? (
                                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 font-semibold">✓ Closé{c.formule ? ` · ${c.formule}` : ""}</span>
                                    ) : c.resultat === "r2" ? (
                                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800/50 font-medium">R2</span>
                                    ) : c.resultat === "perdu" ? (
                                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/40 font-medium">Perdu</span>
                                    ) : c.resultat === "non_close" ? (
                                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">Non closé</span>
                                    ) : (
                                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">Show</span>
                                    )}
                                    {/* Badge parcours multi-calls */}
                                    {c.leadId != null && (
                                      <span className="text-[10px] text-[#c9a84c] font-medium" title="Parcours multi-calls (même lead)">↪ Parcours lié</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-xs">
                                  {c.modePaiement === "une_fois" ? "1×" : c.modePaiement === "deux_fois" ? "2×" : c.modePaiement === "trois_fois" ? "3×" : "—"}
                                </td>
                                <td className="px-4 py-3 text-[#c9a84c] font-semibold text-xs">{c.montantGenere > 0 ? fmt(c.montantGenere) : "—"}</td>
                                <td className="px-4 py-3 text-emerald-400 text-xs">{c.montantEncaisse > 0 ? fmt(c.montantEncaisse) : "—"}</td>
                                <td className="px-4 py-3 text-xs">
                                  {reste > 0 ? <span className="text-blue-400 font-medium">{fmt(reste)}</span> : <span className="text-zinc-700">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  {c.lienFathom ? (
                                    <a href={c.lienFathom} target="_blank" rel="noopener noreferrer"
                                      className="text-zinc-500 hover:text-blue-400 transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  ) : <span className="text-zinc-800">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  {deleteId === c.id ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => supprimerMut.mutate({ id: c.id })}
                                        className="text-red-400 text-xs hover:text-red-300 font-medium">Confirmer</button>
                                      <button onClick={() => setDeleteId(null)} className="text-zinc-600 text-xs hover:text-zinc-400">Annuler</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeleteId(c.id)}
                                      className="text-zinc-700 hover:text-red-400 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
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
                  <div className="text-center py-20 text-zinc-600">
                    <PhoneCall className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucun call enregistré.</p>
                    <Link href="/sales/close">
                      <Button className="mt-4 bg-[#c9a84c] hover:bg-[#b8963e] text-black text-sm font-semibold">
                        Saisir le premier call
                      </Button>
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

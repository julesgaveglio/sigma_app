import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Bug, Lightbulb, HelpCircle, FileText, CheckCircle, Clock, XCircle, AlertTriangle, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "#EF4444" },
  amelioration: { label: "Amélioration", icon: Lightbulb, color: "#F59E0B" },
  question: { label: "Question", icon: HelpCircle, color: "#3B82F6" },
  autre: { label: "Autre", icon: FileText, color: "#6B7280" },
};

const STATUT_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  nouveau: { label: "Nouveau", icon: AlertTriangle, color: "#F59E0B", bg: "#1A1500" },
  en_cours: { label: "En cours", icon: Clock, color: "#3B82F6", bg: "#001020" },
  resolu: { label: "Résolu", icon: CheckCircle, color: "#10B981", bg: "#001510" },
  ignore: { label: "Ignoré", icon: XCircle, color: "#6B7280", bg: "#111111" },
};

const PRIORITE_CONFIG: Record<string, { label: string; color: string }> = {
  faible: { label: "Faible", color: "#6B7280" },
  normale: { label: "Normale", color: "#9CA3AF" },
  haute: { label: "Haute", color: "#F59E0B" },
  critique: { label: "Critique", color: "#EF4444" },
};

export default function FeedbacksDashboard() {
  const [, setLocation] = useLocation();
  const [filtreStatut, setFiltreStatut] = useState<"tous" | "nouveau" | "en_cours" | "resolu" | "ignore">("tous");
  const [filtreType, setFiltreType] = useState<"tous" | "bug" | "amelioration" | "question" | "autre">("tous");

  const { data: stats } = trpc.feedbacks.stats.useQuery();
  const { data: liste, refetch } = trpc.feedbacks.liste.useQuery({ statut: filtreStatut, type: filtreType });

  const utils = trpc.useUtils();

  const updateStatut = trpc.feedbacks.updateStatut.useMutation({
    onSuccess: () => { utils.feedbacks.liste.invalidate(); utils.feedbacks.stats.invalidate(); },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  const supprimer = trpc.feedbacks.supprimer.useMutation({
    onSuccess: () => {
      toast.success("Signalement supprimé");
      utils.feedbacks.liste.invalidate();
      utils.feedbacks.stats.invalidate();
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Bouton retour */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#C9A84C] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Retour au dashboard</span>
        </button>
        <h1 className="text-lg font-semibold text-white ml-2">Signalements & Feedbacks</h1>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats?.total ?? 0, color: "#C9A84C" },
          { label: "Nouveaux", value: stats?.nouveau ?? 0, color: "#F59E0B" },
          { label: "En cours", value: stats?.en_cours ?? 0, color: "#3B82F6" },
          { label: "Critiques", value: stats?.critique ?? 0, color: "#EF4444" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1E1E1E" }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {(["tous", "nouveau", "en_cours", "resolu", "ignore"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFiltreStatut(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filtreStatut === s ? "#1A1A1A" : "transparent",
                border: `1px solid ${filtreStatut === s ? "#C9A84C" : "#2A2A2A"}`,
                color: filtreStatut === s ? "#C9A84C" : "#666",
              }}
            >
              {s === "tous" ? "Tous" : STATUT_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {(["tous", "bug", "amelioration", "question", "autre"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltreType(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filtreType === t ? "#1A1A1A" : "transparent",
                border: `1px solid ${filtreType === t ? "#C9A84C" : "#2A2A2A"}`,
                color: filtreType === t ? "#C9A84C" : "#666",
              }}
            >
              {t === "tous" ? "Tous types" : TYPE_CONFIG[t]?.label ?? t}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors" style={{ border: "1px solid #2A2A2A" }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Liste */}
      {!liste || liste.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <MessageSquarePlus size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun signalement pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liste.map(fb => {
            const typeConf = TYPE_CONFIG[fb.type] ?? TYPE_CONFIG.autre;
            const statutConf = STATUT_CONFIG[fb.statut] ?? STATUT_CONFIG.nouveau;
            const prioriteConf = PRIORITE_CONFIG[fb.priorite] ?? PRIORITE_CONFIG.normale;
            const TypeIcon = typeConf.icon;
            const StatutIcon = statutConf.icon;

            return (
              <div key={fb.id} className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #1E1E1E" }}>
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div className="mt-0.5 p-2 rounded-lg" style={{ background: "#1A1A1A" }}>
                    <TypeIcon size={16} style={{ color: typeConf.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-white text-sm">{fb.titre}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: prioriteConf.color + "20", color: prioriteConf.color }}>
                        {prioriteConf.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: statutConf.bg, color: statutConf.color, border: `1px solid ${statutConf.color}30` }}>
                        <StatutIcon size={10} className="inline mr-1" />
                        {statutConf.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2 leading-relaxed">{fb.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                      {fb.page && <span>📍 {fb.page}</span>}
                      {fb.auteur && <span>👤 {fb.auteur}{fb.email ? ` (${fb.email})` : ""}</span>}
                      <span>🕐 {formatDate(fb.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <select
                      value={fb.statut}
                      onChange={e => updateStatut.mutate({ id: fb.id, statut: e.target.value as any })}
                      className="text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                      style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#C9A84C" }}
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="resolu">Résolu</option>
                      <option value="ignore">Ignorer</option>
                    </select>
                    <button
                      onClick={() => { if (confirm("Supprimer ce signalement ?")) supprimer.mutate({ id: fb.id }); }}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors self-end"
                      style={{ border: "1px solid #2A2A2A" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Import manquant
function MessageSquarePlus({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="12" y1="8" x2="12" y2="14" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  );
}

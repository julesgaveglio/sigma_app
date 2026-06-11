import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Bug, Lightbulb, HelpCircle, FileText, CheckCircle, Clock, XCircle, AlertTriangle, Trash2, RefreshCw, ArrowLeft, Loader2, MapPin, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "#A04040" },
  amelioration: { label: "Amelioration", icon: Lightbulb, color: "#C9A84C" },
  question: { label: "Question", icon: HelpCircle, color: "#6B6560" },
  autre: { label: "Autre", icon: FileText, color: "#3A3632" },
};

const STATUT_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  nouveau: { label: "Nouveau", icon: AlertTriangle, color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  en_cours: { label: "En cours", icon: Clock, color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  resolu: { label: "Resolu", icon: CheckCircle, color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  ignore: { label: "Ignore", icon: XCircle, color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" },
};

const PRIORITE_CONFIG: Record<string, { label: string; color: string }> = {
  faible: { label: "Faible", color: "#3A3632" },
  normale: { label: "Normale", color: "#6B6560" },
  haute: { label: "Haute", color: "#C9A84C" },
  critique: { label: "Critique", color: "#A04040" },
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
      toast.success("Signalement supprime");
      utils.feedbacks.liste.invalidate();
      utils.feedbacks.stats.invalidate();
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Bouton retour + titre */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 transition-opacity duration-300 hover:opacity-70"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              color: "#3A3632",
              letterSpacing: "0.04em",
            }}
          >
            <ArrowLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "24px",
              fontWeight: 600,
              color: "#F0EDE6",
              letterSpacing: "0.04em",
            }}>
              Signalements & Feedbacks
            </h1>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-10" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
          {[
            { label: "Total", value: stats?.total ?? 0, gold: true },
            { label: "Nouveaux", value: stats?.nouveau ?? 0, gold: false },
            { label: "En cours", value: stats?.en_cours ?? 0, gold: false },
            { label: "Critiques", value: stats?.critique ?? 0, gold: false },
          ].map((kpi) => (
            <div key={kpi.label} className="p-5" style={{ background: "#0A0A0A" }}>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px",
                fontWeight: 600,
                color: kpi.gold ? "#C9A84C" : "#F0EDE6",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}>
                {kpi.value}
              </p>
              <p className="label-uppercase mt-2">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <div className="flex gap-2">
            {(["tous", "nouveau", "en_cours", "resolu", "ignore"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFiltreStatut(s)}
                className="transition-colors duration-300"
                style={{
                  padding: "6px 12px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  background: filtreStatut === s ? "rgba(201,168,76,0.06)" : "transparent",
                  border: `1px solid ${filtreStatut === s ? "rgba(201,168,76,0.3)" : "#1E1E1E"}`,
                  color: filtreStatut === s ? "#C9A84C" : "#3A3632",
                  cursor: "pointer",
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
                className="transition-colors duration-300"
                style={{
                  padding: "6px 12px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  background: filtreType === t ? "rgba(201,168,76,0.06)" : "transparent",
                  border: `1px solid ${filtreType === t ? "rgba(201,168,76,0.3)" : "#1E1E1E"}`,
                  color: filtreType === t ? "#C9A84C" : "#3A3632",
                  cursor: "pointer",
                }}
              >
                {t === "tous" ? "Tous types" : TYPE_CONFIG[t]?.label ?? t}
              </button>
            ))}
            <button
              onClick={() => refetch()}
              className="transition-colors duration-300"
              style={{
                padding: "6px",
                borderRadius: "2px",
                border: "1px solid #1E1E1E",
                background: "transparent",
                color: "#3A3632",
                cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#6B6560"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#3A3632"; }}
            >
              <RefreshCw className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            </button>
          </div>
        </div>

        {/* Liste */}
        {!liste || liste.length === 0 ? (
          <div className="text-center py-24">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucun signalement pour le moment</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "2px" }}>
            {liste.map(fb => {
              const typeConf = TYPE_CONFIG[fb.type] ?? TYPE_CONFIG.autre;
              const statutConf = STATUT_CONFIG[fb.statut] ?? STATUT_CONFIG.nouveau;
              const prioriteConf = PRIORITE_CONFIG[fb.priorite] ?? PRIORITE_CONFIG.normale;
              const TypeIcon = typeConf.icon;

              return (
                <div key={fb.id} style={{
                  background: "#111111",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "16px 20px",
                }}>
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className="mt-0.5 shrink-0">
                      <TypeIcon className="w-4 h-4" style={{ color: typeConf.color, strokeWidth: 1.5 }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span style={{
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#F0EDE6",
                        }}>{fb.titre}</span>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 6px",
                          borderRadius: "2px",
                          fontSize: "10px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          color: prioriteConf.color,
                          background: `${prioriteConf.color}14`,
                          border: `1px solid ${prioriteConf.color}30`,
                        }}>
                          {prioriteConf.label}
                        </span>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 6px",
                          borderRadius: "2px",
                          fontSize: "10px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          color: statutConf.color,
                          background: statutConf.bg,
                          border: `1px solid ${statutConf.border}`,
                        }}>
                          {statutConf.label}
                        </span>
                      </div>
                      <p style={{
                        fontSize: "13px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        color: "#6B6560",
                        marginBottom: "8px",
                        lineHeight: "1.6",
                      }}>{fb.description}</p>
                      <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                        {fb.page && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                            {fb.page}
                          </span>
                        )}
                        {fb.auteur && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                            {fb.auteur}{fb.email ? ` (${fb.email})` : ""}
                          </span>
                        )}
                        <span className="tabular-nums flex items-center gap-1">
                          <Clock className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                          {formatDate(fb.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <select
                        value={fb.statut}
                        onChange={e => updateStatut.mutate({ id: fb.id, statut: e.target.value as any })}
                        style={{
                          fontSize: "11px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          padding: "4px 8px",
                          borderRadius: "2px",
                          background: "#161616",
                          border: "1px solid #1E1E1E",
                          color: "#C9A84C",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="nouveau">Nouveau</option>
                        <option value="en_cours">En cours</option>
                        <option value="resolu">Resolu</option>
                        <option value="ignore">Ignorer</option>
                      </select>
                      <button
                        onClick={() => { if (confirm("Supprimer ce signalement ?")) supprimer.mutate({ id: fb.id }); }}
                        className="self-end transition-colors duration-300"
                        style={{
                          padding: "4px",
                          borderRadius: "2px",
                          border: "1px solid #1E1E1E",
                          background: "transparent",
                          color: "#3A3632",
                          cursor: "pointer",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

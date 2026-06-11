import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, FileText, Phone, Mail, MapPin, Calendar, User, Loader2, RefreshCw, Star, CheckCircle2, Layers } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

const STATUT_LABELS: Record<string, { label: string; style: { color: string; bg: string; border: string } }> = {
  nouveau: { label: "Nouveau", style: { color: "var(--gold)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" } },
  en_cours: { label: "En cours", style: { color: "var(--foreground)", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" } },
  traite: { label: "Traite", style: { color: "var(--success)", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" } },
  archive: { label: "Archive", style: { color: "var(--foreground-faint)", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" } },
};

const SITUATION_LABELS: Record<string, string> = {
  celibataire: "Celibataire", marie: "Marie(e)", divorce: "Divorce(e)",
  instance_divorce: "Instance de divorce", pacs: "PACS", veuf: "Veuf/Veuve",
};

const NATIONALITE_LABELS: Record<string, string> = {
  francais: "Francais(e)", francais_etranger: "Francais(e) a l'etranger", etranger: "Etranger(ere)",
};

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUT_LABELS[statut] ?? { label: statut, style: { color: "var(--foreground-faint)", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" } };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: s.style.color,
      background: s.style.bg,
      border: `1px solid ${s.style.border}`,
    }}>
      {s.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
      <div>
        <p className="label-uppercase" style={{ marginBottom: "2px" }}>{label}</p>
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{value}</p>
      </div>
    </div>
  );
}

const TYPE_BIEN_LABELS: Record<string, string> = {
  appartement: "Appartement", maison: "Maison", villa: "Villa",
  terrain: "Terrain", local_commercial: "Local commercial", autre: "Autre",
};

function DetailPanel({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.leads.byId.useQuery({ id: leadId });
  const { data: mandats } = trpc.mandats.byLeadId.useQuery({ leadId }, { enabled: !!leadId });
  const updateStatut = trpc.leads.updateStatut.useMutation({ onSuccess: () => toast.success("Statut mis a jour") });
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState("");

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
    </div>
  );

  if (!data) return null;
  const { lead, documents } = data;

  const handleStatutChange = async (statut: string) => {
    await updateStatut.mutateAsync({ id: lead.id, statut, notes: notes || undefined });
    utils.leads.list.invalidate();
    utils.leads.byId.invalidate({ id: lead.id });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full h-full overflow-y-auto" style={{ maxWidth: "520px", background: "var(--surface)", borderLeft: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em" }}>
              {lead.nom} {lead.prenoms}
            </h2>
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>
              Fiche #{lead.id} — {new Date(lead.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 transition-opacity duration-300 hover:opacity-70" style={{ color: "var(--foreground-muted)" }}>
            <X className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Statut */}
          <div>
            <p className="label-uppercase mb-3">Statut du dossier</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(STATUT_LABELS).map(([key, val]) => (
                <button key={key} onClick={() => handleStatutChange(key)}
                  className="transition-colors duration-300"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                    border: `1px solid ${lead.statut === key ? val.style.border : "var(--border)"}`,
                    background: lead.statut === key ? val.style.bg : "transparent",
                    color: lead.statut === key ? val.style.color : "var(--foreground-faint)",
                  }}>
                  {val.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Notes internes (optionnel)..."
              defaultValue={lead.notes ?? ""}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "10px 12px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "var(--foreground)",
                resize: "none",
                outline: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Identite */}
          <div>
            <p className="label-uppercase mb-3">Identite</p>
            <div className="space-y-3">
              <InfoRow icon={User} label="Nom complet" value={`${lead.nom}${lead.nomJeuneFille ? ` (${lead.nomJeuneFille})` : ""} ${lead.prenoms}`} />
              <InfoRow icon={Calendar} label="Date de naissance" value={lead.dateNaissance ?? undefined} />
              <InfoRow icon={MapPin} label="Lieu de naissance" value={lead.lieuNaissance ?? undefined} />
              <InfoRow icon={FileText} label="Profession" value={lead.profession ?? undefined} />
              <InfoRow icon={MapPin} label="Adresse" value={lead.adresse ?? undefined} />
              <InfoRow icon={Phone} label="Portable" value={lead.telephonePortable ?? undefined} />
              <InfoRow icon={Phone} label="Domicile" value={lead.telephoneDomicile ?? undefined} />
              <InfoRow icon={Mail} label="Email" value={lead.email ?? undefined} />
            </div>
          </div>

          {/* Conjoint */}
          {lead.conjointNom && (
            <div>
              <p className="label-uppercase mb-3">Conjoint(e)</p>
              <div className="space-y-3">
                <InfoRow icon={User} label="Nom complet" value={`${lead.conjointNom} ${lead.conjointPrenoms ?? ""}`} />
                <InfoRow icon={Calendar} label="Date de naissance" value={lead.conjointDateNaissance ?? undefined} />
                <InfoRow icon={Phone} label="Portable" value={lead.conjointTelephonePortable ?? undefined} />
                <InfoRow icon={Mail} label="Email" value={lead.conjointEmail ?? undefined} />
              </div>
            </div>
          )}

          {/* Situation */}
          <div>
            <p className="label-uppercase mb-3">Situation familiale</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Situation :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{SITUATION_LABELS[lead.situationFamiliale ?? ""] ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Nationalite :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{NATIONALITE_LABELS[lead.nationalite ?? ""] ?? "—"}</span>
              </div>
              {lead.communeMariage && <div className="flex items-center gap-2"><span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Mariage :</span><span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.communeMariage} {lead.dateMariage ? `— ${lead.dateMariage}` : ""}</span></div>}
              {lead.contratMariage && <div className="flex items-center gap-2"><span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Contrat :</span><span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.regimeMatrimonial ?? "Oui"}</span></div>}
            </div>
          </div>

          {/* Mandats */}
          {mandats && mandats.length > 0 && (
            <div>
              <p className="label-uppercase mb-3">Mandats de Recherche ({mandats.length})</p>
              <div className="space-y-2">
                {mandats.map((m: any) => (
                  <a key={m.id} href="/dashboard/mandats"
                    className="flex items-center gap-3 p-3 transition-colors duration-300"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "2px", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{TYPE_BIEN_LABELS[m.typeBien] ?? m.typeBien} — {m.localisation}</p>
                      <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{m.budgetMax?.toLocaleString("fr-FR")} EUR · {new Date(m.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {mandats && mandats.length === 0 && (
            <div className="flex items-center justify-between p-3" style={{ background: "var(--surface-header)", border: "1px dashed var(--border)", borderRadius: "2px" }}>
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucun mandat de recherche associe</p>
              <a href={`/mandat?leadId=${leadId}`} style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--gold)", textDecoration: "none", letterSpacing: "0.04em" }}>
                + Creer un mandat
              </a>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <p className="label-uppercase mb-3">Documents ({documents.length})</p>
              <div className="space-y-2">
                {documents.map(doc => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 transition-colors duration-300"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "2px", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{doc.filename}</p>
                      <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{doc.type.replace("_", " ")} — {doc.size ? `${Math.round(doc.size / 1024)} Ko` : "—"}</p>
                    </div>
                    <Eye className="w-4 h-4 shrink-0" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const LIMIT = 15;

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => refetch(),
  });
  const handleDelete = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le dossier de ${nom} ? Cette action est irreversible.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const { data, isLoading, refetch } = trpc.leads.list.useQuery(
    { search: search || undefined, statut: statut !== "tous" ? statut : undefined, limit: LIMIT, offset: page * LIMIT },
    { enabled: isAuthenticated && (user?.role === "admin" || user?.role === "direction") }
  );

  const exportQuery = trpc.leads.exportCsv.useQuery(undefined, { enabled: false });

  const { data: avisStats } = trpc.marie.statsAvis.useQuery(
    undefined,
    { enabled: isAuthenticated && (user?.role === "admin" || user?.role === "direction") }
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "var(--background)" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.04em" }}>Acces reserve</h2>
      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Connectez-vous pour acceder au tableau de bord.</p>
      <a href="/login" style={{
        padding: "12px 28px",
        background: "var(--gold)",
        color: "var(--background)",
        fontSize: "11px",
        fontWeight: 500,
        fontFamily: "'Hanken Grotesk', sans-serif",
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
        textDecoration: "none",
        borderRadius: "2px",
      }}>Se connecter</a>
    </div>
  );

  if (user?.role !== "admin" && user?.role !== "direction") return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--background)" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.04em" }}>Acces refuse</h2>
      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Vous n'avez pas les droits pour acceder a cette page.</p>
    </div>
  );

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const leads = result.data;
    if (!leads.length) { toast.info("Aucune donnee a exporter."); return; }

    const headers = ["ID", "Nom", "Prenoms", "Email", "Portable", "Profession", "Date naissance", "Situation", "Nationalite", "Statut", "Date soumission"];
    const rows = leads.map(l => [
      l.id, l.nom, l.prenoms, l.email ?? "", l.telephonePortable ?? "",
      l.profession ?? "", l.dateNaissance ?? "", l.situationFamiliale ?? "",
      l.nationalite ?? "", l.statut, new Date(l.createdAt).toLocaleDateString("fr-FR"),
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sigma-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Export CSV telecharge !");
  };

  const totalPages = Math.ceil((data?.total ?? 0) / LIMIT);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <AdminNav />

      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-end gap-2 px-5 py-2.5" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <button onClick={() => refetch()} className="p-2 transition-colors duration-300"
            style={{ color: "var(--foreground-faint)", border: "1px solid var(--border)", borderRadius: "2px", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-faint)"; }}
          >
            <RefreshCw className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 transition-colors duration-300"
            style={{
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--gold)",
              border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: "2px",
              background: "transparent",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Download className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Export CSV
          </button>
        </div>
      </div>

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-10" style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "2px" }}>
          {[
            { label: "Total leads", value: data?.total ?? 0 },
            { label: "Nouveaux", value: data?.items.filter(l => l.statut === "nouveau").length ?? 0 },
            { label: "En cours", value: data?.items.filter(l => l.statut === "en_cours").length ?? 0 },
            { label: "Traites", value: data?.items.filter(l => l.statut === "traite").length ?? 0 },
          ].map((stat, i) => (
            <div key={stat.label} className="p-5" style={{ background: "var(--background)" }}>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px",
                fontWeight: 600,
                color: i === 0 ? "var(--gold)" : "var(--foreground)",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}>
                {stat.value}
              </p>
              <p className="label-uppercase mt-2">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Avis Marie */}
        {avisStats && (
          <div className="mb-10 p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
                <span className="label-uppercase" style={{ color: "var(--foreground)" }}>Avis & Temoignages</span>
              </div>
              <a href="/dashboard/avis-pipe" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", textDecoration: "none", letterSpacing: "0.04em" }}
                className="transition-opacity duration-300 hover:opacity-70"
              >
                Voir le pipe →
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--border)", borderRadius: "2px" }}>
              {[
                { label: "A contacter", value: avisStats.aFaire },
                { label: "Avis effectue", value: avisStats.effectue },
                { label: "En montage / OK", value: avisStats.enMontage + avisStats.montageOk },
                { label: "Taux finalisation", value: `${avisStats.tauxConversion}%` },
              ].map(s => (
                <div key={s.label} className="p-4" style={{ background: "var(--surface)" }}>
                  <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>{s.value}</p>
                  <p className="label-uppercase mt-1.5" style={{ fontSize: "10px" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
                Sources : {avisStats.courtage} Courtage · {avisStats.immo} Immo · Ce mois : {avisStats.montageOkCeMois} finalises
              </span>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
            <input
              type="text" placeholder="Rechercher par nom, email, telephone..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full transition-colors duration-300 focus:outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                paddingLeft: "36px",
                paddingRight: "14px",
                paddingTop: "10px",
                paddingBottom: "10px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "var(--foreground)",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <select
            value={statut} onChange={e => { setStatut(e.target.value); setPage(0); }}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              padding: "10px 14px",
              fontSize: "13px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: "var(--foreground)",
              outline: "none",
            }}
          >
            <option value="tous">Tous les statuts</option>
            {Object.entries(STATUT_LABELS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
            </div>
          ) : !data?.items.length ? (
            <div className="text-center py-20">
              <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)", strokeWidth: 1.5 }} />
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucune fiche trouvee</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Nom / Prenom", "Contact", "Situation", "Statut", "Date", ""].map(h => (
                        <th key={h} className="text-left px-5 py-3 label-uppercase" style={{ background: "var(--surface-header)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((lead) => (
                      <tr key={lead.id}
                        className="cursor-pointer transition-colors duration-300"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                        onClick={() => setSelectedId(lead.id)}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-5 py-3">
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{lead.nom} {lead.prenoms}</p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{lead.profession ?? "—"}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.telephonePortable ?? "—"}</p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.email ?? "—"}</p>
                        </td>
                        <td className="px-5 py-3" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{SITUATION_LABELS[lead.situationFamiliale ?? ""] ?? "—"}</td>
                        <td className="px-5 py-3"><StatutBadge statut={lead.statut} /></td>
                        <td className="px-5 py-3 tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedId(lead.id); }} className="p-1.5 transition-opacity duration-300 hover:opacity-70" style={{ color: "var(--foreground-faint)" }}>
                              <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                            </button>
                            <button onClick={(e) => handleDelete(e, lead.id, `${lead.nom} ${lead.prenoms}`)} className="p-1.5 transition-colors duration-300" style={{ color: "var(--foreground-faint)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "var(--destructive)")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--foreground-faint)")}
                              title="Supprimer"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                {data.items.map(lead => (
                  <div key={lead.id}
                    className="p-4 cursor-pointer transition-colors duration-300"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onClick={() => setSelectedId(lead.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{lead.nom} {lead.prenoms}</p>
                        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>{lead.telephonePortable ?? lead.email ?? "—"}</p>
                      </div>
                      <StatutBadge statut={lead.statut} />
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{SITUATION_LABELS[lead.situationFamiliale ?? ""] ?? "—"}</span>
                      <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
              {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, data?.total ?? 0)} sur {data?.total ?? 0}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ color: "var(--foreground-muted)", border: "1px solid var(--border)", borderRadius: "2px" }}
              >
                <ChevronLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </button>
              <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", padding: "0 8px" }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ color: "var(--foreground-muted)", border: "1px solid var(--border)", borderRadius: "2px" }}
              >
                <ChevronRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && <DetailPanel leadId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

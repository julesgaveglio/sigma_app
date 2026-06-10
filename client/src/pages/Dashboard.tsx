import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, FileText, Phone, Mail, MapPin, Calendar, User, Loader2, RefreshCw, Star, CheckCircle2, Layers } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

const SIGMA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/sigma-logo_004dfdd3.png";

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--gold)]/30" },
  en_cours: { label: "En cours", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  traite: { label: "Traité", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  archive: { label: "Archivé", color: "text-muted-foreground bg-muted/50 border-border" },
};

const SITUATION_LABELS: Record<string, string> = {
  celibataire: "Célibataire", marie: "Marié(e)", divorce: "Divorcé(e)",
  instance_divorce: "Instance de divorce", pacs: "PACS", veuf: "Veuf/Veuve",
};

const NATIONALITE_LABELS: Record<string, string> = {
  francais: "Français(e)", francais_etranger: "Français(e) à l'étranger", etranger: "Étranger(ère)",
};

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUT_LABELS[statut] ?? { label: statut, color: "text-muted-foreground bg-muted/50 border-border" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>{s.label}</span>;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-[var(--gold)] mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
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
  const updateStatut = trpc.leads.updateStatut.useMutation({ onSuccess: () => toast.success("Statut mis à jour") });
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState("");

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
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
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-card border-l border-border overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-foreground text-lg">{lead.nom} {lead.prenoms}</h2>
            <p className="text-xs text-muted-foreground">Fiche #{lead.id} — {new Date(lead.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Statut */}
          <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-3">Statut du dossier</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(STATUT_LABELS).map(([key, val]) => (
                <button key={key} onClick={() => handleStatutChange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${lead.statut === key ? val.color + " opacity-100" : "border-border text-muted-foreground hover:border-[var(--gold)]/40"}`}>
                  {val.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Notes internes (optionnel)..."
              defaultValue={lead.notes ?? ""}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[oklch(0.16_0.005_280)] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--gold)] resize-none"
            />
          </div>

          {/* Identité */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-3">Identité</p>
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
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-3">Conjoint(e)</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-3">Situation familiale</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Situation :</span>
                <span className="text-sm text-foreground">{SITUATION_LABELS[lead.situationFamiliale ?? ""] ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Nationalité :</span>
                <span className="text-sm text-foreground">{NATIONALITE_LABELS[lead.nationalite ?? ""] ?? "—"}</span>
              </div>
              {lead.communeMariage && <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Mariage :</span><span className="text-sm text-foreground">{lead.communeMariage} {lead.dateMariage ? `— ${lead.dateMariage}` : ""}</span></div>}
              {lead.contratMariage && <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Contrat :</span><span className="text-sm text-foreground">{lead.regimeMatrimonial ?? "Oui"}</span></div>}
            </div>
          </div>

          {/* Mandats de Recherche associés */}
          {mandats && mandats.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-3">Mandats de Recherche ({mandats.length})</p>
              <div className="space-y-2">
                {mandats.map((m: any) => (
                  <a
                    key={m.id}
                    href={`/dashboard/mandats`}
                    className="flex items-center gap-3 p-3 bg-[oklch(0.10_0.005_280)] rounded-lg hover:bg-[oklch(0.14_0.005_280)] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[var(--gold)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium">{TYPE_BIEN_LABELS[m.typeBien] ?? m.typeBien} — {m.localisation}</p>
                      <p className="text-xs text-muted-foreground">{m.budgetMax?.toLocaleString("fr-FR")} € · {new Date(m.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      m.statut === "traite" ? "text-green-400 bg-green-400/10 border-green-400/30" :
                      m.statut === "en_cours" ? "text-amber-400 bg-amber-400/10 border-amber-400/30" :
                      "text-zinc-400 bg-zinc-400/10 border-zinc-400/30"
                    }`}>{m.statut?.replace("_", " ")}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {mandats && mandats.length === 0 && (
            <div className="flex items-center justify-between p-3 bg-[oklch(0.10_0.005_280)] rounded-xl border border-dashed border-[var(--gold)]/20">
              <p className="text-xs text-muted-foreground">Aucun mandat de recherche associé</p>
              <a
                href={`/mandat?leadId=${leadId}`}
                className="text-xs text-[var(--gold)] hover:underline font-medium"
              >
                + Créer un mandat
              </a>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-3">Documents ({documents.length})</p>
              <div className="space-y-2">
                {documents.map(doc => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[oklch(0.10_0.005_280)] rounded-lg hover:bg-[oklch(0.14_0.005_280)] transition-colors group">
                    <FileText className="w-4 h-4 text-[var(--gold)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">{doc.type.replace("_", " ")} — {doc.size ? `${Math.round(doc.size / 1024)} Ko` : "—"}</p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-[var(--gold)] transition-colors" />
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
    if (window.confirm(`Supprimer le dossier de ${nom} ? Cette action est irréversible.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const { data, isLoading, refetch } = trpc.leads.list.useQuery(
    { search: search || undefined, statut: statut !== "tous" ? statut : undefined, limit: LIMIT, offset: page * LIMIT },
    { enabled: isAuthenticated && (user?.role === "admin" || user?.role === "direction") }
  );

  const exportQuery = trpc.leads.exportCsv.useQuery(undefined, { enabled: false });

  // ⚠️ Ce hook DOIT être avant tous les return conditionnels (règle des hooks React)
  const { data: avisStats } = trpc.marie.statsAvis.useQuery(
    undefined,
    { enabled: isAuthenticated && (user?.role === "admin" || user?.role === "direction") }
  );

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <img src={SIGMA_LOGO} alt="Sigma Factory" className="h-16 object-contain mb-4" />
      <h2 className="text-2xl font-bold text-foreground">Accès réservé</h2>
      <p className="text-muted-foreground">Connectez-vous pour accéder au tableau de bord.</p>
      <a href="/login" className="px-6 py-3 bg-[var(--gold)] text-[oklch(0.08_0.005_280)] font-semibold rounded-lg hover:bg-[var(--gold-light)] transition-all">Se connecter</a>
    </div>
  );

  if (user?.role !== "admin" && user?.role !== "direction") return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <img src={SIGMA_LOGO} alt="Sigma Factory" className="h-16 object-contain mb-4" />
      <h2 className="text-2xl font-bold text-foreground">Accès refusé</h2>
      <p className="text-muted-foreground">Vous n'avez pas les droits pour accéder à cette page.</p>
    </div>
  );

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const leads = result.data;
    if (!leads.length) { toast.info("Aucune donnée à exporter."); return; }

    const headers = ["ID", "Nom", "Prénoms", "Email", "Portable", "Profession", "Date naissance", "Situation", "Nationalité", "Statut", "Date soumission"];
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
    toast.success("Export CSV téléchargé !");
  };

  const totalPages = Math.ceil((data?.total ?? 0) / LIMIT);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      {/* Toolbar */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-3 flex items-center justify-end gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border hover:border-[var(--gold)]/50 text-muted-foreground hover:text-[var(--gold)] transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--gold)]/40 text-[var(--gold)] text-sm font-medium hover:bg-[var(--gold)]/10 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="container py-6 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total leads", value: data?.total ?? 0, color: "text-[var(--gold)]" },
            { label: "Nouveaux", value: data?.items.filter(l => l.statut === "nouveau").length ?? 0, color: "text-[var(--gold)]" },
            { label: "En cours", value: data?.items.filter(l => l.statut === "en_cours").length ?? 0, color: "text-blue-400" },
            { label: "Traités", value: data?.items.filter(l => l.statut === "traite").length ?? 0, color: "text-green-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Bloc Avis & Témoignages Marie */}
        {avisStats && (
          <div className="mb-6 bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Avis & Témoignages — Marie</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                Ce mois : <span className="text-amber-400 font-semibold">{avisStats.montageOkCeMois}</span> finalisés
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
                <p className="text-xl font-bold text-amber-400">{avisStats.aFaire}</p>
                <p className="text-xs text-muted-foreground mt-0.5">À contacter</p>
              </div>
              <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-3">
                <p className="text-xl font-bold text-emerald-400">{avisStats.effectue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Avis effectué</p>
              </div>
              <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-3">
                <p className="text-xl font-bold text-blue-400">{avisStats.enMontage + avisStats.montageOk}</p>
                <p className="text-xs text-muted-foreground mt-0.5">En montage / OK</p>
              </div>
              <div className="bg-purple-400/5 border border-purple-400/20 rounded-xl p-3">
                <p className="text-xl font-bold text-purple-400">{avisStats.tauxConversion}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Taux finalisation</p>
              </div>
            </div>
            <div className="flex gap-3 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Sources : <span className="text-purple-300">{avisStats.courtage} Courtage</span> · <span className="text-emerald-300">{avisStats.immo} Immo</span>
              </span>
              <a href="/dashboard/avis-pipe" className="ml-auto text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Voir le pipe →
              </a>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" placeholder="Rechercher par nom, email, téléphone..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--gold)] transition-colors"
            />
          </div>
          <select
            value={statut} onChange={e => { setStatut(e.target.value); setPage(0); }}
            className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[var(--gold)] transition-colors"
          >
            <option value="tous">Tous les statuts</option>
            {Object.entries(STATUT_LABELS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
            </div>
          ) : !data?.items.length ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune fiche trouvée</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-[oklch(0.10_0.005_280)]">
                      {["Nom / Prénom", "Contact", "Situation", "Statut", "Date", ""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((lead, i) => (
                      <tr key={lead.id} className={`border-b border-border/50 hover:bg-[oklch(0.10_0.005_280)] transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-[oklch(0.09_0.005_280)]"}`} onClick={() => setSelectedId(lead.id)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground text-sm">{lead.nom} {lead.prenoms}</p>
                          <p className="text-xs text-muted-foreground">{lead.profession ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{lead.telephonePortable ?? "—"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{lead.email ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{SITUATION_LABELS[lead.situationFamiliale ?? ""] ?? "—"}</td>
                        <td className="px-4 py-3"><StatutBadge statut={lead.statut} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedId(lead.id); }} className="p-1.5 rounded-lg hover:bg-[var(--gold)]/10 text-muted-foreground hover:text-[var(--gold)] transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => handleDelete(e, lead.id, `${lead.nom} ${lead.prenoms}`)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Supprimer">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {data.items.map(lead => (
                  <div key={lead.id} className="p-4 hover:bg-[oklch(0.10_0.005_280)] transition-colors cursor-pointer" onClick={() => setSelectedId(lead.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{lead.nom} {lead.prenoms}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.telephonePortable ?? lead.email ?? "—"}</p>
                      </div>
                      <StatutBadge statut={lead.statut} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{SITUATION_LABELS[lead.situationFamiliale ?? ""] ?? "—"}</span>
                      <span>{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, data?.total ?? 0)} sur {data?.total ?? 0} résultats
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 rounded-lg border border-border hover:border-[var(--gold)]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-foreground px-2">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-border hover:border-[var(--gold)]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && <DetailPanel leadId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

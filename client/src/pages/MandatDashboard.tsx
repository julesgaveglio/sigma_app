import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AdminNav from "@/components/AdminNav";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mandat = {
  id: number;
  leadId: number | null;
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  typeBien: string;
  usage: string;
  localisation: string;
  budgetMax: number | null;
  modeFinancement: string | null;
  surfaceMin: number | null;
  surfaceMax: number | null;
  nbPiecesMin: number | null;
  nbPiecesMax: number | null;
  etatBien: string | null;
  travauxAcceptes: string | null;
  accordBancaire: string | null;
  typeMandat: string | null;
  dureeMandat: number | null;
  statut: string;
  notesInternes: string | null;
  assigneA: string | null;
  createdAt: Date;
  // critères
  balconTerrasse: boolean;
  parkingGarage: boolean;
  cave: boolean;
  ascenseur: boolean;
  gardien: boolean;
  calme: boolean;
  lumineux: boolean;
  procheTransports: boolean;
  procheEcoles: boolean;
  autresCriteres: string | null;
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  en_cours: { label: "En cours", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  en_attente_retour: { label: "En attente retour", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  standby: { label: "Standby", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  traite: { label: "Traité", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  annule: { label: "Annulé", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const TYPE_BIEN_LABELS: Record<string, string> = {
  appartement: "Appartement",
  maison: "Maison",
  villa: "Villa",
  terrain: "Terrain",
  local_commercial: "Local commercial",
  autre: "Autre",
};

const FINANCEMENT_LABELS: Record<string, string> = {
  comptant: "Comptant",
  credit: "Crédit",
  mixte: "Mixte",
};

const USAGE_LABELS: Record<string, string> = {
  residence_principale: "Résidence principale",
  residence_secondaire: "Résidence secondaire",
  investissement_locatif: "Investissement locatif",
};

// ─── Composant détail mandat ──────────────────────────────────────────────────

function MandatDetail({ mandat, onClose, onUpdate }: {
  mandat: Mandat;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [statut, setStatut] = useState(mandat.statut);
  const [notes, setNotes] = useState(mandat.notesInternes ?? "");
  const [assigneA, setAssigneA] = useState(mandat.assigneA ?? "");

  const updateMutation = trpc.mandats.updateStatut.useMutation({
    onSuccess: () => {
      toast.success("Mandat mis à jour");
      onUpdate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ id: mandat.id, statut, notesInternes: notes, assigneA });
  };

  const criteres = [
    mandat.balconTerrasse && "Balcon/Terrasse",
    mandat.parkingGarage && "Parking/Garage",
    mandat.cave && "Cave",
    mandat.ascenseur && "Ascenseur",
    mandat.gardien && "Gardien",
    mandat.calme && "Environnement calme",
    mandat.lumineux && "Lumineux",
    mandat.procheTransports && "Proche transports",
    mandat.procheEcoles && "Proche écoles",
  ].filter(Boolean) as string[];

  const s = STATUT_LABELS[statut] ?? { label: statut, color: "bg-zinc-700 text-zinc-300" };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">{mandat.nom} {mandat.prenoms}</h2>
            <p className="text-zinc-400 text-sm mt-0.5">Mandat #{mandat.id} · {new Date(mandat.createdAt).toLocaleDateString("fr-FR")}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Coordonnées */}
          <section>
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Coordonnées</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zinc-500">Email :</span> <span className="text-white">{mandat.email}</span></div>
              <div><span className="text-zinc-500">Tél :</span> <span className="text-white">{mandat.telephone}</span></div>
            </div>
          </section>

          {/* Bien recherché */}
          <section>
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Bien recherché</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zinc-500">Type :</span> <span className="text-white">{TYPE_BIEN_LABELS[mandat.typeBien] ?? mandat.typeBien}</span></div>
              <div><span className="text-zinc-500">Usage :</span> <span className="text-white">{USAGE_LABELS[mandat.usage] ?? mandat.usage}</span></div>
              <div className="col-span-2"><span className="text-zinc-500">Localisation :</span> <span className="text-white">{mandat.localisation}</span></div>
              {(mandat.surfaceMin || mandat.surfaceMax) && (
                <div><span className="text-zinc-500">Surface :</span> <span className="text-white">{mandat.surfaceMin ?? "—"}–{mandat.surfaceMax ?? "—"} m²</span></div>
              )}
              {(mandat.nbPiecesMin || mandat.nbPiecesMax) && (
                <div><span className="text-zinc-500">Pièces :</span> <span className="text-white">{mandat.nbPiecesMin ?? "—"}–{mandat.nbPiecesMax ?? "—"}</span></div>
              )}
              {mandat.etatBien && <div><span className="text-zinc-500">État :</span> <span className="text-white capitalize">{mandat.etatBien.replace("_", " ")}</span></div>}
              {mandat.travauxAcceptes && <div><span className="text-zinc-500">Travaux :</span> <span className="text-white capitalize">{mandat.travauxAcceptes.replace("_", " ")}</span></div>}
            </div>
          </section>

          {/* Critères */}
          {criteres.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Critères souhaités</h3>
              <div className="flex flex-wrap gap-2">
                {criteres.map(c => (
                  <span key={c} className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300">{c}</span>
                ))}
              </div>
              {mandat.autresCriteres && <p className="text-sm text-zinc-400 mt-2">{mandat.autresCriteres}</p>}
            </section>
          )}

          {/* Budget */}
          <section>
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Budget & financement</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zinc-500">Budget :</span> <span className="text-amber-400 font-bold">{mandat.budgetMax ? mandat.budgetMax.toLocaleString("fr-FR") + " €" : "À définir après courtage"}</span></div>
              <div><span className="text-zinc-500">Financement :</span> <span className="text-white">{mandat.modeFinancement ? (FINANCEMENT_LABELS[mandat.modeFinancement] ?? mandat.modeFinancement) : "À définir"}</span></div>
              {mandat.accordBancaire && <div><span className="text-zinc-500">Accord bancaire :</span> <span className="text-white capitalize">{mandat.accordBancaire.replace("_", " ")}</span></div>}
              {mandat.typeMandat && <div><span className="text-zinc-500">Type mandat :</span> <span className="text-white capitalize">{mandat.typeMandat}</span></div>}
              {mandat.dureeMandat && <div><span className="text-zinc-500">Durée :</span> <span className="text-white">{mandat.dureeMandat} mois</span></div>}
            </div>
          </section>

          {/* Gestion */}
          <section className="border-t border-zinc-800 pt-5">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Gestion interne</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Statut</label>
                <select
                  value={statut}
                  onChange={e => setStatut(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {Object.entries(STATUT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Assigné à</label>
                <AssigneeSelect
                  mode="team"
                  value={assigneA}
                  onChange={(val) => setAssigneA(val)}
                  placeholder="— Sélectionner un membre —"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes internes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observations, suivi..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-sm transition disabled:opacity-60"
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MandatDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Mandat | null>(null);
  const LIMIT = 20;

  const deleteMutation = trpc.mandats.delete.useMutation({
    onSuccess: () => refetch(),
  });
  const handleDelete = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le mandat de ${nom} ? Cette action est irréversible.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const { data, isLoading, refetch } = trpc.mandats.list.useQuery(
    { search, statut, limit: LIMIT, offset: page * LIMIT },
    { enabled: !!user }
  );

  const exportQuery = trpc.mandats.exportCsv.useQuery(undefined as never, { enabled: false });

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const items = result.data as Mandat[];
    const headers = ["ID", "Nom", "Prénoms", "Email", "Téléphone", "Type bien", "Localisation", "Budget max", "Financement", "Statut", "Date"];
    const rows = items.map(m => [
      m.id, m.nom, m.prenoms, m.email, m.telephone,
      TYPE_BIEN_LABELS[m.typeBien] ?? m.typeBien,
      m.localisation, m.budgetMax ?? "À définir", m.modeFinancement ? (FINANCEMENT_LABELS[m.modeFinancement] ?? m.modeFinancement) : "À définir",
      STATUT_LABELS[m.statut]?.label ?? m.statut,
      new Date(m.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mandats-recherche-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Vous devez être connecté pour accéder au tableau de bord.</p>
          <a href="/login" className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition">
            Se connecter
          </a>
        </div>
      </div>
    );
  }



  const mandats = (data?.items ?? []) as Mandat[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-zinc-950">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Mandats de Recherche</h1>
            <p className="text-zinc-400 text-sm mt-1">{total} mandat{total > 1 ? "s" : ""} au total</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Exporter CSV
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher par nom, email, localisation..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <select
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(0); }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="tous">Tous les statuts</option>
            {Object.entries(STATUT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mandats.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p>Aucun mandat trouvé</p>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Acquéreur</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Bien / Localisation</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Budget</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {mandats.map((m, i) => {
                    const s = STATUT_LABELS[m.statut] ?? { label: m.statut, color: "bg-zinc-700 text-zinc-300 border-zinc-600" };
                    return (
                      <tr key={m.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition ${i % 2 === 0 ? "" : "bg-zinc-900/50"}`}>
                        <td className="px-4 py-3 text-zinc-500 font-mono">{m.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{m.nom} {m.prenoms}</div>
                          <div className="text-zinc-500 text-xs">{m.email}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-white">{TYPE_BIEN_LABELS[m.typeBien] ?? m.typeBien}</div>
                          <div className="text-zinc-500 text-xs truncate max-w-[200px]">{m.localisation}</div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-amber-400 font-semibold">{m.budgetMax ? m.budgetMax.toLocaleString("fr-FR") + " €" : "À définir"}</span>
                          <div className="text-zinc-500 text-xs">{m.modeFinancement ? (FINANCEMENT_LABELS[m.modeFinancement] ?? m.modeFinancement) : "À définir"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-zinc-500 text-xs">
                          {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelected(m)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg text-xs transition"
                            >
                              Voir
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, m.id, `${m.nom} ${m.prenoms}`)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition"
                              title="Supprimer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <span className="text-zinc-500 text-sm">Page {page + 1} / {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-white rounded text-sm disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-white rounded text-sm disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal détail */}
      {selected && (
        <MandatDetail
          mandat={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { refetch(); setSelected(null); }}
        />
      )}
    </div>
  );
}

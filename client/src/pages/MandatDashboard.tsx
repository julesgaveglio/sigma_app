import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AdminNav from "@/components/AdminNav";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { toast } from "sonner";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, FileText, Loader2, Trash2 } from "lucide-react";

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

const STATUT_LABELS: Record<string, { label: string; style: { color: string; bg: string; border: string } }> = {
  nouveau: { label: "Nouveau", style: { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" } },
  en_cours: { label: "En cours", style: { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" } },
  en_attente_retour: { label: "En attente retour", style: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" } },
  standby: { label: "Standby", style: { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" } },
  traite: { label: "Traite", style: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" } },
  annule: { label: "Annule", style: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" } },
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
  credit: "Credit",
  mixte: "Mixte",
};

const USAGE_LABELS: Record<string, string> = {
  residence_principale: "Residence principale",
  residence_secondaire: "Residence secondaire",
  investissement_locatif: "Investissement locatif",
};

// ─── StatutBadge ─────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUT_LABELS[statut] ?? { label: statut, style: { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" } };
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

// ─── Composant detail mandat ─────────────────────────────────────────────────

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
    mandat.procheEcoles && "Proche ecoles",
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div className="w-full h-full overflow-y-auto"
        style={{ maxWidth: "520px", background: "#111111", borderLeft: "1px solid #1E1E1E" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{ background: "#111111", borderBottom: "1px solid #1E1E1E" }}
        >
          <div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "20px",
              fontWeight: 600,
              color: "#F0EDE6",
              letterSpacing: "0.02em",
            }}>
              {mandat.nom} {mandat.prenoms}
            </h2>
            <p style={{
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: "#3A3632",
              marginTop: "2px",
            }}>
              Mandat #{mandat.id} — {new Date(mandat.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 transition-opacity duration-300 hover:opacity-70" style={{ color: "#6B6560" }}>
            <X className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Coordonnees */}
          <div>
            <p className="label-uppercase mb-3">Coordonnees</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Email :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{mandat.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Tel :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{mandat.telephone}</span>
              </div>
            </div>
          </div>

          {/* Bien recherche */}
          <div>
            <p className="label-uppercase mb-3">Bien recherche</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Type :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{TYPE_BIEN_LABELS[mandat.typeBien] ?? mandat.typeBien}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Usage :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{USAGE_LABELS[mandat.usage] ?? mandat.usage}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Localisation :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{mandat.localisation}</span>
              </div>
              {(mandat.surfaceMin || mandat.surfaceMax) && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Surface :</span>
                  <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{mandat.surfaceMin ?? "—"}–{mandat.surfaceMax ?? "—"} m2</span>
                </div>
              )}
              {(mandat.nbPiecesMin || mandat.nbPiecesMax) && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Pieces :</span>
                  <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{mandat.nbPiecesMin ?? "—"}–{mandat.nbPiecesMax ?? "—"}</span>
                </div>
              )}
              {mandat.etatBien && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Etat :</span>
                  <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", textTransform: "capitalize" as const }}>{mandat.etatBien.replace("_", " ")}</span>
                </div>
              )}
              {mandat.travauxAcceptes && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Travaux :</span>
                  <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", textTransform: "capitalize" as const }}>{mandat.travauxAcceptes.replace("_", " ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Criteres */}
          {criteres.length > 0 && (
            <div>
              <p className="label-uppercase mb-3">Criteres souhaites</p>
              <div className="flex flex-wrap gap-2">
                {criteres.map(c => (
                  <span key={c} style={{
                    padding: "3px 10px",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 400,
                    color: "#6B6560",
                    background: "#161616",
                    border: "1px solid #1E1E1E",
                  }}>{c}</span>
                ))}
              </div>
              {mandat.autresCriteres && (
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "8px" }}>{mandat.autresCriteres}</p>
              )}
            </div>
          )}

          {/* Budget */}
          <div>
            <p className="label-uppercase mb-3">Budget & financement</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Budget :</span>
                <span className="tabular-nums" style={{
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  color: "#F0EDE6",
                }}>{mandat.budgetMax ? mandat.budgetMax.toLocaleString("fr-FR") + " EUR" : "A definir apres courtage"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Financement :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{mandat.modeFinancement ? (FINANCEMENT_LABELS[mandat.modeFinancement] ?? mandat.modeFinancement) : "A definir"}</span>
              </div>
              {mandat.accordBancaire && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Accord bancaire :</span>
                  <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", textTransform: "capitalize" as const }}>{mandat.accordBancaire.replace("_", " ")}</span>
                </div>
              )}
              {mandat.typeMandat && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Type mandat :</span>
                  <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", textTransform: "capitalize" as const }}>{mandat.typeMandat}</span>
                </div>
              )}
              {mandat.dureeMandat && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Duree :</span>
                  <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{mandat.dureeMandat} mois</span>
                </div>
              )}
            </div>
          </div>

          {/* Gestion interne */}
          <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "24px" }}>
            <p className="label-uppercase mb-3">Gestion interne</p>
            <div className="space-y-4">
              {/* Statut buttons */}
              <div>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginBottom: "8px" }}>Statut</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUT_LABELS).map(([key, val]) => (
                    <button key={key} onClick={() => setStatut(key)}
                      className="transition-colors duration-300"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "2px",
                        fontSize: "11px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase" as const,
                        border: `1px solid ${statut === key ? val.style.border : "#1E1E1E"}`,
                        background: statut === key ? val.style.bg : "transparent",
                        color: statut === key ? val.style.color : "#3A3632",
                        cursor: "pointer",
                      }}>
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigne */}
              <div>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginBottom: "8px" }}>Assigne a</p>
                <AssigneeSelect
                  mode="team"
                  value={assigneA}
                  onChange={(val) => setAssigneA(val)}
                  placeholder="— Selectionner un membre —"
                  className="w-full"
                />
              </div>

              {/* Notes */}
              <div>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginBottom: "8px" }}>Notes internes</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observations, suivi..."
                  style={{
                    width: "100%",
                    background: "#161616",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                    resize: "none",
                    outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                style={{
                  width: "100%",
                  padding: "12px 28px",
                  background: updateMutation.isPending ? "#8A7535" : "#C9A84C",
                  color: "#0A0A0A",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "none",
                  cursor: updateMutation.isPending ? "not-allowed" : "pointer",
                }}
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "#0A0A0A" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.04em" }}>Acces reserve</h2>
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Connectez-vous pour acceder au tableau de bord.</p>
        <a href="/login" style={{
          padding: "12px 28px",
          background: "#C9A84C",
          color: "#0A0A0A",
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
  }



  const mandats = (data?.items ?? []) as Mandat[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <AdminNav />

      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid #1E1E1E" }}>
        <div className="flex items-center justify-between px-5 py-2.5" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <p className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
            {total} mandat{total > 1 ? "s" : ""}
          </p>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 transition-colors duration-300"
            style={{
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "#6B6560",
              border: "1px solid #1E1E1E",
              borderRadius: "2px",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#F0EDE6"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
          >
            <Download className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Export CSV
          </button>
        </div>
      </div>

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Title */}
        <div className="mb-10">
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "28px",
            fontWeight: 700,
            color: "#F0EDE6",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}>Mandats de Recherche</h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-10" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
          {[
            { label: "Total mandats", value: total },
            { label: "Nouveaux", value: mandats.filter(m => m.statut === "nouveau").length },
            { label: "En cours", value: mandats.filter(m => m.statut === "en_cours").length },
            { label: "Traites", value: mandats.filter(m => m.statut === "traite").length },
          ].map((stat, i) => (
            <div key={stat.label} className="p-5" style={{ background: "#0A0A0A" }}>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px",
                fontWeight: 600,
                color: i === 0 ? "#C9A84C" : "#F0EDE6",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}>
                {stat.value}
              </p>
              <p className="label-uppercase mt-2">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher par nom, email, localisation..."
              className="w-full transition-colors duration-300 focus:outline-none"
              style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                paddingLeft: "36px",
                paddingRight: "14px",
                paddingTop: "10px",
                paddingBottom: "10px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#F0EDE6",
              }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          <select
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(0); }}
            style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "2px",
              padding: "10px 14px",
              fontSize: "13px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: "#F0EDE6",
              outline: "none",
            }}
          >
            <option value="tous">Tous les statuts</option>
            {Object.entries(STATUT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Tableau */}
        <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
            </div>
          ) : mandats.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucun mandat trouve</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                      {["#", "Acquereur", "Bien / Localisation", "Budget", "Statut", "Date", ""].map(h => (
                        <th key={h} className="text-left px-5 py-3 label-uppercase" style={{ background: "#0D0D0D" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mandats.map((m) => (
                      <tr key={m.id}
                        className="cursor-pointer transition-colors duration-300"
                        style={{ borderBottom: "1px solid #151515" }}
                        onClick={() => setSelected(m)}
                        onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-5 py-3 tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{m.id}</td>
                        <td className="px-5 py-3">
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{m.nom} {m.prenoms}</p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{m.email}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{TYPE_BIEN_LABELS[m.typeBien] ?? m.typeBien}</p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{m.localisation}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                            {m.budgetMax ? m.budgetMax.toLocaleString("fr-FR") + " EUR" : "A definir"}
                          </p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{m.modeFinancement ? (FINANCEMENT_LABELS[m.modeFinancement] ?? m.modeFinancement) : "A definir"}</p>
                        </td>
                        <td className="px-5 py-3"><StatutBadge statut={m.statut} /></td>
                        <td className="px-5 py-3 tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                          {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setSelected(m); }} className="p-1.5 transition-opacity duration-300 hover:opacity-70" style={{ color: "#3A3632" }}>
                              <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                            </button>
                            <button onClick={(e) => handleDelete(e, m.id, `${m.nom} ${m.prenoms}`)} className="p-1.5 transition-colors duration-300" style={{ color: "#3A3632" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                              title="Supprimer"
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

              {/* Mobile cards */}
              <div className="md:hidden">
                {mandats.map(m => (
                  <div key={m.id}
                    className="p-4 cursor-pointer transition-colors duration-300"
                    style={{ borderBottom: "1px solid #151515" }}
                    onClick={() => setSelected(m)}
                    onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{m.nom} {m.prenoms}</p>
                        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px" }}>{TYPE_BIEN_LABELS[m.typeBien] ?? m.typeBien} — {m.localisation}</p>
                      </div>
                      <StatutBadge statut={m.statut} />
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
                        {m.budgetMax ? m.budgetMax.toLocaleString("fr-FR") + " EUR" : "A definir"}
                      </span>
                      <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                        {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                      </span>
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
            <p className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
              {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} sur {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ color: "#6B6560", border: "1px solid #1E1E1E", borderRadius: "2px", background: "transparent" }}
              >
                <ChevronLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </button>
              <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", padding: "0 8px" }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ color: "#6B6560", border: "1px solid #1E1E1E", borderRadius: "2px", background: "transparent" }}
              >
                <ChevronRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detail */}
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

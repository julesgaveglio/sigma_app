import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AdminNav from "@/components/AdminNav";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { toast } from "sonner";
import { X, Download, Search, Eye, ChevronLeft, ChevronRight, Loader2, Trash2, Link2, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CloseInfo = {
  closerNom: string;
  offre: string;
  formule: string | null;
  montantGenere: number;
  resultat: string | null;
  dateCall: Date | null;
} | null;

type HexaDossier = {
  id: number;
  civilite: string | null;
  nom: string;
  prenom: string;
  email: string;
  dateNaissance: string | null;
  situationFamiliale: string | null;
  profession: string | null;
  mobile: string | null;
  fixe: string | null;
  adresse: string;
  codePostal: string;
  ville: string;
  paysNaissance: string;
  villeNaissance: string;
  montant: number;
  statut: string;
  notesInternes: string | null;
  assigneA: string | null;
  lienPaiement: string | null;
  paiementInitie: boolean;
  paiementRecu: boolean;
  createdAt: Date;
  closeInfo?: CloseInfo;
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, { label: string; style: { color: string; bg: string; border: string } }> = {
  nouveau: { label: "Nouveau", style: { color: "var(--gold)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" } },
  en_cours: { label: "En cours", style: { color: "var(--foreground)", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" } },
  lien_envoye: { label: "Lien envoye", style: { color: "var(--foreground-muted)", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" } },
  paiement_initie: { label: "Paiement initie", style: { color: "var(--foreground)", bg: "rgba(240,237,230,0.04)", border: "rgba(240,237,230,0.12)" } },
  paiement_recu: { label: "Paiement recu", style: { color: "var(--success)", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" } },
  annule: { label: "Annule", style: { color: "var(--destructive)", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" } },
};

const LIMIT = 25;

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

// ─── Composant detail dossier ─────────────────────────────────────────────────

function HexaDetail({ dossier, onClose, onUpdate }: {
  dossier: HexaDossier;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [statut, setStatut] = useState(dossier.statut);
  const [notes, setNotes] = useState(dossier.notesInternes ?? "");
  const [assigneA, setAssigneA] = useState(dossier.assigneA ?? "");
  const [lienPaiement, setLienPaiement] = useState(dossier.lienPaiement ?? "");
  const [paiementInitie, setPaiementInitie] = useState(dossier.paiementInitie);
  const [paiementRecu, setPaiementRecu] = useState(dossier.paiementRecu);

  const updateMutation = trpc.hexa.updateStatut.useMutation({
    onSuccess: () => {
      toast.success("Dossier mis à jour");
      onUpdate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ id: dossier.id, statut, notesInternes: notes, assigneA, lienPaiement, paiementInitie, paiementRecu });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div
        className="w-full h-full overflow-y-auto"
        style={{ maxWidth: "520px", background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em" }}>
              {dossier.civilite ? `${dossier.civilite} ` : ""}{dossier.nom} {dossier.prenom}
            </h2>
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>
              Dossier #{dossier.id} — {new Date(dossier.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatutBadge statut={statut} />
            <button onClick={onClose} className="p-2 transition-opacity duration-300 hover:opacity-70" style={{ color: "var(--foreground-muted)" }}>
              <X className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Montant */}
          <div className="p-5 text-center" style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "2px" }}>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Montant demande</p>
            <p className="tabular-nums" style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "36px",
              fontWeight: 600,
              color: "var(--gold)",
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}>
              {dossier.montant.toLocaleString("fr-FR")} EUR
            </p>
          </div>

          {/* Matching rapport de vente */}
          {dossier.closeInfo && (
            <div className="p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px" }}>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-3.5 h-3.5" style={{ color: "var(--success)", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "var(--success)" }}>Matche avec le rapport de vente</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Closer</p>
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{dossier.closeInfo.closerNom}</p>
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Offre</p>
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{dossier.closeInfo.offre}</p>
                </div>
                {dossier.closeInfo.formule && (
                  <div>
                    <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Formule</p>
                    <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{dossier.closeInfo.formule}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Montant genere</p>
                  <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{dossier.closeInfo.montantGenere.toLocaleString("fr-FR")} EUR</p>
                </div>
                {dossier.closeInfo.dateCall && (
                  <div className="col-span-2">
                    <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Date du call</p>
                    <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{new Date(dossier.closeInfo.dateCall).toLocaleDateString("fr-FR")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coordonnees */}
          <div>
            <p className="label-uppercase mb-3">Coordonnees</p>
            <div className="space-y-2">
              {[
                { label: "Email", value: dossier.email },
                dossier.mobile ? { label: "Mobile", value: dossier.mobile } : null,
                dossier.fixe ? { label: "Fixe", value: dossier.fixe } : null,
                { label: "Adresse", value: `${dossier.adresse}, ${dossier.codePostal} ${dossier.ville}` },
                { label: "Naissance", value: dossier.dateNaissance
                  ? `${new Date(dossier.dateNaissance).toLocaleDateString("fr-FR")} — ${dossier.villeNaissance} (${dossier.paysNaissance})`
                  : `${dossier.villeNaissance} (${dossier.paysNaissance})`
                },
                dossier.situationFamiliale ? { label: "Situation", value: dossier.situationFamiliale.replace("_", " ") } : null,
                dossier.profession ? { label: "Profession", value: dossier.profession } : null,
              ].filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-baseline gap-3">
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", minWidth: "70px", flexShrink: 0 }}>{item!.label}</span>
                  <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{item!.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gestion interne */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
            <p className="label-uppercase mb-4">Gestion interne</p>
            <div className="space-y-4">
              {/* Statut */}
              <div>
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginBottom: "6px" }}>Statut</p>
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
                        border: `1px solid ${statut === key ? val.style.border : "var(--border)"}`,
                        background: statut === key ? val.style.bg : "transparent",
                        color: statut === key ? val.style.color : "var(--foreground-faint)",
                      }}>
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lien paiement */}
              <div>
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginBottom: "6px" }}>Lien de paiement Hexa Coop</p>
                <input
                  value={lienPaiement}
                  onChange={e => setLienPaiement(e.target.value)}
                  placeholder="https://..."
                  className="w-full transition-colors duration-300 focus:outline-none"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "2px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "var(--foreground)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "4px" }}>
                  Collez ici le lien genere sur le site Hexa Coop apres traitement du dossier.
                </p>
              </div>

              {/* Suivi paiement */}
              <div className="p-4" style={{ border: "1px solid var(--border)", borderRadius: "2px" }}>
                <p className="label-uppercase mb-3">Suivi paiement</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setPaiementInitie(!paiementInitie)}
                      className="relative flex-shrink-0 cursor-pointer transition-colors duration-300"
                      style={{
                        width: "36px",
                        height: "20px",
                        borderRadius: "2px",
                        background: paiementInitie ? "rgba(201,168,76,0.2)" : "var(--border)",
                        border: `1px solid ${paiementInitie ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
                      }}
                    >
                      <div className="absolute top-0.5 transition-all duration-300" style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "1px",
                        background: paiementInitie ? "var(--gold)" : "var(--foreground-faint)",
                        left: paiementInitie ? "17px" : "1px",
                      }} />
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: paiementInitie ? "var(--foreground)" : "var(--foreground-muted)" }}>Paiement initie</p>
                      <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Le lien de paiement a ete envoye au client</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setPaiementRecu(!paiementRecu)}
                      className="relative flex-shrink-0 cursor-pointer transition-colors duration-300"
                      style={{
                        width: "36px",
                        height: "20px",
                        borderRadius: "2px",
                        background: paiementRecu ? "rgba(74,122,90,0.2)" : "var(--border)",
                        border: `1px solid ${paiementRecu ? "rgba(74,122,90,0.4)" : "var(--border)"}`,
                      }}
                    >
                      <div className="absolute top-0.5 transition-all duration-300" style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "1px",
                        background: paiementRecu ? "var(--success)" : "var(--foreground-faint)",
                        left: paiementRecu ? "17px" : "1px",
                      }} />
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: paiementRecu ? "var(--foreground)" : "var(--foreground-muted)" }}>Paiement recu</p>
                      <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Le paiement a ete confirme et encaisse</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Assigne a */}
              <div>
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginBottom: "6px" }}>Assigne a</p>
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
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginBottom: "6px" }}>Notes internes</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observations, suivi..."
                  className="w-full transition-colors duration-300 focus:outline-none"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "2px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "var(--foreground)",
                    resize: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full transition-colors duration-300 disabled:cursor-not-allowed"
                style={{
                  padding: "14px 28px",
                  background: updateMutation.isPending ? "var(--gold-muted)" : "var(--gold)",
                  color: "var(--background)",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "none",
                }}
                onMouseEnter={e => { if (!updateMutation.isPending) e.currentTarget.style.filter = "brightness(1.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
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

export default function HexaDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [mainTab, setMainTab] = useState<"hexa" | "commissions">("hexa");
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HexaDossier | null>(null);
  // ─── Commissions partenaires ───
  const [commTab, setCommTab] = useState<"courtage" | "immo">("courtage");
  const { data: transCourtage = [], refetch: refetchCourtage } = trpc.commissions.listTransactionsCourtage.useQuery(
    {},
    { enabled: !!user && (user.role === "admin" || user.role === "direction") }
  );
  const { data: transImmo = [], refetch: refetchImmo } = trpc.commissions.listTransactionsImmo.useQuery(
    {},
    { enabled: !!user && (user.role === "admin" || user.role === "direction") }
  );
  const validerCourtage = trpc.commissions.validerTransactionCourtage.useMutation({
    onSuccess: () => { toast.success("Transaction validée !"); refetchCourtage(); },
    onError: (e) => toast.error(e.message),
  });
  const validerImmo = trpc.commissions.validerTransactionImmo.useMutation({
    onSuccess: () => { toast.success("Transaction validée !"); refetchImmo(); },
    onError: (e) => toast.error(e.message),
  });
  // marquerPaiement = alias valider avec statut paye
  const payerCourtage = trpc.commissions.validerTransactionCourtage.useMutation({
    onSuccess: () => { toast.success("Paiement enregistré !"); refetchCourtage(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const payerImmo = trpc.commissions.validerTransactionImmo.useMutation({
    onSuccess: () => { toast.success("Paiement enregistré !"); refetchImmo(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const totalAttenteCourtage = (transCourtage as any[]).filter((t: any) => t.statut !== "paye").reduce((s: number, t: any) => s + (t.montantCommission || 0), 0);
  const totalAttenteImmo = (transImmo as any[]).filter((t: any) => t.statut !== "paye").reduce((s: number, t: any) => s + (t.montantHonoraires || 0), 0);

  const deleteMutation = trpc.hexa.delete.useMutation({
    onSuccess: () => { toast.success("Dossier supprimé"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const handleDelete = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le dossier de ${nom} ? Cette action est irréversible.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const { data, isLoading, refetch } = trpc.hexa.list.useQuery(
    { search: search || undefined, statut: statut !== "tous" ? statut : undefined, limit: LIMIT, offset: (page - 1) * LIMIT },
    { enabled: !!user && (user.role === "admin" || user.role === "direction") }
  );

  const handleExport = () => {
    const items = (data?.items ?? []) as HexaDossier[];
    if (items.length === 0) { toast.error("Aucun dossier à exporter"); return; }
    const headers = ["ID", "Civilité", "Nom", "Prénom", "Email", "Mobile", "Adresse", "CP", "Ville", "Montant (€)", "Statut", "Paiement initié", "Paiement reçu", "Lien paiement", "Date"];
    const rows = items.map(d => [
      d.id, d.civilite ?? "", d.nom, d.prenom, d.email, d.mobile ?? "",
      d.adresse, d.codePostal, d.ville, d.montant,
      STATUT_LABELS[d.statut]?.label ?? d.statut,
      d.paiementInitie ? "Oui" : "Non",
      d.paiementRecu ? "Oui" : "Non",
      d.lienPaiement ?? "",
      new Date(d.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hexa-dossiers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "var(--background)" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.04em" }}>Acces reserve</h2>
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Vous devez etre connecte pour acceder au tableau de bord.</p>
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
  }

  if (user.role !== "admin" && user.role !== "direction") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--background)" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.04em" }}>Acces refuse</h2>
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Acces reserve a la direction.</p>
      </div>
    );
  }

  const dossiers = (data?.items ?? []) as HexaDossier[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const commStatutBadge = (statutVal: string) => {
    const styles: Record<string, { color: string; bg: string; border: string }> = {
      paye: { color: "var(--success)", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
      valide: { color: "var(--gold)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
    };
    const s = styles[statutVal] ?? { color: "var(--foreground-faint)", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" };
    const labels: Record<string, string> = { paye: "Paye", valide: "Valide", en_attente: "En attente" };
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
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}>
        {labels[statutVal] ?? statutVal}
      </span>
    );
  };

  const pendingCount = (transCourtage as any[]).filter((t: any) => t.statut === "en_attente").length + (transImmo as any[]).filter((t: any) => t.statut === "en_attente").length;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <AdminNav />

      {selected && (
        <HexaDetail
          dossier={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { refetch(); setSelected(null); }}
        />
      )}

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Onglets principaux */}
        <div className="flex gap-0 mb-10" style={{ borderBottom: "1px solid var(--border)" }}>
          {[
            { key: "hexa", label: "Sigma Credit (Hexa)" },
            { key: "commissions", label: "Commissions partenaires" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key as any)}
              className="flex items-center gap-2 transition-colors duration-300 -mb-px"
              style={{
                padding: "12px 20px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                borderBottom: mainTab === tab.key ? "1px solid var(--gold)" : "1px solid transparent",
                color: mainTab === tab.key ? "var(--foreground)" : "var(--foreground-faint)",
                background: "transparent",
                border: "none",
                borderBottomWidth: "1px",
                borderBottomStyle: "solid",
                borderBottomColor: mainTab === tab.key ? "var(--gold)" : "transparent",
              }}>
              {tab.label}
              {tab.key === "commissions" && pendingCount > 0 && (
                <span style={{
                  fontSize: "10px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: "2px",
                  background: "rgba(201,168,76,0.12)",
                  border: "1px solid rgba(201,168,76,0.25)",
                  color: "var(--gold)",
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Commissions partenaires ── */}
        {mainTab === "commissions" && (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "2px" }}>
              {[
                { label: "Courtage en attente", value: `${totalAttenteCourtage.toLocaleString("fr-FR")} EUR`, sub: `${(transCourtage as any[]).filter((t: any) => t.statut !== "paye").length} transaction(s)`, highlight: true },
                { label: "Immo en attente", value: `${totalAttenteImmo.toLocaleString("fr-FR")} EUR`, sub: `${(transImmo as any[]).filter((t: any) => t.statut !== "paye").length} transaction(s)`, highlight: true },
                { label: "Courtage paye", value: `${(transCourtage as any[]).filter((t: any) => t.statut === "paye").reduce((s: number, t: any) => s + (t.montantCommission || 0), 0).toLocaleString("fr-FR")} EUR`, sub: null, highlight: false },
                { label: "Immo paye", value: `${(transImmo as any[]).filter((t: any) => t.statut === "paye").reduce((s: number, t: any) => s + (t.montantHonoraires || 0), 0).toLocaleString("fr-FR")} EUR`, sub: null, highlight: false },
              ].map((stat, i) => (
                <div key={stat.label} className="p-5" style={{ background: "var(--background)" }}>
                  <p className="tabular-nums" style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "24px",
                    fontWeight: 600,
                    color: i < 2 ? "var(--gold)" : "var(--success)",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}>
                    {stat.value}
                  </p>
                  <p className="label-uppercase mt-2">{stat.label}</p>
                  {stat.sub && <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>{stat.sub}</p>}
                </div>
              ))}
            </div>

            {/* Export + sous-onglets */}
            <div className="flex items-center justify-between">
              <div className="flex gap-0" style={{ borderBottom: "1px solid var(--border)" }}>
                {[{ key: "courtage", label: "Courtage" }, { key: "immo", label: "Immobilier" }].map(tab => (
                  <button key={tab.key} onClick={() => setCommTab(tab.key as any)}
                    className="transition-colors duration-300 -mb-px"
                    style={{
                      padding: "10px 16px",
                      fontSize: "11px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase" as const,
                      background: "transparent",
                      border: "none",
                      borderBottom: commTab === tab.key ? "1px solid var(--gold)" : "1px solid transparent",
                      color: commTab === tab.key ? "var(--foreground)" : "var(--foreground-faint)",
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const rows: string[][] = [];
                  rows.push(["TYPE", "ID PARTENAIRE", "LEAD / ADRESSE", "DOSSIER", "MONTANT BRUT (€)", "PART PARTENAIRE (€)", "PART SIGMA (€)", "PARRAIN N1 (€)", "PARRAIN N2 (€)", "STATUT", "DATE"]);
                  (transCourtage as any[]).forEach((t: any) => {
                    rows.push(["Courtage", String(t.courtierId), t.leadNom || "", t.dossierRef || "", String(t.montantCommission || ""), String(t.partCourtier || ""), String(t.partSigma || ""), String(t.partParrainN1 || ""), String(t.partParrainN2 || ""), t.statut, new Date(t.createdAt).toLocaleDateString("fr-FR")]);
                  });
                  (transImmo as any[]).forEach((t: any) => {
                    rows.push(["Immobilier", String(t.agentId), t.adresseBien || "", t.typeTransaction || "", String(t.montantHonoraires || ""), String(t.partAgent || ""), String(t.partSigma || ""), String(t.partParrainN1 || ""), String(t.partParrainN2 || ""), t.statut, new Date(t.createdAt).toLocaleDateString("fr-FR")]);
                  });
                  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `commissions-${new Date().toISOString().slice(0, 7)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Export CSV téléchargé");
                }}
                className="flex items-center gap-2 transition-colors duration-300"
                style={{
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  color: "var(--foreground-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  background: "transparent",
                  padding: "8px 14px",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
              >
                <Download className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                Export CSV mensuel
              </button>
            </div>

            {/* Table Courtage */}
            {commTab === "courtage" && (
              (transCourtage as any[]).length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)", strokeWidth: 1.5 }} />
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucune transaction courtage declaree</p>
                </div>
              ) : (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Courtier", "Detail", "Commission", "Part courtier (75%)", "Part Sigma (25%)", "Statut", ""].map(h => (
                            <th key={h} className={`px-5 py-3 label-uppercase ${h === "Commission" || h === "Part courtier (75%)" || h === "Part Sigma (25%)" ? "text-right" : h === "Statut" ? "text-center" : "text-left"}`} style={{ background: "var(--surface-header)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(transCourtage as any[]).map((t: any) => (
                          <tr key={t.id}
                            className="transition-colors duration-300"
                            style={{ borderBottom: "1px solid var(--border-subtle)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <td className="px-5 py-3">
                              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>#{t.courtierId}</p>
                              {t.leadNom && <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{t.leadNom}</p>}
                            </td>
                            <td className="px-5 py-3">
                              {t.dossierRef && <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{t.dossierRef}</p>}
                              {t.montantEnveloppe && <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Enveloppe : {t.montantEnveloppe.toLocaleString("fr-FR")} EUR</p>}
                              <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {t.montantCommission ? (
                                <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, color: "var(--foreground)" }}>{t.montantCommission.toLocaleString("fr-FR")} EUR</span>
                              ) : (
                                <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>En attente</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {t.partCourtier ? (
                                <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--success)" }}>{t.partCourtier.toLocaleString("fr-FR")} EUR</span>
                              ) : (
                                <span style={{ color: "var(--foreground-faint)" }}>—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {t.partSigma ? (
                                <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{t.partSigma.toLocaleString("fr-FR")} EUR</span>
                              ) : (
                                <span style={{ color: "var(--foreground-faint)" }}>—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {commStatutBadge(t.statut)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                {t.statut === "en_attente" && t.montantCommission && (
                                  <button onClick={() => validerCourtage.mutate({ id: t.id, statut: "valide" })}
                                    className="transition-colors duration-300"
                                    style={{
                                      fontSize: "11px",
                                      fontFamily: "'Hanken Grotesk', sans-serif",
                                      fontWeight: 500,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase" as const,
                                      padding: "4px 10px",
                                      borderRadius: "2px",
                                      border: "1px solid rgba(201,168,76,0.3)",
                                      background: "rgba(201,168,76,0.06)",
                                      color: "var(--gold)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.12)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(201,168,76,0.06)")}
                                  >
                                    Valider
                                  </button>
                                )}
                                {t.statut === "valide" && (
                                  <button onClick={() => payerCourtage.mutate({ id: t.id, statut: "paye" })}
                                    className="transition-colors duration-300"
                                    style={{
                                      fontSize: "11px",
                                      fontFamily: "'Hanken Grotesk', sans-serif",
                                      fontWeight: 500,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase" as const,
                                      padding: "4px 10px",
                                      borderRadius: "2px",
                                      border: "1px solid rgba(74,122,90,0.3)",
                                      background: "rgba(74,122,90,0.06)",
                                      color: "var(--success)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,122,90,0.12)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(74,122,90,0.06)")}
                                  >
                                    Marquer paye
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {/* Table Immo */}
            {commTab === "immo" && (
              (transImmo as any[]).length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)", strokeWidth: 1.5 }} />
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucune transaction immobiliere declaree</p>
                </div>
              ) : (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Agent", "Bien", "Honoraires", "Part agent (50%)", "Part Sigma", "Statut", ""].map(h => (
                            <th key={h} className={`px-5 py-3 label-uppercase ${h === "Honoraires" || h === "Part agent (50%)" || h === "Part Sigma" ? "text-right" : h === "Statut" ? "text-center" : "text-left"}`} style={{ background: "var(--surface-header)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(transImmo as any[]).map((t: any) => (
                          <tr key={t.id}
                            className="transition-colors duration-300"
                            style={{ borderBottom: "1px solid var(--border-subtle)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <td className="px-5 py-3">
                              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>#{t.agentId}</p>
                              <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
                            </td>
                            <td className="px-5 py-3">
                              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{t.adresseBien || "—"}</p>
                              <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", textTransform: "capitalize" as const }}>{t.typeTransaction}</p>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {t.montantHonoraires ? (
                                <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, color: "var(--foreground)" }}>{t.montantHonoraires.toLocaleString("fr-FR")} EUR</span>
                              ) : (
                                <span style={{ color: "var(--foreground-faint)" }}>—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {t.partAgent ? (
                                <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--success)" }}>{t.partAgent.toLocaleString("fr-FR")} EUR</span>
                              ) : (
                                <span style={{ color: "var(--foreground-faint)" }}>—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {t.partSigma ? (
                                <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{t.partSigma.toLocaleString("fr-FR")} EUR</span>
                              ) : (
                                <span style={{ color: "var(--foreground-faint)" }}>—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {commStatutBadge(t.statut)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                {t.statut === "en_attente" && (
                                  <button onClick={() => validerImmo.mutate({ id: t.id, statut: "valide" })}
                                    className="transition-colors duration-300"
                                    style={{
                                      fontSize: "11px",
                                      fontFamily: "'Hanken Grotesk', sans-serif",
                                      fontWeight: 500,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase" as const,
                                      padding: "4px 10px",
                                      borderRadius: "2px",
                                      border: "1px solid rgba(201,168,76,0.3)",
                                      background: "rgba(201,168,76,0.06)",
                                      color: "var(--gold)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.12)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(201,168,76,0.06)")}
                                  >
                                    Valider
                                  </button>
                                )}
                                {t.statut === "valide" && (
                                  <button onClick={() => payerImmo.mutate({ id: t.id, statut: "paye" })}
                                    className="transition-colors duration-300"
                                    style={{
                                      fontSize: "11px",
                                      fontFamily: "'Hanken Grotesk', sans-serif",
                                      fontWeight: 500,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase" as const,
                                      padding: "4px 10px",
                                      borderRadius: "2px",
                                      border: "1px solid rgba(74,122,90,0.3)",
                                      background: "rgba(74,122,90,0.06)",
                                      color: "var(--success)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,122,90,0.12)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(74,122,90,0.06)")}
                                  >
                                    Marquer paye
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ── Onglet Sigma Credit ── */}
        {mainTab === "hexa" && (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h1 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  lineHeight: 1,
                }}>
                  Sigma Credit
                </h1>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "6px" }}>
                  {total} dossier{total > 1 ? "s" : ""} au total
                </p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 transition-colors duration-300"
                style={{
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  color: "var(--foreground-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  background: "transparent",
                  padding: "10px 16px",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
              >
                <Download className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                Exporter CSV
              </button>
            </div>

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Rechercher par nom, email, ville..."
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
                value={statut}
                onChange={e => { setStatut(e.target.value); setPage(0); }}
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
                {Object.entries(STATUT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
              </div>
            ) : dossiers.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)", strokeWidth: 1.5 }} />
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucun dossier trouve</p>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["#", "Client", "Ville", "Montant", "Statut", "Paiement initie", "Paiement recu", "Date", ""].map(h => (
                          <th key={h} className={`px-5 py-3 label-uppercase text-left ${h === "Paiement initie" || h === "Paiement recu" ? "text-center" : ""}`} style={{ background: "var(--surface-header)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dossiers.map((d) => (
                        <tr key={d.id}
                          className="cursor-pointer transition-colors duration-300"
                          style={{ borderBottom: "1px solid var(--border-subtle)" }}
                          onClick={() => setSelected(d)}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-5 py-3 tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{d.id}</td>
                          <td className="px-5 py-3">
                            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{d.civilite ? `${d.civilite} ` : ""}{d.nom} {d.prenom}</p>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{d.email}</p>
                          </td>
                          <td className="px-5 py-3" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{d.ville}</td>
                          <td className="px-5 py-3">
                            <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, color: "var(--foreground)" }}>{d.montant.toLocaleString("fr-FR")} EUR</span>
                          </td>
                          <td className="px-5 py-3">
                            <StatutBadge statut={d.statut} />
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "20px",
                              height: "20px",
                              borderRadius: "2px",
                              border: `1px solid ${d.paiementInitie ? "rgba(201,168,76,0.3)" : "var(--border)"}`,
                              background: d.paiementInitie ? "rgba(201,168,76,0.08)" : "transparent",
                              color: d.paiementInitie ? "var(--gold)" : "var(--foreground-faint)",
                              fontSize: "11px",
                            }}>
                              {d.paiementInitie ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "20px",
                              height: "20px",
                              borderRadius: "2px",
                              border: `1px solid ${d.paiementRecu ? "rgba(74,122,90,0.3)" : "var(--border)"}`,
                              background: d.paiementRecu ? "rgba(74,122,90,0.08)" : "transparent",
                              color: d.paiementRecu ? "var(--success)" : "var(--foreground-faint)",
                              fontSize: "11px",
                            }}>
                              {d.paiementRecu ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
                            {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelected(d); }}
                                className="p-1.5 transition-opacity duration-300 hover:opacity-70"
                                style={{ color: "var(--foreground-faint)" }}
                              >
                                <Eye className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, d.id, `${d.nom} ${d.prenom}`)}
                                className="p-1.5 transition-colors duration-300"
                                style={{ color: "var(--foreground-faint)" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "var(--destructive)")}
                                onMouseLeave={e => (e.currentTarget.style.color = "var(--foreground-faint)")}
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
                  {dossiers.map(d => (
                    <div key={d.id}
                      className="p-4 cursor-pointer transition-colors duration-300"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onClick={() => setSelected(d)}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{d.civilite ? `${d.civilite} ` : ""}{d.nom} {d.prenom}</p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>{d.email}</p>
                        </div>
                        <StatutBadge statut={d.statut} />
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, color: "var(--foreground)" }}>{d.montant.toLocaleString("fr-FR")} EUR</span>
                        <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>{new Date(d.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
                      {total} dossier{total > 1 ? "s" : ""} — Page {page + 1}/{totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                        style={{ color: "var(--foreground-muted)", border: "1px solid var(--border)", borderRadius: "2px" }}
                      >
                        <ChevronLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                      </button>
                      <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", padding: "0 8px" }}>{page + 1} / {totalPages}</span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                        style={{ color: "var(--foreground-muted)", border: "1px solid var(--border)", borderRadius: "2px" }}
                      >
                        <ChevronRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                      </button>
                    </div>
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

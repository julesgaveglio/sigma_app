import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PartnerDocumentsSection from "@/components/PartnerDocumentsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, FileText, Search, ChevronRight,
  CheckCircle, Clock, XCircle, Plus, Download, Trash2,
  Upload, Send, Eye, FolderOpen, ChevronDown, ChevronUp, X,
  AlertTriangle, RefreshCw
} from "lucide-react";
import { Link } from "wouter";

const STATUT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  en_attente: { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  actif: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  suspendu: { color: "#C9A84C", bg: "rgba(201,168,76,0.05)", border: "rgba(201,168,76,0.15)" },
  resilie: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
};
const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  actif: "Actif",
  suspendu: "Suspendu",
  resilie: "Resilie",
};

const DOSSIER_STATUT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  nouveau: { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  en_cours: { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  envoye: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  valide: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  refuse: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
};
const DOSSIER_STATUT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  envoye: "Envoye",
  valide: "Valide",
  refuse: "Refuse",
};

function StatutBadge({ statut, map }: { statut: string; map: Record<string, { color: string; bg: string; border: string }> }) {
  const s = map[statut] ?? { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" };
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
      {statut === "en_attente" ? "En attente" : statut === "en_cours" ? "En cours" : statut.charAt(0).toUpperCase() + statut.slice(1)}
    </span>
  );
}

// ─── Onglet Dossiers Courtage ─────────────────────────────────────────────────

function DossierCourtageRow({ dossier, courtiers, onRefetch }: {
  dossier: any;
  courtiers: any[];
  onRefetch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCourtiers, setSelectedCourtiers] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const uploadDocMutation = trpc.financement.uploadDoc.useMutation({
    onSuccess: () => {
      toast.success("Document ajoute");
      utils.financement.lister.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const assignerMutation = trpc.financement.assigner.useMutation({
    onSuccess: (data) => {
      toast.success(`Dossier envoye a ${data.nbAssignations} courtier(s)`);
      setSelectedCourtiers([]);
      utils.financement.lister.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const supprimerDocMutation = trpc.financement.supprimerDoc.useMutation({
    onSuccess: () => {
      toast.success("Document supprime");
      utils.financement.lister.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Fichier trop lourd (max 16 Mo)"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadDocMutation.mutateAsync({
          dossierFinancementId: dossier.id,
          nom: file.name,
          type: file.name.split(".").pop()?.toLowerCase() ?? "pdf",
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleCourtier = (id: number) => {
    setSelectedCourtiers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const courtiersActifs = courtiers.filter((c: any) => c.statutInterne === "actif");

  return (
    <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
      {/* Ligne principale */}
      <div
        className="flex items-center gap-4 cursor-pointer transition-colors duration-300"
        style={{ padding: "14px 20px" }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#F0EDE6",
            }}>
              {dossier.emprunteur1Prenom} {dossier.emprunteur1Nom}
            </span>
            <StatutBadge statut={dossier.statut} map={DOSSIER_STATUT_STYLES} />
          </div>
          <div className="tabular-nums" style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "11px",
            color: "#3A3632",
            marginTop: "2px",
          }}>
            {dossier.montantProjet?.toLocaleString("fr-FR")} EUR · {dossier.duree} mois · {dossier.apportPersonnel?.toLocaleString("fr-FR")} EUR apport
          </div>
        </div>
        <div className="flex items-center gap-4" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            {dossier.docs?.length ?? 0} doc(s)
          </span>
          <span className="flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            {dossier.assignations?.length ?? 0} courtier(s)
          </span>
          <span className="tabular-nums">{new Date(dossier.createdAt).toLocaleDateString("fr-FR")}</span>
          {expanded
            ? <ChevronUp className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
            : <ChevronDown className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
          }
        </div>
      </div>

      {/* Detail expande */}
      {expanded && (
        <div className="space-y-6" style={{ borderTop: "1px solid #1E1E1E", padding: "20px", background: "#0D0D0D" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Revenus nets/mois", value: dossier.emprunteur1RevenusMensuelsNets?.toLocaleString("fr-FR") ?? "--", suffix: " EUR" },
              { label: "Charges mensuelles", value: dossier.chargesMensuelles?.toLocaleString("fr-FR") ?? "--", suffix: " EUR" },
              { label: "Activite", value: dossier.emprunteur1Activite ?? "--", suffix: "" },
              { label: "Situation matrimoniale", value: dossier.emprunteur1SituationMatrimoniale ?? "--", suffix: "" },
            ].map(item => (
              <div key={item.label}>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>{item.label}</p>
                <p className="tabular-nums" style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#F0EDE6",
                }}>{item.value}{item.suffix}</p>
              </div>
            ))}
          </div>

          {/* Documents joints */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
              <p className="label-uppercase">Documents joints</p>
              <div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 transition-colors duration-300"
                  style={{
                    padding: "6px 14px",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    color: "#C9A84C",
                    border: "1px solid rgba(201,168,76,0.3)",
                    background: "transparent",
                    cursor: uploading ? "not-allowed" : "pointer",
                    opacity: uploading ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = "rgba(201,168,76,0.06)"; }}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Upload className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                  {uploading ? "Envoi..." : "Ajouter un document"}
                </button>
              </div>
            </div>
            {(!dossier.docs || dossier.docs.length === 0) ? (
              <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#3A3632" }}>
                Aucun document joint. Ajoutez CNI, bulletins de salaire, avis d'imposition...
              </p>
            ) : (
              <div className="space-y-1">
                {dossier.docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between" style={{
                    background: "#0A0A0A",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "8px 12px",
                  }}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#F0EDE6" }}>{doc.nom}</span>
                      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "10px", color: "#3A3632", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{doc.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="p-1 transition-opacity duration-300 hover:opacity-70"
                          style={{ color: "#6B6560" }}
                        >
                          <Eye className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                        </a>
                      )}
                      <button
                        onClick={() => supprimerDocMutation.mutate({ id: doc.id })}
                        className="p-1 transition-colors duration-300"
                        style={{ color: "#3A3632" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                      >
                        <X className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignation courtiers */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "10px" }}>Envoyer a des courtiers</p>
            {courtiersActifs.length === 0 ? (
              <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#3A3632" }}>
                Aucun courtier actif dans le reseau.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {courtiersActifs.map((c: any) => {
                    const isSelected = selectedCourtiers.includes(c.id);
                    const dejaEnvoye = dossier.assignations?.some((a: any) => a.courtierId === c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => !dejaEnvoye && toggleCourtier(c.id)}
                        disabled={dejaEnvoye}
                        className="transition-colors duration-300"
                        style={{
                          padding: "6px 12px",
                          fontSize: "11px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                          borderRadius: "2px",
                          cursor: dejaEnvoye ? "default" : "pointer",
                          border: dejaEnvoye
                            ? "1px solid rgba(74,122,90,0.3)"
                            : isSelected
                            ? "1px solid #C9A84C"
                            : "1px solid #1E1E1E",
                          background: dejaEnvoye
                            ? "rgba(74,122,90,0.08)"
                            : isSelected
                            ? "rgba(201,168,76,0.1)"
                            : "transparent",
                          color: dejaEnvoye
                            ? "#4A7A5A"
                            : isSelected
                            ? "#C9A84C"
                            : "#6B6560",
                        }}
                      >
                        {dejaEnvoye && "OK "}{c.prenom} {c.nom}
                        {c.cabinetNom && <span style={{ color: "#3A3632", marginLeft: "4px" }}> · {c.cabinetNom}</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedCourtiers.length > 0 && (
                  <button
                    className="flex items-center gap-2 transition-colors duration-300"
                    style={{
                      padding: "10px 24px",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      background: "#C9A84C",
                      color: "#0A0A0A",
                      border: "none",
                      cursor: assignerMutation.isPending ? "not-allowed" : "pointer",
                      opacity: assignerMutation.isPending ? 0.6 : 1,
                    }}
                    onClick={() => assignerMutation.mutate({
                      dossierFinancementId: dossier.id,
                      courtierIds: selectedCourtiers,
                    })}
                    disabled={assignerMutation.isPending}
                    onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
                    onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
                  >
                    <Send className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                    Envoyer a {selectedCourtiers.length} courtier(s)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Assignations existantes */}
          {dossier.assignations && dossier.assignations.length > 0 && (
            <div>
              <p className="label-uppercase" style={{ marginBottom: "10px" }}>Suivi des envois</p>
              <div className="space-y-1">
                {dossier.assignations.map((a: any) => {
                  const courtier = courtiers.find((c: any) => c.id === a.courtierId);
                  const statutStyle = DOSSIER_STATUT_STYLES[a.statut] ?? { color: "#3A3632" };
                  return (
                    <div key={a.id} className="flex items-center justify-between" style={{
                      background: "#0A0A0A",
                      border: "1px solid #1E1E1E",
                      borderRadius: "2px",
                      padding: "8px 12px",
                    }}>
                      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#F0EDE6" }}>
                        {courtier ? `${courtier.prenom} ${courtier.nom}` : `Courtier #${a.courtierId}`}
                      </span>
                      <div className="flex items-center gap-3">
                        {a.noteCourtier && (
                          <span style={{
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            fontSize: "11px",
                            color: "#3A3632",
                            fontStyle: "italic",
                            maxWidth: "192px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}>
                            "{a.noteCourtier}"
                          </span>
                        )}
                        <span style={{
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          color: statutStyle.color,
                        }}>
                          {DOSSIER_STATUT_LABELS[a.statut] ?? a.statut}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CourtiersDashboard() {
  const [activeTab, setActiveTab] = useState<"reseau" | "dossiers" | "compteur">("reseau");
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("tous");
  const [selectedCourtier, setSelectedCourtier] = useState<number | null>(null);
  const [dossierSearch, setDossierSearch] = useState("");
  const [dossierStatut, setDossierStatut] = useState("tous");

  // ─── Triggers retard courtiers ───────────────────────────────────────────
  const { data: retardsCourtiers = [], refetch: refetchRetards } = trpc.triggers.checkRetardsCourtiers.useQuery();
  const declencherTrigger = trpc.triggers.declencherTriggerCourtier.useMutation({
    onSuccess: (data) => {
      toast.success(data.message ?? "Courtier suspendu et Manon notifiee");
      refetch();
      refetchRetards();
    },
    onError: (e) => toast.error(e.message),
  });
  const reactiverCourtier = trpc.triggers.reactiverCourtier.useMutation({
    onSuccess: () => { toast.success("Courtier reactive"); refetch(); refetchRetards(); },
    onError: (e) => toast.error(e.message),
  });

  const { data: courtiers = [], refetch } = trpc.courtiers.list.useQuery({
    statut: statutFilter as any,
    search: search || undefined,
  });

  const { data: detail } = trpc.courtiers.getById.useQuery(
    { id: selectedCourtier! },
    { enabled: !!selectedCourtier }
  );

  const { data: dossiers = [], refetch: refetchDossiers } = trpc.financement.lister.useQuery(
    { search: dossierSearch || undefined, statut: dossierStatut !== "tous" ? dossierStatut : undefined },
    { enabled: activeTab === "dossiers" }
  );

  const { data: allCourtiers = [] } = trpc.courtiers.list.useQuery(
    { statut: "tous" as any },
    { enabled: activeTab === "dossiers" }
  );

  const { data: statsCourtiers = [] } = trpc.financement.statsParCourtier.useQuery(
    undefined,
    { enabled: activeTab === "compteur" }
  );

  const updateStatut = trpc.courtiers.updateStatut.useMutation({
    onSuccess: () => { toast.success("Statut mis a jour"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const renvoyerBienvenue = trpc.courtiers.renvoyerEmailBienvenue.useMutation({
    onSuccess: (res) => toast.success(res.message ?? "Email de bienvenue envoye !"),
    onError: (e) => toast.error(e.message),
  });

  const deleteCourtier = trpc.courtiers.delete.useMutation({
    onSuccess: () => { toast.success("Courtier supprime"); refetch(); setSelectedCourtier(null); },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le courtier ${nom} ? Cette action est irreversible.`)) {
      deleteCourtier.mutate({ id });
    }
  };

  const stats = {
    total: courtiers.length,
    actifs: courtiers.filter((c: any) => c.statutInterne === "actif").length,
    enAttente: courtiers.filter((c: any) => c.statutInterne === "en_attente").length,
  };

  const dossierStats = {
    total: dossiers.length,
    nouveaux: dossiers.filter((d: any) => d.statut === "nouveau").length,
    envoyes: dossiers.filter((d: any) => d.statut === "envoye").length,
    valides: dossiers.filter((d: any) => d.statut === "valide").length,
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "32px 24px" }}>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: "32px" }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "28px",
              fontWeight: 700,
              color: "#F0EDE6",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              lineHeight: 1,
            }}>
              Courtage
            </h1>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "13px",
              color: "#3A3632",
              marginTop: "6px",
            }}>
              Reseau courtiers & dossiers de financement
            </p>
          </div>
          <Link href="/inscription-courtier">
            <button
              className="flex items-center gap-2 transition-colors duration-300"
              style={{
                padding: "12px 24px",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                background: "#C9A84C",
                color: "#0A0A0A",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
            >
              <Plus className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              Lien d'inscription
            </button>
          </Link>
        </div>

        {/* Onglets */}
        <div className="flex gap-1" style={{ borderBottom: "1px solid #1E1E1E", marginBottom: "32px" }}>
          {[
            { key: "reseau", label: "Reseau Courtiers", Icon: Users },
            { key: "dossiers", label: "Dossiers Courtage", Icon: FolderOpen },
            { key: "compteur", label: "Compteur Courtiers", Icon: CheckCircle },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="flex items-center gap-2 transition-colors duration-300"
              style={{
                padding: "10px 20px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                border: "none",
                borderBottom: activeTab === tab.key ? "1px solid #C9A84C" : "1px solid transparent",
                background: "transparent",
                color: activeTab === tab.key ? "#C9A84C" : "#3A3632",
                marginBottom: "-1px",
                cursor: "pointer",
              }}
            >
              <tab.Icon className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              {tab.label}
              {tab.key === "dossiers" && dossierStats.nouveaux > 0 && (
                <span style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "#F0EDE6",
                  background: "rgba(201,168,76,0.2)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: "2px",
                  padding: "1px 6px",
                }}>
                  {dossierStats.nouveaux}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Reseau Courtiers ── */}
        {activeTab === "reseau" && (
          <div className="space-y-8">
            {/* ── Panneau alertes retard ── */}
            {retardsCourtiers.length > 0 && (
              <div style={{
                border: "1px solid rgba(160,64,64,0.3)",
                borderRadius: "2px",
                background: "rgba(160,64,64,0.04)",
                padding: "20px",
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: "12px" }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: "#A04040", strokeWidth: 1.5 }} />
                  <span style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#A04040",
                  }}>
                    {retardsCourtiers.length} courtier(s) en retard — dossier(s) non traite(s) depuis plus de 72h
                  </span>
                </div>
                <div className="space-y-2">
                  {retardsCourtiers.map((r: any) => {
                    const heuresRetard = Math.floor((Date.now() - r.ancienneAssignationMs) / (1000 * 60 * 60));
                    return (
                      <div key={r.courtierId} className="flex items-center justify-between" style={{
                        background: "rgba(160,64,64,0.06)",
                        border: "1px solid rgba(160,64,64,0.15)",
                        borderRadius: "2px",
                        padding: "12px 16px",
                      }}>
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#A04040", strokeWidth: 1.5 }} />
                          <div>
                            <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>
                              {r.courtierNom}
                            </div>
                            <div className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#A04040" }}>
                              {r.nbDossiersEnRetard} dossier(s) · {heuresRetard}h de retard · {r.courtierEmail}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.statutInterne !== "suspendu" && (
                            <button
                              onClick={() => declencherTrigger.mutate({ courtierId: r.courtierId })}
                              disabled={declencherTrigger.isPending}
                              className="flex items-center gap-1.5 transition-colors duration-300"
                              style={{
                                padding: "6px 14px",
                                borderRadius: "2px",
                                fontSize: "11px",
                                fontFamily: "'Hanken Grotesk', sans-serif",
                                fontWeight: 500,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase" as const,
                                background: "#A04040",
                                color: "#F0EDE6",
                                border: "none",
                                cursor: declencherTrigger.isPending ? "not-allowed" : "pointer",
                              }}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                              Suspendre + Notifier Manon
                            </button>
                          )}
                          {r.statutInterne === "suspendu" && (
                            <button
                              onClick={() => reactiverCourtier.mutate({ courtierId: r.courtierId })}
                              disabled={reactiverCourtier.isPending}
                              className="flex items-center gap-1.5 transition-colors duration-300"
                              style={{
                                padding: "6px 14px",
                                borderRadius: "2px",
                                fontSize: "11px",
                                fontFamily: "'Hanken Grotesk', sans-serif",
                                fontWeight: 500,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase" as const,
                                background: "transparent",
                                color: "#4A7A5A",
                                border: "1px solid rgba(74,122,90,0.3)",
                                cursor: reactiverCourtier.isPending ? "not-allowed" : "pointer",
                              }}
                            >
                              <RefreshCw className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                              Reactiver
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
              {[
                { label: "Courtiers total", value: stats.total, accent: true },
                { label: "Actifs", value: stats.actifs, accent: false },
                { label: "En attente de validation", value: stats.enAttente, accent: false },
              ].map(s => (
                <div key={s.label} className="p-5" style={{ background: "#0A0A0A" }}>
                  <p className="tabular-nums" style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "32px",
                    fontWeight: 600,
                    color: s.accent ? "#C9A84C" : "#F0EDE6",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}>
                    {s.value}
                  </p>
                  <p className="label-uppercase mt-2">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                {/* Filtres */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                    <input
                      type="text"
                      placeholder="Rechercher un courtier..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
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
                    value={statutFilter}
                    onChange={e => setStatutFilter(e.target.value)}
                    style={{
                      background: "#111111",
                      border: "1px solid #1E1E1E",
                      borderRadius: "2px",
                      padding: "10px 14px",
                      fontSize: "13px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      color: "#F0EDE6",
                      outline: "none",
                      minWidth: "160px",
                    }}
                  >
                    <option value="tous">Tous</option>
                    <option value="en_attente">En attente</option>
                    <option value="actif">Actifs</option>
                    <option value="suspendu">Suspendus</option>
                    <option value="resilie">Resilies</option>
                  </select>
                </div>

                {/* Table courtiers */}
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                        {["Courtier", "Cabinet", "ORIAS", "Statut", "Niveau", "Derniere connexion", ""].map(h => (
                          <th key={h} className="text-left px-5 py-3 label-uppercase" style={{ background: "#0D0D0D" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {courtiers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-16">
                            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#3A3632" }}>Aucun courtier inscrit</p>
                          </td>
                        </tr>
                      )}
                      {courtiers.map((c: any) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCourtier(c.id)}
                          className="cursor-pointer transition-colors duration-300"
                          style={{
                            borderBottom: "1px solid #151515",
                            background: selectedCourtier === c.id ? "#161616" : "transparent",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                          onMouseLeave={e => (e.currentTarget.style.background = selectedCourtier === c.id ? "#161616" : "transparent")}
                        >
                          <td className="px-5 py-3">
                            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>
                              {c.prenom} {c.nom}
                            </p>
                            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {c.email}
                            </p>
                          </td>
                          <td className="px-5 py-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560" }}>
                            {c.cabinetNom || "--"}
                          </td>
                          <td className="px-5 py-3 tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560", fontVariantNumeric: "tabular-nums" }}>
                            {c.numeroOrias || "--"}
                          </td>
                          <td className="px-5 py-3">
                            <StatutBadge statut={c.statutInterne} map={STATUT_STYLES} />
                          </td>
                          <td className="px-5 py-3">
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: "2px",
                              fontSize: "10px",
                              fontFamily: "'Hanken Grotesk', sans-serif",
                              fontWeight: 500,
                              letterSpacing: "0.06em",
                              color: "#6B6560",
                              background: "rgba(107,101,96,0.08)",
                              border: "1px solid rgba(107,101,96,0.15)",
                            }}>
                              N{c.niveau}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {c.lastSignedIn ? (
                              <div>
                                <div className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#6B6560" }}>
                                  {new Date(c.lastSignedIn).toLocaleDateString("fr-FR")}
                                </div>
                                <div className="tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>
                                  {new Date(c.lastSignedIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>Jamais connecte</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <ChevronRight className="w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                              <button
                                onClick={(e) => handleDelete(e, c.id, `${c.prenom} ${c.nom}`)}
                                className="p-1 transition-colors duration-300"
                                style={{ color: "#3A3632" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                              >
                                <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Panel detail courtier */}
              <div className="space-y-4">
                {!selectedCourtier && (
                  <div style={{
                    background: "#111111",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "32px",
                    textAlign: "center",
                  }}>
                    <Users className="w-6 h-6 mx-auto" style={{ color: "#1E1E1E", strokeWidth: 1.5, marginBottom: "8px" }} />
                    <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#3A3632" }}>
                      Selectionnez un courtier
                    </p>
                  </div>
                )}
                {detail && (
                  <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                    <div style={{ marginBottom: "20px" }}>
                      <h3 style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#F0EDE6",
                        letterSpacing: "0.02em",
                      }}>
                        {detail.courtier.prenom} {detail.courtier.nom}
                      </h3>
                      <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "2px" }}>
                        {detail.courtier.email}
                      </p>
                      {detail.courtier.cabinetNom && (
                        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560", marginTop: "4px" }}>
                          {detail.courtier.cabinetNom}
                        </p>
                      )}
                    </div>

                    {/* Stats mini */}
                    <div className="grid grid-cols-2 gap-px" style={{ background: "#1E1E1E", borderRadius: "2px", marginBottom: "20px" }}>
                      <div className="p-4 text-center" style={{ background: "#0A0A0A" }}>
                        <div className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#F0EDE6", lineHeight: 1 }}>
                          {detail.stats.totalDossiers}
                        </div>
                        <p className="label-uppercase mt-1" style={{ fontSize: "10px" }}>Dossiers</p>
                      </div>
                      <div className="p-4 text-center" style={{ background: "#0A0A0A" }}>
                        <div className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#C9A84C", lineHeight: 1 }}>
                          {detail.stats.totalFilleuls}
                        </div>
                        <p className="label-uppercase mt-1" style={{ fontSize: "10px" }}>Filleuls</p>
                      </div>
                    </div>

                    {detail.courtier.conventionPdfUrl && (
                      <a href={detail.courtier.conventionPdfUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 transition-opacity duration-300 hover:opacity-70"
                        style={{
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontSize: "12px",
                          color: "#6B6560",
                          textDecoration: "none",
                          marginBottom: "16px",
                        }}
                      >
                        <FileText className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                        Voir la convention signee
                      </a>
                    )}

                    <button
                      className="flex items-center justify-center gap-2 w-full transition-colors duration-300"
                      disabled={renvoyerBienvenue.isPending}
                      onClick={() => renvoyerBienvenue.mutate({ id: detail.courtier.id })}
                      style={{
                        padding: "10px",
                        borderRadius: "2px",
                        fontSize: "11px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase" as const,
                        background: "transparent",
                        color: "#6B6560",
                        border: "1px solid #1E1E1E",
                        cursor: renvoyerBienvenue.isPending ? "not-allowed" : "pointer",
                        marginBottom: "20px",
                      }}
                    >
                      <Send className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                      {renvoyerBienvenue.isPending ? "Envoi en cours..." : "Renvoyer l'email de bienvenue"}
                    </button>

                    {/* Documents bidirectionnels */}
                    <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "20px", marginBottom: "20px" }}>
                      <PartnerDocumentsSection
                        partnerType="courtier"
                        partnerId={detail.courtier.id}
                        partnerNom={`${detail.courtier.prenom ?? ""} ${detail.courtier.nom}`}
                        partnerEmail={detail.courtier.email}
                        viewAs="admin"
                      />
                    </div>

                    <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "20px" }}>
                      <p className="label-uppercase" style={{ marginBottom: "10px" }}>Changer le statut</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["en_attente", "actif", "suspendu", "resilie"] as const).map(s => {
                          const isActive = detail.courtier.statutInterne === s;
                          return (
                            <button
                              key={s}
                              disabled={isActive}
                              onClick={() => updateStatut.mutate({ id: detail.courtier.id, statutInterne: s as any })}
                              className="transition-colors duration-300"
                              style={{
                                padding: "8px 12px",
                                borderRadius: "2px",
                                fontSize: "11px",
                                fontFamily: "'Hanken Grotesk', sans-serif",
                                fontWeight: 500,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase" as const,
                                border: "1px solid #1E1E1E",
                                background: "transparent",
                                color: isActive ? "#3A3632" : "#6B6560",
                                cursor: isActive ? "not-allowed" : "pointer",
                                opacity: isActive ? 0.4 : 1,
                              }}
                              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"; e.currentTarget.style.color = "#C9A84C"; } }}
                              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; } }}
                            >
                              {STATUT_LABELS[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Onglet Compteur Courtiers ── */}
        {activeTab === "compteur" && (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
              {[
                { label: "Courtiers avec dossiers", value: statsCourtiers.filter((s: any) => s.total > 0).length, accent: false },
                { label: "Total dossiers envoyes", value: statsCourtiers.reduce((acc: number, s: any) => acc + s.total, 0), accent: true },
                { label: "Dossiers valides", value: statsCourtiers.reduce((acc: number, s: any) => acc + s.valide, 0), accent: false },
              ].map(s => (
                <div key={s.label} className="p-5" style={{ background: "#0A0A0A" }}>
                  <p className="tabular-nums" style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "32px",
                    fontWeight: 600,
                    color: s.accent ? "#C9A84C" : "#F0EDE6",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}>
                    {s.value}
                  </p>
                  <p className="label-uppercase mt-2">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Alerte globale quota */}
            {statsCourtiers.some((s: any) => s.hebdo >= 10) && (
              <div className="flex items-center gap-3" style={{
                background: "rgba(201,168,76,0.04)",
                border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: "2px",
                padding: "16px 20px",
              }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#C9A84C", strokeWidth: 1.5 }} />
                <div>
                  <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", fontWeight: 500, color: "#C9A84C" }}>
                    Quota hebdomadaire atteint
                  </p>
                  <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#6B6560", marginTop: "2px" }}>
                    {statsCourtiers.filter((s: any) => s.hebdo >= 10).map((s: any) => s.courtierNom).join(", ")} — 10 dossiers assignes cette semaine.
                  </p>
                </div>
              </div>
            )}

            {/* Table compteur */}
            <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                    {["Courtier", "Cabinet", "Statut", "Regions", "Cette semaine", "Total", "En attente", "En cours", "Valides", "Refuses"].map(h => (
                      <th key={h} className={`${["Cette semaine", "Total", "En attente", "En cours", "Valides", "Refuses"].includes(h) ? "text-center" : "text-left"} px-5 py-3 label-uppercase`} style={{ background: "#0D0D0D" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statsCourtiers.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-16">
                      <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#3A3632" }}>Aucun courtier inscrit</p>
                    </td></tr>
                  )}
                  {statsCourtiers.map((s: any) => {
                    const quotaAtteint = s.hebdo >= 10;
                    return (
                    <tr key={s.courtierId}
                      className="transition-colors duration-300"
                      style={{ borderBottom: "1px solid #151515" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3">
                        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", fontWeight: 500, color: "#F0EDE6" }}>{s.courtierNom}</p>
                        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>{s.courtierEmail}</p>
                      </td>
                      <td className="px-5 py-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560" }}>
                        {s.cabinetNom || "--"}
                      </td>
                      <td className="px-5 py-3">
                        <StatutBadge statut={s.statutInterne} map={STATUT_STYLES} />
                      </td>
                      <td className="px-5 py-3">
                        {s.regions && s.regions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.regions.slice(0, 3).map((r: string) => (
                              <span key={r} style={{
                                fontFamily: "'Hanken Grotesk', sans-serif",
                                fontSize: "10px",
                                fontWeight: 500,
                                letterSpacing: "0.04em",
                                color: "#6B6560",
                                background: "rgba(107,101,96,0.08)",
                                border: "1px solid rgba(107,101,96,0.15)",
                                borderRadius: "2px",
                                padding: "2px 8px",
                              }}>{r}</span>
                            ))}
                            {s.regions.length > 3 && (
                              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "10px", color: "#3A3632" }}>+{s.regions.length - 3}</span>
                            )}
                          </div>
                        ) : <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632" }}>Non renseigne</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {quotaAtteint ? (
                          <span className="tabular-nums" style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "2px",
                            fontSize: "11px",
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            fontWeight: 600,
                            color: "#C9A84C",
                            background: "rgba(201,168,76,0.08)",
                            border: "1px solid rgba(201,168,76,0.2)",
                          }}>
                            {s.hebdo}
                          </span>
                        ) : (
                          <span className="tabular-nums" style={{
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: s.hebdo > 0 ? "#F0EDE6" : "#3A3632",
                          }}>{s.hebdo || "--"}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="tabular-nums" style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: "20px",
                          fontWeight: 600,
                          color: s.total > 0 ? "#C9A84C" : "#3A3632",
                        }}>{s.total}</span>
                      </td>
                      {[
                        { val: s.enAttente, style: DOSSIER_STATUT_STYLES.en_cours },
                        { val: s.enCours, style: DOSSIER_STATUT_STYLES.envoye },
                        { val: s.valide, style: DOSSIER_STATUT_STYLES.valide },
                        { val: s.refuse, style: DOSSIER_STATUT_STYLES.refuse },
                      ].map((cell, i) => (
                        <td key={i} className="px-5 py-3 text-center">
                          {cell.val > 0 ? (
                            <span className="tabular-nums" style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              borderRadius: "2px",
                              fontSize: "11px",
                              fontFamily: "'Hanken Grotesk', sans-serif",
                              fontWeight: 600,
                              color: cell.style.color,
                              background: cell.style.bg,
                              border: `1px solid ${cell.style.border}`,
                            }}>{cell.val}</span>
                          ) : <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "12px", color: "#3A3632" }}>--</span>}
                        </td>
                      ))}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {statsCourtiers.length > 0 && (
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "11px",
                color: "#3A3632",
                textAlign: "right",
              }}>
                Tri par nombre total de dossiers recus (decroissant)
              </p>
            )}
          </div>
        )}

        {/* ── Onglet Dossiers Courtage ── */}
        {activeTab === "dossiers" && (
          <div className="space-y-8">
            {/* KPIs dossiers */}
            <div className="grid grid-cols-4 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
              {[
                { label: "Total", value: dossierStats.total, accent: false },
                { label: "Nouveaux", value: dossierStats.nouveaux, accent: true },
                { label: "Envoyes", value: dossierStats.envoyes, accent: false },
                { label: "Valides", value: dossierStats.valides, accent: false },
              ].map((s, i) => (
                <div key={s.label} className="p-5" style={{ background: "#0A0A0A" }}>
                  <p className="tabular-nums" style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "32px",
                    fontWeight: 600,
                    color: s.accent ? "#C9A84C" : "#F0EDE6",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                  }}>
                    {s.value}
                  </p>
                  <p className="label-uppercase mt-2">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filtres */}
            <div className="flex gap-3">
              <div className="relative flex-1" style={{ maxWidth: "320px" }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                <input
                  type="text"
                  placeholder="Rechercher un lead..."
                  value={dossierSearch}
                  onChange={(e) => setDossierSearch(e.target.value)}
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
                value={dossierStatut}
                onChange={e => setDossierStatut(e.target.value)}
                style={{
                  background: "#111111",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#F0EDE6",
                  outline: "none",
                  minWidth: "160px",
                }}
              >
                <option value="tous">Tous les statuts</option>
                <option value="nouveau">Nouveaux</option>
                <option value="en_cours">En cours</option>
                <option value="envoye">Envoyes</option>
                <option value="valide">Valides</option>
                <option value="refuse">Refuses</option>
              </select>
            </div>

            {/* Liste dossiers */}
            <div className="space-y-2">
              {dossiers.length === 0 ? (
                <div style={{
                  background: "#111111",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "48px 32px",
                  textAlign: "center",
                }}>
                  <FolderOpen className="w-8 h-8 mx-auto" style={{ color: "#1E1E1E", strokeWidth: 1.5, marginBottom: "12px" }} />
                  <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#6B6560" }}>
                    Aucun dossier de courtage recu
                  </p>
                  <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", color: "#3A3632", marginTop: "4px" }}>
                    Les dossiers apparaissent ici quand les leads remplissent le Tableau de Courtage
                  </p>
                </div>
              ) : (
                dossiers.map((d: any) => (
                  <DossierCourtageRow
                    key={d.id}
                    dossier={d}
                    courtiers={allCourtiers}
                    onRefetch={refetchDossiers}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

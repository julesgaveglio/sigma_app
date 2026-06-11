import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import PartnerDocumentsSection from "@/components/PartnerDocumentsSection";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users,
  FileText,
  TrendingUp,
  Copy,
  Home,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Award,
  Share2,
  BarChart2,
  Wallet,
  AlertCircle,
  AlertTriangle,
  Pencil,
  X,
  Save,
  Lock,
  MessageSquare,
  MapPin,
} from "lucide-react";

const REGIONS_FRANCE = [
  "Auvergne-Rhone-Alpes", "Bourgogne-Franche-Comte", "Bretagne", "Centre-Val de Loire",
  "Corse", "Grand Est", "Hauts-de-France", "Ile-de-France", "Normandie",
  "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Cote d'Azur",
  "Guadeloupe", "Martinique", "Guyane", "La Reunion", "Mayotte"
];
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statutBadge(statut: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    en_attente: { label: "En attente", color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
    actif:      { label: "Actif",      color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
    suspendu:   { label: "Suspendu",   color: "#C9A84C", bg: "rgba(201,168,76,0.06)", border: "rgba(201,168,76,0.15)" },
    resilie:    { label: "Resilie",     color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
  };
  const s = map[statut] ?? { label: statut, color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" };
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
      {s.label}
    </span>
  );
}

function commissionBadge(statut: string) {
  const styles: Record<string, { color: string; label: string; Icon: any }> = {
    paye:   { color: "#4A7A5A", label: "Payee",      Icon: CheckCircle },
    valide: { color: "#6B6560", label: "Validee",    Icon: Clock },
    annule: { color: "#A04040", label: "Annulee",    Icon: XCircle },
  };
  const s = styles[statut] ?? { color: "#C9A84C", label: "En attente", Icon: Clock };
  return (
    <span className="flex items-center gap-1" style={{ color: s.color, fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <s.Icon size={12} style={{ strokeWidth: 1.5 }} /> {s.label}
    </span>
  );
}

function formatMois(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ─── Composant ContactResponsableForm ────────────────────────────────────────

function ContactResponsableForm({ isAgent, membreNom }: { isAgent: boolean; membreNom: string }) {
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const createTask = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success(`Demande envoyee a ${isAgent ? "Elodie" : "Manon"} !`);
      setSujet("");
      setMessage("");
      setSending(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi. Reessayez.");
      setSending(false);
    },
  });

  const handleSend = () => {
    if (!sujet.trim()) { toast.error("Veuillez indiquer un sujet."); return; }
    setSending(true);
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    createTask.mutate({
      titre: `📨 Message de ${membreNom || (isAgent ? "un agent" : "un courtier")} — ${sujet}`,
      assigneA: isAgent ? "Elodie" : "Manon",
      dateDebut: now.toISOString(),
      dateFin: inOneHour.toISOString(),
      description: message || undefined,
      statut: "a_faire",
    });
  };

  return (
    <div className="space-y-3">
      <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
        Envoyez un message a {isAgent ? "Elodie" : "Manon"} — une tache sera creee dans son calendrier.
      </p>
      <input
        type="text"
        placeholder="Sujet *"
        value={sujet}
        onChange={e => setSujet(e.target.value)}
        className="w-full transition-colors duration-300 focus:outline-none"
        style={{
          background: "#161616",
          border: "1px solid #1E1E1E",
          borderRadius: "2px",
          padding: "10px 14px",
          fontSize: "13px",
          fontFamily: "'Hanken Grotesk', sans-serif",
          color: "#F0EDE6",
        }}
        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
      />
      <textarea
        placeholder="Message (optionnel)"
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          background: "#161616",
          border: "1px solid #1E1E1E",
          borderRadius: "2px",
          padding: "10px 14px",
          fontSize: "13px",
          fontFamily: "'Hanken Grotesk', sans-serif",
          color: "#F0EDE6",
          resize: "none",
          outline: "none",
        }}
        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
      />
      <button
        onClick={handleSend}
        disabled={sending || !sujet.trim()}
        className="w-full transition-colors duration-300 disabled:cursor-not-allowed"
        style={{
          padding: "12px 28px",
          background: sending || !sujet.trim() ? "#8A7535" : "#C9A84C",
          color: "#0A0A0A",
          fontSize: "11px",
          fontWeight: 500,
          fontFamily: "'Hanken Grotesk', sans-serif",
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          borderRadius: "2px",
          border: "none",
          cursor: sending || !sujet.trim() ? "not-allowed" : "pointer",
        }}
      >
        {sending ? "Envoi..." : `Envoyer a ${isAgent ? "Elodie" : "Manon"}`}
      </button>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function PortailMembre() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"apercu" | "commissions" | "reseau" | "dossiers" | "documents" | "demandes" | "profil">("apercu");
  const [mesRegions, setMesRegions] = useState<string[]>([]);
  const [regionsInitialized, setRegionsInitialized] = useState(false);

  // ─── Mes demandes envoyees au responsable ────────────────────────────────────
  const { data: mesDemandes = [], refetch: refetchDemandes } = trpc.calendar.mesDemandes.useQuery(
    {},
    { enabled: activeTab === "demandes" }
  );
  const [editingBien, setEditingBien] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showChangeMdp, setShowChangeMdp] = useState(false);
  const [mdpForm, setMdpForm] = useState({ current: "", next: "", confirm: "" });
  const changeMdp = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Mot de passe modifie avec succes !");
      setShowChangeMdp(false);
      setMdpForm({ current: "", next: "", confirm: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // Profils
  const { data: profilAmbassadeur, isLoading: loadingAmb } = trpc.ambassadeurs.monProfil.useQuery();
  const { data: profilCourtier, isLoading: loadingCourt } = trpc.courtiers.monProfil.useQuery();

  // Donnees ambassadeur
  const { data: detailAmb } = trpc.ambassadeurs.byId.useQuery(
    { id: profilAmbassadeur?.id ?? 0 },
    { enabled: !!profilAmbassadeur }
  );

  // Donnees courtier
  const { data: detailCourt } = trpc.courtiers.getById.useQuery(
    { id: profilCourtier?.id ?? 0 },
    { enabled: !!profilCourtier }
  );

  const utils = trpc.useUtils();
  const updateBien = trpc.ambassadeurs.updateBien.useMutation({
    onSuccess: () => {
      toast.success("Bien mis a jour");
      setEditingBien(null);
      utils.ambassadeurs.byId.invalidate({ id: profilAmbassadeur?.id ?? 0 });
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Calculs derives (hooks avant tout return conditionnel) ────────────────
  const _isAgent = !!profilAmbassadeur;
  const _allCommissions = _isAgent ? (detailAmb?.commissions ?? []) : (detailCourt?.commissions ?? []);
  const historiqueParMois = useMemo(() => {
    const moisMap: Record<string, { mois: string; total: number; paye: number; count: number }> = {};
    _allCommissions.forEach((c: any) => {
      const dateRef = c.dateEncaissement ?? c.createdAt;
      if (!dateRef) return;
      const d = new Date(dateRef);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!moisMap[key]) {
        moisMap[key] = {
          mois: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
          total: 0,
          paye: 0,
          count: 0,
        };
      }
      moisMap[key].total += c.montantHt ?? 0;
      if (c.statut === "paye") moisMap[key].paye += c.montantHt ?? 0;
      moisMap[key].count++;
    });
    return Object.entries(moisMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v);
  }, [_allCommissions]);

  // ─── Auth guard ────────────────────────────────────────────────────────────
  if (authLoading || loadingAmb || loadingCourt) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // ─── Pas encore inscrit dans le reseau ────────────────────────────────────
  if (!profilAmbassadeur && !profilCourtier) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0A0A0A" }}>
        <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", maxWidth: "440px", width: "100%", padding: "48px 32px", textAlign: "center" }}>
          <Award className="mx-auto mb-5" size={32} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.04em", marginBottom: "8px" }}>
            Vous n'etes pas encore inscrit dans le reseau
          </h2>
          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginBottom: "32px" }}>
            Pour rejoindre le reseau Sigma Factory, inscrivez-vous en tant qu'agent ou courtier.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/ambassadeur")}
              className="flex items-center gap-2 transition-colors duration-300"
              style={{
                padding: "12px 24px",
                background: "#C9A84C",
                color: "#0A0A0A",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Home size={14} style={{ strokeWidth: 1.5 }} /> Agent Immo
            </button>
            <button
              onClick={() => navigate("/inscription-courtier")}
              className="flex items-center gap-2 transition-colors duration-300"
              style={{
                padding: "12px 24px",
                background: "transparent",
                color: "#F0EDE6",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                border: "1px solid #1E1E1E",
                cursor: "pointer",
              }}
            >
              <CreditCard size={14} style={{ strokeWidth: 1.5 }} /> Courtier
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Determine le type de membre ──────────────────────────────────────────
  const isAgent = !!profilAmbassadeur;
  const profil = isAgent ? profilAmbassadeur : profilCourtier!;

  // Initialiser les regions depuis le profil (une seule fois)
  useEffect(() => {
    if (profil && !regionsInitialized) {
      const raw = (profil as any).regionsOperation;
      if (raw) { try { setMesRegions(JSON.parse(raw)); } catch {} }
      setRegionsInitialized(true);
    }
  }, [profil, regionsInitialized]);

  const updateMesRegionsCourtier = trpc.courtiers.updateMesRegions.useMutation({
    onSuccess: () => toast.success("Regions mises a jour !"),
    onError: () => toast.error("Erreur lors de la mise a jour"),
  });
  const updateMesRegionsAgent = trpc.ambassadeurs.updateMesRegions.useMutation({
    onSuccess: () => toast.success("Regions mises a jour !"),
    onError: () => toast.error("Erreur lors de la mise a jour"),
  });
  const handleSaveRegions = () => {
    if (isAgent) updateMesRegionsAgent.mutate({ regionsOperation: mesRegions });
    else updateMesRegionsCourtier.mutate({ regionsOperation: mesRegions });
  };
  const typeLabel = isAgent ? "Agent Immobilier" : "Courtier";
  const codeParrain = profil.codeParrain ?? "—";
  const lienParrainage = `${window.location.origin}/rejoindre?parrain=${encodeURIComponent(codeParrain)}`;
  const contratUrl = isAgent ? profilAmbassadeur?.contratPdfUrl : profilCourtier?.conventionPdfUrl;
  const contratSigne = isAgent ? profilAmbassadeur?.contratSigne : profilCourtier?.conventionSignee;

  // Filleuls
  const filleulsAgentsN1 = isAgent
    ? (detailAmb?.filleuls ?? [])
    : (detailCourt?.filleulsAmbassadeurs ?? []);
  const filleulsCourtiersN1 = isAgent
    ? (detailAmb?.filleulsCourtiers ?? [])
    : (detailCourt?.filleulsCourtiers ?? []);
  const totalFilleuls = filleulsAgentsN1.length + filleulsCourtiersN1.length;

  // Commissions
  const allCommissions = isAgent ? (detailAmb?.commissions ?? []) : (detailCourt?.commissions ?? []);
  const totalCommissions = allCommissions.reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0);
  const commissionsPayeesArr = allCommissions.filter((c: any) => c.statut === "paye");
  const commissionsEnAttenteArr = allCommissions.filter((c: any) => c.statut === "a_payer" || c.statut === "valide");
  const totalPaye = commissionsPayeesArr.reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0);
  const totalEnAttente = commissionsEnAttenteArr.reduce((s: number, c: any) => s + (c.montantHt ?? 0), 0);

  // Dossiers/Biens
  const dossiers = isAgent ? (detailAmb?.biens ?? []) : (detailCourt?.dossiers ?? []);

  const copyCode = () => {
    navigator.clipboard.writeText(codeParrain);
    setCopiedCode(true);
    toast.success("Code copie !");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(lienParrainage);
    setCopiedLink(true);
    toast.success("Lien de parrainage copie !");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ─── Shared inline style helpers ───────────────────────────────────────────
  const sPanel: React.CSSProperties = { background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" };
  const sRaised: React.CSSProperties = { background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px" };

  return (
    <>
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      {/* Banniere suspension */}
      {profil.statutInterne === "suspendu" && (
        <div className="flex items-center gap-3 px-6 py-3" style={{ borderBottom: "1px solid rgba(160,64,64,0.3)", background: "rgba(160,64,64,0.06)" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#A04040", strokeWidth: 1.5 }} />
          <div>
            <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, color: "#A04040" }}>Compte suspendu</span>
            <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginLeft: "8px" }}>
              {isAgent
                ? "Votre compte a ete suspendu automatiquement (inactivite > 30 jours). Contactez Elodie pour reactiver votre acces."
                : "Votre compte a ete suspendu automatiquement (dossier non traite > 72h). Contactez Manon pour reactiver votre acces."
              }
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E1E1E" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="flex items-center gap-3">
            <Award size={18} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
            <div>
              <p className="label-uppercase" style={{ marginBottom: "2px" }}>{typeLabel}</p>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em", lineHeight: 1 }}>
                {profil.prenom} {profil.nom}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statutBadge(profil.statutInterne)}
            {contratUrl && (
              <button
                onClick={() => window.open(contratUrl, "_blank")}
                className="flex items-center gap-1.5 transition-colors duration-300"
                style={{
                  padding: "8px 16px",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  color: "#F0EDE6",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                <FileText size={13} style={{ strokeWidth: 1.5 }} /> Telecharger mon contrat
              </button>
            )}
            <button
              onClick={() => setShowChangeMdp(true)}
              className="flex items-center gap-1.5 transition-colors duration-300"
              style={{
                padding: "8px 16px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "#6B6560",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
            >
              <Lock size={13} style={{ strokeWidth: 1.5 }} /> Mot de passe
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Code parrain + lien partageable */}
        <div className="mb-8 p-5" style={{ ...sPanel, borderColor: "rgba(201,168,76,0.15)" }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="label-uppercase" style={{ marginBottom: "4px" }}>Votre code parrain</p>
              <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 600, color: "#C9A84C", letterSpacing: "0.08em", lineHeight: 1 }}>
                {codeParrain}
              </p>
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "6px" }}>
                Partagez ce code pour recruter dans votre reseau
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 transition-colors duration-300"
                style={{
                  padding: "10px 20px",
                  background: "#C9A84C",
                  color: "#0A0A0A",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Copy size={13} style={{ strokeWidth: 1.5 }} />
                {copiedCode ? "Copie !" : "Code"}
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 transition-colors duration-300"
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "#F0EDE6",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "1px solid #1E1E1E",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                <Share2 size={13} style={{ strokeWidth: 1.5 }} />
                {copiedLink ? "Copie !" : "Lien d'invitation"}
              </button>
              <button
                onClick={() => navigate(`/parrainage/${encodeURIComponent(codeParrain)}`)}
                className="flex items-center gap-1.5 transition-colors duration-300"
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "#6B6560",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "1px solid #1E1E1E",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                <ChevronRight size={13} style={{ strokeWidth: 1.5 }} /> Voir la page
              </button>
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-8" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
          {[
            { label: isAgent ? "Biens soumis" : "Dossiers", value: dossiers.length, icon: isAgent ? Home : CreditCard, gold: false },
            { label: "Filleuls reseau", value: totalFilleuls, icon: Users, gold: false },
            { label: "Commissions payees", value: `${totalPaye.toLocaleString("fr-FR")} EUR`, icon: Wallet, gold: false },
            { label: "En attente", value: `${totalEnAttente.toLocaleString("fr-FR")} EUR`, icon: AlertCircle, gold: true },
          ].map((stat) => (
            <div key={stat.label} className="p-5" style={{ background: "#0A0A0A" }}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                <p className="label-uppercase">{stat.label}</p>
              </div>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 600,
                color: stat.gold ? "#C9A84C" : "#F0EDE6",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex gap-0 mb-8" style={{ borderBottom: "1px solid #1E1E1E" }}>
          {[
            { id: "apercu", label: "Apercu", icon: BarChart2 },
            { id: "commissions", label: `Commissions (${allCommissions.length})`, icon: TrendingUp },
            { id: "reseau", label: `Reseau (${totalFilleuls})`, icon: Users },
            { id: "dossiers", label: isAgent ? `Biens (${dossiers.length})` : `Dossiers (${dossiers.length})`, icon: isAgent ? Home : CreditCard },
            { id: "documents", label: "Documents", icon: FileText },
            { id: "demandes", label: "Mes demandes", icon: AlertTriangle },
            { id: "profil", label: "Mon profil", icon: MapPin },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-1.5 transition-colors duration-300"
              style={{
                padding: "10px 16px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: activeTab === tab.id ? "#F0EDE6" : "#3A3632",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "1px solid #C9A84C" : "1px solid transparent",
                cursor: "pointer",
                marginBottom: "-1px",
              }}
            >
              <tab.icon size={13} style={{ strokeWidth: 1.5 }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ONGLET APERCU ── */}
        {activeTab === "apercu" && (
          <div className="space-y-8">
            {/* Resume financier */}
            <div style={sPanel}>
              <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E1E" }}>
                <TrendingUp size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Resume financier</p>
              </div>
              <div className="grid grid-cols-3 gap-px" style={{ background: "#1E1E1E" }}>
                <div className="p-5 text-center" style={{ background: "#111111" }}>
                  <p className="label-uppercase mb-2">Total genere</p>
                  <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#F0EDE6", lineHeight: 1 }}>
                    {totalCommissions.toLocaleString("fr-FR")} EUR
                  </p>
                </div>
                <div className="p-5 text-center" style={{ background: "#111111" }}>
                  <p className="label-uppercase mb-2">Paye</p>
                  <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#4A7A5A", lineHeight: 1 }}>
                    {totalPaye.toLocaleString("fr-FR")} EUR
                  </p>
                </div>
                <div className="p-5 text-center" style={{ background: "#111111" }}>
                  <p className="label-uppercase mb-2">En attente</p>
                  <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#C9A84C", lineHeight: 1 }}>
                    {totalEnAttente.toLocaleString("fr-FR")} EUR
                  </p>
                </div>
              </div>
            </div>

            {/* Dernieres commissions */}
            {allCommissions.length > 0 && (
              <div style={sPanel}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1E1E1E" }}>
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                    <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Dernieres commissions</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("commissions")}
                    className="transition-opacity duration-300 hover:opacity-70"
                    style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", letterSpacing: "0.04em", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Voir tout →
                  </button>
                </div>
                <div className="p-5 space-y-2">
                  {allCommissions.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 transition-colors duration-300" style={sRaised}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                    >
                      <div>
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                          {c.description ?? c.typeDossier ?? "Commission reseau"}
                        </p>
                        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                          {formatMois(c.dateEncaissement ?? c.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                          {(c.montantHt ?? 0).toLocaleString("fr-FR")} EUR
                        </p>
                        <div>{commissionBadge(c.statut)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reseau rapide */}
            {totalFilleuls > 0 && (
              <div style={sPanel}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1E1E1E" }}>
                  <div className="flex items-center gap-2">
                    <Users size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                    <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Mon reseau</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("reseau")}
                    className="transition-opacity duration-300 hover:opacity-70"
                    style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", letterSpacing: "0.04em", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Voir tout →
                  </button>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-px" style={{ background: "#1E1E1E", borderRadius: "2px" }}>
                    {filleulsAgentsN1.length > 0 && (
                      <div className="p-4 text-center" style={{ background: "#111111" }}>
                        <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 600, color: "#F0EDE6", lineHeight: 1 }}>
                          {filleulsAgentsN1.length}
                        </p>
                        <p className="label-uppercase mt-2" style={{ fontSize: "10px" }}>Agent{filleulsAgentsN1.length > 1 ? "s" : ""} N1</p>
                      </div>
                    )}
                    {filleulsCourtiersN1.length > 0 && (
                      <div className="p-4 text-center" style={{ background: "#111111" }}>
                        <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 600, color: "#F0EDE6", lineHeight: 1 }}>
                          {filleulsCourtiersN1.length}
                        </p>
                        <p className="label-uppercase mt-2" style={{ fontSize: "10px" }}>Courtier{filleulsCourtiersN1.length > 1 ? "s" : ""} N1</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contacter le responsable */}
            <div style={sPanel}>
              <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E1E" }}>
                <MessageSquare size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Contacter {isAgent ? "Elodie" : "Manon"}</p>
              </div>
              <div className="p-5">
                <ContactResponsableForm isAgent={isAgent} membreNom={profil ? `${(profil as any).prenom ?? ""} ${(profil as any).nom ?? ""}`.trim() : ""} />
              </div>
            </div>

            {/* Vide */}
            {dossiers.length === 0 && allCommissions.length === 0 && totalFilleuls === 0 && (
              <div className="py-12 text-center" style={sPanel}>
                <ChevronRight size={24} className="mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Votre espace est pret.</p>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                  {isAgent
                    ? "Vos biens soumis et vos commissions apparaitront ici."
                    : "Vos dossiers et vos commissions apparaitront ici."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET COMMISSIONS ── */}
        {activeTab === "commissions" && (
          <div className="space-y-8">
            {/* Resume */}
            <div className="grid grid-cols-3 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
              <div className="p-5 text-center" style={{ background: "#0A0A0A" }}>
                <p className="label-uppercase mb-2">Total genere</p>
                <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#F0EDE6", lineHeight: 1 }}>
                  {totalCommissions.toLocaleString("fr-FR")} EUR
                </p>
                <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                  {allCommissions.length} commission{allCommissions.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-5 text-center" style={{ background: "#0A0A0A" }}>
                <p className="label-uppercase mb-2">Paye</p>
                <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#4A7A5A", lineHeight: 1 }}>
                  {totalPaye.toLocaleString("fr-FR")} EUR
                </p>
                <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                  {commissionsPayeesArr.length} paiement{commissionsPayeesArr.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-5 text-center" style={{ background: "#0A0A0A" }}>
                <p className="label-uppercase mb-2">En attente</p>
                <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#C9A84C", lineHeight: 1 }}>
                  {totalEnAttente.toLocaleString("fr-FR")} EUR
                </p>
                <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                  {commissionsEnAttenteArr.length} en cours
                </p>
              </div>
            </div>

            {/* Historique mensuel */}
            {historiqueParMois.length > 0 && (
              <div style={sPanel}>
                <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E1E" }}>
                  <BarChart2 size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                  <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Historique mensuel</p>
                </div>
                <div className="p-5 space-y-4">
                  {historiqueParMois.map((m, i) => {
                    const maxTotal = Math.max(...historiqueParMois.map(x => x.total), 1);
                    const pct = Math.round((m.total / maxTotal) * 100);
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", textTransform: "capitalize" as const }}>{m.mois}</span>
                          <div className="flex items-center gap-4">
                            <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#4A7A5A" }}>{m.paye.toLocaleString("fr-FR")} EUR paye</span>
                            <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{m.total.toLocaleString("fr-FR")} EUR total</span>
                            <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{m.count} ligne{m.count > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div style={{ height: "3px", background: "#1E1E1E", borderRadius: "1px", overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "#C9A84C", borderRadius: "1px", width: `${pct}%`, transition: "width 300ms ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Liste detaillee */}
            {allCommissions.length > 0 ? (
              <div style={sPanel}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid #1E1E1E" }}>
                  <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Detail des commissions</p>
                </div>
                <div className="p-5 space-y-2">
                  {allCommissions.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 transition-colors duration-300" style={sRaised}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                    >
                      <div>
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                          {c.description ?? c.typeDossier ?? "Commission reseau"}
                        </p>
                        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                          {formatMois(c.dateEncaissement ?? c.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                          {(c.montantHt ?? 0).toLocaleString("fr-FR")} EUR
                        </p>
                        <div>{commissionBadge(c.statut)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center" style={sPanel}>
                <TrendingUp size={24} className="mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Aucune commission pour le moment.</p>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                  Vos commissions apparaitront ici des validation d'un dossier.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET RESEAU ── */}
        {activeTab === "reseau" && (
          <div className="space-y-8">
            {/* KPIs reseau */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
              {[
                { label: "Total filleuls", value: totalFilleuls, color: "#F0EDE6" },
                { label: "Commissions generees", value: `${(totalCommissions / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`, color: "#F0EDE6" },
                { label: "Payees", value: `${(totalPaye / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`, color: "#4A7A5A" },
                { label: "En attente", value: `${(totalEnAttente / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`, color: "#C9A84C" },
              ].map(kpi => (
                <div key={kpi.label} className="p-5" style={{ background: "#0A0A0A" }}>
                  <p className="label-uppercase mb-2">{kpi.label}</p>
                  <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: kpi.color, lineHeight: 1 }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Lien de parrainage */}
            <div className="p-5" style={{ ...sPanel, borderColor: "rgba(201,168,76,0.15)" }}>
              <p className="label-uppercase mb-3" style={{ color: "#C9A84C" }}>Mon lien de parrainage</p>
              <div className="flex items-center gap-2">
                <code style={{
                  flex: 1,
                  background: "#0A0A0A",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "8px 12px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#6B6560",
                  wordBreak: "break-all" as const,
                }}>
                  {lienParrainage}
                </code>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 shrink-0 transition-colors duration-300"
                  style={{
                    padding: "8px 16px",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    color: "#F0EDE6",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                >
                  <Share2 size={12} style={{ strokeWidth: 1.5 }} /> {copiedLink ? "Copie !" : "Copier"}
                </button>
              </div>
              <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "8px" }}>
                Ce lien pre-remplit automatiquement votre code parrain dans le formulaire d'inscription
              </p>
            </div>

            {/* Filleuls */}
            {totalFilleuls === 0 ? (
              <div className="py-12 text-center" style={sPanel}>
                <Users size={24} className="mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Votre reseau est vide pour l'instant.</p>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                  Partagez votre lien ci-dessus pour recruter vos premiers filleuls.
                </p>
              </div>
            ) : (
              <>
                {filleulsAgentsN1.length > 0 && (
                  <div style={sPanel}>
                    <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <Home size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                      <p className="label-uppercase" style={{ color: "#F0EDE6" }}>
                        Agents parraines ({filleulsAgentsN1.length})
                      </p>
                      <span style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#C9A84C", letterSpacing: "0.04em" }}>10% residuel</span>
                    </div>
                    <div className="p-5 space-y-2">
                      {filleulsAgentsN1.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between p-3 transition-colors duration-300" style={sRaised}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                        >
                          <div>
                            <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{f.prenom} {f.nom}</span>
                            <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginLeft: "8px" }}>{f.ville}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {statutBadge(f.statutInterne)}
                            <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                              {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filleulsCourtiersN1.length > 0 && (
                  <div style={sPanel}>
                    <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <CreditCard size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                      <p className="label-uppercase" style={{ color: "#F0EDE6" }}>
                        Courtiers parraines ({filleulsCourtiersN1.length})
                      </p>
                      <span style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#C9A84C", letterSpacing: "0.04em" }}>10% residuel</span>
                    </div>
                    <div className="p-5 space-y-2">
                      {filleulsCourtiersN1.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between p-3 transition-colors duration-300" style={sRaised}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                        >
                          <div>
                            <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{f.prenom} {f.nom}</span>
                            <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginLeft: "8px" }}>{f.ville}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {statutBadge(f.statutInterne)}
                            <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                              {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ONGLET DOSSIERS / BIENS ── */}
        {activeTab === "dossiers" && (
          <div className="space-y-6">
            {/* CTA Deposer un bien (agent uniquement) */}
            {isAgent && (
              <div className="flex justify-end">
                <button
                  onClick={() => navigate("/ambassadeur/bien")}
                  className="flex items-center gap-2 transition-colors duration-300"
                  style={{
                    padding: "12px 24px",
                    background: "#C9A84C",
                    color: "#0A0A0A",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    borderRadius: "2px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Home size={13} style={{ strokeWidth: 1.5 }} /> Deposer un bien
                </button>
              </div>
            )}
            {dossiers.length === 0 ? (
              <div className="py-12 text-center" style={sPanel}>
                {isAgent
                  ? <Home size={24} className="mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
                  : <CreditCard size={24} className="mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
                }
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
                  {isAgent ? "Aucun bien soumis pour l'instant." : "Aucun dossier pour l'instant."}
                </p>
                {isAgent && (
                  <button
                    onClick={() => navigate("/ambassadeur/bien")}
                    className="flex items-center gap-2 mx-auto mt-4 transition-colors duration-300"
                    style={{
                      padding: "10px 20px",
                      background: "#C9A84C",
                      color: "#0A0A0A",
                      fontSize: "11px",
                      fontWeight: 500,
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      borderRadius: "2px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Home size={13} style={{ strokeWidth: 1.5 }} /> Soumettre mon premier bien
                  </button>
                )}
              </div>
            ) : (
              <div style={sPanel}>
                <div className="p-5 space-y-2">
                  {dossiers.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 transition-colors duration-300" style={sRaised}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                    >
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                          {isAgent
                            ? (d.titre ?? d.adresse ?? `Bien #${d.id}`)
                            : (d.clientNom ?? `Dossier #${d.id}`)}
                        </p>
                        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                          {isAgent
                            ? `${d.typeBien ?? ""} — ${d.ville ?? ""}`
                            : `${d.typeDossier?.replace(/_/g, " ") ?? ""}`}
                        </p>
                        <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                          {d.createdAt ? new Date(d.createdAt).toLocaleDateString("fr-FR") : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
                          {isAgent ? (d.statutBien ?? "—") : (d.statut ?? "—")}
                        </span>
                        {isAgent && d.prix && (
                          <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                            {(d.prix / 1000).toFixed(0)}k EUR
                          </span>
                        )}
                        {!isAgent && d.montantFinancement && (
                          <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                            {(d.montantFinancement / 1000).toFixed(0)}k EUR
                          </span>
                        )}
                        {isAgent && (
                          <button
                            onClick={() => { setEditingBien(d); setEditForm({ titre: d.titre ?? "", prix: d.prix ?? "", surface: d.surface ?? "", nbPieces: d.nbPieces ?? "", description: d.description ?? "", pointsForts: d.pointsForts ?? "" }); }}
                            className="p-1.5 transition-opacity duration-300 hover:opacity-70"
                            style={{ color: "#3A3632", background: "transparent", border: "none", cursor: "pointer" }}
                          >
                            <Pencil size={13} style={{ strokeWidth: 1.5 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET MES DEMANDES ── */}
        {activeTab === "demandes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "#F0EDE6" }}>
                  Mes demandes envoyees a {isAgent ? "Elodie" : "Manon"}
                </p>
              </div>
              <button
                onClick={() => refetchDemandes()}
                className="transition-opacity duration-300 hover:opacity-70"
                style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Actualiser
              </button>
            </div>
            {mesDemandes.length === 0 ? (
              <div className="py-12 text-center" style={sPanel}>
                <MessageSquare size={24} className="mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
                  Aucune demande envoyee pour l'instant.
                </p>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                  Utilisez le formulaire dans l'onglet "Apercu" pour contacter {isAgent ? "Elodie" : "Manon"}.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {mesDemandes.map((task: any) => {
                  const statutStyles: Record<string, { color: string; bg: string; border: string }> = {
                    a_faire:  { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
                    en_cours: { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
                    termine:  { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
                  };
                  const statutLabels: Record<string, string> = {
                    a_faire: "A faire",
                    en_cours: "En cours",
                    termine: "Termine",
                  };
                  const ss = statutStyles[task.statut] ?? { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" };
                  return (
                    <div key={task.id} className="flex items-start justify-between gap-4 p-4" style={sPanel}>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                          {task.titre}
                        </p>
                        {task.description && (
                          <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                            {task.description}
                          </p>
                        )}
                        <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
                          {new Date(task.dateDebut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                          {" a "}
                          {new Date(task.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                        </p>
                      </div>
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
                        whiteSpace: "nowrap" as const,
                        color: ss.color,
                        background: ss.bg,
                        border: `1px solid ${ss.border}`,
                      }}>
                        {statutLabels[task.statut] ?? task.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET DOCUMENTS ── */}
        {activeTab === "documents" && (
          <div style={sPanel}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1E1E1E" }}>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "#F0EDE6" }}>
                  Echange de documents avec {isAgent ? "Elodie" : "Manon"}
                </p>
              </div>
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                Envoyez des documents ou consultez ceux qui vous ont ete transmis.
              </p>
            </div>
            <div className="p-5">
              {isAgent && profilAmbassadeur ? (
                <PartnerDocumentsSection
                  partnerType="agent"
                  partnerId={profilAmbassadeur.id}
                  partnerNom={`${profilAmbassadeur.prenom ?? ""} ${profilAmbassadeur.nom}`}
                  partnerEmail={profilAmbassadeur.email}
                  viewAs="partner"
                />
              ) : profilCourtier ? (
                <PartnerDocumentsSection
                  partnerType="courtier"
                  partnerId={profilCourtier.id}
                  partnerNom={`${profilCourtier.prenom ?? ""} ${profilCourtier.nom}`}
                  partnerEmail={profilCourtier.email}
                  viewAs="partner"
                />
              ) : null}
            </div>
          </div>
        )}

        {/* ── Onglet Mon Profil ── */}
        {activeTab === "profil" && (
          <div style={sPanel}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1E1E1E" }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Regions d'operation</p>
              </div>
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                Indiquez les regions ou vous exercez. {isAgent ? "Elodie" : "Manon"} utilisera cette information pour vous assigner les dossiers correspondants.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {mesRegions.map(r => (
                  <span key={r} className="flex items-center gap-1.5" style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    color: "#F0EDE6",
                    background: "rgba(201,168,76,0.06)",
                    border: "1px solid rgba(201,168,76,0.15)",
                    borderRadius: "2px",
                  }}>
                    {r}
                    <button
                      onClick={() => setMesRegions(prev => prev.filter(x => x !== r))}
                      className="transition-opacity duration-300 hover:opacity-70"
                      style={{ color: "#6B6560", background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: "2px" }}
                    >
                      <X className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                    </button>
                  </span>
                ))}
                {mesRegions.length === 0 && (
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic" }}>
                    Aucune region renseignee
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  style={{
                    flex: 1,
                    background: "#161616",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                    outline: "none",
                  }}
                  onChange={e => {
                    const val = e.target.value;
                    if (val && !mesRegions.includes(val)) setMesRegions(prev => [...prev, val]);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Ajouter une region...</option>
                  {REGIONS_FRANCE.filter(r => !mesRegions.includes(r)).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  onClick={handleSaveRegions}
                  disabled={updateMesRegionsCourtier.isPending || updateMesRegionsAgent.isPending}
                  className="transition-colors duration-300"
                  style={{
                    padding: "10px 24px",
                    background: (updateMesRegionsCourtier.isPending || updateMesRegionsAgent.isPending) ? "#8A7535" : "#C9A84C",
                    color: "#0A0A0A",
                    fontSize: "11px",
                    fontWeight: 500,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    borderRadius: "2px",
                    border: "none",
                    cursor: (updateMesRegionsCourtier.isPending || updateMesRegionsAgent.isPending) ? "not-allowed" : "pointer",
                  }}
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>

    {/* Modale edition bien */}
    <Dialog open={!!editingBien} onOpenChange={open => !open && setEditingBien(null)}>
      <DialogContent className="border-0 p-0 max-w-lg max-h-[80vh] overflow-y-auto" style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E1E" }}>
          <Pencil size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>
            Modifier le bien
          </h3>
        </div>
        {editingBien && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Titre</label>
              <input
                type="text"
                value={editForm.titre}
                onChange={e => setEditForm(f => ({ ...f, titre: e.target.value }))}
                className="w-full focus:outline-none transition-colors duration-300"
                style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Prix (EUR)</label>
                <input
                  type="number"
                  value={editForm.prix}
                  onChange={e => setEditForm(f => ({ ...f, prix: Number(e.target.value) }))}
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div>
                <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Surface (m2)</label>
                <input
                  type="number"
                  value={editForm.surface}
                  onChange={e => setEditForm(f => ({ ...f, surface: Number(e.target.value) }))}
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div>
                <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Pieces</label>
                <input
                  type="number"
                  value={editForm.nbPieces}
                  onChange={e => setEditForm(f => ({ ...f, nbPieces: Number(e.target.value) }))}
                  className="w-full focus:outline-none transition-colors duration-300"
                  style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
            </div>
            <div>
              <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Description</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{ width: "100%", background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", resize: "none", outline: "none" }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>
            <div>
              <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Points forts</label>
              <textarea
                value={editForm.pointsForts}
                onChange={e => setEditForm(f => ({ ...f, pointsForts: e.target.value }))}
                rows={2}
                placeholder="Calme, lumineux, vue degagee..."
                style={{ width: "100%", background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", resize: "none", outline: "none" }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
              Le statut de publication ne peut etre modifie que par l'equipe Sigma.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingBien(null)}
                className="flex items-center gap-1 transition-opacity duration-300 hover:opacity-70"
                style={{ padding: "10px 20px", fontSize: "11px", fontWeight: 500, fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#6B6560", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <X size={13} style={{ strokeWidth: 1.5 }} /> Annuler
              </button>
              <button
                onClick={() => updateBien.mutate({ id: editingBien.id, ...editForm })}
                disabled={updateBien.isPending}
                className="flex items-center gap-1 transition-colors duration-300"
                style={{
                  padding: "10px 24px",
                  background: updateBien.isPending ? "#8A7535" : "#C9A84C",
                  color: "#0A0A0A",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "none",
                  cursor: updateBien.isPending ? "not-allowed" : "pointer",
                }}
              >
                <Save size={13} style={{ strokeWidth: 1.5 }} /> {updateBien.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modale changement de mot de passe */}
    <Dialog open={showChangeMdp} onOpenChange={setShowChangeMdp}>
      <DialogContent className="border-0 p-0 max-w-md" style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1E1E1E" }}>
          <Lock size={14} style={{ color: "#6B6560", strokeWidth: 1.5 }} />
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>
            Changer mon mot de passe
          </h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Mot de passe actuel</label>
            <input
              type="password"
              value={mdpForm.current}
              onChange={e => setMdpForm(f => ({ ...f, current: e.target.value }))}
              placeholder="Votre mot de passe actuel"
              className="w-full focus:outline-none transition-colors duration-300"
              style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          <div>
            <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Nouveau mot de passe</label>
            <input
              type="password"
              value={mdpForm.next}
              onChange={e => setMdpForm(f => ({ ...f, next: e.target.value }))}
              placeholder="Au moins 8 caracteres"
              className="w-full focus:outline-none transition-colors duration-300"
              style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          <div>
            <label className="label-uppercase" style={{ display: "block", marginBottom: "6px" }}>Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={mdpForm.confirm}
              onChange={e => setMdpForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Confirmez le nouveau mot de passe"
              className="w-full focus:outline-none transition-colors duration-300"
              style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          {mdpForm.next && mdpForm.confirm && mdpForm.next !== mdpForm.confirm && (
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#A04040" }}>Les mots de passe ne correspondent pas.</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => { setShowChangeMdp(false); setMdpForm({ current: "", next: "", confirm: "" }); }}
              className="flex items-center gap-1 transition-opacity duration-300 hover:opacity-70"
              style={{ padding: "10px 20px", fontSize: "11px", fontWeight: 500, fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#6B6560", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <X size={13} style={{ strokeWidth: 1.5 }} /> Annuler
            </button>
            <button
              onClick={() => {
                if (mdpForm.next !== mdpForm.confirm) {
                  toast.error("Les mots de passe ne correspondent pas.");
                  return;
                }
                if (mdpForm.next.length < 8) {
                  toast.error("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
                  return;
                }
                changeMdp.mutate({ currentPassword: mdpForm.current, newPassword: mdpForm.next });
              }}
              disabled={changeMdp.isPending || !mdpForm.current || !mdpForm.next || !mdpForm.confirm}
              className="flex items-center gap-1 transition-colors duration-300"
              style={{
                padding: "10px 24px",
                background: (changeMdp.isPending || !mdpForm.current || !mdpForm.next || !mdpForm.confirm) ? "#8A7535" : "#C9A84C",
                color: "#0A0A0A",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                border: "none",
                cursor: (changeMdp.isPending || !mdpForm.current || !mdpForm.next || !mdpForm.confirm) ? "not-allowed" : "pointer",
              }}
            >
              <Save size={13} style={{ strokeWidth: 1.5 }} /> {changeMdp.isPending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

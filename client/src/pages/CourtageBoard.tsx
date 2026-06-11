import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Search, RefreshCw, CheckCircle2, Clock, AlertCircle, Building2, CalendarDays, Mail, Phone, Download, Plus, Trash2, Star, ChevronDown, ChevronUp, FileText, Upload, Paperclip, X, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import LeadTimeline from "@/components/LeadTimeline";
import { AssigneeSelect } from "@/components/AssigneeSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourtageLead {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  statut: "actif" | "en_pause" | "cloture" | "perdu";
  courtierAssigne: string | null;
  courtierEmail: string | null;
  enveloppeValidee: number | null;
  enveloppeDate: string | null;
  leadId: number | null;
  mandatId: number | null;
  hexaId: number | null;
  formule: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  actif:    { label: "Actif",    color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  en_pause: { label: "En pause", color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  cloture:  { label: "Cloture",  color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  perdu:    { label: "Perdu",    color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
};

const FORMULE_LABELS: Record<string, string> = {
  starter: "Starter",
  premium: "Premium",
  sdt_starter: "SDT Starter",
  sdt_premium: "SDT Premium",
};

function getCourtageStatus(lead: CourtageLead): { label: string; color: string; bg: string; border: string; icon: React.ReactNode } {
  if (lead.enveloppeValidee) {
    return {
      label: `${lead.enveloppeValidee.toLocaleString("fr-FR")} EUR`,
      color: "#4A7A5A",
      bg: "rgba(74,122,90,0.08)",
      border: "rgba(74,122,90,0.2)",
      icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />,
    };
  }
  if (lead.courtierAssigne) {
    return {
      label: "En cours",
      color: "#C9A84C",
      bg: "rgba(201,168,76,0.08)",
      border: "rgba(201,168,76,0.2)",
      icon: <Clock className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />,
    };
  }
  return {
    label: "A traiter",
    color: "#A04040",
    bg: "rgba(160,64,64,0.08)",
    border: "rgba(160,64,64,0.2)",
    icon: <AlertCircle className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />,
  };
}

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUT_CONFIG[statut] ?? STATUT_CONFIG.actif;
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

function EnveloppeBadge({ lead }: { lead: CourtageLead }) {
  const status = getCourtageStatus(lead);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 8px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: status.color,
      background: status.bg,
      border: `1px solid ${status.border}`,
    }}>
      {status.icon}
      {lead.enveloppeValidee
        ? `${lead.enveloppeValidee.toLocaleString("fr-FR")} EUR`
        : lead.courtierAssigne ? "En cours" : "A traiter"}
    </span>
  );
}

function ModuleBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "1px 6px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 500,
      letterSpacing: "0.04em",
      color: active ? "#F0EDE6" : "#3A3632",
      background: active ? "rgba(240,237,230,0.06)" : "transparent",
      border: `1px solid ${active ? "rgba(240,237,230,0.15)" : "#1E1E1E"}`,
    }}>
      {label}
    </span>
  );
}

// ─── Composant fiche detail Courtage ─────────────────────────────────────────

const REPONSE_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  en_attente:   { label: "En attente",    color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  ok_enveloppe: { label: "OK Enveloppe",  color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  regroupement: { label: "Regroupement",  color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  refus:        { label: "Refus",         color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
  sans_suite:   { label: "Sans suite",    color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" },
};

function CourtageDetail({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: rawLead, isLoading } = trpc.crm.getById.useQuery({ id: leadId });

  // ─── Soumissions courtier ────────────────────────────────────────────────
  const { data: soumissions = [], refetch: refetchSoumissions } = trpc.courtierSoumissions.list.useQuery({ crmLeadId: leadId });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourtierNom, setNewCourtierNom] = useState("");
  const [newCourtierEmail, setNewCourtierEmail] = useState("");
  const [newCourtierCabinet, setNewCourtierCabinet] = useState("");
  const [newDateEnvoi, setNewDateEnvoi] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newResumeSituation, setNewResumeSituation] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [genTableauPdf, setGenTableauPdf] = useState(false);
  const [tableauPdfUrl, setTableauPdfUrl] = useState<string | null>(null);
  const [sendEmailOnAdd, setSendEmailOnAdd] = useState(true);

  const uploadZipMutation = trpc.courtierSoumissions.uploadZip.useMutation();
  const sendContactEmailMutation = trpc.courtierSoumissions.sendContactEmail.useMutation();
  const generatePdfMutation = trpc.dossier.generatePdf.useMutation({
    onSuccess: (data) => { setTableauPdfUrl(data.url); toast.success("Tableau de courtage genere !"); },
    onError: (e) => toast.error("Erreur generation PDF : " + e.message),
  });

  const resetAddForm = () => {
    setNewCourtierNom(""); setNewCourtierEmail(""); setNewCourtierCabinet("");
    setNewDateEnvoi(""); setNewNote(""); setNewResumeSituation("");
    setZipFile(null); setZipUrl(null); setTableauPdfUrl(null); setGenTableauPdf(false); setSendEmailOnAdd(true);
  };

  const handleZipSelect = async (file: File) => {
    setZipFile(file);
    setZipUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadZipMutation.mutateAsync({
        crmLeadId: leadId,
        fileBase64: base64,
        nom: file.name,
        mimeType: file.type || "application/zip",
      });
      setZipUrl(result.url);
      toast.success("Fichier uploade !");
    } catch (e: any) {
      toast.error("Erreur upload : " + e.message);
    } finally {
      setZipUploading(false);
    }
  };

  const addSoumissionMutation = trpc.courtierSoumissions.add.useMutation({
    onSuccess: async () => {
      refetchSoumissions();
      setShowAddForm(false);
      if (sendEmailOnAdd && newCourtierEmail) {
        try {
          await sendContactEmailMutation.mutateAsync({
            crmLeadId: leadId,
            courtierEmail: newCourtierEmail,
            courtierNom: newCourtierNom,
            resumeSituation: newResumeSituation || undefined,
            tableauCourtagePdfUrl: tableauPdfUrl || undefined,
            zipDocumentsUrl: zipUrl || undefined,
          });
          toast.success("Courtier ajoute et email envoye !");
        } catch (e: any) {
          toast.success("Courtier ajoute");
          toast.error("Email non envoye : " + e.message);
        }
      } else {
        toast.success("Courtier ajoute");
      }
      resetAddForm();
    },
    onError: (e) => toast.error("Erreur : " + e.message),
  });
  const updateSoumissionMutation = trpc.courtierSoumissions.update.useMutation({
    onSuccess: () => { refetchSoumissions(); toast.success("Mis a jour"); },
    onError: (e) => toast.error("Erreur : " + e.message),
  });
  const deleteSoumissionMutation = trpc.courtierSoumissions.delete.useMutation({
    onSuccess: () => { refetchSoumissions(); toast.success("Supprime"); },
    onError: (e) => toast.error("Erreur : " + e.message),
  });
  const updateMutation = trpc.crm.update.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate({});
      utils.crm.getById.invalidate({ id: leadId });
      toast.success("Sauvegarde");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });
  const sendDossierMutation = trpc.dossier.sendToCourtier.useMutation({
    onSuccess: () => toast.success("Dossier envoye au courtier avec succes !"),
    onError: (e) => toast.error("Erreur : " + e.message),
  });

  const [courtierNom, setCourtierNom] = useState("");
  const [courtierEmail, setCourtierEmail] = useState("");
  const [enveloppe, setEnveloppe] = useState("");
  const [enveloppeDate, setEnveloppeDate] = useState("");
  const lead = rawLead as any;

  useEffect(() => {
    if (lead) {
      setCourtierNom(lead.courtierAssigne ?? "");
      setCourtierEmail((lead as any).courtierEmail ?? "");
      setEnveloppe(lead.enveloppeValidee ? String(lead.enveloppeValidee) : "");
      setEnveloppeDate(lead.enveloppeDate ?? "");
    }
  }, [lead?.id]);

  const handleSave = () => {
    updateMutation.mutate({
      id: leadId,
      courtierAssigne: courtierNom || undefined,
      courtierEmail: courtierEmail || undefined,
      enveloppeValidee: enveloppe ? parseInt(enveloppe) : undefined,
      enveloppeDate: enveloppeDate || undefined,
    } as any);
  };

  const handleSendDossier = () => {
    if (!courtierEmail || !courtierEmail.includes("@")) {
      toast.error("Veuillez saisir l'email du courtier avant d'envoyer.");
      return;
    }
    sendDossierMutation.mutate({
      crmLeadId: leadId,
      courtierEmail,
      courtierNom: courtierNom || undefined,
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
    </div>
  );

  if (!lead) return <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", padding: "24px" }}>Lead introuvable.</p>;

  // Inline input style helper
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#161616",
    border: "1px solid #1E1E1E",
    borderRadius: "2px",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: "#F0EDE6",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Identite */}
      <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
        <p className="label-uppercase" style={{ marginBottom: "12px" }}>Identite du client</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Nom :</span>
            <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{lead.prenom} {lead.nom}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
            <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{lead.email}</span>
          </div>
          {lead.telephone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
              <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{lead.telephone}</span>
            </div>
          )}
          {lead.formule && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Formule :</span>
              <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#C9A84C" }}>{FORMULE_LABELS[lead.formule] ?? lead.formule}</span>
            </div>
          )}
        </div>
        {/* Modules lies */}
        <div className="flex gap-2 mt-3">
          <ModuleBadge active={!!lead.leadId} label={lead.leadId ? "Etat Civil" : "Etat Civil --"} />
          <ModuleBadge active={!!lead.mandatId} label={lead.mandatId ? "Mandat" : "Mandat --"} />
          <ModuleBadge active={!!lead.hexaId} label={lead.hexaId ? "Credit" : "Credit --"} />
        </div>
      </div>

      {/* Suivi courtage */}
      <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
        <p className="label-uppercase" style={{ marginBottom: "12px" }}>Suivi Courtage</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Courtier assigne</label>
            <AssigneeSelect
              mode="courtier"
              value={courtierNom}
              leadVille={(lead as any)?.villeResidence}
              onChange={(val, option) => {
                setCourtierNom(val);
                if (option?.email) setCourtierEmail(option.email);
              }}
              placeholder="-- Selectionner un courtier --"
              className="w-full h-8"
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Email du courtier</label>
            <input
              value={courtierEmail}
              onChange={(e) => setCourtierEmail(e.target.value)}
              style={inputStyle}
              placeholder="courtier@cabinet.fr"
              type="email"
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Enveloppe validee (EUR)</label>
            <input
              value={enveloppe}
              onChange={(e) => setEnveloppe(e.target.value)}
              type="number"
              style={inputStyle}
              placeholder="Ex. 350 000"
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Date annonce enveloppe</label>
            <input
              value={enveloppeDate}
              onChange={(e) => setEnveloppeDate(e.target.value)}
              type="date"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="transition-colors duration-300"
            style={{
              padding: "8px 16px",
              borderRadius: "2px",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "#F0EDE6",
              border: "1px solid #1E1E1E",
              background: "transparent",
              cursor: updateMutation.isPending ? "not-allowed" : "pointer",
              opacity: updateMutation.isPending ? 0.5 : 1,
            }}
          >
            {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button
            onClick={handleSendDossier}
            disabled={sendDossierMutation.isPending}
            className="flex items-center gap-1.5 transition-colors duration-300"
            style={{
              padding: "8px 16px",
              borderRadius: "2px",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#0A0A0A",
              background: "#C9A84C",
              border: "none",
              cursor: sendDossierMutation.isPending ? "not-allowed" : "pointer",
              opacity: sendDossierMutation.isPending ? 0.5 : 1,
            }}
          >
            <Send className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
            {sendDossierMutation.isPending ? "Envoi..." : "Envoyer le dossier"}
          </button>
        </div>
        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "8px" }}>L'envoi genere le PDF complet et le transmet au courtier + copie Manon</p>
      </div>

      {/* Tableau des soumissions courtier */}
      <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
          <p className="label-uppercase">Courtiers contactes</p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 transition-colors duration-300"
            style={{
              padding: "6px 12px",
              borderRadius: "2px",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#0A0A0A",
              background: "#C9A84C",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
            Ajouter
          </button>
        </div>

        {/* Formulaire d'ajout enrichi */}
        {showAddForm && (
          <div style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "20px", marginBottom: "12px" }}>
            {/* Identite courtier */}
            <div style={{ marginBottom: "16px" }}>
              <p className="label-uppercase" style={{ marginBottom: "8px" }}>Courtier contacte</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Courtier du reseau</label>
                  <AssigneeSelect
                    mode="courtier"
                    value={newCourtierNom}
                    leadVille={(lead as any)?.villeResidence}
                    onChange={(val, option) => {
                      setNewCourtierNom(val);
                      if (option?.email) setNewCourtierEmail(option.email);
                      if (option?.label) {
                        const parts = option.label.split(" — ");
                        if (parts.length > 1) setNewCourtierCabinet(parts[1]);
                      }
                    }}
                    placeholder="-- Selectionner un courtier --"
                    className="w-full h-7 text-xs"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Cabinet</label>
                  <input value={newCourtierCabinet} onChange={e => setNewCourtierCabinet(e.target.value)} style={inputStyle} placeholder="Cafpi, Meilleurtaux..."
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")} onBlur={e => (e.target.style.borderColor = "#1E1E1E")} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Email</label>
                  <input value={newCourtierEmail} onChange={e => setNewCourtierEmail(e.target.value)} type="email" style={inputStyle} placeholder="courtier@cabinet.fr"
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")} onBlur={e => (e.target.style.borderColor = "#1E1E1E")} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Date d'envoi</label>
                  <input value={newDateEnvoi} onChange={e => setNewDateEnvoi(e.target.value)} type="date" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")} onBlur={e => (e.target.style.borderColor = "#1E1E1E")} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const, display: "block", marginBottom: "4px" }}>Note interne</label>
                  <input value={newNote} onChange={e => setNewNote(e.target.value)} style={inputStyle} placeholder="Remarques..."
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")} onBlur={e => (e.target.style.borderColor = "#1E1E1E")} />
                </div>
              </div>
            </div>

            {/* Resume de situation */}
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px", marginBottom: "16px" }}>
              <p className="label-uppercase" style={{ marginBottom: "8px" }}>Resume de la situation client</p>
              <textarea
                value={newResumeSituation}
                onChange={e => setNewResumeSituation(e.target.value)}
                style={{ ...inputStyle, minHeight: "80px", resize: "none" as const }}
                placeholder="Decrivez la situation financiere du client, son projet, ses revenus, ses contraintes... Ce texte sera inclus dans l'email envoye au courtier."
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>

            {/* Tableau de courtage PDF */}
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px", marginBottom: "16px" }}>
              <p className="label-uppercase" style={{ marginBottom: "8px" }}>Tableau de courtage</p>
              {(lead as any)?.leadId ? (
                <div className="flex items-center gap-2">
                  {tableauPdfUrl ? (
                    <div className="flex items-center gap-2" style={{ background: "rgba(74,122,90,0.06)", border: "1px solid rgba(74,122,90,0.2)", borderRadius: "2px", padding: "6px 12px" }}>
                      <FileText className="w-3.5 h-3.5" style={{ color: "#4A7A5A", strokeWidth: 1.5 }} />
                      <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#4A7A5A" }}>PDF genere</span>
                      <a href={tableauPdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#C9A84C", textDecoration: "none" }}>Voir</a>
                      <button onClick={() => setTableauPdfUrl(null)} className="transition-opacity duration-300 hover:opacity-70" style={{ color: "#3A3632" }}><X className="w-3 h-3" style={{ strokeWidth: 1.5 }} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => generatePdfMutation.mutate({ leadId: (lead as any).leadId })}
                      disabled={generatePdfMutation.isPending}
                      className="flex items-center gap-1.5 transition-colors duration-300"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "2px",
                        fontSize: "11px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase" as const,
                        color: "#F0EDE6",
                        border: "1px solid #1E1E1E",
                        background: "transparent",
                        cursor: generatePdfMutation.isPending ? "not-allowed" : "pointer",
                      }}
                    >
                      <FileText className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                      {generatePdfMutation.isPending ? "Generation..." : "Generer le tableau de courtage PDF"}
                    </button>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic" }}>Fiche d'etat civil requise pour generer le tableau de courtage.</p>
              )}
            </div>

            {/* Upload ZIP documents */}
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px", marginBottom: "16px" }}>
              <p className="label-uppercase" style={{ marginBottom: "8px" }}>Documents a joindre (ZIP)</p>
              {zipFile && zipUrl ? (
                <div className="flex items-center gap-2" style={{ background: "rgba(74,122,90,0.06)", border: "1px solid rgba(74,122,90,0.2)", borderRadius: "2px", padding: "6px 12px" }}>
                  <Paperclip className="w-3.5 h-3.5" style={{ color: "#4A7A5A", strokeWidth: 1.5 }} />
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#4A7A5A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "200px" }}>{zipFile.name}</span>
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>({(zipFile.size / 1024 / 1024).toFixed(1)} Mo)</span>
                  <a href={zipUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#C9A84C", textDecoration: "none" }}>Voir</a>
                  <button onClick={() => { setZipFile(null); setZipUrl(null); }} className="transition-opacity duration-300 hover:opacity-70" style={{ color: "#3A3632" }}><X className="w-3 h-3" style={{ strokeWidth: 1.5 }} /></button>
                </div>
              ) : zipUploading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Upload en cours...</span>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer transition-colors duration-300" style={{ border: "1px dashed #1E1E1E", borderRadius: "2px", padding: "10px 12px" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#3A3632")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                >
                  <Upload className="w-3.5 h-3.5" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Cliquer pour selectionner un fichier ZIP ou PDF</span>
                  <input
                    type="file"
                    accept=".zip,.pdf,.rar"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleZipSelect(f); }}
                  />
                </label>
              )}
            </div>

            {/* Option envoi email */}
            <div className="flex items-center gap-2" style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px", marginBottom: "12px" }}>
              <input
                type="checkbox"
                id="sendEmailOnAdd"
                checked={sendEmailOnAdd}
                onChange={e => setSendEmailOnAdd(e.target.checked)}
                style={{ width: "14px", height: "14px", accentColor: "#C9A84C" }}
              />
              <label htmlFor="sendEmailOnAdd" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", cursor: "pointer" }}>
                Envoyer l'email au courtier avec le resume + documents
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => addSoumissionMutation.mutate({
                  crmLeadId: leadId,
                  courtierNom: newCourtierNom,
                  courtierEmail: newCourtierEmail || undefined,
                  courtierCabinet: newCourtierCabinet || undefined,
                  dateEnvoi: newDateEnvoi ? new Date(newDateEnvoi).getTime() : undefined,
                  note: newNote || undefined,
                  resumeSituation: newResumeSituation || undefined,
                  zipDocumentsUrl: zipUrl || undefined,
                  tableauCourtagePdfUrl: tableauPdfUrl || undefined,
                })}
                disabled={!newCourtierNom || addSoumissionMutation.isPending || sendContactEmailMutation.isPending}
                className="flex items-center gap-1.5 transition-colors duration-300"
                style={{
                  padding: "6px 14px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  color: "#0A0A0A",
                  background: "#C9A84C",
                  border: "none",
                  cursor: (!newCourtierNom || addSoumissionMutation.isPending) ? "not-allowed" : "pointer",
                  opacity: (!newCourtierNom || addSoumissionMutation.isPending) ? 0.5 : 1,
                }}
              >
                <Send className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                {addSoumissionMutation.isPending || sendContactEmailMutation.isPending ? "En cours..." : sendEmailOnAdd ? "Confirmer et envoyer" : "Confirmer"}
              </button>
              <button
                onClick={() => { setShowAddForm(false); resetAddForm(); }}
                className="transition-colors duration-300"
                style={{
                  padding: "6px 14px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  color: "#6B6560",
                  border: "1px solid #1E1E1E",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des soumissions */}
        {(soumissions as any[]).length === 0 ? (
          <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", textAlign: "center", padding: "16px 0" }}>Aucun courtier contacte pour ce dossier</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(soumissions as any[]).map((s: any) => {
              const cfg = REPONSE_CONFIG[s.reponse] ?? REPONSE_CONFIG.en_attente;
              const joursDepuis = s.dateEnvoi ? Math.floor((Date.now() - s.dateEnvoi) / 86400000) : null;
              return (
                <div key={s.id} style={{
                  padding: "12px",
                  borderRadius: "2px",
                  border: s.selectionne ? "1px solid rgba(74,122,90,0.3)" : "1px solid #1E1E1E",
                  background: s.selectionne ? "rgba(74,122,90,0.04)" : "#161616",
                }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.selectionne && <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#C9A84C", fill: "#C9A84C", strokeWidth: 1.5 }} />}
                        <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{s.courtierNom}</span>
                        {s.courtierCabinet && <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{s.courtierCabinet}</span>}
                        <span style={{
                          display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: "2px",
                          fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.04em",
                          color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                        }}>
                          {cfg.label}
                        </span>
                        {s.reponse === "ok_enveloppe" && s.montantEnveloppe && (
                          <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#4A7A5A" }}>{s.montantEnveloppe.toLocaleString("fr-FR")} EUR</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {s.courtierEmail && <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{s.courtierEmail}</span>}
                        {joursDepuis !== null && (
                          <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: joursDepuis > 7 ? "#C9A84C" : "#3A3632" }}>
                            Envoye {joursDepuis === 0 ? "aujourd'hui" : `il y a ${joursDepuis}j`}
                          </span>
                        )}
                        {s.note && <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "200px" }}>{s.note}</span>}
                      </div>
                    </div>
                    {/* Actions rapides */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        value={s.reponse}
                        onChange={e => updateSoumissionMutation.mutate({ id: s.id, reponse: e.target.value as any })}
                        style={{
                          fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif",
                          background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px",
                          padding: "2px 6px", color: "#F0EDE6", height: "24px", outline: "none",
                        }}
                      >
                        <option value="en_attente">En attente</option>
                        <option value="ok_enveloppe">OK Enveloppe</option>
                        <option value="regroupement">Regroupement</option>
                        <option value="refus">Refus</option>
                        <option value="sans_suite">Sans suite</option>
                      </select>
                      {s.reponse === "ok_enveloppe" && (
                        <input
                          type="number"
                          placeholder="Montant"
                          defaultValue={s.montantEnveloppe ?? ""}
                          onBlur={e => { if (e.target.value) updateSoumissionMutation.mutate({ id: s.id, montantEnveloppe: parseInt(e.target.value) }); }}
                          style={{
                            fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif",
                            background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px",
                            padding: "2px 6px", color: "#F0EDE6", height: "24px", width: "80px", outline: "none",
                          }}
                        />
                      )}
                      <button
                        onClick={() => updateSoumissionMutation.mutate({ id: s.id, selectionne: !s.selectionne })}
                        title={s.selectionne ? "Deselectionner" : "Marquer comme courtier retenu"}
                        className="p-1 transition-opacity duration-300 hover:opacity-70"
                        style={{ color: s.selectionne ? "#C9A84C" : "#3A3632" }}
                      >
                        <Star className="w-3.5 h-3.5" fill={s.selectionne ? "currentColor" : "none"} style={{ strokeWidth: 1.5 }} />
                      </button>
                      {s.courtierEmail && (
                        <button
                          onClick={() => {
                            if (!confirm(`Envoyer le dossier a ${s.courtierNom} (${s.courtierEmail}) ?`)) return;
                            sendDossierMutation.mutate({
                              crmLeadId: leadId,
                              courtierEmail: s.courtierEmail!,
                              courtierNom: s.courtierNom,
                            });
                          }}
                          disabled={sendDossierMutation.isPending}
                          title={`Envoyer le dossier a ${s.courtierNom}`}
                          className="p-1 transition-opacity duration-300 hover:opacity-70"
                          style={{ color: "#3A3632", opacity: sendDossierMutation.isPending ? 0.3 : 1 }}
                        >
                          <Send className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm("Supprimer cette soumission ?")) deleteSoumissionMutation.mutate({ id: s.id }); }}
                        className="p-1 transition-colors duration-300"
                        style={{ color: "#3A3632" }}
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

      {/* Timeline des activites */}
      <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
        <LeadTimeline crmLeadId={leadId} nomLead={lead ? `${lead.prenom} ${lead.nom}` : undefined} />
      </div>

      {/* Notes */}
      {lead.notes && Array.isArray(lead.notes) && lead.notes.length > 0 && (
        <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
          <p className="label-uppercase" style={{ marginBottom: "12px" }}>Dernieres notes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto" }}>
            {(lead.notes as any[]).slice(0, 5).map((note: any) => (
              <div key={note.id} style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "12px" }}>
                <div className="flex justify-between" style={{ marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{note.auteur ?? "Equipe"}</span>
                  <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{new Date(note.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{note.contenu}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant carte lead (mobile) ──────────────────────────────────────────

function CourtageCard({ lead, onClick }: { lead: CourtageLead; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-colors duration-300"
      style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "16px" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
    >
      {/* Header */}
      <div className="flex items-start justify-between" style={{ marginBottom: "10px" }}>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
            {lead.prenom} {lead.nom}
          </p>
          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          <StatutBadge statut={lead.statut} />
        </div>
      </div>

      {/* Courtier */}
      <div className="flex items-center gap-1.5" style={{ marginBottom: "8px" }}>
        <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
        {lead.courtierAssigne ? (
          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{lead.courtierAssigne}</span>
        ) : (
          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic" }}>Aucun courtier assigne</span>
        )}
      </div>

      {/* Enveloppe */}
      <EnveloppeBadge lead={lead} />

      {/* Date enveloppe */}
      {lead.enveloppeDate && (
        <div className="flex items-center gap-1.5 mt-2">
          <CalendarDays className="w-3.5 h-3.5" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
          <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
            Annonce : {new Date(lead.enveloppeDate).toLocaleDateString("fr-FR")}
          </span>
        </div>
      )}

      {/* Formule */}
      {lead.formule && (
        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginTop: "8px" }}>{FORMULE_LABELS[lead.formule] ?? lead.formule}</p>
      )}

      <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "8px" }}>
        Entre le {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

// ─── Composant Reseau Courtiers ─────────────────────────────────────────────

function ReseauCourtiers() {
  const { data: stats, isLoading } = trpc.courtierSoumissions.statsReseau.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucun courtier contacte pour l'instant.</p>
        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>Les courtiers apparaitront ici des qu'un dossier leur sera soumis.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>
            Reseau courtiers
          </h2>
          <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginTop: "4px" }}>{stats.length} courtier{stats.length > 1 ? "s" : ""} contacte{stats.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px", marginBottom: "24px" }}>
        {[
          { label: "Courtiers contactes", value: stats.length, gold: false },
          { label: "Accords enveloppe", value: stats.reduce((s, c) => s + c.okEnveloppe, 0), gold: false },
          { label: "Refus", value: stats.reduce((s, c) => s + c.refus, 0), gold: false },
          { label: "En attente", value: stats.reduce((s, c) => s + c.enAttente, 0), gold: false },
        ].map((kpi) => (
          <div key={kpi.label} style={{ padding: "20px", background: "#0A0A0A" }}>
            <p className="tabular-nums" style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "28px",
              fontWeight: 600,
              color: "#F0EDE6",
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}>
              {kpi.value}
            </p>
            <p className="label-uppercase mt-2">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tableau des courtiers */}
      <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                {["Courtier", "Cabinet", "Total", "Attente", "Accord", "Regroupement", "Refus", "Retenu", "Taux accord"].map(h => (
                  <th key={h} className="text-left px-5 py-3 label-uppercase" style={{ background: "#0D0D0D" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((c, i) => {
                const traites = c.okEnveloppe + c.regroupement + c.refus + c.sansSuite;
                const tauxAccord = traites > 0 ? Math.round((c.okEnveloppe / traites) * 100) : null;
                return (
                  <tr key={i}
                    className="transition-colors duration-300"
                    style={{ borderBottom: "1px solid #151515" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-3">
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{c.courtierNom}</p>
                      {c.courtierEmail && <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{c.courtierEmail}</p>}
                    </td>
                    <td className="px-5 py-3" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{c.courtierCabinet ?? "--"}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6", textAlign: "right" }}>{c.total}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: c.enAttente > 0 ? "#C9A84C" : "#3A3632", textAlign: "right" }}>{c.enAttente}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: c.okEnveloppe > 0 ? "#4A7A5A" : "#3A3632", textAlign: "right" }}>{c.okEnveloppe}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: c.regroupement > 0 ? "#F0EDE6" : "#3A3632", textAlign: "right" }}>{c.regroupement}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: c.refus > 0 ? "#A04040" : "#3A3632", textAlign: "right" }}>{c.refus}</td>
                    <td className="px-5 py-3" style={{ textAlign: "right" }}>
                      {c.selectionne > 0 ? (
                        <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#C9A84C" }}>{c.selectionne}</span>
                      ) : (
                        <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>--</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {tauxAccord !== null ? (
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, background: "#1E1E1E", borderRadius: "1px", height: "4px", maxWidth: "64px" }}>
                            <div
                              style={{
                                height: "4px",
                                borderRadius: "1px",
                                width: `${tauxAccord}%`,
                                background: tauxAccord >= 60 ? "#4A7A5A" : tauxAccord >= 30 ? "#C9A84C" : "#A04040",
                              }}
                            />
                          </div>
                          <span className="tabular-nums" style={{
                            fontSize: "12px",
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            fontWeight: 500,
                            color: tauxAccord >= 60 ? "#4A7A5A" : tauxAccord >= 30 ? "#C9A84C" : "#A04040",
                          }}>{tauxAccord}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>En cours</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CourtageBoard() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | "actif" | "en_pause" | "cloture" | "perdu">("tous");
  const [filterEnveloppe, setFilterEnveloppe] = useState<"tous" | "avec" | "sans">("tous");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "reseau">("leads");

  const exportCSV = () => {
    const rows = [
      ["Prenom", "Nom", "Email", "Telephone", "Statut", "Courtier", "Email courtier", "Enveloppe (EUR)", "Date annonce", "Formule", "Derniere action"],
      ...filtered.map((l) => [
        l.prenom,
        l.nom,
        l.email,
        l.telephone ?? "",
        l.statut,
        l.courtierAssigne ?? "",
        l.courtierEmail ?? "",
        l.enveloppeValidee ? String(l.enveloppeValidee) : "",
        l.enveloppeDate ?? "",
        l.formule ?? "",
        new Date(l.updatedAt).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courtage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: rawLeads, isLoading, refetch } = trpc.crm.list.useQuery({
    etape: "courtage",
    limit: 200,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const leads: CourtageLead[] = ((rawLeads as any)?.items ?? []) as CourtageLead[];

  // Filtres
  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.nom.toLowerCase().includes(q)
      || l.prenom.toLowerCase().includes(q)
      || l.email.toLowerCase().includes(q)
      || (l.courtierAssigne ?? "").toLowerCase().includes(q);
    const matchStatut = filterStatut === "tous" || l.statut === filterStatut;
    const matchEnveloppe =
      filterEnveloppe === "tous"
      || (filterEnveloppe === "avec" && !!l.enveloppeValidee)
      || (filterEnveloppe === "sans" && !l.enveloppeValidee);
    return matchSearch && matchStatut && matchEnveloppe;
  });

  // Statistiques
  const total = leads.length;
  const avecEnveloppe = leads.filter((l) => !!l.enveloppeValidee).length;
  const avecCourtier = leads.filter((l) => !!l.courtierAssigne).length;
  const aTraiter = leads.filter((l) => !l.courtierAssigne).length;
  const enveloppeTotal = leads
    .filter((l) => !!l.enveloppeValidee)
    .reduce((sum, l) => sum + (l.enveloppeValidee ?? 0), 0);

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <AdminNav />

      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid #1E1E1E" }}>
        <div className="flex items-center justify-between px-5 py-2.5" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          {/* Onglets */}
          <div className="flex items-center gap-0" style={{ border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
            <button
              onClick={() => setActiveTab("leads")}
              className="transition-colors duration-300"
              style={{
                padding: "8px 16px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: activeTab === "leads" ? "#0A0A0A" : "#6B6560",
                background: activeTab === "leads" ? "#C9A84C" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Suivi leads
            </button>
            <button
              onClick={() => setActiveTab("reseau")}
              className="transition-colors duration-300"
              style={{
                padding: "8px 16px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: activeTab === "reseau" ? "#0A0A0A" : "#6B6560",
                background: activeTab === "reseau" ? "#C9A84C" : "transparent",
                border: "none",
                borderLeft: "1px solid #1E1E1E",
                cursor: "pointer",
              }}
            >
              Reseau courtiers
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 transition-colors duration-300"
              style={{ color: "#3A3632", border: "1px solid #1E1E1E", borderRadius: "2px", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#6B6560"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#3A3632"; }}
            >
              <RefreshCw className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 transition-colors duration-300"
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
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#F0EDE6"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
            >
              <Download className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {activeTab === "reseau" && <ReseauCourtiers />}
        {activeTab === "leads" && <>

        {/* Header */}
        <div className="flex items-end justify-between" style={{ marginBottom: "32px" }}>
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
              Suivi Courtage
            </h1>
            <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginTop: "6px" }}>
              Tous les leads en etape Courtage
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px", marginBottom: "32px" }}>
          {[
            { label: "Total leads", value: total, gold: true },
            { label: "A traiter", value: aTraiter, gold: false },
            { label: "Courtier assigne", value: avecCourtier, gold: false },
            { label: "Enveloppe validee", value: avecEnveloppe, gold: false },
            { label: "Total enveloppes", value: enveloppeTotal > 0 ? `${enveloppeTotal.toLocaleString("fr-FR")} EUR` : "--", gold: false },
          ].map((kpi) => (
            <div key={kpi.label} style={{ padding: "20px", background: "#0A0A0A" }}>
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
        <div className="flex flex-col sm:flex-row gap-3" style={{ marginBottom: "20px" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un lead ou courtier..."
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
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as any)}
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
            <option value="actif">Actif</option>
            <option value="en_pause">En pause</option>
            <option value="cloture">Cloture</option>
            <option value="perdu">Perdu</option>
          </select>
          <select
            value={filterEnveloppe}
            onChange={(e) => setFilterEnveloppe(e.target.value as any)}
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
            <option value="tous">Toutes les enveloppes</option>
            <option value="avec">Enveloppe validee</option>
            <option value="sans">Sans enveloppe</option>
          </select>
        </div>

        {/* Resultats */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
              {leads.length === 0
                ? "Aucun lead en etape Courtage pour l'instant."
                : "Aucun resultat pour ces filtres."}
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginBottom: "12px" }}>
              {filtered.length} lead{filtered.length > 1 ? "s" : ""} affiche{filtered.length > 1 ? "s" : ""}
            </p>

            {/* Vue tableau (desktop) */}
            <div className="hidden md:block" style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                      {["Client", "Statut", "Courtier assigne", "Enveloppe", "Date annonce", "Derniere action", "Modules"].map(h => (
                        <th key={h} className="text-left px-5 py-3 label-uppercase" style={{ background: "#0D0D0D" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => {
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="cursor-pointer transition-colors duration-300"
                          style={{ borderBottom: "1px solid #151515" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-5 py-3">
                            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                              {lead.prenom} {lead.nom}
                            </p>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", maxWidth: "192px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <StatutBadge statut={lead.statut} />
                          </td>
                          <td className="px-5 py-3">
                            {lead.courtierAssigne ? (
                              <div>
                                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{lead.courtierAssigne}</p>
                                {lead.courtierEmail && (
                                  <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.courtierEmail}</p>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic" }}>Non assigne</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <EnveloppeBadge lead={lead} />
                          </td>
                          <td className="px-5 py-3 tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                            {lead.enveloppeDate ? new Date(lead.enveloppeDate).toLocaleDateString("fr-FR") : "--"}
                          </td>
                          <td className="px-5 py-3">
                            {lead.updatedAt ? (() => {
                              const diff = Date.now() - new Date(lead.updatedAt).getTime();
                              const days = Math.floor(diff / 86400000);
                              return (
                                <span className="tabular-nums" style={{
                                  fontSize: "12px",
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  color: days >= 7 ? "#A04040" : days >= 3 ? "#C9A84C" : "#6B6560",
                                }}>
                                  {days === 0 ? "Aujourd'hui" : days === 1 ? "Hier" : `Il y a ${days}j`}
                                </span>
                              );
                            })() : <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>--</span>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1">
                              <ModuleBadge active={!!lead.leadId} label="EC" />
                              <ModuleBadge active={!!lead.mandatId} label="M" />
                              <ModuleBadge active={!!lead.hexaId} label="H" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vue cartes (mobile) */}
            <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered.map((lead) => (
                <CourtageCard key={lead.id} lead={lead} onClick={() => setSelectedLeadId(lead.id)} />
              ))}
            </div>
          </>
        )}

      </> /* fin onglet leads */}
      </div>

      {/* Modal fiche detail */}
      <Dialog open={!!selectedLeadId} onOpenChange={(open) => { if (!open) setSelectedLeadId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }} className="flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
              Suivi Courtage
            </DialogTitle>
          </DialogHeader>
          {selectedLeadId && (
            <CourtageDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

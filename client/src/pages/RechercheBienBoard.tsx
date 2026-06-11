import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import LeadTimeline from "@/components/LeadTimeline";
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
import { Search, RefreshCw, CheckCircle2, Clock, AlertCircle, Home, Download, Mail, Phone, CalendarDays, Loader2, FileText, Upload } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RechercheLead {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  statut: "actif" | "en_pause" | "cloture" | "perdu";
  agentAssigne: string | null;
  nbBiensPresentes: number;
  offreAcceptee: boolean;
  leadId: number | null;
  mandatId: number | null;
  hexaId: number | null;
  courtierAssigne: string | null;
  enveloppeValidee: number | null;
  formule: string | null;
  // Mandat de Recherche
  numeroMandat: string | null;
  projetType: string | null;
  budgetMax: number | null;
  typeBien: string | null;
  zoneRecherche: string | null;
  villeResidence: string | null;
  departement: string | null;
  codePostal: string | null;
  dateSignatureMandat: string | null;
  mandatSignePdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; style: { color: string; bg: string; border: string } }> = {
  actif:    { label: "Actif",    style: { color: "var(--success)", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" } },
  en_pause: { label: "En pause", style: { color: "var(--gold)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" } },
  cloture:  { label: "Cloture",  style: { color: "var(--foreground-muted)", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" } },
  perdu:    { label: "Perdu",    style: { color: "var(--destructive)", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" } },
};

const FORMULE_LABELS: Record<string, string> = {
  starter: "Starter",
  premium: "Premium",
  sdt_starter: "SDT Starter",
  sdt_premium: "SDT Premium",
};

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUT_CONFIG[statut] ?? { label: statut, style: { color: "var(--foreground-faint)", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" } };
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

function getRechercheStatus(lead: RechercheLead): { label: string; style: { color: string; bg: string; border: string }; icon: React.ReactNode } {
  if (lead.offreAcceptee) {
    return {
      label: "Offre acceptee",
      style: { color: "var(--success)", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
      icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />,
    };
  }
  if (lead.nbBiensPresentes > 0) {
    return {
      label: `${lead.nbBiensPresentes} bien${lead.nbBiensPresentes > 1 ? "s" : ""} presente${lead.nbBiensPresentes > 1 ? "s" : ""}`,
      style: { color: "var(--gold)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
      icon: <Clock className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />,
    };
  }
  if (lead.agentAssigne) {
    return {
      label: "Agent assigne",
      style: { color: "var(--foreground)", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
      icon: <Clock className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />,
    };
  }
  return {
    label: "A traiter",
    style: { color: "var(--destructive)", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
    icon: <AlertCircle className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />,
  };
}

function ModuleBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 6px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 500,
      letterSpacing: "0.04em",
      color: active ? "var(--foreground)" : "var(--foreground-faint)",
      background: active ? "rgba(240,237,230,0.06)" : "transparent",
      border: `1px solid ${active ? "rgba(240,237,230,0.15)" : "var(--border)"}`,
    }}>
      {label}
    </span>
  );
}

// ─── Fiche detail Recherche bien ─────────────────────────────────────────────

function RechercheBienDetail({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: rawLead, isLoading } = trpc.crm.getById.useQuery({ id: leadId });
  const updateMutation = trpc.crm.update.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate({});
      utils.crm.getById.invalidate({ id: leadId });
      toast.success("Sauvegarde");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });
  const sendEmailMutation = trpc.crm.sendPointImmobilierEmail.useMutation({
    onSuccess: (data) => toast.success(`Email Point Immobilier envoye a ${data.email}`),
    onError: (err) => toast.error(err.message),
  });
  const [isUploadingMandat, setIsUploadingMandat] = useState(false);
  const [isSendingMandatInvit, setIsSendingMandatInvit] = useState(false);
  const sendMandatInvitMutation = trpc.crm.sendMandatInvitation.useMutation({
    onSuccess: (data) => toast.success(`Invitation mandat envoyee a ${data.email}`),
    onError: (e) => toast.error("Erreur envoi : " + e.message),
  });
  const handleSendMandatInvit = async () => {
    if (isSendingMandatInvit) return;
    setIsSendingMandatInvit(true);
    try { await sendMandatInvitMutation.mutateAsync({ id: leadId }); }
    finally { setIsSendingMandatInvit(false); }
  };
  const uploadMandatMutation = trpc.crm.uploadMandatSigne.useMutation({
    onSuccess: () => {
      utils.crm.getById.invalidate({ id: leadId });
      utils.crm.list.invalidate({});
      toast.success("Mandat signe uploade — Mandat coche automatiquement");
    },
    onError: (e) => toast.error("Erreur upload : " + e.message),
  });
  const handleUploadMandat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Seuls les fichiers PDF sont acceptes."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 10 Mo)."); return; }
    setIsUploadingMandat(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))));
      await uploadMandatMutation.mutateAsync({ crmLeadId: leadId, fileBase64: base64, fileName: file.name });
    } finally {
      setIsUploadingMandat(false);
      e.target.value = "";
    }
  };

  const [agentNom, setAgentNom] = useState("");
  const [nbBiens, setNbBiens] = useState("");
  const [offreAcceptee, setOffreAcceptee] = useState(false);
  const lead = rawLead as any;

  // Initialisation dans useEffect pour eviter setState pendant le render
  useEffect(() => {
    if (lead) {
      setAgentNom(lead.agentAssigne ?? "");
      setNbBiens(lead.nbBiensPresentes ? String(lead.nbBiensPresentes) : "0");
      setOffreAcceptee(!!lead.offreAcceptee);
    }
  }, [lead?.id]);

  const handleSave = () => {
    updateMutation.mutate({
      id: leadId,
      agentAssigne: agentNom || undefined,
      nbBiensPresentes: nbBiens ? parseInt(nbBiens) : 0,
      offreAcceptee,
    } as any);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
    </div>
  );

  if (!lead) return (
    <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", padding: "24px" }}>
      Lead introuvable.
    </p>
  );

  return (
    <div className="space-y-6">
      {/* Identite */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", padding: "24px" }}>
        <p className="label-uppercase" style={{ marginBottom: "12px" }}>Identite du client</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Nom :</span>
            <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{lead.prenom} {lead.nom}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
            <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.email}</span>
          </div>
          {lead.telephone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
              <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.telephone}</span>
            </div>
          )}
          {lead.formule && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Formule :</span>
              <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--gold)" }}>{FORMULE_LABELS[lead.formule] ?? lead.formule}</span>
            </div>
          )}
          {lead.enveloppeValidee && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Enveloppe :</span>
              <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--success)" }}>{lead.enveloppeValidee.toLocaleString("fr-FR")} EUR</span>
            </div>
          )}
          {lead.courtierAssigne && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Courtier :</span>
              <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.courtierAssigne}</span>
            </div>
          )}
        </div>
        {/* Modules lies */}
        <div className="flex gap-2 mt-4">
          <ModuleBadge active={!!lead.leadId} label={`Etat Civil ${lead.leadId ? "—" : "—"}`} />
          <ModuleBadge active={!!lead.mandatId} label={`Mandat ${lead.mandatId ? "—" : "—"}`} />
          <ModuleBadge active={!!lead.hexaId} label={`Credit ${lead.hexaId ? "—" : "—"}`} />
        </div>
      </div>

      {/* Suivi recherche bien */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", padding: "24px" }}>
        <p className="label-uppercase" style={{ marginBottom: "12px" }}>Suivi Recherche bien</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-uppercase" style={{ display: "block", marginBottom: "6px", fontSize: "10px" }}>Agent assigne</label>
            <input
              value={agentNom}
              onChange={(e) => setAgentNom(e.target.value)}
              placeholder="Nom de l'agent"
              className="w-full transition-colors duration-300 focus:outline-none"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "8px 12px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "var(--foreground)",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label className="label-uppercase" style={{ display: "block", marginBottom: "6px", fontSize: "10px" }}>Biens presentes</label>
            <input
              value={nbBiens}
              onChange={(e) => setNbBiens(e.target.value)}
              type="number"
              min="0"
              placeholder="0"
              className="w-full transition-colors duration-300 focus:outline-none"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "8px 12px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "var(--foreground)",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer group w-fit">
            <input
              type="checkbox"
              checked={offreAcceptee}
              onChange={(e) => setOffreAcceptee(e.target.checked)}
              style={{ width: "14px", height: "14px", accentColor: "var(--gold)" }}
            />
            <span style={{
              fontSize: "13px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: offreAcceptee ? "var(--success)" : "var(--foreground-muted)",
              fontWeight: offreAcceptee ? 500 : 400,
              transition: "color 300ms ease",
            }}>
              Offre acceptee
            </span>
          </label>
        </div>
        <div className="flex gap-2 mt-5 flex-wrap">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            style={{
              padding: "10px 24px",
              background: updateMutation.isPending ? "var(--gold-muted)" : "var(--gold)",
              color: "var(--background)",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              borderRadius: "2px",
              border: "none",
              cursor: updateMutation.isPending ? "not-allowed" : "pointer",
              transition: "background 300ms ease",
            }}
          >
            {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button
            onClick={() => sendEmailMutation.mutate({ id: leadId })}
            disabled={sendEmailMutation.isPending}
            className="flex items-center gap-2 transition-colors duration-300"
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "var(--foreground-muted)",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              borderRadius: "2px",
              border: "1px solid var(--border)",
              cursor: sendEmailMutation.isPending ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <Mail className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            {sendEmailMutation.isPending ? "Envoi en cours..." : "Mail Point Immobilier"}
          </button>
        </div>
      </div>

      {/* Mandat de recherche */}
      {(lead.numeroMandat || lead.budgetMax || lead.zoneRecherche || lead.projetType) && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", padding: "24px" }}>
          <p className="label-uppercase" style={{ marginBottom: "12px" }}>Mandat de Recherche</p>
          <div className="grid grid-cols-2 gap-2">
            {lead.numeroMandat && (
              <div className="col-span-2 flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>N Mandat :</span>
                <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)", letterSpacing: "0.02em" }}>{lead.numeroMandat}</span>
                {lead.dateSignatureMandat && lead.dateSignatureMandat !== '—' && (
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginLeft: "4px" }}>Signe le {lead.dateSignatureMandat}</span>
                )}
                {lead.mandatSignePdfUrl && (
                  <a
                    href={lead.mandatSignePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1.5 transition-colors duration-300"
                    style={{
                      padding: "4px 10px",
                      borderRadius: "2px",
                      border: "1px solid rgba(74,122,90,0.2)",
                      background: "rgba(74,122,90,0.08)",
                      color: "var(--success)",
                      fontSize: "11px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      textDecoration: "none",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Mandat signe
                  </a>
                )}
              </div>
            )}
            {lead.projetType && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Projet :</span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: "2px",
                  border: "1px solid rgba(240,237,230,0.15)",
                  background: "rgba(240,237,230,0.06)",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  color: "var(--foreground)",
                }}>{lead.projetType}</span>
              </div>
            )}
            {lead.budgetMax && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Budget max :</span>
                <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, color: "var(--foreground)" }}>{lead.budgetMax.toLocaleString('fr-FR')} EUR</span>
              </div>
            )}
            {lead.villeResidence && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Domicile :</span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.villeResidence}{lead.departement ? ` (${lead.departement})` : ''}</span>
              </div>
            )}
            {lead.typeBien && (
              <div className="col-span-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Type de bien : </span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.typeBien}</span>
              </div>
            )}
            {lead.zoneRecherche && (
              <div className="col-span-2">
                <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Zone : </span>
                <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)", lineHeight: 1.6 }}>{lead.zoneRecherche}</span>
              </div>
            )}
          </div>
          {/* Bouton upload mandat signe */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadMandat}
                disabled={isUploadingMandat}
              />
              <span className="inline-flex items-center gap-1.5 transition-colors duration-300" style={{
                padding: "8px 14px",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: isUploadingMandat ? "var(--foreground-faint)" : "var(--foreground-muted)",
                background: isUploadingMandat ? "var(--surface)" : "transparent",
                border: `1px solid ${isUploadingMandat ? "var(--border)" : "var(--border)"}`,
                cursor: isUploadingMandat ? "not-allowed" : "pointer",
              }}>
                {isUploadingMandat ? (
                  <><Loader2 className="w-3 h-3 animate-spin" style={{ strokeWidth: 1.5 }} /> Upload en cours...</>
                ) : (
                  <><Upload className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> {lead.mandatSignePdfUrl ? 'Remplacer le mandat signe' : 'Uploader le mandat signe'}</>
                )}
              </span>
            </label>
          </div>
          {/* Bouton rattrapage : renvoyer invitation mandat */}
          {lead && !lead.mandatRempli && (
            <div className="mt-2">
              <button
                onClick={handleSendMandatInvit}
                disabled={isSendingMandatInvit}
                className="inline-flex items-center gap-1.5 transition-colors duration-300"
                style={{
                  padding: "8px 14px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  color: isSendingMandatInvit ? "var(--foreground-faint)" : "var(--gold)",
                  background: "transparent",
                  border: `1px solid ${isSendingMandatInvit ? "var(--border)" : "rgba(201,168,76,0.3)"}`,
                  cursor: isSendingMandatInvit ? "not-allowed" : "pointer",
                }}
              >
                {isSendingMandatInvit ? (
                  <><Loader2 className="w-3 h-3 animate-spin" style={{ strokeWidth: 1.5 }} /> Envoi en cours...</>
                ) : (
                  <><Mail className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Renvoyer l'invitation mandat</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timeline des activites */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", padding: "24px" }}>
        <LeadTimeline crmLeadId={leadId} nomLead={lead ? `${lead.prenom} ${lead.nom}` : undefined} />
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function RechercheBienBoard() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | "actif" | "en_pause" | "cloture" | "perdu">("tous");
  const [filterOffre, setFilterOffre] = useState<"tous" | "acceptee" | "en_cours">("tous");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const { data: rawLeads, isLoading, refetch } = trpc.crm.list.useQuery({
    etape: "recherche_bien",
    limit: 200,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const leads: RechercheLead[] = ((rawLeads as any)?.items ?? []) as RechercheLead[];

  // Filtres
  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.nom.toLowerCase().includes(q)
      || l.prenom.toLowerCase().includes(q)
      || l.email.toLowerCase().includes(q)
      || (l.agentAssigne ?? "").toLowerCase().includes(q);
    const matchStatut = filterStatut === "tous" || l.statut === filterStatut;
    const matchOffre =
      filterOffre === "tous"
      || (filterOffre === "acceptee" && l.offreAcceptee)
      || (filterOffre === "en_cours" && !l.offreAcceptee);
    return matchSearch && matchStatut && matchOffre;
  });

  // Statistiques
  const total = leads.length;
  const aTraiter = leads.filter((l) => !l.agentAssigne).length;
  const avecAgent = leads.filter((l) => !!l.agentAssigne).length;
  const offreAcceptee = leads.filter((l) => l.offreAcceptee).length;
  const totalBiens = leads.reduce((sum, l) => sum + (l.nbBiensPresentes ?? 0), 0);

  const exportCSV = () => {
    const rows = [
      ["Prenom", "Nom", "Email", "Telephone", "Statut", "Agent assigne", "Biens presentes", "Offre acceptee", "Enveloppe (EUR)", "Formule", "Derniere action"],
      ...filtered.map((l) => [
        l.prenom,
        l.nom,
        l.email,
        l.telephone ?? "",
        l.statut,
        l.agentAssigne ?? "",
        String(l.nbBiensPresentes ?? 0),
        l.offreAcceptee ? "Oui" : "Non",
        l.enveloppeValidee ? String(l.enveloppeValidee) : "",
        l.formule ?? "",
        new Date(l.updatedAt).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recherche-bien-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <AdminNav />

      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "0.04em",
            }}>
              Recherche bien
            </h1>
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>
              Tous les leads en etape Recherche bien
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 transition-colors duration-300"
              style={{ color: "var(--foreground-faint)", border: "1px solid var(--border)", borderRadius: "2px", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-faint)"; }}
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
                color: "var(--foreground-muted)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                background: "transparent",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
            >
              <Download className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px mb-10" style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "2px" }}>
          {[
            { label: "Total leads", value: total, gold: true },
            { label: "A traiter", value: aTraiter, gold: false },
            { label: "Agent assigne", value: avecAgent, gold: false },
            { label: "Offre acceptee", value: offreAcceptee, gold: false },
            { label: "Biens presentes", value: totalBiens, gold: false },
          ].map((kpi) => (
            <div key={kpi.label} className="p-5" style={{ background: "var(--background)" }}>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 600,
                color: kpi.gold ? "var(--gold)" : "var(--foreground)",
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
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, agent..."
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
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as any)}
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
            <option value="actif">Actif</option>
            <option value="en_pause">En pause</option>
            <option value="cloture">Cloture</option>
            <option value="perdu">Perdu</option>
          </select>
          <select
            value={filterOffre}
            onChange={(e) => setFilterOffre(e.target.value as any)}
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
            <option value="tous">Toutes les offres</option>
            <option value="acceptee">Offre acceptee</option>
            <option value="en_cours">En recherche</option>
          </select>
        </div>

        {/* Resultats */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--foreground-muted)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Home className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)", strokeWidth: 1.5 }} />
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
                {leads.length === 0
                  ? "Aucun lead en etape Recherche bien pour l'instant."
                  : "Aucun resultat pour ces filtres."}
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
                  {filtered.length} lead{filtered.length > 1 ? "s" : ""} affiche{filtered.length > 1 ? "s" : ""}
                </p>
              </div>

              {/* Vue tableau (desktop) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Client", "Statut", "Agent assigne", "Avancement", "Enveloppe", "Derniere action", "Modules"].map(h => (
                        <th key={h} className="text-left px-5 py-3 label-uppercase" style={{ background: "var(--surface-header)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => {
                      const status = getRechercheStatus(lead);
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="cursor-pointer transition-colors duration-300"
                          style={{ borderBottom: "1px solid var(--border-subtle)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-5 py-3">
                            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>
                              {lead.prenom} {lead.nom}
                            </p>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <StatutBadge statut={lead.statut} />
                          </td>
                          <td className="px-5 py-3">
                            {lead.agentAssigne ? (
                              <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{lead.agentAssigne}</span>
                            ) : (
                              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Non assigne</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1" style={{
                              padding: "2px 8px",
                              borderRadius: "2px",
                              fontSize: "10px",
                              fontFamily: "'Hanken Grotesk', sans-serif",
                              fontWeight: 500,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase" as const,
                              color: status.style.color,
                              background: status.style.bg,
                              border: `1px solid ${status.style.border}`,
                            }}>
                              {status.icon}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {lead.enveloppeValidee ? (
                              <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>
                                {lead.enveloppeValidee.toLocaleString("fr-FR")} EUR
                              </span>
                            ) : (
                              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {lead.updatedAt ? (() => {
                              const diff = Date.now() - new Date(lead.updatedAt).getTime();
                              const days = Math.floor(diff / 86400000);
                              return (
                                <span className="tabular-nums" style={{
                                  fontSize: "12px",
                                  fontFamily: "'Hanken Grotesk', sans-serif",
                                  color: days >= 7 ? "var(--destructive)" : days >= 3 ? "var(--gold)" : "var(--foreground-muted)",
                                }}>
                                  {days === 0 ? "Aujourd'hui" : days === 1 ? "Hier" : `Il y a ${days}j`}
                                </span>
                              );
                            })() : <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>—</span>}
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

              {/* Vue cartes (mobile) */}
              <div className="md:hidden">
                {filtered.map((lead) => {
                  const status = getRechercheStatus(lead);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="p-4 cursor-pointer transition-colors duration-300"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{lead.prenom} {lead.nom}</p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>{lead.email}</p>
                        </div>
                        <StatutBadge statut={lead.statut} />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
                        {lead.agentAssigne ? (
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)" }}>{lead.agentAssigne}</span>
                        ) : (
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucun agent assigne</span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1" style={{
                        padding: "3px 8px",
                        borderRadius: "2px",
                        fontSize: "10px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase" as const,
                        color: status.style.color,
                        background: status.style.bg,
                        border: `1px solid ${status.style.border}`,
                      }}>
                        {status.icon}
                        <span>{status.label}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal fiche detail */}
      <Dialog open={!!selectedLeadId} onOpenChange={(open) => { if (!open) setSelectedLeadId(null); }}>
        <DialogContent style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "2px", maxWidth: "640px", maxHeight: "85vh", overflow: "auto" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em" }} className="flex items-center gap-2">
              <Home className="w-5 h-5" style={{ color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
              Suivi Recherche bien
            </DialogTitle>
          </DialogHeader>
          {selectedLeadId && (
            <RechercheBienDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

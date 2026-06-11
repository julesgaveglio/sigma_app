import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import LeadTimeline from "@/components/LeadTimeline";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, CalendarPlus, Send, Star, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type Etape = "welcome_call" | "sigma_cash" | "sigma_credit" | "point_personnalise" | "courtage" | "recherche_bien";
type Statut = "actif" | "en_pause" | "cloture" | "perdu";

interface CrmLead {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  etape: Etape;
  statut: Statut;
  responsable: string | null;
  leadId: number | null;
  mandatId: number | null;
  hexaId: number | null;
  welcomeCallFait: boolean;
  etatCivilRempli: boolean;
  mandatRempli: boolean;
  tableauCourtageRempli: boolean;
  accesPodia: boolean;
  documentsDeposes: boolean;
  avisDepose: boolean;
  discoursClair: boolean;
  avisRetourExp: boolean;
  enveloppeOk: boolean;
  mandatSigne: boolean;
  courtierAssigne: string | null;
  enveloppeValidee: number | null;
  enveloppeDate: string | null;
  agentAssigne: string | null;
  nbBiensPresentes: number;
  offreAcceptee: boolean;
  globalNotes: string | null; // texte libre (renommé côté frontend)
  // Marie — Avis & Témoignages
  marieAssignee: boolean;
  marieAssigneeEtape: "courtage" | "immo" | null;
  testimonyMarieFait: boolean;
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

interface CrmNote {
  id: number;
  crmLeadId: number;
  etape: string;
  auteur: string | null;
  contenu: string;
  createdAt: Date;
}

// ─── Config étapes ────────────────────────────────────────────────────────────

const ETAPES: { key: Etape; label: string; responsable: string; color: string; bg: string; icon: string; borderTop: string }[] = [
  { key: "sigma_cash", label: "Sigma Cash", responsable: "Hanna", color: "text-[var(--gold)]", bg: "bg-[var(--surface)] border-[var(--border)]", icon: "", borderTop: "var(--stage-sigma-cash)" },
  { key: "sigma_credit", label: "Sigma Crédit", responsable: "Hanna", color: "text-[var(--foreground)]", bg: "bg-[var(--surface)] border-[var(--border)]", icon: "", borderTop: "var(--stage-sigma-credit)" },
  { key: "welcome_call", label: "Welcome Call", responsable: "Maria", color: "text-[var(--foreground)]", bg: "bg-[var(--surface)] border-[var(--border)]", icon: "", borderTop: "var(--stage-welcome-call)" },
  { key: "courtage", label: "Courtage", responsable: "Manon", color: "text-[var(--foreground)]", bg: "bg-[var(--surface)] border-[var(--border)]", icon: "", borderTop: "var(--stage-courtage)" },
  { key: "point_personnalise", label: "Point Personnalisé", responsable: "Maria", color: "text-[var(--foreground)]", bg: "bg-[var(--surface)] border-[var(--border)]", icon: "", borderTop: "var(--stage-point-perso)" },
  { key: "recherche_bien", label: "Recherche bien", responsable: "Élodie", color: "text-[var(--foreground)]", bg: "bg-[var(--surface)] border-[var(--border)]", icon: "", borderTop: "var(--stage-recherche-bien)" },
];

const STATUT_COLORS: Record<Statut, string> = {
  actif: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  en_pause: "bg-[var(--foreground-muted)]/15 text-[var(--foreground-muted)] border-[var(--foreground-muted)]/30",
  cloture: "bg-[var(--foreground-faint)]/15 text-[var(--foreground-faint)] border-[var(--foreground-faint)]/30",
  perdu: "bg-[var(--destructive)]/15 text-[var(--destructive)] border-[var(--destructive)]/30",
};

const STATUT_LABELS: Record<Statut, string> = {
  actif: "Actif",
  en_pause: "En pause",
  cloture: "Clôturé",
  perdu: "Perdu",
};

// ─── Helper : normalise la réponse backend ────────────────────────────────────
// Le backend retourne { ...lead, globalNotes: string|null, notes: CrmNote[] }
// globalNotes = champ texte libre, notes = tableau d'historique
function normalizeLead(raw: Record<string, unknown>): CrmLead & { noteHistory: CrmNote[] } {
  const { notes, globalNotes, ...rest } = raw;
  const noteHistory: CrmNote[] = Array.isArray(notes) ? (notes as CrmNote[]) : [];
  return {
    ...rest,
    globalNotes: (globalNotes as string | null) ?? null,
    noteHistory,
  } as unknown as CrmLead & { noteHistory: CrmNote[] };
}

// ─── Composant carte Kanban ───────────────────────────────────────────────────

function KanbanCard({
  lead,
  onClick,
  onDragStart,
}: {
  lead: CrmLead;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, leadId: number) => void;
}) {
  const etape = ETAPES.find(e => e.key === lead.etape)!;
  const wcChecks = [lead.welcomeCallFait, lead.etatCivilRempli, lead.mandatRempli, lead.tableauCourtageRempli, lead.accesPodia, lead.documentsDeposes, lead.avisDepose];
  const wcDone = wcChecks.filter(Boolean).length;
  const leadExt = lead as CrmLead & { formule?: string; montantFormule?: number };

  const FORMULE_BADGE: Record<string, { label: string; color: string; emoji: string }> = {
    starter:     { label: "Starter",     color: "bg-[var(--surface-raised)] text-[var(--foreground-muted)] border-[var(--border)]",     emoji: "" },
    premium:     { label: "Premium",     color: "bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25", emoji: "" },
    sdt_starter: { label: "SDT Starter", color: "bg-[var(--surface-raised)] text-[var(--foreground-muted)] border-[var(--border)]",   emoji: "" },
    sdt_premium: { label: "SDT Premium", color: "bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25", emoji: "" },
  };

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-4 cursor-grab active:cursor-grabbing hover:border-[var(--gold)]/30 transition-all duration-300 group select-none"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--foreground)] text-sm group-hover:text-[var(--gold)] transition-colors duration-300" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {lead.prenom} {lead.nom}
          </p>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5 truncate" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{lead.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-[2px] border uppercase tracking-[0.08em] font-medium ${STATUT_COLORS[lead.statut]}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {STATUT_LABELS[lead.statut]}
          </span>
          {leadExt.formule && FORMULE_BADGE[leadExt.formule] && (
            <span className={`text-[11px] px-2 py-0.5 rounded-[2px] border font-medium uppercase tracking-[0.08em] ${FORMULE_BADGE[leadExt.formule].color}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              {FORMULE_BADGE[leadExt.formule].emoji}{FORMULE_BADGE[leadExt.formule].emoji ? " " : ""}{FORMULE_BADGE[leadExt.formule].label}
            </span>
          )}
        </div>
      </div>

      {/* Indicateurs modules */}
      <div className="flex gap-1.5 mb-3">
        <span className={`text-[11px] px-1.5 py-0.5 rounded-[2px] border ${lead.leadId ? "bg-[var(--surface-raised)] text-[var(--foreground)] border-[var(--border)]" : "bg-[var(--surface)] text-[var(--foreground-faint)] border-[var(--border)]"}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          EC {lead.leadId ? "+" : "-"}
        </span>
        <span className={`text-[11px] px-1.5 py-0.5 rounded-[2px] border ${lead.mandatId ? "bg-[var(--surface-raised)] text-[var(--foreground)] border-[var(--border)]" : "bg-[var(--surface)] text-[var(--foreground-faint)] border-[var(--border)]"}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          Mandat {lead.mandatId ? "+" : "-"}
        </span>
        <span className={`text-[11px] px-1.5 py-0.5 rounded-[2px] border ${lead.hexaId ? "bg-[var(--surface-raised)] text-[var(--foreground)] border-[var(--border)]" : "bg-[var(--surface)] text-[var(--foreground-faint)] border-[var(--border)]"}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          Credit {lead.hexaId ? "+" : "-"}
        </span>
      </div>

      {lead.etape === "welcome_call" && (
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-[var(--foreground-muted)] mb-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            <span className="uppercase tracking-[0.08em]">Onboarding</span>
            <span className="tabular-nums">{wcDone}/7</span>
          </div>
          <div className="h-[2px] bg-[var(--border)] overflow-hidden">
            <div className="h-full bg-[var(--gold)] transition-all duration-300" style={{ width: `${(wcDone / 7) * 100}%` }} />
          </div>
        </div>
      )}

      {lead.etape === "point_personnalise" && (
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-[var(--foreground-muted)] mb-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            <span className="uppercase tracking-[0.08em]">Point Personnalise</span>
            <span className="tabular-nums">{[lead.avisRetourExp, lead.enveloppeOk, lead.mandatSigne].filter(Boolean).length}/3</span>
          </div>
          <div className="h-[2px] bg-[var(--border)] overflow-hidden">
            <div className="h-full bg-[var(--foreground-muted)] transition-all duration-300" style={{ width: `${([lead.avisRetourExp, lead.enveloppeOk, lead.mandatSigne].filter(Boolean).length / 3) * 100}%` }} />
          </div>
        </div>
      )}

      {lead.etape === "courtage" && lead.enveloppeValidee && (
        <p className="text-xs text-[var(--foreground)] mt-1 tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{lead.enveloppeValidee.toLocaleString("fr-FR")} EUR</p>
      )}

      {(lead.etape === "sigma_cash" || lead.etape === "sigma_credit") && (
        <SigmaCashMiniCard leadEmail={lead.email} />
      )}

      <p className="text-xs text-[var(--foreground-faint)] mt-2 tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

//// ─── Historique des fiches biens proposées ─────────────────────────────────────

function BienPropositionsHistory({ leadId }: { leadId: number }) {
  const { data: propositions, isLoading } = trpc.calendar.getPropositionsLead.useQuery({ crmLeadId: leadId });

  if (isLoading) return (
    <div className="flex items-center gap-2 py-2">
      <div className="w-4 h-4 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-[var(--foreground-muted)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Chargement des fiches envoyees...</span>
    </div>
  );

  const fmtPrix = (n: unknown) => {
    if (!n) return null;
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n));
  };

  return (
    <div>
      <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-3 flex items-center gap-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        Fiches biens envoyees
        {propositions && propositions.length > 0 && (
          <span className="bg-[var(--surface-raised)] text-[var(--foreground-muted)] text-[11px] px-2 py-0.5 rounded-[2px] border border-[var(--border)] tabular-nums">
            {propositions.length} fiche{propositions.length > 1 ? "s" : ""}
          </span>
        )}
      </h3>
      {(!propositions || propositions.length === 0) ? (
        <p className="text-xs text-[var(--foreground-faint)] italic" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Aucune fiche bien envoyee pour ce lead.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {propositions.map((p) => {
            const isOffMarket = (p as any).source === 'off_market';
            // Données off-market
            const omTypeLabel: string | null = (p as any).omTypeBien
              ? ((p as any).omTypeBien as string).charAt(0).toUpperCase() + ((p as any).omTypeBien as string).slice(1).replace(/_/g, " ")
              : null;
            const omTitre: string = (p as any).omTitre ?? (p as any).bienTitreSnapshot ?? "Bien Off Market";
            const omRegion: string | null = (p as any).omRegion ?? null;
            const omPrix = fmtPrix((p as any).omPrixBien);
            const omRenta: string | null = (p as any).omRentabiliteBrute
              ? `${Number((p as any).omRentabiliteBrute).toFixed(2)} %`
              : null;
            const omImage: string | null = (p as any).omImagePrincipale ?? null;
            // Données bien classique
            const typeLabel = p.bienTypeBien
              ? p.bienTypeBien.charAt(0).toUpperCase() + p.bienTypeBien.slice(1).replace(/_/g, " ")
              : "Bien";
            const surface = p.bienSurface ? ` — ${p.bienSurface} m²` : "";
            const ville = p.bienVille ?? p.bienAdresse ?? "";
            const prix = fmtPrix(p.bienPrix);
            const ref = p.bienReference ? `SF-${String(p.bienReference).padStart(6, "0")}` : "";
            return (
              <div key={p.id} className={`border rounded-[2px] p-3 flex items-start gap-3 ${
                isOffMarket ? "bg-[var(--surface)] border-[var(--gold)]/15" : "bg-[var(--surface)] border-[var(--border)]"
              }`}>
                {/* Miniature image off-market */}
                {isOffMarket && omImage && (
                  <img src={omImage} alt={omTitre}
                    className="w-14 h-14 object-cover rounded-[2px] shrink-0 border border-[var(--border)]" />
                )}
                <div className="flex-1 min-w-0">
                  {/* Badge source + type */}
                  <div className="flex items-center gap-2 mb-1">
                    {isOffMarket ? (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-[2px] bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/25 uppercase tracking-[0.08em]">
                        Off Market
                      </span>
                    ) : (
                      ref && <span className="text-xs font-medium text-[var(--foreground-muted)]">{ref}</span>
                    )}
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {isOffMarket ? omTypeLabel ?? "" : `${typeLabel}${surface}`}
                    </span>
                  </div>
                  {/* Titre / localisation */}
                  {isOffMarket ? (
                    <>
                      <p className="text-xs text-[var(--foreground)] font-medium truncate">{omTitre}</p>
                      {omRegion && <p className="text-xs text-[var(--foreground-muted)]">{omRegion}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        {omPrix && <span className="text-xs text-[var(--gold)] font-medium tabular-nums">{omPrix}</span>}
                        {omRenta && <span className="text-xs text-[var(--foreground-muted)] tabular-nums">{omRenta} brut</span>}
                      </div>
                    </>
                  ) : (
                    <>
                      {ville && <p className="text-xs text-[var(--foreground-muted)] truncate">{ville}</p>}
                      {prix && <p className="text-xs text-[var(--foreground)] font-medium mt-0.5 tabular-nums">{prix}</p>}
                    </>
                  )}
                  {/* Date + auteur */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-[var(--foreground-faint)] tabular-nums">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                    {p.envoyePar && <span className="text-xs text-[var(--foreground-faint)]">par {p.envoyePar}</span>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {p.pdfUrl && (
                    <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-2 py-1 rounded-[2px] border border-[var(--border)] transition-colors duration-300 text-center whitespace-nowrap uppercase tracking-[0.08em]">
                      PDF
                    </a>
                  )}
                  {isOffMarket && (p as any).offMarketBienId && (
                    <a href={`/off-market?id=${(p as any).offMarketBienId}`}
                      className="text-[11px] bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-2 py-1 rounded-[2px] border border-[var(--border)] transition-colors duration-300 text-center whitespace-nowrap">
                      Voir fiche
                    </a>
                  )}
                  {!isOffMarket && p.bienId && (
                    <a href={`/recherche-bien?id=${p.bienId}`}
                      className="text-[11px] bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-2 py-1 rounded-[2px] border border-[var(--border)] transition-colors duration-300 text-center whitespace-nowrap">
                      Voir fiche
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Bouton envoi dossier au courtier ───────────────────────────────────────

function SendDossierCourtierButton({
  crmLeadId,
  courtierEmail,
  courtierNom,
}: {
  crmLeadId: number;
  courtierEmail: string;
  courtierNom: string;
}) {
  const [email, setEmail] = useState(courtierEmail);
  const sendMutation = trpc.dossier.sendToCourtier.useMutation({
    onSuccess: () => toast.success("Dossier envoyé au courtier avec succès !"),
    onError: (e) => toast.error("Erreur : " + e.message),
  });

  const handleSend = () => {
    if (!email || !email.includes("@")) {
      toast.error("Veuillez saisir l'email du courtier avant d'envoyer.");
      return;
    }
    sendMutation.mutate({ crmLeadId, courtierEmail: email, courtierNom: courtierNom || undefined });
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Email du courtier (pour envoi dossier)</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[var(--surface-raised)] border-[var(--border)] text-sm h-8 rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]"
            placeholder="courtier@cabinet.fr"
            type="email"
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={sendMutation.isPending}
          size="sm"
          className="bg-[var(--gold)] hover:brightness-110 text-[var(--background)] font-medium h-8 px-3 flex items-center gap-1.5 shrink-0 rounded-[2px] text-[11px] uppercase tracking-[0.1em]"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
          {sendMutation.isPending ? "Envoi..." : "Envoyer le dossier"}
        </Button>
      </div>
      <p className="text-xs text-[var(--foreground-faint)] mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Genere le PDF complet et l'envoie au courtier + copie Manon</p>
    </div>
  );
}

// ─── Mini-carte encaissement pour les cartes Kanban ───────────────────────────

function SigmaCashMiniCard({ leadEmail }: { leadEmail: string }) {
  const { data } = trpc.sales.getCloseByEmail.useQuery({ email: leadEmail });
  if (!data) return null;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
  const statutColor = data.statutEncaissement === "recu" ? "text-[var(--success)]" : data.statutEncaissement === "initie" ? "text-[var(--foreground-muted)]" : "text-[var(--gold)]";
  const statutLabel = data.statutEncaissement === "recu" ? "Recu" : data.statutEncaissement === "initie" ? "Initie" : "En attente";
  return (
    <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
      <div className="flex justify-between text-xs" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <span className="text-[var(--foreground-muted)]">Genere</span>
        <span className="text-[var(--foreground)] font-medium tabular-nums">{fmt(data.montantGenere)}</span>
      </div>
      {data.resteAPayer > 0 && (
        <div className="flex justify-between text-xs" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          <span className="text-[var(--foreground-muted)]">Reste</span>
          <span className="text-[var(--gold)] font-medium tabular-nums">{fmt(data.resteAPayer)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <span className="text-[var(--foreground-muted)]">Statut</span>
        <span className={`font-medium ${statutColor}`}>{statutLabel}</span>
      </div>
      {(data.dateVirementPrevu || data.datePrelevement) && (
        <div className="flex justify-between text-xs" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          <span className="text-[var(--foreground-muted)]">{data.dateVirementPrevu ? "Virement le" : "Prel. le"}</span>
          <span className="text-[var(--foreground)] tabular-nums">{data.dateVirementPrevu || data.datePrelevement}</span>
        </div>
      )}
    </div>
  );
}

// ─── Console encaissement Sigma Cash / Sigma Crédit ───────────────────────────────

const MODE_LABELS: Record<string, string> = {
  comptant: "Comptant (CB)",
  deux_fois: "2 fois (CB + virement)",
  cinquante_pourcent: "50% CB + 50% prélèvement",
};

const STATUT_ENC_COLORS: Record<string, string> = {
  en_attente: "bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25",
  initie: "bg-[var(--foreground-muted)]/15 text-[var(--foreground-muted)] border-[var(--foreground-muted)]/30",
  recu: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
};

const STATUT_ENC_LABELS: Record<string, string> = {
  en_attente: "En attente",
  initie: "Initie",
  recu: "Recu",
};

function SigmaEncaissementPanel({ leadEmail }: { leadEmail: string }) {
  const utils = trpc.useUtils();
  const { data: closeData, isLoading } = trpc.sales.getCloseByEmail.useQuery({ email: leadEmail });
  const updateStatut = trpc.sales.updateStatutEncaissement.useMutation({
    onSuccess: () => {
      utils.sales.getCloseByEmail.invalidate({ email: leadEmail });
      toast.success("Statut encaissement mis à jour");
    },
    onError: (e) => toast.error("Erreur : " + e.message),
  });

  const [editDate, setEditDate] = useState(false);
  const [newDate, setNewDate] = useState("");

  if (isLoading) return (
    <div className="flex items-center gap-2 py-3">
      <div className="w-4 h-4 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-[var(--foreground-muted)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Chargement des donnees encaissement...</span>
    </div>
  );

  if (!closeData) return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-4">
      <p className="text-xs text-[var(--foreground-muted)] italic" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Aucun rapport de vente lie trouve pour cet email.</p>
    </div>
  );

  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Console Encaissement</h3>

      {/* Montants */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-3 text-center">
          <p className="text-[11px] text-[var(--foreground-muted)] mb-1 uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Genere</p>
          <p className="text-lg font-semibold text-[var(--foreground)] tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{fmt(closeData.montantGenere)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-3 text-center">
          <p className="text-[11px] text-[var(--foreground-muted)] mb-1 uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Encaisse</p>
          <p className="text-lg font-semibold text-[var(--success)] tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{fmt(closeData.montantEncaisse)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-3 text-center">
          <p className="text-[11px] text-[var(--foreground-muted)] mb-1 uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Reste</p>
          <p className={`text-lg font-semibold tabular-nums ${closeData.resteAPayer > 0 ? "text-[var(--gold)]" : "text-[var(--foreground-faint)]"}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>{fmt(closeData.resteAPayer)}</p>
        </div>
      </div>

      {/* Détail paiement */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-4 space-y-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--foreground-muted)]">Mode de paiement</span>
          <span className="text-xs font-medium text-[var(--foreground)]">{MODE_LABELS[closeData.modePaiement ?? ""] ?? closeData.modePaiement ?? "—"}</span>
        </div>
        {closeData.montantCb > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--foreground-muted)]">CB Stripe</span>
            <span className="text-xs text-[var(--foreground)] tabular-nums">{fmt(closeData.montantCb)}</span>
          </div>
        )}
        {closeData.montantVirement > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--foreground-muted)]">Virement</span>
            <span className="text-xs text-[var(--foreground)] tabular-nums">{fmt(closeData.montantVirement)}</span>
          </div>
        )}
        {closeData.montantPrelevement > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--foreground-muted)]">Prelevement</span>
            <span className="text-xs text-[var(--foreground)] tabular-nums">{fmt(closeData.montantPrelevement)}</span>
          </div>
        )}
        {closeData.montantCreditImpot > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--foreground-muted)]">Credit d'impot</span>
            <span className="text-xs text-[var(--gold)] font-medium tabular-nums">{fmt(closeData.montantCreditImpot)}</span>
          </div>
        )}
        {(closeData.dateVirementPrevu || closeData.datePrelevement) && (
          <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--foreground-muted)]">{closeData.dateVirementPrevu ? "Date virement prevu" : "Date prelevement"}</span>
            <span className="text-xs text-[var(--foreground)] tabular-nums">{closeData.dateVirementPrevu || closeData.datePrelevement}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--foreground-muted)]">Closer</span>
          <span className="text-xs text-[var(--foreground)]">{closeData.closerNom}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--foreground-muted)]">Date close</span>
          <span className="text-xs text-[var(--foreground)] tabular-nums">{new Date(closeData.dateCall).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>

      {/* Statut encaissement */}
      <div>
        <p className="text-[11px] text-[var(--foreground-muted)] mb-2 uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Statut encaissement</p>
        <div className="flex gap-2 flex-wrap">
          {(["en_attente", "initie", "recu"] as const).map(s => (
            <button
              key={s}
              onClick={() => updateStatut.mutate({ closeId: closeData.id, statutEncaissement: s })}
              disabled={updateStatut.isPending}
              className={`px-3 py-1.5 text-[11px] rounded-[2px] border transition-all duration-300 uppercase tracking-[0.08em] ${
                closeData.statutEncaissement === s
                  ? `${STATUT_ENC_COLORS[s]} font-medium`
                  : "border-[var(--border)] text-[var(--foreground-faint)] hover:border-[var(--foreground-muted)] hover:text-[var(--foreground-muted)]"
              }`}
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              {STATUT_ENC_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Modifier date virement prévu */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Date virement prevu</p>
          <button onClick={() => { setEditDate(!editDate); setNewDate(closeData.dateVirementPrevu ?? ""); }} className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors duration-300" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {editDate ? "Annuler" : "Modifier"}
          </button>
        </div>
        {editDate ? (
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="flex-1 bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] text-xs rounded-[2px] px-3 py-1.5 focus:outline-none focus:border-[var(--gold)] transition-colors duration-300"
            />
            <button
              onClick={() => {
                updateStatut.mutate({ closeId: closeData.id, statutEncaissement: closeData.statutEncaissement ?? "en_attente", dateVirementPrevu: newDate });
                setEditDate(false);
              }}
              className="bg-[var(--gold)] hover:brightness-110 text-[var(--background)] text-[11px] font-medium px-3 py-1.5 rounded-[2px] uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              OK
            </button>
          </div>
        ) : (
          <p className="text-xs text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)] rounded-[2px] px-3 py-1.5 tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {closeData.dateVirementPrevu || <span className="text-[var(--foreground-faint)] italic">Non renseignee</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Fiche détail ─────────────────────────────────────────────────────

function LeadDetail({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: rawData, isLoading } = trpc.crm.getById.useQuery({ id: leadId });
  const updateMutation = trpc.crm.update.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate({});
      utils.crm.getById.invalidate({ id: leadId });
    },
  });
  const addNoteMutation = trpc.crm.addNote.useMutation({
    onSuccess: () => {
      utils.crm.getById.invalidate({ id: leadId });
      setNoteText("");
    },
  });

  const [noteText, setNoteText] = useState("");
  const [editNotes, setEditNotes] = useState(false);
  const [globalNotes, setGlobalNotes] = useState("");
  const [showPlanRdv, setShowPlanRdv] = useState(false);
  const [rdvType, setRdvType] = useState<"welcome_call" | "point_personnalise">("welcome_call");
  const [rdvDate, setRdvDate] = useState("");
  const [rdvHeure, setRdvHeure] = useState("10:00");
  const [, navigate] = useLocation();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isUploadingMandat, setIsUploadingMandat] = useState(false);
  const [isSendingMandatInvit, setIsSendingMandatInvit] = useState(false);
  const sendMandatInvitMutation = trpc.crm.sendMandatInvitation.useMutation({
    onSuccess: (data) => toast.success(`Invitation mandat envoyée à ${data.email}`),
    onError: (e) => toast.error("Erreur envoi : " + e.message),
  });
  const handleSendMandatInvit = async () => {
    if (isSendingMandatInvit) return;
    setIsSendingMandatInvit(true);
    try { await sendMandatInvitMutation.mutateAsync({ id: leadId }); }
    finally { setIsSendingMandatInvit(false); }
  };
  const { data: mandatVersionsList } = trpc.crm.listMandatVersions.useQuery({ crmLeadId: leadId }, { enabled: !!leadId });
  const uploadMandatMutation = trpc.crm.uploadMandatSigne.useMutation({
    onSuccess: (data) => {
      utils.crm.getById.invalidate({ id: leadId });
      utils.crm.list.invalidate({});
      utils.crm.listMandatVersions.invalidate({ crmLeadId: leadId });
      toast.success(`Mandat signé uploadé (version ${data.version}) !`);
    },
    onError: (e) => toast.error("Erreur upload : " + e.message),
  });
  const handleUploadMandat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Seuls les fichiers PDF sont acceptés."); return; }
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
  const generatePdfMutation = trpc.dossier.generatePdf.useMutation();
  const handleDownloadDossier = async () => {
    const lead = rawData as any;
    if (!lead?.leadId) {
      toast.error("Aucune fiche d'état civil liée à ce lead.");
      return;
    }
    setPdfLoading(true);
    try {
      const { url } = await generatePdfMutation.mutateAsync({ leadId: lead.leadId });
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error("Erreur lors de la génération du PDF : " + (e?.message ?? "inconnue"));
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Mutations Marie ────────────────────────────────────────────────────────
  const assignerMarieMutation = trpc.marie.assignerMarie.useMutation({
    onSuccess: () => {
      utils.crm.getById.invalidate({ id: leadId });
      utils.crm.list.invalidate({});
      toast.success("Marie assignée ! Elle recevra un email de notification.");
    },
    onError: (e) => toast.error("Erreur assignation Marie : " + e.message),
  });
  const marquerTestimonyMutation = trpc.marie.marquerTestimony.useMutation({
    onSuccess: () => {
      utils.crm.getById.invalidate({ id: leadId });
      utils.crm.list.invalidate({});
      toast.success("Testimony mis à jour !");
    },
    onError: (e) => toast.error("Erreur : " + e.message),
  });

  const createTaskMutation = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success("RDV planifié dans le Calendrier !");
      setShowPlanRdv(false);
    },
    onError: () => toast.error("Erreur lors de la planification"),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!rawData) return <p className="text-[var(--foreground-muted)] text-center py-8" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Lead introuvable.</p>;

  // Normaliser la réponse : séparer le champ texte `notes` (DB) du tableau `noteHistory`
  const normalized = normalizeLead(rawData as unknown as Record<string, unknown>);
  const lead = normalized as CrmLead & { noteHistory: CrmNote[] };
  const noteHistory: CrmNote[] = normalized.noteHistory ?? [];
  const etapeInfo = ETAPES.find(e => e.key === lead.etape)!;

  const toggle = (field: string, value: boolean) => {
    updateMutation.mutate({ id: lead.id, [field]: value });
  };

  const advanceEtape = () => {
    const idx = ETAPES.findIndex(e => e.key === lead.etape);
    if (idx < ETAPES.length - 1) {
      updateMutation.mutate({ id: lead.id, etape: ETAPES[idx + 1].key });
      toast.success(`Lead avancé vers "${ETAPES[idx + 1].label}"`);
    }
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
      {/* En-tete */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)] tracking-[0.04em]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{lead.prenom} {lead.nom}</h2>
          <p className="text-[var(--foreground-muted)] text-sm" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{lead.email}{lead.telephone ? ` · ${lead.telephone}` : ""}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-[11px] px-2 py-1 rounded-[2px] border uppercase tracking-[0.08em] font-medium ${STATUT_COLORS[lead.statut]}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {STATUT_LABELS[lead.statut]}
          </span>
          <Select
            value={lead.statut}
            onValueChange={(v) => updateMutation.mutate({ id: lead.id, statut: v as Statut })}
          >
            <SelectTrigger className="h-7 w-32 text-xs bg-[var(--surface-raised)] border-[var(--border)] text-[var(--foreground)] rounded-[2px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="en_pause">En pause</SelectItem>
              <SelectItem value="cloture">Clôturé</SelectItem>
              <SelectItem value="perdu">Perdu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Etape actuelle + navigation */}
      <div className="rounded-[2px] border border-[var(--border)] p-4 bg-[var(--surface)]" style={{ borderTop: `2px solid ${etapeInfo.borderTop}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div>
              <p className="font-semibold text-[var(--foreground)] tracking-[0.02em]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{etapeInfo.label}</p>
              <p className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Responsable : {etapeInfo.responsable}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground-muted)] rounded-[2px] uppercase tracking-[0.08em] transition-colors duration-300"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
              onClick={() => setShowPlanRdv(true)}
            >
              <CalendarPlus className="w-3 h-3 mr-1" strokeWidth={1.5} />
              Planifier RDV
            </Button>
            {ETAPES.findIndex(e => e.key === lead.etape) < ETAPES.length - 1 && (
              <Button
                size="sm"
                variant="outline"
                className="text-[11px] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground-muted)] rounded-[2px] uppercase tracking-[0.08em] transition-colors duration-300"
                style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
                onClick={advanceEtape}
              >
                Etape suivante
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {ETAPES.map((e, i) => {
            const currentIdx = ETAPES.findIndex(et => et.key === lead.etape);
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={e.key}
                onClick={() => updateMutation.mutate({ id: lead.id, etape: e.key })}
                className={`flex-1 text-[11px] py-1.5 rounded-[2px] border transition-all duration-300 uppercase tracking-[0.06em] ${
                  isCurrent ? "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--foreground)] font-medium" :
                  isDone ? "bg-[var(--surface-raised)] text-[var(--foreground-muted)] border-[var(--border)]" :
                  "bg-[var(--surface)] text-[var(--foreground-faint)] border-[var(--border)]"
                }`}
                style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
              >
                {isDone ? "+ " : ""}{e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dossiers associes */}
      <div>
        <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Dossiers associes</h3>
        <div className="grid grid-cols-3 gap-3">
          <a
            href={lead.leadId ? `/dashboard?lead=${lead.leadId}` : undefined}
            className={`rounded-[2px] border p-3 text-center transition-all duration-300 ${lead.leadId ? "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] cursor-pointer" : "border-[var(--border)] bg-[var(--surface)] opacity-40"}`}
          >
            <p className="text-[11px] font-medium text-[var(--foreground)] mt-1 uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Etat Civil</p>
            <p className="text-xs text-[var(--foreground-muted)] tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{lead.leadId ? `#${lead.leadId}` : "Non lie"}</p>
          </a>
          <a
            href={lead.mandatId ? `/dashboard/mandats?mandat=${lead.mandatId}` : undefined}
            className={`rounded-[2px] border p-3 text-center transition-all duration-300 ${lead.mandatId ? "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] cursor-pointer" : "border-[var(--border)] bg-[var(--surface)] opacity-40"}`}
          >
            <p className="text-[11px] font-medium text-[var(--foreground)] mt-1 uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Mandat</p>
            <p className="text-xs text-[var(--foreground-muted)] tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{lead.mandatId ? `#${lead.mandatId}` : "Non lie"}</p>
          </a>
          <a
            href={lead.hexaId ? `/dashboard/hexa?dossier=${lead.hexaId}` : undefined}
            className={`rounded-[2px] border p-3 text-center transition-all duration-300 ${lead.hexaId ? "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] cursor-pointer" : "border-[var(--border)] bg-[var(--surface)] opacity-40"}`}
          >
            <p className="text-[11px] font-medium text-[var(--foreground)] mt-1 uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Sigma Credit</p>
            <p className="text-xs text-[var(--foreground-muted)] tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{lead.hexaId ? `#${lead.hexaId}` : "Non lie"}</p>
          </a>
        </div>
      </div>

      {/* Timeline des activites */}
      <div className="border-t border-[var(--border)] pt-4">
        <LeadTimeline crmLeadId={lead.id} nomLead={`${lead.prenom} ${lead.nom}`} />
      </div>

      {/* Bouton telecharger dossier complet PDF */}
      <div className="pt-1">
        <Button
          onClick={handleDownloadDossier}
          disabled={pdfLoading || !lead.leadId}
          className="w-full bg-[var(--gold)] hover:brightness-110 text-[var(--background)] font-medium flex items-center gap-2 justify-center rounded-[2px] text-[11px] uppercase tracking-[0.1em] py-3"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          <Download className="w-4 h-4" strokeWidth={1.5} />
          {pdfLoading ? "Generation en cours..." : "Telecharger le dossier complet (PDF)"}
        </Button>
        {!lead.leadId && (
          <p className="text-xs text-[var(--foreground-faint)] text-center mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Fiche d'etat civil requise pour generer le dossier</p>
        )}
      </div>

      {/* Console encaissement Sigma Cash / Sigma Crédit */}
      {(lead.etape === "sigma_cash" || lead.etape === "sigma_credit") && (
        <SigmaEncaissementPanel leadEmail={lead.email} />
      )}

      {/* Checklist Welcome Call */}
      {lead.etape === "welcome_call" && (
        <div>
          <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Checklist Welcome Call — Maria</h3>
          <div className="space-y-2">
            {[
              { key: "welcomeCallFait", label: "Welcome call effectué" },
              { key: "etatCivilRempli", label: "Formulaire État Civil rempli" },
              { key: "mandatRempli", label: "Formulaire Mandat rempli" },
              { key: "tableauCourtageRempli", label: "Tableau de Courtage rempli" },
              { key: "accesPodia", label: "Accès Podia vérifié" },
              { key: "documentsDeposes", label: "Documents déposés sur Podia" },
              { key: "discoursClair", label: "Discours clair et compris" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!lead[key as keyof CrmLead]}
                  onChange={(e) => toggle(key, e.target.checked)}
                  className="w-4 h-4 accent-[var(--gold)] cursor-pointer"
                />
                <span className={`text-sm transition-colors duration-300 ${lead[key as keyof CrmLead] ? "text-[var(--foreground-faint)] line-through" : "text-[var(--foreground)] group-hover:text-[var(--foreground)]"}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  {label}
                </span>
              </label>
            ))}

            {/* Avis — 3 etats */}
            <div className="pt-1">
              <p className="text-sm text-[var(--foreground)] mb-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Avis Google / Trustpilot</p>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "en_attente", label: "En attente", color: "border-[var(--border)] text-[var(--foreground-muted)]" },
                  { value: "depose", label: "Depose", color: "border-[var(--success)]/40 text-[var(--success)]" },
                  { value: "pas_davis", label: "Pas d'avis", color: "border-[var(--destructive)]/40 text-[var(--destructive)]" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const newStatut = opt.value;
                      const newDepose = newStatut === "depose";
                      updateMutation.mutate({ id: lead.id, avisStatut: newStatut, avisDepose: newDepose });
                    }}
                    className={`px-3 py-1 text-[11px] rounded-[2px] border transition-all duration-300 uppercase tracking-[0.08em] ${
                      (lead as any).avisStatut === opt.value
                        ? `${opt.color} bg-[var(--surface-raised)] font-medium`
                        : "border-[var(--border)] text-[var(--foreground-faint)] hover:border-[var(--foreground-muted)] hover:text-[var(--foreground-muted)]"
                    }`}
                    style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Note obligatoire si Pas d'avis */}
              {(lead as any).avisStatut === "pas_davis" && (
                <div className="mt-2">
                  <p className="text-xs text-[var(--destructive)] mb-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Note obligatoire — pourquoi le lead ne veut pas laisser d'avis ?</p>
                  <textarea
                    defaultValue={(lead as any).avisNote ?? ""}
                    onBlur={(e) => updateMutation.mutate({ id: lead.id, avisNote: e.target.value })}
                    placeholder="Ex : lead reticent, probleme de confidentialite..."
                    rows={2}
                    className="w-full bg-[var(--surface)] border border-[var(--destructive)]/30 text-[var(--foreground)] text-xs p-2 rounded-[2px] resize-none focus:outline-none focus:border-[var(--destructive)] transition-colors duration-300"
                    style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checklist Point Personnalisé */}
      {lead.etape === "point_personnalise" && (
        <div>
          <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Checklist Point Personnalise — Maria</h3>
          <div className="space-y-2">
            {[
              { key: "avisRetourExp", label: "Avis + retour d'experience recolte" },
              { key: "enveloppeOk", label: "Enveloppe ok / pas ok confirmee" },
              { key: "mandatSigne", label: "Mandat signe" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!lead[key as keyof CrmLead]}
                  onChange={(e) => toggle(key, e.target.checked)}
                  className="w-4 h-4 accent-[var(--gold)] cursor-pointer"
                />
                <span className={`text-sm transition-colors duration-300 ${lead[key as keyof CrmLead] ? "text-[var(--foreground-faint)] line-through" : "text-[var(--foreground)] group-hover:text-[var(--foreground)]"}`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Courtage */}
      {lead.etape === "courtage" && (
        <div>
          <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Suivi Courtage — Manon</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Courtier assigne</label>
              <AssigneeSelect
                mode="courtier"
                value={lead.courtierAssigne ?? ""}
                leadVille={lead.villeResidence}
                onChange={(val, option) => {
                  const updates: Record<string, unknown> = { id: lead.id, courtierAssigne: val };
                  if (option?.email) updates.courtierEmail = option.email;
                  updateMutation.mutate(updates as any);
                }}
                placeholder="— Sélectionner un courtier —"
                className="w-full h-8"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Email du courtier</label>
              <Input
                defaultValue={(lead as any).courtierEmail ?? ""}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, courtierEmail: e.target.value } as any)}
                className="bg-[var(--surface-raised)] border-[var(--border)] text-sm h-8 rounded-[2px] text-[var(--foreground)] focus:border-[var(--gold)]"
                placeholder="courtier@cabinet.fr"
                type="email"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Enveloppe validee (EUR)</label>
              <Input
                type="number"
                defaultValue={lead.enveloppeValidee ?? ""}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, enveloppeValidee: e.target.value ? parseInt(e.target.value) : undefined })}
                className="bg-[var(--surface-raised)] border-[var(--border)] text-sm h-8 rounded-[2px] text-[var(--foreground)] tabular-nums focus:border-[var(--gold)]"
                placeholder="Ex. 350000"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Date annonce enveloppe</label>
              <Input
                type="date"
                defaultValue={lead.enveloppeDate ?? ""}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, enveloppeDate: e.target.value })}
                className="bg-[var(--surface-raised)] border-[var(--border)] text-sm h-8 rounded-[2px] text-[var(--foreground)] tabular-nums focus:border-[var(--gold)]"
              />
            </div>
          </div>
          {/* Bouton envoi dossier au courtier */}
          <SendDossierCourtierButton
            crmLeadId={lead.id}
            courtierEmail={(lead as any).courtierEmail ?? ""}
            courtierNom={lead.courtierAssigne ?? ""}
          />
        </div>
      )}

      {/* Recherche bien */}
      {lead.etape === "recherche_bien" && (
        <div className="space-y-4">
          {/* Bloc Mandat de Recherche */}
          {(lead.numeroMandat || lead.budgetMax || lead.zoneRecherche || lead.projetType) && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-3">
              <h4 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-3 flex items-center gap-1.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                Mandat de Recherche
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {lead.numeroMandat && (
                  <div className="col-span-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[var(--foreground-muted)]">N Mandat :</span>
                    <span className="text-[var(--foreground)] font-mono">{lead.numeroMandat}</span>
                    {lead.dateSignatureMandat && lead.dateSignatureMandat !== '—' && (
                      <span className="text-[var(--foreground-muted)] ml-2 tabular-nums">Signe le {lead.dateSignatureMandat}</span>
                    )}
                    {lead.mandatSignePdfUrl && (
                      <a
                        href={lead.mandatSignePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground-muted)] text-xs font-medium hover:text-[var(--foreground)] border border-[var(--border)] transition-colors duration-300"
                      >
                        Voir le mandat signe
                      </a>
                    )}
                  </div>
                )}
                {lead.projetType && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--foreground-muted)]">Projet :</span>
                    <span className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground)] font-medium border border-[var(--border)]">{lead.projetType}</span>
                  </div>
                )}
                {lead.budgetMax && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--foreground-muted)]">Budget max :</span>
                    <span className="text-[var(--foreground)] font-semibold tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{lead.budgetMax.toLocaleString('fr-FR')} EUR</span>
                  </div>
                )}
                {lead.villeResidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--foreground-muted)]">Domicile :</span>
                    <span className="text-[var(--foreground)]">{lead.villeResidence} ({lead.departement})</span>
                  </div>
                )}
                {lead.typeBien && (
                  <div className="col-span-2 flex items-start gap-2">
                    <span className="text-[var(--foreground-muted)] flex-shrink-0">Type de bien :</span>
                    <span className="text-[var(--foreground)]">{lead.typeBien}</span>
                  </div>
                )}
                {lead.zoneRecherche && (
                  <div className="col-span-2 flex items-start gap-2">
                    <span className="text-[var(--foreground-muted)] flex-shrink-0">Zone :</span>
                    <span className="text-[var(--foreground)] leading-relaxed">{lead.zoneRecherche}</span>
                  </div>
                )}
              </div>
              {/* Bouton upload mandat signé + historique des versions */}
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleUploadMandat}
                    disabled={isUploadingMandat}
                  />
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[11px] font-medium transition-colors duration-300 uppercase tracking-[0.08em] ${
                    isUploadingMandat
                      ? 'bg-[var(--surface-raised)] text-[var(--foreground-faint)] cursor-not-allowed'
                      : 'bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] cursor-pointer'
                  }`} style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    {isUploadingMandat ? (
                      <><span className="w-3 h-3 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin inline-block" /> Upload en cours...</>
                    ) : (
                      <>{lead.mandatSignePdfUrl ? `Remplacer le mandat signe${mandatVersionsList && mandatVersionsList.length > 0 ? ` (v${mandatVersionsList.length})` : ''}` : 'Uploader le mandat signe'}</>
                    )}
                  </span>
                </label>
                {/* Historique des versions */}
                {mandatVersionsList && mandatVersionsList.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-[var(--foreground-muted)] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Historique des versions</p>
                    {mandatVersionsList.map((v: any) => (
                      <div key={v.id} className="flex items-center gap-2 text-xs" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground-muted)] font-mono border border-[var(--border)] tabular-nums">v{v.version}</span>
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] truncate max-w-[160px] transition-colors duration-300"
                          title={v.nom}
                        >
                          {v.nom}
                        </a>
                        <span className="text-[var(--foreground-faint)] ml-auto flex-shrink-0 tabular-nums">{new Date(v.uploadedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                        {v.uploadePar && <span className="text-[var(--foreground-faint)] flex-shrink-0">— {v.uploadePar}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Bouton rattrapage : renvoyer invitation mandat */}
              {!lead.mandatRempli && (
                <div className="mt-2">
                  <button
                    onClick={handleSendMandatInvit}
                    disabled={isSendingMandatInvit}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[11px] font-medium transition-colors duration-300 uppercase tracking-[0.08em] ${
                      isSendingMandatInvit
                        ? 'bg-[var(--surface-raised)] text-[var(--foreground-faint)] cursor-not-allowed'
                        : 'bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] cursor-pointer'
                    }`}
                    style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
                  >
                    {isSendingMandatInvit ? (
                      <><span className="w-3 h-3 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin inline-block" /> Envoi en cours...</>
                    ) : (
                      <>Renvoyer l'invitation mandat</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Suivi Recherche bien — Elodie</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Agent assigne</label>
              <AssigneeSelect
                mode="agent"
                value={lead.agentAssigne ?? ""}
                onChange={(val) => updateMutation.mutate({ id: lead.id, agentAssigne: val })}
                placeholder="— Sélectionner un agent —"
                className="w-full h-8"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Biens presentes</label>
              <Input
                type="number"
                defaultValue={lead.nbBiensPresentes}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, nbBiensPresentes: parseInt(e.target.value) || 0 })}
                className="bg-[var(--surface-raised)] border-[var(--border)] text-sm h-8 rounded-[2px] text-[var(--foreground)] tabular-nums focus:border-[var(--gold)]"
                min={0}
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lead.offreAcceptee}
                  onChange={(e) => toggle("offreAcceptee", e.target.checked)}
                  className="w-4 h-4 accent-[var(--gold)]"
                />
                <span className="text-sm text-[var(--foreground)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Offre acceptee</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION MARIE — Avis & Témoignages ─── */}
      {(lead.etape === "courtage" || lead.etape === "recherche_bien") && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] p-4">
          <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-3 flex items-center gap-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            <Star className="w-3.5 h-3.5" strokeWidth={1.5} />
            Avis & Temoignages — Marie
          </h3>
          <div className="space-y-3">
            {/* Bouton assignation */}
            {!lead.marieAssignee ? (
              <button
                onClick={() => assignerMarieMutation.mutate({
                  crmLeadId: lead.id,
                  etapeSource: lead.etape === "courtage" ? "courtage" : "immo",
                })}
                disabled={assignerMarieMutation.isPending}
                className="flex items-center gap-2 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] text-[11px] font-medium px-4 py-2 rounded-[2px] transition-colors duration-300 disabled:opacity-50 uppercase tracking-[0.08em]"
                style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
              >
                {assignerMarieMutation.isPending ? (
                  <><span className="w-3 h-3 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin" /> Assignation en cours...</>
                ) : (
                  <><Star className="w-3.5 h-3.5" strokeWidth={1.5} /> Assigner Marie pour le temoignage</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)] bg-[var(--surface-raised)] border border-[var(--border)] px-3 py-1.5 rounded-[2px] uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  <Star className="w-3 h-3" strokeWidth={1.5} /> Marie assignee ({lead.marieAssigneeEtape === "courtage" ? "Courtage" : "Immo"})
                </span>
                <button
                  onClick={() => assignerMarieMutation.mutate({
                    crmLeadId: lead.id,
                    etapeSource: lead.etape === "courtage" ? "courtage" : "immo",
                  })}
                  className="text-xs text-[var(--foreground-faint)] hover:text-[var(--foreground-muted)] underline transition-colors duration-300"
                  style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
                >
                  Ré-assigner
                </button>
              </div>
            )}

            {/* Checkbox Testimony */}
            {lead.marieAssignee && (
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={lead.testimonyMarieFait}
                  onChange={(e) => marquerTestimonyMutation.mutate({ crmLeadId: lead.id, fait: e.target.checked })}
                  className="w-4 h-4 accent-[var(--gold)]"
                />
                <span className="text-sm text-[var(--foreground)] group-hover:text-[var(--foreground)] flex items-center gap-1.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  {lead.testimonyMarieFait && <CheckCircle2 className="w-4 h-4 text-[var(--success)]" strokeWidth={1.5} />}
                  Testimony Marie fait
                  {lead.testimonyMarieFait && <span className="text-xs text-[var(--success)] ml-1">(Manon / Elodie notifiee)</span>}
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Notes globales */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Notes globales</h3>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-6 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors duration-300"
            onClick={() => { setEditNotes(!editNotes); setGlobalNotes(lead.globalNotes ?? ""); }}
          >
            {editNotes ? "Annuler" : "Modifier"}
          </Button>
        </div>
        {editNotes ? (
          <div className="space-y-2">
            <Textarea
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              className="bg-[var(--surface-raised)] border-[var(--border)] text-sm min-h-[80px] rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]"
              placeholder="Notes generales sur ce lead..."
            />
            <Button
              size="sm"
              className="bg-[var(--gold)] hover:brightness-110 text-[var(--background)] text-[11px] rounded-[2px] uppercase tracking-[0.1em] font-medium"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
              onClick={() => {
                updateMutation.mutate({ id: lead.id, notes: globalNotes });
                setEditNotes(false);
                toast.success("Notes sauvegardées");
              }}
            >
              Sauvegarder
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--foreground-muted)] bg-[var(--surface)] rounded-[2px] p-3 min-h-[60px] border border-[var(--border)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {lead.globalNotes ? lead.globalNotes : <span className="text-[var(--foreground-faint)] italic">Aucune note</span>}
          </p>
        )}
      </div>

      {/* Documents du lead */}
      <LeadDocumentsSection crmLeadId={lead.id} />

      {/* Historique des fiches biens proposées */}
      <BienPropositionsHistory leadId={lead.id} />

      {/* Modal Planifier RDV */}
      <Dialog open={showPlanRdv} onOpenChange={setShowPlanRdv}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)] tracking-[0.04em]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Planifier un RDV pour {lead.prenom} {lead.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Type de RDV</label>
              <Select value={rdvType} onValueChange={(v: any) => setRdvType(v)}>
                <SelectTrigger className="bg-[var(--surface-raised)] border-[var(--border)] text-[var(--foreground)] rounded-[2px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem value="welcome_call">Welcome Call (Maria)</SelectItem>
                  <SelectItem value="point_personnalise">Point Personnalise (Maria)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Date</label>
                <Input
                  type="date"
                  value={rdvDate}
                  onChange={(e) => setRdvDate(e.target.value)}
                  className="bg-[var(--surface-raised)] border-[var(--border)] text-[var(--foreground)] rounded-[2px] focus:border-[var(--gold)]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Heure</label>
                <Input
                  type="time"
                  value={rdvHeure}
                  onChange={(e) => setRdvHeure(e.target.value)}
                  className="bg-[var(--surface-raised)] border-[var(--border)] text-[var(--foreground)] rounded-[2px] focus:border-[var(--gold)]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="flex-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                onClick={() => setShowPlanRdv(false)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-[var(--gold)] hover:brightness-110 text-[var(--background)] font-medium rounded-[2px] text-[11px] uppercase tracking-[0.1em]"
                style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
                disabled={!rdvDate || createTaskMutation.isPending}
                onClick={() => {
                  const dateTime = new Date(`${rdvDate}T${rdvHeure}:00`);
                  createTaskMutation.mutate({
                    titre: rdvType === "welcome_call" ? `Welcome Call - ${lead.prenom} ${lead.nom}` : `Point Personnalisé - ${lead.prenom} ${lead.nom}`,
                    dateDebut: dateTime.toISOString(),
                    assigneA: "Maria",
                    crmLeadId: lead.id,
                  });
                }}
              >
                Créer le RDV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ─── Section documents d'un lead (dans le panneau détail) ────────────────────────
function LeadDocumentsSection({ crmLeadId }: { crmLeadId: number }) {
  const utils = trpc.useUtils();
  const { data: docs, isLoading } = trpc.crm.listDocuments.useQuery({ crmLeadId });
  const uploadMutation = trpc.crm.uploadDocument.useMutation({
    onSuccess: () => { utils.crm.listDocuments.invalidate({ crmLeadId }); toast.success("Document ajouté"); },
    onError: (e) => toast.error("Erreur upload : " + e.message),
  });
  const deleteMutation = trpc.crm.deleteDocument.useMutation({
    onSuccess: () => { utils.crm.listDocuments.invalidate({ crmLeadId }); toast.success("Document supprimé"); },
    onError: (e) => toast.error("Erreur suppression : " + e.message),
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} dépasse 10 Mo`); continue; }
        const base64 = await fileToBase64(file);
        await uploadMutation.mutateAsync({
          crmLeadId,
          fileBase64: base64,
          nom: file.name,
          mimeType: file.type || "application/octet-stream",
          taille: file.size,
        });
      }
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Documents</h3>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-50 transition-colors duration-300"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          {isUploading ? "Upload..." : "+ Ajouter"}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv" />
      </div>
      {isLoading ? (
        <p className="text-xs text-[var(--foreground-faint)] italic" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Chargement...</p>
      ) : !docs || docs.length === 0 ? (
        <div
          className="border border-dashed border-[var(--border)] rounded-[2px] p-4 text-center cursor-pointer hover:border-[var(--foreground-muted)] transition-colors duration-300"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-xs text-[var(--foreground-faint)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Aucun document — cliquer pour en ajouter</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-[2px] px-3 py-2">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 hover:text-[var(--foreground)] transition-colors duration-300 group"
              >
                <span className="text-base text-[var(--foreground-muted)]">{getFileEmoji(doc.nom)}</span>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--foreground)] group-hover:text-[var(--foreground)] truncate max-w-[260px]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{doc.nom}</p>
                  <p className="text-xs text-[var(--foreground-faint)] tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    {doc.taille ? formatFileSize(doc.taille) : ""}
                    {doc.uploadePar ? ` — ${doc.uploadePar}` : ""}
                    {" — "}{new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </a>
              <button
                type="button"
                onClick={() => { if (confirm(`Supprimer "${doc.nom}" ?`)) deleteMutation.mutate({ id: doc.id }); }}
                className="text-[var(--foreground-faint)] hover:text-[var(--destructive)] transition-colors duration-300 ml-2 flex-shrink-0 text-sm"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
          <div
            className="border border-dashed border-[var(--border)] rounded-[2px] px-3 py-2 text-center cursor-pointer hover:border-[var(--foreground-muted)] transition-colors duration-300"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-xs text-[var(--foreground-faint)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>+ Ajouter un document</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Utilitaires upload ────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Retirer le préfixe data:...;base64,
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileEmoji(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
  return "📎";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─── Modal création lead ────────────────────────────────────────────
const EMPTY_FORM = {
  nom: "", prenom: "", email: "", telephone: "", responsable: "",
  etape: "welcome_call" as string,
  formule: "" as string,
  modePaiement: "" as string,
  montantFormule: "" as string,
  villeResidence: "", departement: "", codePostal: "",
  projetType: "" as string,
  notes: "",
  statut: "actif" as string,
};

function CreateLeadModal({ open, onClose, defaultEtape }: { open: boolean; onClose: () => void; defaultEtape?: string }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  // Réinitialiser le formulaire à chaque ouverture
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, etape: defaultEtape ?? EMPTY_FORM.etape });
      setPendingFiles([]);
      setFormError(null);
    }
  }, [open, defaultEtape]);
  // Fichiers en attente d'upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocMutation = trpc.crm.uploadDocument.useMutation();

  const createMutation = trpc.crm.create.useMutation({
    onError: (e) => {
      const msg = e.data?.code === 'CONFLICT'
        ? e.message
        : "Erreur lors de la création du lead : " + e.message;
      setFormError(msg);
      toast.error(msg);
    },
    onSuccess: async (result) => {
      // Uploader les documents en attente si le lead a été créé
      if (pendingFiles.length > 0 && result.created) {
        setIsUploading(true);
        try {
          for (const file of pendingFiles) {
            const base64 = await fileToBase64(file);
            await uploadDocMutation.mutateAsync({
              crmLeadId: result.id,
              fileBase64: base64,
              nom: file.name,
              mimeType: file.type || "application/octet-stream",
              taille: file.size,
            });
          }
        } catch (err) {
          toast.error("Lead créé mais erreur lors de l'upload de certains documents");
        } finally {
          setIsUploading(false);
        }
      }
      utils.crm.list.invalidate();
      setFormError(null);
      onClose();
      toast.success(`Lead ajouté au pipeline${pendingFiles.length > 0 && result.created ? ` avec ${pendingFiles.length} document(s)` : ""}`);
    },
  });

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!form.prenom.trim() || !form.nom.trim()) {
      setFormError("Le prénom et le nom sont obligatoires.");
      return;
    }
    const montant = form.montantFormule ? parseInt(form.montantFormule, 10) : undefined;
    createMutation.mutate({
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      telephone: form.telephone || undefined,
      responsable: form.responsable || undefined,
      etape: form.etape as any,
      formule: (form.formule || undefined) as any,
      modePaiement: (form.modePaiement || undefined) as any,
      montantFormule: montant && !isNaN(montant) ? montant : undefined,
      villeResidence: form.villeResidence || undefined,
      departement: form.departement || undefined,
      codePostal: form.codePostal || undefined,
      projetType: (form.projetType || undefined) as any,
      notes: form.notes || undefined,
      statut: form.statut as any,
    });
  };

  const selectClass = "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--foreground)] text-sm rounded-[2px]";
  const labelClass = "text-[11px] text-[var(--foreground-muted)] mb-1 block uppercase tracking-[0.08em] font-medium";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2px]">
        <DialogHeader>
          <DialogTitle className="text-[var(--foreground)] tracking-[0.04em]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Ajouter un lead au pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">

          {/* ── Identité ── */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-2">Identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prénom *</label>
                <Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className={labelClass}>Nom *</label>
                <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelClass}>Email</label>
                <Input type="text" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="exemple@email.com" className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]" />
              </div>
            </div>
          </div>

          {/* ── Pipeline ── */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-2">Pipeline</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Étape *</label>
                <Select value={form.etape} onValueChange={val => setForm(f => ({ ...f, etape: val }))}>
                  <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="welcome_call">Welcome Call</SelectItem>
                    <SelectItem value="sigma_cash">Sigma Cash</SelectItem>
                    <SelectItem value="sigma_credit">Sigma Crédit</SelectItem>
                    <SelectItem value="point_personnalise">Point Personnalisé</SelectItem>
                    <SelectItem value="courtage">Courtage</SelectItem>
                    <SelectItem value="recherche_bien">Recherche bien</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Statut</label>
                <Select value={form.statut} onValueChange={val => setForm(f => ({ ...f, statut: val }))}>
                  <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="en_pause">En pause</SelectItem>
                    <SelectItem value="cloture">Clôturé</SelectItem>
                    <SelectItem value="perdu">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelClass}>Responsable</label>
              <AssigneeSelect
                mode="team"
                value={form.responsable}
                onChange={(val) => setForm(f => ({ ...f, responsable: val }))}
                placeholder="— Sélectionner un responsable —"
                className="w-full"
              />
            </div>
          </div>

          {/* ── Informations commerciales ── */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-2">Informations commerciales</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Formule</label>
                <Select value={form.formule} onValueChange={val => setForm(f => ({ ...f, formule: val }))}>
                  <SelectTrigger className={selectClass}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="sdt_starter">SDT Starter</SelectItem>
                    <SelectItem value="sdt_premium">SDT Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Mode de paiement</label>
                <Select value={form.modePaiement} onValueChange={val => setForm(f => ({ ...f, modePaiement: val }))}>
                  <SelectTrigger className={selectClass}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="comptant">Comptant</SelectItem>
                    <SelectItem value="deux_fois">2 fois</SelectItem>
                    <SelectItem value="cinquante_pourcent">50 %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Montant (€)</label>
                <Input
                  type="number"
                  min="0"
                  value={form.montantFormule}
                  onChange={e => setForm(f => ({ ...f, montantFormule: e.target.value }))}
                  className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* ── Localisation ── */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-2">Localisation</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelClass}>Ville</label>
                <Input value={form.villeResidence} onChange={e => setForm(f => ({ ...f, villeResidence: e.target.value }))} className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className={labelClass}>Département</label>
                <Input value={form.departement} onChange={e => setForm(f => ({ ...f, departement: e.target.value }))} className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]" placeholder="ex: 69" />
              </div>
              <div>
                <label className={labelClass}>Code postal</label>
                <Input value={form.codePostal} onChange={e => setForm(f => ({ ...f, codePostal: e.target.value }))} className="bg-[var(--surface-raised)] border-[var(--border)] text-sm rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]" />
              </div>
            </div>
          </div>

          {/* ── Projet immobilier ── */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-2">Projet immobilier</p>
            <div>
              <label className={labelClass}>Type de projet</label>
              <Select value={form.projetType} onValueChange={val => setForm(f => ({ ...f, projetType: val }))}>
                <SelectTrigger className={selectClass}><SelectValue placeholder="— Sélectionner —" /></SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem value="Rés. principale">Résidence principale</SelectItem>
                  <SelectItem value="Invest. locatif">Investissement locatif</SelectItem>
                  <SelectItem value="RP + IL">RP + Invest. locatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-2">Notes</p>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-[var(--surface-raised)] border-[var(--border)] text-sm min-h-[80px] resize-none rounded-[2px] text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)]"
              placeholder="Informations complémentaires sur ce lead..."
            />
          </div>

          {/* ── Documents ── */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)] uppercase tracking-[0.08em] mb-2">Documents</p>
            <div
              className="border border-dashed border-[var(--border)] rounded-[2px] p-4 text-center cursor-pointer hover:border-[var(--foreground-muted)] transition-colors duration-300"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAddFiles}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
              />
              <p className="text-sm text-[var(--foreground-muted)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                <span className="text-[var(--foreground)] font-medium">Cliquer pour selectionner</span> ou glisser-deposer
              </p>
              <p className="text-xs text-[var(--foreground-faint)] mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>PDF, Word, Excel, images — max 10 Mo par fichier</p>
            </div>
            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[var(--surface-raised)] rounded-[2px] px-3 py-2 border border-[var(--border)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg text-[var(--foreground-muted)]">{getFileEmoji(file.name)}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--foreground)] truncate max-w-[280px]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{file.name}</p>
                        <p className="text-xs text-[var(--foreground-muted)] tabular-nums" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }}
                      className="text-[var(--foreground-faint)] hover:text-[var(--destructive)] transition-colors duration-300 ml-2 flex-shrink-0 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && (
            <div className="flex items-start gap-2 bg-[var(--destructive)]/10 border border-[var(--destructive)]/25 rounded-[2px] px-3 py-2 text-sm text-[var(--destructive)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              <span className="mt-0.5 shrink-0 text-[var(--destructive)]">!</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]" onClick={onClose}>Annuler</Button>
            <Button
              className="flex-1 bg-[var(--gold)] hover:brightness-110 text-[var(--background)] font-medium rounded-[2px] text-[11px] uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
              disabled={!form.nom || !form.prenom || createMutation.isPending || isUploading}
              onClick={handleSubmit}
            >
              {isUploading ? `Upload... (${pendingFiles.length} doc)` : createMutation.isPending ? "Création..." : "Ajouter le lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CrmPipeline() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "liste">("kanban");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultEtape, setCreateDefaultEtape] = useState<string | undefined>(undefined);
  const [dragOverEtape, setDragOverEtape] = useState<Etape | null>(null);
  const dragLeadId = useRef<number | null>(null);

  const { data, isLoading } = trpc.crm.list.useQuery({ search: search || undefined });
  const leads: CrmLead[] = (data?.items ?? []) as unknown as CrmLead[];

  const { data: csvData } = trpc.crm.exportCsv.useQuery();

  function handleExportCsv() {
    if (!csvData || csvData.length === 0) { toast.error("Aucun lead à exporter"); return; }
    const headers = ["ID", "Prénom", "Nom", "Email", "Téléphone", "Étape", "Statut", "Conseiller", "Date création"];
    const keys = ["id", "prenom", "nom", "email", "telephone", "etape", "statut", "conseiller", "date_creation"] as const;
    const csv = [headers.join(";"), ...csvData.map((row: any) => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pipeline-sigma-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${csvData.length} leads exportés`);
  }

  const deleteCrmMutation = trpc.crm.delete.useMutation({
    onSuccess: () => utils.crm.list.invalidate({}),
  });
  const handleDeleteCrm = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le lead ${nom} ? Cette action est irréversible.`)) {
      deleteCrmMutation.mutate({ id });
    }
  };

  const updateMutation = trpc.crm.update.useMutation({
    onSuccess: () => utils.crm.list.invalidate({}),
  });

  // ─── Droits admin ────────────────────────────────────────────────────────
  const isAdmin = user?.role === "admin" || user?.role === "direction";

  // ─── Règles de validation avant déplacement (non-admins) ─────────────────
  const canMoveLead = (lead: CrmLead & { avisStatut?: string; avisNote?: string }, targetEtape: Etape): { ok: boolean; reason?: string } => {
    if (isAdmin) return { ok: true };

    // Welcome Call → Point Personnalisé : checklist WC 100% complète
    if (lead.etape === "welcome_call" && targetEtape === "point_personnalise") {
      const missing: string[] = [];
      if (!lead.welcomeCallFait)        missing.push("• Welcome call effectué");
      if (!lead.etatCivilRempli)        missing.push("• Formulaire État Civil rempli");
      if (!lead.mandatRempli)           missing.push("• Formulaire Mandat rempli");
      if (!lead.tableauCourtageRempli)  missing.push("• Tableau de Courtage rempli");
      if (!lead.accesPodia)             missing.push("• Accès Podia vérifié");
      if (!lead.documentsDeposes)       missing.push("• Documents déposés sur Podia");
      if (!lead.discoursClair)          missing.push("• Discours clair et compris");
      // Avis : doit être soit déposé, soit "pas d'avis" avec une note
      const avisOk = lead.avisStatut === "depose" || (lead.avisStatut === "pas_davis" && !!lead.avisNote?.trim());
      if (!avisOk) {
        if (lead.avisStatut === "pas_davis") missing.push("• Avis : note manquante (pourquoi pas d'avis ?)");
        else missing.push("• Avis Google/Trustpilot (déposé ou indiquer \"Pas d'avis\" avec une note)");
      }
      if (missing.length > 0) {
        return { ok: false, reason: `🚨 Impossible de passer en Point Personnalisé.\n\nIl manque :\n${missing.join("\n")}` };
      }
    }

    // Point Personnalisé → Courtage ou Immo : Mandat signé + checklist PP complète
    if (lead.etape === "point_personnalise" && (targetEtape === "courtage" || targetEtape === "recherche_bien")) {
      const dest = targetEtape === "courtage" ? "Courtage" : "Recherche de bien";
      const missing: string[] = [];
      if (!lead.avisRetourExp) missing.push("• Avis + retour d'expérience récolté");
      if (!lead.enveloppeOk)   missing.push("• Enveloppe ok/pas ok confirmée");
      if (!lead.mandatSigne)   missing.push("• Mandat signé — OBLIGATOIRE");
      if (missing.length > 0) {
        return { ok: false, reason: `🚨 Impossible de passer en ${dest}.\n\nIl manque :\n${missing.join("\n")}` };
      }
    }

    // Courtage → Recherche de bien : Tableau de Courtage requis
    if (lead.etape === "courtage" && targetEtape === "recherche_bien") {
      if (!lead.tableauCourtageRempli) {
        return { ok: false, reason: "🚨 Impossible de passer en Recherche de bien.\n\nIl manque :\n• Tableau de Courtage rempli par le lead" };
      }
    }

    // Blocage formule Starter : ne peut pas aller au-delà de Courtage
    const leadFormule = (lead as CrmLead & { formule?: string }).formule;
    const ETAPES_PREMIUM_ONLY: Etape[] = ["recherche_bien", "sigma_credit", "sigma_cash"];
    if ((leadFormule === "starter" || leadFormule === "sdt_starter") && ETAPES_PREMIUM_ONLY.includes(targetEtape)) {
      const formuleLabel = leadFormule === "starter" ? "Starter (5 000 €)" : "SDT Starter (7 500 €)";
      return {
        ok: false,
        reason: `🚨 Lead en formule ${formuleLabel} — le pipeline s'arrête au Courtage.\n\nLes étapes Recherche de bien et Sigma Crédit sont réservées aux formules Premium et SDT Premium.\n\nSi le lead souhaite upgrader, contactez le service commercial.`,
      };
    }

    return { ok: true };
  };

  // ─── Drag & Drop handlers ─────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, etape: Etape) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverEtape(etape);
  };

  const handleDragLeave = () => {
    setDragOverEtape(null);
  };

  const handleDrop = (e: React.DragEvent, targetEtape: Etape) => {
    e.preventDefault();
    setDragOverEtape(null);
    if (dragLeadId.current === null) return;
    const lead = leads.find(l => l.id === dragLeadId.current);
    if (!lead || lead.etape === targetEtape) return;

    const { ok, reason } = canMoveLead(lead, targetEtape);
    if (!ok) {
      // Afficher le message d'erreur avec titre + description lisibles
      const lines = (reason ?? "Déplacement non autorisé").split("\n").filter(Boolean);
      const title = lines[0] ?? "Déplacement non autorisé";
      const description = lines.slice(1).join(" ");
      toast.error(title, { description: description || undefined, duration: 7000 });
      dragLeadId.current = null;
      return;
    }

    updateMutation.mutate({ id: dragLeadId.current, etape: targetEtape });
    const etapeLabel = ETAPES.find(e => e.key === targetEtape)?.label ?? targetEtape;
    toast.success(`Lead déplacé vers "${etapeLabel}"`);
    dragLeadId.current = null;
  };

  // ─── Auth guard ───────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-10 h-10 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--foreground-muted)] mb-4" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Connexion requise pour acceder au pipeline.</p>
          <Button className="bg-[var(--gold)] hover:brightness-110 text-[var(--background)] rounded-[2px] font-medium text-[11px] uppercase tracking-[0.1em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }} onClick={() => window.location.href = "/login"}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  const byEtape = ETAPES.reduce((acc, e) => {
    acc[e.key] = leads.filter(l => l.etape === e.key && l.statut !== "perdu" && l.statut !== "cloture");
    return acc;
  }, {} as Record<Etape, CrmLead[]>);

  const totalActifs = leads.filter(l => l.statut === "actif").length;
  const totalPause = leads.filter(l => l.statut === "en_pause").length;
  const totalCloture = leads.filter(l => l.statut === "cloture" || l.statut === "perdu").length;

  return (
    <div className="min-h-screen bg-[var(--background)]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <AdminNav />

      <div className="max-w-[1800px] mx-auto px-4 pt-8 pb-16">
        {/* En-tete */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] uppercase tracking-[0.08em]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Pipeline — Team Delivery</h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1">Suivi des leads dans l'ecosysteme Sigma Factory</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 mr-2">
              <span className="text-[11px] px-3 py-1.5 rounded-[2px] bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 tabular-nums uppercase tracking-[0.08em]">{totalActifs} actifs</span>
              <span className="text-[11px] px-3 py-1.5 rounded-[2px] bg-[var(--foreground-muted)]/10 text-[var(--foreground-muted)] border border-[var(--foreground-muted)]/20 tabular-nums uppercase tracking-[0.08em]">{totalPause} en pause</span>
              <span className="text-[11px] px-3 py-1.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground-faint)] border border-[var(--border)] tabular-nums uppercase tracking-[0.08em]">{totalCloture} clotures</span>
            </div>
            <Button variant="outline" size="sm" className={`text-[11px] border-[var(--border)] rounded-[2px] uppercase tracking-[0.08em] transition-colors duration-300 ${viewMode === "kanban" ? "bg-[var(--surface-raised)] text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`} onClick={() => setViewMode("kanban")}>
              Kanban
            </Button>
            <Button variant="outline" size="sm" className={`text-[11px] border-[var(--border)] rounded-[2px] uppercase tracking-[0.08em] transition-colors duration-300 ${viewMode === "liste" ? "bg-[var(--surface-raised)] text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`} onClick={() => setViewMode("liste")}>
              Liste
            </Button>
            <Button variant="outline" size="sm" className="text-[11px] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] gap-1.5 rounded-[2px] uppercase tracking-[0.08em] transition-colors duration-300" onClick={handleExportCsv}>
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              CSV
            </Button>
            <Button size="sm" className="bg-[var(--gold)] hover:brightness-110 text-[var(--background)] font-medium text-[11px] rounded-[2px] uppercase tracking-[0.1em]" onClick={() => setShowCreate(true)}>
              + Ajouter un lead
            </Button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] max-w-md text-sm rounded-[2px] placeholder:text-[var(--foreground-faint)] focus:border-[var(--gold)] transition-colors duration-300"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === "kanban" ? (
          /* ─── Vue Kanban avec Drag & Drop ─── */
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minWidth: 0 }}>
            {ETAPES.map((etape) => {
              const isOver = dragOverEtape === etape.key;
              return (
                <div
                  key={etape.key}
                  className="flex flex-col flex-shrink-0"
                  style={{ width: "calc(16.666% - 12px)", minWidth: "190px" }}
                  onDragOver={(e) => handleDragOver(e, etape.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, etape.key)}
                >
                  {/* Header colonne */}
                  <div className="rounded-[2px] border border-[var(--border)] p-2.5 mb-3 bg-[var(--surface)]" style={{ borderTop: `2px solid ${etape.borderTop}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div>
                          <p className="font-medium text-xs leading-tight text-[var(--foreground)] uppercase tracking-[0.06em]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{etape.label}</p>
                          <p className="text-[10px] text-[var(--foreground-faint)]">{etape.responsable}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground-muted)] border border-[var(--border)] tabular-nums">
                          {byEtape[etape.key].length}
                        </span>
                        <button
                          title={`Ajouter un lead dans ${etape.label}`}
                          className="text-[10px] font-medium w-5 h-5 rounded-[2px] flex items-center justify-center transition-colors duration-300 text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
                          onClick={() => { setCreateDefaultEtape(etape.key); setShowCreate(true); }}
                        >+</button>
                      </div>
                    </div>
                  </div>

                  {/* Zone de dépôt */}
                  <div
                    className={`space-y-3 flex-1 min-h-[120px] rounded-[2px] transition-all duration-300 p-1 ${
                      isOver ? "bg-[var(--gold)]/5 border border-dashed border-[var(--gold)]/30" : "border border-transparent"
                    }`}
                  >
                    {byEtape[etape.key].length === 0 && !isOver ? (
                      <div className="border border-dashed border-[var(--border)] rounded-[2px] p-6 text-center">
                        <p className="text-xs text-[var(--foreground-faint)]">Glissez un lead ici</p>
                      </div>
                    ) : (
                      byEtape[etape.key].map(lead => (
                        <KanbanCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => setSelectedLeadId(lead.id)}
                          onDragStart={handleDragStart}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── Vue Liste ─── */
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[11px] text-[var(--foreground-muted)] font-medium px-4 py-3 uppercase tracking-[0.08em]">Lead</th>
                  <th className="text-left text-[11px] text-[var(--foreground-muted)] font-medium px-4 py-3 uppercase tracking-[0.08em]">Etape</th>
                  <th className="text-left text-[11px] text-[var(--foreground-muted)] font-medium px-4 py-3 uppercase tracking-[0.08em]">Responsable</th>
                  <th className="text-left text-[11px] text-[var(--foreground-muted)] font-medium px-4 py-3 uppercase tracking-[0.08em]">Modules</th>
                  <th className="text-left text-[11px] text-[var(--foreground-muted)] font-medium px-4 py-3 uppercase tracking-[0.08em]">Statut</th>
                  <th className="text-left text-[11px] text-[var(--foreground-muted)] font-medium px-4 py-3 uppercase tracking-[0.08em]">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-[var(--foreground-muted)] py-12 text-sm">Aucun lead dans le pipeline.</td>
                  </tr>
                ) : leads.map(lead => {
                  const etapeInfo = ETAPES.find(e => e.key === lead.etape)!;
                  return (
                    <tr key={lead.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors duration-300">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--foreground)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{lead.prenom} {lead.nom}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{lead.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] px-2 py-1 rounded-[2px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] uppercase tracking-[0.06em]">
                          {etapeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--foreground-muted)]">{etapeInfo.responsable}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {lead.leadId && <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground-muted)] border border-[var(--border)]">EC</span>}
                          {lead.mandatId && <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground-muted)] border border-[var(--border)]">M</span>}
                          {lead.hexaId && <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-raised)] text-[var(--foreground-muted)] border border-[var(--border)]">SC</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-[2px] border uppercase tracking-[0.08em] ${STATUT_COLORS[lead.statut]}`}>
                          {STATUT_LABELS[lead.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] tabular-nums">
                        {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] h-7 transition-colors duration-300" onClick={() => setSelectedLeadId(lead.id)}>
                            Voir
                          </Button>
                          <button onClick={(e) => handleDeleteCrm(e, lead.id, `${lead.prenom} ${lead.nom}`)} className="p-1.5 rounded-[2px] hover:bg-[var(--destructive)]/10 text-[var(--foreground-faint)] hover:text-[var(--destructive)] transition-colors duration-300" title="Supprimer">
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
        )}
      </div>

      {/* Modal fiche lead */}
      <Dialog open={selectedLeadId !== null} onOpenChange={() => setSelectedLeadId(null)}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-2xl rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)] tracking-[0.04em]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Fiche lead</DialogTitle>
          </DialogHeader>
          {selectedLeadId && <LeadDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal création */}
      <CreateLeadModal open={showCreate} onClose={() => { setShowCreate(false); setCreateDefaultEtape(undefined); }} defaultEtape={createDefaultEtape} />
    </div>
  );
}

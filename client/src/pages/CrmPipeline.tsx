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

const ETAPES: { key: Etape; label: string; responsable: string; color: string; bg: string; icon: string }[] = [
  { key: "sigma_cash", label: "Sigma Cash", responsable: "Hanna", color: "text-green-400", bg: "bg-green-400/10 border-green-400/30", icon: "💵" },
  { key: "sigma_credit", label: "Sigma Crédit", responsable: "Hanna", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", icon: "💰" },
  { key: "welcome_call", label: "Welcome Call", responsable: "Maria", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30", icon: "👋" },
  { key: "courtage", label: "Courtage", responsable: "Manon", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", icon: "🏦" },
  { key: "point_personnalise", label: "Point Personnalisé", responsable: "Maria", color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/30", icon: "🎯" },
  { key: "recherche_bien", label: "Recherche bien", responsable: "Élodie", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", icon: "🏠" },
];

const STATUT_COLORS: Record<Statut, string> = {
  actif: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  en_pause: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cloture: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  perdu: "bg-red-500/20 text-red-400 border-red-500/30",
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
    starter:     { label: "Starter",     color: "bg-zinc-700/60 text-zinc-300 border-zinc-600",     emoji: "🥈" },
    premium:     { label: "Premium",     color: "bg-amber-500/20 text-amber-300 border-amber-500/40", emoji: "🥇" },
    sdt_starter: { label: "SDT Starter", color: "bg-blue-500/20 text-blue-300 border-blue-500/40",   emoji: "⚡" },
    sdt_premium: { label: "SDT Premium", color: "bg-purple-500/20 text-purple-300 border-purple-500/40", emoji: "💎" },
  };

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-amber-500/40 transition-all group select-none"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm group-hover:text-amber-400 transition-colors">
            {lead.prenom} {lead.nom}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{lead.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_COLORS[lead.statut]}`}>
            {STATUT_LABELS[lead.statut]}
          </span>
          {leadExt.formule && FORMULE_BADGE[leadExt.formule] && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${FORMULE_BADGE[leadExt.formule].color}`}>
              {FORMULE_BADGE[leadExt.formule].emoji} {FORMULE_BADGE[leadExt.formule].label}
            </span>
          )}
        </div>
      </div>

      {/* Indicateurs modules */}
      <div className="flex gap-1.5 mb-3">
        <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.leadId ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
          État Civil {lead.leadId ? "✓" : "–"}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.mandatId ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
          Mandat {lead.mandatId ? "✓" : "–"}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded border ${lead.hexaId ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
          Crédit {lead.hexaId ? "✓" : "–"}
        </span>
      </div>

      {lead.etape === "welcome_call" && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Onboarding</span>
            <span>{wcDone}/7</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(wcDone / 7) * 100}%` }} />
          </div>
        </div>
      )}

      {lead.etape === "point_personnalise" && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Point Personnalisé</span>
            <span>{[lead.avisRetourExp, lead.enveloppeOk, lead.mandatSigne].filter(Boolean).length}/3</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${([lead.avisRetourExp, lead.enveloppeOk, lead.mandatSigne].filter(Boolean).length / 3) * 100}%` }} />
          </div>
        </div>
      )}

      {lead.etape === "courtage" && lead.enveloppeValidee && (
        <p className="text-xs text-emerald-400 mt-1">💶 {lead.enveloppeValidee.toLocaleString("fr-FR")} €</p>
      )}

      {(lead.etape === "sigma_cash" || lead.etape === "sigma_credit") && (
        <SigmaCashMiniCard leadEmail={lead.email} />
      )}

      <p className="text-xs text-zinc-600 mt-2">
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
      <div className="w-4 h-4 border border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-zinc-500">Chargement des fiches envoyées...</span>
    </div>
  );

  const fmtPrix = (n: unknown) => {
    if (!n) return null;
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n));
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        🏠 Fiches biens envoyées
        {propositions && propositions.length > 0 && (
          <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
            {propositions.length} fiche{propositions.length > 1 ? "s" : ""}
          </span>
        )}
      </h3>
      {(!propositions || propositions.length === 0) ? (
        <p className="text-xs text-zinc-600 italic">Aucune fiche bien envoyée pour ce lead.</p>
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
              <div key={p.id} className={`border rounded-lg p-3 flex items-start gap-3 ${
                isOffMarket ? "bg-amber-500/5 border-amber-500/25" : "bg-zinc-900 border-zinc-800"
              }`}>
                {/* Miniature image off-market */}
                {isOffMarket && omImage && (
                  <img src={omImage} alt={omTitre}
                    className="w-14 h-14 object-cover rounded-md shrink-0 border border-amber-500/20" />
                )}
                <div className="flex-1 min-w-0">
                  {/* Badge source + type */}
                  <div className="flex items-center gap-2 mb-1">
                    {isOffMarket ? (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        💎 Off Market
                      </span>
                    ) : (
                      ref && <span className="text-xs font-semibold text-zinc-500">{ref}</span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {isOffMarket ? omTypeLabel ?? "" : `${typeLabel}${surface}`}
                    </span>
                  </div>
                  {/* Titre / localisation */}
                  {isOffMarket ? (
                    <>
                      <p className="text-xs text-white font-semibold truncate">{omTitre}</p>
                      {omRegion && <p className="text-xs text-zinc-500">📍 {omRegion}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        {omPrix && <span className="text-xs text-amber-400 font-semibold">{omPrix}</span>}
                        {omRenta && <span className="text-xs text-emerald-400">{omRenta} brut</span>}
                      </div>
                    </>
                  ) : (
                    <>
                      {ville && <p className="text-xs text-zinc-500 truncate">{ville}</p>}
                      {prix && <p className="text-xs text-amber-300 font-semibold mt-0.5">{prix}</p>}
                    </>
                  )}
                  {/* Date + auteur */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-zinc-600">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                    {p.envoyePar && <span className="text-xs text-zinc-600">par {p.envoyePar}</span>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {p.pdfUrl && (
                    <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30 transition-colors text-center whitespace-nowrap">
                      📄 PDF
                    </a>
                  )}
                  {isOffMarket && (p as any).offMarketBienId && (
                    <a href={`/off-market?id=${(p as any).offMarketBienId}`}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700 transition-colors text-center whitespace-nowrap">
                      Voir fiche ↗
                    </a>
                  )}
                  {!isOffMarket && p.bienId && (
                    <a href={`/recherche-bien?id=${p.bienId}`}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700 transition-colors text-center whitespace-nowrap">
                      Voir fiche ↗
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
    <div className="mt-3 pt-3 border-t border-zinc-800">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-zinc-400 mb-1 block">Email du courtier (pour envoi dossier)</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-sm h-8"
            placeholder="courtier@cabinet.fr"
            type="email"
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={sendMutation.isPending}
          size="sm"
          className="bg-amber-600 hover:bg-amber-500 text-black font-semibold h-8 px-3 flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          {sendMutation.isPending ? "Envoi..." : "Envoyer le dossier"}
        </Button>
      </div>
      <p className="text-xs text-zinc-600 mt-1">Génère le PDF complet et l'envoie au courtier + copie Manon</p>
    </div>
  );
}

// ─── Mini-carte encaissement pour les cartes Kanban ───────────────────────────

function SigmaCashMiniCard({ leadEmail }: { leadEmail: string }) {
  const { data } = trpc.sales.getCloseByEmail.useQuery({ email: leadEmail });
  if (!data) return null;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
  const statutColor = data.statutEncaissement === "recu" ? "text-emerald-400" : data.statutEncaissement === "initie" ? "text-blue-400" : "text-amber-400";
  const statutLabel = data.statutEncaissement === "recu" ? "✅ Reçu" : data.statutEncaissement === "initie" ? "🔄 Initié" : "⏳ En attente";
  return (
    <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">Généré</span>
        <span className="text-white font-medium">{fmt(data.montantGenere)}</span>
      </div>
      {data.resteAPayer > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Reste</span>
          <span className="text-amber-400 font-medium">{fmt(data.resteAPayer)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">Statut</span>
        <span className={`font-medium ${statutColor}`}>{statutLabel}</span>
      </div>
      {(data.dateVirementPrevu || data.datePrelevement) && (
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">{data.dateVirementPrevu ? "Virement le" : "Prél. le"}</span>
          <span className="text-zinc-300">{data.dateVirementPrevu || data.datePrelevement}</span>
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
  en_attente: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  initie: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  recu: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const STATUT_ENC_LABELS: Record<string, string> = {
  en_attente: "⏳ En attente",
  initie: "🔄 Initié",
  recu: "✅ Reçu",
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
      <div className="w-4 h-4 border border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-zinc-500">Chargement des données encaissement...</span>
    </div>
  );

  if (!closeData) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 italic">Aucun rapport de vente lié trouvé pour cet email.</p>
    </div>
  );

  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Console Encaissement</h3>

      {/* Montants */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500 mb-1">Généré</p>
          <p className="text-lg font-bold text-white">{fmt(closeData.montantGenere)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500 mb-1">Encaissé</p>
          <p className="text-lg font-bold text-emerald-400">{fmt(closeData.montantEncaisse)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500 mb-1">Reste</p>
          <p className={`text-lg font-bold ${closeData.resteAPayer > 0 ? "text-amber-400" : "text-zinc-500"}`}>{fmt(closeData.resteAPayer)}</p>
        </div>
      </div>

      {/* Détail paiement */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-400">Mode de paiement</span>
          <span className="text-xs font-medium text-white">{MODE_LABELS[closeData.modePaiement ?? ""] ?? closeData.modePaiement ?? "—"}</span>
        </div>
        {closeData.montantCb > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">CB Stripe</span>
            <span className="text-xs text-white">{fmt(closeData.montantCb)}</span>
          </div>
        )}
        {closeData.montantVirement > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Virement</span>
            <span className="text-xs text-white">{fmt(closeData.montantVirement)}</span>
          </div>
        )}
        {closeData.montantPrelevement > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Prélèvement</span>
            <span className="text-xs text-white">{fmt(closeData.montantPrelevement)}</span>
          </div>
        )}
        {closeData.montantCreditImpot > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Crédit d'impôt</span>
            <span className="text-xs text-amber-400 font-medium">{fmt(closeData.montantCreditImpot)}</span>
          </div>
        )}
        {(closeData.dateVirementPrevu || closeData.datePrelevement) && (
          <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
            <span className="text-xs text-zinc-400">{closeData.dateVirementPrevu ? "Date virement prévu" : "Date prélèvement"}</span>
            <span className="text-xs text-white">{closeData.dateVirementPrevu || closeData.datePrelevement}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-400">Closer</span>
          <span className="text-xs text-zinc-300">{closeData.closerNom}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-400">Date close</span>
          <span className="text-xs text-zinc-300">{new Date(closeData.dateCall).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>

      {/* Statut encaissement */}
      <div>
        <p className="text-xs text-zinc-400 mb-2">Statut encaissement</p>
        <div className="flex gap-2 flex-wrap">
          {(["en_attente", "initie", "recu"] as const).map(s => (
            <button
              key={s}
              onClick={() => updateStatut.mutate({ closeId: closeData.id, statutEncaissement: s })}
              disabled={updateStatut.isPending}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                closeData.statutEncaissement === s
                  ? `${STATUT_ENC_COLORS[s]} font-semibold`
                  : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
              }`}
            >
              {STATUT_ENC_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Modifier date virement prévu */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-zinc-400">Date virement prévu</p>
          <button onClick={() => { setEditDate(!editDate); setNewDate(closeData.dateVirementPrevu ?? ""); }} className="text-xs text-amber-400 hover:text-amber-300">
            {editDate ? "Annuler" : "Modifier"}
          </button>
        </div>
        {editDate ? (
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => {
                updateStatut.mutate({ closeId: closeData.id, statutEncaissement: closeData.statutEncaissement ?? "en_attente", dateVirementPrevu: newDate });
                setEditDate(false);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              OK
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
            {closeData.dateVirementPrevu || <span className="text-zinc-600 italic">Non renseignée</span>}
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
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!rawData) return <p className="text-zinc-500 text-center py-8">Lead introuvable.</p>;

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
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{lead.prenom} {lead.nom}</h2>
          <p className="text-zinc-400 text-sm">{lead.email}{lead.telephone ? ` · ${lead.telephone}` : ""}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-xs px-2 py-1 rounded-full border ${STATUT_COLORS[lead.statut]}`}>
            {STATUT_LABELS[lead.statut]}
          </span>
          <Select
            value={lead.statut}
            onValueChange={(v) => updateMutation.mutate({ id: lead.id, statut: v as Statut })}
          >
            <SelectTrigger className="h-7 w-32 text-xs bg-zinc-800 border-zinc-700">
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

      {/* Étape actuelle + navigation */}
      <div className={`rounded-xl border p-4 ${etapeInfo.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{etapeInfo.icon}</span>
            <div>
              <p className={`font-semibold ${etapeInfo.color}`}>{etapeInfo.label}</p>
              <p className="text-xs text-zinc-400">Responsable : {etapeInfo.responsable}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              onClick={() => setShowPlanRdv(true)}
            >
              <CalendarPlus className="w-3 h-3 mr-1" />
              Planifier RDV
            </Button>
            {ETAPES.findIndex(e => e.key === lead.etape) < ETAPES.length - 1 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                onClick={advanceEtape}
              >
                Étape suivante →
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
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                  isCurrent ? `${e.bg} ${e.color} font-semibold` :
                  isDone ? "bg-zinc-800 text-zinc-400 border-zinc-700" :
                  "bg-zinc-900 text-zinc-600 border-zinc-800"
                }`}
              >
                {isDone ? "✓ " : ""}{e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dossiers associés */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Dossiers associés</h3>
        <div className="grid grid-cols-3 gap-3">
          <a
            href={lead.leadId ? `/dashboard?lead=${lead.leadId}` : undefined}
            className={`rounded-lg border p-3 text-center transition-all ${lead.leadId ? "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer" : "border-zinc-800 bg-zinc-900 opacity-50"}`}
          >
            <p className="text-lg">📋</p>
            <p className="text-xs font-medium text-blue-400 mt-1">État Civil</p>
            <p className="text-xs text-zinc-500">{lead.leadId ? `#${lead.leadId}` : "Non lié"}</p>
          </a>
          <a
            href={lead.mandatId ? `/dashboard/mandats?mandat=${lead.mandatId}` : undefined}
            className={`rounded-lg border p-3 text-center transition-all ${lead.mandatId ? "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer" : "border-zinc-800 bg-zinc-900 opacity-50"}`}
          >
            <p className="text-lg">🏠</p>
            <p className="text-xs font-medium text-purple-400 mt-1">Mandat</p>
            <p className="text-xs text-zinc-500">{lead.mandatId ? `#${lead.mandatId}` : "Non lié"}</p>
          </a>
          <a
            href={lead.hexaId ? `/dashboard/hexa?dossier=${lead.hexaId}` : undefined}
            className={`rounded-lg border p-3 text-center transition-all ${lead.hexaId ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer" : "border-zinc-800 bg-zinc-900 opacity-50"}`}
          >
            <p className="text-lg">💰</p>
            <p className="text-xs font-medium text-amber-400 mt-1">Sigma Crédit</p>
            <p className="text-xs text-zinc-500">{lead.hexaId ? `#${lead.hexaId}` : "Non lié"}</p>
          </a>
        </div>
      </div>

      {/* Timeline des activités — visible en haut de la fiche */}
      <div className="border-t border-zinc-800 pt-4">
        <LeadTimeline crmLeadId={lead.id} nomLead={`${lead.prenom} ${lead.nom}`} />
      </div>

      {/* Bouton télécharger dossier complet PDF */}
      <div className="pt-1">
        <Button
          onClick={handleDownloadDossier}
          disabled={pdfLoading || !lead.leadId}
          className="w-full bg-amber-600 hover:bg-amber-500 text-black font-semibold flex items-center gap-2 justify-center"
        >
          <Download className="w-4 h-4" />
          {pdfLoading ? "Génération en cours..." : "Télécharger le dossier complet (PDF)"}
        </Button>
        {!lead.leadId && (
          <p className="text-xs text-zinc-600 text-center mt-1">Fiche d'état civil requise pour générer le dossier</p>
        )}
      </div>

      {/* Console encaissement Sigma Cash / Sigma Crédit */}
      {(lead.etape === "sigma_cash" || lead.etape === "sigma_credit") && (
        <SigmaEncaissementPanel leadEmail={lead.email} />
      )}

      {/* Checklist Welcome Call */}
      {lead.etape === "welcome_call" && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Checklist Welcome Call — Maria</h3>
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
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <span className={`text-sm transition-colors ${lead[key as keyof CrmLead] ? "text-zinc-400 line-through" : "text-zinc-200 group-hover:text-white"}`}>
                  {label}
                </span>
              </label>
            ))}

            {/* Avis — 3 états */}
            <div className="pt-1">
              <p className="text-sm text-zinc-200 mb-2">Avis Google / Trustpilot</p>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "en_attente", label: "⏳ En attente", color: "border-zinc-600 text-zinc-400" },
                  { value: "depose", label: "✅ Déposé", color: "border-emerald-500/50 text-emerald-400" },
                  { value: "pas_davis", label: "🚫 Pas d'avis", color: "border-red-500/50 text-red-400" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const newStatut = opt.value;
                      const newDepose = newStatut === "depose";
                      updateMutation.mutate({ id: lead.id, avisStatut: newStatut, avisDepose: newDepose });
                    }}
                    className={`px-3 py-1 text-xs rounded border transition-all ${
                      (lead as any).avisStatut === opt.value
                        ? `${opt.color} bg-white/5 font-semibold`
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Note obligatoire si Pas d'avis */}
              {(lead as any).avisStatut === "pas_davis" && (
                <div className="mt-2">
                  <p className="text-xs text-red-400 mb-1">⚠️ Note obligatoire — pourquoi le lead ne veut pas laisser d'avis ?</p>
                  <textarea
                    defaultValue={(lead as any).avisNote ?? ""}
                    onBlur={(e) => updateMutation.mutate({ id: lead.id, avisNote: e.target.value })}
                    placeholder="Ex : lead réticent, problème de confidentialité..."
                    rows={2}
                    className="w-full bg-zinc-900 border border-red-500/30 text-white text-xs p-2 rounded resize-none focus:outline-none focus:border-red-400"
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
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Checklist Point Personnalisé — Maria</h3>
          <div className="space-y-2">
            {[
              { key: "avisRetourExp", label: "Avis + retour d'expérience récolté" },
              { key: "enveloppeOk", label: "Enveloppe ok / pas ok confirmée" },
              { key: "mandatSigne", label: "Mandat signé" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!lead[key as keyof CrmLead]}
                  onChange={(e) => toggle(key, e.target.checked)}
                  className="w-4 h-4 accent-pink-500 cursor-pointer"
                />
                <span className={`text-sm transition-colors ${lead[key as keyof CrmLead] ? "text-zinc-400 line-through" : "text-zinc-200 group-hover:text-white"}`}>
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
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Suivi Courtage — Manon</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Courtier assigné</label>
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
              <label className="text-xs text-zinc-400 mb-1 block">Email du courtier</label>
              <Input
                defaultValue={(lead as any).courtierEmail ?? ""}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, courtierEmail: e.target.value } as any)}
                className="bg-zinc-800 border-zinc-700 text-sm h-8"
                placeholder="courtier@cabinet.fr"
                type="email"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Enveloppe validée (€)</label>
              <Input
                type="number"
                defaultValue={lead.enveloppeValidee ?? ""}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, enveloppeValidee: e.target.value ? parseInt(e.target.value) : undefined })}
                className="bg-zinc-800 border-zinc-700 text-sm h-8"
                placeholder="Ex. 350000"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Date annonce enveloppe</label>
              <Input
                type="date"
                defaultValue={lead.enveloppeDate ?? ""}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, enveloppeDate: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-sm h-8"
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
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>📋</span> Mandat de Recherche
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {lead.numeroMandat && (
                  <div className="col-span-2 flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-500">N° Mandat :</span>
                    <span className="text-zinc-200 font-mono">{lead.numeroMandat}</span>
                    {lead.dateSignatureMandat && lead.dateSignatureMandat !== '—' && (
                      <span className="text-zinc-500 ml-2">Signé le {lead.dateSignatureMandat}</span>
                    )}
                    {lead.mandatSignePdfUrl && (
                      <a
                        href={lead.mandatSignePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                      >
                        <span>📄</span> Voir le mandat signé
                      </a>
                    )}
                  </div>
                )}
                {lead.projetType && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Projet :</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">{lead.projetType}</span>
                  </div>
                )}
                {lead.budgetMax && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Budget max :</span>
                    <span className="text-white font-bold">{lead.budgetMax.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
                {lead.villeResidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Domicile :</span>
                    <span className="text-zinc-200">{lead.villeResidence} ({lead.departement})</span>
                  </div>
                )}
                {lead.typeBien && (
                  <div className="col-span-2 flex items-start gap-2">
                    <span className="text-zinc-500 flex-shrink-0">Type de bien :</span>
                    <span className="text-zinc-200">{lead.typeBien}</span>
                  </div>
                )}
                {lead.zoneRecherche && (
                  <div className="col-span-2 flex items-start gap-2">
                    <span className="text-zinc-500 flex-shrink-0">Zone :</span>
                    <span className="text-zinc-200 leading-relaxed">{lead.zoneRecherche}</span>
                  </div>
                )}
              </div>
              {/* Bouton upload mandat signé + historique des versions */}
              <div className="mt-3 pt-3 border-t border-emerald-500/10 space-y-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleUploadMandat}
                    disabled={isUploadingMandat}
                  />
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    isUploadingMandat
                      ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer'
                  }`}>
                    {isUploadingMandat ? (
                      <><span className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" /> Upload en cours...</>
                    ) : (
                      <>📂 {lead.mandatSignePdfUrl ? `Remplacer le mandat signé${mandatVersionsList && mandatVersionsList.length > 0 ? ` (v${mandatVersionsList.length})` : ''}` : 'Uploader le mandat signé'}</>
                    )}
                  </span>
                </label>
                {/* Historique des versions */}
                {mandatVersionsList && mandatVersionsList.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Historique des versions</p>
                    {mandatVersionsList.map((v: any) => (
                      <div key={v.id} className="flex items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">v{v.version}</span>
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 truncate max-w-[160px]"
                          title={v.nom}
                        >
                          {v.nom}
                        </a>
                        <span className="text-zinc-600 ml-auto flex-shrink-0">{new Date(v.uploadedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                        {v.uploadePar && <span className="text-zinc-600 flex-shrink-0">— {v.uploadePar}</span>}
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      isSendingMandatInvit
                        ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                        : 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border border-amber-800/50 cursor-pointer'
                    }`}
                  >
                    {isSendingMandatInvit ? (
                      <><span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin inline-block" /> Envoi en cours...</>
                    ) : (
                      <>📧 Renvoyer l'invitation mandat</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Suivi Recherche bien — Élodie</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Agent assigné</label>
              <AssigneeSelect
                mode="agent"
                value={lead.agentAssigne ?? ""}
                onChange={(val) => updateMutation.mutate({ id: lead.id, agentAssigne: val })}
                placeholder="— Sélectionner un agent —"
                className="w-full h-8"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Biens présentés</label>
              <Input
                type="number"
                defaultValue={lead.nbBiensPresentes}
                onBlur={(e) => updateMutation.mutate({ id: lead.id, nbBiensPresentes: parseInt(e.target.value) || 0 })}
                className="bg-zinc-800 border-zinc-700 text-sm h-8"
                min={0}
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lead.offreAcceptee}
                  onChange={(e) => toggle("offreAcceptee", e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-sm text-zinc-200">Offre acceptée</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION MARIE — Avis & Témoignages ─── */}
      {(lead.etape === "courtage" || lead.etape === "recherche_bien") && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5" />
            Avis & Témoignages — Marie
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
                className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {assignerMarieMutation.isPending ? (
                  <><span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" /> Assignation en cours...</>
                ) : (
                  <><Star className="w-3.5 h-3.5" /> Assigner Marie pour le témoignage</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                  <Star className="w-3 h-3" /> Marie assignée ({lead.marieAssigneeEtape === "courtage" ? "Courtage" : "Immo"})
                </span>
                <button
                  onClick={() => assignerMarieMutation.mutate({
                    crmLeadId: lead.id,
                    etapeSource: lead.etape === "courtage" ? "courtage" : "immo",
                  })}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline"
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
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-sm text-zinc-200 group-hover:text-white flex items-center gap-1.5">
                  {lead.testimonyMarieFait && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  Testimony Marie fait
                  {lead.testimonyMarieFait && <span className="text-xs text-emerald-400 ml-1">(Manon / Élodie notifiée)</span>}
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Notes globales */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notes globales</h3>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-6 text-zinc-400 hover:text-white"
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
              className="bg-zinc-800 border-zinc-700 text-sm min-h-[80px]"
              placeholder="Notes générales sur ce lead..."
            />
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black text-xs"
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
          <p className="text-sm text-zinc-400 bg-zinc-900 rounded-lg p-3 min-h-[60px]">
            {lead.globalNotes ? lead.globalNotes : <span className="text-zinc-600 italic">Aucune note</span>}
          </p>
        )}
      </div>

      {/* Documents du lead */}
      <LeadDocumentsSection crmLeadId={lead.id} />

      {/* Historique des fiches biens proposées */}
      <BienPropositionsHistory leadId={lead.id} />

      {/* Modal Planifier RDV */}
      <Dialog open={showPlanRdv} onOpenChange={setShowPlanRdv}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Planifier un RDV pour {lead.prenom} {lead.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Type de RDV</label>
              <Select value={rdvType} onValueChange={(v: any) => setRdvType(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome_call">👋 Welcome Call (Maria)</SelectItem>
                  <SelectItem value="point_personnalise">🎯 Point Personnalisé (Maria)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={rdvDate}
                  onChange={(e) => setRdvDate(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Heure</label>
                <Input
                  type="time"
                  value={rdvHeure}
                  onChange={(e) => setRdvHeure(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="flex-1 text-zinc-400"
                onClick={() => setShowPlanRdv(false)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
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
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Documents</h3>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
        >
          {isUploading ? "Upload..." : "+ Ajouter"}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv" />
      </div>
      {isLoading ? (
        <p className="text-xs text-zinc-600 italic">Chargement...</p>
      ) : !docs || docs.length === 0 ? (
        <div
          className="border-2 border-dashed border-zinc-800 rounded-lg p-4 text-center cursor-pointer hover:border-zinc-700 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-xs text-zinc-600">Aucun document — cliquer pour en ajouter</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 hover:text-amber-400 transition-colors group"
              >
                <span className="text-base">{getFileEmoji(doc.nom)}</span>
                <div className="min-w-0">
                  <p className="text-xs text-white group-hover:text-amber-400 truncate max-w-[260px]">{doc.nom}</p>
                  <p className="text-xs text-zinc-600">
                    {doc.taille ? formatFileSize(doc.taille) : ""}
                    {doc.uploadePar ? ` — ${doc.uploadePar}` : ""}
                    {" — "}{new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </a>
              <button
                type="button"
                onClick={() => { if (confirm(`Supprimer "${doc.nom}" ?`)) deleteMutation.mutate({ id: doc.id }); }}
                className="text-zinc-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0 text-sm"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
          <div
            className="border border-dashed border-zinc-800 rounded-lg px-3 py-2 text-center cursor-pointer hover:border-zinc-700 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-xs text-zinc-600">+ Ajouter un document</p>
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

  const selectClass = "bg-zinc-800 border-zinc-700 text-white text-sm";
  const labelClass = "text-xs text-zinc-400 mb-1 block";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Ajouter un lead au pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">

          {/* ── Identité ── */}
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prénom *</label>
                <Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-sm" />
              </div>
              <div>
                <label className={labelClass}>Nom *</label>
                <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelClass}>Email</label>
                <Input type="text" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="exemple@email.com" className="bg-zinc-800 border-zinc-700 text-sm" />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-sm" />
              </div>
            </div>
          </div>

          {/* ── Pipeline ── */}
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Pipeline</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Étape *</label>
                <Select value={form.etape} onValueChange={val => setForm(f => ({ ...f, etape: val }))}>
                  <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  <SelectContent className="bg-zinc-800 border-zinc-700">
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
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Informations commerciales</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Formule</label>
                <Select value={form.formule} onValueChange={val => setForm(f => ({ ...f, formule: val }))}>
                  <SelectTrigger className={selectClass}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  className="bg-zinc-800 border-zinc-700 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* ── Localisation ── */}
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Localisation</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelClass}>Ville</label>
                <Input value={form.villeResidence} onChange={e => setForm(f => ({ ...f, villeResidence: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-sm" />
              </div>
              <div>
                <label className={labelClass}>Département</label>
                <Input value={form.departement} onChange={e => setForm(f => ({ ...f, departement: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-sm" placeholder="ex: 69" />
              </div>
              <div>
                <label className={labelClass}>Code postal</label>
                <Input value={form.codePostal} onChange={e => setForm(f => ({ ...f, codePostal: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-sm" />
              </div>
            </div>
          </div>

          {/* ── Projet immobilier ── */}
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Projet immobilier</p>
            <div>
              <label className={labelClass}>Type de projet</label>
              <Select value={form.projetType} onValueChange={val => setForm(f => ({ ...f, projetType: val }))}>
                <SelectTrigger className={selectClass}><SelectValue placeholder="— Sélectionner —" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Rés. principale">Résidence principale</SelectItem>
                  <SelectItem value="Invest. locatif">Investissement locatif</SelectItem>
                  <SelectItem value="RP + IL">RP + Invest. locatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Notes</p>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-sm min-h-[80px] resize-none"
              placeholder="Informations complémentaires sur ce lead..."
            />
          </div>

          {/* ── Documents ── */}
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Documents</p>
            <div
              className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
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
              <p className="text-sm text-zinc-400">
                <span className="text-amber-400 font-medium">Cliquer pour sélectionner</span> ou glisser-déposer
              </p>
              <p className="text-xs text-zinc-600 mt-1">PDF, Word, Excel, images — max 10 Mo par fichier</p>
            </div>
            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{getFileEmoji(file.name)}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate max-w-[280px]">{file.name}</p>
                        <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }}
                      className="text-zinc-500 hover:text-red-400 transition-colors ml-2 flex-shrink-0 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1 text-zinc-400" onClick={onClose}>Annuler</Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Connexion requise pour accéder au pipeline.</p>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black" onClick={() => window.location.href = "/login"}>
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
    <div className="min-h-screen bg-zinc-950">
      <AdminNav />

      <div className="max-w-[1800px] mx-auto px-4 pt-8 pb-16">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Pipeline — Team Delivery</h1>
            <p className="text-zinc-400 text-sm mt-1">Suivi des leads dans l'écosystème Sigma Factory</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 mr-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{totalActifs} actifs</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{totalPause} en pause</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{totalCloture} clôturés</span>
            </div>
            <Button variant="outline" size="sm" className={`text-xs border-zinc-700 ${viewMode === "kanban" ? "bg-zinc-800 text-white" : "text-zinc-400"}`} onClick={() => setViewMode("kanban")}>
              Kanban
            </Button>
            <Button variant="outline" size="sm" className={`text-xs border-zinc-700 ${viewMode === "liste" ? "bg-zinc-800 text-white" : "text-zinc-400"}`} onClick={() => setViewMode("liste")}>
              Liste
            </Button>
            <Button variant="outline" size="sm" className="text-xs border-zinc-700 text-zinc-400 hover:text-white gap-1.5" onClick={handleExportCsv}>
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs" onClick={() => setShowCreate(true)}>
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
            className="bg-zinc-900 border-zinc-800 text-white max-w-md text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
                  <div className={`rounded-xl border p-2.5 mb-3 ${etape.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{etape.icon}</span>
                        <div>
                          <p className={`font-semibold text-xs leading-tight ${etape.color}`}>{etape.label}</p>
                          <p className="text-[10px] text-zinc-500">{etape.responsable}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${etape.bg} ${etape.color} border`}>
                          {byEtape[etape.key].length}
                        </span>
                        <button
                          title={`Ajouter un lead dans ${etape.label}`}
                          className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center transition-colors ${etape.color} hover:bg-white/10`}
                          onClick={() => { setCreateDefaultEtape(etape.key); setShowCreate(true); }}
                        >+</button>
                      </div>
                    </div>
                  </div>

                  {/* Zone de dépôt */}
                  <div
                    className={`space-y-3 flex-1 min-h-[120px] rounded-xl transition-all p-1 ${
                      isOver ? "bg-amber-500/5 border-2 border-dashed border-amber-500/40" : "border-2 border-transparent"
                    }`}
                  >
                    {byEtape[etape.key].length === 0 && !isOver ? (
                      <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center">
                        <p className="text-xs text-zinc-600">Glissez un lead ici</p>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-400 font-semibold px-4 py-3">Lead</th>
                  <th className="text-left text-xs text-zinc-400 font-semibold px-4 py-3">Étape</th>
                  <th className="text-left text-xs text-zinc-400 font-semibold px-4 py-3">Responsable</th>
                  <th className="text-left text-xs text-zinc-400 font-semibold px-4 py-3">Modules</th>
                  <th className="text-left text-xs text-zinc-400 font-semibold px-4 py-3">Statut</th>
                  <th className="text-left text-xs text-zinc-400 font-semibold px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-zinc-500 py-12 text-sm">Aucun lead dans le pipeline.</td>
                  </tr>
                ) : leads.map(lead => {
                  const etapeInfo = ETAPES.find(e => e.key === lead.etape)!;
                  return (
                    <tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{lead.prenom} {lead.nom}</p>
                        <p className="text-xs text-zinc-500">{lead.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-lg border ${etapeInfo.bg} ${etapeInfo.color}`}>
                          {etapeInfo.icon} {etapeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{etapeInfo.responsable}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {lead.leadId && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">EC</span>}
                          {lead.mandatId && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">M</span>}
                          {lead.hexaId && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">SC</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_COLORS[lead.statut]}`}>
                          {STATUT_LABELS[lead.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="text-xs text-amber-400 hover:text-amber-300 h-7" onClick={() => setSelectedLeadId(lead.id)}>
                            Voir →
                          </Button>
                          <button onClick={(e) => handleDeleteCrm(e, lead.id, `${lead.prenom} ${lead.nom}`)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors" title="Supprimer">
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
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Fiche lead</DialogTitle>
          </DialogHeader>
          {selectedLeadId && <LeadDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal création */}
      <CreateLeadModal open={showCreate} onClose={() => { setShowCreate(false); setCreateDefaultEtape(undefined); }} defaultEtape={createDefaultEtape} />
    </div>
  );
}

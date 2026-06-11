import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PartnerDocumentsSection from "@/components/PartnerDocumentsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText, Users, TrendingUp, Plus, Clock, AlertCircle,
  FolderOpen, Download, Eye, ChevronDown, ChevronUp, CheckCircle, XCircle, Inbox, Euro,
  AlertTriangle, MapPin, X
} from "lucide-react";

const REGIONS_FRANCE = [
  "Auvergne-Rhone-Alpes", "Bourgogne-Franche-Comte", "Bretagne", "Centre-Val de Loire",
  "Corse", "Grand Est", "Hauts-de-France", "Ile-de-France", "Normandie",
  "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Cote d'Azur",
  "Guadeloupe", "Martinique", "Guyane", "La Reunion", "Mayotte"
];

const TYPE_LABELS: Record<string, string> = {
  credit_immobilier: "Credit immobilier",
  credit_professionnel: "Credit professionnel",
  rachat_credit: "Rachat de credit",
  credit_conso: "Credit consommation",
  autre: "Autre",
};

const STATUT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  nouveau: { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  en_cours: { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  en_attente_banque: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  accepte: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  refuse: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
  finalise: { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  annule: { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" },
};

const ASSIGNATION_STATUT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  en_attente: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  en_cours: { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  valide: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  refuse: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
};
const ASSIGNATION_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  valide: "Valide",
  refuse: "Refuse",
};

function StatutBadge({ statut, styles }: { statut: string; styles?: Record<string, { color: string; bg: string; border: string }> }) {
  const map = styles ?? STATUT_STYLES;
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
      {statut.replace(/_/g, " ")}
    </span>
  );
}

// ---- Bouton Contacter Manon (assignation bidirectionnelle courtier -> Manon) ----
function ContactManonButton({ courtierId, courtierNom }: { courtierId?: number; courtierNom: string }) {
  const [open, setOpen] = useState(false);
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const createTask = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success("Demande envoyee a Manon !");
      setOpen(false); setSujet(""); setMessage("");
    },
    onError: (e) => toast.error(e.message),
  });
  const handleSubmit = () => {
    if (!sujet.trim()) { toast.error("Veuillez indiquer un sujet"); return; }
    const now = new Date();
    const debut = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    debut.setHours(10, 0, 0, 0);
    createTask.mutate({
      titre: `Courtier ${courtierNom} — ${sujet}`,
      assigneA: "Manon",
      dateDebut: debut.toISOString(),
      touteJournee: false,
      description: message || `Demande de contact de ${courtierNom}`,
      rappelEmail: true,
      rappelMinutesAvant: 30,
      statut: "a_faire",
    });
  };
  return (
    <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "20px" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="label-uppercase" style={{ color: "#F0EDE6", marginBottom: "2px" }}>Contacter Manon</p>
          <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Creer une tache dans le calendrier de Manon</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="transition-colors duration-300"
          style={{
            padding: "10px 24px",
            background: open ? "transparent" : "#C9A84C",
            color: open ? "#6B6560" : "#0A0A0A",
            fontSize: "11px",
            fontWeight: 500,
            fontFamily: "'Hanken Grotesk', sans-serif",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            borderRadius: "2px",
            border: open ? "1px solid #1E1E1E" : "1px solid #C9A84C",
          }}
        >
          {open ? "Annuler" : "Envoyer une demande"}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Sujet *</p>
            <input
              value={sujet}
              onChange={e => setSujet(e.target.value)}
              placeholder="Ex: Question sur le dossier Dupont"
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
          </div>
          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Message (optionnel)</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Details de votre demande..."
              rows={2}
              className="w-full transition-colors duration-300 focus:outline-none"
              style={{
                background: "#161616",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "10px 14px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#F0EDE6",
                resize: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={createTask.isPending}
            className="w-full transition-colors duration-300"
            style={{
              padding: "12px 28px",
              background: createTask.isPending ? "#8A7535" : "#C9A84C",
              color: "#0A0A0A",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              borderRadius: "2px",
              border: "none",
              cursor: createTask.isPending ? "not-allowed" : "pointer",
            }}
          >
            {createTask.isPending ? "Envoi..." : "Envoyer a Manon"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Carte dossier recu de Manon ----
function DossierRecuCard({ item, onRefetch }: { item: any; onRefetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(item.assignation.noteCourtier ?? "");
  const [statut, setStatut] = useState(item.assignation.statut);
  const utils = trpc.useUtils();

  const updateMutation = trpc.financement.updateAssignation.useMutation({
    onSuccess: () => {
      toast.success("Statut mis a jour");
      utils.financement.mesAssignations.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const dossier = item.dossier;
  if (!dossier) return null;

  return (
    <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
      {/* Ligne principale */}
      <div
        className="flex items-center gap-4 cursor-pointer transition-colors duration-300"
        style={{ padding: "16px 20px" }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#F0EDE6",
            }}>
              {dossier.emprunteur1Prenom} {dossier.emprunteur1Nom}
            </span>
            <StatutBadge statut={item.assignation.statut} styles={ASSIGNATION_STATUT_STYLES} />
            {item.docs?.length > 0 && (
              <span className="flex items-center gap-1" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
                <FileText className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                {item.docs.length} doc(s)
              </span>
            )}
          </div>
          <p className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>
            {dossier.montantProjet?.toLocaleString("fr-FR")} EUR -- {dossier.duree} mois -- apport {dossier.apportPersonnel?.toLocaleString("fr-FR")} EUR
          </p>
        </div>
        <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
          {new Date(item.assignation.createdAt).toLocaleDateString("fr-FR")}
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
        }
      </div>

      {/* Detail expande */}
      {expanded && (
        <div style={{ borderTop: "1px solid #1E1E1E", padding: "24px 20px", background: "#0A0A0A" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Infos emprunteur */}
            <div>
              <p className="label-uppercase" style={{ marginBottom: "16px" }}>Emprunteur principal</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Nom complet", value: `${dossier.emprunteur1Prenom} ${dossier.emprunteur1Nom}` },
                  { label: "Date de naissance", value: dossier.emprunteur1DateNaissance ?? "—" },
                  { label: "Nationalite", value: dossier.emprunteur1Nationalite ?? "—" },
                  { label: "Situation matrimoniale", value: dossier.emprunteur1SituationMatrimoniale ?? "—" },
                  { label: "Activite", value: dossier.emprunteur1Activite ?? "—" },
                  { label: "Statut pro", value: dossier.emprunteur1StatutPro ?? "—" },
                  { label: "Revenus nets/mois", value: dossier.emprunteur1RevenusMensuelsNets ? `${dossier.emprunteur1RevenusMensuelsNets.toLocaleString("fr-FR")} EUR` : "—" },
                  { label: "Charges mensuelles", value: dossier.chargesMensuelles ? `${dossier.chargesMensuelles.toLocaleString("fr-FR")} EUR` : "—" },
                  { label: "Nb enfants", value: dossier.emprunteur1NbEnfants?.toString() ?? "—" },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#3A3632", marginBottom: "4px" }}>{f.label}</p>
                    <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Co-emprunteur si present */}
            {dossier.emprunteur2Nom && (
              <div>
                <p className="label-uppercase" style={{ marginBottom: "16px" }}>Co-emprunteur</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Nom complet", value: `${dossier.emprunteur2Prenom ?? ""} ${dossier.emprunteur2Nom}` },
                    { label: "Activite", value: dossier.emprunteur2Activite ?? "—" },
                    { label: "Revenus nets/mois", value: dossier.emprunteur2RevenusMensuelsNets ? `${dossier.emprunteur2RevenusMensuelsNets.toLocaleString("fr-FR")} EUR` : "—" },
                  ].map(f => (
                    <div key={f.label}>
                      <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#3A3632", marginBottom: "4px" }}>{f.label}</p>
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projet */}
            <div>
              <p className="label-uppercase" style={{ marginBottom: "16px" }}>Projet immobilier</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Montant projet", value: dossier.montantProjet ? `${dossier.montantProjet.toLocaleString("fr-FR")} EUR` : "—" },
                  { label: "Apport personnel", value: dossier.apportPersonnel ? `${dossier.apportPersonnel.toLocaleString("fr-FR")} EUR` : "—" },
                  { label: "Duree", value: dossier.duree ? `${dossier.duree} mois` : "—" },
                  { label: "Taux envisage", value: dossier.tauxEnvisage ? `${dossier.tauxEnvisage}%` : "—" },
                  { label: "Type de bien", value: dossier.typeBien ?? "—" },
                  { label: "Localisation", value: dossier.localisationBien ?? "—" },
                  { label: "Usage", value: dossier.usageBien ?? "—" },
                  { label: "Loyers HC", value: dossier.loyersHC ? `${dossier.loyersHC.toLocaleString("fr-FR")} EUR` : "—" },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#3A3632", marginBottom: "4px" }}>{f.label}</p>
                    <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents joints */}
            {item.docs && item.docs.length > 0 && (
              <div>
                <p className="label-uppercase" style={{ marginBottom: "12px" }}>Documents joints par Manon</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {item.docs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between" style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "10px 14px" }}>
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                        <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{doc.nom}</span>
                        <span style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#3A3632" }}>{doc.type}</span>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 transition-opacity duration-300 hover:opacity-70"
                          style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.04em", color: "#6B6560", textDecoration: "none" }}
                        >
                          <Eye className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                          Voir
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note de Manon */}
            {item.assignation.noteManon && (
              <div style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "2px", padding: "16px" }}>
                <p className="label-uppercase" style={{ color: "#C9A84C", marginBottom: "6px" }}>Note de Manon</p>
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", fontStyle: "italic" }}>"{item.assignation.noteManon}"</p>
              </div>
            )}

            {/* Mettre a jour le statut */}
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "24px" }}>
              <p className="label-uppercase" style={{ marginBottom: "12px" }}>Votre retour</p>
              <div className="flex flex-wrap gap-2" style={{ marginBottom: "12px" }}>
                {[
                  { value: "en_attente", label: "En attente" },
                  { value: "en_cours", label: "En cours" },
                  { value: "valide", label: "Valide" },
                  { value: "refuse", label: "Refuse" },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatut(s.value)}
                    className="transition-colors duration-300"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase" as const,
                      border: statut === s.value
                        ? "1px solid rgba(201,168,76,0.4)"
                        : "1px solid #1E1E1E",
                      background: statut === s.value
                        ? "rgba(201,168,76,0.08)"
                        : "transparent",
                      color: statut === s.value
                        ? "#C9A84C"
                        : "#3A3632",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Votre note pour Manon (facultatif)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full transition-colors duration-300 focus:outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#F0EDE6",
                  resize: "none",
                  marginBottom: "12px",
                }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
              <button
                onClick={() => updateMutation.mutate({
                  assignationId: item.assignation.id,
                  statut: statut as any,
                  noteCourtier: note || undefined,
                })}
                disabled={updateMutation.isPending}
                className="transition-colors duration-300"
                style={{
                  padding: "10px 24px",
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
                {updateMutation.isPending ? "Envoi..." : "Enregistrer le retour"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Composant principal ----
export default function CourtierPortail() {
  const [activeTab, setActiveTab] = useState<"dossiers" | "recus" | "reseau" | "commissions" | "documents" | "demandes" | "profil">("recus");
  const [mesRegions, setMesRegions] = useState<string[]>([]);
  const updateMesRegions = trpc.courtiers.updateMesRegions.useMutation({
    onSuccess: () => toast.success("Regions mises a jour !"),
    onError: () => toast.error("Erreur lors de la mise a jour"),
  });

  // Mes demandes a Manon
  const { data: mesDemandes = [], refetch: refetchDemandes } = trpc.calendar.mesDemandes.useQuery(
    { assigneA: "Manon" },
    { enabled: activeTab === "demandes" }
  );
  // Formulaire declaration commission
  const [showDeclarer, setShowDeclarer] = useState(false);
  const [declForm, setDeclForm] = useState({
    leadNom: "", dossierRef: "",
    montantEnveloppe: "", montantCommission: "",
  });
  // Calcul preview en temps reel
  const montantComm = parseInt(declForm.montantCommission) || 0;
  const previewCourtier = Math.round(montantComm * 0.75);
  const previewSigma = montantComm - previewCourtier;
  const previewParrainN1 = Math.round(previewSigma * 0.10);
  const previewParrainN2 = Math.round(previewSigma * 0.05);
  const previewSigmaNet = previewSigma - previewParrainN1 - previewParrainN2;
  const [showNewDossier, setShowNewDossier] = useState(false);
  const [newDossier, setNewDossier] = useState({
    clientNom: "", clientEmail: "", clientTelephone: "",
    typeDossier: "" as any, montantFinancement: "", description: "",
  });

  const { data: profil } = trpc.courtiers.monProfil.useQuery();
  // Initialiser les regions depuis le profil
  const [regionsInitialized, setRegionsInitialized] = useState(false);
  if (profil && !regionsInitialized) {
    if ((profil as any).regionsOperation) {
      try { setMesRegions(JSON.parse((profil as any).regionsOperation)); } catch {}
    }
    setRegionsInitialized(true);
  }
  const { data: dossiers = [], refetch: refetchDossiers } = trpc.courtiers.dossiers.list.useQuery(
    { courtierId: profil?.id },
    { enabled: !!profil?.id }
  );
  // Transactions commissions (nouveau module)
  const { data: transactionsCourtage = [], refetch: refetchTransactions } = trpc.commissions.listTransactionsCourtage.useQuery(
    { courtierId: profil?.id },
    { enabled: !!profil?.id }
  );
  const creerTransactionMut = trpc.commissions.creerTransactionCourtage.useMutation({
    onSuccess: () => { toast.success("Commission declaree !"); setShowDeclarer(false); setDeclForm({ leadNom: "", dossierRef: "", montantEnveloppe: "", montantCommission: "" }); refetchTransactions(); },
    onError: (e) => toast.error(e.message),
  });
  // Legacy commissions reseau
  const { data: commissions = [] } = trpc.courtiers.commissions.list.useQuery(
    { beneficiaireType: "courtier", beneficiaireId: profil?.id },
    { enabled: !!profil?.id }
  );
  const { data: detail } = trpc.courtiers.getById.useQuery(
    { id: profil?.id! },
    { enabled: !!profil?.id }
  );
  const { data: assignations = [], refetch: refetchAssignations } = trpc.financement.mesAssignations.useQuery(
    undefined,
    { enabled: activeTab === "recus" }
  );

  const createDossier = trpc.courtiers.dossiers.create.useMutation({
    onSuccess: () => {
      toast.success("Dossier cree avec succes");
      setShowNewDossier(false);
      setNewDossier({ clientNom: "", clientEmail: "", clientTelephone: "", typeDossier: "" as any, montantFinancement: "", description: "" });
      refetchDossiers();
    },
    onError: (e) => toast.error(e.message),
  });

  // Mon reseau (filleuls + commissions parrainage)
  const { data: monReseau } = trpc.courtiers.monReseau.useQuery(
    undefined,
    { enabled: activeTab === "reseau" }
  );

  const totalCommissions = commissions.reduce((s: number, c: any) => s + c.montantHt, 0);
  const commissionsPayees = commissions.filter((c: any) => c.statut === "paye").reduce((s: number, c: any) => s + c.montantHt, 0);

  const nbNouveauxRecus = assignations.filter((a: any) => a.assignation.statut === "en_attente").length;

  if (!profil) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center" style={{ padding: "80px 24px" }}>
          <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "48px 40px", maxWidth: "420px", textAlign: "center" }}>
            <AlertCircle className="mx-auto" style={{ width: "32px", height: "32px", color: "#6B6560", strokeWidth: 1.5, marginBottom: "20px" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em", marginBottom: "8px" }}>Profil courtier non trouve</h2>
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginBottom: "28px", lineHeight: 1.6 }}>
              Votre compte n'est pas encore lie a un profil courtier. Inscrivez-vous via le formulaire de partenariat.
            </p>
            <a href="/inscription-courtier" style={{
              display: "inline-block",
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
            }}>
              S'inscrire comme courtier
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Dossiers en retard (assignes mais non traites depuis > 72h)
  const dossiersEnRetard = assignations.filter((a: any) => {
    if (a.assignation.statut !== "en_attente") return false;
    const assignedAt = new Date(a.assignation.createdAt).getTime();
    return Date.now() - assignedAt > 72 * 60 * 60 * 1000;
  });

  const inputStyle = {
    background: "#161616",
    border: "1px solid #1E1E1E",
    borderRadius: "2px",
    padding: "10px 14px",
    fontSize: "13px",
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: "#F0EDE6",
    width: "100%",
    outline: "none",
  } as const;

  const primaryButtonStyle = {
    padding: "10px 24px",
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
  } as const;

  const secondaryButtonStyle = {
    padding: "10px 24px",
    background: "transparent",
    color: "#6B6560",
    fontSize: "11px",
    fontWeight: 500,
    fontFamily: "'Hanken Grotesk', sans-serif",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    borderRadius: "2px",
    border: "1px solid #1E1E1E",
    cursor: "pointer",
  } as const;

  return (
    <DashboardLayout>
      <div style={{ padding: "32px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* Banniere suspension */}
          {profil.statutInterne === "suspendu" && (
            <div className="flex items-start gap-3" style={{ border: "1px solid rgba(160,64,64,0.4)", background: "rgba(160,64,64,0.06)", borderRadius: "2px", padding: "16px 20px" }}>
              <AlertTriangle className="flex-shrink-0 mt-0.5" style={{ width: "16px", height: "16px", color: "#A04040", strokeWidth: 1.5 }} />
              <div>
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#A04040", marginBottom: "2px" }}>Compte suspendu</p>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Votre compte a ete suspendu automatiquement suite a des dossiers non traites. Contactez Manon pour reactiver votre acces.</p>
              </div>
            </div>
          )}

          {/* Banniere dossiers en retard */}
          {dossiersEnRetard.length > 0 && profil.statutInterne !== "suspendu" && (
            <div className="flex items-start gap-3" style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)", borderRadius: "2px", padding: "16px 20px" }}>
              <AlertTriangle className="flex-shrink-0 mt-0.5" style={{ width: "16px", height: "16px", color: "#C9A84C", strokeWidth: 1.5 }} />
              <div>
                <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#C9A84C", marginBottom: "2px" }}>{dossiersEnRetard.length} dossier(s) en retard -- plus de 72h sans traitement</p>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Veuillez traiter ces dossiers rapidement pour eviter la suspension de votre compte.</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
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
                Mon espace courtier
              </h1>
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", marginTop: "8px" }}>
                {profil.prenom} {profil.nom} {profil.cabinetNom ? `-- ${profil.cabinetNom}` : ""}
              </p>
            </div>
            <StatutBadge
              statut={profil.statutInterne === "actif" ? "actif" : "en_attente"}
              styles={{
                actif: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
                en_attente: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
              }}
            />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
            {[
              { label: "Dossiers recus", value: assignations.length },
              { label: "En cours", value: dossiers.filter((d: any) => ["nouveau", "en_cours", "en_attente_banque"].includes(d.statut)).length },
              { label: "Filleuls reseau", value: detail?.stats.totalFilleuls ?? 0 },
              { label: "Commissions reseau", value: (totalCommissions / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) },
            ].map((stat, i) => (
              <div key={stat.label} style={{ background: "#0A0A0A", padding: "20px" }}>
                <p className="tabular-nums" style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "28px",
                  fontWeight: 600,
                  color: "#F0EDE6",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}>
                  {stat.value}
                </p>
                <p className="label-uppercase" style={{ marginTop: "8px" }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Onglets */}
          <div style={{ borderBottom: "1px solid #1E1E1E" }}>
            <div className="flex gap-0 overflow-x-auto" style={{ marginBottom: "-1px" }}>
              {[
                { key: "recus", label: "Dossiers recus", icon: <Inbox className="w-4 h-4" style={{ strokeWidth: 1.5 }} />, badge: nbNouveauxRecus },
                { key: "dossiers", label: "Mes dossiers", icon: <FolderOpen className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> },
                { key: "commissions", label: "Mes commissions", icon: <Euro className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> },
                { key: "reseau", label: "Reseau", icon: <TrendingUp className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> },
                { key: "documents", label: "Documents", icon: <FileText className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> },
                { key: "demandes", label: "Mes demandes", icon: <AlertTriangle className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> },
                { key: "profil", label: "Mon profil", icon: <MapPin className="w-4 h-4" style={{ strokeWidth: 1.5 }} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className="flex items-center gap-2 transition-colors duration-300 whitespace-nowrap"
                  style={{
                    padding: "12px 20px",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    color: activeTab === tab.key ? "#C9A84C" : "#3A3632",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab.key ? "1px solid #C9A84C" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span style={{
                      fontSize: "10px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      color: "#F0EDE6",
                      background: "rgba(240,237,230,0.1)",
                      border: "1px solid rgba(240,237,230,0.15)",
                      borderRadius: "2px",
                      padding: "1px 6px",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* == Onglet Dossiers recus == */}
          {activeTab === "recus" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <ContactManonButton courtierId={profil?.id} courtierNom={profil ? `${profil.prenom} ${profil.nom}` : ""} />
              {assignations.length === 0 ? (
                <div className="text-center" style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "60px 24px" }}>
                  <Inbox className="mx-auto" style={{ width: "32px", height: "32px", color: "#1E1E1E", strokeWidth: 1.5, marginBottom: "16px" }} />
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucun dossier recu pour l'instant</p>
                  <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#1E1E1E", marginTop: "4px" }}>Manon vous assignera des dossiers de courtage ici</p>
                </div>
              ) : (
                assignations.map((item: any) => (
                  <DossierRecuCard key={item.assignation.id} item={item} onRefetch={refetchAssignations} />
                ))
              )}
            </div>
          )}

          {/* == Onglet Mes dossiers == */}
          {activeTab === "dossiers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>Mes dossiers clients</h2>
                <button
                  onClick={() => setShowNewDossier(!showNewDossier)}
                  className="flex items-center gap-2 transition-colors duration-300"
                  style={primaryButtonStyle}
                >
                  <Plus className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                  Nouveau dossier
                </button>
              </div>

              {showNewDossier && (
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <p className="label-uppercase" style={{ color: "#F0EDE6", marginBottom: "16px" }}>Nouveau dossier client</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Nom du client *</p>
                      <input
                        value={newDossier.clientNom}
                        onChange={e => setNewDossier(f => ({ ...f, clientNom: e.target.value }))}
                        style={inputStyle}
                        className="transition-colors duration-300 focus:outline-none"
                        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                      />
                    </div>
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Type de dossier *</p>
                      <Select value={newDossier.typeDossier} onValueChange={v => setNewDossier(f => ({ ...f, typeDossier: v as any }))}>
                        <SelectTrigger style={{ ...inputStyle, display: "flex" }}><SelectValue placeholder="Choisir..." /></SelectTrigger>
                        <SelectContent style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                          {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Email client</p>
                      <input
                        type="email"
                        value={newDossier.clientEmail}
                        onChange={e => setNewDossier(f => ({ ...f, clientEmail: e.target.value }))}
                        style={inputStyle}
                        className="transition-colors duration-300 focus:outline-none"
                        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                      />
                    </div>
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Montant financement (EUR)</p>
                      <input
                        type="number"
                        value={newDossier.montantFinancement}
                        onChange={e => setNewDossier(f => ({ ...f, montantFinancement: e.target.value }))}
                        style={inputStyle}
                        className="transition-colors duration-300 focus:outline-none"
                        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end" style={{ marginTop: "16px" }}>
                    <button onClick={() => setShowNewDossier(false)} style={secondaryButtonStyle} className="transition-colors duration-300">Annuler</button>
                    <button
                      disabled={!newDossier.clientNom || !newDossier.typeDossier || createDossier.isPending}
                      onClick={() => createDossier.mutate({
                        courtierId: profil.id,
                        clientNom: newDossier.clientNom,
                        clientEmail: newDossier.clientEmail || undefined,
                        clientTelephone: newDossier.clientTelephone || undefined,
                        typeDossier: newDossier.typeDossier,
                        montantFinancement: newDossier.montantFinancement ? parseInt(newDossier.montantFinancement) * 100 : undefined,
                      })}
                      style={{
                        ...primaryButtonStyle,
                        opacity: (!newDossier.clientNom || !newDossier.typeDossier) ? 0.4 : 1,
                        cursor: (!newDossier.clientNom || !newDossier.typeDossier) ? "not-allowed" : "pointer",
                      }}
                      className="transition-colors duration-300"
                    >
                      Creer le dossier
                    </button>
                  </div>
                </div>
              )}

              <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                      {["Client", "Type", "Montant", "Statut", "Date"].map(h => (
                        <th key={h} className="text-left label-uppercase" style={{ padding: "12px 20px", background: "#0D0D0D" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dossiers.length === 0 && (
                      <tr><td colSpan={5} className="text-center" style={{ padding: "48px 20px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucun dossier</td></tr>
                    )}
                    {dossiers.map((d: any) => (
                      <tr
                        key={d.id}
                        className="cursor-pointer transition-colors duration-300"
                        style={{ borderBottom: "1px solid #151515" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "12px 20px" }}>
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{d.clientNom}</p>
                          {d.clientEmail && <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{d.clientEmail}</p>}
                        </td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{TYPE_LABELS[d.typeDossier] || d.typeDossier}</td>
                        <td className="tabular-nums" style={{ padding: "12px 20px", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{d.montantFinancement ? `${(d.montantFinancement / 100).toLocaleString("fr-FR")} EUR` : "—"}</td>
                        <td style={{ padding: "12px 20px" }}>
                          <StatutBadge statut={d.statut} />
                        </td>
                        <td className="tabular-nums" style={{ padding: "12px 20px", fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* == Onglet Mes commissions == */}
          {activeTab === "commissions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>Mes commissions courtage</h2>
                <button
                  onClick={() => setShowDeclarer(v => !v)}
                  className="flex items-center gap-2 transition-colors duration-300"
                  style={primaryButtonStyle}
                >
                  <Plus className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                  Declarer une commission
                </button>
              </div>

              {/* Formulaire declaration */}
              {showDeclarer && (
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <p className="label-uppercase" style={{ color: "#F0EDE6", marginBottom: "16px" }}>Nouvelle declaration</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Nom du lead / client</p>
                      <input
                        value={declForm.leadNom}
                        onChange={e => setDeclForm(f => ({ ...f, leadNom: e.target.value }))}
                        placeholder="Ex: Jean Dupont"
                        style={inputStyle}
                        className="transition-colors duration-300 focus:outline-none"
                        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                      />
                    </div>
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Reference dossier (optionnel)</p>
                      <input
                        value={declForm.dossierRef}
                        onChange={e => setDeclForm(f => ({ ...f, dossierRef: e.target.value }))}
                        placeholder="Ex: DOC-2024-001"
                        style={inputStyle}
                        className="transition-colors duration-300 focus:outline-none"
                        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                      />
                    </div>
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Montant enveloppe obtenue (EUR)</p>
                      <input
                        type="number"
                        value={declForm.montantEnveloppe}
                        onChange={e => setDeclForm(f => ({ ...f, montantEnveloppe: e.target.value }))}
                        placeholder="Ex: 250000"
                        style={inputStyle}
                        className="transition-colors duration-300 focus:outline-none"
                        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                      />
                    </div>
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "6px" }}>Commission totale recue (EUR) *</p>
                      <input
                        type="number"
                        value={declForm.montantCommission}
                        onChange={e => setDeclForm(f => ({ ...f, montantCommission: e.target.value }))}
                        placeholder="Ex: 3000"
                        style={inputStyle}
                        className="transition-colors duration-300 focus:outline-none"
                        onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                      />
                    </div>
                  </div>
                  {/* Calcul preview */}
                  {montantComm > 0 && (
                    <div style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "16px", marginTop: "16px" }}>
                      <p className="label-uppercase" style={{ marginBottom: "12px" }}>Repartition calculee automatiquement</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex justify-between">
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Votre part (75%)</span>
                          <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#4A7A5A" }}>{previewCourtier.toLocaleString("fr-FR")} EUR</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Parrain N1 (10% Sigma)</span>
                          <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{previewParrainN1.toLocaleString("fr-FR")} EUR</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Part Sigma</span>
                          <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{previewSigmaNet.toLocaleString("fr-FR")} EUR</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Parrain N2 (5% Sigma)</span>
                          <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{previewParrainN2.toLocaleString("fr-FR")} EUR</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3" style={{ marginTop: "16px" }}>
                    <button
                      onClick={() => {
                        if (!profil?.id) return;
                        if (!declForm.montantCommission) { toast.error("La commission totale est obligatoire"); return; }
                        creerTransactionMut.mutate({
                          courtierId: profil.id,
                          leadNom: declForm.leadNom || undefined,
                          dossierRef: declForm.dossierRef || undefined,
                          montantEnveloppe: declForm.montantEnveloppe ? parseInt(declForm.montantEnveloppe) : undefined,
                          montantCommission: parseInt(declForm.montantCommission),
                        });
                      }}
                      disabled={creerTransactionMut.isPending}
                      style={{
                        ...primaryButtonStyle,
                        background: creerTransactionMut.isPending ? "#8A7535" : "#C9A84C",
                        cursor: creerTransactionMut.isPending ? "not-allowed" : "pointer",
                      }}
                      className="transition-colors duration-300"
                    >
                      {creerTransactionMut.isPending ? "Envoi..." : "Enregistrer"}
                    </button>
                    <button onClick={() => setShowDeclarer(false)} style={secondaryButtonStyle} className="transition-colors duration-300">Annuler</button>
                  </div>
                </div>
              )}

              {/* Liste des transactions */}
              {transactionsCourtage.length === 0 ? (
                <div className="text-center" style={{ padding: "60px 24px" }}>
                  <Euro className="mx-auto" style={{ width: "24px", height: "24px", color: "#1E1E1E", strokeWidth: 1.5, marginBottom: "12px" }} />
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucune commission declaree pour l'instant</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {transactionsCourtage.map((t: any) => (
                    <div key={t.id} style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "20px" }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{t.leadNom || "Client anonyme"}</p>
                          {t.dossierRef && <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px" }}>Ref : {t.dossierRef}</p>}
                          <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px" }}>{new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className="text-right">
                          {t.montantCommission && <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F0EDE6" }}>{t.montantCommission.toLocaleString("fr-FR")} EUR</p>}
                          {t.montantEnveloppe && <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px" }}>Enveloppe : {t.montantEnveloppe.toLocaleString("fr-FR")} EUR</p>}
                          <StatutBadge
                            statut={t.statut === "paye" ? "paye" : t.statut === "paiement_initie" ? "paiement initie" : t.statut === "valide" ? "valide" : "en attente"}
                            styles={{
                              paye: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
                              "paiement initie": { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
                              valide: { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
                              "en attente": { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
                            }}
                          />
                        </div>
                      </div>
                      {t.partCourtier && (
                        <div className="grid grid-cols-3 gap-3" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #151515" }}>
                          <div>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#3A3632", marginBottom: "2px" }}>Votre part</p>
                            <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#4A7A5A" }}>{t.partCourtier.toLocaleString("fr-FR")} EUR</p>
                          </div>
                          <div>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#3A3632", marginBottom: "2px" }}>Parrain N1</p>
                            <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{(t.partParrainN1 || 0).toLocaleString("fr-FR")} EUR</p>
                          </div>
                          <div>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#3A3632", marginBottom: "2px" }}>Part Sigma</p>
                            <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{(t.partSigma || 0).toLocaleString("fr-FR")} EUR</p>
                          </div>
                        </div>
                      )}
                      {t.noteHanna && (
                        <div style={{ marginTop: "12px", background: "rgba(240,237,230,0.03)", border: "1px solid #151515", borderRadius: "2px", padding: "10px 12px" }}>
                          <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Note Hanna : {t.noteHanna}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* == Onglet Reseau & Commissions == */}
          {activeTab === "reseau" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* KPIs reseau */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                {[
                  { label: "Total filleuls", value: monReseau?.stats.totalFilleuls ?? 0 },
                  { label: "Commissions generees", value: ((monReseau?.stats.commissionsTotal ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) },
                  { label: "Commissions payees", value: ((monReseau?.stats.commissionsPayees ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) },
                  { label: "En attente", value: ((monReseau?.stats.commissionsEnAttente ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: "#0A0A0A", padding: "20px" }}>
                    <p className="tabular-nums" style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "24px",
                      fontWeight: 600,
                      color: "#F0EDE6",
                      lineHeight: 1,
                      letterSpacing: "0.02em",
                    }}>
                      {kpi.value}
                    </p>
                    <p className="label-uppercase" style={{ marginTop: "8px" }}>{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Lien de parrainage */}
              <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                <p className="label-uppercase" style={{ color: "#F0EDE6", marginBottom: "12px" }}>Mon lien de parrainage</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 tabular-nums" style={{
                    background: "#0A0A0A",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "#6B6560",
                    wordBreak: "break-all",
                  }}>
                    {window.location.origin}/rejoindre?parrain={profil.codeParrain}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/rejoindre?parrain=${profil.codeParrain}`); toast.success("Lien copie !"); }}
                    style={secondaryButtonStyle}
                    className="transition-colors duration-300 shrink-0"
                  >
                    Copier
                  </button>
                </div>
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "10px" }}>Partagez ce lien pour recruter des courtiers ou agents dans votre reseau</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Filleuls courtiers */}
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
                    <Users className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                    <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Courtiers parraines ({monReseau?.filleulsCourtiers.length ?? 0})</p>
                  </div>
                  {!monReseau?.filleulsCourtiers.length ? (
                    <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", textAlign: "center", padding: "20px 0" }}>Aucun courtier parraine pour l'instant</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {monReseau.filleulsCourtiers.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between" style={{ background: "#0A0A0A", border: "1px solid #151515", borderRadius: "2px", padding: "10px 14px" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{f.prenom} {f.nom}</p>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{f.email}</p>
                          </div>
                          <StatutBadge
                            statut={f.statutInterne}
                            styles={{
                              actif: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
                              suspendu: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
                              en_attente: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filleuls agents */}
                <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
                    <Users className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                    <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Agents parraines ({monReseau?.filleulsAgents.length ?? 0})</p>
                  </div>
                  {!monReseau?.filleulsAgents.length ? (
                    <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", textAlign: "center", padding: "20px 0" }}>Aucun agent parraine pour l'instant</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {monReseau.filleulsAgents.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between" style={{ background: "#0A0A0A", border: "1px solid #151515", borderRadius: "2px", padding: "10px 14px" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{f.prenom} {f.nom}</p>
                            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{f.email}</p>
                          </div>
                          <StatutBadge
                            statut={f.statutInterne}
                            styles={{
                              actif: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
                              suspendu: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
                              en_attente: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Historique commissions reseau */}
              <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "24px" }}>
                <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
                  <TrendingUp className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                  <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Historique des commissions de parrainage</p>
                </div>
                {!monReseau?.commissions.length ? (
                  <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", textAlign: "center", padding: "20px 0" }}>Aucune commission de parrainage generee pour l'instant</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {monReseau.commissions.slice(0, 10).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between" style={{ background: "#0A0A0A", border: "1px solid #151515", borderRadius: "2px", padding: "10px 14px" }}>
                        <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
                          Niveau {c.niveau} -- {c.tauxPourcent}% -- {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                            +{(c.montantHt / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                          </span>
                          <StatutBadge
                            statut={c.statut === "paye" ? "paye" : "en attente"}
                            styles={{
                              paye: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
                              "en attente": { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* == Onglet Mes demandes == */}
          {activeTab === "demandes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: "4px" }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                  <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Mes demandes envoyees a Manon</p>
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
                <div className="text-center" style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "48px 24px" }}>
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucune demande envoyee pour l'instant.</p>
                  <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#1E1E1E", marginTop: "4px" }}>Utilisez le bouton "Envoyer une demande" dans l'onglet "Dossiers recus".</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {mesDemandes.map(task => {
                    const statutStyles: Record<string, { color: string; bg: string; border: string }> = {
                      a_faire: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
                      en_cours: { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
                      termine: { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
                    };
                    const statutLabels: Record<string, string> = {
                      a_faire: "A faire",
                      en_cours: "En cours",
                      termine: "Termine",
                    };
                    return (
                      <div key={task.id} className="flex items-start justify-between gap-4" style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "16px 20px" }}>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{task.titre}</p>
                          {task.description && <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{task.description}</p>}
                          <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "6px" }}>
                            {new Date(task.dateDebut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                            {" a "}
                            {new Date(task.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                          </p>
                        </div>
                        <StatutBadge statut={task.statut} styles={statutStyles} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* == Onglet Mon Profil == */}
          {activeTab === "profil" && profil && (
            <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "32px" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: "8px" }}>
                <MapPin className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Regions d'operation</p>
              </div>
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginBottom: "20px", lineHeight: 1.6 }}>
                Indiquez les regions ou vous exercez. Manon utilisera cette information pour vous assigner les dossiers correspondants.
              </p>
              <div className="flex flex-wrap gap-2" style={{ marginBottom: "20px" }}>
                {mesRegions.map(r => (
                  <span key={r} className="flex items-center gap-2" style={{
                    background: "rgba(201,168,76,0.04)",
                    border: "1px solid rgba(201,168,76,0.15)",
                    borderRadius: "2px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#6B6560",
                  }}>
                    {r}
                    <button
                      onClick={() => setMesRegions(prev => prev.filter(x => x !== r))}
                      className="transition-opacity duration-300 hover:opacity-70"
                      style={{ color: "#3A3632", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <X className="w-3 h-3" style={{ strokeWidth: 1.5 }} />
                    </button>
                  </span>
                ))}
                {mesRegions.length === 0 && <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic" }}>Aucune region renseignee</span>}
              </div>
              <div className="flex gap-3">
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
                  onClick={() => updateMesRegions.mutate({ regionsOperation: mesRegions })}
                  disabled={updateMesRegions.isPending}
                  style={{
                    ...primaryButtonStyle,
                    background: updateMesRegions.isPending ? "#8A7535" : "#C9A84C",
                    cursor: updateMesRegions.isPending ? "not-allowed" : "pointer",
                  }}
                  className="transition-colors duration-300"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          )}

          {/* == Onglet Documents == */}
          {activeTab === "documents" && profil && (
            <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "32px" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: "8px" }}>
                <FileText className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
                <p className="label-uppercase" style={{ color: "#F0EDE6" }}>Echange de documents avec Manon</p>
              </div>
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginBottom: "24px", lineHeight: 1.6 }}>
                Envoyez des documents a Manon ou consultez les documents qu'elle vous a transmis.
              </p>
              <PartnerDocumentsSection
                partnerType="courtier"
                partnerId={profil.id}
                partnerNom={`${profil.prenom ?? ""} ${profil.nom}`}
                partnerEmail={profil.email}
                viewAs="partner"
              />
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

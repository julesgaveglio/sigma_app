import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Plus, X, ChevronLeft, ChevronRight, Check, Trash2, Upload, FileText, Paperclip, ImageIcon, Clock, Loader2, Ban, Eye, EyeOff } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Membre = "Maria" | "Manon" | "Elodie" | "Hanna" | "Marie";
type Statut = "a_faire" | "en_cours" | "termine";
type Vue = "semaine" | "mois";
type VueMaria = "toutes" | "welcome_call" | "point_personnalise";

interface Task {
  id: number;
  titre: string;
  description?: string | null;
  assigneA: Membre;
  dateDebut: string;
  dateFin?: string | null;
  touteJournee: boolean;
  crmLeadId?: number | null;
  rappelEmail: boolean;
  rappelMinutesAvant?: number | null;
  statut: Statut;
  creePar?: string | null;
  createdAt: string;
}

// ─── Config membres ───────────────────────────────────────────────────────────

const MEMBRES: { key: Membre; label: string; color: string; bg: string; dot: string }[] = [
  { key: "Maria",  label: "Maria",  color: "text-blue-400",   bg: "bg-blue-500",   dot: "bg-blue-400" },
  { key: "Manon",  label: "Manon",  color: "text-purple-400", bg: "bg-purple-500", dot: "bg-purple-400" },
  { key: "Elodie", label: "Élodie", color: "text-emerald-400",bg: "bg-emerald-500",dot: "bg-emerald-400" },
  { key: "Hanna",  label: "Hanna",  color: "text-amber-400",  bg: "bg-amber-500",  dot: "bg-amber-400" },
  { key: "Marie",  label: "Marie",  color: "text-pink-400",   bg: "bg-pink-500",   dot: "bg-pink-400" },
];

// Couleurs membres subtiles pour le design system
const MEMBRE_COLORS: Record<Membre, { accent: string; accentBg: string; accentBorder: string }> = {
  Maria:  { accent: "#7A8FA6", accentBg: "rgba(122,143,166,0.08)", accentBorder: "rgba(122,143,166,0.2)" },
  Manon:  { accent: "#9A84B0", accentBg: "rgba(154,132,176,0.08)", accentBorder: "rgba(154,132,176,0.2)" },
  Elodie: { accent: "#6B9A7A", accentBg: "rgba(107,154,122,0.08)", accentBorder: "rgba(107,154,122,0.2)" },
  Hanna:  { accent: "#B0996A", accentBg: "rgba(176,153,106,0.08)", accentBorder: "rgba(176,153,106,0.2)" },
  Marie:  { accent: "#A6808A", accentBg: "rgba(166,128,138,0.08)", accentBorder: "rgba(166,128,138,0.2)" },
};

const RAPPELS = [
  { value: 0,    label: "Au moment" },
  { value: 15,   label: "15 min avant" },
  { value: 30,   label: "30 min avant" },
  { value: 60,   label: "1h avant" },
  { value: 120,  label: "2h avant" },
  { value: 1440, label: "1 jour avant" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lundi
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Convertit une date UTC en date Paris pour la comparaison de jours
function toParisDate(d: Date): { y: number; m: number; day: number } {
  const s = d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); // YYYY-MM-DD HH:MM:SS
  const [y, m, day] = s.slice(0, 10).split('-').map(Number);
  return { y, m, day };
}

function isSameDay(a: Date, b: Date): boolean {
  const pa = toParisDate(a);
  const pb = toParisDate(b);
  return pa.y === pb.y && pa.m === pb.m && pa.day === pb.day;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function getMembre(key: Membre) {
  return MEMBRES.find(m => m.key === key)!;
}

// ─── Modal Tâche ──────────────────────────────────────────────────────────────

// Convertit une date ISO UTC en format datetime-local en heure Paris (YYYY-MM-DDTHH:MM)
function toParisLocalInput(isoUtc: string): string {
  const d = new Date(isoUtc);
  const parts = d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); // sv-SE → YYYY-MM-DD HH:MM:SS
  return parts.slice(0, 16).replace(' ', 'T');
}

// Convertit une valeur datetime-local saisie en heure Paris vers ISO UTC
// La valeur saisie dans <input type="datetime-local"> est naïve (sans fuseau).
// On la traite comme Europe/Paris et on calcule l'UTC correspondant.
function fromParisInputToUtc(localStr: string): string {
  if (!localStr) return '';
  // Normaliser : "2026-04-17T11:00" → "2026-04-17T11:00:00"
  const normalized = localStr.length === 16 ? localStr + ':00' : localStr;
  // Interpréter la valeur naïve comme si elle était en UTC (en ajoutant 'Z')
  // puis calculer l'offset Paris à ce moment précis pour corriger
  const asUtc = new Date(normalized + 'Z'); // traite la valeur comme UTC temporairement
  // Obtenir la représentation Paris de ce moment UTC
  const parisStr = asUtc.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); // "2026-04-17 13:00:00" (UTC+2)
  // L'offset Paris = asUtc - parisDate (en ms)
  const parisAsUtc = new Date(parisStr.replace(' ', 'T') + 'Z');
  const offsetMs = asUtc.getTime() - parisAsUtc.getTime(); // ex: -7200000 pour UTC+2
  // UTC réel = valeur naïve traitée comme Paris + offset
  return new Date(asUtc.getTime() + offsetMs).toISOString();
}

interface ModalProps {
  task?: Task | null;
  defaultDate?: Date;
  onClose: () => void;
  onSaved: () => void;
  crmLeadsList?: { id: number; nom: string; prenom: string }[];
}

function TaskModal({ task, defaultDate, onClose, onSaved, crmLeadsList }: ModalProps) {
  const utils = trpc.useUtils();
  // Si les leads sont déjà passés en prop (pré-chargés), on ne refait pas la query
  const { data: crmData, isLoading: crmLoading, error: crmError } = trpc.crm.list.useQuery(undefined, {
    enabled: !crmLeadsList,
  });
  const crmLeads = crmLeadsList ?? ((crmData?.items ?? []) as { id: number; nom: string; prenom: string }[]);

  const now = defaultDate ?? new Date();
  const defaultDateStr = toParisLocalInput(now.toISOString());

  const [titre, setTitre] = useState(task?.titre ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneA, setAssigneA] = useState<Membre>(task?.assigneA ?? "Maria");
  const [dateDebut, setDateDebut] = useState(task ? toParisLocalInput(task.dateDebut) : defaultDateStr);
  const [dateFin, setDateFin] = useState(task?.dateFin ? toParisLocalInput(task.dateFin) : "");
  const [touteJournee, setTouteJournee] = useState(task?.touteJournee ?? false);
  const [crmLeadId, setCrmLeadId] = useState<number | "">(task?.crmLeadId ?? "");
  const [rappelEmail, setRappelEmail] = useState(task?.rappelEmail ?? false);
  const [rappelMinutes, setRappelMinutes] = useState(task?.rappelMinutesAvant ?? 30);
  const [statut, setStatut] = useState<Statut>(task?.statut ?? "a_faire");

  // Pièces jointes
  const [uploadingFile, setUploadingFile] = useState(false);
  const { data: attachments, refetch: refetchAttachments } = trpc.calendar.listAttachments.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task?.id }
  );
  const uploadMut = trpc.calendar.uploadAttachment.useMutation({
    onSuccess: () => { refetchAttachments(); setUploadingFile(false); toast.success("Fichier ajouté"); },
    onError: (e) => { setUploadingFile(false); toast.error(e.message); },
  });
  const deleteAttMut = trpc.calendar.deleteAttachment.useMutation({
    onSuccess: () => { refetchAttachments(); toast.success("Fichier supprimé"); },
    onError: (e) => toast.error(e.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 10 Mo)"); return; }
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMut.mutate({ taskId: task.id, fileBase64: base64, fileName: file.name, mimeType: file.type, fileSize: file.size });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " Ko";
    return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  }

  // Historique des statuts (uniquement en mode édition)
  const { data: history } = trpc.calendar.getHistory.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task?.id }
  );

  const createMut = trpc.calendar.create.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Tâche créée"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.calendar.update.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Tâche mise à jour"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.calendar.delete.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Tâche supprimée"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  // Détection hors disponibilités (avertissement visuel, non bloquant pour la direction)
  const DISPO_MARIA: Record<string, { jours: number[]; label: string }> = {
    welcome_call: { jours: [1, 4], label: "Lundi 13h-18h, Jeudi 9h-18h" },
    point_personnalise: { jours: [3], label: "Mercredi 9h-18h" },
  };
  const DISPO_ELODIE = { jours: [1, 2, 3, 4, 5, 6], label: "Lun-Sam (Mer 17h-19h seulement)" };
  const JOURS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  function getDispoWarning(): string | null {
    if (!dateDebut) return null;
    const d = new Date(dateDebut);
    const dow = d.getDay();
    if (assigneA === "Maria") {
      const titreL = titre.toLowerCase();
      const type = titreL.includes("welcome") ? "welcome_call" : titreL.includes("personnalis") || titreL.includes("point") ? "point_personnalise" : null;
      if (type && !DISPO_MARIA[type].jours.includes(dow)) {
        return `Maria n'est pas disponible le ${JOURS_FR[dow]} pour ce type de RDV (${DISPO_MARIA[type].label})`;
      }
      if (!type && ![1, 3, 4].includes(dow)) {
        return `Maria travaille Lun, Mer, Jeu uniquement`;
      }
    }
    if (assigneA === "Elodie" && dow === 0) {
      return `Élodie n'est pas disponible le dimanche`;
    }
    return null;
  }
  const dispoWarning = getDispoWarning();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return toast.error("Le titre est requis");
    const payload = {
      titre: titre.trim(),
      description: description || undefined,
      assigneA,
      dateDebut: fromParisInputToUtc(dateDebut),
      dateFin: dateFin ? fromParisInputToUtc(dateFin) : undefined,
      touteJournee,
      crmLeadId: crmLeadId !== "" ? Number(crmLeadId) : undefined,
      rappelEmail,
      rappelMinutesAvant: rappelMinutes,
      statut,
    };
    if (task) {
      updateMut.mutate({ id: task.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isBusy = createMut.isPending || updateMut.isPending;

  const STATUT_MODAL: Record<Statut, { label: string; color: string; bg: string; border: string }> = {
    a_faire:  { label: "A faire",  color: "#C9A84C", bg: "rgba(201,168,76,0.08)",  border: "rgba(201,168,76,0.2)" },
    en_cours: { label: "En cours", color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
    termine:  { label: "Termine",  color: "#4A7A5A", bg: "rgba(74,122,90,0.08)",   border: "rgba(74,122,90,0.2)" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", width: "100%", maxWidth: "520px" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #1E1E1E" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>
            {task ? "Modifier la tache" : "Nouvelle tache"}
          </h2>
          <button onClick={onClose} className="p-2 transition-opacity duration-300 hover:opacity-70" style={{ color: "#6B6560" }}>
            <X className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {/* Titre */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Titre *</p>
            <input
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Ex. Welcome Call — Sophie Martin"
              className="w-full focus:outline-none"
              style={{
                background: "#161616",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "10px 14px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#F0EDE6",
                transition: "border-color 300ms ease",
              }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          {/* Assigné à */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Assignee a</p>
            <div className="flex gap-2 flex-wrap">
              {MEMBRES.map(m => {
                const mc = MEMBRE_COLORS[m.key];
                const isSelected = assigneA === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setAssigneA(m.key)}
                    className="transition-colors duration-300"
                    style={{
                      padding: "5px 12px",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      border: `1px solid ${isSelected ? mc.accentBorder : "#1E1E1E"}`,
                      background: isSelected ? mc.accentBg : "transparent",
                      color: isSelected ? mc.accent : "#3A3632",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label-uppercase" style={{ marginBottom: "6px" }}>Debut *</p>
              <input
                type="datetime-local"
                value={dateDebut}
                onChange={e => setDateDebut(e.target.value)}
                className="w-full focus:outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#F0EDE6",
                  transition: "border-color 300ms ease",
                }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>
            <div>
              <p className="label-uppercase" style={{ marginBottom: "6px" }}>Fin (optionnel)</p>
              <input
                type="datetime-local"
                value={dateFin}
                onChange={e => setDateFin(e.target.value)}
                className="w-full focus:outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#F0EDE6",
                  transition: "border-color 300ms ease",
                }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
              />
            </div>
          </div>
          {/* Avertissement hors disponibilités */}
          {dispoWarning && (
            <div className="flex items-start gap-2" style={{
              padding: "10px 12px",
              borderRadius: "2px",
              background: "rgba(160,64,64,0.06)",
              border: "1px solid rgba(160,64,64,0.2)",
            }}>
              <Ban className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#A04040", strokeWidth: 1.5 }} />
              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#A04040" }}>
                {dispoWarning}
              </span>
            </div>
          )}
          {/* Toute la journée */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={touteJournee} onChange={e => setTouteJournee(e.target.checked)}
              style={{ accentColor: "#C9A84C" }} />
            <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Toute la journee</span>
          </label>
          {/* Lead CRM lié */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>
              Lead CRM associe
              {crmLoading && <span style={{ marginLeft: "8px", color: "#C9A84C", opacity: 0.6 }}>chargement...</span>}
              {crmError && <span style={{ marginLeft: "8px", color: "#A04040", fontSize: "10px" }}>(erreur)</span>}
              {!crmLoading && !crmError && crmLeads.length > 0 && <span style={{ marginLeft: "8px", color: "#3A3632" }}>{crmLeads.length} leads</span>}
            </p>
            <select
              value={crmLeadId}
              onChange={e => setCrmLeadId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full focus:outline-none"
              style={{
                background: "#161616",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "10px 14px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#F0EDE6",
                transition: "border-color 300ms ease",
              }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            >
              <option value="">{crmLoading ? "Chargement..." : "— Aucun —"}</option>
              {crmLeads.map(l => (
                <option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>
              ))}
            </select>
          </div>
          {/* Description */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Notes (optionnel)</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Details, contexte..."
              className="w-full focus:outline-none"
              style={{
                background: "#161616",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "10px 14px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#F0EDE6",
                resize: "none",
                transition: "border-color 300ms ease",
              }}
              onFocus={e => (e.target.style.borderColor = "#C9A84C")}
              onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
            />
          </div>
          {/* Rappel */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rappelEmail} onChange={e => setRappelEmail(e.target.checked)}
                style={{ accentColor: "#C9A84C" }} />
              <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Rappel par email</span>
            </label>
            {rappelEmail && (
              <select
                value={rappelMinutes}
                onChange={e => setRappelMinutes(Number(e.target.value))}
                className="focus:outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid #1E1E1E",
                  borderRadius: "2px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#F0EDE6",
                }}
              >
                {RAPPELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
          </div>
          {/* Statut */}
          {task && (
            <div>
              <p className="label-uppercase" style={{ marginBottom: "6px" }}>Statut</p>
              <div className="flex gap-2">
                {(Object.entries(STATUT_MODAL) as [Statut, typeof STATUT_MODAL["a_faire"]][]).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatut(key)}
                    className="transition-colors duration-300"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      border: `1px solid ${statut === key ? val.border : "#1E1E1E"}`,
                      background: statut === key ? val.bg : "transparent",
                      color: statut === key ? val.color : "#3A3632",
                    }}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Historique des statuts */}
          {task && history && history.length > 0 && (
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px" }}>
              <p className="label-uppercase" style={{ marginBottom: "8px" }}>Historique</p>
              <div className="space-y-1">
                {history.map((h) => {
                  const label = h.statut === "a_faire" ? "A faire" : h.statut === "en_cours" ? "En cours" : "Termine";
                  const color = h.statut === "a_faire" ? "#C9A84C" : h.statut === "en_cours" ? "#F0EDE6" : "#4A7A5A";
                  const date = new Date(h.changedAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
                  return (
                    <div key={h.id} className="flex items-center justify-between">
                      <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color }}>{label}</span>
                      <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{h.changedBy} — {date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Pièces jointes — uniquement en mode édition */}
          {task && (
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="label-uppercase">Pieces jointes</p>
                <label className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-300 hover:opacity-70" style={{
                  padding: "4px 10px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: uploadingFile ? "#3A3632" : "#C9A84C",
                  border: `1px solid ${uploadingFile ? "#1E1E1E" : "rgba(201,168,76,0.3)"}`,
                  background: "transparent",
                }}>
                  {uploadingFile ? (
                    <><Loader2 className="w-3 h-3 animate-spin" style={{ strokeWidth: 1.5 }} /> Envoi...</>
                  ) : (
                    <><Upload className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Ajouter</>
                  )}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} disabled={uploadingFile} />
                </label>
              </div>
              {attachments && attachments.length > 0 ? (
                <div className="space-y-1.5">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2" style={{
                      padding: "8px 10px",
                      borderRadius: "2px",
                      background: "#161616",
                      border: "1px solid #1E1E1E",
                    }}>
                      {att.mime_type.includes("pdf") ? (
                        <FileText className="w-4 h-4 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                      ) : att.mime_type.includes("image") ? (
                        <ImageIcon className="w-4 h-4 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                      ) : (
                        <Paperclip className="w-4 h-4 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                          className="block truncate transition-opacity duration-300 hover:opacity-70"
                          style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#C9A84C", textDecoration: "none" }}>
                          {att.file_name}
                        </a>
                        <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                          {formatFileSize(att.file_size)} · {att.uploaded_by}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Supprimer "${att.file_name}" ?`)) deleteAttMut.mutate({ attachmentId: att.id }); }}
                        className="shrink-0 transition-colors duration-300"
                        style={{ color: "#3A3632" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                        title="Supprimer"
                      >
                        <X className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic" }}>
                  Aucun fichier joint — devis, mandat, releve...
                </p>
              )}
            </div>
          )}
          {/* Actions */}
          <div className="flex items-center justify-between pt-3 mt-2" style={{ borderTop: "1px solid #1E1E1E" }}>
            {task ? (
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={() => { if (confirm(`Supprimer "${task.titre}" ?`)) deleteMut.mutate({ id: task.id }); }}
                className="flex items-center gap-1.5 transition-colors duration-300 disabled:opacity-50"
                style={{
                  padding: "8px 14px",
                  borderRadius: "2px",
                  background: "rgba(160,64,64,0.06)",
                  border: "1px solid rgba(160,64,64,0.2)",
                  color: "#A04040",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(160,64,64,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(160,64,64,0.06)")}
              >
                <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                {deleteMut.isPending ? "Suppression..." : "Supprimer"}
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="transition-colors duration-300"
                style={{
                  padding: "8px 16px",
                  borderRadius: "2px",
                  border: "1px solid #1E1E1E",
                  background: "transparent",
                  color: "#6B6560",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isBusy}
                style={{
                  padding: "8px 20px",
                  borderRadius: "2px",
                  background: isBusy ? "#8A7535" : "#C9A84C",
                  border: "none",
                  color: "#0A0A0A",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: isBusy ? "not-allowed" : "pointer",
                  transition: "background 300ms ease",
                }}
                onMouseEnter={e => { if (!isBusy) e.currentTarget.style.background = "#D4B45A"; }}
                onMouseLeave={e => { if (!isBusy) e.currentTarget.style.background = "#C9A84C"; }}
              >
                {isBusy ? "Enregistrement..." : task ? "Enregistrer" : "Creer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Vue Semaine ──────────────────────────────────────────────────────────────

function WeekView({ tasks, weekStart, onDayClick, onTaskClick, onMarquerTermine }: {
  tasks: Task[];
  weekStart: Date;
  onDayClick: (d: Date) => void;
  onTaskClick: (t: Task) => void;
  onMarquerTermine?: (t: Task) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="grid grid-cols-7" style={{ gap: "1px", background: "#1E1E1E" }}>
      {days.map((day, i) => {
        const dayTasks = tasks.filter(t => isSameDay(new Date(t.dateDebut), day));
        const isToday = isSameDay(day, today);
        return (
          <div key={i} style={{ minHeight: "140px", background: "#111111" }}>
            {/* En-tête jour */}
            <div
              className="cursor-pointer transition-colors duration-300"
              style={{
                textAlign: "center",
                padding: "10px 4px 8px",
                borderBottom: isToday ? "1px solid #C9A84C" : "1px solid #1E1E1E",
              }}
              onClick={() => onDayClick(day)}
              onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = "#161616"; }}
              onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                fontSize: "10px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#3A3632",
                marginBottom: "2px",
              }}>
                {day.toLocaleDateString("fr-FR", { weekday: "short" })}
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 600,
                color: isToday ? "#C9A84C" : "#F0EDE6",
                lineHeight: 1,
              }}>
                {day.getDate()}
              </div>
            </div>
            {/* Tâches */}
            <div style={{ padding: "4px 3px" }} className="space-y-1">
              {dayTasks.map(t => {
                const mc = MEMBRE_COLORS[t.assigneA];
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-1 cursor-pointer transition-opacity duration-300 hover:opacity-80"
                    style={{
                      background: "#161616",
                      border: `1px solid ${mc.accentBorder}`,
                      borderRadius: "2px",
                      padding: "4px 6px",
                      opacity: t.statut === "termine" ? 0.4 : 1,
                    }}
                    title={`${t.titre} — ${getMembre(t.assigneA).label}`}
                  >
                    <span
                      style={{
                        width: "3px",
                        height: "14px",
                        borderRadius: "1px",
                        background: mc.accent,
                        flexShrink: 0,
                        marginRight: "4px",
                      }}
                    />
                    <span
                      className="truncate flex-1 min-w-0"
                      onClick={() => onTaskClick(t)}
                      style={{
                        fontSize: "11px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        color: t.statut === "termine" ? "#3A3632" : "#F0EDE6",
                        textDecoration: t.statut === "termine" ? "line-through" : "none",
                        lineHeight: 1.3,
                      }}
                    >
                      {!t.touteJournee && (
                        <span style={{ color: "#6B6560", marginRight: "3px" }}>{formatTime(t.dateDebut)}</span>
                      )}
                      {t.titre}
                    </span>
                    {t.statut !== "termine" && onMarquerTermine && (
                      <button
                        onClick={e => { e.stopPropagation(); onMarquerTermine(t); }}
                        className="shrink-0 flex items-center justify-center transition-colors duration-300"
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "2px",
                          border: "1px solid #3A3632",
                          background: "transparent",
                          color: "#3A3632",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4A7A5A"; e.currentTarget.style.color = "#4A7A5A"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#3A3632"; e.currentTarget.style.color = "#3A3632"; }}
                        title="Marquer termine"
                      >
                        <Check className="w-2.5 h-2.5" style={{ strokeWidth: 2 }} />
                      </button>
                    )}
                  </div>
                );
              })}
              {dayTasks.length === 0 && (
                <div
                  className="cursor-pointer transition-colors duration-300"
                  style={{
                    height: "32px",
                    border: "1px dashed #1E1E1E",
                    borderRadius: "2px",
                  }}
                  onClick={() => onDayClick(day)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#3A3632")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Vue Mois ─────────────────────────────────────────────────────────────────

function MonthView({ tasks, currentDate, onDayClick, onTaskClick, onMarquerTermine }: {
  tasks: Task[];
  currentDate: Date;
  onDayClick: (d: Date) => void;
  onTaskClick: (t: Task) => void;
  onMarquerTermine?: (t: Task) => void;
}) {
  const today = new Date();
  const first = startOfMonth(currentDate);
  const last = endOfMonth(currentDate);

  // Remplir le calendrier depuis le lundi de la première semaine
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(startOfWeek(last), 6);
  const days: Date[] = [];
  let d = new Date(gridStart);
  while (d <= gridEnd) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div>
      {/* En-têtes jours */}
      <div className="grid grid-cols-7" style={{ marginBottom: "1px" }}>
        {weekDays.map(wd => (
          <div key={wd} className="label-uppercase" style={{ textAlign: "center", padding: "8px 0" }}>{wd}</div>
        ))}
      </div>
      {/* Grille */}
      <div className="grid grid-cols-7" style={{ gap: "1px", background: "#1E1E1E" }}>
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayTasks = tasks.filter(t => isSameDay(new Date(t.dateDebut), day));
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className="cursor-pointer transition-colors duration-300"
              style={{
                minHeight: "80px",
                padding: "6px",
                background: "#111111",
                borderTop: isToday ? "2px solid #C9A84C" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
              onMouseLeave={e => (e.currentTarget.style.background = "#111111")}
            >
              <div style={{
                fontSize: "12px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                color: isToday ? "#C9A84C" : isCurrentMonth ? "#6B6560" : "#1E1E1E",
                marginBottom: "4px",
              }}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => {
                  const mc = MEMBRE_COLORS[t.assigneA];
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-0.5 cursor-pointer transition-opacity duration-300 hover:opacity-80"
                      style={{
                        background: "#161616",
                        borderRadius: "2px",
                        padding: "2px 4px",
                        borderLeft: `2px solid ${mc.accent}`,
                        opacity: t.statut === "termine" ? 0.4 : 1,
                      }}
                      title={t.titre}
                    >
                      <span
                        className="truncate flex-1 min-w-0"
                        onClick={e => { e.stopPropagation(); onTaskClick(t); }}
                        style={{
                          fontSize: "10px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          color: "#F0EDE6",
                          lineHeight: 1.3,
                        }}
                      >
                        {t.titre}
                      </span>
                      {t.statut !== "termine" && onMarquerTermine && (
                        <button
                          onClick={e => { e.stopPropagation(); onMarquerTermine(t); }}
                          className="shrink-0 flex items-center justify-center transition-colors duration-300"
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "2px",
                            border: "1px solid #3A3632",
                            background: "transparent",
                            color: "#3A3632",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4A7A5A"; e.currentTarget.style.color = "#4A7A5A"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#3A3632"; e.currentTarget.style.color = "#3A3632"; }}
                          title="Marquer termine"
                        >
                          <Check className="w-2 h-2" style={{ strokeWidth: 2 }} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                    +{dayTasks.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

// Mapper user.name vers Membre
function getUserMembre(name: string | null | undefined): Membre | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("maria")) return "Maria";
  if (n.includes("manon")) return "Manon";
  if (n.includes("elodie") || n.includes("élodie")) return "Elodie";
  if (n.includes("hanna")) return "Hanna";
  if (n.includes("marie")) return "Marie";
  return null;
}

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const [vue, setVue] = useState<Vue>("semaine");
  const [currentDate, setCurrentDate] = useState(new Date());
  // Par défaut : admin/direction voient tout, sinon chaque membre ne voit que ses tâches
  const defaultFiltres = useMemo<Set<Membre>>(() => {
    if (!user) return new Set<Membre>(["Maria", "Manon", "Elodie", "Hanna", "Marie"]);
    if (user.role === "admin" || user.role === "direction") return new Set<Membre>(["Maria", "Manon", "Elodie", "Hanna", "Marie"]);
    const membre = getUserMembre(user.name);
    return membre ? new Set<Membre>([membre]) : new Set<Membre>(["Maria", "Manon", "Elodie", "Hanna", "Marie"]);
  }, [user]);
  const [filtresMembres, setFiltresMembres] = useState<Set<Membre>>(new Set<Membre>(["Maria", "Manon", "Elodie", "Hanna", "Marie"]));
  // Synchroniser filtresMembres quand user est chargé
  const filtresSynced = useRef(false);
  useEffect(() => {
    if (user && !filtresSynced.current) {
      filtresSynced.current = true;
      setFiltresMembres(defaultFiltres);
    }
  }, [user, defaultFiltres]);
  const [vueMaria, setVueMaria] = useState<VueMaria>("toutes");
  const [modeMaria, setModeMaria] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultModalDate, setDefaultModalDate] = useState<Date | undefined>(undefined);
  const [showBlockPanel, setShowBlockPanel] = useState(false);
  const [masquerTerminees, setMasquerTerminees] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockHeure, setBlockHeure] = useState("");
  const [blockType, setBlockType] = useState<"welcome_call" | "point_personnalise" | "point_immobilier" | "tous" | "">("" as any);
  const [blockRaison, setBlockRaison] = useState("");

  const utils = trpc.useUtils();
  const { data: blockedSlots = [] } = trpc.calendar.listBlockedSlots.useQuery(undefined, { enabled: !!user });
  const addBlockedSlot = trpc.calendar.addBlockedSlot.useMutation({
    onSuccess: () => { utils.calendar.listBlockedSlots.invalidate(); setBlockDate(""); setBlockHeure(""); setBlockType("" as any); setBlockRaison(""); toast.success("Créneau bloqué !"); },
  });
  const removeBlockedSlot = trpc.calendar.removeBlockedSlot.useMutation({
    onSuccess: () => { utils.calendar.listBlockedSlots.invalidate(); toast.success("Créneau débloqué"); },
  });

  const { data: rawTasks, isLoading } = trpc.calendar.list.useQuery(undefined, { enabled: !!user });
  // Pré-charger les leads CRM pour le modal (évite un chargement à l'ouverture du modal)
  const { data: crmDataPreload } = trpc.crm.list.useQuery(undefined, { enabled: !!user });
  const crmLeadsPreloaded = (crmDataPreload?.items ?? []) as { id: number; nom: string; prenom: string }[];
  const tasks = (rawTasks ?? []) as Task[];

  // Filtrer par membres sélectionnés ou vue Maria dédiée
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (masquerTerminees) result = result.filter(t => t.statut !== "termine");
    if (modeMaria) {
      return result.filter(t => {
        if (t.assigneA !== "Maria") return false;
        if (vueMaria === "welcome_call") return t.titre.toLowerCase().includes("welcome");
        if (vueMaria === "point_personnalise") return t.titre.toLowerCase().includes("point") || t.titre.toLowerCase().includes("personnalis");
        return true; // toutes les tâches de Maria
      });
    }
    return result.filter(t => filtresMembres.has(t.assigneA));
  }, [tasks, filtresMembres, modeMaria, vueMaria, masquerTerminees]);

  // Navigation
  const weekStart = startOfWeek(currentDate);

  function prev() {
    if (vue === "semaine") setCurrentDate(d => addDays(d, -7));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function next() {
    if (vue === "semaine") setCurrentDate(d => addDays(d, 7));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() { setCurrentDate(new Date()); }

  function toggleMembre(m: Membre) {
    setFiltresMembres(prev => {
      const next = new Set(prev);
      if (next.has(m)) { if (next.size > 1) next.delete(m); }
      else next.add(m);
      return next;
    });
  }

  function openNewTask(date?: Date) {
    setSelectedTask(null);
    setDefaultModalDate(date);
    setModalOpen(true);
  }

  function openEditTask(task: Task) {
    setSelectedTask(task);
    setDefaultModalDate(undefined);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedTask(null);
  }

  const marquerTermineMut = trpc.calendar.update.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Tâche marquée terminée"); },
    onError: (e) => toast.error(e.message),
  });

  function handleMarquerTermine(task: Task) {
    marquerTermineMut.mutate({
      id: task.id,
      titre: task.titre,
      assigneA: task.assigneA,
      dateDebut: task.dateDebut,
      touteJournee: task.touteJournee,
      rappelEmail: task.rappelEmail,
      statut: "termine",
    });
  }

  // Titre de navigation
  const navTitle = vue === "semaine"
    ? `${formatDate(weekStart)} — ${formatDate(addDays(weekStart, 6))}`
    : currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
    </div>
  );

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  // Styles reutilisables pour inputs du panneau blocage
  const blockInputStyle: React.CSSProperties = {
    background: "#161616",
    border: "1px solid #1E1E1E",
    borderRadius: "2px",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: "#F0EDE6",
    outline: "none",
    transition: "border-color 300ms ease",
  };

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <AdminNav />

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" style={{ marginBottom: "32px" }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              lineHeight: 1,
            }}>
              Calendrier
            </h1>
            <p style={{
              fontSize: "13px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: "#3A3632",
              marginTop: "6px",
            }}>
              Taches et rappels — Team Delivery
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlockPanel(v => !v)}
              className="flex items-center gap-2 transition-colors duration-300"
              style={{
                padding: "8px 16px",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: `1px solid ${showBlockPanel ? "rgba(160,64,64,0.3)" : "#1E1E1E"}`,
                background: showBlockPanel ? "rgba(160,64,64,0.06)" : "transparent",
                color: showBlockPanel ? "#A04040" : "#6B6560",
              }}
              onMouseEnter={e => { if (!showBlockPanel) { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#F0EDE6"; } }}
              onMouseLeave={e => { if (!showBlockPanel) { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; } }}
            >
              <Ban className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
              Bloquer creneau
            </button>
            <button
              onClick={() => openNewTask()}
              className="flex items-center gap-2"
              style={{
                padding: "8px 20px",
                borderRadius: "2px",
                background: "#C9A84C",
                border: "none",
                color: "#0A0A0A",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 300ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#D4B45A")}
              onMouseLeave={e => (e.currentTarget.style.background = "#C9A84C")}
            >
              <Plus className="w-3.5 h-3.5" style={{ strokeWidth: 2 }} />
              Nouvelle tache
            </button>
          </div>
        </div>

        {/* Filtres membres + Vue Maria */}
        <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: "16px" }}>
          {MEMBRES.map(m => {
            const mc = MEMBRE_COLORS[m.key];
            const isActive = !modeMaria && filtresMembres.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => { setModeMaria(false); toggleMembre(m.key); }}
                className="flex items-center gap-1.5 transition-colors duration-300"
                style={{
                  padding: "5px 12px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  border: `1px solid ${isActive ? mc.accentBorder : "#1E1E1E"}`,
                  background: isActive ? mc.accentBg : "transparent",
                  color: isActive ? mc.accent : "#3A3632",
                }}
              >
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "1px",
                  background: isActive ? mc.accent : "#3A3632",
                  flexShrink: 0,
                }} />
                {m.label}
              </button>
            );
          })}
          {/* Séparateur + bouton Vue Maria */}
          <div style={{ width: "1px", height: "20px", background: "#1E1E1E", margin: "0 4px" }} />
          <button
            onClick={() => { setModeMaria(v => !v); setVueMaria("toutes"); }}
            className="flex items-center gap-1.5 transition-colors duration-300"
            style={{
              padding: "5px 12px",
              borderRadius: "2px",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              border: `1px solid ${modeMaria ? MEMBRE_COLORS.Maria.accentBorder : "#1E1E1E"}`,
              background: modeMaria ? MEMBRE_COLORS.Maria.accentBg : "transparent",
              color: modeMaria ? MEMBRE_COLORS.Maria.accent : "#3A3632",
            }}
          >
            Vue Maria
          </button>
          {/* Bouton masquer terminées */}
          <div style={{ width: "1px", height: "20px", background: "#1E1E1E", margin: "0 4px" }} />
          <button
            onClick={() => setMasquerTerminees(v => !v)}
            className="flex items-center gap-1.5 transition-colors duration-300"
            style={{
              padding: "5px 12px",
              borderRadius: "2px",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              border: `1px solid ${masquerTerminees ? "rgba(240,237,230,0.15)" : "#1E1E1E"}`,
              background: masquerTerminees ? "rgba(240,237,230,0.06)" : "transparent",
              color: masquerTerminees ? "#F0EDE6" : "#3A3632",
            }}
          >
            {masquerTerminees ? (
              <><Eye className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Afficher toutes</>
            ) : (
              <><EyeOff className="w-3 h-3" style={{ strokeWidth: 1.5 }} /> Masquer terminees</>
            )}
          </button>
        </div>

        {/* Sous-filtres Vue Maria */}
        {modeMaria && (
          <div className="flex items-center gap-2" style={{ marginBottom: "20px", paddingLeft: "4px" }}>
            <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginRight: "4px" }}>Filtrer :</span>
            {([
              { key: "toutes" as VueMaria, label: "Tous les RDV" },
              { key: "welcome_call" as VueMaria, label: "Welcome Call" },
              { key: "point_personnalise" as VueMaria, label: "Point Personnalise" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setVueMaria(key)}
                className="transition-colors duration-300"
                style={{
                  padding: "5px 12px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  border: `1px solid ${vueMaria === key ? MEMBRE_COLORS.Maria.accentBorder : "#1E1E1E"}`,
                  background: vueMaria === key ? MEMBRE_COLORS.Maria.accentBg : "transparent",
                  color: vueMaria === key ? MEMBRE_COLORS.Maria.accent : "#3A3632",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Panneau de blocage de créneaux */}
        {showBlockPanel && (
          <div style={{
            marginBottom: "16px",
            padding: "20px",
            borderRadius: "2px",
            border: "1px solid rgba(160,64,64,0.2)",
            background: "rgba(160,64,64,0.04)",
          }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "16px",
              fontWeight: 600,
              color: "#A04040",
              letterSpacing: "0.02em",
              marginBottom: "16px",
            }}>
              Bloquer un creneau
            </p>
            <div className="flex flex-wrap gap-3" style={{ marginBottom: "16px" }}>
              <div className="flex flex-col gap-1">
                <p className="label-uppercase">Date</p>
                <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)}
                  style={blockInputStyle}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="label-uppercase">Heure (optionnel)</p>
                <input type="time" value={blockHeure} onChange={e => setBlockHeure(e.target.value)}
                  style={blockInputStyle}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="label-uppercase">Type de RDV</p>
                <select value={blockType} onChange={e => setBlockType(e.target.value as any)}
                  style={blockInputStyle}>
                  <option value="">Tous les types</option>
                  <option value="welcome_call">Welcome Call (Maria)</option>
                  <option value="point_personnalise">Point Personnalise (Maria)</option>
                  <option value="point_immobilier">Point Immobilier (Elodie)</option>
                  <option value="tous">Tous les types</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <p className="label-uppercase">Raison (optionnel)</p>
                <input type="text" placeholder="Ex: Conge, Reunion..." value={blockRaison} onChange={e => setBlockRaison(e.target.value)}
                  style={{ ...blockInputStyle, width: "192px" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <button
                  onClick={() => { if (!blockDate) { toast.error("Veuillez sélectionner une date"); return; } addBlockedSlot.mutate({ date: blockDate, heure: blockHeure || undefined, typeRdv: (blockType || undefined) as any, raison: blockRaison || undefined }); }}
                  disabled={addBlockedSlot.isPending}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "2px",
                    background: addBlockedSlot.isPending ? "#7A3030" : "#A04040",
                    border: "none",
                    color: "#F0EDE6",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: addBlockedSlot.isPending ? "not-allowed" : "pointer",
                    transition: "background 300ms ease",
                  }}
                  onMouseEnter={e => { if (!addBlockedSlot.isPending) e.currentTarget.style.background = "#B04848"; }}
                  onMouseLeave={e => { if (!addBlockedSlot.isPending) e.currentTarget.style.background = "#A04040"; }}
                >
                  {addBlockedSlot.isPending ? "..." : "Bloquer"}
                </button>
              </div>
            </div>
            {/* Liste des créneaux bloqués */}
            {blockedSlots.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <p className="label-uppercase" style={{ marginBottom: "8px" }}>Creneaux bloques</p>
                <div className="flex flex-col gap-1.5">
                  {(blockedSlots as any[]).map((slot: any) => (
                    <div key={slot.id} className="flex items-center justify-between" style={{
                      background: "#161616",
                      borderRadius: "2px",
                      padding: "8px 12px",
                      border: "1px solid #1E1E1E",
                    }}>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{slot.date}</span>
                        {slot.heure && <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#C9A84C" }}>{slot.heure}</span>}
                        {slot.typeRdv && (
                          <span style={{
                            fontSize: "10px",
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            fontWeight: 500,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: "#6B6560",
                            background: "rgba(240,237,230,0.04)",
                            border: "1px solid #1E1E1E",
                            borderRadius: "2px",
                            padding: "2px 8px",
                          }}>
                            {slot.typeRdv === "welcome_call" ? "Welcome Call" : slot.typeRdv === "point_personnalise" ? "Point Personnalise" : slot.typeRdv === "point_immobilier" ? "Point Immobilier" : "Tous"}
                          </span>
                        )}
                        {slot.raison && <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", fontStyle: "italic" }}>{slot.raison}</span>}
                      </div>
                      <button
                        onClick={() => removeBlockedSlot.mutate({ id: slot.id })}
                        className="transition-colors duration-300"
                        style={{
                          fontSize: "11px",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          color: "#A04040",
                          background: "transparent",
                          border: "none",
                          padding: "4px 8px",
                          cursor: "pointer",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#C04848")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#A04040")}
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barre de navigation */}
        <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
          <div className="flex items-center gap-2">
            <button onClick={prev}
              className="transition-colors duration-300"
              style={{ padding: "8px", borderRadius: "2px", border: "1px solid #1E1E1E", background: "transparent", color: "#6B6560", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#F0EDE6"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
            >
              <ChevronLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            </button>
            <button onClick={next}
              className="transition-colors duration-300"
              style={{ padding: "8px", borderRadius: "2px", border: "1px solid #1E1E1E", background: "transparent", color: "#6B6560", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#F0EDE6"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
            >
              <ChevronRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            </button>
            <button onClick={goToday}
              className="transition-colors duration-300"
              style={{
                padding: "6px 14px",
                borderRadius: "2px",
                border: "1px solid #1E1E1E",
                background: "transparent",
                color: "#6B6560",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#F0EDE6"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#6B6560"; }}
            >
              Aujourd'hui
            </button>
            <span style={{
              fontSize: "14px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              color: "#6B6560",
              marginLeft: "8px",
              textTransform: "capitalize",
            }}>
              {navTitle}
            </span>
          </div>
          {/* Toggle vue */}
          <div className="flex" style={{ border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
            {(["semaine", "mois"] as Vue[]).map(v => (
              <button
                key={v}
                onClick={() => setVue(v)}
                className="transition-colors duration-300"
                style={{
                  padding: "6px 16px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  border: "none",
                  background: vue === v ? "#C9A84C" : "transparent",
                  color: vue === v ? "#0A0A0A" : "#3A3632",
                }}
                onMouseEnter={e => { if (vue !== v) e.currentTarget.style.color = "#F0EDE6"; }}
                onMouseLeave={e => { if (vue !== v) e.currentTarget.style.color = "#3A3632"; }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendrier */}
        <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "16px", overflow: "hidden" }}>
          {isLoading ? (
            <div className="flex items-center justify-center" style={{ height: "200px" }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
            </div>
          ) : vue === "semaine" ? (
            <WeekView
              tasks={filteredTasks}
              weekStart={weekStart}
              onDayClick={openNewTask}
              onTaskClick={openEditTask}
              onMarquerTermine={handleMarquerTermine}
            />
          ) : (
            <MonthView
              tasks={filteredTasks}
              currentDate={currentDate}
              onDayClick={openNewTask}
              onTaskClick={openEditTask}
              onMarquerTermine={handleMarquerTermine}
            />
          )}
        </div>

        {/* Légende */}
        <div className="flex flex-wrap gap-5" style={{ marginTop: "16px" }}>
          {MEMBRES.map(m => {
            const mc = MEMBRE_COLORS[m.key];
            return (
              <div key={m.key} className="flex items-center gap-1.5">
                <span style={{ width: "10px", height: "3px", borderRadius: "1px", background: mc.accent }} />
                <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <TaskModal
          task={selectedTask}
          defaultDate={defaultModalDate}
          onClose={closeModal}
          onSaved={closeModal}
          crmLeadsList={crmLeadsPreloaded.length > 0 ? crmLeadsPreloaded : undefined}
        />
      )}
    </div>
  );
}

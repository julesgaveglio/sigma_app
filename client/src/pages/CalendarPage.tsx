import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

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
        return `⚠️ Maria n'est pas disponible le ${JOURS_FR[dow]} pour ce type de RDV (${DISPO_MARIA[type].label})`;
      }
      if (!type && ![1, 3, 4].includes(dow)) {
        return `⚠️ Maria travaille Lun, Mer, Jeu uniquement`;
      }
    }
    if (assigneA === "Elodie" && dow === 0) {
      return `⚠️ Élodie n'est pas disponible le dimanche`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">{task ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Titre *</label>
            <input
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Ex. Welcome Call — Sophie Martin"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400/50"
            />
          </div>
          {/* Assigné à */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Assignée à</label>
            <div className="flex gap-2 flex-wrap">
              {MEMBRES.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setAssigneA(m.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    assigneA === m.key
                      ? `${m.bg} text-white border-transparent`
                      : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Début *</label>
              <input
                type="datetime-local"
                value={dateDebut}
                onChange={e => setDateDebut(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Fin (optionnel)</label>
              <input
                type="datetime-local"
                value={dateFin}
                onChange={e => setDateFin(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>
          {/* Avertissement hors disponibilités */}
          {dispoWarning && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs">
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <span>{dispoWarning.replace('⚠️ ', '')}</span>
            </div>
          )}
          {/* Toute la journée */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={touteJournee} onChange={e => setTouteJournee(e.target.checked)} className="accent-amber-400" />
            <span className="text-sm text-white/70">Toute la journée</span>
          </label>
          {/* Lead CRM lié */}
          <div>
            <label className="block text-xs text-white/50 mb-1">
              Lead CRM associé (optionnel)
              {crmLoading && <span className="ml-2 text-amber-400/60">chargement...</span>}
              {crmError && <span className="ml-2 text-red-400/80 text-xs">(erreur de chargement)</span>}
              {!crmLoading && !crmError && crmLeads.length > 0 && <span className="ml-2 text-white/30">{crmLeads.length} leads</span>}
            </label>
            <select
              value={crmLeadId}
              onChange={e => setCrmLeadId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400/50"
            >
              <option value="">{crmLoading ? "Chargement..." : "— Aucun —"}</option>
              {crmLeads.map(l => (
                <option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>
              ))}
            </select>
          </div>
          {/* Description */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Notes (optionnel)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Détails, contexte..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400/50 resize-none"
            />
          </div>
          {/* Rappel */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rappelEmail} onChange={e => setRappelEmail(e.target.checked)} className="accent-amber-400" />
              <span className="text-sm text-white/70">Rappel par email</span>
            </label>
            {rappelEmail && (
              <select
                value={rappelMinutes}
                onChange={e => setRappelMinutes(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
              >
                {RAPPELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
          </div>
          {/* Statut */}
          {task && (
            <div>
              <label className="block text-xs text-white/50 mb-1">Statut</label>
              <select
                value={statut}
                onChange={e => setStatut(e.target.value as Statut)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400/50"
              >
                <option value="a_faire">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          )}
          {/* Historique des statuts */}
          {task && history && history.length > 0 && (
            <div className="border-t border-white/8 pt-3">
              <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">Historique</p>
              <div className="space-y-1">
                {history.map((h) => {
                  const label = h.statut === "a_faire" ? "🟡 À faire" : h.statut === "en_cours" ? "🔵 En cours" : "✅ Terminé";
                  const date = new Date(h.changedAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
                  return (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{label}</span>
                      <span className="text-white/40">{h.changedBy} — {date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Pièces jointes — uniquement en mode édition */}
          {task && (
            <div className="border-t border-white/8 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wide">Pièces jointes</p>
                <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  uploadingFile ? "bg-white/5 text-white/30" : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                }`}>
                  {uploadingFile ? "⏳ Envoi..." : "+ Ajouter"}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} disabled={uploadingFile} />
                </label>
              </div>
              {attachments && attachments.length > 0 ? (
                <div className="space-y-1.5">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/8">
                      <span className="text-base">{att.mime_type.includes("pdf") ? "📄" : att.mime_type.includes("image") ? "🖼️" : "📎"}</span>
                      <div className="flex-1 min-w-0">
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:text-amber-300 truncate block">
                          {att.file_name}
                        </a>
                        <span className="text-xs text-white/30">{formatFileSize(att.file_size)} • {att.uploaded_by}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Supprimer "${att.file_name}" ?`)) deleteAttMut.mutate({ attachmentId: att.id }); }}
                        className="text-white/20 hover:text-red-400 text-sm transition-colors flex-shrink-0"
                        title="Supprimer"
                      >×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/25 italic">Aucun fichier joint — devis, mandat, relevé...</p>
              )}
            </div>
          )}
          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/8 mt-2">
            {task ? (
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={() => { if (confirm(`Supprimer "${task.titre}" ?`)) deleteMut.mutate({ id: task.id }); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleteMut.isPending ? "⏳ Suppression..." : "🗑 Supprimer"}
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10">
                Annuler
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm disabled:opacity-50"
              >
                {isBusy ? "⏳ Enregistrement..." : task ? "✓ Enregistrer" : "Créer"}
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
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, i) => {
        const dayTasks = tasks.filter(t => isSameDay(new Date(t.dateDebut), day));
        const isToday = isSameDay(day, today);
        return (
          <div key={i} className="min-h-[120px]">
            {/* En-tête jour */}
            <div
              className={`text-center py-2 rounded-t-lg cursor-pointer mb-1 ${
                isToday ? "bg-amber-500/20 border border-amber-500/40" : "bg-white/3 hover:bg-white/5"
              }`}
              onClick={() => onDayClick(day)}
            >
              <div className="text-xs text-white/40 uppercase">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
              <div className={`text-lg font-semibold ${isToday ? "text-amber-400" : "text-white"}`}>
                {day.getDate()}
              </div>
            </div>
            {/* Tâches */}
            <div className="space-y-1 px-0.5">
              {dayTasks.map(t => {
                const m = getMembre(t.assigneA);
                return (
                  <div
                    key={t.id}
                    className={`${m.bg} text-white text-xs rounded px-1 py-1 cursor-pointer hover:opacity-80 flex items-center gap-1 ${
                      t.statut === "termine" ? "opacity-40 line-through" : ""
                    }`}
                    title={`${t.titre} — ${m.label}`}
                  >
                    <span className="truncate flex-1 min-w-0" onClick={() => onTaskClick(t)}>
                      {!t.touteJournee && <span className="opacity-70">{formatTime(t.dateDebut)} </span>}
                      {t.titre}
                    </span>
                    {t.statut !== "termine" && onMarquerTermine && (
                      <button
                        onClick={e => { e.stopPropagation(); onMarquerTermine(t); }}
                        className="shrink-0 w-4 h-4 rounded-full border border-white/50 hover:bg-white/30 flex items-center justify-center transition-colors"
                        title="Marquer terminé"
                      >
                        <span className="text-[9px] leading-none">✓</span>
                      </button>
                    )}
                  </div>
                );
              })}
              {dayTasks.length === 0 && (
                <div
                  className="h-8 rounded border border-dashed border-white/5 cursor-pointer hover:border-white/20 transition-colors"
                  onClick={() => onDayClick(day)}
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
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map(wd => (
          <div key={wd} className="text-center text-xs text-white/30 py-1">{wd}</div>
        ))}
      </div>
      {/* Grille */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayTasks = tasks.filter(t => isSameDay(new Date(t.dateDebut), day));
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[80px] p-1 rounded cursor-pointer transition-colors ${
                isCurrentMonth ? "bg-white/3 hover:bg-white/6" : "bg-white/1 hover:bg-white/3"
              } ${isToday ? "ring-1 ring-amber-400/50" : ""}`}
            >
              <div className={`text-xs mb-1 font-medium ${
                isToday ? "text-amber-400" : isCurrentMonth ? "text-white/70" : "text-white/20"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => {
                  const m = getMembre(t.assigneA);
                  return (
                    <div
                      key={t.id}
                      className={`${m.dot} rounded text-white text-[10px] px-1 py-0.5 cursor-pointer hover:opacity-80 flex items-center gap-0.5 ${
                        t.statut === "termine" ? "opacity-40" : ""
                      }`}
                      title={t.titre}
                    >
                      <span className="truncate flex-1 min-w-0" onClick={e => { e.stopPropagation(); onTaskClick(t); }}>
                        {t.titre}
                      </span>
                      {t.statut !== "termine" && onMarquerTermine && (
                        <button
                          onClick={e => { e.stopPropagation(); onMarquerTermine(t); }}
                          className="shrink-0 w-3 h-3 rounded-full border border-white/50 hover:bg-white/30 flex items-center justify-center transition-colors"
                          title="Marquer terminé"
                        >
                          <span className="text-[7px] leading-none">✓</span>
                        </button>
                      )}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-white/40">+{dayTasks.length - 3} autres</div>
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
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Tâche marquée terminée ✓"); },
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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Calendrier</h1>
            <p className="text-white/40 text-sm mt-0.5">Tâches et rappels — Team Delivery</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlockPanel(v => !v)}
              className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-lg text-sm transition-colors border ${
                showBlockPanel
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
              }`}
            >
              🚫 Bloquer créneau
            </button>
            <button
              onClick={() => openNewTask()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Nouvelle tâche
            </button>
          </div>
        </div>

        {/* Filtres membres + Vue Maria */}
        <div className="flex flex-wrap gap-2 mb-4">
          {MEMBRES.map(m => (
            <button
              key={m.key}
              onClick={() => { setModeMaria(false); toggleMembre(m.key); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                !modeMaria && filtresMembres.has(m.key)
                  ? `${m.bg} text-white border-transparent`
                  : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!modeMaria && filtresMembres.has(m.key) ? "bg-white" : m.dot}`} />
              {m.label}
            </button>
          ))}
          {/* Séparateur + bouton Vue Maria */}
          <div className="w-px bg-white/10 mx-1" />
          <button
            onClick={() => { setModeMaria(v => !v); setVueMaria("toutes"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              modeMaria
                ? "bg-pink-500 text-white border-transparent"
                : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-pink-400" />
            Vue Maria
          </button>
          {/* Bouton masquer terminées */}
          <div className="w-px bg-white/10 mx-1" />
          <button
            onClick={() => setMasquerTerminees(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              masquerTerminees
                ? "bg-white/20 text-white border-white/30"
                : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
            }`}
          >
            {masquerTerminees ? "👁 Afficher toutes" : "✅ Masquer terminées"}
          </button>
        </div>

        {/* Sous-filtres Vue Maria */}
        {modeMaria && (
          <div className="flex gap-2 mb-5 pl-1">
            <span className="text-xs text-white/40 self-center mr-1">Filtrer :</span>
            {([
              { key: "toutes" as VueMaria, label: "Tous les RDV", icon: "📌" },
              { key: "welcome_call" as VueMaria, label: "Welcome Call", icon: "👋" },
              { key: "point_personnalise" as VueMaria, label: "Point Personnalisé", icon: "🎯" },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setVueMaria(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  vueMaria === key
                    ? "bg-pink-500/30 text-pink-300 border-pink-500/40"
                    : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {/* Panneau de blocage de créneaux */}
        {showBlockPanel && (
          <div className="mb-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <h3 className="text-sm font-semibold text-red-300 mb-3">Bloquer un créneau</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/40">Date</label>
                <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/40">Heure (optionnel)</label>
                <input type="time" value={blockHeure} onChange={e => setBlockHeure(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/40">Type de RDV</label>
                <select value={blockType} onChange={e => setBlockType(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50">
                  <option value="">Tous les types</option>
                  <option value="welcome_call">Welcome Call (Maria)</option>
                  <option value="point_personnalise">Point Personnalisé (Maria)</option>
                  <option value="point_immobilier">Point Immobilier (Élodie)</option>
                  <option value="tous">Tous les types</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/40">Raison (optionnel)</label>
                <input type="text" placeholder="Ex: Congé, Réunion..." value={blockRaison} onChange={e => setBlockRaison(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50 w-48" />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <button
                  onClick={() => { if (!blockDate) { toast.error("Veuillez sélectionner une date"); return; } addBlockedSlot.mutate({ date: blockDate, heure: blockHeure || undefined, typeRdv: (blockType || undefined) as any, raison: blockRaison || undefined }); }}
                  disabled={addBlockedSlot.isPending}
                  className="bg-red-500 hover:bg-red-400 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {addBlockedSlot.isPending ? "..." : "Bloquer"}
                </button>
              </div>
            </div>
            {/* Liste des créneaux bloqués */}
            {blockedSlots.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-white/40 mb-2">Créneaux bloqués :</p>
                <div className="flex flex-col gap-1.5">
                  {(blockedSlots as any[]).map((slot: any) => (
                    <div key={slot.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white font-medium">{slot.date}</span>
                        {slot.heure && <span className="text-xs text-amber-400">{slot.heure}</span>}
                        {slot.typeRdv && <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{slot.typeRdv === "welcome_call" ? "Welcome Call" : slot.typeRdv === "point_personnalise" ? "Point Personnalisé" : slot.typeRdv === "point_immobilier" ? "Point Immobilier" : "Tous"}</span>}
                        {slot.raison && <span className="text-xs text-white/40 italic">{slot.raison}</span>}
                      </div>
                      <button
                        onClick={() => removeBlockedSlot.mutate({ id: slot.id })}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              ‹
            </button>
            <button onClick={next} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              ›
            </button>
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors">
              Aujourd'hui
            </button>
            <span className="text-white/70 text-sm font-medium ml-2 capitalize">{navTitle}</span>
          </div>
          {/* Toggle vue */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(["semaine", "mois"] as Vue[]).map(v => (
              <button
                key={v}
                onClick={() => setVue(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  vue === v ? "bg-amber-500 text-black" : "text-white/50 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendrier */}
        <div className="bg-[#111] border border-white/8 rounded-xl p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
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
        <div className="flex flex-wrap gap-4 mt-4">
          {MEMBRES.map(m => (
            <div key={m.key} className="flex items-center gap-1.5 text-xs text-white/40">
              <span className={`w-3 h-3 rounded ${m.bg}`} />
              {m.label}
            </div>
          ))}
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

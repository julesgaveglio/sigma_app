import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Loader2, Search, X, ChevronRight, Download, RefreshCw,
  Phone, Mail, Clock, AlertTriangle, CheckCircle2,
  MessageSquare, User, Calendar, Paperclip, Upload,
  FileText, Image, File, Trash2, ExternalLink
} from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { AssigneeSelect } from "@/components/AssigneeSelect";

const LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/sigma-logo-full_c217e268.png";

// ─── Configs ─────────────────────────────────────────────────────────────────

const STATUTS = [
  { value: "toutes", label: "Toutes", color: "text-zinc-300", dot: "bg-zinc-400" },
  { value: "nouvelle", label: "Nouvelle", color: "text-blue-400", dot: "bg-blue-400" },
  { value: "en_cours", label: "En cours", color: "text-yellow-400", dot: "bg-yellow-400" },
  { value: "en_attente_retour", label: "En attente retour", color: "text-orange-400", dot: "bg-orange-400" },
  { value: "standby", label: "Standby", color: "text-purple-400", dot: "bg-purple-400" },
  { value: "effectuee", label: "Effectuée", color: "text-green-400", dot: "bg-green-400" },
  { value: "annulee", label: "Annulée", color: "text-red-400", dot: "bg-red-400" },
];

const PRIORITES_CONFIG = [
  { value: "hyper_urgent", label: "Hyper Urgent", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", dot: "bg-red-500" },
  { value: "tres_urgent", label: "Très Urgent", color: "text-orange-400", bg: "bg-orange-400/15 border-orange-400/30", dot: "bg-orange-400" },
  { value: "urgent", label: "Urgent", color: "text-yellow-400", bg: "bg-yellow-400/15 border-yellow-400/30", dot: "bg-yellow-400" },
  { value: "normal", label: "Normal", color: "text-green-400", bg: "bg-green-400/15 border-green-400/30", dot: "bg-green-400" },
  { value: "faible", label: "Faible", color: "text-zinc-400", bg: "bg-zinc-400/10 border-zinc-400/20", dot: "bg-zinc-400" },
];

function getPriorite(value: string) {
  return PRIORITES_CONFIG.find(p => p.value === value) ?? PRIORITES_CONFIG[3];
}

function getStatut(value: string) {
  return STATUTS.find(s => s.value === value) ?? STATUTS[1];
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />;
  return <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Documents Section ────────────────────────────────────────────────────────

function DocumentsSection({ demandeId, demandeNom }: { demandeId: number; demandeNom: string }) {
  const utils = trpc.useUtils();
  const { data: docs, isLoading } = trpc.demandes.listDocuments.useQuery({ demandeId });
  const uploadMutation = trpc.demandes.uploadDocument.useMutation({
    onSuccess: () => {
      utils.demandes.listDocuments.invalidate({ demandeId });
      toast.success("Document envoyé avec succès");
      setUploadFiles([]);
      setUploading(false);
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });
  const deleteMutation = trpc.demandes.deleteDocument.useMutation({
    onSuccess: () => {
      utils.demandes.listDocuments.invalidate({ demandeId });
      toast.success("Document supprimé");
    },
    onError: (e) => toast.error(e.message),
  });

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileAdd = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} dépasse 10 Mo`); continue; }
      if (!ACCEPTED_TYPES.includes(file.type)) { toast.error(`${file.name} : format non supporté`); continue; }
      newFiles.push(file);
    }
    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleSendDocs = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: uploadFiles.length });
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      try {
        const base64 = await fileToBase64(file);
        await uploadMutation.mutateAsync({
          demandeId,
          fileBase64: base64,
          nom: file.name,
          mimeType: file.type,
          taille: file.size,
          envoyePar: "hanna",
        });
        setUploadProgress({ done: i + 1, total: uploadFiles.length });
      } catch (e) {
        toast.error(`Erreur pour ${file.name}`);
      }
    }
    setUploading(false);
  };

  const leadDocs = docs?.filter(d => d.envoyePar === "lead") ?? [];
  const hannaDocs = docs?.filter(d => d.envoyePar === "hanna") ?? [];

  return (
    <div className="border-t border-zinc-800 pt-5 space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-[#C9A84C]" />
        <span className="text-[#C9A84C] text-xs font-semibold uppercase tracking-widest">Documents</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-[#C9A84C]" />
        </div>
      ) : (
        <>
          {/* Documents reçus du lead */}
          <div>
            <div className="text-zinc-500 text-xs font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Documents reçus du lead ({leadDocs.length})
            </div>
            {leadDocs.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">Aucun document joint par le lead</p>
            ) : (
              <div className="space-y-2">
                {leadDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-3 py-2.5 border border-zinc-800">
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-xs truncate font-medium">{doc.nom}</p>
                      <p className="text-zinc-500 text-xs">{formatFileSize(doc.taille)} · {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#C9A84C] hover:text-[#F0D080] flex-shrink-0"
                      title="Ouvrir"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer "${doc.nom}" ?`)) deleteMutation.mutate({ documentId: doc.id });
                      }}
                      className="text-zinc-600 hover:text-red-400 flex-shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents envoyés par Hanna */}
          <div>
            <div className="text-zinc-500 text-xs font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C9A84C] inline-block" />
              Documents envoyés par Hanna ({hannaDocs.length})
            </div>
            {hannaDocs.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">Aucun document envoyé</p>
            ) : (
              <div className="space-y-2">
                {hannaDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-3 py-2.5 border border-[#C9A84C]/20">
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-xs truncate font-medium">{doc.nom}</p>
                      <p className="text-zinc-500 text-xs">{formatFileSize(doc.taille)} · {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#C9A84C] hover:text-[#F0D080] flex-shrink-0"
                      title="Ouvrir"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer "${doc.nom}" ?`)) deleteMutation.mutate({ documentId: doc.id });
                      }}
                      className="text-zinc-600 hover:text-red-400 flex-shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone d'envoi de documents par Hanna */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#C9A84C]/10 space-y-3">
            <div className="text-zinc-300 text-xs font-semibold flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-[#C9A84C]" />
              Envoyer un document à {demandeNom}
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all"
            >
              <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-1" />
              <p className="text-zinc-500 text-xs">Cliquez ou glissez un fichier</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(e) => handleFileAdd(e.target.files)}
              />
            </div>

            {/* Fichiers sélectionnés */}
            {uploadFiles.length > 0 && (
              <div className="space-y-1.5">
                {uploadFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#111] rounded-lg px-3 py-2 border border-zinc-800">
                    {getFileIcon(file.type)}
                    <span className="flex-1 text-zinc-300 text-xs truncate">{file.name}</span>
                    <span className="text-zinc-500 text-xs flex-shrink-0">{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-zinc-600 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progression */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A84C]" />
                  Envoi en cours... ({uploadProgress.done}/{uploadProgress.total})
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${uploadProgress.total > 0 ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%`,
                      background: "linear-gradient(90deg, #C9A84C, #F0D080)",
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSendDocs}
              disabled={uploadFiles.length === 0 || uploading}
              className="w-full py-2.5 rounded-lg font-semibold text-black text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)" }}
            >
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" /> Envoyer {uploadFiles.length > 0 ? `${uploadFiles.length} fichier${uploadFiles.length > 1 ? "s" : ""}` : "les fichiers"}</>
              )}
            </button>
            <p className="text-zinc-600 text-xs text-center">
              Un email sera automatiquement envoyé à {demandeNom}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: demande, isLoading } = trpc.demandes.byId.useQuery({ id });
  const [statut, setStatut] = useState("");
  const [notes, setNotes] = useState("");
  const [assigne, setAssigne] = useState("");
  const [saving, setSaving] = useState(false);

  const updateMutation = trpc.demandes.updateStatut.useMutation({
    onSuccess: () => {
      toast.success("Demande mise à jour");
      utils.demandes.list.invalidate();
      utils.demandes.byId.invalidate({ id });
      setSaving(false);
    },
    onError: (e) => { toast.error(e.message); setSaving(false); },
  });

  // Init form when data loads
  if (demande && !statut) {
    setStatut(demande.statut);
    setNotes(demande.notesInternes ?? "");
    setAssigne(demande.assigneA ?? "");
  }

  const handleSave = () => {
    setSaving(true);
    updateMutation.mutate({ id, statut, notesInternes: notes, assigneA: assigne });
  };

  const prioriteInfo = getPriorite(demande?.priorite ?? "normal");

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-lg bg-[#0f0f0f] border-l border-[#C9A84C]/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-bold text-lg">Détail de la demande</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
          </div>
        ) : demande ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Priorité badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${prioriteInfo.bg} ${prioriteInfo.color}`}>
              <span className={`w-2 h-2 rounded-full ${prioriteInfo.dot}`} />
              {prioriteInfo.label}
            </div>

            {/* Lead info */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <User className="w-4 h-4 text-[#C9A84C]" />
                {demande.prenom} {demande.nom}
              </div>
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${demande.telephone}`} className="hover:text-[#C9A84C]">{demande.telephone}</a>
              </div>
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${demande.email}`} className="hover:text-[#C9A84C]">{demande.email}</a>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(demande.createdAt)}
              </div>
              {demande.createdBy && (
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  <User className="w-3.5 h-3.5" />
                  Créé par : {demande.createdBy}
                </div>
              )}
            </div>

            {/* Sujet & demande */}
            <div className="space-y-2">
              <div className="text-[#C9A84C] text-xs font-semibold uppercase tracking-widest">Sujet</div>
              <div className="text-white font-medium">{demande.sujet}</div>
            </div>
            <div className="space-y-2">
              <div className="text-[#C9A84C] text-xs font-semibold uppercase tracking-widest">Description</div>
              <div className="text-zinc-300 text-sm leading-relaxed bg-[#1a1a1a] rounded-xl p-4 whitespace-pre-wrap">{demande.demande}</div>
            </div>

            {/* ─── SECTION DOCUMENTS ─── */}
            <DocumentsSection
              demandeId={id}
              demandeNom={`${demande.prenom} ${demande.nom}`}
            />

            {/* Gestion */}
            <div className="border-t border-zinc-800 pt-5 space-y-4">
              <div className="text-[#C9A84C] text-xs font-semibold uppercase tracking-widest">Gestion Hanna</div>

              {/* Statut */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1.5">Statut</label>
                <select
                  value={statut}
                  onChange={e => setStatut(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]"
                >
                  {STATUTS.filter(s => s.value !== "toutes").map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Assigné à */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1.5">Assigné à</label>
                <AssigneeSelect
                  mode="team"
                  value={assigne}
                  onChange={(val) => setAssigne(val)}
                  placeholder="— Sélectionner un membre —"
                  className="w-full"
                />
              </div>

              {/* Notes internes */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1.5">Notes internes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Ajouter une note interne..."
                  className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-lg font-semibold text-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)" }}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</> : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">Demande introuvable</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function CustomCareDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("toutes");
  const [prioriteFilter, setPrioriteFilter] = useState("toutes");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  const deleteMutation = trpc.demandes.delete.useMutation({
    onSuccess: () => refetch(),
  });
  const handleDelete = (e: React.MouseEvent, id: number, nom: string) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer la demande de ${nom} ? Cette action est irréversible.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const { data, isLoading, refetch } = trpc.demandes.list.useQuery({
    search: search || undefined,
    statut: statutFilter !== "toutes" ? statutFilter : undefined,
    priorite: prioriteFilter !== "toutes" ? prioriteFilter : undefined,
    limit: LIMIT,
    offset: page * LIMIT,
  }, { enabled: isAuthenticated });

  const exportQuery = trpc.demandes.exportCsv.useQuery(undefined, { enabled: false });

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const rows = result.data;
    const headers = ["ID", "Nom", "Prénom", "Téléphone", "Email", "Sujet", "Priorité", "Statut", "Assigné à", "Notes", "Date"];
    const csv = [
      headers.join(";"),
      ...rows.map(r => [
        r.id, r.nom, r.prenom, r.telephone, r.email,
        `"${r.sujet.replace(/"/g, "'")}"`,
        r.priorite, r.statut, r.assigneA ?? "",
        `"${(r.notesInternes ?? "").replace(/"/g, "'")}"`,
        new Date(r.createdAt).toLocaleDateString("fr-FR")
      ].join(";"))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `custom-care-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 px-4">
        <img src={LOGO_FULL} alt="Sigma Factory" className="h-14 object-contain" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Accès réservé</h1>
          <p className="text-zinc-400 mb-6">Connectez-vous pour accéder au dashboard Custom Care</p>
          <a href="/login" className="inline-block px-6 py-3 rounded-lg font-semibold text-black"
            style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)" }}>
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  // Stats rapides
  const stats = [
    { label: "Total", value: total, icon: MessageSquare, color: "text-zinc-300" },
    { label: "Nouvelles", value: items.filter(i => i.statut === "nouvelle").length, icon: AlertTriangle, color: "text-blue-400" },
    { label: "En cours", value: items.filter(i => i.statut === "en_cours").length, icon: Clock, color: "text-yellow-400" },
    { label: "Effectuées", value: items.filter(i => i.statut === "effectuee").length, icon: CheckCircle2, color: "text-green-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AdminNav />
      {/* Toolbar */}
      <div className="border-b border-zinc-800 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-end gap-3">
          <button onClick={() => refetch()} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C9A84C]/30 text-[#C9A84C] text-sm font-medium hover:bg-[#C9A84C]/10"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <a
            href="/customcare"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-black text-sm"
            style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)" }}
          >
            + Nouvelle demande
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-[#111] border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-zinc-500 text-xs">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher un lead, sujet..."
              className="w-full bg-[#111] border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={statutFilter}
            onChange={e => { setStatutFilter(e.target.value); setPage(0); }}
            className="bg-[#111] border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-[#C9A84C]"
          >
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={prioriteFilter}
            onChange={e => { setPrioriteFilter(e.target.value); setPage(0); }}
            className="bg-[#111] border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-[#C9A84C]"
          >
            <option value="toutes">Toutes priorités</option>
            {PRIORITES_CONFIG.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="px-4 py-3 text-zinc-500 text-xs font-semibold uppercase tracking-wider">Lead</th>
                    <th className="px-4 py-3 text-zinc-500 text-xs font-semibold uppercase tracking-wider">Sujet</th>
                    <th className="px-4 py-3 text-zinc-500 text-xs font-semibold uppercase tracking-wider">Priorité</th>
                    <th className="px-4 py-3 text-zinc-500 text-xs font-semibold uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-zinc-500 text-xs font-semibold uppercase tracking-wider">Assigné</th>
                    <th className="px-4 py-3 text-zinc-500 text-xs font-semibold uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {items.map(item => {
                    const prio = getPriorite(item.priorite);
                    const stat = getStatut(item.statut);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="text-white font-medium text-sm">{item.prenom} {item.nom}</div>
                          <div className="text-zinc-500 text-xs">{item.telephone}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-zinc-300 text-sm max-w-[200px] truncate">{item.sujet}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${prio.bg} ${prio.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                            {prio.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${stat.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                            {stat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-zinc-400 text-xs">{item.assigneA || "—"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-zinc-500 text-xs">{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                            <button
                              onClick={(e) => handleDelete(e, item.id, `${item.prenom} ${item.nom}`)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition"
                              title="Supprimer"
                            >
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

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>{total} demandes au total</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 disabled:opacity-40 hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                ← Précédent
              </button>
              <span className="px-3 py-1.5 text-zinc-300">{page + 1} / {Math.ceil(total / LIMIT)}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * LIMIT >= total}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 disabled:opacity-40 hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedId !== null && (
        <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

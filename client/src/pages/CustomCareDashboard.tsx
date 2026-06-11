import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Loader2, Search, X, ChevronRight, Download, RefreshCw,
  Phone, Mail, Clock, AlertTriangle, CheckCircle2,
  MessageSquare, User, Calendar, Paperclip, Upload,
  FileText, Image, File, Trash2, ExternalLink, ChevronLeft
} from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { AssigneeSelect } from "@/components/AssigneeSelect";

// ─── Configs ─────────────────────────────────────────────────────────────────

const STATUTS = [
  { value: "toutes", label: "Toutes" },
  { value: "nouvelle", label: "Nouvelle" },
  { value: "en_cours", label: "En cours" },
  { value: "en_attente_retour", label: "En attente retour" },
  { value: "standby", label: "Standby" },
  { value: "effectuee", label: "Effectuee" },
  { value: "annulee", label: "Annulee" },
];

const STATUT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  nouvelle:          { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  en_cours:          { color: "#F0EDE6", bg: "rgba(240,237,230,0.06)", border: "rgba(240,237,230,0.15)" },
  en_attente_retour: { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  standby:           { color: "#6B6560", bg: "rgba(107,101,96,0.08)", border: "rgba(107,101,96,0.2)" },
  effectuee:         { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  annulee:           { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
};

const PRIORITES_CONFIG = [
  { value: "hyper_urgent", label: "Hyper Urgent" },
  { value: "tres_urgent", label: "Tres Urgent" },
  { value: "urgent", label: "Urgent" },
  { value: "normal", label: "Normal" },
  { value: "faible", label: "Faible" },
];

const PRIORITE_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  hyper_urgent: { color: "#A04040", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
  tres_urgent:  { color: "#A04040", bg: "rgba(160,64,64,0.06)", border: "rgba(160,64,64,0.15)" },
  urgent:       { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  normal:       { color: "#4A7A5A", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  faible:       { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" },
};

function getPrioriteStyle(value: string) {
  return PRIORITE_STYLES[value] ?? PRIORITE_STYLES.normal;
}

function getPrioriteLabel(value: string) {
  return PRIORITES_CONFIG.find(p => p.value === value)?.label ?? "Normal";
}

function getStatutStyle(value: string) {
  return STATUT_STYLES[value] ?? { color: "#3A3632", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" };
}

function getStatutLabel(value: string) {
  return STATUTS.find(s => s.value === value)?.label ?? value;
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
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 shrink-0" style={{ color: "#6B6560", strokeWidth: 1.5 }} />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 shrink-0" style={{ color: "#6B6560", strokeWidth: 1.5 }} />;
  return <File className="w-4 h-4 shrink-0" style={{ color: "#6B6560", strokeWidth: 1.5 }} />;
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

// ─── Badge Components ────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const s = getStatutStyle(statut);
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
      {getStatutLabel(statut)}
    </span>
  );
}

function PrioriteBadge({ priorite }: { priorite: string }) {
  const s = getPrioriteStyle(priorite);
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
      {getPrioriteLabel(priorite)}
    </span>
  );
}

// ─── Documents Section ────────────────────────────────────────────────────────

function DocumentsSection({ demandeId, demandeNom }: { demandeId: number; demandeNom: string }) {
  const utils = trpc.useUtils();
  const { data: docs, isLoading } = trpc.demandes.listDocuments.useQuery({ demandeId });
  const uploadMutation = trpc.demandes.uploadDocument.useMutation({
    onSuccess: () => {
      utils.demandes.listDocuments.invalidate({ demandeId });
      toast.success("Document envoye avec succes");
      setUploadFiles([]);
      setUploading(false);
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });
  const deleteMutation = trpc.demandes.deleteDocument.useMutation({
    onSuccess: () => {
      utils.demandes.listDocuments.invalidate({ demandeId });
      toast.success("Document supprime");
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
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} depasse 10 Mo`); continue; }
      if (!ACCEPTED_TYPES.includes(file.type)) { toast.error(`${file.name} : format non supporte`); continue; }
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
    <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "20px" }}>
      <div className="flex items-center gap-2 mb-4">
        <Paperclip className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
        <span className="label-uppercase" style={{ color: "#F0EDE6" }}>Documents</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Documents recus du lead */}
          <div>
            <p className="label-uppercase mb-2" style={{ fontSize: "10px" }}>
              Documents recus du lead ({leadDocs.length})
            </p>
            {leadDocs.length === 0 ? (
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucun document joint par le lead</p>
            ) : (
              <div className="space-y-2">
                {leadDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3"
                    style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{doc.nom}</p>
                      <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{formatFileSize(doc.taille)} · {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="transition-opacity duration-300 hover:opacity-70" style={{ color: "#6B6560" }} title="Ouvrir">
                      <ExternalLink className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer "${doc.nom}" ?`)) deleteMutation.mutate({ documentId: doc.id });
                      }}
                      className="transition-colors duration-300" style={{ color: "#3A3632" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents envoyes par Hanna */}
          <div>
            <p className="label-uppercase mb-2" style={{ fontSize: "10px" }}>
              Documents envoyes par Hanna ({hannaDocs.length})
            </p>
            {hannaDocs.length === 0 ? (
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucun document envoye</p>
            ) : (
              <div className="space-y-2">
                {hannaDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3"
                    style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{doc.nom}</p>
                      <p className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{formatFileSize(doc.taille)} · {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="transition-opacity duration-300 hover:opacity-70" style={{ color: "#6B6560" }} title="Ouvrir">
                      <ExternalLink className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer "${doc.nom}" ?`)) deleteMutation.mutate({ documentId: doc.id });
                      }}
                      className="transition-colors duration-300" style={{ color: "#3A3632" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone d'envoi de documents par Hanna */}
          <div style={{ background: "#161616", border: "1px solid #1E1E1E", borderRadius: "2px", padding: "16px" }}>
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-3.5 h-3.5" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
              <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>
                Envoyer un document a {demandeNom}
              </span>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer transition-colors duration-300"
              style={{
                border: "1px dashed #1E1E1E",
                borderRadius: "2px",
                padding: "16px",
                textAlign: "center",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#3A3632")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
            >
              <Upload className="w-4 h-4 mx-auto mb-1" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Cliquez ou glissez un fichier</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(e) => handleFileAdd(e.target.files)}
              />
            </div>

            {/* Fichiers selectionnes */}
            {uploadFiles.length > 0 && (
              <div className="space-y-1.5 mt-3">
                {uploadFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-2"
                    style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
                    {getFileIcon(file.type)}
                    <span className="flex-1 min-w-0" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{file.name}</span>
                    <span className="tabular-nums shrink-0" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))}
                      className="transition-colors duration-300" style={{ color: "#3A3632" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                    >
                      <X className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progression */}
            {uploading && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#6B6560" }} />
                  <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>
                    Envoi en cours... ({uploadProgress.done}/{uploadProgress.total})
                  </span>
                </div>
                <div style={{ height: "2px", background: "#1E1E1E", borderRadius: "1px", overflow: "hidden" }}>
                  <div
                    className="transition-all duration-300"
                    style={{
                      height: "100%",
                      borderRadius: "1px",
                      width: `${uploadProgress.total > 0 ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%`,
                      background: "#C9A84C",
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSendDocs}
              disabled={uploadFiles.length === 0 || uploading}
              className="w-full flex items-center justify-center gap-1.5 mt-3 transition-colors duration-300 disabled:cursor-not-allowed"
              style={{
                padding: "10px 20px",
                background: uploadFiles.length === 0 || uploading ? "#8A7535" : "#C9A84C",
                color: "#0A0A0A",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                borderRadius: "2px",
                border: "none",
              }}
            >
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} /> Envoyer {uploadFiles.length > 0 ? `${uploadFiles.length} fichier${uploadFiles.length > 1 ? "s" : ""}` : "les fichiers"}</>
              )}
            </button>
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", textAlign: "center", marginTop: "8px" }}>
              Un email sera automatiquement envoye a {demandeNom}
            </p>
          </div>
        </div>
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
      toast.success("Demande mise a jour");
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full h-full overflow-y-auto flex flex-col" style={{ maxWidth: "520px", background: "#111111", borderLeft: "1px solid #1E1E1E" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: "#111111", borderBottom: "1px solid #1E1E1E" }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.02em" }}>
              Detail de la demande
            </h2>
            <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px" }}>
              Fiche #{id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 transition-opacity duration-300 hover:opacity-70" style={{ color: "#6B6560" }}>
            <X className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
          </div>
        ) : demande ? (
          <div className="p-6 space-y-8">
            {/* Priorite */}
            <div>
              <p className="label-uppercase mb-2">Priorite</p>
              <PrioriteBadge priorite={demande.priorite} />
            </div>

            {/* Lead info */}
            <div>
              <p className="label-uppercase mb-3">Contact</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                  <div>
                    <p className="label-uppercase" style={{ marginBottom: "2px" }}>Nom complet</p>
                    <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{demande.prenom} {demande.nom}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                  <div>
                    <p className="label-uppercase" style={{ marginBottom: "2px" }}>Telephone</p>
                    <a href={`tel:${demande.telephone}`} style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", textDecoration: "none" }}
                      className="transition-opacity duration-300 hover:opacity-70">{demande.telephone}</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                  <div>
                    <p className="label-uppercase" style={{ marginBottom: "2px" }}>Email</p>
                    <a href={`mailto:${demande.email}`} style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", textDecoration: "none" }}
                      className="transition-opacity duration-300 hover:opacity-70">{demande.email}</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                  <div>
                    <p className="label-uppercase" style={{ marginBottom: "2px" }}>Date de creation</p>
                    <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{formatDate(demande.createdAt)}</p>
                  </div>
                </div>
                {demande.createdBy && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
                    <div>
                      <p className="label-uppercase" style={{ marginBottom: "2px" }}>Cree par</p>
                      <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6" }}>{demande.createdBy}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sujet & demande */}
            <div>
              <p className="label-uppercase mb-2">Sujet</p>
              <p style={{ fontSize: "14px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{demande.sujet}</p>
            </div>
            <div>
              <p className="label-uppercase mb-2">Description</p>
              <div style={{
                background: "#161616",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "16px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#F0EDE6",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap" as const,
              }}>
                {demande.demande}
              </div>
            </div>

            {/* Documents */}
            <DocumentsSection
              demandeId={id}
              demandeNom={`${demande.prenom} ${demande.nom}`}
            />

            {/* Gestion */}
            <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "20px" }}>
              <p className="label-uppercase mb-4">Gestion Hanna</p>

              {/* Statut */}
              <div className="mb-4">
                <p className="label-uppercase mb-1.5" style={{ fontSize: "10px" }}>Statut</p>
                <select
                  value={statut}
                  onChange={e => setStatut(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#161616",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                    outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                >
                  {STATUTS.filter(s => s.value !== "toutes").map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Assigne a */}
              <div className="mb-4">
                <p className="label-uppercase mb-1.5" style={{ fontSize: "10px" }}>Assigne a</p>
                <AssigneeSelect
                  mode="team"
                  value={assigne}
                  onChange={(val) => setAssigne(val)}
                  placeholder="-- Selectionner un membre --"
                  className="w-full"
                />
              </div>

              {/* Notes internes */}
              <div className="mb-4">
                <p className="label-uppercase mb-1.5" style={{ fontSize: "10px" }}>Notes internes</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Ajouter une note interne..."
                  style={{
                    width: "100%",
                    background: "#161616",
                    border: "1px solid #1E1E1E",
                    borderRadius: "2px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#F0EDE6",
                    resize: "none",
                    outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 transition-colors duration-300 disabled:cursor-not-allowed"
                style={{
                  padding: "14px 28px",
                  background: saving ? "#8A7535" : "#C9A84C",
                  color: "#0A0A0A",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  borderRadius: "2px",
                  border: "none",
                }}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</> : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Demande introuvable</p>
          </div>
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
    if (window.confirm(`Supprimer la demande de ${nom} ? Cette action est irreversible.`)) {
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
    const headers = ["ID", "Nom", "Prenom", "Telephone", "Email", "Sujet", "Priorite", "Statut", "Assigne a", "Notes", "Date"];
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "#0A0A0A" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.04em" }}>Acces reserve</h2>
        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>Connectez-vous pour acceder au dashboard Custom Care.</p>
        <a href="/login" style={{
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
        }}>Se connecter</a>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <AdminNav />

      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid #1E1E1E" }}>
        <div className="flex items-center justify-end gap-2 px-5 py-2.5" style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <button onClick={() => refetch()} className="p-2 transition-colors duration-300"
            style={{ color: "#3A3632", border: "1px solid #1E1E1E", borderRadius: "2px", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#6B6560"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#3A3632"; }}
          >
            <RefreshCw className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 transition-colors duration-300"
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
          <a
            href="/customcare"
            style={{
              padding: "8px 20px",
              background: "#C9A84C",
              color: "#0A0A0A",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              textDecoration: "none",
              borderRadius: "2px",
            }}
          >
            + Nouvelle demande
          </a>
        </div>
      </div>

      <div className="px-5 py-8" style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-10" style={{ background: "#1E1E1E", border: "1px solid #1E1E1E", borderRadius: "2px" }}>
          {[
            { label: "Total demandes", value: total, highlight: true },
            { label: "Nouvelles", value: items.filter(i => i.statut === "nouvelle").length, highlight: false },
            { label: "En cours", value: items.filter(i => i.statut === "en_cours").length, highlight: false },
            { label: "Effectuees", value: items.filter(i => i.statut === "effectuee").length, highlight: false },
          ].map((stat) => (
            <div key={stat.label} className="p-5" style={{ background: "#0A0A0A" }}>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px",
                fontWeight: 600,
                color: stat.highlight ? "#C9A84C" : "#F0EDE6",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}>
                {stat.value}
              </p>
              <p className="label-uppercase mt-2">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher un lead, sujet..."
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
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-300 hover:opacity-70" style={{ color: "#3A3632" }}>
                <X className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </button>
            )}
          </div>
          <select
            value={statutFilter}
            onChange={e => { setStatutFilter(e.target.value); setPage(0); }}
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
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={prioriteFilter}
            onChange={e => { setPrioriteFilter(e.target.value); setPage(0); }}
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
            <option value="toutes">Toutes priorites</option>
            {PRIORITES_CONFIG.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "2px", overflow: "hidden" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6B6560" }} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: "#1E1E1E", strokeWidth: 1.5 }} />
              <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>Aucune demande trouvee</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                      {["Lead", "Sujet", "Priorite", "Statut", "Assigne", "Date", ""].map(h => (
                        <th key={h} className="text-left px-5 py-3 label-uppercase" style={{ background: "#0D0D0D" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className="cursor-pointer transition-colors duration-300"
                        style={{ borderBottom: "1px solid #151515" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-5 py-3">
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{item.prenom} {item.nom}</p>
                          <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{item.telephone}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#F0EDE6", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.sujet}</p>
                        </td>
                        <td className="px-5 py-3">
                          <PrioriteBadge priorite={item.priorite} />
                        </td>
                        <td className="px-5 py-3">
                          <StatutBadge statut={item.statut} />
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560" }}>{item.assigneA || "—"}</span>
                        </td>
                        <td className="px-5 py-3 tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
                          {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }} className="p-1.5 transition-opacity duration-300 hover:opacity-70" style={{ color: "#3A3632" }}>
                              <ChevronRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, item.id, `${item.prenom} ${item.nom}`)}
                              className="p-1.5 transition-colors duration-300" style={{ color: "#3A3632" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#A04040")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#3A3632")}
                              title="Supprimer"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                {items.map(item => (
                  <div key={item.id}
                    className="p-4 cursor-pointer transition-colors duration-300"
                    style={{ borderBottom: "1px solid #151515" }}
                    onClick={() => setSelectedId(item.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6" }}>{item.prenom} {item.nom}</p>
                        <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px" }}>{item.sujet}</p>
                      </div>
                      <StatutBadge statut={item.statut} />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <PrioriteBadge priorite={item.priorite} />
                      <span className="tabular-nums" style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632" }}>
              {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} sur {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ color: "#6B6560", border: "1px solid #1E1E1E", borderRadius: "2px" }}
              >
                <ChevronLeft className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              </button>
              <span className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#6B6560", padding: "0 8px" }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 transition-colors duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ color: "#6B6560", border: "1px solid #1E1E1E", borderRadius: "2px" }}
              >
                <ChevronRight className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
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

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Paperclip, Upload, FileText, Image, File,
  ExternalLink, Trash2, X, Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartnerType = "courtier" | "agent";

interface PartnerDocumentsSectionProps {
  partnerType: PartnerType;
  partnerId: number;
  partnerNom: string;
  partnerEmail: string;
  /** Qui est l'utilisateur courant : côté portail (partenaire) ou côté dashboard (admin) */
  viewAs: "partner" | "admin";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PartnerDocumentsSection({
  partnerType,
  partnerId,
  partnerNom,
  partnerEmail,
  viewAs,
}: PartnerDocumentsSectionProps) {
  const utils = trpc.useUtils();

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: docs, isLoading } = partnerType === "courtier"
    ? trpc.partnerDocs.listCourtierDocs.useQuery({ courtierId: partnerId })
    : trpc.partnerDocs.listAgentDocs.useQuery({ agentId: partnerId });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const uploadCourtierMutation = trpc.partnerDocs.uploadCourtierDoc.useMutation({
    onSuccess: () => {
      utils.partnerDocs.listCourtierDocs.invalidate({ courtierId: partnerId });
      toast.success("Document envoyé avec succès");
      setUploadFiles([]);
      setUploading(false);
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  const uploadAgentMutation = trpc.partnerDocs.uploadAgentDoc.useMutation({
    onSuccess: () => {
      utils.partnerDocs.listAgentDocs.invalidate({ agentId: partnerId });
      toast.success("Document envoyé avec succès");
      setUploadFiles([]);
      setUploading(false);
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  const deleteCourtierMutation = trpc.partnerDocs.deleteCourtierDoc.useMutation({
    onSuccess: () => utils.partnerDocs.listCourtierDocs.invalidate({ courtierId: partnerId }),
    onError: (e) => toast.error(e.message),
  });

  const deleteAgentMutation = trpc.partnerDocs.deleteAgentDoc.useMutation({
    onSuccess: () => utils.partnerDocs.listAgentDocs.invalidate({ agentId: partnerId }),
    onError: (e) => toast.error(e.message),
  });

  // ─── State ────────────────────────────────────────────────────────────────
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────
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

    // Qui envoie ?
    const envoyePar = viewAs === "partner"
      ? (partnerType === "courtier" ? "courtier" : "agent")
      : (partnerType === "courtier" ? "manon" : "elodie");

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      try {
        const base64 = await fileToBase64(file);
        if (partnerType === "courtier") {
          await uploadCourtierMutation.mutateAsync({
            courtierId: partnerId,
            courtierNom: partnerNom,
            courtierEmail: partnerEmail,
            fileBase64: base64,
            nom: file.name,
            mimeType: file.type,
            taille: file.size,
            envoyePar: envoyePar as "courtier" | "manon",
          });
        } else {
          await uploadAgentMutation.mutateAsync({
            agentId: partnerId,
            agentNom: partnerNom,
            agentEmail: partnerEmail,
            fileBase64: base64,
            nom: file.name,
            mimeType: file.type,
            taille: file.size,
            envoyePar: envoyePar as "agent" | "elodie",
          });
        }
        setUploadProgress({ done: i + 1, total: uploadFiles.length });
      } catch (e) {
        toast.error(`Erreur pour ${file.name}`);
      }
    }
    setUploading(false);
  };

  const handleDelete = (docId: number, docNom: string) => {
    if (!window.confirm(`Supprimer "${docNom}" ?`)) return;
    if (partnerType === "courtier") deleteCourtierMutation.mutate({ documentId: docId });
    else deleteAgentMutation.mutate({ documentId: docId });
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  const adminLabel = partnerType === "courtier" ? "Manon" : "Élodie";
  const partnerLabel = partnerType === "courtier" ? "courtier" : "agent";
  const partnerSentDocs = docs?.filter(d => d.envoyePar === partnerType) ?? [];
  const adminSentDocs = docs?.filter(d => d.envoyePar !== partnerType) ?? [];

  const senderLabel = viewAs === "partner"
    ? `Envoyer un document à ${adminLabel}`
    : `Envoyer un document à ${partnerNom}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-[#C9A84C]" />
        <span className="text-[#C9A84C] text-xs font-semibold uppercase tracking-widest">Documents</span>
        {docs && docs.length > 0 && (
          <span className="text-xs bg-[#C9A84C]/20 text-[#C9A84C] px-2 py-0.5 rounded-full font-medium">
            {docs.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#C9A84C]" />
        </div>
      ) : (
        <>
          {/* Documents envoyés par le partenaire */}
          <div>
            <div className="text-zinc-500 text-xs font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Documents du {partnerLabel} ({partnerSentDocs.length})
            </div>
            {partnerSentDocs.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">Aucun document envoyé par le {partnerLabel}</p>
            ) : (
              <div className="space-y-2">
                {partnerSentDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-3 py-2.5 border border-zinc-800">
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-xs truncate font-medium">{doc.nom}</p>
                      <p className="text-zinc-500 text-xs">{formatFileSize(doc.taille)} · {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] hover:text-[#F0D080] flex-shrink-0" title="Ouvrir">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {viewAs === "admin" && (
                      <button onClick={() => handleDelete(doc.id, doc.nom)} className="text-zinc-600 hover:text-red-400 flex-shrink-0" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents envoyés par l'admin */}
          <div>
            <div className="text-zinc-500 text-xs font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C9A84C] inline-block" />
              Documents de {adminLabel} ({adminSentDocs.length})
            </div>
            {adminSentDocs.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">Aucun document envoyé par {adminLabel}</p>
            ) : (
              <div className="space-y-2">
                {adminSentDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-3 py-2.5 border border-[#C9A84C]/20">
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-xs truncate font-medium">{doc.nom}</p>
                      <p className="text-zinc-500 text-xs">{formatFileSize(doc.taille)} · {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] hover:text-[#F0D080] flex-shrink-0" title="Ouvrir">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {viewAs === "admin" && (
                      <button onClick={() => handleDelete(doc.id, doc.nom)} className="text-zinc-600 hover:text-red-400 flex-shrink-0" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone d'envoi */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#C9A84C]/10 space-y-3">
            <div className="text-zinc-300 text-xs font-semibold flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-[#C9A84C]" />
              {senderLabel}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all"
            >
              <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-1" />
              <p className="text-zinc-500 text-xs">Cliquez ou glissez un fichier</p>
              <p className="text-zinc-600 text-xs mt-0.5">PDF, images, Word, Excel — max 10 Mo</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(e) => handleFileAdd(e.target.files)}
              />
            </div>

            {uploadFiles.length > 0 && (
              <div className="space-y-1.5">
                {uploadFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#111] rounded-lg px-3 py-2 border border-zinc-800">
                    {getFileIcon(file.type)}
                    <span className="flex-1 text-zinc-300 text-xs truncate">{file.name}</span>
                    <span className="text-zinc-500 text-xs flex-shrink-0">{formatFileSize(file.size)}</span>
                    <button onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
              {viewAs === "partner"
                ? `Un email sera envoyé à ${adminLabel}`
                : `Un email sera envoyé à ${partnerNom}`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

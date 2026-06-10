import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ChevronDown, Paperclip, X, Upload, FileText, Image, File } from "lucide-react";

const LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/sigma-logo-full_c217e268.png";

const schema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  telephone: z.string().min(1, "Le téléphone est requis"),
  email: z.string().email("Email invalide"),
  sujet: z.string().min(1, "Le sujet est requis"),
  demande: z.string().min(10, "Décrivez la demande en au moins 10 caractères"),
  priorite: z.enum(["hyper_urgent", "tres_urgent", "urgent", "normal", "faible"]),
});

type FormData = z.infer<typeof schema>;

const PRIORITES = [
  { value: "hyper_urgent", label: "🔴 Hyper Urgent", color: "text-red-500", bg: "bg-red-500/10 border-red-500/40" },
  { value: "tres_urgent", label: "🟠 Très Urgent", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/40" },
  { value: "urgent", label: "🟡 Urgent", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/40" },
  { value: "normal", label: "🟢 Normal", color: "text-green-400", bg: "bg-green-400/10 border-green-400/40" },
  { value: "faible", label: "⚪ Faible", color: "text-zinc-400", bg: "bg-zinc-400/10 border-zinc-400/40" },
];

const SUJETS = [
  "Suivi de dossier",
  "Demande de documents",
  "Problème technique",
  "Réclamation client",
  "Demande d'information",
  "Relance client",
  "Mise à jour coordonnées",
  "Autre",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Retirer le préfixe "data:...;base64,"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-400" />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-400" />;
  return <File className="w-4 h-4 text-zinc-400" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function CustomCareForm() {
  const { user, loading, isAuthenticated } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submittedDemandeId, setSubmittedDemandeId] = useState<number | null>(null);
  const [selectedPriorite, setSelectedPriorite] = useState("normal");
  const [sujetOpen, setSujetOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priorite: "normal" },
  });

  const submitMutation = trpc.demandes.submit.useMutation({
    onSuccess: async (data) => {
      const demandeId = (data as any)?.id ?? (data as any)?.insertId ?? null;
      setSubmittedDemandeId(demandeId);

      // Upload des pièces jointes si présentes
      if (attachedFiles.length > 0 && demandeId) {
        setUploadingDocs(true);
        setUploadProgress({ done: 0, total: attachedFiles.length });
        try {
          for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            const base64 = await fileToBase64(file);
            await uploadDocMutation.mutateAsync({
              demandeId,
              fileBase64: base64,
              nom: file.name,
              mimeType: file.type,
              taille: file.size,
              envoyePar: "lead",
            });
            setUploadProgress({ done: i + 1, total: attachedFiles.length });
          }
        } catch (e) {
          toast.error("Certains fichiers n'ont pas pu être envoyés.");
        } finally {
          setUploadingDocs(false);
        }
      }
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("Erreur lors de la soumission : " + err.message);
    },
  });

  const uploadDocMutation = trpc.demandes.uploadDocument.useMutation();

  const watchedSujet = watch("sujet");

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  const handleFileAdd = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dépasse la limite de 10 Mo`);
        continue;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name} : format non supporté`);
        continue;
      }
      if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
        toast.error(`${file.name} est déjà joint`);
        continue;
      }
      newFiles.push(file);
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
  }, [attachedFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileAdd(e.dataTransfer.files);
  }, [handleFileAdd]);

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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
          <h1 className="text-2xl font-bold text-white mb-2">Accès réservé à l'équipe</h1>
          <p className="text-zinc-400 mb-6">Connectez-vous pour accéder au formulaire Custom Care</p>
          <a
            href="/login"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-black"
            style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)" }}
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 px-4">
        <img src={LOGO_FULL} alt="Sigma Factory" className="h-14 object-contain" />
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-[#C9A84C] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Demande enregistrée ✓</h1>
          <p className="text-zinc-400 mb-2">La demande a bien été transmise à l'équipe Custom Care.</p>
          {attachedFiles.length > 0 && (
            <p className="text-zinc-500 text-sm mb-6">
              {attachedFiles.length} pièce{attachedFiles.length > 1 ? "s" : ""} jointe{attachedFiles.length > 1 ? "s" : ""} envoyée{attachedFiles.length > 1 ? "s" : ""} avec succès.
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => { setSubmitted(false); setAttachedFiles([]); setSubmittedDemandeId(null); }}
              className="px-6 py-3 rounded-lg font-semibold text-black"
              style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)" }}
            >
              Nouvelle demande
            </button>
            <a
              href="/customcare/dashboard"
              className="px-6 py-3 rounded-lg font-semibold text-white border border-zinc-700 hover:border-[#C9A84C]/50 hover:bg-zinc-800 transition-colors"
            >
              ← Retour au dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitting = submitMutation.isPending || uploadingDocs;

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <a
            href="/customcare/dashboard"
            className="flex items-center gap-2 text-zinc-400 hover:text-[#C9A84C] text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Retour au dashboard
          </a>
          <img src={LOGO_FULL} alt="Sigma Factory" className="h-8 object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-1">Custom Care</h1>
          <p className="text-zinc-400">Formulaire de demande interne — Équipe Sigma Factory</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-5">

        {/* Informations du lead */}
        <div className="rounded-xl border border-[#C9A84C]/20 bg-[#111] p-6">
          <h2 className="text-[#C9A84C] font-semibold text-sm uppercase tracking-widest mb-4">
            Informations du lead
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5 font-medium">Nom *</label>
              <input
                {...register("nom")}
                placeholder="Dupont"
                className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C] transition-colors"
              />
              {errors.nom && <p className="text-red-400 text-xs mt-1">{errors.nom.message}</p>}
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5 font-medium">Prénom *</label>
              <input
                {...register("prenom")}
                placeholder="Jean"
                className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C] transition-colors"
              />
              {errors.prenom && <p className="text-red-400 text-xs mt-1">{errors.prenom.message}</p>}
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5 font-medium">Téléphone *</label>
              <input
                {...register("telephone")}
                placeholder="06 12 34 56 78"
                className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C] transition-colors"
              />
              {errors.telephone && <p className="text-red-400 text-xs mt-1">{errors.telephone.message}</p>}
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5 font-medium">Email *</label>
              <input
                {...register("email")}
                type="email"
                placeholder="jean.dupont@email.com"
                className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C] transition-colors"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
        </div>

        {/* Détails de la demande */}
        <div className="rounded-xl border border-[#C9A84C]/20 bg-[#111] p-6">
          <h2 className="text-[#C9A84C] font-semibold text-sm uppercase tracking-widest mb-4">
            Détails de la demande
          </h2>

          {/* Sujet */}
          <div className="mb-4">
            <label className="block text-zinc-300 text-sm mb-1.5 font-medium">Sujet *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSujetOpen(!sujetOpen)}
                className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-4 py-2.5 text-left flex items-center justify-between focus:outline-none focus:border-[#C9A84C] transition-colors"
              >
                <span className={watchedSujet ? "text-white" : "text-zinc-500"}>
                  {watchedSujet || "Sélectionner un sujet"}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${sujetOpen ? "rotate-180" : ""}`} />
              </button>
              {sujetOpen && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                  {SUJETS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setValue("sujet", s); setSujetOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-zinc-300 hover:bg-[#C9A84C]/10 hover:text-[#C9A84C] transition-colors text-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.sujet && <p className="text-red-400 text-xs mt-1">{errors.sujet.message}</p>}
          </div>

          {/* Demande */}
          <div className="mb-4">
            <label className="block text-zinc-300 text-sm mb-1.5 font-medium">Description de la demande *</label>
            <textarea
              {...register("demande")}
              rows={5}
              placeholder="Décrivez la demande du lead en détail..."
              className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C] transition-colors resize-none"
            />
            {errors.demande && <p className="text-red-400 text-xs mt-1">{errors.demande.message}</p>}
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-zinc-300 text-sm mb-2 font-medium">Niveau de priorité *</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRIORITES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setSelectedPriorite(p.value); setValue("priorite", p.value as any); }}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                    selectedPriorite === p.value
                      ? `${p.bg} ${p.color} border-current`
                      : "bg-[#1a1a1a] border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── PIÈCES JOINTES ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#C9A84C]/20 bg-[#111] p-6">
          <h2 className="text-[#C9A84C] font-semibold text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Pièces jointes
            <span className="text-zinc-500 font-normal normal-case tracking-normal text-xs ml-1">(optionnel)</span>
          </h2>
          <p className="text-zinc-500 text-xs mb-4">PDF, images, Word, Excel — max 10 Mo par fichier</p>

          {/* Zone de dépôt */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => { e.preventDefault(); dropZoneRef.current?.classList.add("border-[#C9A84C]"); }}
            onDragLeave={() => dropZoneRef.current?.classList.remove("border-[#C9A84C]")}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all"
          >
            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">Glissez-déposez vos fichiers ici</p>
            <p className="text-zinc-600 text-xs mt-1">ou cliquez pour parcourir</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => handleFileAdd(e.target.files)}
            />
          </div>

          {/* Liste des fichiers joints */}
          {attachedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-4 py-2.5 border border-zinc-800">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm truncate font-medium">{file.name}</p>
                    <p className="text-zinc-500 text-xs">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <p className="text-zinc-500 text-xs text-right">
                {attachedFiles.length} fichier{attachedFiles.length > 1 ? "s" : ""} sélectionné{attachedFiles.length > 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Progression upload */}
          {uploadingDocs && (
            <div className="mt-4 bg-[#1a1a1a] rounded-lg p-4 border border-[#C9A84C]/20">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A84C]" />
                <span className="text-zinc-300 text-sm">Envoi des pièces jointes... ({uploadProgress.done}/{uploadProgress.total})</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
        </div>

        {/* Soumis par */}
        <div className="flex items-center gap-2 text-zinc-500 text-sm px-1">
          <span>Soumis par :</span>
          <span className="text-zinc-300 font-medium">{user?.name ?? user?.email ?? "—"}</span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-xl font-bold text-black text-base flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)" }}
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> {uploadingDocs ? "Envoi des fichiers..." : "Envoi en cours..."}</>
          ) : (
            <>Envoyer la demande {attachedFiles.length > 0 ? `+ ${attachedFiles.length} fichier${attachedFiles.length > 1 ? "s" : ""}` : ""} →</>
          )}
        </button>
      </form>
    </div>
  );
}

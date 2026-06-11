import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, CheckCircle, ChevronDown, Upload, X, FileText, Image, File } from "lucide-react";

const LOGO_FULL = "/assets/sigma-logo.png";

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
  { value: "hyper_urgent", label: "Hyper Urgent" },
  { value: "tres_urgent", label: "Tres Urgent" },
  { value: "urgent", label: "Urgent" },
  { value: "normal", label: "Normal" },
  { value: "faible", label: "Faible" },
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

/* ── Design tokens ── */
const fonts = {
  heading: "'Cormorant Garamond', serif",
  body: "'Hanken Grotesk', sans-serif",
};

const colors = {
  bg: "var(--background)",
  surface: "var(--surface)",
  surfaceRaised: "var(--surface-raised)",
  border: "var(--border)",
  fg: "var(--foreground)",
  muted: "var(--foreground-muted)",
  faint: "var(--foreground-faint)",
  gold: "var(--gold)",
  goldMuted: "var(--gold-muted)",
  destructive: "var(--destructive)",
};

const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: colors.muted,
  marginBottom: "8px",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  background: colors.surfaceRaised,
  border: `1px solid ${colors.border}`,
  borderRadius: "2px",
  padding: "12px 14px",
  color: colors.fg,
  fontSize: "14px",
  fontFamily: fonts.body,
  width: "100%",
  outline: "none",
  transition: "border-color 300ms ease",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6560' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: "36px",
};

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: colors.destructive,
  fontFamily: fonts.body,
  marginTop: "4px",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={16} strokeWidth={1.5} style={{ color: colors.muted }} />;
  if (mimeType === "application/pdf") return <FileText size={16} strokeWidth={1.5} style={{ color: colors.muted }} />;
  return <File size={16} strokeWidth={1.5} style={{ color: colors.faint }} />;
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

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} strokeWidth={1.5} className="animate-spin" style={{ color: colors.gold }} />
      </div>
    );
  }

  /* ── Not authenticated ── */
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "32px", padding: "24px" }}>
        <img src={LOGO_FULL} alt="Sigma Factory" style={{ height: "48px", objectFit: "contain" }} />
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: fonts.heading, fontSize: "24px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "8px" }}>
            Acces reserve a l'equipe
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, marginBottom: "28px" }}>
            Connectez-vous pour acceder au formulaire Custom Care
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              background: colors.gold,
              color: colors.bg,
              borderRadius: "2px",
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              textDecoration: "none",
            }}
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  /* ── Submitted ── */
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "32px", padding: "24px" }}>
        <img src={LOGO_FULL} alt="Sigma Factory" style={{ height: "48px", objectFit: "contain" }} />
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          <CheckCircle size={48} strokeWidth={1.5} style={{ color: colors.gold, margin: "0 auto 20px", display: "block" }} />
          <h1 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "8px" }}>
            Demande enregistree
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, marginBottom: "8px" }}>
            La demande a bien ete transmise a l'equipe Custom Care.
          </p>
          {attachedFiles.length > 0 && (
            <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.faint, marginBottom: "28px" }}>
              {attachedFiles.length} piece{attachedFiles.length > 1 ? "s" : ""} jointe{attachedFiles.length > 1 ? "s" : ""} envoyee{attachedFiles.length > 1 ? "s" : ""} avec succes.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => { setSubmitted(false); setAttachedFiles([]); setSubmittedDemandeId(null); }}
              style={{
                padding: "14px 28px",
                background: colors.gold,
                color: colors.bg,
                border: "none",
                borderRadius: "2px",
                fontFamily: fonts.body,
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              Nouvelle demande
            </button>
            <a
              href="/customcare/dashboard"
              style={{
                padding: "12px 24px",
                background: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: "2px",
                fontFamily: fonts.body,
                fontSize: "11px",
                fontWeight: 500,
                color: colors.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textDecoration: "none",
                transition: "border-color 300ms ease",
              }}
            >
              Retour au dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitting = submitMutation.isPending || uploadingDocs;

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, padding: "32px 16px" }}>
      {/* Header */}
      <div style={{ maxWidth: "640px", margin: "0 auto", marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <a
            href="/customcare/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: fonts.body,
              fontSize: "12px",
              color: colors.muted,
              textDecoration: "none",
              letterSpacing: "0.04em",
              transition: "opacity 300ms ease",
            }}
          >
            Retour au dashboard
          </a>
          <img src={LOGO_FULL} alt="Sigma Factory" style={{ height: "28px", objectFit: "contain" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontFamily: fonts.heading,
            fontSize: "28px",
            fontWeight: 700,
            color: colors.fg,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "0 0 6px",
          }}>
            Custom Care
          </h1>
          <div style={{ width: "40px", height: "1px", background: colors.gold, margin: "12px auto 12px" }} />
          <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0 }}>
            Formulaire de demande interne — Equipe Sigma Factory
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Informations du lead */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "2px",
          padding: "32px",
          marginBottom: "20px",
        }}>
          <p style={{ ...labelStyle, marginBottom: "20px", fontSize: "10px", letterSpacing: "0.12em" }}>
            Informations du lead
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Nom <span style={{ color: colors.gold }}>*</span></label>
              <input
                {...register("nom")}
                placeholder="Dupont"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = colors.gold; }}
                onBlur={e => { e.target.style.borderColor = colors.border; }}
              />
              {errors.nom && <p style={errorStyle}>{errors.nom.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Prenom <span style={{ color: colors.gold }}>*</span></label>
              <input
                {...register("prenom")}
                placeholder="Jean"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = colors.gold; }}
                onBlur={e => { e.target.style.borderColor = colors.border; }}
              />
              {errors.prenom && <p style={errorStyle}>{errors.prenom.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Telephone <span style={{ color: colors.gold }}>*</span></label>
              <input
                {...register("telephone")}
                placeholder="06 12 34 56 78"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = colors.gold; }}
                onBlur={e => { e.target.style.borderColor = colors.border; }}
              />
              {errors.telephone && <p style={errorStyle}>{errors.telephone.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Email <span style={{ color: colors.gold }}>*</span></label>
              <input
                {...register("email")}
                type="email"
                placeholder="jean.dupont@email.com"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = colors.gold; }}
                onBlur={e => { e.target.style.borderColor = colors.border; }}
              />
              {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
            </div>
          </div>
        </div>

        {/* Details de la demande */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "2px",
          padding: "32px",
          marginBottom: "20px",
        }}>
          <p style={{ ...labelStyle, marginBottom: "20px", fontSize: "10px", letterSpacing: "0.12em" }}>
            Details de la demande
          </p>

          {/* Sujet */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Sujet <span style={{ color: colors.gold }}>*</span></label>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setSujetOpen(!sujetOpen)}
                style={{
                  ...selectStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ color: watchedSujet ? colors.fg : colors.faint }}>
                  {watchedSujet || "Selectionner un sujet"}
                </span>
                <ChevronDown size={14} strokeWidth={1.5} style={{
                  color: colors.muted,
                  transition: "transform 300ms ease",
                  transform: sujetOpen ? "rotate(180deg)" : "none",
                }} />
              </button>
              {sujetOpen && (
                <div style={{
                  position: "absolute",
                  zIndex: 10,
                  width: "100%",
                  marginTop: "4px",
                  background: colors.surfaceRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "2px",
                  overflow: "hidden",
                }}>
                  {SUJETS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setValue("sujet", s); setSujetOpen(false); }}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        color: colors.muted,
                        fontFamily: fonts.body,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 300ms ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = colors.surface; e.currentTarget.style.color = colors.fg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.muted; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.sujet && <p style={errorStyle}>{errors.sujet.message}</p>}
          </div>

          {/* Demande */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Description de la demande <span style={{ color: colors.gold }}>*</span></label>
            <textarea
              {...register("demande")}
              rows={5}
              placeholder="Decrivez la demande du lead en detail..."
              style={{ ...inputStyle, resize: "none" as const }}
              onFocus={e => { e.target.style.borderColor = colors.gold; }}
              onBlur={e => { e.target.style.borderColor = colors.border; }}
            />
            {errors.demande && <p style={errorStyle}>{errors.demande.message}</p>}
          </div>

          {/* Priorite */}
          <div>
            <label style={labelStyle}>Niveau de priorite <span style={{ color: colors.gold }}>*</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              {PRIORITES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setSelectedPriorite(p.value); setValue("priorite", p.value as any); }}
                  style={{
                    padding: "10px 8px",
                    borderRadius: "2px",
                    border: `1px solid ${selectedPriorite === p.value ? colors.gold : colors.border}`,
                    background: selectedPriorite === p.value ? colors.gold : "transparent",
                    color: selectedPriorite === p.value ? colors.bg : colors.muted,
                    fontFamily: fonts.body,
                    fontSize: "10px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    transition: "all 300ms ease",
                    textAlign: "center",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pieces jointes */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "2px",
          padding: "32px",
          marginBottom: "20px",
        }}>
          <p style={{ ...labelStyle, marginBottom: "4px", fontSize: "10px", letterSpacing: "0.12em" }}>
            Pieces jointes
            <span style={{ color: colors.faint, fontWeight: 400, textTransform: "none", letterSpacing: "normal", marginLeft: "8px" }}>(optionnel)</span>
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.faint, marginBottom: "16px" }}>
            PDF, images, Word, Excel — max 10 Mo par fichier
          </p>

          {/* Drop zone */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => { e.preventDefault(); dropZoneRef.current?.style.setProperty("border-color", colors.gold); }}
            onDragLeave={() => dropZoneRef.current?.style.setProperty("border-color", colors.border)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `1px dashed ${colors.border}`,
              borderRadius: "2px",
              padding: "32px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 300ms ease",
            }}
          >
            <Upload size={24} strokeWidth={1.5} style={{ color: colors.faint, margin: "0 auto 8px", display: "block" }} />
            <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: "0 0 4px" }}>
              Glissez-deposez vos fichiers ici
            </p>
            <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, margin: 0 }}>
              ou cliquez pour parcourir
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
              style={{ display: "none" }}
              onChange={(e) => handleFileAdd(e.target.files)}
            />
          </div>

          {/* File list */}
          {attachedFiles.length > 0 && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {attachedFiles.map((file, index) => (
                <div key={index} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: colors.surfaceRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "2px",
                  padding: "10px 14px",
                }}>
                  {getFileIcon(file.type)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                    <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, margin: 0 }}>{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: colors.faint, transition: "color 300ms ease", flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = colors.destructive; }}
                    onMouseLeave={e => { e.currentTarget.style.color = colors.faint; }}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, textAlign: "right", margin: 0 }}>
                {attachedFiles.length} fichier{attachedFiles.length > 1 ? "s" : ""} selectionne{attachedFiles.length > 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Upload progress */}
          {uploadingDocs && (
            <div style={{
              marginTop: "16px",
              background: colors.surfaceRaised,
              border: `1px solid ${colors.border}`,
              borderRadius: "2px",
              padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" style={{ color: colors.gold }} />
                <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>
                  Envoi des pieces jointes... ({uploadProgress.done}/{uploadProgress.total})
                </span>
              </div>
              <div style={{ height: "2px", background: colors.border, borderRadius: "1px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: colors.gold,
                  width: `${uploadProgress.total > 0 ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%`,
                  transition: "width 300ms ease",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Soumis par */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: fonts.body,
          fontSize: "12px",
          color: colors.faint,
          marginBottom: "20px",
          paddingLeft: "4px",
        }}>
          <span>Soumis par :</span>
          <span style={{ color: colors.muted, fontWeight: 500 }}>{user?.name ?? user?.email ?? "—"}</span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "14px",
            background: isSubmitting ? colors.goldMuted : colors.gold,
            color: colors.bg,
            border: "none",
            borderRadius: "2px",
            fontFamily: fonts.body,
            fontSize: "11px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
            transition: "opacity 300ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {isSubmitting ? (
            <><Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> {uploadingDocs ? "Envoi des fichiers..." : "Envoi en cours..."}</>
          ) : (
            <>Envoyer la demande {attachedFiles.length > 0 ? `+ ${attachedFiles.length} fichier${attachedFiles.length > 1 ? "s" : ""}` : ""}</>
          )}
        </button>
      </form>
    </div>
  );
}

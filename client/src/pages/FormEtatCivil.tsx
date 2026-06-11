import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, ChevronLeft, Upload, User, Users, Heart, AlertCircle, Globe, Loader2 } from "lucide-react";

const SIGMA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/sigma-logo_004dfdd3.png";

const formSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  nomJeuneFille: z.string().optional(),
  prenoms: z.string().min(1, "Les prénoms sont requis"),
  profession: z.string().optional(),
  dateNaissance: z.string().optional(),
  lieuNaissance: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  telephoneDomicile: z.string().optional(),
  telephoneTravail: z.string().optional(),
  telephonePortable: z.string().optional(),
  email: z.string().optional(),
  conjointNom: z.string().optional(),
  conjointNomJeuneFille: z.string().optional(),
  conjointPrenoms: z.string().optional(),
  conjointProfession: z.string().optional(),
  conjointDateNaissance: z.string().optional(),
  conjointLieuNaissance: z.string().optional(),
  conjointAdresse: z.string().optional(),
  conjointTelephoneDomicile: z.string().optional(),
  conjointTelephoneTravail: z.string().optional(),
  conjointTelephonePortable: z.string().optional(),
  conjointEmail: z.string().optional(),
  communeMariage: z.string().optional(),
  dateMariage: z.string().optional(),
  contratMariage: z.boolean().optional(),
  regimeMatrimonial: z.string().optional(),
  regimeMatrimonialType: z.enum(["communaute_reduite_acquets", "communaute_universelle", "separation_biens", "participation_acquets", "autre"]).optional(),
  projetSeulOuDeux: z.enum(["seul", "a_deux"]).optional(),
  notaireContratNom: z.string().optional(),
  notaireContratLieu: z.string().optional(),
  notaireContratDate: z.string().optional(),
  changementRegime: z.boolean().optional(),
  nouveauRegime: z.string().optional(),
  notaireChangementNom: z.string().optional(),
  notaireChangementLieu: z.string().optional(),
  notaireChangementDate: z.string().optional(),
  tribunalHomologation: z.string().optional(),
  dateHomologation: z.string().optional(),
  situationFamiliale: z.enum(["celibataire", "marie", "divorce", "instance_divorce", "pacs", "veuf"]).optional(),
  avocatNomAdresse: z.string().optional(),
  tribunalDivorce: z.string().optional(),
  dateDivorce: z.string().optional(),
  exConjointNomPrenom: z.string().optional(),
  datePacs: z.string().optional(),
  partenairePacs: z.string().optional(),
  nationalite: z.enum(["francais", "francais_etranger", "etranger"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, label: "Identite", icon: User },
  { id: 2, label: "Conjoint", icon: Users },
  { id: 3, label: "Mariage", icon: Heart },
  { id: 4, label: "Situation", icon: AlertCircle },
  { id: 5, label: "Nationalite", icon: Globe },
];

/* ── Shared inline style objects ── */

const fonts = {
  heading: "'Cormorant Garamond', serif",
  body: "'Hanken Grotesk', sans-serif",
};

const colors = {
  bg: "#0A0A0A",
  surface: "#111111",
  surfaceRaised: "#161616",
  border: "#1E1E1E",
  fg: "#F0EDE6",
  muted: "#6B6560",
  faint: "#3A3632",
  gold: "#C9A84C",
  goldMuted: "#8A7535",
  destructive: "#A04040",
  success: "#4A7A5A",
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "none" as const,
};

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: colors.destructive,
  fontFamily: fonts.body,
  marginTop: "4px",
};

/* ── Sub-components (visual only) ── */

function SigmaInput({ label, error, required, ...props }: { label: string; error?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: colors.gold, marginLeft: "4px" }}>*</span>}
      </label>
      <input
        {...props}
        style={{
          ...inputStyle,
          borderColor: error ? colors.destructive : colors.border,
        }}
        onFocus={e => { e.target.style.borderColor = error ? colors.destructive : colors.gold; }}
        onBlur={e => { e.target.style.borderColor = error ? colors.destructive : colors.border; }}
        placeholder={props.placeholder}
      />
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

function SigmaSelect({ label, error, required, children, ...props }: { label: string; error?: string; required?: boolean } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: colors.gold, marginLeft: "4px" }}>*</span>}
      </label>
      <select
        {...props}
        style={{
          ...selectStyle,
          borderColor: error ? colors.destructive : colors.border,
        }}
        onFocus={e => { e.target.style.borderColor = error ? colors.destructive : colors.gold; }}
        onBlur={e => { e.target.style.borderColor = error ? colors.destructive : colors.border; }}
      >
        {children}
      </select>
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

function SigmaTextarea({ label, error, required, ...props }: { label: string; error?: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: colors.gold, marginLeft: "4px" }}>*</span>}
      </label>
      <textarea
        {...props}
        rows={3}
        style={{
          ...textareaStyle,
          borderColor: error ? colors.destructive : colors.border,
        }}
        onFocus={e => { e.target.style.borderColor = error ? colors.destructive : colors.gold; }}
        onBlur={e => { e.target.style.borderColor = error ? colors.destructive : colors.border; }}
      />
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "32px 0 24px" }}>
      <div style={{ flex: 1, height: "1px", background: colors.border }} />
      <span style={{
        fontFamily: fonts.body,
        fontSize: "10px",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: colors.muted,
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: "1px", background: colors.border }} />
    </div>
  );
}

export default function FormEtatCivil() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [consentementRgpd, setConsentementRgpd] = useState(false);
  const [rgpdError, setRgpdError] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { situationFamiliale: "celibataire", nationalite: "francais", contratMariage: false, changementRegime: false },
  });

  const submitMutation = trpc.leads.submit.useMutation();
  const uploadMutation = trpc.documents.getUploadUrl.useMutation();

  const situationFamiliale = watch("situationFamiliale");
  const contratMariage = watch("contratMariage");
  const changementRegime = watch("changementRegime");
  const regimeMatrimonialType = watch("regimeMatrimonialType");
  const nationalite = watch("nationalite");
  const nomValue = watch("nom");
  const prenomsValue = watch("prenoms");
  const emailValue = watch("email");
  const telephoneValue = watch("telephonePortable");

  const onSubmit = async (data: FormData) => {
    if (!consentementRgpd) { setRgpdError(true); return; }
    setRgpdError(false);
    try {
      const result = await submitMutation.mutateAsync(data);
      setLeadId(result.leadId);
      setSubmitted(true);
    } catch (e: any) {
      console.error("Erreur soumission formulaire:", e);
      const msg = e?.data?.zodError ? "Certains champs sont invalides. Vérifiez vos informations et réessayez." : "Une erreur est survenue. Veuillez réessayer ou contacter notre équipe.";
      toast.error(msg, { duration: 6000 });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "cni" | "passeport" | "titre_sejour") => {
    if (!leadId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error("Le fichier ne doit pas dépasser 10 Mo."); return; }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadMutation.mutateAsync({ leadId, filename: file.name, mimeType: file.type, type, fileBase64: base64, size: file.size });
        setUploadedFiles(prev => [...prev, { name: file.name, type }]);
        toast.success(`Document "${file.name}" uploadé avec succès.`);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erreur lors de l'upload du document.");
      setUploading(false);
    }
  };

  /* ── Success / Upload screen ── */
  if (submitted && leadId) {
    return (
      <div style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}>
        <div style={{ width: "100%", maxWidth: "520px", textAlign: "center" }}>
          <img src={SIGMA_LOGO} alt="Sigma Factory" style={{ height: "40px", margin: "0 auto 48px", display: "block", objectFit: "contain" }} />

          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: "2px",
            padding: "48px 40px",
          }}>
            <CheckCircle size={40} strokeWidth={1.5} style={{ color: colors.gold, margin: "0 auto 20px", display: "block" }} />
            <h2 style={{
              fontFamily: fonts.heading,
              fontSize: "26px",
              fontWeight: 600,
              color: colors.fg,
              letterSpacing: "0.04em",
              marginBottom: "8px",
            }}>
              Fiche recue
            </h2>
            <p style={{
              fontFamily: fonts.body,
              fontSize: "14px",
              color: colors.muted,
              lineHeight: "1.6",
              marginBottom: "36px",
            }}>
              Votre fiche d'etat civil a bien ete enregistree. Notre equipe vous contactera prochainement.
            </p>

            {/* Upload zone */}
            <div style={{
              background: colors.surfaceRaised,
              border: `1px solid ${colors.border}`,
              borderRadius: "2px",
              padding: "28px 24px",
              marginBottom: "24px",
              textAlign: "left",
            }}>
              <p style={{
                ...labelStyle,
                marginBottom: "16px",
              }}>
                Documents a joindre
              </p>
              <p style={{
                fontFamily: fonts.body,
                fontSize: "13px",
                color: colors.muted,
                marginBottom: "20px",
                lineHeight: "1.6",
              }}>
                Vous pouvez des maintenant uploader vos justificatifs d'identite :
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { type: "cni" as const, label: "Carte nationale d'identite (recto-verso)" },
                  { type: "passeport" as const, label: "Passeport (premieres pages)" },
                  { type: "titre_sejour" as const, label: "Titre de sejour (recto-verso)" },
                ].map(({ type, label }) => (
                  <label key={type} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    padding: "10px 12px",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "2px",
                    transition: "border-color 300ms ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.faint; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.border; }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg, margin: 0 }}>{label}</p>
                      {uploadedFiles.find(f => f.type === type) && (
                        <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.gold, margin: "4px 0 0" }}>
                          {uploadedFiles.find(f => f.type === type)?.name}
                        </p>
                      )}
                    </div>
                    <div style={{ position: "relative" }}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} onChange={(e) => handleFileUpload(e, type)} disabled={uploading} />
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "2px",
                        fontFamily: fonts.body,
                        fontSize: "11px",
                        fontWeight: 500,
                        color: colors.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        transition: "border-color 300ms ease, color 300ms ease",
                      }}>
                        {uploading ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" /> : <Upload size={12} strokeWidth={1.5} />}
                        Uploader
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, margin: 0 }}>
              Formats acceptes : PDF, JPG, PNG — Taille max : 10 Mo
            </p>
          </div>

          {/* Mandat link */}
          <div style={{
            marginTop: "32px",
            padding: "28px 24px",
            border: `1px solid ${colors.border}`,
            borderRadius: "2px",
            background: colors.surface,
            textAlign: "left",
          }}>
            <p style={{ ...labelStyle, marginBottom: "8px" }}>
              Completer votre dossier
            </p>
            <p style={{
              fontFamily: fonts.body,
              fontSize: "13px",
              color: colors.muted,
              lineHeight: "1.6",
              margin: "0 0 20px",
            }}>
              Souhaitez-vous egalement remplir un <span style={{ color: colors.fg }}>Mandat de Recherche</span> pour que notre equipe commence a chercher votre bien ?
            </p>
            <a
              href={`/mandat?leadId=${leadId}&nom=${encodeURIComponent(nomValue ?? "")}&prenoms=${encodeURIComponent(prenomsValue ?? "")}&email=${encodeURIComponent(emailValue ?? "")}&telephone=${encodeURIComponent(telephoneValue ?? "")}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
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
                transition: "opacity 300ms ease",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Remplir mon Mandat de Recherche
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${colors.border}`,
        background: colors.bg,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <img src={SIGMA_LOGO} alt="Sigma Factory" style={{ height: "32px", objectFit: "contain" }} />
          <p style={{
            fontFamily: fonts.body,
            fontSize: "10px",
            fontWeight: 500,
            color: colors.faint,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: 0,
          }}>
            Fiche d'etat civil
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{
            fontFamily: fonts.heading,
            fontSize: "32px",
            fontWeight: 700,
            color: colors.fg,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "0 0 6px",
            lineHeight: 1.1,
          }}>
            Fiche de Renseignements
          </h1>
          <p style={{
            fontFamily: fonts.heading,
            fontSize: "18px",
            fontWeight: 400,
            color: colors.muted,
            letterSpacing: "0.04em",
            margin: "0 0 12px",
          }}>
            D'Etat Civil
          </p>
          <div style={{ width: "40px", height: "1px", background: colors.gold, margin: "0 auto 16px" }} />
          <p style={{
            fontFamily: fonts.body,
            fontSize: "12px",
            color: colors.faint,
            letterSpacing: "0.02em",
            margin: 0,
          }}>
            Toutes vos informations sont traitees de maniere strictement confidentielle.
          </p>
        </div>

        {/* Stepper */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "40px",
          gap: "0",
        }}>
          {STEPS.map((step, i) => {
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "48px" }}>
                  <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${isActive ? colors.gold : isDone ? colors.goldMuted : colors.border}`,
                    background: isActive ? colors.gold : "transparent",
                    transition: "all 300ms ease",
                  }}>
                    {isDone ? (
                      <CheckCircle size={14} strokeWidth={1.5} style={{ color: colors.goldMuted }} />
                    ) : (
                      <step.icon size={14} strokeWidth={1.5} style={{ color: isActive ? colors.bg : colors.faint }} />
                    )}
                  </div>
                  <span style={{
                    fontFamily: fonts.body,
                    fontSize: "9px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: isActive ? colors.fg : isDone ? colors.muted : colors.faint,
                    transition: "color 300ms ease",
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: "1px",
                    margin: "0 8px",
                    marginBottom: "20px",
                    background: isDone ? colors.goldMuted : colors.border,
                    transition: "background 300ms ease",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: "2px",
            padding: "40px 36px",
          }}>

            {/* STEP 1 — IDENTITY */}
            {currentStep === 1 && (
              <div>
                <SectionTitle>Vous concernant</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <SigmaInput label="Nom" required placeholder="Nom de famille" error={errors.nom?.message} {...register("nom")} />
                  <SigmaInput label="Nom de jeune fille" placeholder="Si different du nom actuel" {...register("nomJeuneFille")} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <SigmaInput label="Prenoms" required placeholder="Tous les prenoms dans l'ordre de l'etat civil" error={errors.prenoms?.message} {...register("prenoms")} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <SigmaInput label="Profession" placeholder="Votre profession actuelle" {...register("profession")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <SigmaInput label="Date de naissance" type="date" {...register("dateNaissance")} />
                  <SigmaInput label="Lieu de naissance" placeholder="Ville, departement" {...register("lieuNaissance")} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <SigmaTextarea label="Adresse" placeholder="Numero et rue" {...register("adresse")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "0" }}>
                  <SigmaInput label="Code postal" placeholder="75001" maxLength={10} {...register("codePostal")} />
                  <SigmaInput label="Ville" placeholder="Paris" {...register("ville")} />
                </div>
                <SectionTitle>Coordonnees</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <SigmaInput label="Telephone domicile" type="tel" placeholder="01 XX XX XX XX" {...register("telephoneDomicile")} />
                  <SigmaInput label="Telephone travail" type="tel" placeholder="01 XX XX XX XX" {...register("telephoneTravail")} />
                  <SigmaInput label="Telephone portable" type="tel" placeholder="06 XX XX XX XX" {...register("telephonePortable")} />
                  <SigmaInput label="Adresse e-mail" type="email" placeholder="votre@email.com" {...register("email")} />
                </div>
              </div>
            )}

            {/* STEP 2 — SPOUSE */}
            {currentStep === 2 && (
              <div>
                <SectionTitle>Conjoint(e)</SectionTitle>
                <p style={{
                  fontFamily: fonts.body,
                  fontSize: "13px",
                  color: colors.muted,
                  lineHeight: "1.6",
                  margin: "0 0 20px",
                }}>
                  Remplissez cette section uniquement si vous etes marie(e) ou pacse(e).
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <SigmaInput label="Nom" placeholder="Nom de famille du conjoint" {...register("conjointNom")} />
                  <SigmaInput label="Nom de jeune fille" placeholder="Si different" {...register("conjointNomJeuneFille")} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <SigmaInput label="Prenoms" placeholder="Tous les prenoms dans l'ordre de l'etat civil" {...register("conjointPrenoms")} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <SigmaInput label="Profession" placeholder="Profession du conjoint" {...register("conjointProfession")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <SigmaInput label="Date de naissance" type="date" {...register("conjointDateNaissance")} />
                  <SigmaInput label="Lieu de naissance" placeholder="Ville, departement" {...register("conjointLieuNaissance")} />
                </div>
                <div style={{ marginBottom: "0" }}>
                  <SigmaTextarea label="Adresse" placeholder="Adresse complete (si differente de la votre)" {...register("conjointAdresse")} />
                </div>
                <SectionTitle>Coordonnees du conjoint</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <SigmaInput label="Telephone domicile" type="tel" {...register("conjointTelephoneDomicile")} />
                  <SigmaInput label="Telephone travail" type="tel" {...register("conjointTelephoneTravail")} />
                  <SigmaInput label="Telephone portable" type="tel" {...register("conjointTelephonePortable")} />
                  <SigmaInput label="Adresse e-mail" type="email" {...register("conjointEmail")} />
                </div>
              </div>
            )}

            {/* STEP 3 — MARRIAGE */}
            {currentStep === 3 && (
              <div>
                <SectionTitle>Informations sur le mariage</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                  <SigmaInput label="Commune du mariage" placeholder="Ville ou le mariage a ete celebre" {...register("communeMariage")} />
                  <SigmaInput label="Date du mariage" type="date" {...register("dateMariage")} />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <SigmaSelect label="Regime matrimonial" {...register("regimeMatrimonialType")}>
                    <option value="">-- Selectionner un regime --</option>
                    <option value="communaute_reduite_acquets">Communaute reduite aux acquets (regime legal)</option>
                    <option value="communaute_universelle">Communaute universelle</option>
                    <option value="separation_biens">Separation de biens</option>
                    <option value="participation_acquets">Participation aux acquets</option>
                    <option value="autre">Autre regime</option>
                  </SigmaSelect>

                  {regimeMatrimonialType === "separation_biens" && (
                    <div style={{
                      background: colors.surfaceRaised,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "2px",
                      padding: "20px",
                      marginTop: "16px",
                    }}>
                      <p style={{
                        fontFamily: fonts.body,
                        fontSize: "13px",
                        color: colors.fg,
                        margin: "0 0 12px",
                      }}>
                        Dans le cadre de votre projet immobilier, vous investissez :
                      </p>
                      <div style={{ display: "flex", gap: "24px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                          <input type="radio" value="seul" {...register("projetSeulOuDeux")} style={{ accentColor: colors.gold }} />
                          <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg }}>Seul(e)</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                          <input type="radio" value="a_deux" {...register("projetSeulOuDeux")} style={{ accentColor: colors.gold }} />
                          <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg }}>A deux (avec mon conjoint)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {regimeMatrimonialType === "autre" && (
                    <div style={{ marginTop: "16px" }}>
                      <SigmaInput label="Precisez le regime" placeholder="Decrivez votre regime matrimonial" {...register("regimeMatrimonial")} />
                    </div>
                  )}
                </div>

                <div style={{
                  background: colors.surfaceRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "2px",
                  padding: "16px 20px",
                  marginBottom: "20px",
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                    <input type="checkbox" {...register("contratMariage")} style={{ accentColor: colors.gold }} />
                    <span style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: 500, color: colors.fg }}>Existence d'un contrat de mariage</span>
                  </label>
                </div>

                {contratMariage && (
                  <div style={{
                    paddingLeft: "20px",
                    borderLeft: `1px solid ${colors.border}`,
                    marginBottom: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}>
                    <SigmaInput label="Nom du notaire ayant redige le contrat" {...register("notaireContratNom")} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <SigmaInput label="Lieu de l'etude" placeholder="Ville du notaire" {...register("notaireContratLieu")} />
                      <SigmaInput label="Date du contrat" type="date" {...register("notaireContratDate")} />
                    </div>
                  </div>
                )}

                <SectionTitle>Changement de regime matrimonial</SectionTitle>
                <div style={{
                  background: colors.surfaceRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "2px",
                  padding: "16px 20px",
                  marginBottom: "20px",
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                    <input type="checkbox" {...register("changementRegime")} style={{ accentColor: colors.gold }} />
                    <span style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: 500, color: colors.fg }}>Changement de regime matrimonial</span>
                  </label>
                </div>

                {changementRegime && (
                  <div style={{
                    paddingLeft: "20px",
                    borderLeft: `1px solid ${colors.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}>
                    <SigmaInput label="Nouveau regime adopte" {...register("nouveauRegime")} />
                    <SigmaInput label="Nom du notaire ayant redige l'acte" {...register("notaireChangementNom")} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <SigmaInput label="Lieu de l'etude" {...register("notaireChangementLieu")} />
                      <SigmaInput label="Date de l'acte" type="date" {...register("notaireChangementDate")} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <SigmaInput label="Tribunal Judiciaire (homologation)" {...register("tribunalHomologation")} />
                      <SigmaInput label="Date du jugement d'homologation" type="date" {...register("dateHomologation")} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 — FAMILY STATUS */}
            {currentStep === 4 && (
              <div>
                <SectionTitle>Situation familiale</SectionTitle>
                <div style={{ marginBottom: "20px" }}>
                  <SigmaSelect label="Votre situation actuelle" {...register("situationFamiliale")}>
                    <option value="celibataire">Celibataire</option>
                    <option value="marie">Marie(e)</option>
                    <option value="divorce">Divorce(e)</option>
                    <option value="instance_divorce">En instance de divorce</option>
                    <option value="pacs">Lie(e) par un PACS</option>
                    <option value="veuf">Veuf / Veuve</option>
                  </SigmaSelect>
                </div>

                {situationFamiliale === "instance_divorce" && (
                  <div style={{
                    paddingLeft: "20px",
                    borderLeft: `1px solid ${colors.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}>
                    <SectionTitle>Instance de divorce</SectionTitle>
                    <SigmaTextarea label="Nom et adresse de votre avocat" placeholder="Maitre ..., adresse complete" {...register("avocatNomAdresse")} />
                  </div>
                )}

                {situationFamiliale === "divorce" && (
                  <div style={{
                    paddingLeft: "20px",
                    borderLeft: `1px solid ${colors.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}>
                    <SectionTitle>Informations sur le divorce</SectionTitle>
                    <SigmaInput label="Tribunal Judiciaire de" placeholder="Ville du tribunal" {...register("tribunalDivorce")} />
                    <SigmaInput label="Date du jugement de divorce" type="date" {...register("dateDivorce")} />
                    <SigmaInput label="Nom et prenom de l'ex-conjoint(e)" {...register("exConjointNomPrenom")} />
                  </div>
                )}

                {situationFamiliale === "pacs" && (
                  <div style={{
                    paddingLeft: "20px",
                    borderLeft: `1px solid ${colors.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}>
                    <SectionTitle>PACS</SectionTitle>
                    <SigmaInput label="Date du PACS" type="date" {...register("datePacs")} />
                    <SigmaInput label="Nom du/de la partenaire" {...register("partenairePacs")} />
                  </div>
                )}
              </div>
            )}

            {/* STEP 5 — NATIONALITY */}
            {currentStep === 5 && (
              <div>
                <SectionTitle>Nationalite</SectionTitle>
                <div style={{ marginBottom: "20px" }}>
                  <SigmaSelect label="Votre situation" {...register("nationalite")}>
                    <option value="francais">Francais(e) residant en France</option>
                    <option value="francais_etranger">Francais(e) residant a l'etranger</option>
                    <option value="etranger">Ressortissant(e) etranger(ere)</option>
                  </SigmaSelect>
                </div>

                {nationalite === "francais_etranger" && (
                  <div style={{
                    background: colors.surfaceRaised,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "2px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}>
                    <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0, lineHeight: "1.6" }}>
                      <span style={{ color: colors.gold, fontWeight: 500 }}>Document requis :</span> Joindre une photocopie de votre carte nationale d'identite ou passeport.
                    </p>
                  </div>
                )}

                {nationalite === "etranger" && (
                  <div style={{
                    background: colors.surfaceRaised,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "2px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}>
                    <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0, lineHeight: "1.6" }}>
                      <span style={{ color: colors.gold, fontWeight: 500 }}>Document requis :</span> Joindre une photocopie de votre titre de sejour (recto-verso).
                    </p>
                  </div>
                )}

                <div style={{
                  background: colors.surfaceRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "2px",
                  padding: "24px",
                  marginTop: "24px",
                }}>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Recapitulatif</p>
                  <p style={{
                    fontFamily: fonts.body,
                    fontSize: "13px",
                    color: colors.muted,
                    lineHeight: "1.6",
                    margin: 0,
                  }}>
                    En cliquant sur "Soumettre ma fiche", vous confirmez que les informations renseignees sont exactes et completes. Vos donnees sont traitees de maniere strictement confidentielle par Sigma Factory.
                  </p>
                </div>
              </div>
            )}

            {/* RGPD consent — last step only */}
            {currentStep === STEPS.length && (
              <div style={{
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: `1px solid ${colors.border}`,
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={consentementRgpd}
                    onChange={e => { setConsentementRgpd(e.target.checked); if (e.target.checked) setRgpdError(false); }}
                    style={{ accentColor: colors.gold, marginTop: "2px", flexShrink: 0 }}
                  />
                  <span style={{
                    fontFamily: fonts.body,
                    fontSize: "12px",
                    color: colors.muted,
                    lineHeight: "1.6",
                  }}>
                    J'accepte que mes donnees personnelles soient traitees par Sigma Factory dans le cadre de ma demande, conformement a la{" "}
                    <a href="/politique-confidentialite" target="_blank" rel="noreferrer" style={{ color: colors.gold, textDecoration: "underline" }}>politique de confidentialite</a>.
                  </span>
                </label>
                {rgpdError && <p style={{ color: colors.destructive, fontSize: "12px", fontFamily: fonts.body, marginTop: "8px", marginLeft: "28px" }}>Vous devez accepter la politique de confidentialite pour continuer.</p>}
              </div>
            )}

            {/* Navigation */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: `1px solid ${colors.border}`,
            }}>
              <button
                type="button"
                onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                disabled={currentStep === 1}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "12px 20px",
                  background: "transparent",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "2px",
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  fontWeight: 500,
                  color: currentStep === 1 ? colors.faint : colors.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  cursor: currentStep === 1 ? "not-allowed" : "pointer",
                  opacity: currentStep === 1 ? 0.4 : 1,
                  transition: "all 300ms ease",
                }}
              >
                <ChevronLeft size={14} strokeWidth={1.5} /> Precedent
              </button>

              <span style={{
                fontFamily: fonts.body,
                fontSize: "11px",
                color: colors.faint,
                letterSpacing: "0.04em",
              }}>
                {currentStep} / {STEPS.length}
              </span>

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(s => Math.min(STEPS.length, s + 1))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "12px 24px",
                    background: "transparent",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "2px",
                    fontFamily: fonts.body,
                    fontSize: "11px",
                    fontWeight: 500,
                    color: colors.fg,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    transition: "all 300ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; }}
                >
                  Suivant <ChevronRight size={14} strokeWidth={1.5} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 28px",
                    background: isSubmitting ? colors.goldMuted : colors.gold,
                    border: "none",
                    borderRadius: "2px",
                    fontFamily: fonts.body,
                    fontSize: "11px",
                    fontWeight: 500,
                    color: colors.bg,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: "opacity 300ms ease",
                  }}
                >
                  {isSubmitting ? <><Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> Envoi en cours...</> : <><CheckCircle size={14} strokeWidth={1.5} /> Soumettre ma fiche</>}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: "center",
          marginTop: "48px",
          fontFamily: fonts.body,
          fontSize: "10px",
          color: colors.border,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          Document confidentiel — Sigma Factory
        </p>
      </div>
    </div>
  );
}

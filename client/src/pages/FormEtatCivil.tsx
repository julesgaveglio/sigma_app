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
  { id: 1, label: "Identité", icon: User },
  { id: 2, label: "Conjoint", icon: Users },
  { id: 3, label: "Mariage", icon: Heart },
  { id: 4, label: "Situation", icon: AlertCircle },
  { id: 5, label: "Nationalité", icon: Globe },
];

function SigmaInput({ label, error, required, ...props }: { label: string; error?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-[var(--gold)] ml-1">*</span>}
      </label>
      <input
        {...props}
        className={`bg-[oklch(0.16_0.005_280)] border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${error ? "border-destructive focus:ring-destructive/30" : "border-border focus:border-[var(--gold)] focus:ring-[var(--gold)]/20"}`}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SigmaSelect({ label, error, required, children, ...props }: { label: string; error?: string; required?: boolean } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-[var(--gold)] ml-1">*</span>}
      </label>
      <select
        {...props}
        className={`bg-[oklch(0.16_0.005_280)] border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 transition-all ${error ? "border-destructive focus:ring-destructive/30" : "border-border focus:border-[var(--gold)] focus:ring-[var(--gold)]/20"}`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SigmaTextarea({ label, error, required, ...props }: { label: string; error?: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-[var(--gold)] ml-1">*</span>}
      </label>
      <textarea
        {...props}
        rows={3}
        className={`bg-[oklch(0.16_0.005_280)] border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all resize-none ${error ? "border-destructive focus:ring-destructive/30" : "border-border focus:border-[var(--gold)] focus:ring-[var(--gold)]/20"}`}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-border" />
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--gold)]">{children}</h3>
      <div className="h-px flex-1 bg-border" />
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

  if (submitted && leadId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg text-center">
          <img src={SIGMA_LOGO} alt="Sigma Factory" className="h-16 mx-auto mb-8 object-contain" />
          <div className="bg-card border border-border rounded-2xl p-8">
            <CheckCircle className="w-16 h-16 text-[var(--gold)] mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-2">Fiche reçue !</h2>
            <p className="text-muted-foreground mb-6">Votre fiche d'état civil a bien été enregistrée. Notre équipe vous contactera prochainement.</p>

            <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-5 mb-6 text-left">
              <p className="text-sm font-semibold text-[var(--gold)] mb-3 uppercase tracking-wider">Documents à joindre</p>
              <p className="text-sm text-muted-foreground mb-4">Vous pouvez dès maintenant uploader vos justificatifs d'identité :</p>
              <div className="space-y-3">
                {[
                  { type: "cni" as const, label: "Carte nationale d'identité (recto-verso)" },
                  { type: "passeport" as const, label: "Passeport (premières pages)" },
                  { type: "titre_sejour" as const, label: "Titre de séjour (recto-verso)" },
                ].map(({ type, label }) => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <div className="flex-1">
                      <p className="text-sm text-foreground/80">{label}</p>
                      {uploadedFiles.find(f => f.type === type) && (
                        <p className="text-xs text-[var(--gold)]">✓ {uploadedFiles.find(f => f.type === type)?.name}</p>
                      )}
                    </div>
                    <div className="relative">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => handleFileUpload(e, type)} disabled={uploading} />
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--gold)]/40 text-[var(--gold)] text-xs group-hover:bg-[var(--gold)]/10 transition-colors">
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Uploader
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Formats acceptés : PDF, JPG, PNG — Taille max : 10 Mo</p>
          </div>

          {/* Lien vers le Mandat de Recherche */}
          <div className="mt-6 p-5 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5">
            <p className="text-sm font-semibold text-[var(--gold)] mb-2">Compléter votre dossier</p>
            <p className="text-sm text-muted-foreground mb-4">Souhaitez-vous également remplir un <strong className="text-foreground">Mandat de Recherche</strong> pour que notre équipe commence à chercher votre bien ?</p>
            <a
              href={`/mandat?leadId=${leadId}&nom=${encodeURIComponent(nomValue ?? "")}&prenoms=${encodeURIComponent(prenomsValue ?? "")}&email=${encodeURIComponent(emailValue ?? "")}&telephone=${encodeURIComponent(telephoneValue ?? "")}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition"
              style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)", color: "#0f0f0f" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Remplir mon Mandat de Recherche
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <img src={SIGMA_LOGO} alt="Sigma Factory" className="h-10 object-contain" />
          <p className="text-xs text-muted-foreground hidden sm:block">Fiche d'état civil — Confidentiel</p>
        </div>
      </div>

      <div className="container py-8 max-w-3xl mx-auto">
        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Fiche de Renseignements</h1>
          <p className="text-[var(--gold)] text-lg font-medium tracking-wide">D'État Civil</p>
          <p className="text-muted-foreground text-sm mt-2">Toutes vos informations sont traitées de manière strictement confidentielle.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isActive ? "bg-[var(--gold)] text-[oklch(0.08_0.005_280)] shadow-lg shadow-[var(--gold)]/30" : isDone ? "bg-[var(--gold-dark)] text-[oklch(0.08_0.005_280)]" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? "text-[var(--gold)] font-semibold" : isDone ? "text-[var(--gold-dark)]" : "text-muted-foreground"}`}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${isDone ? "bg-[var(--gold-dark)]" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">

            {/* ÉTAPE 1 — IDENTITÉ */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <SectionTitle>Vous concernant</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Nom" required placeholder="Nom de famille" error={errors.nom?.message} {...register("nom")} />
                  <SigmaInput label="Nom de jeune fille" placeholder="Si différent du nom actuel" {...register("nomJeuneFille")} />
                </div>
                <SigmaInput label="Prénoms" required placeholder="Tous les prénoms dans l'ordre de l'état civil" error={errors.prenoms?.message} {...register("prenoms")} />
                <SigmaInput label="Profession" placeholder="Votre profession actuelle" {...register("profession")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Date de naissance" type="date" {...register("dateNaissance")} />
                  <SigmaInput label="Lieu de naissance" placeholder="Ville, département" {...register("lieuNaissance")} />
                </div>
                <SigmaTextarea label="Adresse" placeholder="Numéro et rue" {...register("adresse")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Code postal" placeholder="75001" maxLength={10} {...register("codePostal")} />
                  <SigmaInput label="Ville" placeholder="Paris" {...register("ville")} />
                </div>
                <SectionTitle>Coordonnées</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Téléphone domicile" type="tel" placeholder="01 XX XX XX XX" {...register("telephoneDomicile")} />
                  <SigmaInput label="Téléphone travail" type="tel" placeholder="01 XX XX XX XX" {...register("telephoneTravail")} />
                  <SigmaInput label="Téléphone portable" type="tel" placeholder="06 XX XX XX XX" {...register("telephonePortable")} />
                  <SigmaInput label="Adresse e-mail" type="email" placeholder="votre@email.com" {...register("email")} />
                </div>
              </div>
            )}

            {/* ÉTAPE 2 — CONJOINT */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <SectionTitle>Conjoint(e)</SectionTitle>
                <p className="text-sm text-muted-foreground -mt-2 mb-4">Remplissez cette section uniquement si vous êtes marié(e) ou pacsé(e).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Nom" placeholder="Nom de famille du conjoint" {...register("conjointNom")} />
                  <SigmaInput label="Nom de jeune fille" placeholder="Si différent" {...register("conjointNomJeuneFille")} />
                </div>
                <SigmaInput label="Prénoms" placeholder="Tous les prénoms dans l'ordre de l'état civil" {...register("conjointPrenoms")} />
                <SigmaInput label="Profession" placeholder="Profession du conjoint" {...register("conjointProfession")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Date de naissance" type="date" {...register("conjointDateNaissance")} />
                  <SigmaInput label="Lieu de naissance" placeholder="Ville, département" {...register("conjointLieuNaissance")} />
                </div>
                <SigmaTextarea label="Adresse" placeholder="Adresse complète (si différente de la vôtre)" {...register("conjointAdresse")} />
                <SectionTitle>Coordonnées du conjoint</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Téléphone domicile" type="tel" {...register("conjointTelephoneDomicile")} />
                  <SigmaInput label="Téléphone travail" type="tel" {...register("conjointTelephoneTravail")} />
                  <SigmaInput label="Téléphone portable" type="tel" {...register("conjointTelephonePortable")} />
                  <SigmaInput label="Adresse e-mail" type="email" {...register("conjointEmail")} />
                </div>
              </div>
            )}

                {/* ÉTAPE 3 — MARIAGE */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <SectionTitle>Informations sur le mariage</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SigmaInput label="Commune du mariage" placeholder="Ville où le mariage a été célébré" {...register("communeMariage")} />
                  <SigmaInput label="Date du mariage" type="date" {...register("dateMariage")} />
                </div>

                {/* Régime matrimonial — visible dès l'étape mariage */}
                <div className="space-y-3">
                  <SigmaSelect label="Régime matrimonial" {...register("regimeMatrimonialType")}>
                    <option value="">— Sélectionner un régime —</option>
                    <option value="communaute_reduite_acquets">Communauté réduite aux acquêts (régime légal)</option>
                    <option value="communaute_universelle">Communauté universelle</option>
                    <option value="separation_biens">Séparation de biens</option>
                    <option value="participation_acquets">Participation aux acquêts</option>
                    <option value="autre">Autre régime</option>
                  </SigmaSelect>

                  {regimeMatrimonialType === "separation_biens" && (
                    <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-4 border border-[var(--gold)]/20">
                      <p className="text-sm font-medium text-foreground mb-3">Dans le cadre de votre projet immobilier, vous investissez :</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value="seul" {...register("projetSeulOuDeux")} className="w-4 h-4 accent-[var(--gold)]" />
                          <span className="text-sm text-foreground">Seul(e)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value="a_deux" {...register("projetSeulOuDeux")} className="w-4 h-4 accent-[var(--gold)]" />
                          <span className="text-sm text-foreground">À deux (avec mon conjoint)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {regimeMatrimonialType === "autre" && (
                    <SigmaInput label="Précisez le régime" placeholder="Décrivez votre régime matrimonial" {...register("regimeMatrimonial")} />
                  )}
                </div>

                <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register("contratMariage")} className="w-4 h-4 accent-[var(--gold)]" />
                    <span className="text-sm font-medium text-foreground">Existence d'un contrat de mariage</span>
                  </label>
                </div>

                {contratMariage && (
                  <div className="space-y-4 pl-4 border-l-2 border-[var(--gold)]/30">
                    <SigmaInput label="Nom du notaire ayant rédigé le contrat" {...register("notaireContratNom")} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SigmaInput label="Lieu de l'étude" placeholder="Ville du notaire" {...register("notaireContratLieu")} />
                      <SigmaInput label="Date du contrat" type="date" {...register("notaireContratDate")} />
                    </div>
                  </div>
                )}

                <SectionTitle>Changement de régime matrimonial</SectionTitle>
                <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register("changementRegime")} className="w-4 h-4 accent-[var(--gold)]" />
                    <span className="text-sm font-medium text-foreground">Changement de régime matrimonial</span>
                  </label>
                </div>

                {changementRegime && (
                  <div className="space-y-4 pl-4 border-l-2 border-[var(--gold)]/30">
                    <SigmaInput label="Nouveau régime adopté" {...register("nouveauRegime")} />
                    <SigmaInput label="Nom du notaire ayant rédigé l'acte" {...register("notaireChangementNom")} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SigmaInput label="Lieu de l'étude" {...register("notaireChangementLieu")} />
                      <SigmaInput label="Date de l'acte" type="date" {...register("notaireChangementDate")} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SigmaInput label="Tribunal Judiciaire (homologation)" {...register("tribunalHomologation")} />
                      <SigmaInput label="Date du jugement d'homologation" type="date" {...register("dateHomologation")} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 4 — SITUATION FAMILIALE */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <SectionTitle>Situation familiale</SectionTitle>
                <SigmaSelect label="Votre situation actuelle" {...register("situationFamiliale")}>
                  <option value="celibataire">Célibataire</option>
                  <option value="marie">Marié(e)</option>
                  <option value="divorce">Divorcé(e)</option>
                  <option value="instance_divorce">En instance de divorce</option>
                  <option value="pacs">Lié(e) par un PACS</option>
                  <option value="veuf">Veuf / Veuve</option>
                </SigmaSelect>

                {situationFamiliale === "instance_divorce" && (
                  <div className="space-y-4 pl-4 border-l-2 border-[var(--gold)]/30">
                    <SectionTitle>Instance de divorce</SectionTitle>
                    <SigmaTextarea label="Nom et adresse de votre avocat" placeholder="Maître ..., adresse complète" {...register("avocatNomAdresse")} />
                  </div>
                )}

                {situationFamiliale === "divorce" && (
                  <div className="space-y-4 pl-4 border-l-2 border-[var(--gold)]/30">
                    <SectionTitle>Informations sur le divorce</SectionTitle>
                    <SigmaInput label="Tribunal Judiciaire de" placeholder="Ville du tribunal" {...register("tribunalDivorce")} />
                    <SigmaInput label="Date du jugement de divorce" type="date" {...register("dateDivorce")} />
                    <SigmaInput label="Nom et prénom de l'ex-conjoint(e)" {...register("exConjointNomPrenom")} />
                  </div>
                )}

                {situationFamiliale === "pacs" && (
                  <div className="space-y-4 pl-4 border-l-2 border-[var(--gold)]/30">
                    <SectionTitle>PACS</SectionTitle>
                    <SigmaInput label="Date du PACS" type="date" {...register("datePacs")} />
                    <SigmaInput label="Nom du/de la partenaire" {...register("partenairePacs")} />
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 5 — NATIONALITÉ */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <SectionTitle>Nationalité</SectionTitle>
                <SigmaSelect label="Votre situation" {...register("nationalite")}>
                  <option value="francais">Français(e) résidant en France</option>
                  <option value="francais_etranger">Français(e) résidant à l'étranger</option>
                  <option value="etranger">Ressortissant(e) étranger(ère)</option>
                </SigmaSelect>

                {nationalite === "francais_etranger" && (
                  <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-4 border border-[var(--gold)]/20">
                    <p className="text-sm text-foreground/80">
                      <span className="text-[var(--gold)] font-semibold">Document requis :</span> Joindre une photocopie de votre carte nationale d'identité ou passeport.
                    </p>
                  </div>
                )}

                {nationalite === "etranger" && (
                  <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-4 border border-[var(--gold)]/20">
                    <p className="text-sm text-foreground/80">
                      <span className="text-[var(--gold)] font-semibold">Document requis :</span> Joindre une photocopie de votre titre de séjour (recto-verso).
                    </p>
                  </div>
                )}

                <div className="bg-[oklch(0.10_0.005_280)] rounded-xl p-5 border border-border mt-4">
                  <p className="text-sm font-semibold text-[var(--gold)] mb-2 uppercase tracking-wider">Récapitulatif</p>
                  <p className="text-sm text-muted-foreground">En cliquant sur "Soumettre ma fiche", vous confirmez que les informations renseignées sont exactes et complètes. Vos données sont traitées de manière strictement confidentielle par Sigma Factory.</p>
                </div>
              </div>
            )}

            {/* RGPD consent — visible uniquement à la dernière étape */}
            {currentStep === STEPS.length && (
              <div className="mt-6 pt-4 border-t border-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentementRgpd}
                    onChange={e => { setConsentementRgpd(e.target.checked); if (e.target.checked) setRgpdError(false); }}
                    className="mt-0.5 w-4 h-4 accent-[var(--gold)] flex-shrink-0"
                  />
                  <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                    J'accepte que mes données personnelles soient traitées par Sigma Factory dans le cadre de ma demande, conformément à la{" "}
                    <a href="/politique-confidentialite" target="_blank" rel="noreferrer" className="text-[var(--gold)] underline">politique de confidentialité</a>.
                  </span>
                </label>
                {rgpdError && <p className="text-red-400 text-xs mt-2 ml-7">Vous devez accepter la politique de confidentialité pour continuer.</p>}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground/70 hover:text-foreground hover:border-[var(--gold)]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>

              <span className="text-xs text-muted-foreground">{currentStep} / {STEPS.length}</span>

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(s => Math.min(STEPS.length, s + 1))}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--gold)] text-[oklch(0.08_0.005_280)] text-sm font-semibold hover:bg-[var(--gold-light)] transition-all shadow-lg shadow-[var(--gold)]/20"
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--gold)] text-[oklch(0.08_0.005_280)] text-sm font-semibold hover:bg-[var(--gold-light)] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--gold)]/20"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</> : <><CheckCircle className="w-4 h-4" /> Soumettre ma fiche</>}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

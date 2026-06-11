import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

type SituationFamiliale = "celibataire" | "marie" | "pacse" | "divorce" | "veuf";

type FormData = {
  montantNegocie: string;
  civilite: string;
  nom: string;
  prenom: string;
  email: string;
  dateNaissance: string;
  situationFamiliale: SituationFamiliale | "";
  profession: string;
  mobile: string;
  fixe: string;
  adresse: string;
  codePostal: string;
  ville: string;
  paysNaissance: string;
  villeNaissance: string;
};

const initialForm: FormData = {
  montantNegocie: "",
  civilite: "",
  nom: "",
  prenom: "",
  email: "",
  dateNaissance: "",
  situationFamiliale: "",
  profession: "",
  mobile: "",
  fixe: "",
  adresse: "",
  codePostal: "",
  ville: "",
  paysNaissance: "France",
  villeNaissance: "",
};

/* ── Design tokens ── */
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

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: colors.destructive,
  fontFamily: fonts.body,
  marginTop: "4px",
};

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
        className="w-full focus:outline-none [color-scheme:dark]"
        onFocus={e => { e.target.style.borderColor = error ? colors.destructive : colors.gold; }}
        onBlur={e => { e.target.style.borderColor = error ? colors.destructive : colors.border; }}
      />
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
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

export default function HexaForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.hexa.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message || "Une erreur est survenue. Veuillez réessayer."),
  });

  const set = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateStep1 = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    const val = parseFloat(form.montantNegocie);
    if (!form.montantNegocie.trim() || isNaN(val) || val < 100) {
      e.montantNegocie = "Veuillez saisir le montant négocié avec votre conseiller";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.nom.trim()) e.nom = "Le nom est requis";
    if (!form.prenom.trim()) e.prenom = "Le prénom est requis";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    if (!form.dateNaissance.trim()) e.dateNaissance = "La date de naissance est requise";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const SITUATIONS: { value: SituationFamiliale; label: string }[] = [
    { value: "celibataire", label: "Célibataire" },
    { value: "marie", label: "Marié(e)" },
    { value: "pacse", label: "Pacsé(e)" },
    { value: "divorce", label: "Divorcé(e)" },
    { value: "veuf", label: "Veuf/Veuve" },
  ];

  const validateStep3 = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.adresse.trim()) e.adresse = "L'adresse est requise";
    if (!form.codePostal.trim()) e.codePostal = "Le code postal est requis";
    if (!form.ville.trim()) e.ville = "La ville est requise";
    if (!form.paysNaissance.trim()) e.paysNaissance = "Le pays de naissance est requis";
    if (!form.villeNaissance.trim()) e.villeNaissance = "La ville de naissance est requise";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validateStep3()) return;
    const montant = parseFloat(form.montantNegocie) || 0;
    submitMutation.mutate({
      civilite: form.civilite as any || undefined,
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      dateNaissance: form.dateNaissance.trim() || undefined,
      situationFamiliale: form.situationFamiliale as any || undefined,
      profession: form.profession.trim() || undefined,
      montant,
      mobile: form.mobile.trim() || undefined,
      fixe: form.fixe.trim() || undefined,
      adresse: form.adresse.trim(),
      codePostal: form.codePostal.trim(),
      ville: form.ville.trim(),
      paysNaissance: form.paysNaissance.trim(),
      villeNaissance: form.villeNaissance.trim(),
    });
  };

  /* ── Confirmation ── */
  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}>
        <div style={{ width: "100%", maxWidth: "520px" }}>
          {/* Wordmark */}
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h1 style={{
              fontFamily: fonts.heading,
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: colors.gold,
              lineHeight: 1,
              marginBottom: "12px",
            }}>
              SIGMA FACTORY
            </h1>
            <div style={{ width: "40px", height: "1px", background: colors.gold, margin: "0 auto" }} />
          </div>

          {/* Card */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: "2px",
            padding: "48px 40px",
            textAlign: "center",
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
              Demande enregistree
            </h2>
            <p style={{
              fontFamily: fonts.body,
              fontSize: "14px",
              color: colors.muted,
              lineHeight: "1.6",
              marginBottom: "32px",
            }}>
              Votre demande a bien ete transmise a notre equipe. Vous allez recevoir sous peu un lien de paiement unique emanant de Hexa Coop, notre partenaire, pour beneficier de notre programme credit d'impot.
            </p>

            <div style={{
              background: colors.surfaceRaised,
              border: `1px solid ${colors.border}`,
              borderRadius: "2px",
              padding: "24px",
              textAlign: "left",
              marginBottom: "24px",
            }}>
              <p style={{ ...labelStyle, marginBottom: "16px" }}>Recapitulatif</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontFamily: fonts.body }}>
                  <span style={{ color: colors.muted }}>Nom</span>
                  <span style={{ color: colors.fg, fontWeight: 500 }}>{form.civilite ? `${form.civilite} ` : ""}{form.prenom} {form.nom}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontFamily: fonts.body }}>
                  <span style={{ color: colors.muted }}>Email</span>
                  <span style={{ color: colors.fg }}>{form.email}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontFamily: fonts.body }}>
                  <span style={{ color: colors.muted }}>Montant</span>
                  <span style={{ color: colors.gold, fontWeight: 600 }}>{parseFloat(form.montantNegocie).toLocaleString("fr-FR")} EUR</span>
                </div>
              </div>
            </div>

            <div style={{
              background: colors.surfaceRaised,
              border: `1px solid ${colors.border}`,
              borderRadius: "2px",
              padding: "20px",
              textAlign: "left",
            }}>
              <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, lineHeight: "1.7", margin: 0 }}>
                Le paiement doit etre initie par carte ou virement dans les 24h suivant l'envoi du lien. Vous recevrez des reception du paiement une attestation — le reste est automatique et ne necessite aucune action de votre part.
              </p>
            </div>
          </div>

          <p style={{
            textAlign: "center",
            marginTop: "40px",
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

  /* ── Main form ── */
  const STEPS = [
    { id: 1, label: "Montant" },
    { id: 2, label: "Identite" },
    { id: 3, label: "Adresse" },
  ];

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
          maxWidth: "640px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h1 style={{
            fontFamily: fonts.heading,
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: colors.gold,
            margin: 0,
          }}>
            SIGMA FACTORY
          </h1>
          <p style={{
            fontFamily: fonts.body,
            fontSize: "10px",
            fontWeight: 500,
            color: colors.faint,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: 0,
          }}>
            Credit d'impot — Confidentiel
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "48px 24px" }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{
            fontFamily: fonts.heading,
            fontSize: "28px",
            fontWeight: 700,
            color: colors.fg,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "0 0 6px",
            lineHeight: 1.1,
          }}>
            Montant & Identite
          </h2>
          <div style={{ width: "40px", height: "1px", background: colors.gold, margin: "12px auto 16px" }} />
          <p style={{
            fontFamily: fonts.body,
            fontSize: "12px",
            color: colors.faint,
            letterSpacing: "0.02em",
            margin: 0,
          }}>
            Vos donnees sont protegees et traitees de maniere strictement confidentielle.
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
          {STEPS.map((s, i) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
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
                    fontFamily: fonts.body,
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isActive ? colors.bg : isDone ? colors.goldMuted : colors.faint,
                  }}>
                    {isDone ? (
                      <CheckCircle size={14} strokeWidth={1.5} style={{ color: colors.goldMuted }} />
                    ) : s.id}
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
                    {s.label}
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
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "2px",
          padding: "40px 36px",
        }}>

          {/* Step 1 — Montant */}
          {step === 1 && (
            <div>
              <SectionDivider>Montant de l'accompagnement</SectionDivider>
              <p style={{
                fontFamily: fonts.body,
                fontSize: "13px",
                color: colors.muted,
                lineHeight: "1.6",
                margin: "0 0 24px",
              }}>
                Renseignez le montant de votre accompagnement.
              </p>
              <SigmaInput
                label="Montant (EUR)"
                required
                type="number"
                min={100}
                step={1}
                value={form.montantNegocie}
                onChange={e => set("montantNegocie", e.target.value)}
                placeholder="Ex : 5000"
                error={errors.montantNegocie}
              />
            </div>
          )}

          {/* Step 2 — Identite */}
          {step === 2 && (
            <div>
              <SectionDivider>Informations personnelles</SectionDivider>
              <p style={{
                fontFamily: fonts.body,
                fontSize: "13px",
                color: colors.muted,
                lineHeight: "1.6",
                margin: "0 0 24px",
              }}>
                Ces informations permettent de constituer votre dossier.
              </p>

              {/* Civilite */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Civilite</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["M.", "Mme", "Mme M.", "M. Mme"].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("civilite", form.civilite === c ? "" : c)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "2px",
                        fontSize: "12px",
                        fontWeight: 500,
                        fontFamily: fonts.body,
                        letterSpacing: "0.04em",
                        border: `1px solid ${form.civilite === c ? colors.gold : colors.border}`,
                        background: form.civilite === c ? colors.gold : "transparent",
                        color: form.civilite === c ? colors.bg : colors.muted,
                        cursor: "pointer",
                        transition: "all 300ms ease",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <SigmaInput label="Nom" required value={form.nom} onChange={e => set("nom", e.target.value)} placeholder="Dupont" error={errors.nom} />
                <SigmaInput label="Prenom" required value={form.prenom} onChange={e => set("prenom", e.target.value)} placeholder="Jean" error={errors.prenom} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <SigmaInput label="Email" required type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jean.dupont@email.com" error={errors.email} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <SigmaInput label="Date de naissance" required type="date" value={form.dateNaissance} onChange={e => set("dateNaissance", e.target.value)} error={errors.dateNaissance} />
              </div>

              {/* Situation familiale */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Situation familiale</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {SITUATIONS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set("situationFamiliale", form.situationFamiliale === s.value ? "" : s.value)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "2px",
                        fontSize: "12px",
                        fontWeight: 500,
                        fontFamily: fonts.body,
                        letterSpacing: "0.04em",
                        border: `1px solid ${form.situationFamiliale === s.value ? colors.gold : colors.border}`,
                        background: form.situationFamiliale === s.value ? colors.gold : "transparent",
                        color: form.situationFamiliale === s.value ? colors.bg : colors.muted,
                        cursor: "pointer",
                        transition: "all 300ms ease",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <SigmaInput label="Profession" value={form.profession} onChange={e => set("profession", e.target.value)} placeholder="Ex : Salarie, Independant, Retraite..." />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <SigmaInput label="Mobile" type="tel" value={form.mobile} onChange={e => set("mobile", e.target.value)} placeholder="06 00 00 00 00" />
                <SigmaInput label="Fixe" type="tel" value={form.fixe} onChange={e => set("fixe", e.target.value)} placeholder="01 00 00 00 00" />
              </div>
            </div>
          )}

          {/* Step 3 — Adresse & naissance */}
          {step === 3 && (
            <div>
              <SectionDivider>Adresse & lieu de naissance</SectionDivider>
              <p style={{
                fontFamily: fonts.body,
                fontSize: "13px",
                color: colors.muted,
                lineHeight: "1.6",
                margin: "0 0 24px",
              }}>
                Informations necessaires pour votre dossier fiscal.
              </p>

              <div style={{ marginBottom: "16px" }}>
                <SigmaInput label="Adresse" required value={form.adresse} onChange={e => set("adresse", e.target.value)} placeholder="12 rue de la Paix" error={errors.adresse} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <SigmaInput label="Code postal" required value={form.codePostal} onChange={e => set("codePostal", e.target.value)} placeholder="75001" error={errors.codePostal} />
                <SigmaInput label="Ville" required value={form.ville} onChange={e => set("ville", e.target.value)} placeholder="Paris" error={errors.ville} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <SigmaInput label="Pays de naissance" required value={form.paysNaissance} onChange={e => set("paysNaissance", e.target.value)} placeholder="France" error={errors.paysNaissance} />
                <SigmaInput label="Ville de naissance" required value={form.villeNaissance} onChange={e => set("villeNaissance", e.target.value)} placeholder="Lyon" error={errors.villeNaissance} />
              </div>

              {form.montantNegocie && (
                <div style={{
                  background: colors.surfaceRaised,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "2px",
                  padding: "20px",
                  marginTop: "24px",
                }}>
                  <p style={{ ...labelStyle, marginBottom: "12px" }}>Recapitulatif</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted }}>{form.prenom} {form.nom}</span>
                    <span style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.gold, fontWeight: 600 }}>{parseFloat(form.montantNegocie).toLocaleString("fr-FR")} EUR</span>
                  </div>
                </div>
              )}

              <p style={{
                fontFamily: fonts.body,
                fontSize: "11px",
                color: colors.faint,
                textAlign: "center",
                marginTop: "20px",
              }}>
                En soumettant ce formulaire, vous acceptez que vos donnees soient traitees par Sigma Factory.
              </p>
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
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
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
                color: step === 1 ? colors.faint : colors.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: step === 1 ? "not-allowed" : "pointer",
                opacity: step === 1 ? 0.4 : 1,
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
              {step} / 3
            </span>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !validateStep1()) return;
                  if (step === 2 && !validateStep2()) return;
                  setStep(s => s + 1);
                }}
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
                type="button"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 28px",
                  background: submitMutation.isPending ? colors.goldMuted : colors.gold,
                  border: "none",
                  borderRadius: "2px",
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  fontWeight: 500,
                  color: colors.bg,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                  opacity: submitMutation.isPending ? 0.7 : 1,
                  transition: "opacity 300ms ease",
                }}
              >
                {submitMutation.isPending ? (
                  <><Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> Envoi en cours...</>
                ) : (
                  <>Soumettre ma demande</>
                )}
              </button>
            )}
          </div>
        </div>

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

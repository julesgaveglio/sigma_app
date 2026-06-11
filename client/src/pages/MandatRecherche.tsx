import { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

const LOGO_URL = "/logo-sigma.png";

// ─── Utilitaire : nombre en lettres (français, simplifié) ─────────────────────
function nombreEnLettres(n: number): string {
  if (!n || isNaN(n)) return "";
  const unites = ["", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF",
    "DIX", "ONZE", "DOUZE", "TREIZE", "QUATORZE", "QUINZE", "SEIZE", "DIX-SEPT", "DIX-HUIT", "DIX-NEUF"];
  const dizaines = ["", "DIX", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE", "QUATRE-VINGT", "QUATRE-VINGT"];

  function conv(n: number): string {
    if (n === 0) return "";
    if (n < 20) return unites[n];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      if (d === 7) return "SOIXANTE-" + (u === 0 ? "DIX" : u === 1 ? "ET-ONZE" : unites[10 + u]);
      if (d === 9) return "QUATRE-VINGT-" + (u === 0 ? "DIX" : unites[10 + u]);
      if (u === 0) return dizaines[d] + (d === 8 ? "S" : "");
      if (u === 1 && d !== 8) return dizaines[d] + "-ET-UN";
      return dizaines[d] + "-" + unites[u];
    }
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const r = n % 100;
      const centStr = c === 1 ? "CENT" : conv(c) + " CENT" + (r === 0 && c > 1 ? "S" : "");
      return r === 0 ? centStr : centStr + " " + conv(r);
    }
    if (n < 1000000) {
      const m = Math.floor(n / 1000);
      const r = n % 1000;
      const milleStr = m === 1 ? "MILLE" : conv(m) + " MILLE";
      return r === 0 ? milleStr : milleStr + " " + conv(r);
    }
    return n.toString();
  }

  return conv(n) + " EUROS";
}

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

const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "none" as const };

// ─── Types ────────────────────────────────────────────────────────────────────
type FormData = {
  leadId?: number;
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  adresse: string;
  nom2: string;
  prenoms2: string;
  email2: string;
  telephone2: string;
  descriptionBien: string;
  budgetMax: string;
  honorairesOption: "charge_vendeur" | "partages" | "";
  accepteProspection: boolean;
  dateSignature: string;
};

const initialForm: FormData = {
  nom: "", prenoms: "", email: "", telephone: "", adresse: "",
  nom2: "", prenoms2: "", email2: "", telephone2: "",
  descriptionBien: "",
  budgetMax: "",
  honorairesOption: "",
  accepteProspection: false,
  dateSignature: new Date().toISOString().split("T")[0],
};

function SigmaInput({ label, required, value, onChange, placeholder, type = "text", disabled }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: colors.gold, marginLeft: "4px" }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full focus:outline-none [color-scheme:dark]"
        style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }}
        onFocus={e => { e.target.style.borderColor = colors.gold; }}
        onBlur={e => { e.target.style.borderColor = colors.border; }}
      />
    </div>
  );
}

function FrozenField({ value }: { value: string }) {
  return (
    <div style={{
      background: colors.surfaceRaised,
      border: `1px solid ${colors.border}`,
      borderRadius: "2px",
      padding: "12px 14px",
      fontFamily: fonts.body,
      fontSize: "13px",
      color: colors.faint,
      fontStyle: "italic",
    }}>
      {value}
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

// ─── Etape 1 : Identite ───────────────────────────────────────────────────────
function Step1Identity({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const set = (k: keyof FormData) => (v: string) => setForm({ ...form, [k]: v });
  const [showSecond, setShowSecond] = useState(!!(form.nom2 || form.prenoms2));

  return (
    <div>
      <SectionDivider>Mandant principal</SectionDivider>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <SigmaInput label="Nom de famille" required value={form.nom} onChange={set("nom")} placeholder="DUPONT" />
        <SigmaInput label="Prenom(s)" required value={form.prenoms} onChange={set("prenoms")} placeholder="Jean-Pierre" />
        <SigmaInput label="Email" required value={form.email} onChange={set("email")} placeholder="jean@exemple.fr" type="email" />
        <SigmaInput label="Telephone" required value={form.telephone} onChange={set("telephone")} placeholder="06 12 34 56 78" />
      </div>
      <SigmaInput label="Adresse de residence" required value={form.adresse} onChange={set("adresse")} placeholder="12 rue de la Paix, 75001 Paris" />

      {!showSecond ? (
        <button
          type="button"
          onClick={() => setShowSecond(true)}
          style={{
            marginTop: "24px",
            background: "none",
            border: "none",
            fontFamily: fonts.body,
            fontSize: "12px",
            color: colors.muted,
            cursor: "pointer",
            letterSpacing: "0.04em",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          + Ajouter un co-acquereur (conjoint, partenaire...)
        </button>
      ) : (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <SectionDivider>Co-acquereur (optionnel)</SectionDivider>
          </div>
          <button
            type="button"
            onClick={() => { setShowSecond(false); setForm({ ...form, nom2: "", prenoms2: "", email2: "", telephone2: "" }); }}
            style={{ background: "none", border: "none", fontFamily: fonts.body, fontSize: "11px", color: colors.faint, cursor: "pointer", marginBottom: "16px" }}
          >
            Supprimer
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <SigmaInput label="Nom de famille" value={form.nom2} onChange={set("nom2")} placeholder="MARTIN" />
            <SigmaInput label="Prenom(s)" value={form.prenoms2} onChange={set("prenoms2")} placeholder="Marie" />
            <SigmaInput label="Email" value={form.email2} onChange={set("email2")} placeholder="marie@exemple.fr" type="email" />
            <SigmaInput label="Telephone" value={form.telephone2} onChange={set("telephone2")} placeholder="06 98 76 54 32" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Etape 2 : Bien recherche + Budget ───────────────────────────────────────
function Step2Bien({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const set = (k: keyof FormData) => (v: string) => setForm({ ...form, [k]: v });
  const budgetNum = parseInt(form.budgetMax.replace(/\s/g, ""), 10);
  const budgetLettres = !isNaN(budgetNum) && budgetNum > 0 ? nombreEnLettres(budgetNum) : "";

  return (
    <div>
      <SectionDivider>I — Caracteristiques du bien recherche</SectionDivider>
      <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, lineHeight: "1.6", margin: "0 0 24px" }}>
        Decrivez precisement votre projet d'acquisition.
      </p>

      <div style={{ marginBottom: "20px" }}>
        <label style={labelStyle}>Type de bien</label>
        <FrozenField value="Maison individuelle / Immeuble Neuf / Ancien / A renover" />
        <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "4px" }}>Defini contractuellement — non modifiable</p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={labelStyle}>Description de votre recherche <span style={{ color: colors.gold }}>*</span></label>
        <textarea
          value={form.descriptionBien}
          onChange={e => set("descriptionBien")(e.target.value)}
          placeholder="Ex : Appartement T3 minimum, 60 m2, Paris 15e ou 16e, etage eleve, proche metro, avec parking..."
          rows={5}
          className="w-full focus:outline-none"
          style={textareaStyle}
          onFocus={e => { e.target.style.borderColor = colors.gold; }}
          onBlur={e => { e.target.style.borderColor = colors.border; }}
        />
        <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "4px" }}>
          Indiquez : type de bien, surface, nombre de pieces, localisation, etage, criteres importants...
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={labelStyle}>Prix maximum souhaite (EUR) <span style={{ color: colors.gold }}>*</span></label>
        <input
          type="number"
          value={form.budgetMax}
          onChange={e => set("budgetMax")(e.target.value)}
          placeholder="Ex : 350000"
          className="w-full focus:outline-none"
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = colors.gold; }}
          onBlur={e => { e.target.style.borderColor = colors.border; }}
        />
        {budgetLettres && (
          <div style={{
            background: colors.surfaceRaised,
            border: `1px solid ${colors.border}`,
            borderRadius: "2px",
            padding: "12px 14px",
            marginTop: "12px",
          }}>
            <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>En lettres :</p>
            <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.gold, fontWeight: 500, margin: 0 }}>{budgetLettres}</p>
          </div>
        )}
        <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "4px" }}>
          Ce montant correspond a votre enveloppe d'acquisition validee avec notre equipe courtage.
        </p>
      </div>

      <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", marginBottom: "20px" }}>
        <p style={{ ...labelStyle, marginBottom: "8px" }}>Honoraires de l'agence</p>
        <FrozenField value="En cas d'achat d'un bien presente par l'agence, vos honoraires seront de : 5% H.T." />
        <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "8px" }}>
          Ils ne deviendront exigibles qu'apres achat effectivement conclu, levee etant obligatoirement faite de toutes conditions suspensives, et seront a notre charge.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <p style={{ ...labelStyle, marginBottom: "4px" }}>II — Affaires presentees ce jour ou visitees</p>
          <FrozenField value="CF ANNEXES DE VISITE" />
        </div>
        <div>
          <p style={{ ...labelStyle, marginBottom: "4px" }}>III — Moyens de diffusion des annonces commerciales</p>
          <FrozenField value="INTERNET" />
        </div>
      </div>
    </div>
  );
}

// ─── Etape 3 : Confirmation & Signature ──────────────────────────────────────
function Step3Confirmation({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const set = (k: keyof FormData) => (v: string) => setForm({ ...form, [k]: v });

  return (
    <div>
      <SectionDivider>Confirmation & Signature</SectionDivider>
      <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, lineHeight: "1.6", margin: "0 0 24px" }}>
        Verifiez les informations et confirmez votre accord.
      </p>

      {/* Recapitulatif */}
      <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", marginBottom: "24px" }}>
        <p style={{ ...labelStyle, marginBottom: "16px" }}>Recapitulatif du mandat</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontFamily: fonts.body, fontSize: "14px" }}>
          <span style={{ color: colors.muted }}>Mandant(s) :</span>
          <span style={{ color: colors.fg, fontWeight: 500 }}>
            {form.nom} {form.prenoms}
            {form.nom2 && ` & ${form.nom2} ${form.prenoms2}`}
          </span>
          <span style={{ color: colors.muted }}>Adresse :</span>
          <span style={{ color: colors.fg }}>{form.adresse || "—"}</span>
          <span style={{ color: colors.muted }}>Email :</span>
          <span style={{ color: colors.fg }}>{form.email}{form.email2 && ` / ${form.email2}`}</span>
          <span style={{ color: colors.muted }}>Budget max :</span>
          <span style={{ color: colors.gold, fontWeight: 600 }}>
            {form.budgetMax ? `${parseInt(form.budgetMax).toLocaleString("fr-FR")} EUR` : "—"}
          </span>
          <span style={{ color: colors.muted }}>Honoraires :</span>
          <span style={{ color: colors.fg }}>5% HT</span>
          <span style={{ color: colors.muted }}>Duree :</span>
          <span style={{ color: colors.fg }}>12 mois</span>
        </div>
      </div>

      {/* Options honoraires */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ ...labelStyle, marginBottom: "12px" }}>Option honoraires</p>
        <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.faint, marginBottom: "12px" }}>
          Sauf choix de l'option "honoraires charge vendeur" ou choix de l'option "honoraires partages" :
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { value: "charge_vendeur", label: 'Option "honoraires charge vendeur"' },
            { value: "partages", label: 'Option "honoraires partages"' },
          ].map(opt => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.honorairesOption === opt.value}
                onChange={() => setForm({ ...form, honorairesOption: opt.value as "charge_vendeur" | "partages" })}
                style={{ accentColor: colors.gold }}
              />
              <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date de signature */}
      <div style={{ marginBottom: "24px" }}>
        <SigmaInput label="Date de signature" required value={form.dateSignature} onChange={set("dateSignature")} type="date" />
      </div>

      {/* RGPD */}
      <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", marginBottom: "24px" }}>
        <p style={{ ...labelStyle, marginBottom: "12px" }}>VIII — Informatique, Liberte, RGPD</p>
        <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.faint, lineHeight: "1.6", marginBottom: "12px" }}>
          Le mandataire informe le mandant qu'il collecte et traite des donnees personnelles necessaires pour l'accomplissement de sa mission. Pour toutes demandes sur le traitement de vos donnees : <span style={{ color: colors.gold }}>contact@sigmafactory.fr</span>
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.faint, lineHeight: "1.6", marginBottom: "16px" }}>
          Pour plus d'informations, la politique de protection des donnees est accessible a :{" "}
          <a href="https://www.sigmafactory.fr/politique-de-confidentialite-sigma-factory/" target="_blank" rel="noopener noreferrer" style={{ color: colors.gold, textDecoration: "none" }}>
            www.sigmafactory.fr/politique-de-confidentialite-sigma-factory/
          </a>
        </p>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.accepteProspection}
            onChange={() => setForm({ ...form, accepteProspection: !form.accepteProspection })}
            style={{ accentColor: colors.gold, marginTop: "2px", flexShrink: 0 }}
          />
          <span style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6" }}>
            En cochant cette case, j'accepte de recevoir de la prospection commerciale sur mon adresse mail.
          </span>
        </label>
      </div>

      {/* Engagement legal */}
      <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", marginBottom: "24px" }}>
        <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.faint, lineHeight: "1.6", margin: 0 }}>
          Le mandant declare et reconnait que prealablement a la signature des presentes, il a recu les informations prevues aux articles L111-1, L111-2 et L121-17 du Code de la consommation, qu'il a eu le temps necessaire et suffisant pour en prendre connaissance, se renseigner et les comprendre, ainsi que du traitement des donnees personnelles (RGPD) par le mandataire.
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, fontWeight: 500, marginTop: "8px", marginBottom: 0 }}>
          Il reconnait avoir pris connaissance des conditions generales de l'integralite des presentes pages 1 a 2.
        </p>
      </div>

      {/* Bon pour mandat */}
      <div style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "2px",
        background: colors.surface,
        padding: "24px",
        textAlign: "center",
      }}>
        <p style={{ fontFamily: fonts.body, fontSize: "12px", fontWeight: 500, color: colors.muted, marginBottom: "4px" }}>Etape 1/2 — Pre-remplissage du mandat</p>
        <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.faint, lineHeight: "1.6", margin: 0 }}>
          En soumettant ce formulaire, vous transmettez vos informations a Sigma Factory. Vous recevrez ensuite le mandat officiel a signer electroniquement via notre plateforme partenaire, conformement a la loi Hoguet n70-9 du 2 janvier 1970.
        </p>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function MandatRecherche() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [mandatId, setMandatId] = useState<number | null>(null);

  const submitMutation = trpc.mandats.submit.useMutation({
    onSuccess: (data) => {
      setMandatId(data.mandatId);
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    const nom = searchParams.get("nom");
    const prenoms = searchParams.get("prenoms");
    const email = searchParams.get("email");
    const telephone = searchParams.get("telephone");
    const leadId = searchParams.get("leadId");
    const budget = searchParams.get("budget");
    const adresse = searchParams.get("adresse");

    if (nom || prenoms || email || telephone) {
      setForm(f => ({
        ...f,
        nom: nom || f.nom,
        prenoms: prenoms || f.prenoms,
        email: email || f.email,
        telephone: telephone || f.telephone,
        adresse: adresse || f.adresse,
        budgetMax: budget || f.budgetMax,
        leadId: leadId ? Number(leadId) : undefined,
      }));
    }
  }, []);

  const STEPS = ["Identite", "Bien & Budget", "Confirmation"];

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.nom.trim()) return "Le nom est requis";
      if (!form.prenoms.trim()) return "Le prenom est requis";
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Un email valide est requis";
      if (!form.telephone.trim()) return "Le telephone est requis";
      if (!form.adresse.trim()) return "L'adresse est requise";
    }
    if (step === 1) {
      if (!form.descriptionBien.trim()) return "La description du bien recherche est requise";
      if (!form.budgetMax || parseInt(form.budgetMax) <= 0) return "Le prix maximum souhaite est requis";
    }
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    submitMutation.mutate({
      nom: form.nom,
      prenoms: form.prenoms,
      email: form.email,
      telephone: form.telephone,
      adresse: form.adresse,
      leadId: form.leadId,
      typeBien: "maison" as const,
      usage: "residence_principale" as const,
      localisation: form.descriptionBien,
      budgetMax: parseInt(form.budgetMax),
      typeMandat: "simple" as const,
      dureeMandat: 12,
      autresCriteres: [
        form.nom2 ? `Co-acquéreur : ${form.nom2} ${form.prenoms2} — ${form.email2} — ${form.telephone2}` : "",
        form.honorairesOption ? `Honoraires : ${form.honorairesOption === "charge_vendeur" ? "Charge vendeur" : "Partagés"}` : "",
        form.accepteProspection ? "RGPD : Accepte la prospection commerciale par email" : "",
        `Date de signature : ${form.dateSignature}`,
      ].filter(Boolean).join(" | "),
    } as any);
  };

  /* ── Page de succes ── */
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <CheckCircle size={40} strokeWidth={1.5} style={{ color: colors.gold, margin: "0 auto 20px", display: "block" }} />
          <img src={LOGO_URL} alt="Sigma Factory" style={{ height: "32px", margin: "0 auto 32px", display: "block", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
          <h1 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "8px" }}>
            Informations transmises
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, marginBottom: "8px" }}>
            Vos informations pour le mandat <span style={{ color: colors.gold, fontWeight: 500 }}>#{mandatId}</span> ont bien ete transmises a l'equipe Sigma Factory.
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.faint, marginBottom: "32px" }}>
            Elodie vous enverra le mandat officiel a signer electroniquement, puis vous contactera pour demarrer votre recherche de bien.
          </p>

          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", textAlign: "left" }}>
            <p style={{ ...labelStyle, marginBottom: "12px" }}>Recapitulatif</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: fonts.body, fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Mandant :</span><span style={{ color: colors.fg }}>{form.nom} {form.prenoms}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Budget max :</span><span style={{ color: colors.gold, fontWeight: 600 }}>{parseInt(form.budgetMax).toLocaleString("fr-FR")} EUR</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Duree :</span><span style={{ color: colors.fg }}>12 mois</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Honoraires :</span><span style={{ color: colors.fg }}>5% HT</span></div>
            </div>
          </div>

          <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "32px" }}>
            L'agence est adherente au SNPI, Syndicat National des Professionnels Immobiliers, 26 avenue Victor Hugo - 75116 PARIS.
          </p>
        </div>
      </div>
    );
  }

  /* ── Formulaire ── */
  return (
    <div style={{ minHeight: "100vh", background: colors.bg, padding: "32px 16px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 700, color: colors.fg, letterSpacing: "0.04em", margin: "0 0 2px" }}>
              Mandat de Recherche
            </h1>
            <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, margin: 0 }}>et de negociation</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <img src={LOGO_URL} alt="Sigma Factory" style={{ height: "32px", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
            <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, marginTop: "4px", letterSpacing: "0.04em" }}>CPI69012026000000022</p>
          </div>
        </div>

        {/* Representant */}
        <div style={{
          marginBottom: "24px",
          padding: "12px 16px",
          background: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          borderRadius: "2px",
          fontFamily: fonts.body,
          fontSize: "12px",
          color: colors.faint,
        }}>
          Representee par : <span style={{ color: colors.muted }}>Madame Hanna-Hayat BENTAHER</span> — Qualite : Assistante de Direction — Tel. 03.92.20.01.42
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
          {STEPS.map((label, i) => {
            const isActive = step === i;
            const isDone = step > i;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
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
                    {isDone ? <CheckCircle size={14} strokeWidth={1.5} style={{ color: colors.goldMuted }} /> : i + 1}
                  </div>
                  <span style={{
                    fontFamily: fonts.body,
                    fontSize: "9px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: isActive ? colors.fg : isDone ? colors.muted : colors.faint,
                  }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: "1px", margin: "0 8px", marginBottom: "20px", background: isDone ? colors.goldMuted : colors.border, transition: "background 300ms ease" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card formulaire */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "2px",
          padding: "40px 36px",
        }}>
          {step === 0 && <Step1Identity form={form} setForm={setForm} />}
          {step === 1 && <Step2Bien form={form} setForm={setForm} />}
          {step === 2 && <Step3Confirmation form={form} setForm={setForm} />}

          {/* Navigation */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: `1px solid ${colors.border}`,
          }}>
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
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
                color: step === 0 ? colors.faint : colors.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: step === 0 ? "not-allowed" : "pointer",
                opacity: step === 0 ? 0.4 : 1,
                transition: "all 300ms ease",
              }}
            >
              <ChevronLeft size={14} strokeWidth={1.5} /> Precedent
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
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
                  <>Valider mes informations</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Pied de page legal */}
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, letterSpacing: "0.04em", marginBottom: "4px" }}>
            L'agence est adherente au SNPI, Syndicat National des Professionnels Immobiliers, 26 avenue Victor Hugo - 75116 PARIS.
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, letterSpacing: "0.04em", marginBottom: "4px" }}>
            Elle est soumise au code de deontologie consultable sur{" "}
            <a href="https://www.snpi.fr/espace-adherent/files/divers/code_deontologie.pdf" target="_blank" rel="noopener noreferrer" style={{ color: colors.muted, textDecoration: "none" }}>
              www.snpi.fr
            </a>
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.border, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Ref. SN242A - 04/2024
          </p>
        </div>
      </div>
    </div>
  );
}

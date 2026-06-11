import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, ChevronRight, ChevronLeft, FileText, Users, Zap, Shield, TrendingUp, UserCheck, AlertCircle, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

type Step = "accueil" | "identite" | "contrat" | "signature" | "confirmation";

interface FormData {
  nom: string; prenom: string; email: string; telephone: string;
  adresse: string; codePostal: string; ville: string;
  statut: "agent_immobilier" | "mandataire" | "courtier" | "auto_entrepreneur" | "autre";
  siret: string; activitePrincipale: string; parrainCode: string;
  signatureNom: string; accepteConditions: boolean; accepteContrat: boolean;
}

const STATUTS = [
  { value: "agent_immobilier", label: "Agent immobilier" },
  { value: "mandataire", label: "Mandataire immobilier" },
  { value: "courtier", label: "Courtier" },
  { value: "auto_entrepreneur", label: "Auto-entrepreneur" },
  { value: "autre", label: "Autre" },
];

/* ── Design tokens ── */
const fonts = { heading: "'Cormorant Garamond', serif", body: "'Hanken Grotesk', sans-serif" };
const colors = {
  bg: "var(--background)", surface: "var(--surface)", surfaceRaised: "var(--surface-raised)", border: "var(--border)",
  fg: "var(--foreground)", muted: "var(--foreground-muted)", faint: "var(--foreground-faint)", gold: "var(--gold)", goldMuted: "var(--gold-muted)", destructive: "var(--destructive)", success: "var(--success)",
};
const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, textTransform: "uppercase",
  letterSpacing: "0.08em", color: colors.muted, marginBottom: "8px", display: "block",
};
const inputStyle: React.CSSProperties = {
  background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px",
  padding: "12px 14px", color: colors.fg, fontSize: "14px", fontFamily: fonts.body,
  width: "100%", outline: "none", transition: "border-color 300ms ease",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6560' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "36px",
};
const btnPrimary: React.CSSProperties = {
  padding: "14px 28px", background: colors.gold, color: colors.bg, border: "none", borderRadius: "2px",
  fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, textTransform: "uppercase",
  letterSpacing: "0.1em", cursor: "pointer", transition: "opacity 300ms ease",
  display: "inline-flex", alignItems: "center", gap: "8px",
};
const btnSecondary: React.CSSProperties = {
  padding: "12px 20px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "2px",
  fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, color: colors.muted,
  textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all 300ms ease",
  display: "inline-flex", alignItems: "center", gap: "6px",
};

function SInput({ value, onChange, placeholder, type = "text", style: extraStyle }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full focus:outline-none [color-scheme:dark]"
      style={{ ...inputStyle, ...extraStyle }}
      onFocus={e => { e.target.style.borderColor = colors.gold; }}
      onBlur={e => { e.target.style.borderColor = colors.border; }}
    />
  );
}

export default function AmbassadeurOnboarding() {
  const [step, setStep] = useState<Step>("accueil");
  const [form, setForm] = useState<FormData>({
    nom: "", prenom: "", email: "", telephone: "",
    adresse: "", codePostal: "", ville: "",
    statut: "agent_immobilier", siret: "", activitePrincipale: "",
    parrainCode: "", signatureNom: "", accepteConditions: false, accepteContrat: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [contratUrl, setContratUrl] = useState<string | null>(null);
  const [ambassadeurId, setAmbassadeurId] = useState<number | null>(null);
  const [codeParrainAttribue, setCodeParrainAttribue] = useState<string | null>(null);
  const [parrainDebounced, setParrainDebounced] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("parrain");
    if (codeFromUrl) { setForm(f => ({ ...f, parrainCode: codeFromUrl })); setParrainDebounced(codeFromUrl); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setParrainDebounced(form.parrainCode); }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.parrainCode]);

  const { data: parrainResolu, isLoading: loadingParrain } = trpc.courtiers.resoudreParrain.useQuery(
    { code: parrainDebounced }, { enabled: parrainDebounced.length >= 3 }
  );

  const inscrire = trpc.ambassadeurs.inscrire.useMutation({
    onSuccess: (data) => {
      setAmbassadeurId(data.ambassadeurId);
      if (data.contratUrl) setContratUrl(data.contratUrl);
      if (data.codeParrain) setCodeParrainAttribue(data.codeParrain);
      setStep("confirmation");
    },
  });

  const set = (key: keyof FormData, value: string | boolean) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validateIdentite = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.nom) e.nom = "Requis"; if (!form.prenom) e.prenom = "Requis";
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Email invalide";
    if (!form.telephone) e.telephone = "Requis"; if (!form.adresse) e.adresse = "Requis";
    if (!form.codePostal) e.codePostal = "Requis"; if (!form.ville) e.ville = "Requis";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!form.signatureNom || !form.accepteConditions || !form.accepteContrat) {
      setErrors({ signatureNom: !form.signatureNom ? "Veuillez saisir votre nom complet" : undefined, accepteConditions: !form.accepteConditions ? "Requis" : undefined, accepteContrat: !form.accepteContrat ? "Requis" : undefined });
      return;
    }
    inscrire.mutate({
      nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone,
      adresse: form.adresse, codePostal: form.codePostal, ville: form.ville,
      statut: form.statut, siret: form.siret || undefined, activitePrincipale: form.activitePrincipale || undefined,
      signatureNom: form.signatureNom, signatureAcceptee: true,
      parrainId: (parrainResolu && 'id' in parrainResolu) ? (parrainResolu as any).id : undefined,
    });
  };

  const errorText = (msg?: string) => msg ? <p style={{ fontSize: "12px", color: colors.destructive, fontFamily: fonts.body, marginTop: "4px" }}>{msg}</p> : null;

  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "20px", fontWeight: 700, letterSpacing: "0.15em", color: colors.gold, margin: 0 }}>SIGMA FACTORY</h1>
            <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, letterSpacing: "0.08em", textTransform: "uppercase", margin: "2px 0 0" }}>Programme Agent</p>
          </div>
          <span style={{ fontFamily: fonts.body, fontSize: "10px", fontWeight: 500, color: colors.faint, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: "2px" }}>
            Recrutement Ouvert
          </span>
        </div>
      </header>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px" }}>

        {/* ACCUEIL */}
        {step === "accueil" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <p style={{ fontFamily: fonts.body, fontSize: "10px", fontWeight: 500, color: colors.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
                Programme d'affiliation a 2 niveaux
              </p>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "40px", fontWeight: 700, color: colors.fg, letterSpacing: "0.04em", lineHeight: 1.1, marginBottom: "16px" }}>
                Rejoignez le Reseau<br /><span style={{ color: colors.gold }}>Agent Sigma</span>
              </h2>
              <p style={{ fontFamily: fonts.body, fontSize: "15px", color: colors.muted, maxWidth: "560px", margin: "0 auto", lineHeight: "1.7" }}>
                Developpez votre reseau, proposez des biens a nos clients qualifies et percevez des retrocommissions sur chaque transaction.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "48px" }}>
              {[
                { title: "50% des honoraires", desc: "Vous conservez 50% de chaque commission immobiliere generee (agents)" },
                { title: "10% de retrocommission", desc: "Sur chaque vente de votre reseau direct (Niveau 1)" },
                { title: "5% sur vos filleuls", desc: "Sur chaque vente des ambassadeurs que vous parrainez (Niveau 2)" },
                { title: "Acces plateforme", desc: "Outil dedie pour soumettre vos biens et suivre vos commissions" },
              ].map((item, i) => (
                <div key={i} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "28px 20px" }}>
                  <h3 style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 600, color: colors.fg, marginBottom: "8px" }}>{item.title}</h3>
                  <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6", margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <button onClick={() => setStep("identite")} style={btnPrimary}>
                Devenir Agent Sigma <ChevronRight size={14} strokeWidth={1.5} />
              </button>
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "16px" }}>
                Signature electronique securisee — Contrat legal genere automatiquement
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", border: `1px solid ${colors.border}`, background: colors.surface, borderRadius: "2px", padding: "24px" }}>
              <Shield size={20} strokeWidth={1.5} style={{ color: colors.gold, flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: 500, color: colors.fg, marginBottom: "4px" }}>SIGMA FACTORY SAS</p>
                <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6", margin: 0 }}>
                  Capital 5 000 EUR — RCS Lyon 999 672 777 — Carte pro CPI69012026000000022 — CCI Lyon Metropole<br />12 Rue de la Part-Dieu, 69003 Lyon
                </p>
              </div>
            </div>
          </div>
        )}

        {/* IDENTITE */}
        {step === "identite" && (
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "4px" }}>Vos informations</h2>
              <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>Ces informations apparaitront sur votre contrat d'agent.</p>
            </div>

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "36px 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div><label style={labelStyle}>Nom <span style={{ color: colors.gold }}>*</span></label><SInput value={form.nom} onChange={e => set("nom", e.target.value)} placeholder="DUPONT" />{errorText(errors.nom)}</div>
                <div><label style={labelStyle}>Prenom <span style={{ color: colors.gold }}>*</span></label><SInput value={form.prenom} onChange={e => set("prenom", e.target.value)} placeholder="Jean" />{errorText(errors.prenom)}</div>
                <div><label style={labelStyle}>Email <span style={{ color: colors.gold }}>*</span></label><SInput type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jean.dupont@email.com" />{errorText(errors.email)}</div>
                <div><label style={labelStyle}>Telephone <span style={{ color: colors.gold }}>*</span></label><SInput value={form.telephone} onChange={e => set("telephone", e.target.value)} placeholder="06 12 34 56 78" />{errorText(errors.telephone)}</div>
              </div>
              <div style={{ marginBottom: "16px" }}><label style={labelStyle}>Adresse <span style={{ color: colors.gold }}>*</span></label><SInput value={form.adresse} onChange={e => set("adresse", e.target.value)} placeholder="12 rue de la Paix" />{errorText(errors.adresse)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div><label style={labelStyle}>Code postal <span style={{ color: colors.gold }}>*</span></label><SInput value={form.codePostal} onChange={e => set("codePostal", e.target.value)} placeholder="69001" />{errorText(errors.codePostal)}</div>
                <div><label style={labelStyle}>Ville <span style={{ color: colors.gold }}>*</span></label><SInput value={form.ville} onChange={e => set("ville", e.target.value)} placeholder="Lyon" />{errorText(errors.ville)}</div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Statut professionnel <span style={{ color: colors.gold }}>*</span></label>
                <select value={form.statut} onChange={e => set("statut", e.target.value)} className="w-full focus:outline-none" style={selectStyle}
                  onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }}>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div><label style={labelStyle}>SIRET (optionnel)</label><SInput value={form.siret} onChange={e => set("siret", e.target.value)} placeholder="123 456 789 00012" /></div>
                <div>
                  <label style={labelStyle}>Code parrain (optionnel)</label>
                  <div style={{ position: "relative" }}>
                    <SInput value={form.parrainCode} onChange={e => set("parrainCode", e.target.value)} placeholder="SIG-NOM-0001 ou email"
                      style={parrainResolu ? { borderColor: `${colors.success}60` } : {}} />
                    {loadingParrain && parrainDebounced.length >= 3 && <Loader2 size={13} className="animate-spin" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: colors.faint }} />}
                    {!loadingParrain && parrainResolu && <CheckCircle size={13} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: colors.success }} />}
                    {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && <AlertCircle size={13} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: colors.destructive }} />}
                  </div>
                  {parrainResolu && <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.success, marginTop: "4px" }}>{parrainResolu.nom} — {parrainResolu.type === "agent" ? "Agent" : parrainResolu.type === "courtier" ? "Courtier" : "Sigma"}</p>}
                  {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.destructive, marginTop: "4px" }}>Code non reconnu</p>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setStep("accueil")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
              <button onClick={() => { if (validateIdentite()) setStep("contrat"); }} style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}>Lire le contrat <ChevronRight size={14} strokeWidth={1.5} /></button>
            </div>
          </div>
        )}

        {/* CONTRAT */}
        {step === "contrat" && (
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "4px" }}>Contrat d'Agent</h2>
              <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>Lisez attentivement le contrat avant de signer.</p>
            </div>

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "40px 36px", maxHeight: "60vh", overflowY: "auto", fontFamily: fonts.body, fontSize: "13px", color: colors.muted, lineHeight: "1.7" }}>
              <div style={{ textAlign: "center", paddingBottom: "24px", borderBottom: `1px solid ${colors.border}`, marginBottom: "24px" }}>
                <h3 style={{ fontFamily: fonts.heading, fontSize: "20px", fontWeight: 600, color: colors.fg, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Contrat de Partenariat Ambassadeur</h3>
                <p style={{ color: colors.gold, fontWeight: 500, fontSize: "12px", marginBottom: "4px" }}>Programme d'Affiliation Sigma Factory</p>
                <p style={{ color: colors.faint, fontSize: "11px" }}>Entre SIGMA FACTORY SAS et {form.prenom} {form.nom}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", marginBottom: "24px" }}>
                <div>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>Le Mandant</p>
                  <p style={{ color: colors.fg, fontWeight: 500, margin: "0 0 4px" }}>SIGMA FACTORY SAS</p>
                  <p style={{ fontSize: "11px", color: colors.faint, margin: 0, lineHeight: "1.6" }}>Capital 5 000 EUR — RCS Lyon 999 672 777<br />12 Rue de la Part-Dieu, 69003 Lyon<br />Carte pro CPI69012026000000022<br />Representee par Mme PENNAVAYRE Bidossessi Carole</p>
                </div>
                <div>
                  <p style={{ ...labelStyle, marginBottom: "8px" }}>L'Ambassadeur</p>
                  <p style={{ color: colors.fg, fontWeight: 500, margin: "0 0 4px" }}>{form.prenom} {form.nom}</p>
                  <p style={{ fontSize: "11px", color: colors.faint, margin: 0, lineHeight: "1.6" }}>{form.adresse}<br />{form.codePostal} {form.ville}<br />{form.email}<br />{form.telephone}</p>
                </div>
              </div>

              <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", textAlign: "center", marginBottom: "24px" }}>
                <p style={{ color: colors.fg, fontWeight: 500, fontSize: "14px", marginBottom: "12px" }}>Structure de Remuneration</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  {[{ pct: "50%", label: "Honoraires directs\nSur vos dossiers immobiliers" }, { pct: "10%", label: "Retrocommission Niveau 1\nSur les ventes de votre reseau direct" }, { pct: "5%", label: "Retrocommission Niveau 2\nSur les ventes des filleuls de vos ambassadeurs" }].map((r, i) => (
                    <div key={i} style={{ border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "16px" }}>
                      <p style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: 700, color: colors.gold, margin: "0 0 4px" }}>{r.pct}</p>
                      <p style={{ fontSize: "11px", color: colors.faint, margin: 0, whiteSpace: "pre-line", lineHeight: "1.5" }}>{r.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {[
                { title: "Article 1 — Objet", content: "Le present contrat definit les conditions dans lesquelles l'Ambassadeur s'engage a promouvoir les services de SIGMA FACTORY SAS et a developper un reseau de partenaires affilies. L'Ambassadeur agit en qualite de partenaire independant et non salarie." },
                { title: "Article 2 — Missions", content: "L'Ambassadeur s'engage a : promouvoir les services Sigma aupres de son reseau, presenter des biens immobiliers aux prospects qualifies, recruter et parrainer de nouveaux Ambassadeurs, renseigner le portefeuille de biens via la plateforme avec des informations exactes, respecter la charte deontologique et les obligations legales." },
                { title: "Article 3 — Remuneration", content: "Honoraires directs (50%) : En qualite d'agent immobilier partenaire, l'Ambassadeur percoit 50% des honoraires HT encaisses par SIGMA FACTORY SAS sur chaque dossier immobilier qu'il apporte directement. Reseau Niveau 1 (10%) : L'Ambassadeur percoit 10% de la Part Sigma sur toute transaction realisee par un filleul qu'il a directement recrute. Reseau Niveau 2 (5%) : Le parrain percoit 5% de la Part Sigma sur toute transaction realisee par un filleul de Niveau 2. Les remunerations sont versees dans les 30 jours suivant l'encaissement effectif." },
                { title: "Article 4 — Duree et Resiliation", content: "Contrat a duree indeterminee a compter de la signature. Resiliation possible par chaque partie avec un preavis de 30 jours. Resiliation immediate en cas de manquement grave ou comportement contraire a l'ethique." },
                { title: "Article 5 — Confidentialite", content: "L'Ambassadeur s'engage a maintenir strictement confidentielle toute information relative aux clients, prospects, tarifs et methodes de SIGMA FACTORY SAS pendant toute la duree du contrat et pour une periode de 3 ans apres sa resiliation." },
                { title: "Article 6 — Statut Independant", content: "L'Ambassadeur exerce son activite en toute independance et est seul responsable de ses obligations fiscales et sociales decoulant des remunerations percues dans le cadre du present contrat." },
                { title: "Article 7 — Droit Applicable", content: "Contrat soumis au droit francais. En cas de litige, les parties s'engagent a rechercher une solution amiable. A defaut, le Tribunal de Commerce de Lyon sera seul competent." },
              ].map((art, i) => (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <p style={{ color: colors.fg, fontWeight: 500, marginBottom: "4px" }}>{art.title}</p>
                  <p style={{ color: colors.faint, fontSize: "12px", lineHeight: "1.6", margin: 0 }}>{art.content}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setStep("identite")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
              <button onClick={() => setStep("signature")} style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}>J'ai lu le contrat — Signer <ChevronRight size={14} strokeWidth={1.5} /></button>
            </div>
          </div>
        )}

        {/* SIGNATURE */}
        {step === "signature" && (
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "4px" }}>Signature electronique</h2>
              <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>Votre signature a valeur legale conformement au droit francais.</p>
            </div>

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "36px 32px" }}>
              <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", marginBottom: "24px" }}>
                <p style={{ ...labelStyle, marginBottom: "8px" }}>Recapitulatif</p>
                <p style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 500, color: colors.fg, margin: "0 0 4px" }}>{form.prenom} {form.nom}</p>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: "0 0 2px" }}>{form.email} — {form.telephone}</p>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: "0 0 2px" }}>{form.adresse}, {form.codePostal} {form.ville}</p>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0 }}>{STATUTS.find(s => s.value === form.statut)?.label}</p>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ ...labelStyle, fontWeight: 600 }}>Signez en tapant votre nom complet <span style={{ color: colors.gold }}>*</span></label>
                <input value={form.signatureNom} onChange={e => set("signatureNom", e.target.value)} placeholder={`${form.prenom} ${form.nom}`}
                  className="w-full focus:outline-none"
                  style={{ ...inputStyle, fontSize: "18px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", padding: "16px 14px" }}
                  onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }}
                />
                {errorText(errors.signatureNom)}
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "4px" }}>En saisissant votre nom, vous apposez votre signature electronique au sens de l'article 1367 du Code civil.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.accepteConditions} onChange={e => set("accepteConditions", e.target.checked)} style={{ accentColor: colors.gold, marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6" }}>
                    J'ai lu et j'accepte les conditions generales du Programme Agent Sigma Factory, notamment les modalites de remuneration (retrocommissions reseau : 10% Niveau 1, 5% Niveau 2) et les obligations de confidentialite. J'accepte egalement le traitement de mes donnees personnelles conformement a la <a href="/politique-confidentialite" target="_blank" rel="noreferrer" style={{ color: colors.gold, textDecoration: "underline" }}>politique de confidentialite</a>.
                  </span>
                </label>
                {errorText(errors.accepteConditions)}
                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.accepteContrat} onChange={e => set("accepteContrat", e.target.checked)} style={{ accentColor: colors.gold, marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6" }}>
                    Je certifie avoir pris connaissance du contrat de partenariat dans son integralite et je m'engage a respecter l'ensemble de ses clauses. Je confirme que les informations fournies sont exactes.
                  </span>
                </label>
                {errorText(errors.accepteContrat)}
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "16px" }}>
                <Shield size={16} strokeWidth={1.5} style={{ color: colors.gold, flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, lineHeight: "1.6", margin: 0 }}>
                  Un contrat PDF horodate sera genere et envoye a votre adresse email. Cette signature electronique a valeur legale conformement a l'article 1367 du Code civil francais et au reglement eIDAS.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setStep("contrat")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
              <button onClick={handleSubmit} disabled={inscrire.isPending}
                style={{ ...btnPrimary, flex: 1, justifyContent: "center", opacity: inscrire.isPending ? 0.7 : 1, cursor: inscrire.isPending ? "not-allowed" : "pointer" }}>
                {inscrire.isPending ? "Signature en cours..." : "Signer et rejoindre le reseau Sigma"}
              </button>
            </div>
            {inscrire.isError && <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.destructive, textAlign: "center", marginTop: "16px" }}>{inscrire.error.message}</p>}
          </div>
        )}

        {/* CONFIRMATION */}
        {step === "confirmation" && (
          <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
            <CheckCircle size={48} strokeWidth={1.5} style={{ color: colors.gold, margin: "0 auto 20px", display: "block" }} />
            <h2 style={{ fontFamily: fonts.heading, fontSize: "30px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "8px" }}>
              Bienvenue dans le reseau Sigma
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, lineHeight: "1.6", marginBottom: "32px" }}>
              Votre inscription a ete enregistree. L'equipe Sigma Factory va examiner votre dossier et vous contacter sous 48h pour activer votre compte.
            </p>

            {codeParrainAttribue && (
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", marginBottom: "20px" }}>
                <p style={{ ...labelStyle, marginBottom: "12px" }}>Votre code parrain</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                  <p style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: "22px", fontWeight: 700, letterSpacing: "0.15em", color: colors.fg, margin: 0 }}>{codeParrainAttribue}</p>
                  <button onClick={() => { navigator.clipboard.writeText(codeParrainAttribue); toast.success("Code copie"); }}
                    style={{ padding: "8px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", color: colors.gold, cursor: "pointer" }}>
                    <Copy size={14} strokeWidth={1.5} />
                  </button>
                </div>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "8px" }}>Partagez ce code pour parrainer d'autres ambassadeurs</p>
              </div>
            )}

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", textAlign: "left", marginBottom: "20px" }}>
              <p style={{ ...labelStyle, marginBottom: "8px" }}>Votre espace personnel</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: "13px", color: colors.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                  {`${window.location.origin}/portail-membre`}
                </p>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portail-membre`); toast.success("Lien copie"); }}
                  style={{ padding: "6px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", color: colors.faint, cursor: "pointer", flexShrink: 0 }}>
                  <Copy size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {codeParrainAttribue && (
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", textAlign: "left", marginBottom: "20px" }}>
                <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Votre lien de parrainage</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: "13px", color: colors.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                    {`${window.location.origin}/rejoindre?parrain=${codeParrainAttribue}`}
                  </p>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/rejoindre?parrain=${codeParrainAttribue}`); toast.success("Lien copie"); }}
                    style={{ padding: "6px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", color: colors.faint, cursor: "pointer", flexShrink: 0 }}>
                    <Copy size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", textAlign: "left", marginBottom: "32px" }}>
              <p style={{ ...labelStyle, marginBottom: "16px" }}>Prochaines etapes</p>
              {[
                "Verification de votre dossier par l'equipe Sigma (48h)",
                "Activation de votre espace ambassadeur",
                "Acces a la plateforme pour soumettre vos biens et suivre vos commissions",
                "Reception de votre contrat signe par email",
              ].map((lbl, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: i < 3 ? "12px" : 0 }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "2px", border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.body, fontSize: "10px", fontWeight: 600, color: colors.gold, flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0 }}>{lbl}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              {contratUrl && (
                <a href={contratUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>
                  <FileText size={14} strokeWidth={1.5} /> Telecharger mon contrat
                </a>
              )}
              <a href="/portail-membre" style={{ ...btnPrimary, textDecoration: "none" }}>
                Acceder a mon espace ambassadeur
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

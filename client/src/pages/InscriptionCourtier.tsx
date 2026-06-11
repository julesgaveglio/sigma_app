import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, FileText, ChevronRight, ChevronLeft, UserCheck, AlertCircle, Loader2, Copy, Shield } from "lucide-react";

const SPECIALITES = [
  { id: "credit_immo", label: "Credit immobilier" },
  { id: "credit_pro", label: "Credit professionnel" },
  { id: "rachat_credit", label: "Rachat de credit" },
  { id: "credit_conso", label: "Credit consommation" },
];

type Step = "accueil" | "identite" | "contrat" | "signature" | "confirmation";

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

function SInput({ value, onChange, placeholder, type = "text", style: extra }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full focus:outline-none [color-scheme:dark]" style={{ ...inputStyle, ...extra }}
      onFocus={e => { e.target.style.borderColor = colors.gold; }}
      onBlur={e => { e.target.style.borderColor = colors.border; }}
    />
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "28px 0 20px" }}>
      <div style={{ flex: 1, height: "1px", background: colors.border }} />
      <span style={{ fontFamily: fonts.body, fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color: colors.muted }}>{children}</span>
      <div style={{ flex: 1, height: "1px", background: colors.border }} />
    </div>
  );
}

export default function InscriptionCourtier() {
  const [step, setStep] = useState<Step>("accueil");
  const [submitted, setSubmitted] = useState(false);
  const [conventionUrl, setConventionUrl] = useState<string | null>(null);
  const [codeParrainAttribue, setCodeParrainAttribue] = useState<string | null>(null);
  const [specialitesSelected, setSpecialitesSelected] = useState<string[]>([]);
  const [parrainQuery, setParrainQuery] = useState("");
  const [parrainDebounced, setParrainDebounced] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", telephone: "",
    adresse: "", codePostal: "", ville: "",
    statut: "" as any,
    siret: "", cabinetNom: "", numeroOrias: "",
    denominationSociale: "", formeJuridique: "", capitalSocial: "",
    adresseSiegeSocial: "", villeGreffe: "", numeroRCS: "",
    representantLegalNom: "", representantLegalFonction: "",
    signatureNom: "", accepteConditions: false, accepteContrat: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("parrain");
    if (codeFromUrl) { setParrainQuery(codeFromUrl); setParrainDebounced(codeFromUrl); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setParrainDebounced(parrainQuery); }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [parrainQuery]);

  const { data: parrainResolu, isLoading: loadingParrain } = trpc.courtiers.resoudreParrain.useQuery(
    { code: parrainDebounced }, { enabled: parrainDebounced.length >= 3 }
  );

  const inscrire = trpc.courtiers.inscrire.useMutation({
    onSuccess: (data) => {
      setConventionUrl(data.conventionUrl);
      if (data.codeParrain) setCodeParrainAttribue(data.codeParrain);
      setStep("confirmation");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const validateIdentite = () => {
    if (!form.prenom || !form.nom || !form.email || !form.telephone || !form.adresse || !form.codePostal || !form.ville || !form.statut) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!form.accepteConditions || !form.accepteContrat) {
      toast.error("Veuillez cocher les deux cases pour continuer."); return;
    }
    if (!form.signatureNom.trim()) {
      toast.error("Veuillez saisir votre nom complet comme signature."); return;
    }
    inscrire.mutate({
      nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone,
      adresse: form.adresse, codePostal: form.codePostal, ville: form.ville,
      statut: form.statut, siret: form.siret || undefined, cabinetNom: form.cabinetNom || undefined,
      numeroOrias: form.numeroOrias || undefined, denominationSociale: form.denominationSociale || undefined,
      formeJuridique: form.formeJuridique || undefined, capitalSocial: form.capitalSocial || undefined,
      adresseSiegeSocial: form.adresseSiegeSocial || undefined, villeGreffe: form.villeGreffe || undefined,
      numeroRCS: form.numeroRCS || undefined, representantLegalNom: form.representantLegalNom || undefined,
      representantLegalFonction: form.representantLegalFonction || undefined,
      specialites: specialitesSelected.length > 0 ? specialitesSelected : undefined,
      codeParrain: parrainResolu?.code ?? (parrainQuery || undefined),
      signatureNom: form.signatureNom,
    });
  };

  // ─── CONFIRMATION ──
  if (step === "confirmation") {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "520px", width: "100%", textAlign: "center" }}>
          <CheckCircle size={48} strokeWidth={1.5} style={{ color: colors.gold, margin: "0 auto 20px", display: "block" }} />
          <h1 style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "4px" }}>
            Bienvenue dans le reseau
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.gold, fontWeight: 500, marginBottom: "16px" }}>SIGMA FACTORY — Courtier Partenaire</p>
          <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, lineHeight: "1.6", marginBottom: "32px" }}>
            Votre convention de partenariat a ete generee et signee electroniquement. L'equipe Sigma va valider votre profil sous 24h.
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
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "8px" }}>Partagez ce code pour parrainer d'autres courtiers</p>
            </div>
          )}

          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", textAlign: "left", marginBottom: "20px" }}>
            <p style={{ ...labelStyle, marginBottom: "8px" }}>Votre espace personnel</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: "13px", color: colors.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                https://www.sigmafactory.org/dashboard/courtier
              </p>
              <button onClick={() => { navigator.clipboard.writeText("https://www.sigmafactory.org/dashboard/courtier"); toast.success("Lien copie"); }}
                style={{ padding: "6px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", color: colors.faint, cursor: "pointer", flexShrink: 0 }}>
                <Copy size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {codeParrainAttribue && (
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", textAlign: "left", marginBottom: "32px" }}>
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Votre lien de parrainage</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: "13px", color: colors.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                  {`https://www.sigmafactory.org/parrainage/${codeParrainAttribue}`}
                </p>
                <button onClick={() => { navigator.clipboard.writeText(`https://www.sigmafactory.org/parrainage/${codeParrainAttribue}`); toast.success("Lien copie"); }}
                  style={{ padding: "6px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", color: colors.faint, cursor: "pointer", flexShrink: 0 }}>
                  <Copy size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            {conventionUrl && (
              <a href={conventionUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>
                <FileText size={14} strokeWidth={1.5} /> Telecharger ma convention
              </a>
            )}
            <a href="/dashboard/courtier" style={{ ...btnPrimary, textDecoration: "none" }}>
              Acceder a mon espace courtier
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "20px", fontWeight: 700, letterSpacing: "0.15em", color: colors.gold, margin: 0 }}>SIGMA FACTORY</h1>
            <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, letterSpacing: "0.08em", textTransform: "uppercase", margin: "2px 0 0" }}>Conseil en Immobilier & Financement</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, color: colors.gold, margin: 0 }}>Programme Courtiers</p>
            <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, margin: "2px 0 0" }}>Convention de partenariat</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      {step !== "accueil" && (
        <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", padding: "10px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
            {[{ id: "identite", label: "1. Informations" }, { id: "contrat", label: "2. Contrat" }, { id: "signature", label: "3. Signature" }].map((s, i) => {
              const steps: Step[] = ["identite", "contrat", "signature"];
              const currentIdx = steps.indexOf(step as any);
              const sIdx = steps.indexOf(s.id as any);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, color: sIdx <= currentIdx ? colors.gold : colors.faint, letterSpacing: "0.04em" }}>{s.label}</span>
                  {i < 2 && <ChevronRight size={12} strokeWidth={1.5} style={{ color: colors.faint }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACCUEIL */}
      {step === "accueil" && (
        <div>
          <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: "48px 24px" }}>
            <div style={{ maxWidth: "900px", margin: "0 auto" }}>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 700, color: colors.fg, letterSpacing: "0.04em", marginBottom: "12px" }}>
                Rejoignez le reseau <span style={{ color: colors.gold }}>Sigma</span>
              </h2>
              <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, marginBottom: "32px", maxWidth: "560px" }}>
                Apportez des dossiers de financement, developpez votre reseau et percevez des retrocommissions sur votre reseau.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                {[{ pct: "75%", label: "Des honoraires\npour vous" }, { pct: "10%", label: "Residuel N1\nsur vos filleuls" }, { pct: "5%", label: "Residuel N2\nreseau croise" }].map((r, i) => (
                  <div key={i} style={{ border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px" }}>
                    <p style={{ fontFamily: fonts.heading, fontSize: "32px", fontWeight: 700, color: colors.gold, margin: "0 0 4px" }}>{r.pct}</p>
                    <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, margin: 0, whiteSpace: "pre-line", lineHeight: "1.5" }}>{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "48px" }}>
              {[
                { title: "Remplissez le formulaire", desc: "Vos informations personnelles et professionnelles" },
                { title: "Lisez la convention", desc: "Prenez connaissance des termes du partenariat avant de signer" },
                { title: "Signez electroniquement", desc: "Signature legale — convention PDF generee instantanement" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "16px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "2px", background: colors.gold, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.body, fontSize: "11px", fontWeight: 700, color: colors.bg, flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: 500, color: colors.fg, marginBottom: "4px" }}>{item.title}</p>
                    <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <button onClick={() => setStep("identite")} style={btnPrimary}>
                Devenir Courtier Partenaire <ChevronRight size={14} strokeWidth={1.5} />
              </button>
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "16px" }}>Signature electronique securisee — Convention PDF generee automatiquement</p>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", border: `1px solid ${colors.border}`, background: colors.surface, borderRadius: "2px", padding: "24px", maxWidth: "640px", margin: "0 auto" }}>
              <Shield size={20} strokeWidth={1.5} style={{ color: colors.gold, flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: 500, color: colors.fg, marginBottom: "4px" }}>SIGMA FACTORY SAS</p>
                <p style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6", margin: 0 }}>
                  Capital 5 000 EUR — RCS Lyon 999 672 777 — Carte pro CPI69012026000000022 — CCI Lyon Metropole<br />12 Rue de la Part-Dieu, 69003 Lyon
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IDENTITE */}
      {step === "identite" && (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "4px" }}>Vos informations</h2>
            <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>Ces informations apparaitront sur votre convention de partenariat.</p>
          </div>

          {/* Informations personnelles */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "20px" }}>
            <SectionDivider>Informations personnelles</SectionDivider>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div><label style={labelStyle}>Prenom <span style={{ color: colors.gold }}>*</span></label><SInput value={form.prenom} onChange={set("prenom")} /></div>
              <div><label style={labelStyle}>Nom <span style={{ color: colors.gold }}>*</span></label><SInput value={form.nom} onChange={set("nom")} /></div>
              <div><label style={labelStyle}>Email professionnel <span style={{ color: colors.gold }}>*</span></label><SInput type="email" value={form.email} onChange={set("email")} /></div>
              <div><label style={labelStyle}>Telephone <span style={{ color: colors.gold }}>*</span></label><SInput value={form.telephone} onChange={set("telephone")} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Adresse <span style={{ color: colors.gold }}>*</span></label><SInput value={form.adresse} onChange={set("adresse")} /></div>
              <div><label style={labelStyle}>Code postal <span style={{ color: colors.gold }}>*</span></label><SInput value={form.codePostal} onChange={set("codePostal")} /></div>
              <div><label style={labelStyle}>Ville <span style={{ color: colors.gold }}>*</span></label><SInput value={form.ville} onChange={set("ville")} /></div>
            </div>
          </div>

          {/* Professionnel */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "20px" }}>
            <SectionDivider>Informations professionnelles</SectionDivider>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div>
                <label style={labelStyle}>Statut juridique <span style={{ color: colors.gold }}>*</span></label>
                <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value as any }))} className="w-full focus:outline-none" style={selectStyle}
                  onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }}>
                  <option value="">Choisir...</option>
                  <option value="auto_entrepreneur">Auto-entrepreneur</option><option value="eirl">EIRL</option>
                  <option value="eurl">EURL</option><option value="sasu">SASU</option>
                  <option value="sarl">SARL</option><option value="autre">Autre</option>
                </select>
              </div>
              <div><label style={labelStyle}>Numero ORIAS</label><SInput value={form.numeroOrias} onChange={set("numeroOrias")} placeholder="Ex: 12345678" /></div>
              <div><label style={labelStyle}>Nom du cabinet</label><SInput value={form.cabinetNom} onChange={set("cabinetNom")} /></div>
              <div><label style={labelStyle}>SIRET</label><SInput value={form.siret} onChange={set("siret")} /></div>
            </div>

            <div>
              <label style={labelStyle}>Specialites</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {SPECIALITES.map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input type="checkbox" checked={specialitesSelected.includes(s.id)}
                      onChange={e => setSpecialitesSelected(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))}
                      style={{ accentColor: colors.gold }} />
                    <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg }}>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Juridique */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "20px" }}>
            <SectionDivider>Informations juridiques <span style={{ color: colors.faint, fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>(optionnel)</span></SectionDivider>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Denomination sociale</label><SInput value={form.denominationSociale} onChange={set("denominationSociale")} placeholder="Ex: CABINET DUPONT FINANCES" /></div>
              <div><label style={labelStyle}>Forme juridique</label><SInput value={form.formeJuridique} onChange={set("formeJuridique")} placeholder="Ex: SARL, SAS, EI..." /></div>
              <div><label style={labelStyle}>Capital social (EUR)</label><SInput value={form.capitalSocial} onChange={set("capitalSocial")} placeholder="Ex: 10 000" /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Adresse du siege social</label><SInput value={form.adresseSiegeSocial} onChange={set("adresseSiegeSocial")} placeholder="Numero, rue, code postal, ville" /></div>
              <div><label style={labelStyle}>Ville du greffe RCS</label><SInput value={form.villeGreffe} onChange={set("villeGreffe")} placeholder="Ex: Paris" /></div>
              <div><label style={labelStyle}>Numero RCS</label><SInput value={form.numeroRCS} onChange={set("numeroRCS")} placeholder="Ex: 123 456 789" /></div>
              <div><label style={labelStyle}>Representant legal</label><SInput value={form.representantLegalNom} onChange={set("representantLegalNom")} placeholder="Ex: Jean DUPONT" /></div>
              <div><label style={labelStyle}>Fonction du representant</label><SInput value={form.representantLegalFonction} onChange={set("representantLegalFonction")} placeholder="Ex: Gerant, President..." /></div>
            </div>
          </div>

          {/* Parrain */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "24px" }}>
            <SectionDivider>Code parrain <span style={{ color: colors.faint, fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>(optionnel)</span></SectionDivider>
            <div style={{ maxWidth: "380px" }}>
              <label style={labelStyle}>Code ou email de votre parrain</label>
              <div style={{ position: "relative" }}>
                <input value={parrainQuery} onChange={e => setParrainQuery(e.target.value)} placeholder="SIG-NOM-0001 ou email@exemple.fr"
                  className="w-full focus:outline-none" style={{ ...inputStyle, ...(parrainResolu ? { borderColor: `${colors.success}60` } : {}) }}
                  onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = parrainResolu ? `${colors.success}60` : colors.border; }}
                />
                {loadingParrain && parrainDebounced.length >= 3 && <Loader2 size={13} className="animate-spin" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: colors.faint }} />}
                {!loadingParrain && parrainResolu && <CheckCircle size={13} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: colors.success }} />}
                {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && <AlertCircle size={13} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: colors.destructive }} />}
              </div>
              {parrainResolu && <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.success, marginTop: "4px" }}>{parrainResolu.nom} — {parrainResolu.type === "agent" ? "Agent Immobilier" : parrainResolu.type === "courtier" ? "Courtier" : "Sigma Factory"} — {parrainResolu.code}</p>}
              {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.destructive, marginTop: "4px" }}>Code ou email non reconnu dans le reseau Sigma</p>}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => setStep("accueil")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
            <button onClick={() => { if (validateIdentite()) setStep("contrat"); }} style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}>Lire la convention <ChevronRight size={14} strokeWidth={1.5} /></button>
          </div>
        </div>
      )}

      {/* CONTRAT */}
      {step === "contrat" && (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "4px" }}>Convention de Partenariat Courtage</h2>
            <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>Lisez attentivement la convention avant de signer.</p>
          </div>

          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "40px 36px", maxHeight: "65vh", overflowY: "auto", fontFamily: fonts.body, fontSize: "13px", color: colors.muted, lineHeight: "1.7" }}>
            <div style={{ textAlign: "center", paddingBottom: "24px", borderBottom: `1px solid ${colors.border}`, marginBottom: "24px" }}>
              <h3 style={{ fontFamily: fonts.heading, fontSize: "20px", fontWeight: 600, color: colors.fg, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Convention de Partenariat Courtage</h3>
              <p style={{ color: colors.gold, fontWeight: 500, fontSize: "12px", marginBottom: "4px" }}>Programme d'Affiliation Reseau — Sigma Factory</p>
              <p style={{ color: colors.faint, fontSize: "11px" }}>Entre SIGMA FACTORY SAS et {form.prenom} {form.nom}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", marginBottom: "24px" }}>
              <div>
                <p style={{ ...labelStyle, marginBottom: "8px" }}>La Societe</p>
                <p style={{ color: colors.fg, fontWeight: 500, margin: "0 0 4px" }}>SIGMA FACTORY SAS</p>
                <p style={{ fontSize: "11px", color: colors.faint, margin: 0, lineHeight: "1.6" }}>Capital 5 000 EUR — RCS Lyon 999 672 777<br />12 Rue de la Part-Dieu, 69003 Lyon<br />Carte pro CPI69012026000000022<br />Representee par Carole Pennavayre, Presidente</p>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: "8px" }}>Le Courtier Partenaire</p>
                <p style={{ color: colors.fg, fontWeight: 500, margin: "0 0 4px" }}>{form.prenom} {form.nom}</p>
                <p style={{ fontSize: "11px", color: colors.faint, margin: 0, lineHeight: "1.6" }}>{form.cabinetNom && <>{form.cabinetNom}<br /></>}{form.statut}<br />{form.adresse}<br />{form.codePostal} {form.ville}<br />{form.email}</p>
              </div>
            </div>

            <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", textAlign: "center", marginBottom: "24px" }}>
              <p style={{ color: colors.fg, fontWeight: 500, fontSize: "14px", marginBottom: "12px" }}>Repartition des Honoraires</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                {[{ pct: "75%", label: "Part Courtier\nSur chaque dossier finalise" }, { pct: "10%", label: "Retrocommission N1\nSur la Part Sigma" }, { pct: "5%", label: "Retrocommission N2\nReseau croise" }].map((r, i) => (
                  <div key={i} style={{ border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "16px" }}>
                    <p style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: 700, color: colors.gold, margin: "0 0 4px" }}>{r.pct}</p>
                    <p style={{ fontSize: "11px", color: colors.faint, margin: 0, whiteSpace: "pre-line", lineHeight: "1.5" }}>{r.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {[
              { title: "Article 1 — Objet de la Convention", content: "La presente convention a pour objet de definir les conditions dans lesquelles le Courtier s'engage a apporter des dossiers de financement a SIGMA FACTORY SAS dans le cadre d'un partenariat de courtage en credit immobilier et/ou professionnel, et a developper un reseau de partenaires affilies dans le cadre du Programme d'Affiliation Sigma. Le Courtier exerce son activite sous son propre numero ORIAS et sous sa propre responsabilite professionnelle." },
              { title: "Article 2 — Missions du Courtier Partenaire", content: "Dans le cadre de la presente convention, le Courtier s'engage a : apporter des dossiers de financement qualifies (credit immobilier, pret professionnel, rachat de credit) a SIGMA FACTORY SAS ; assurer le montage et le suivi des dossiers jusqu'a leur finalisation ; respecter la reglementation en vigueur, notamment les obligations liees a son immatriculation ORIAS ; promouvoir le reseau SIGMA FACTORY aupres de son reseau professionnel ; maintenir la confidentialite sur les informations clients et les methodes de travail de SIGMA FACTORY SAS." },
              { title: "Article 3 — Remuneration et Retrocommissions", content: "Commission principale (75%) : Pour chaque dossier de financement finalise, le Courtier percoit 75% des honoraires HT encaisses par la Societe. Les 25% restants constituent la Part Sigma. Programme d'affiliation : Niveau 1 — 10% de la Part Sigma sur tout dossier finalise par un partenaire directement recrute. Niveau 2 — 5% de la Part Sigma sur tout dossier finalise par un partenaire de niveau 2. Les remunerations sont versees dans les 30 jours suivant l'encaissement effectif." },
              { title: "Article 4 — Obligations Reglementaires", content: "Le Courtier declare etre regulierement immatricule a l'ORIAS en qualite d'Intermediaire en Operations de Banque et en Services de Paiement (IOBSP) et s'engage a maintenir cette immatriculation en cours de validite pendant toute la duree de la presente convention." },
              { title: "Article 5 — Confidentialite et Protection des Donnees", content: "Le Courtier s'engage a maintenir strictement confidentielle toute information relative aux clients, prospects, tarifs, methodes et outils de SIGMA FACTORY SAS, pendant toute la duree de la convention et pour une periode de 5 ans apres sa resiliation. Les donnees personnelles des clients sont traitees conformement au RGPD." },
              { title: "Article 6 — Non-Concurrence et Loyaute", content: "Pendant la duree de la convention et pendant les 12 mois suivant sa resiliation, le Courtier s'interdit de solliciter ou de tenter de recruter tout partenaire, salarie ou client de SIGMA FACTORY SAS pour le compte d'une structure concurrente." },
              { title: "Article 7 — Duree et Resiliation", content: "La presente convention est conclue pour une duree indeterminee a compter de sa signature electronique. Chaque partie peut y mettre fin a tout moment par notification ecrite avec un preavis de 30 jours." },
              { title: "Article 8 — Statut Independant et Obligations Fiscales", content: "Le Courtier declare exercer son activite en toute independance et sous sa propre responsabilite. Il est seul responsable du respect de ses obligations fiscales et sociales." },
              { title: "Article 9 — Droit Applicable et Litiges", content: "La presente convention est soumise au droit francais. En cas de litige, les parties s'engagent a rechercher une solution amiable dans un delai de 30 jours. A defaut, le Tribunal de Commerce de Lyon sera seul competent." },
            ].map((art, i) => (
              <div key={i} style={{ marginBottom: "16px" }}>
                <p style={{ color: colors.fg, fontWeight: 500, marginBottom: "4px" }}>{art.title}</p>
                <p style={{ color: colors.faint, fontSize: "12px", lineHeight: "1.6", margin: 0 }}>{art.content}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button onClick={() => setStep("identite")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
            <button onClick={() => setStep("signature")} style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}>J'ai lu la convention — Signer <ChevronRight size={14} strokeWidth={1.5} /></button>
          </div>
        </div>
      )}

      {/* SIGNATURE */}
      {step === "signature" && (
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px" }}>
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
              {form.cabinetNom && <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: "0 0 2px" }}>{form.cabinetNom}</p>}
              {form.numeroOrias && <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0 }}>ORIAS : {form.numeroOrias}</p>}
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ ...labelStyle, fontWeight: 600 }}>Signez en tapant votre nom complet <span style={{ color: colors.gold }}>*</span></label>
              <input value={form.signatureNom} onChange={set("signatureNom")} placeholder={`${form.prenom} ${form.nom}`}
                className="w-full focus:outline-none"
                style={{ ...inputStyle, fontSize: "18px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", padding: "16px 14px" }}
                onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }}
              />
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "4px" }}>En saisissant votre nom, vous apposez votre signature electronique au sens de l'article 1367 du Code civil.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.accepteConditions} onChange={e => setForm(f => ({ ...f, accepteConditions: e.target.checked }))} style={{ accentColor: colors.gold, marginTop: "2px", flexShrink: 0 }} />
                <span style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6" }}>
                  J'ai lu et j'accepte les conditions generales du Programme Courtier Sigma Factory, notamment les modalites de remuneration (75% des honoraires, retrocommissions reseau : 10% Niveau 1, 5% Niveau 2) et les obligations de confidentialite. J'accepte egalement le traitement de mes donnees personnelles conformement a la <a href="/politique-confidentialite" target="_blank" rel="noreferrer" style={{ color: colors.gold, textDecoration: "underline" }}>politique de confidentialite</a>.
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.accepteContrat} onChange={e => setForm(f => ({ ...f, accepteContrat: e.target.checked }))} style={{ accentColor: colors.gold, marginTop: "2px", flexShrink: 0 }} />
                <span style={{ fontFamily: fonts.body, fontSize: "12px", color: colors.muted, lineHeight: "1.6" }}>
                  Je certifie avoir pris connaissance de la convention de partenariat dans son integralite et je m'engage a respecter l'ensemble de ses clauses. Je confirme que les informations fournies sont exactes.
                </span>
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "16px" }}>
              <Shield size={16} strokeWidth={1.5} style={{ color: colors.gold, flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, lineHeight: "1.6", margin: 0 }}>
                Une convention PDF horodatee sera generee et envoyee a votre adresse email. Cette signature electronique a valeur legale conformement a l'article 1367 du Code civil francais et au reglement eIDAS.
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
    </div>
  );
}

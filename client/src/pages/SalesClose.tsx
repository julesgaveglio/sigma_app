import { useState } from "react";
import { trpc } from "@/lib/trpc";

type Resultat = "close" | "non_close" | "r2" | "perdu";

/* ── Shared inline style helpers ── */
const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  padding: "12px 14px",
  color: "var(--foreground)",
  fontSize: "14px",
  fontFamily: "'Hanken Grotesk', sans-serif",
  width: "100%",
  outline: "none",
  transition: "border-color 300ms ease",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontWeight: 500,
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--foreground-muted)",
  display: "block",
  marginBottom: "8px",
};

const sectionStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  padding: "32px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: "18px",
  fontWeight: 600,
  color: "var(--foreground)",
  letterSpacing: "0.04em",
  marginBottom: "24px",
  paddingBottom: "16px",
  borderBottom: "1px solid var(--border)",
};

const selectTriggerStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  padding: "12px 14px",
  color: "var(--foreground)",
  fontSize: "14px",
  fontFamily: "'Hanken Grotesk', sans-serif",
  width: "100%",
  cursor: "pointer",
  outline: "none",
  transition: "border-color 300ms ease",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
};

const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "var(--gold)";
};
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "var(--border)";
};

export default function SalesClose() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    closerNom: "",
    leadEmail: "",
    leadTelephone: "",
    offre: "" as "IDRH" | "HZC" | "SDT" | "",
    show: "" as "true" | "false" | "",
    resultat: "" as Resultat | "",
    lienFathom: "",
    formule: "" as "Starter" | "Premium" | "",
    modePaiement: "" as "une_fois" | "deux_fois" | "trois_fois" | "",
    montantGenere: "",
    montantEncaisse: "",
    hasCb: false,
    montantCb: "",
    hasVirement: false,
    montantVirement: "",
    hasCreditImpot: false,
    montantCreditImpot: "",
    hasPrelevement: false,
    montantPrelevement: "",
    datePrelevement: "",
    commentaire: "",
    dateCall: new Date().toISOString().slice(0, 16),
  });

  const soumettre = trpc.sales.soumettre.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => setError(e.message),
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const isShow = form.show === "true";
  const isClose = form.resultat === "close";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.closerNom || !form.offre || form.show === "") {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (isShow && !form.resultat) {
      setError("Veuillez indiquer le resultat du call.");
      return;
    }

    soumettre.mutate({
      closerNom: form.closerNom,
      leadEmail: form.leadEmail || undefined,
      leadTelephone: form.leadTelephone || undefined,
      offre: form.offre as "IDRH" | "HZC" | "SDT",
      show: form.show === "true",
      pitche: isClose,
      resultat: form.resultat as Resultat || undefined,
      lienFathom: form.lienFathom || undefined,
      formule: isClose ? (form.formule as "Starter" | "Premium" | undefined || undefined) : undefined,
      modePaiement: isClose ? (form.modePaiement as "une_fois" | "deux_fois" | "trois_fois" | undefined || undefined) : undefined,
      montantGenere: isClose ? (parseFloat(form.montantGenere) || 0) : 0,
      montantEncaisse: isClose ? (parseFloat(form.montantEncaisse) || 0) : 0,
      montantCb: isClose && form.hasCb ? parseFloat(form.montantCb) || 0 : undefined,
      montantVirement: isClose && form.hasVirement ? parseFloat(form.montantVirement) || 0 : undefined,
      montantCreditImpot: isClose && form.hasCreditImpot ? parseFloat(form.montantCreditImpot) || 0 : undefined,
      montantPrelevement: isClose && form.hasPrelevement ? parseFloat(form.montantPrelevement) || 0 : undefined,
      datePrelevement: isClose && form.hasPrelevement ? form.datePrelevement : undefined,
      commentaire: form.commentaire || undefined,
      dateCall: form.dateCall,
    });
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm(f => ({
      ...f,
      leadEmail: "", leadTelephone: "", show: "", resultat: "", lienFathom: "",
      formule: "", modePaiement: "", montantGenere: "", montantEncaisse: "",
      hasCb: false, montantCb: "", hasVirement: false, montantVirement: "",
      hasCreditImpot: false, montantCreditImpot: "", hasPrelevement: false,
      montantPrelevement: "", datePrelevement: "", commentaire: "",
      dateCall: new Date().toISOString().slice(0, 16),
    }));
  };

  /* ── Confirmation post-submit ── */
  if (submitted) {
    return (
      <div style={{ background: "var(--background)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "380px" }}>
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "24px", marginBottom: "24px" }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "0.04em",
              marginBottom: "12px",
            }}>
              Call enregistre
            </h2>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "13px",
              color: "var(--foreground-muted)",
              lineHeight: "1.6",
              margin: 0,
            }}>
              Les donnees ont bien ete transmises a la direction.
            </p>
          </div>
          <button
            onClick={resetForm}
            style={{
              background: "var(--gold)",
              color: "var(--background)",
              border: "none",
              borderRadius: "2px",
              padding: "14px 28px",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
              transition: "opacity 300ms ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Saisir un nouveau call
          </button>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--background)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: "520px", margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
              color: "var(--gold)",
              margin: "0 0 4px",
            }}>
              SIGMA FACTORY
            </p>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "20px",
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "0.04em",
              margin: 0,
            }}>
              Rapport de Call
            </h1>
          </div>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "11px",
            color: "var(--foreground-faint)",
            margin: 0,
          }}>
            Saisie obligatoire apres chaque appel
          </p>
        </div>
      </header>

      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "32px 24px 48px" }}>
        <form onSubmit={handleSubmit}>

          {/* ── SECTION 1 : CLOSER & CALL ── */}
          <div style={{ ...sectionStyle, marginBottom: "24px" }}>
            <h2 style={sectionTitleStyle}>Closer & Call</h2>

            {/* Closer */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Votre prenom *</label>
              <select
                value={form.closerNom}
                onChange={e => set("closerNom", e.target.value)}
                style={{
                  ...selectTriggerStyle,
                  color: form.closerNom ? "var(--foreground)" : "var(--foreground-faint)",
                }}
                onFocus={focusIn as any}
                onBlur={focusOut as any}
              >
                <option value="" disabled>Selectionnez votre prenom...</option>
                <option value="Marie">Marie</option>
                <option value="Laurent">Laurent</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Offre */}
              <div>
                <label style={labelStyle}>Offre *</label>
                <select
                  value={form.offre}
                  onChange={e => set("offre", e.target.value)}
                  style={{
                    ...selectTriggerStyle,
                    color: form.offre ? "var(--foreground)" : "var(--foreground-faint)",
                  }}
                  onFocus={focusIn as any}
                  onBlur={focusOut as any}
                >
                  <option value="" disabled>Offre...</option>
                  {["IDRH", "HZC", "SDT"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Date & heure du call */}
              <div>
                <label style={labelStyle}>Date & heure du call *</label>
                <input
                  type="datetime-local"
                  value={form.dateCall}
                  onChange={e => set("dateCall", e.target.value)}
                  style={{ ...inputStyle, colorScheme: "dark" }}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2 : LEAD ── */}
          <div style={{ ...sectionStyle, marginBottom: "24px" }}>
            <h2 style={sectionTitleStyle}>Lead</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={form.leadEmail}
                  onChange={e => set("leadEmail", e.target.value)}
                  placeholder="email@exemple.fr"
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
              </div>
              <div>
                <label style={labelStyle}>Telephone</label>
                <input
                  value={form.leadTelephone}
                  onChange={e => set("leadTelephone", e.target.value)}
                  placeholder="06 XX XX XX XX"
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 3 : RESULTAT DU CALL ── */}
          <div style={{ ...sectionStyle, marginBottom: "24px" }}>
            <h2 style={sectionTitleStyle}>Resultat du call</h2>

            {/* Show / No Show */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Presence *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[{ v: "true", label: "Show" }, { v: "false", label: "No Show" }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => { set("show", opt.v); if (opt.v === "false") set("resultat", ""); }}
                    style={{
                      background: form.show === opt.v ? "rgba(201, 168, 76, 0.06)" : "var(--surface-raised)",
                      border: `1px solid ${form.show === opt.v ? "var(--gold)" : "var(--border)"}`,
                      borderRadius: "2px",
                      padding: "12px",
                      color: form.show === opt.v ? "var(--gold)" : "var(--foreground-muted)",
                      fontSize: "13px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 300ms ease",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultat detaille */}
            {isShow && (
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Resultat *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    { v: "close", label: "Close" },
                    { v: "non_close", label: "Non close" },
                    { v: "r2", label: "R2" },
                    { v: "perdu", label: "Perdu" },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => set("resultat", opt.v)}
                      style={{
                        background: form.resultat === opt.v ? "rgba(201, 168, 76, 0.06)" : "var(--surface-raised)",
                        border: `1px solid ${form.resultat === opt.v ? "var(--gold)" : "var(--border)"}`,
                        borderRadius: "2px",
                        padding: "12px",
                        color: form.resultat === opt.v ? "var(--gold)" : "var(--foreground-muted)",
                        fontSize: "13px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 300ms ease",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lien Fathom */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Lien Fathom</label>
              <input
                value={form.lienFathom}
                onChange={e => set("lienFathom", e.target.value)}
                placeholder="https://fathom.video/..."
                style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>

            {/* Commentaire */}
            <div>
              <label style={labelStyle}>Commentaire</label>
              <textarea
                value={form.commentaire}
                onChange={e => set("commentaire", e.target.value)}
                placeholder="Objections, contexte, prochaine etape..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "none",
                }}
                onFocus={focusIn as any}
                onBlur={focusOut as any}
              />
            </div>
          </div>

          {/* ── SECTION 4 : DETAIL DU CA — uniquement si Close ── */}
          {isShow && isClose && (
            <div style={{ ...sectionStyle, borderColor: "var(--gold)", marginBottom: "24px" }}>
              <h2 style={{ ...sectionTitleStyle, color: "var(--gold)" }}>Detail du CA</h2>

              {/* Formule + Mode de paiement */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={labelStyle}>Formule vendue</label>
                  <select
                    value={form.formule}
                    onChange={e => set("formule", e.target.value)}
                    style={{
                      ...selectTriggerStyle,
                      color: form.formule ? "var(--foreground)" : "var(--foreground-faint)",
                    }}
                    onFocus={focusIn as any}
                    onBlur={focusOut as any}
                  >
                    <option value="" disabled>Formule...</option>
                    <option value="Starter">Starter</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Mode de paiement</label>
                  <select
                    value={form.modePaiement}
                    onChange={e => set("modePaiement", e.target.value)}
                    style={{
                      ...selectTriggerStyle,
                      color: form.modePaiement ? "var(--foreground)" : "var(--foreground-faint)",
                    }}
                    onFocus={focusIn as any}
                    onBlur={focusOut as any}
                  >
                    <option value="" disabled>Paiement...</option>
                    <option value="une_fois">1x (comptant)</option>
                    <option value="deux_fois">2x (echelonne)</option>
                    <option value="trois_fois">3x (echelonne)</option>
                  </select>
                </div>
              </div>

              {/* Montants globaux */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div>
                  <label style={labelStyle}>Montant genere (EUR TTC)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.montantGenere}
                    onChange={e => set("montantGenere", e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                    onFocus={focusIn}
                    onBlur={focusOut}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Montant encaisse (EUR TTC)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.montantEncaisse}
                    onChange={e => set("montantEncaisse", e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                    onFocus={focusIn}
                    onBlur={focusOut}
                  />
                </div>
              </div>

              {/* Detail par mode */}
              <div>
                <label style={{ ...labelStyle, marginBottom: "16px" }}>Detail des encaissements</label>

                {/* CB Stripe */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <button
                    type="button"
                    onClick={() => set("hasCb", !form.hasCb)}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "2px",
                      border: `1px solid ${form.hasCb ? "var(--gold)" : "var(--border)"}`,
                      background: form.hasCb ? "var(--gold)" : "var(--surface-raised)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: 0,
                      transition: "all 300ms ease",
                    }}
                  >
                    {form.hasCb && <span style={{ color: "var(--background)", fontSize: "11px", fontWeight: 700, lineHeight: 1 }}>&#10003;</span>}
                  </button>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "var(--foreground)", width: "120px", flexShrink: 0 }}>CB Stripe</span>
                  {form.hasCb && (
                    <input
                      type="number" min="0" step="0.01" value={form.montantCb}
                      onChange={e => set("montantCb", e.target.value)} placeholder="0.00"
                      style={{ ...inputStyle, padding: "8px 12px", fontSize: "13px" }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  )}
                </div>

                {/* Virement */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <button
                    type="button"
                    onClick={() => set("hasVirement", !form.hasVirement)}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "2px",
                      border: `1px solid ${form.hasVirement ? "var(--gold)" : "var(--border)"}`,
                      background: form.hasVirement ? "var(--gold)" : "var(--surface-raised)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: 0,
                      transition: "all 300ms ease",
                    }}
                  >
                    {form.hasVirement && <span style={{ color: "var(--background)", fontSize: "11px", fontWeight: 700, lineHeight: 1 }}>&#10003;</span>}
                  </button>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "var(--foreground)", width: "120px", flexShrink: 0 }}>Virement</span>
                  {form.hasVirement && (
                    <input
                      type="number" min="0" step="0.01" value={form.montantVirement}
                      onChange={e => set("montantVirement", e.target.value)} placeholder="0.00"
                      style={{ ...inputStyle, padding: "8px 12px", fontSize: "13px" }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  )}
                </div>

                {/* Credit d'impot */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <button
                    type="button"
                    onClick={() => set("hasCreditImpot", !form.hasCreditImpot)}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "2px",
                      border: `1px solid ${form.hasCreditImpot ? "var(--gold)" : "var(--border)"}`,
                      background: form.hasCreditImpot ? "var(--gold)" : "var(--surface-raised)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: 0,
                      transition: "all 300ms ease",
                    }}
                  >
                    {form.hasCreditImpot && <span style={{ color: "var(--background)", fontSize: "11px", fontWeight: 700, lineHeight: 1 }}>&#10003;</span>}
                  </button>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "var(--foreground)", width: "120px", flexShrink: 0 }}>Credit d'impot</span>
                  {form.hasCreditImpot && (
                    <input
                      type="number" min="0" step="0.01" value={form.montantCreditImpot}
                      onChange={e => set("montantCreditImpot", e.target.value)} placeholder="0.00"
                      style={{ ...inputStyle, padding: "8px 12px", fontSize: "13px" }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  )}
                </div>

                {/* Prelevement */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => set("hasPrelevement", !form.hasPrelevement)}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "2px",
                      border: `1px solid ${form.hasPrelevement ? "var(--gold)" : "var(--border)"}`,
                      background: form.hasPrelevement ? "var(--gold)" : "var(--surface-raised)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: 0,
                      marginTop: "2px",
                      transition: "all 300ms ease",
                    }}
                  >
                    {form.hasPrelevement && <span style={{ color: "var(--background)", fontSize: "11px", fontWeight: 700, lineHeight: 1 }}>&#10003;</span>}
                  </button>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "var(--foreground)", width: "120px", flexShrink: 0, marginTop: "2px" }}>Prelevement</span>
                  {form.hasPrelevement && (
                    <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                      <input
                        type="number" min="0" step="0.01" value={form.montantPrelevement}
                        onChange={e => set("montantPrelevement", e.target.value)} placeholder="0.00"
                        style={{ ...inputStyle, padding: "8px 12px", fontSize: "13px" }}
                        onFocus={focusIn} onBlur={focusOut}
                      />
                      <input
                        type="date" value={form.datePrelevement}
                        onChange={e => set("datePrelevement", e.target.value)}
                        style={{ ...inputStyle, padding: "8px 12px", fontSize: "13px", colorScheme: "dark" }}
                        onFocus={focusIn} onBlur={focusOut}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{
              background: "var(--surface-header)",
              border: "1px solid #3A1E1E",
              borderRadius: "2px",
              padding: "12px 16px",
              marginBottom: "24px",
              color: "var(--destructive)",
              fontSize: "13px",
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={soumettre.isPending}
            style={{
              width: "100%",
              background: soumettre.isPending ? "var(--gold-muted)" : "var(--gold)",
              color: "var(--background)",
              border: "none",
              borderRadius: "2px",
              padding: "14px",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              cursor: soumettre.isPending ? "not-allowed" : "pointer",
              opacity: soumettre.isPending ? 0.7 : 1,
              transition: "opacity 300ms ease",
            }}
          >
            {soumettre.isPending ? "Enregistrement..." : "Enregistrer le call"}
          </button>

        </form>
      </div>
    </div>
  );
}

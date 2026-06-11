import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";

const LOGO_URL = "/logo-sigma.png";

/* ── Design tokens ── */
const fonts = { heading: "'Cormorant Garamond', serif", body: "'Hanken Grotesk', sans-serif" };
const colors = {
  bg: "var(--background)", surface: "var(--surface)", surfaceRaised: "var(--surface-raised)", border: "var(--border)",
  fg: "var(--foreground)", muted: "var(--foreground-muted)", faint: "var(--foreground-faint)", gold: "var(--gold)", goldMuted: "var(--gold-muted)", destructive: "var(--destructive)",
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

// ─── Types ────────────────────────────────────────────────────────────────────
type PatrimoineItem = {
  mensualite: string; typeGarantie: string; formatPropriete: string; dpe: string;
  loyersHC: string; capitalRestantDu: string; valeurActuelle: string;
};
type FormData = {
  e1Nom: string; e1Prenom: string; e1DateNaissance: string; e1Nationalite: string;
  e1SituationMatrimoniale: string; e1NbEnfants: string; e1Proprietaire: boolean;
  e1Activite: string; e1Anciennete: string; e1StatutPro: string;
  e1SalaireAvis2024: string; e1SalaireAvis2025: string; e1SalaireCumul2025: string;
  e1SalaireNet2026: string; e1AutresRevenus: string; e1AutresCharges: string;
  e1EpargneLiquide: string; e1EpargneNonLiquide: string; e1Apport: string;
  avecEmprunteur2: boolean;
  e2Nom: string; e2Prenom: string; e2DateNaissance: string; e2Nationalite: string;
  e2Activite: string; e2Anciennete: string; e2StatutPro: string;
  e2SalaireAvis2024: string; e2SalaireAvis2025: string; e2SalaireCumul2025: string;
  e2SalaireNet2026: string; e2EpargneLiquide: string; e2EpargneNonLiquide: string; e2Apport: string;
  patrimoine: PatrimoineItem[];
  montantProjet: string; duree: string; regimeFiscal: string; objetFinancement: string;
  incidentsATD: boolean; personneGarante: boolean; commentaire: string;
};

const EMPTY_PATRIMOINE: PatrimoineItem = {
  mensualite: "", typeGarantie: "", formatPropriete: "", dpe: "",
  loyersHC: "", capitalRestantDu: "", valeurActuelle: "",
};

const STEPS = [
  { id: 1, label: "Emprunteur 1" },
  { id: 2, label: "Emprunteur 2" },
  { id: 3, label: "Projet" },
];

// ─── Sub-components ──
function SLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label style={labelStyle}>{children}{required && <span style={{ color: colors.gold, marginLeft: "4px" }}>*</span>}</label>;
}

function SInput({ value, onChange, placeholder, type = "text", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      className="w-full focus:outline-none [color-scheme:dark]"
      style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }}
      onFocus={e => { e.target.style.borderColor = colors.gold; }}
      onBlur={e => { e.target.style.borderColor = colors.border; }}
    />
  );
}

function SSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full focus:outline-none"
      style={selectStyle}
      onFocus={e => { e.target.style.borderColor = colors.gold; }}
      onBlur={e => { e.target.style.borderColor = colors.border; }}
    >{children}</select>
  );
}

function SToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} style={{ accentColor: colors.gold }} />
      <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg }}>{label}</span>
    </label>
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

// ─── Step 1 ──
function Step1({ form, set }: { form: FormData; set: (k: keyof FormData) => (v: any) => void }) {
  return (
    <div>
      <SectionDivider>Identite</SectionDivider>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div><SLabel required>Nom</SLabel><SInput value={form.e1Nom} onChange={set("e1Nom")} placeholder="DUPONT" /></div>
        <div><SLabel required>Prenom</SLabel><SInput value={form.e1Prenom} onChange={set("e1Prenom")} placeholder="Jean" /></div>
        <div><SLabel>Date de naissance</SLabel><SInput value={form.e1DateNaissance} onChange={set("e1DateNaissance")} type="date" /></div>
        <div><SLabel>Nationalite</SLabel><SInput value={form.e1Nationalite} onChange={set("e1Nationalite")} placeholder="Francaise" /></div>
        <div>
          <SLabel>Situation matrimoniale</SLabel>
          <SSelect value={form.e1SituationMatrimoniale} onChange={set("e1SituationMatrimoniale")}>
            <option value="">Selectionner</option>
            <option value="celibataire">Celibataire</option>
            <option value="marie">Marie(e)</option>
            <option value="pacs">Pacse(e)</option>
            <option value="divorce">Divorce(e)</option>
            <option value="veuf">Veuf/Veuve</option>
          </SSelect>
        </div>
        <div><SLabel>Nb d'enfants a charge</SLabel><SInput value={form.e1NbEnfants} onChange={set("e1NbEnfants")} type="number" placeholder="0" /></div>
      </div>
      <SToggle checked={form.e1Proprietaire} onChange={set("e1Proprietaire")} label="Deja proprietaire" />

      <SectionDivider>Situation professionnelle</SectionDivider>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div><SLabel>Activite</SLabel><SInput value={form.e1Activite} onChange={set("e1Activite")} placeholder="Ex. Salarie, Gerant..." /></div>
        <div><SLabel>Anciennete</SLabel><SInput value={form.e1Anciennete} onChange={set("e1Anciennete")} placeholder="Ex. 3 ans" /></div>
        <div style={{ gridColumn: "1 / -1" }}>
          <SLabel>Statut professionnel</SLabel>
          <SSelect value={form.e1StatutPro} onChange={set("e1StatutPro")}>
            <option value="">Selectionner</option>
            <option value="cdi">CDI</option><option value="cdd">CDD</option>
            <option value="independant">Independant / Auto-entrepreneur</option>
            <option value="gerant">Gerant de societe</option>
            <option value="fonctionnaire">Fonctionnaire</option>
            <option value="retraite">Retraite</option><option value="autre">Autre</option>
          </SSelect>
        </div>
      </div>

      <SectionDivider>Revenus (en EUR)</SectionDivider>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div><SLabel>Avis d'imposition 2024</SLabel><SInput value={form.e1SalaireAvis2024} onChange={set("e1SalaireAvis2024")} type="number" placeholder="0" /></div>
        <div><SLabel>Avis d'imposition 2025</SLabel><SInput value={form.e1SalaireAvis2025} onChange={set("e1SalaireAvis2025")} type="number" placeholder="0" /></div>
        <div><SLabel>Cumul salaire 2025</SLabel><SInput value={form.e1SalaireCumul2025} onChange={set("e1SalaireCumul2025")} type="number" placeholder="0" /></div>
        <div><SLabel>Salaire net mensuel 2026</SLabel><SInput value={form.e1SalaireNet2026} onChange={set("e1SalaireNet2026")} type="number" placeholder="0" /></div>
        <div><SLabel>Autres revenus mensuels</SLabel><SInput value={form.e1AutresRevenus} onChange={set("e1AutresRevenus")} type="number" placeholder="0" /></div>
        <div><SLabel>Autres charges mensuelles</SLabel><SInput value={form.e1AutresCharges} onChange={set("e1AutresCharges")} type="number" placeholder="0" /></div>
      </div>

      <SectionDivider>Epargne & Apport (en EUR)</SectionDivider>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        <div><SLabel>Epargne liquide</SLabel><SInput value={form.e1EpargneLiquide} onChange={set("e1EpargneLiquide")} type="number" placeholder="0" /></div>
        <div><SLabel>Epargne non liquide</SLabel><SInput value={form.e1EpargneNonLiquide} onChange={set("e1EpargneNonLiquide")} type="number" placeholder="0" /></div>
        <div><SLabel>Apport personnel</SLabel><SInput value={form.e1Apport} onChange={set("e1Apport")} type="number" placeholder="0" /></div>
      </div>
    </div>
  );
}

// ─── Step 2 ──
function Step2({ form, set, setPatrimoine }: {
  form: FormData; set: (k: keyof FormData) => (v: any) => void;
  setPatrimoine: (fn: (p: PatrimoineItem[]) => PatrimoineItem[]) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 500, color: colors.fg }}>Co-emprunteur</span>
        <SToggle checked={form.avecEmprunteur2} onChange={set("avecEmprunteur2")} label="Ajouter un co-emprunteur" />
      </div>

      {form.avecEmprunteur2 && (
        <div style={{ padding: "24px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", marginBottom: "24px" }}>
          <SectionDivider>Identite co-emprunteur</SectionDivider>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div><SLabel>Nom</SLabel><SInput value={form.e2Nom} onChange={set("e2Nom")} placeholder="MARTIN" /></div>
            <div><SLabel>Prenom</SLabel><SInput value={form.e2Prenom} onChange={set("e2Prenom")} placeholder="Sophie" /></div>
            <div><SLabel>Date de naissance</SLabel><SInput value={form.e2DateNaissance} onChange={set("e2DateNaissance")} type="date" /></div>
            <div><SLabel>Nationalite</SLabel><SInput value={form.e2Nationalite} onChange={set("e2Nationalite")} placeholder="Francaise" /></div>
            <div><SLabel>Activite</SLabel><SInput value={form.e2Activite} onChange={set("e2Activite")} placeholder="Ex. Salarie..." /></div>
            <div><SLabel>Anciennete</SLabel><SInput value={form.e2Anciennete} onChange={set("e2Anciennete")} placeholder="Ex. 2 ans" /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <SLabel>Statut professionnel</SLabel>
              <SSelect value={form.e2StatutPro} onChange={set("e2StatutPro")}>
                <option value="">Selectionner</option>
                <option value="cdi">CDI</option><option value="cdd">CDD</option>
                <option value="independant">Independant / Auto-entrepreneur</option>
                <option value="gerant">Gerant de societe</option>
                <option value="fonctionnaire">Fonctionnaire</option>
                <option value="retraite">Retraite</option><option value="autre">Autre</option>
              </SSelect>
            </div>
          </div>
          <SectionDivider>Revenus co-emprunteur (en EUR)</SectionDivider>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div><SLabel>Avis d'imposition 2024</SLabel><SInput value={form.e2SalaireAvis2024} onChange={set("e2SalaireAvis2024")} type="number" placeholder="0" /></div>
            <div><SLabel>Avis d'imposition 2025</SLabel><SInput value={form.e2SalaireAvis2025} onChange={set("e2SalaireAvis2025")} type="number" placeholder="0" /></div>
            <div><SLabel>Cumul salaire 2025</SLabel><SInput value={form.e2SalaireCumul2025} onChange={set("e2SalaireCumul2025")} type="number" placeholder="0" /></div>
            <div><SLabel>Salaire net mensuel 2026</SLabel><SInput value={form.e2SalaireNet2026} onChange={set("e2SalaireNet2026")} type="number" placeholder="0" /></div>
            <div><SLabel>Epargne liquide</SLabel><SInput value={form.e2EpargneLiquide} onChange={set("e2EpargneLiquide")} type="number" placeholder="0" /></div>
            <div><SLabel>Epargne non liquide</SLabel><SInput value={form.e2EpargneNonLiquide} onChange={set("e2EpargneNonLiquide")} type="number" placeholder="0" /></div>
            <div><SLabel>Apport personnel</SLabel><SInput value={form.e2Apport} onChange={set("e2Apport")} type="number" placeholder="0" /></div>
          </div>
        </div>
      )}

      {/* Patrimoine immobilier */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <SectionDivider>Patrimoine immobilier existant</SectionDivider>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button type="button" onClick={() => setPatrimoine(p => [...p, { ...EMPTY_PATRIMOINE }])}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", fontFamily: fonts.body, fontSize: "11px", color: colors.muted, cursor: "pointer", letterSpacing: "0.04em" }}>
          <Plus size={12} strokeWidth={1.5} /> Ajouter un bien
        </button>
      </div>
      {form.patrimoine.length === 0 && (
        <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.faint, fontStyle: "italic" }}>
          Aucun bien immobilier existant — cliquez sur "Ajouter un bien" si applicable.
        </p>
      )}
      {form.patrimoine.map((item, idx) => (
        <div key={idx} style={{ padding: "20px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontFamily: fonts.body, fontSize: "12px", fontWeight: 500, color: colors.muted }}>Bien #{idx + 1}</span>
            <button type="button" onClick={() => setPatrimoine(p => p.filter((_, i) => i !== idx))}
              style={{ background: "none", border: "none", cursor: "pointer", color: colors.faint, transition: "color 300ms ease" }}
              onMouseEnter={e => { e.currentTarget.style.color = colors.destructive; }}
              onMouseLeave={e => { e.currentTarget.style.color = colors.faint; }}>
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><SLabel>Format de propriete</SLabel>
              <SSelect value={item.formatPropriete} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, formatPropriete: v } : x))}>
                <option value="">Selectionner</option><option value="pleine_propriete">Pleine propriete</option><option value="sci">SCI</option><option value="usufruit">Usufruit</option><option value="nue_propriete">Nue-propriete</option>
              </SSelect></div>
            <div><SLabel>Type de garantie</SLabel>
              <SSelect value={item.typeGarantie} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, typeGarantie: v } : x))}>
                <option value="">Selectionner</option><option value="hypotheque">Hypotheque</option><option value="ppd">PPD</option><option value="caution">Caution</option><option value="aucune">Aucune</option>
              </SSelect></div>
            <div><SLabel>DPE</SLabel>
              <SSelect value={item.dpe} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, dpe: v } : x))}>
                <option value="">Selectionner</option>{["A","B","C","D","E","F","G"].map(l => <option key={l} value={l}>{l}</option>)}
              </SSelect></div>
            <div><SLabel>Mensualite (EUR)</SLabel><SInput value={item.mensualite} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, mensualite: v } : x))} type="number" placeholder="0" /></div>
            <div><SLabel>Loyers HC (EUR/mois)</SLabel><SInput value={item.loyersHC} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, loyersHC: v } : x))} type="number" placeholder="0" /></div>
            <div><SLabel>Capital restant du (EUR)</SLabel><SInput value={item.capitalRestantDu} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, capitalRestantDu: v } : x))} type="number" placeholder="0" /></div>
            <div style={{ gridColumn: "1 / -1" }}><SLabel>Valeur actuelle estimee (EUR)</SLabel><SInput value={item.valeurActuelle} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, valeurActuelle: v } : x))} type="number" placeholder="0" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 3 ──
function Step3({ form, set }: { form: FormData; set: (k: keyof FormData) => (v: any) => void }) {
  return (
    <div>
      <SectionDivider>Projet d'acquisition</SectionDivider>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div><SLabel required>Montant du projet (EUR)</SLabel><SInput value={form.montantProjet} onChange={set("montantProjet")} type="number" placeholder="Ex. 300 000" /></div>
        <div><SLabel required>Duree souhaitee (mois)</SLabel>
          <SSelect value={form.duree} onChange={set("duree")}>
            <option value="">Selectionner</option>
            {[120,144,180,200,240,270,300].map(d => <option key={d} value={String(d)}>{d} mois ({Math.round(d/12)} ans)</option>)}
          </SSelect></div>
        <div><SLabel>Objet du financement</SLabel>
          <SSelect value={form.objetFinancement} onChange={set("objetFinancement")}>
            <option value="">Selectionner</option>
            <option value="residence_principale">Residence principale</option>
            <option value="investissement_locatif">Investissement locatif</option>
            <option value="residence_secondaire">Residence secondaire</option>
            <option value="terrain">Terrain</option><option value="autre">Autre</option>
          </SSelect></div>
        <div><SLabel>Regime fiscal envisage</SLabel>
          <SSelect value={form.regimeFiscal} onChange={set("regimeFiscal")}>
            <option value="">Selectionner</option>
            <option value="nu">Location nue</option><option value="meuble">Location meublee (LMNP/LMP)</option>
            <option value="sci_ir">SCI a l'IR</option><option value="sci_is">SCI a l'IS</option>
            <option value="pinel">Pinel</option><option value="denormandie">Denormandie</option><option value="autre">Autre</option>
          </SSelect></div>
      </div>

      <SectionDivider>Informations complementaires</SectionDivider>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <SToggle checked={form.incidentsATD} onChange={set("incidentsATD")} label="Incidents de paiement ou ATD dans les 5 dernieres annees" />
        <SToggle checked={form.personneGarante} onChange={set("personneGarante")} label="Une personne se porte garante" />
        <div>
          <SLabel>Commentaire libre</SLabel>
          <textarea value={form.commentaire} onChange={e => set("commentaire")(e.target.value)}
            placeholder="Informations complementaires, contexte du projet..."
            rows={4} className="w-full focus:outline-none"
            style={{ ...inputStyle, resize: "none" as const }}
            onFocus={e => { e.target.style.borderColor = colors.gold; }}
            onBlur={e => { e.target.style.borderColor = colors.border; }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function FormTableauCourtage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [dossierIdResult, setDossierIdResult] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>({
    e1Nom: "", e1Prenom: "", e1DateNaissance: "", e1Nationalite: "",
    e1SituationMatrimoniale: "", e1NbEnfants: "", e1Proprietaire: false,
    e1Activite: "", e1Anciennete: "", e1StatutPro: "",
    e1SalaireAvis2024: "", e1SalaireAvis2025: "", e1SalaireCumul2025: "",
    e1SalaireNet2026: "", e1AutresRevenus: "", e1AutresCharges: "",
    e1EpargneLiquide: "", e1EpargneNonLiquide: "", e1Apport: "",
    avecEmprunteur2: false,
    e2Nom: "", e2Prenom: "", e2DateNaissance: "", e2Nationalite: "",
    e2Activite: "", e2Anciennete: "", e2StatutPro: "",
    e2SalaireAvis2024: "", e2SalaireAvis2025: "", e2SalaireCumul2025: "",
    e2SalaireNet2026: "", e2EpargneLiquide: "", e2EpargneNonLiquide: "", e2Apport: "",
    patrimoine: [],
    montantProjet: "", duree: "", regimeFiscal: "", objetFinancement: "",
    incidentsATD: false, personneGarante: false, commentaire: "",
  });

  useEffect(() => {
    const nom = params.get("nom");
    const prenom = params.get("prenom") || params.get("prenoms");
    const dateNaissance = params.get("dateNaissance");
    const situationMatrimoniale = params.get("situationFamiliale");
    const nationalite = params.get("nationalite");
    setForm(f => ({
      ...f,
      e1Nom: nom || f.e1Nom, e1Prenom: prenom || f.e1Prenom,
      e1DateNaissance: dateNaissance || f.e1DateNaissance,
      e1SituationMatrimoniale: situationMatrimoniale || f.e1SituationMatrimoniale,
      e1Nationalite: nationalite === "francais" ? "Francaise" : nationalite === "etranger" ? "Etrangere" : f.e1Nationalite,
    }));
  }, []);

  const set = (k: keyof FormData) => (v: any) => setForm(f => ({ ...f, [k]: v }));
  const setPatrimoine = (fn: (p: PatrimoineItem[]) => PatrimoineItem[]) => setForm(f => ({ ...f, patrimoine: fn(f.patrimoine) }));

  const submitMutation = trpc.financement.soumettre.useMutation({
    onSuccess: (data) => { setDossierIdResult(data.id); setSubmitted(true); },
    onError: (err) => { toast.error(err.message || "Erreur lors de l'envoi"); },
  });

  const validate = () => {
    if (step === 0) {
      if (!form.e1Nom.trim()) { toast.error("Le nom est requis"); return false; }
      if (!form.e1Prenom.trim()) { toast.error("Le prenom est requis"); return false; }
    }
    if (step === 2) {
      if (!form.montantProjet) { toast.error("Le montant du projet est requis"); return false; }
      if (!form.duree) { toast.error("La duree est requise"); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < 2) { setStep(s => s + 1); window.scrollTo(0, 0); }
    else handleSubmit();
  };

  const handleSubmit = () => {
    const toNum = (v: string) => v ? Number(v) : undefined;
    submitMutation.mutate({
      emprunteur1Nom: form.e1Nom, emprunteur1Prenom: form.e1Prenom,
      emprunteur1DateNaissance: form.e1DateNaissance || undefined,
      emprunteur1Nationalite: form.e1Nationalite || undefined,
      emprunteur1SituationMatrimoniale: form.e1SituationMatrimoniale || undefined,
      emprunteur1NbEnfants: toNum(form.e1NbEnfants),
      emprunteur1Proprietaire: form.e1Proprietaire,
      emprunteur1Activite: form.e1Activite || undefined,
      emprunteur1Anciennete: form.e1Anciennete || undefined,
      emprunteur1StatutPro: form.e1StatutPro || undefined,
      emprunteur1SalaireAvis2024: toNum(form.e1SalaireAvis2024),
      emprunteur1SalaireAvis2025: toNum(form.e1SalaireAvis2025),
      emprunteur1SalaireCumul2025: toNum(form.e1SalaireCumul2025),
      emprunteur1SalaireNet2026: toNum(form.e1SalaireNet2026),
      emprunteur1AutresRevenus: toNum(form.e1AutresRevenus),
      emprunteur1AutresCharges: toNum(form.e1AutresCharges),
      emprunteur1EpargneLiquide: toNum(form.e1EpargneLiquide),
      emprunteur1EpargneNonLiquide: toNum(form.e1EpargneNonLiquide),
      emprunteur1Apport: toNum(form.e1Apport),
      ...(form.avecEmprunteur2 && form.e2Nom ? {
        emprunteur2Nom: form.e2Nom, emprunteur2Prenom: form.e2Prenom,
        emprunteur2DateNaissance: form.e2DateNaissance || undefined,
        emprunteur2Nationalite: form.e2Nationalite || undefined,
        emprunteur2Activite: form.e2Activite || undefined,
        emprunteur2Anciennete: form.e2Anciennete || undefined,
        emprunteur2StatutPro: form.e2StatutPro || undefined,
        emprunteur2SalaireAvis2024: toNum(form.e2SalaireAvis2024),
        emprunteur2SalaireAvis2025: toNum(form.e2SalaireAvis2025),
        emprunteur2SalaireCumul2025: toNum(form.e2SalaireCumul2025),
        emprunteur2SalaireNet2026: toNum(form.e2SalaireNet2026),
        emprunteur2EpargneLiquide: toNum(form.e2EpargneLiquide),
        emprunteur2EpargneNonLiquide: toNum(form.e2EpargneNonLiquide),
        emprunteur2Apport: toNum(form.e2Apport),
      } : {}),
      patrimoine: form.patrimoine.map(p => ({
        mensualite: toNum(p.mensualite), typeGarantie: p.typeGarantie || undefined,
        formatPropriete: p.formatPropriete || undefined, dpe: p.dpe || undefined,
        loyersHC: toNum(p.loyersHC), capitalRestantDu: toNum(p.capitalRestantDu),
        valeurActuelle: toNum(p.valeurActuelle),
      })),
      montantProjet: Number(form.montantProjet), duree: Number(form.duree),
      regimeFiscal: form.regimeFiscal || undefined, objetFinancement: form.objetFinancement || undefined,
      incidentsATD: form.incidentsATD, personneGarante: form.personneGarante,
      commentaire: form.commentaire || undefined,
    });
  };

  // ── Page de succes ──
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <CheckCircle size={40} strokeWidth={1.5} style={{ color: colors.gold, margin: "0 auto 20px", display: "block" }} />
          <img src={LOGO_URL} alt="Sigma Factory" style={{ height: "32px", margin: "0 auto 32px", display: "block", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
          <h1 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "8px" }}>
            Tableau de Courtage envoye
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, marginBottom: "8px" }}>
            Votre tableau de courtage <span style={{ color: colors.gold, fontWeight: 500 }}>#{dossierIdResult}</span> a bien ete transmis a l'equipe Sigma Factory.
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.faint, marginBottom: "32px" }}>
            Notre equipe courtage va analyser votre dossier et vous contacter pour definir votre enveloppe de financement.
          </p>

          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", textAlign: "left", marginBottom: "24px" }}>
            <p style={{ ...labelStyle, marginBottom: "12px" }}>Recapitulatif</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: fonts.body, fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Emprunteur :</span><span style={{ color: colors.fg }}>{form.e1Prenom} {form.e1Nom}</span></div>
              {form.avecEmprunteur2 && form.e2Nom && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Co-emprunteur :</span><span style={{ color: colors.fg }}>{form.e2Prenom} {form.e2Nom}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Montant :</span><span style={{ color: colors.gold, fontWeight: 600 }}>{Number(form.montantProjet).toLocaleString("fr-FR")} EUR</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Duree :</span><span style={{ color: colors.fg }}>{form.duree} mois</span></div>
              {form.objetFinancement && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.muted }}>Objet :</span><span style={{ color: colors.fg, textTransform: "capitalize" }}>{form.objetFinancement.replace(/_/g, " ")}</span></div>}
            </div>
          </div>

          {/* Barre de progression dossier */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", textAlign: "left" }}>
            <p style={{ ...labelStyle, marginBottom: "16px" }}>Votre dossier Sigma Factory</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Etat Civil", done: true },
                { label: "Mandat de Recherche", done: !!params.get("mandatId") },
                { label: "Tableau de Courtage", done: true },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: item.done ? colors.gold : "transparent", border: `1px solid ${item.done ? colors.gold : colors.border}`,
                  }}>
                    {item.done ? <CheckCircle size={12} strokeWidth={1.5} style={{ color: colors.bg }} /> : <span style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontFamily: fonts.body, fontSize: "13px", color: item.done ? colors.fg : colors.faint }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire ──
  return (
    <div style={{ minHeight: "100vh", background: colors.bg, padding: "32px 16px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src={LOGO_URL} alt="Sigma Factory" style={{ height: "36px", margin: "0 auto 16px", display: "block", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
          <h1 style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: 700, color: colors.fg, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
            Tableau de Courtage
          </h1>
          <div style={{ width: "40px", height: "1px", background: colors.gold, margin: "12px auto 12px" }} />
          <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0 }}>Sigma Factory — Courtage & Financement</p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
          {STEPS.map((s, i) => {
            const isActive = step === i;
            const isDone = step > i;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "48px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "2px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px solid ${isActive ? colors.gold : isDone ? colors.goldMuted : colors.border}`,
                    background: isActive ? colors.gold : "transparent",
                    transition: "all 300ms ease",
                    fontFamily: fonts.body, fontSize: "11px", fontWeight: 600,
                    color: isActive ? colors.bg : isDone ? colors.goldMuted : colors.faint,
                  }}>
                    {isDone ? <CheckCircle size={14} strokeWidth={1.5} style={{ color: colors.goldMuted }} /> : s.id}
                  </div>
                  <span style={{ fontFamily: fonts.body, fontSize: "9px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: isActive ? colors.fg : isDone ? colors.muted : colors.faint }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: "1px", margin: "0 8px", marginBottom: "20px", background: isDone ? colors.goldMuted : colors.border, transition: "background 300ms ease" }} />}
              </div>
            );
          })}
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "40px 36px" }}>
          {step === 0 && <Step1 form={form} set={set} />}
          {step === 1 && <Step2 form={form} set={set} setPatrimoine={setPatrimoine} />}
          {step === 2 && <Step3 form={form} set={set} />}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", paddingTop: "24px", borderTop: `1px solid ${colors.border}` }}>
            {step > 0 ? (
              <button type="button" onClick={() => { setStep(s => s - 1); window.scrollTo(0, 0); }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 20px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "2px", fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all 300ms ease" }}>
                <ChevronLeft size={14} strokeWidth={1.5} /> Precedent
              </button>
            ) : <div />}
            <button type="button" onClick={handleNext} disabled={submitMutation.isPending}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "14px 28px",
                background: submitMutation.isPending ? colors.goldMuted : colors.gold,
                border: "none", borderRadius: "2px",
                fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, color: colors.bg,
                textTransform: "uppercase", letterSpacing: "0.1em",
                cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                opacity: submitMutation.isPending ? 0.7 : 1, transition: "opacity 300ms ease",
              }}>
              {submitMutation.isPending ? (
                <><Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> Envoi...</>
              ) : step < 2 ? (
                <>Suivant <ChevronRight size={14} strokeWidth={1.5} /></>
              ) : (
                <>Envoyer mon tableau</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

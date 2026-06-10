import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, ChevronLeft, Loader2, Plus, Trash2, Users, Home, BarChart3 } from "lucide-react";

const LOGO_URL = "https://cdn-assets.manus.space/webdev/dS69FocN6akHjQivURfVvd/logo-sigma.png";

// ─── Types ────────────────────────────────────────────────────────────────────
type PatrimoineItem = {
  mensualite: string;
  typeGarantie: string;
  formatPropriete: string;
  dpe: string;
  loyersHC: string;
  capitalRestantDu: string;
  valeurActuelle: string;
};

type FormData = {
  // Emprunteur 1
  e1Nom: string;
  e1Prenom: string;
  e1DateNaissance: string;
  e1Nationalite: string;
  e1SituationMatrimoniale: string;
  e1NbEnfants: string;
  e1Proprietaire: boolean;
  e1Activite: string;
  e1Anciennete: string;
  e1StatutPro: string;
  e1SalaireAvis2024: string;
  e1SalaireAvis2025: string;
  e1SalaireCumul2025: string;
  e1SalaireNet2026: string;
  e1AutresRevenus: string;
  e1AutresCharges: string;
  e1EpargneLiquide: string;
  e1EpargneNonLiquide: string;
  e1Apport: string;
  // Emprunteur 2
  avecEmprunteur2: boolean;
  e2Nom: string;
  e2Prenom: string;
  e2DateNaissance: string;
  e2Nationalite: string;
  e2Activite: string;
  e2Anciennete: string;
  e2StatutPro: string;
  e2SalaireAvis2024: string;
  e2SalaireAvis2025: string;
  e2SalaireCumul2025: string;
  e2SalaireNet2026: string;
  e2EpargneLiquide: string;
  e2EpargneNonLiquide: string;
  e2Apport: string;
  // Patrimoine
  patrimoine: PatrimoineItem[];
  // Projet
  montantProjet: string;
  duree: string;
  regimeFiscal: string;
  objetFinancement: string;
  incidentsATD: boolean;
  personneGarante: boolean;
  commentaire: string;
};

const EMPTY_PATRIMOINE: PatrimoineItem = {
  mensualite: "", typeGarantie: "", formatPropriete: "", dpe: "",
  loyersHC: "", capitalRestantDu: "", valeurActuelle: "",
};

const STEPS = [
  { id: 1, label: "Emprunteur 1", icon: Users },
  { id: 2, label: "Emprunteur 2", icon: Users },
  { id: 3, label: "Projet", icon: BarChart3 },
];

// ─── Composants UI ────────────────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-zinc-300 mb-1">
      {children}{required && <span className="text-amber-400 ml-1">*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition disabled:opacity-50"
    />
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-amber-500" : "bg-zinc-700"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
      <span className="text-sm text-zinc-300">{label}</span>
    </label>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
      <Icon className="w-4 h-4 text-amber-400" />
      <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${done ? "bg-amber-500 text-black" : active ? "bg-amber-500/20 border-2 border-amber-500 text-amber-400" : "bg-zinc-800 border border-zinc-700 text-zinc-500"}`}>
                {done ? <CheckCircle className="w-5 h-5" /> : s.id}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? "text-amber-400" : done ? "text-amber-500/70" : "text-zinc-600"}`}>{s.label}</span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? "bg-amber-500" : "bg-zinc-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Étape 1 : Emprunteur 1 ───────────────────────────────────────────────────
function Step1({ form, set }: { form: FormData; set: (k: keyof FormData) => (v: any) => void }) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={Users} title="Identité" />
      <div className="grid grid-cols-2 gap-4">
        <div><Label required>Nom</Label><Input value={form.e1Nom} onChange={set("e1Nom")} placeholder="DUPONT" /></div>
        <div><Label required>Prénom</Label><Input value={form.e1Prenom} onChange={set("e1Prenom")} placeholder="Jean" /></div>
        <div><Label>Date de naissance</Label><Input value={form.e1DateNaissance} onChange={set("e1DateNaissance")} type="date" /></div>
        <div><Label>Nationalité</Label><Input value={form.e1Nationalite} onChange={set("e1Nationalite")} placeholder="Française" /></div>
        <div>
          <Label>Situation matrimoniale</Label>
          <Select value={form.e1SituationMatrimoniale} onChange={set("e1SituationMatrimoniale")}>
            <option value="">Sélectionner</option>
            <option value="celibataire">Célibataire</option>
            <option value="marie">Marié(e)</option>
            <option value="pacs">Pacsé(e)</option>
            <option value="divorce">Divorcé(e)</option>
            <option value="veuf">Veuf/Veuve</option>
          </Select>
        </div>
        <div><Label>Nb d'enfants à charge</Label><Input value={form.e1NbEnfants} onChange={set("e1NbEnfants")} type="number" placeholder="0" /></div>
      </div>
      <Toggle checked={form.e1Proprietaire} onChange={set("e1Proprietaire")} label="Déjà propriétaire" />

      <SectionTitle icon={BarChart3} title="Situation professionnelle" />
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Activité</Label><Input value={form.e1Activite} onChange={set("e1Activite")} placeholder="Ex. Salarié, Gérant..." /></div>
        <div><Label>Ancienneté</Label><Input value={form.e1Anciennete} onChange={set("e1Anciennete")} placeholder="Ex. 3 ans" /></div>
        <div className="col-span-2">
          <Label>Statut professionnel</Label>
          <Select value={form.e1StatutPro} onChange={set("e1StatutPro")}>
            <option value="">Sélectionner</option>
            <option value="cdi">CDI</option>
            <option value="cdd">CDD</option>
            <option value="independant">Indépendant / Auto-entrepreneur</option>
            <option value="gerant">Gérant de société</option>
            <option value="fonctionnaire">Fonctionnaire</option>
            <option value="retraite">Retraité</option>
            <option value="autre">Autre</option>
          </Select>
        </div>
      </div>

      <SectionTitle icon={BarChart3} title="Revenus (en €)" />
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Avis d'imposition 2024</Label><Input value={form.e1SalaireAvis2024} onChange={set("e1SalaireAvis2024")} type="number" placeholder="0" /></div>
        <div><Label>Avis d'imposition 2025</Label><Input value={form.e1SalaireAvis2025} onChange={set("e1SalaireAvis2025")} type="number" placeholder="0" /></div>
        <div><Label>Cumul salaire 2025</Label><Input value={form.e1SalaireCumul2025} onChange={set("e1SalaireCumul2025")} type="number" placeholder="0" /></div>
        <div><Label>Salaire net mensuel 2026</Label><Input value={form.e1SalaireNet2026} onChange={set("e1SalaireNet2026")} type="number" placeholder="0" /></div>
        <div><Label>Autres revenus mensuels</Label><Input value={form.e1AutresRevenus} onChange={set("e1AutresRevenus")} type="number" placeholder="0" /></div>
        <div><Label>Autres charges mensuelles</Label><Input value={form.e1AutresCharges} onChange={set("e1AutresCharges")} type="number" placeholder="0" /></div>
      </div>

      <SectionTitle icon={Home} title="Épargne & Apport (en €)" />
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Épargne liquide</Label><Input value={form.e1EpargneLiquide} onChange={set("e1EpargneLiquide")} type="number" placeholder="0" /></div>
        <div><Label>Épargne non liquide</Label><Input value={form.e1EpargneNonLiquide} onChange={set("e1EpargneNonLiquide")} type="number" placeholder="0" /></div>
        <div><Label>Apport personnel</Label><Input value={form.e1Apport} onChange={set("e1Apport")} type="number" placeholder="0" /></div>
      </div>
    </div>
  );
}

// ─── Étape 2 : Emprunteur 2 + Patrimoine ─────────────────────────────────────
function Step2({ form, set, setPatrimoine }: {
  form: FormData;
  set: (k: keyof FormData) => (v: any) => void;
  setPatrimoine: (fn: (p: PatrimoineItem[]) => PatrimoineItem[]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Co-emprunteur</h3>
        <Toggle checked={form.avecEmprunteur2} onChange={set("avecEmprunteur2")} label="Ajouter un co-emprunteur" />
      </div>

      {form.avecEmprunteur2 && (
        <div className="space-y-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <SectionTitle icon={Users} title="Identité co-emprunteur" />
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Nom</Label><Input value={form.e2Nom} onChange={set("e2Nom")} placeholder="MARTIN" /></div>
            <div><Label>Prénom</Label><Input value={form.e2Prenom} onChange={set("e2Prenom")} placeholder="Sophie" /></div>
            <div><Label>Date de naissance</Label><Input value={form.e2DateNaissance} onChange={set("e2DateNaissance")} type="date" /></div>
            <div><Label>Nationalité</Label><Input value={form.e2Nationalite} onChange={set("e2Nationalite")} placeholder="Française" /></div>
            <div><Label>Activité</Label><Input value={form.e2Activite} onChange={set("e2Activite")} placeholder="Ex. Salarié..." /></div>
            <div><Label>Ancienneté</Label><Input value={form.e2Anciennete} onChange={set("e2Anciennete")} placeholder="Ex. 2 ans" /></div>
            <div className="col-span-2">
              <Label>Statut professionnel</Label>
              <Select value={form.e2StatutPro} onChange={set("e2StatutPro")}>
                <option value="">Sélectionner</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="independant">Indépendant / Auto-entrepreneur</option>
                <option value="gerant">Gérant de société</option>
                <option value="fonctionnaire">Fonctionnaire</option>
                <option value="retraite">Retraité</option>
                <option value="autre">Autre</option>
              </Select>
            </div>
          </div>
          <SectionTitle icon={BarChart3} title="Revenus co-emprunteur (en €)" />
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Avis d'imposition 2024</Label><Input value={form.e2SalaireAvis2024} onChange={set("e2SalaireAvis2024")} type="number" placeholder="0" /></div>
            <div><Label>Avis d'imposition 2025</Label><Input value={form.e2SalaireAvis2025} onChange={set("e2SalaireAvis2025")} type="number" placeholder="0" /></div>
            <div><Label>Cumul salaire 2025</Label><Input value={form.e2SalaireCumul2025} onChange={set("e2SalaireCumul2025")} type="number" placeholder="0" /></div>
            <div><Label>Salaire net mensuel 2026</Label><Input value={form.e2SalaireNet2026} onChange={set("e2SalaireNet2026")} type="number" placeholder="0" /></div>
            <div><Label>Épargne liquide</Label><Input value={form.e2EpargneLiquide} onChange={set("e2EpargneLiquide")} type="number" placeholder="0" /></div>
            <div><Label>Épargne non liquide</Label><Input value={form.e2EpargneNonLiquide} onChange={set("e2EpargneNonLiquide")} type="number" placeholder="0" /></div>
            <div><Label>Apport personnel</Label><Input value={form.e2Apport} onChange={set("e2Apport")} type="number" placeholder="0" /></div>
          </div>
        </div>
      )}

      {/* Patrimoine immobilier */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Home} title="Patrimoine immobilier existant" />
          <button
            type="button"
            onClick={() => setPatrimoine(p => [...p, { ...EMPTY_PATRIMOINE }])}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter un bien
          </button>
        </div>
        {form.patrimoine.length === 0 && (
          <p className="text-sm text-zinc-500 italic">Aucun bien immobilier existant — cliquez sur "Ajouter un bien" si applicable.</p>
        )}
        {form.patrimoine.map((item, idx) => (
          <div key={idx} className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-amber-400">Bien #{idx + 1}</span>
              <button type="button" onClick={() => setPatrimoine(p => p.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Format de propriété</Label>
                <Select value={item.formatPropriete} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, formatPropriete: v } : x))}>
                  <option value="">Sélectionner</option>
                  <option value="pleine_propriete">Pleine propriété</option>
                  <option value="sci">SCI</option>
                  <option value="usufruit">Usufruit</option>
                  <option value="nue_propriete">Nue-propriété</option>
                </Select>
              </div>
              <div>
                <Label>Type de garantie</Label>
                <Select value={item.typeGarantie} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, typeGarantie: v } : x))}>
                  <option value="">Sélectionner</option>
                  <option value="hypotheque">Hypothèque</option>
                  <option value="ppd">PPD</option>
                  <option value="caution">Caution</option>
                  <option value="aucune">Aucune</option>
                </Select>
              </div>
              <div>
                <Label>DPE</Label>
                <Select value={item.dpe} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, dpe: v } : x))}>
                  <option value="">Sélectionner</option>
                  {["A", "B", "C", "D", "E", "F", "G"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </div>
              <div><Label>Mensualité (€)</Label><Input value={item.mensualite} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, mensualite: v } : x))} type="number" placeholder="0" /></div>
              <div><Label>Loyers HC (€/mois)</Label><Input value={item.loyersHC} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, loyersHC: v } : x))} type="number" placeholder="0" /></div>
              <div><Label>Capital restant dû (€)</Label><Input value={item.capitalRestantDu} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, capitalRestantDu: v } : x))} type="number" placeholder="0" /></div>
              <div className="col-span-2"><Label>Valeur actuelle estimée (€)</Label><Input value={item.valeurActuelle} onChange={v => setPatrimoine(p => p.map((x, i) => i === idx ? { ...x, valeurActuelle: v } : x))} type="number" placeholder="0" /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Étape 3 : Projet ─────────────────────────────────────────────────────────
function Step3({ form, set }: { form: FormData; set: (k: keyof FormData) => (v: any) => void }) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={Home} title="Projet d'acquisition" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Montant du projet (€)</Label>
          <Input value={form.montantProjet} onChange={set("montantProjet")} type="number" placeholder="Ex. 300 000" />
        </div>
        <div>
          <Label required>Durée souhaitée (mois)</Label>
          <Select value={form.duree} onChange={set("duree")}>
            <option value="">Sélectionner</option>
            {[120, 144, 180, 200, 240, 270, 300].map(d => <option key={d} value={String(d)}>{d} mois ({Math.round(d / 12)} ans)</option>)}
          </Select>
        </div>
        <div>
          <Label>Objet du financement</Label>
          <Select value={form.objetFinancement} onChange={set("objetFinancement")}>
            <option value="">Sélectionner</option>
            <option value="residence_principale">Résidence principale</option>
            <option value="investissement_locatif">Investissement locatif</option>
            <option value="residence_secondaire">Résidence secondaire</option>
            <option value="terrain">Terrain</option>
            <option value="autre">Autre</option>
          </Select>
        </div>
        <div>
          <Label>Régime fiscal envisagé</Label>
          <Select value={form.regimeFiscal} onChange={set("regimeFiscal")}>
            <option value="">Sélectionner</option>
            <option value="nu">Location nue</option>
            <option value="meuble">Location meublée (LMNP/LMP)</option>
            <option value="sci_ir">SCI à l'IR</option>
            <option value="sci_is">SCI à l'IS</option>
            <option value="pinel">Pinel</option>
            <option value="denormandie">Denormandie</option>
            <option value="autre">Autre</option>
          </Select>
        </div>
      </div>

      <SectionTitle icon={BarChart3} title="Informations complémentaires" />
      <div className="space-y-4">
        <Toggle checked={form.incidentsATD} onChange={set("incidentsATD")} label="Incidents de paiement ou ATD dans les 5 dernières années" />
        <Toggle checked={form.personneGarante} onChange={set("personneGarante")} label="Une personne se porte garante" />
        <div>
          <Label>Commentaire libre</Label>
          <textarea
            value={form.commentaire}
            onChange={e => set("commentaire")(e.target.value)}
            placeholder="Informations complémentaires, contexte du projet..."
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition resize-none"
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

  // Pré-remplissage depuis les query params (état civil → mandat → tableau courtage)
  useEffect(() => {
    const nom = params.get("nom");
    const prenom = params.get("prenom") || params.get("prenoms");
    const dateNaissance = params.get("dateNaissance");
    const situationMatrimoniale = params.get("situationFamiliale");
    const nationalite = params.get("nationalite");

    setForm(f => ({
      ...f,
      e1Nom: nom || f.e1Nom,
      e1Prenom: prenom || f.e1Prenom,
      e1DateNaissance: dateNaissance || f.e1DateNaissance,
      e1SituationMatrimoniale: situationMatrimoniale || f.e1SituationMatrimoniale,
      e1Nationalite: nationalite === "francais" ? "Française" : nationalite === "etranger" ? "Étrangère" : f.e1Nationalite,
    }));
  }, []);

  const set = (k: keyof FormData) => (v: any) => setForm(f => ({ ...f, [k]: v }));
  const setPatrimoine = (fn: (p: PatrimoineItem[]) => PatrimoineItem[]) =>
    setForm(f => ({ ...f, patrimoine: fn(f.patrimoine) }));

  const submitMutation = trpc.financement.soumettre.useMutation({
    onSuccess: (data) => {
      setDossierIdResult(data.id);
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de l'envoi");
    },
  });

  const validate = () => {
    if (step === 0) {
      if (!form.e1Nom.trim()) { toast.error("Le nom est requis"); return false; }
      if (!form.e1Prenom.trim()) { toast.error("Le prénom est requis"); return false; }
    }
    if (step === 2) {
      if (!form.montantProjet) { toast.error("Le montant du projet est requis"); return false; }
      if (!form.duree) { toast.error("La durée est requise"); return false; }
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
      emprunteur1Nom: form.e1Nom,
      emprunteur1Prenom: form.e1Prenom,
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
        emprunteur2Nom: form.e2Nom,
        emprunteur2Prenom: form.e2Prenom,
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
        mensualite: toNum(p.mensualite),
        typeGarantie: p.typeGarantie || undefined,
        formatPropriete: p.formatPropriete || undefined,
        dpe: p.dpe || undefined,
        loyersHC: toNum(p.loyersHC),
        capitalRestantDu: toNum(p.capitalRestantDu),
        valeurActuelle: toNum(p.valeurActuelle),
      })),
      montantProjet: Number(form.montantProjet),
      duree: Number(form.duree),
      regimeFiscal: form.regimeFiscal || undefined,
      objetFinancement: form.objetFinancement || undefined,
      incidentsATD: form.incidentsATD,
      personneGarante: form.personneGarante,
      commentaire: form.commentaire || undefined,
    });
  };

  // ── Page de succès ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-amber-500" />
          </div>
          <img src={LOGO_URL} alt="Sigma Factory" className="h-10 mx-auto mb-6 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          <h1 className="text-2xl font-bold text-white mb-3">Tableau de Courtage envoyé !</h1>
          <p className="text-zinc-400 mb-2">
            Votre tableau de courtage <span className="text-amber-400 font-semibold">#{dossierIdResult}</span> a bien été transmis à l'équipe Sigma Factory.
          </p>
          <p className="text-zinc-500 text-sm mb-8">
            Notre équipe courtage va analyser votre dossier et vous contacter pour définir votre enveloppe de financement.
          </p>
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-left">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Récapitulatif</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Emprunteur :</span><span className="text-white">{form.e1Prenom} {form.e1Nom}</span></div>
              {form.avecEmprunteur2 && form.e2Nom && <div className="flex justify-between"><span className="text-zinc-400">Co-emprunteur :</span><span className="text-white">{form.e2Prenom} {form.e2Nom}</span></div>}
              <div className="flex justify-between"><span className="text-zinc-400">Montant :</span><span className="text-amber-400 font-bold">{Number(form.montantProjet).toLocaleString("fr-FR")} €</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Durée :</span><span className="text-white">{form.duree} mois</span></div>
              {form.objetFinancement && <div className="flex justify-between"><span className="text-zinc-400">Objet :</span><span className="text-white capitalize">{form.objetFinancement.replace(/_/g, " ")}</span></div>}
            </div>
          </div>

          {/* Barre de progression globale */}
          <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Votre dossier Sigma Factory</p>
            <div className="space-y-2">
              {[
                { label: "État Civil", done: true },
                { label: "Mandat de Recherche", done: !!params.get("mandatId") },
                { label: "Tableau de Courtage", done: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? "bg-amber-500" : "bg-zinc-700"}`}>
                    {item.done ? <CheckCircle className="w-3 h-3 text-black" /> : <span className="text-xs text-zinc-400">{i + 1}</span>}
                  </div>
                  <span className={`text-sm ${item.done ? "text-white" : "text-zinc-500"}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Sigma Factory" className="h-12 mx-auto mb-4 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          <h1 className="text-2xl font-bold text-white tracking-wide">Tableau de Courtage</h1>
          <p className="text-zinc-400 text-sm mt-1">Sigma Factory — Courtage & Financement</p>
        </div>

        {/* Progression globale dossier */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["État Civil", "Mandat", "Tableau de Courtage"].map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${i === 2 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 text-zinc-400"}`}>
                <CheckCircle className={`w-3 h-3 ${i < 2 ? "text-amber-500" : "text-amber-400"}`} />
                {label}
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 sm:p-8">
          <StepIndicator current={step} total={3} />

          {step === 0 && <Step1 form={form} set={set} />}
          {step === 1 && <Step2 form={form} set={set} setPatrimoine={setPatrimoine} />}
          {step === 2 && <Step3 form={form} set={set} />}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => { setStep(s => s - 1); window.scrollTo(0, 0); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={handleNext}
              disabled={submitMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #C9A84C, #F0D080, #C9A84C)", color: "#0f0f0f" }}
            >
              {submitMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
              ) : step < 2 ? (
                <>Suivant <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Envoyer mon tableau <CheckCircle className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

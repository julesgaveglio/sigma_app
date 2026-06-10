import { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/logo-sigma.png";
const LOGO_SNPI_URL = "https://upload.wikimedia.org/wikipedia/fr/thumb/8/8e/Logo_SNPI.svg/200px-Logo_SNPI.svg.png";

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

// ─── Types ────────────────────────────────────────────────────────────────────
type FormData = {
  leadId?: number;
  // Identité mandant 1
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  adresse: string;
  // Identité mandant 2 (optionnel — co-acquéreur)
  nom2: string;
  prenoms2: string;
  email2: string;
  telephone2: string;
  // Bien recherché
  descriptionBien: string;   // Champ libre : nb pièces, surface, localisation, etc.
  budgetMax: string;         // Prix maximum souhaité
  // Options honoraires
  honorairesOption: "charge_vendeur" | "partages" | "";
  // RGPD
  accepteProspection: boolean;
  // Date de signature
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

// ─── Composants utilitaires ───────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
      {children}{required && <span className="text-amber-400 ml-1">*</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition text-sm disabled:opacity-50"
    />
  );
}

function FrozenField({ label, value }: { label?: string; value: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-500 text-sm select-none">
      {label && <span className="text-zinc-600 text-xs mr-2">{label}</span>}
      <span className="italic">{value}</span>
    </div>
  );
}

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {labels.map((label, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className="flex items-center w-full">
            {i > 0 && <div className={`flex-1 h-0.5 ${i <= current ? "bg-amber-500" : "bg-zinc-700"}`} />}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition ${
              i < current ? "bg-amber-500 border-amber-500 text-black" :
              i === current ? "border-amber-500 text-amber-500 bg-transparent" :
              "border-zinc-600 text-zinc-500 bg-transparent"
            }`}>
              {i < current ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            {i < total - 1 && <div className={`flex-1 h-0.5 ${i < current ? "bg-amber-500" : "bg-zinc-700"}`} />}
          </div>
          <span className={`text-xs mt-1 text-center hidden sm:block ${i === current ? "text-amber-400 font-semibold" : "text-zinc-500"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Étape 1 : Identité ───────────────────────────────────────────────────────
function Step1Identity({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const set = (k: keyof FormData) => (v: string) => setForm({ ...form, [k]: v });
  const [showSecond, setShowSecond] = useState(!!(form.nom2 || form.prenoms2));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Identité du / des mandant(s)</h2>
        <p className="text-zinc-400 text-sm">Indiquez vos informations personnelles telles qu'elles apparaîtront sur le mandat.</p>
      </div>

      {/* Mandant 1 */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Mandant principal</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Nom de famille</FieldLabel>
            <TextInput value={form.nom} onChange={set("nom")} placeholder="DUPONT" />
          </div>
          <div>
            <FieldLabel required>Prénom(s)</FieldLabel>
            <TextInput value={form.prenoms} onChange={set("prenoms")} placeholder="Jean-Pierre" />
          </div>
          <div>
            <FieldLabel required>Email</FieldLabel>
            <TextInput value={form.email} onChange={set("email")} placeholder="jean@exemple.fr" type="email" />
          </div>
          <div>
            <FieldLabel required>Téléphone</FieldLabel>
            <TextInput value={form.telephone} onChange={set("telephone")} placeholder="06 12 34 56 78" />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required>Adresse de résidence</FieldLabel>
            <TextInput value={form.adresse} onChange={set("adresse")} placeholder="12 rue de la Paix, 75001 Paris" />
          </div>
        </div>
      </div>

      {/* Mandant 2 (co-acquéreur) */}
      {!showSecond ? (
        <button
          type="button"
          onClick={() => setShowSecond(true)}
          className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2 transition"
        >
          + Ajouter un co-acquéreur (conjoint, partenaire...)
        </button>
      ) : (
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Co-acquéreur (optionnel)</p>
            <button
              type="button"
              onClick={() => { setShowSecond(false); setForm({ ...form, nom2: "", prenoms2: "", email2: "", telephone2: "" }); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              Supprimer
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Nom de famille</FieldLabel>
              <TextInput value={form.nom2} onChange={set("nom2")} placeholder="MARTIN" />
            </div>
            <div>
              <FieldLabel>Prénom(s)</FieldLabel>
              <TextInput value={form.prenoms2} onChange={set("prenoms2")} placeholder="Marie" />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput value={form.email2} onChange={set("email2")} placeholder="marie@exemple.fr" type="email" />
            </div>
            <div>
              <FieldLabel>Téléphone</FieldLabel>
              <TextInput value={form.telephone2} onChange={set("telephone2")} placeholder="06 98 76 54 32" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Étape 2 : Bien recherché + Budget ───────────────────────────────────────
function Step2Bien({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const set = (k: keyof FormData) => (v: string) => setForm({ ...form, [k]: v });
  const budgetNum = parseInt(form.budgetMax.replace(/\s/g, ""), 10);
  const budgetLettres = !isNaN(budgetNum) && budgetNum > 0 ? nombreEnLettres(budgetNum) : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">I — Caractéristiques du bien recherché</h2>
        <p className="text-zinc-400 text-sm">Décrivez précisément votre projet d'acquisition.</p>
      </div>

      {/* Type de bien — figé */}
      <div>
        <FieldLabel>Type de bien</FieldLabel>
        <FrozenField value="Maison individuelle / Immeuble Neuf / Ancien / A rénover" />
        <p className="text-xs text-zinc-600 mt-1">Défini contractuellement — non modifiable</p>
      </div>

      {/* Description libre */}
      <div>
        <FieldLabel required>Description de votre recherche</FieldLabel>
        <textarea
          value={form.descriptionBien}
          onChange={e => set("descriptionBien")(e.target.value)}
          placeholder="Ex : Appartement T3 minimum, 60 m², Paris 15e ou 16e, étage élevé, proche métro, avec parking..."
          rows={5}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition text-sm resize-none"
        />
        <p className="text-xs text-zinc-500 mt-1">Indiquez : type de bien, surface, nombre de pièces, localisation, étage, critères importants...</p>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <FieldLabel required>Prix maximum souhaité (€)</FieldLabel>
        <div className="relative">
          <TextInput
            value={form.budgetMax}
            onChange={set("budgetMax")}
            placeholder="Ex : 350000"
            type="number"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">€</span>
        </div>
        {budgetLettres && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">En lettres :</p>
            <p className="text-sm text-amber-300 font-medium">{budgetLettres}</p>
          </div>
        )}
        <p className="text-xs text-zinc-500">Ce montant correspond à votre enveloppe d'acquisition validée avec notre équipe courtage.</p>
      </div>

      {/* Honoraires — figés */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Honoraires de l'agence</p>
        <FrozenField value="En cas d'achat d'un bien présenté par l'agence, vos honoraires seront de : 5% H.T." />
        <p className="text-xs text-zinc-600">Ils ne deviendront exigibles qu'après achat effectivement conclu, levée étant obligatoirement faite de toutes conditions suspensives, et seront à notre charge.</p>
      </div>

      {/* II & III — figés */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">II — Affaires présentées ce jour ou visitées</p>
          <FrozenField value="CF ANNEXES DE VISITE" />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">III — Moyens de diffusion des annonces commerciales</p>
          <FrozenField value="INTERNET" />
        </div>
      </div>
    </div>
  );
}

// ─── Étape 3 : Confirmation & Signature ──────────────────────────────────────
function Step3Confirmation({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const set = (k: keyof FormData) => (v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Confirmation & Signature</h2>
        <p className="text-zinc-400 text-sm">Vérifiez les informations et confirmez votre accord.</p>
      </div>

      {/* Récapitulatif */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Récapitulatif du mandat</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-zinc-400">Mandant(s) :</span>
          <span className="text-white font-medium">
            {form.nom} {form.prenoms}
            {form.nom2 && ` & ${form.nom2} ${form.prenoms2}`}
          </span>
          <span className="text-zinc-400">Adresse :</span>
          <span className="text-white">{form.adresse || "—"}</span>
          <span className="text-zinc-400">Email :</span>
          <span className="text-white">{form.email}{form.email2 && ` / ${form.email2}`}</span>
          <span className="text-zinc-400">Budget max :</span>
          <span className="text-amber-400 font-bold">
            {form.budgetMax ? `${parseInt(form.budgetMax).toLocaleString("fr-FR")} €` : "—"}
          </span>
          <span className="text-zinc-400">Honoraires :</span>
          <span className="text-white">5% HT</span>
          <span className="text-zinc-400">Durée :</span>
          <span className="text-white">12 mois</span>
        </div>
      </div>

      {/* Options honoraires */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Option honoraires</p>
        <p className="text-xs text-zinc-500">Sauf choix de l'option "honoraires charge vendeur" ou choix de l'option "honoraires partagés" :</p>
        <div className="space-y-2">
          {[
            { value: "charge_vendeur", label: 'Option "honoraires charge vendeur"' },
            { value: "partages", label: 'Option "honoraires partagés"' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setForm({ ...form, honorairesOption: opt.value as "charge_vendeur" | "partages" })}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                  form.honorairesOption === opt.value
                    ? "bg-amber-500 border-amber-500"
                    : "border-zinc-600 group-hover:border-amber-400"
                }`}
              >
                {form.honorairesOption === opt.value && (
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-300">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date de signature */}
      <div>
        <FieldLabel required>Date de signature</FieldLabel>
        <TextInput value={form.dateSignature} onChange={set("dateSignature")} type="date" />
      </div>

      {/* RGPD */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">VIII — Informatique, Liberté, RGPD</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Le mandataire informe le mandant qu'il collecte et traite des données personnelles nécessaires pour l'accomplissement de sa mission. Pour toutes demandes sur le traitement de vos données : <span className="text-amber-400">contact@sigmafactory.fr</span>
        </p>
        <p className="text-xs text-zinc-500">
          Pour plus d'informations, la politique de protection des données est accessible à :{" "}
          <a href="https://www.sigmafactory.fr/politique-de-confidentialite-sigma-factory/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
            www.sigmafactory.fr/politique-de-confidentialite-sigma-factory/
          </a>
        </p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div
            onClick={() => setForm({ ...form, accepteProspection: !form.accepteProspection })}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
              form.accepteProspection ? "bg-amber-500 border-amber-500" : "border-zinc-600 group-hover:border-amber-400"
            }`}
          >
            {form.accepteProspection && (
              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-xs text-zinc-400 leading-relaxed">
            En cochant cette case, j'accepte de recevoir de la prospection commerciale sur mon adresse mail.
          </span>
        </label>
      </div>

      {/* Engagement légal */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <p className="text-xs text-zinc-500 leading-relaxed">
          Le mandant déclare et reconnaît que préalablement à la signature des présentes, il a reçu les informations prévues aux articles L111-1, L111-2 et L121-17 du Code de la consommation, qu'il a eu le temps nécessaire et suffisant pour en prendre connaissance, se renseigner et les comprendre, ainsi que du traitement des données personnelles (RGPD) par le mandataire.
        </p>
        <p className="text-xs text-zinc-400 font-semibold mt-2">
          Il reconnaît avoir pris connaissance des conditions générales de l'intégralité des présentes pages 1 à 2.
        </p>
      </div>

      {/* Bon pour mandat */}
      <div className="p-5 border-2 border-amber-500/40 rounded-xl bg-amber-500/5">
        <p className="text-sm font-bold text-amber-400 mb-1 text-center">Étape 1/2 — Pré-remplissage du mandat</p>
        <p className="text-xs text-zinc-400 text-center">En soumettant ce formulaire, vous transmettez vos informations à Sigma Factory. Vous recevrez ensuite le mandat officiel à signer électroniquement via notre plateforme partenaire, conformément à la loi Hoguet n°70-9 du 2 janvier 1970.</p>
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

  // Pré-remplissage depuis les paramètres URL
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

  const STEPS = ["Identité", "Bien & Budget", "Confirmation"];

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.nom.trim()) return "Le nom est requis";
      if (!form.prenoms.trim()) return "Le prénom est requis";
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Un email valide est requis";
      if (!form.telephone.trim()) return "Le téléphone est requis";
      if (!form.adresse.trim()) return "L'adresse est requise";
    }
    if (step === 1) {
      if (!form.descriptionBien.trim()) return "La description du bien recherché est requise";
      if (!form.budgetMax || parseInt(form.budgetMax) <= 0) return "Le prix maximum souhaité est requis";
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

    // On passe les données au format attendu par la procédure mandats.submit
    // Les champs non présents dans le nouveau formulaire sont omis ou mis à des valeurs par défaut
    submitMutation.mutate({
      nom: form.nom,
      prenoms: form.prenoms,
      email: form.email,
      telephone: form.telephone,
      adresse: form.adresse,
      leadId: form.leadId,
      // Bien recherché — on utilise descriptionBien comme localisation + autresCriteres
      typeBien: "maison" as const,
      usage: "residence_principale" as const,
      localisation: form.descriptionBien,
      budgetMax: parseInt(form.budgetMax),
      // Champs figés
      typeMandat: "simple" as const,
      dureeMandat: 12,
      // Métadonnées supplémentaires stockées dans autresCriteres
      autresCriteres: [
        form.nom2 ? `Co-acquéreur : ${form.nom2} ${form.prenoms2} — ${form.email2} — ${form.telephone2}` : "",
        form.honorairesOption ? `Honoraires : ${form.honorairesOption === "charge_vendeur" ? "Charge vendeur" : "Partagés"}` : "",
        form.accepteProspection ? "RGPD : Accepte la prospection commerciale par email" : "",
        `Date de signature : ${form.dateSignature}`,
      ].filter(Boolean).join(" | "),
    } as any);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <img src={LOGO_URL} alt="Sigma Factory" className="h-10 mx-auto mb-6 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          <h1 className="text-2xl font-bold text-white mb-3">Informations transmises !</h1>
          <p className="text-zinc-400 mb-2">
            Vos informations pour le mandat <span className="text-amber-400 font-semibold">#{mandatId}</span> ont bien été transmises à l'équipe Sigma Factory.
          </p>
          <p className="text-zinc-500 text-sm mb-8">
            Élodie vous enverra le mandat officiel à signer électroniquement, puis vous contactera pour démarrer votre recherche de bien.
          </p>
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-left">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Récapitulatif</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Mandant :</span><span className="text-white">{form.nom} {form.prenoms}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Budget max :</span><span className="text-amber-400 font-bold">{parseInt(form.budgetMax).toLocaleString("fr-FR")} €</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Durée :</span><span className="text-white">12 mois</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Honoraires :</span><span className="text-white">5% HT</span></div>
            </div>
          </div>
          {/* Pied de page légal */}
          <p className="text-xs text-zinc-600 mt-6">
            L'agence est adhérente au SNPI, Syndicat National des Professionnels Immobiliers, 26 avenue Victor Hugo - 75116 PARIS.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src={LOGO_SNPI_URL} alt="SNPI" className="h-10 object-contain opacity-70" onError={e => (e.currentTarget.style.display = "none")} />
            <div>
              <h1 className="text-xl font-bold text-white">Mandat de Recherche</h1>
              <p className="text-zinc-500 text-xs">et de négociation</p>
            </div>
          </div>
          <div className="text-right">
            <img src={LOGO_URL} alt="Sigma Factory" className="h-10 object-contain ml-auto" onError={e => (e.currentTarget.style.display = "none")} />
            <p className="text-zinc-600 text-xs mt-1">CPI69012026000000022</p>
          </div>
        </div>

        {/* Représentant — figé */}
        <div className="mb-6 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs text-zinc-500">
          Représentée par : <span className="text-zinc-300">Madame Hanna-Hayat BENTAHER</span> — Qualité : Assistante de Direction — Tél. 03.92.20.01.42
        </div>

        {/* Card formulaire */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 sm:p-8">
          <StepIndicator current={step} total={3} labels={STEPS} />

          {step === 0 && <Step1Identity form={form} setForm={setForm} />}
          {step === 1 && <Step2Bien form={form} setForm={setForm} />}
          {step === 2 && <Step3Confirmation form={form} setForm={setForm} />}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            {step < 2 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition"
              >
                Suivant →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitMutation.isPending ? "Envoi en cours..." : "✓ Valider mes informations"}
              </button>
            )}
          </div>
        </div>

        {/* Pied de page légal */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-zinc-600 text-xs">
            L'agence est adhérente au SNPI, Syndicat National des Professionnels Immobiliers, 26 avenue Victor Hugo - 75116 PARIS.
          </p>
          <p className="text-zinc-600 text-xs">
            Elle est soumise au code de déontologie consultable sur{" "}
            <a href="https://www.snpi.fr/espace-adherent/files/divers/code_deontologie.pdf" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-400">
              www.snpi.fr
            </a>
          </p>
          <p className="text-zinc-700 text-xs">Réf. SN242A - 04/2024</p>
        </div>
      </div>
    </div>
  );
}

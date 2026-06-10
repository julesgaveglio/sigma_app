import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-amber-400 font-bold tracking-widest text-sm uppercase">Sigma Factory</div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Bienvenue chez Sigma Factory !</h1>
          <div className="text-zinc-300 text-sm leading-relaxed mb-8 space-y-3 text-left bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p>Votre demande a bien été transmise à notre équipe.</p>
            <p>Vous allez recevoir sous peu un <span className="text-amber-400 font-semibold">lien de paiement unique</span> émanant de <span className="text-white font-medium">Hexa Coop</span>, notre partenaire, pour bénéficier de notre programme crédit d’impôt.</p>
            <p>Le paiement doit être initié par <span className="text-white font-medium">carte ou virement dans les 24h</span> suivant l’envoi du lien.</p>
            <p>Vous recevrez dès réception du paiement une <span className="text-white font-medium">attestation</span> — le reste est automatique et ne nécessite aucune action de votre part.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-3 mb-8">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Récapitulatif</p>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Nom</span>
              <span className="text-white font-medium">{form.civilite ? `${form.civilite} ` : ""}{form.prenom} {form.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Email</span>
              <span className="text-white">{form.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Montant</span>
              <span className="text-amber-400 font-bold">{parseFloat(form.montantNegocie).toLocaleString("fr-FR")} €</span>
            </div>
          </div>
          <p className="text-zinc-600 text-xs">
            Sigma Factory — Toutes vos informations sont traitées de manière strictement confidentielle.
          </p>
        </div>
      </div>
    );
  }

  const inputClass = (field: keyof FormData) =>
    `w-full bg-zinc-900 border rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 transition ${errors[field] ? "border-red-500" : "border-zinc-700"}`;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-amber-400 font-bold tracking-widest text-sm uppercase">Sigma Factory</div>
            <div className="text-zinc-500 text-xs mt-0.5">Crédit d'impôt — Confidentiel</div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  step === s ? "bg-amber-500 border-amber-500 text-black"
                  : step > s ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500"
                }`}>
                  {step > s ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                {s < 3 && <div className={`w-8 h-px ${step > s ? "bg-amber-500/40" : "bg-zinc-700"}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-lg">

          {/* Bandeau confidentialité */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-8 flex gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-amber-300 text-sm font-semibold">Vos données sont protégées</p>
              <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">Ce formulaire est strictement confidentiel. Vos informations sont utilisées uniquement par l'équipe Sigma Factory.</p>
            </div>
          </div>

          {/* ── Étape 1 : Montant négocié ── */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Montant de votre accompagnement</h1>
              <p className="text-zinc-500 text-sm mb-6">Renseignez le montant de votre accompagnement.</p>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                  Montant (€) <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={form.montantNegocie}
                    onChange={e => set("montantNegocie", e.target.value)}
                    placeholder="Ex : 5000"
                    className={`${inputClass("montantNegocie")} pr-10`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">€</span>
                </div>
                {errors.montantNegocie && <p className="text-red-400 text-xs mt-1">{errors.montantNegocie}</p>}

              </div>
              <button
                onClick={() => { if (validateStep1()) setStep(2); }}
                className="w-full mt-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                Continuer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Étape 2 : Identité ── */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Vos informations personnelles</h1>
              <p className="text-zinc-500 text-sm mb-6">Ces informations permettent de constituer votre dossier.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Civilité</label>
                  <div className="flex gap-2 flex-wrap">
                    {["M.", "Mme", "Mme M.", "M. Mme"].map(c => (
                      <button key={c} type="button" onClick={() => set("civilite", form.civilite === c ? "" : c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          form.civilite === c ? "bg-amber-500 border-amber-500 text-black" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Nom <span className="text-amber-500">*</span></label>
                    <input value={form.nom} onChange={e => set("nom", e.target.value)} placeholder="Dupont" className={inputClass("nom")} />
                    {errors.nom && <p className="text-red-400 text-xs mt-1">{errors.nom}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Prénom <span className="text-amber-500">*</span></label>
                    <input value={form.prenom} onChange={e => set("prenom", e.target.value)} placeholder="Jean" className={inputClass("prenom")} />
                    {errors.prenom && <p className="text-red-400 text-xs mt-1">{errors.prenom}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Email <span className="text-amber-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jean.dupont@email.com" className={inputClass("email")} />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                {/* Date de naissance */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Date de naissance <span className="text-amber-500">*</span></label>
                  <input type="date" value={form.dateNaissance} onChange={e => set("dateNaissance", e.target.value)}
                    className={`${inputClass("dateNaissance")} [color-scheme:dark]`} />
                  {errors.dateNaissance && <p className="text-red-400 text-xs mt-1">{errors.dateNaissance}</p>}
                </div>
                {/* Situation familiale */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Situation familiale</label>
                  <div className="flex gap-2 flex-wrap">
                    {SITUATIONS.map(s => (
                      <button key={s.value} type="button" onClick={() => set("situationFamiliale", form.situationFamiliale === s.value ? "" : s.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          form.situationFamiliale === s.value ? "bg-amber-500 border-amber-500 text-black" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        }`}>{s.label}</button>
                    ))}
                  </div>
                </div>
                {/* Profession */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Profession</label>
                  <input value={form.profession} onChange={e => set("profession", e.target.value)} placeholder="Ex : Salarié, Indépendant, Retraité…" className={inputClass("profession")} />
                </div>
                {/* Téléphones */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Mobile</label>
                    <input type="tel" value={form.mobile} onChange={e => set("mobile", e.target.value)} placeholder="06 00 00 00 00" className={inputClass("mobile")} />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Fixe</label>
                    <input type="tel" value={form.fixe} onChange={e => set("fixe", e.target.value)} placeholder="01 00 00 00 00" className={inputClass("fixe")} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-medium rounded-xl text-sm transition">Retour</button>
                <button onClick={() => { if (validateStep2()) setStep(3); }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition flex items-center justify-center gap-2">
                  Continuer
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 3 : Coordonnées & naissance ── */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Adresse & lieu de naissance</h1>
              <p className="text-zinc-500 text-sm mb-6">Informations nécessaires pour votre dossier fiscal.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Adresse <span className="text-amber-500">*</span></label>
                  <input value={form.adresse} onChange={e => set("adresse", e.target.value)} placeholder="12 rue de la Paix" className={inputClass("adresse")} />
                  {errors.adresse && <p className="text-red-400 text-xs mt-1">{errors.adresse}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Code postal <span className="text-amber-500">*</span></label>
                    <input value={form.codePostal} onChange={e => set("codePostal", e.target.value)} placeholder="75001" className={inputClass("codePostal")} />
                    {errors.codePostal && <p className="text-red-400 text-xs mt-1">{errors.codePostal}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Ville <span className="text-amber-500">*</span></label>
                    <input value={form.ville} onChange={e => set("ville", e.target.value)} placeholder="Paris" className={inputClass("ville")} />
                    {errors.ville && <p className="text-red-400 text-xs mt-1">{errors.ville}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Pays de naissance <span className="text-amber-500">*</span></label>
                    <input value={form.paysNaissance} onChange={e => set("paysNaissance", e.target.value)} placeholder="France" className={inputClass("paysNaissance")} />
                    {errors.paysNaissance && <p className="text-red-400 text-xs mt-1">{errors.paysNaissance}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Ville de naissance <span className="text-amber-500">*</span></label>
                    <input value={form.villeNaissance} onChange={e => set("villeNaissance", e.target.value)} placeholder="Lyon" className={inputClass("villeNaissance")} />
                    {errors.villeNaissance && <p className="text-red-400 text-xs mt-1">{errors.villeNaissance}</p>}
                  </div>
                </div>
              </div>
              {form.montantNegocie && (
                <div className="mt-6 bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Récapitulatif</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">{form.prenom} {form.nom}</span>
                    <span className="text-amber-400 font-bold">{parseFloat(form.montantNegocie).toLocaleString("fr-FR")} €</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-medium rounded-xl text-sm transition">Retour</button>
                <button onClick={handleSubmit} disabled={submitMutation.isPending}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition flex items-center justify-center gap-2">
                  {submitMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>Soumettre ma demande
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-600 text-center mt-4">En soumettant ce formulaire, vous acceptez que vos données soient traitées par Sigma Factory.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

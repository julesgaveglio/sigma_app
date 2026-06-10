import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle, FileText, Users, TrendingUp, UserCheck, AlertCircle, Loader2, Copy, ExternalLink, ChevronRight, ChevronLeft, Shield, CreditCard } from "lucide-react";

const SPECIALITES = [
  { id: "credit_immo", label: "Crédit immobilier" },
  { id: "credit_pro", label: "Crédit professionnel" },
  { id: "rachat_credit", label: "Rachat de crédit" },
  { id: "credit_conso", label: "Crédit consommation" },
];

type Step = "accueil" | "identite" | "contrat" | "signature" | "confirmation";

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
    denominationSociale: "",
    formeJuridique: "",
    capitalSocial: "",
    adresseSiegeSocial: "",
    villeGreffe: "",
    numeroRCS: "",
    representantLegalNom: "",
    representantLegalFonction: "",
    signatureNom: "",
    accepteConditions: false,
    accepteContrat: false,
  });

  // Pré-remplir le code parrain depuis l'URL (?parrain=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("parrain");
    if (codeFromUrl) {
      setParrainQuery(codeFromUrl);
      setParrainDebounced(codeFromUrl);
    }
  }, []);

  // Debounce de la recherche parrain
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParrainDebounced(parrainQuery);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [parrainQuery]);

  // Résoudre le parrain
  const { data: parrainResolu, isLoading: loadingParrain } = trpc.courtiers.resoudreParrain.useQuery(
    { code: parrainDebounced },
    { enabled: parrainDebounced.length >= 3 }
  );

  const inscrire = trpc.courtiers.inscrire.useMutation({
    onSuccess: (data) => {
      setConventionUrl(data.conventionUrl);
      if (data.codeParrain) setCodeParrainAttribue(data.codeParrain);
      setStep("confirmation");
    },
    onError: (err) => {
      toast.error(err.message);
    },
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
      toast.error("Veuillez cocher les deux cases pour continuer.");
      return;
    }
    if (!form.signatureNom.trim()) {
      toast.error("Veuillez saisir votre nom complet comme signature.");
      return;
    }
    inscrire.mutate({
      nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone,
      adresse: form.adresse, codePostal: form.codePostal, ville: form.ville,
      statut: form.statut,
      siret: form.siret || undefined,
      cabinetNom: form.cabinetNom || undefined,
      numeroOrias: form.numeroOrias || undefined,
      denominationSociale: form.denominationSociale || undefined,
      formeJuridique: form.formeJuridique || undefined,
      capitalSocial: form.capitalSocial || undefined,
      adresseSiegeSocial: form.adresseSiegeSocial || undefined,
      villeGreffe: form.villeGreffe || undefined,
      numeroRCS: form.numeroRCS || undefined,
      representantLegalNom: form.representantLegalNom || undefined,
      representantLegalFonction: form.representantLegalFonction || undefined,
      specialites: specialitesSelected.length > 0 ? specialitesSelected : undefined,
      codeParrain: parrainResolu?.code ?? (parrainQuery || undefined),
      signatureNom: form.signatureNom,
    });
  };

  // ─── CONFIRMATION ────────────────────────────────────────────────────────────
  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-[#C9A84C]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Bienvenue dans le réseau</h1>
            <p className="text-[#C9A84C] font-semibold">SIGMA FACTORY — Courtier Partenaire</p>
          </div>
          <p className="text-gray-400">
            Votre convention de partenariat a été générée et signée électroniquement.
            L'équipe Sigma va valider votre profil sous 24h.
          </p>

          {codeParrainAttribue && (
            <div className="bg-[#111] border border-[#C9A84C]/40 p-5">
              <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">Votre code parrain</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-white font-mono text-2xl font-black tracking-widest">{codeParrainAttribue}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(codeParrainAttribue); toast.success("Code copié !"); }}
                  className="p-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">Partagez ce code pour parrainer d'autres courtiers</p>
            </div>
          )}

          <div className="bg-[#111] border border-[#C9A84C]/20 p-4 text-left">
            <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">Votre espace personnel</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-300 text-sm font-mono flex-1 truncate">
                https://www.sigmafactory.org/dashboard/courtier
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText("https://www.sigmafactory.org/dashboard/courtier"); toast.success("Lien copié !"); }}
                className="p-2 bg-[#222] text-gray-400 hover:text-white transition-colors shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {codeParrainAttribue && (
            <div className="bg-[#111] border border-[#222] p-4 text-left">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Votre lien de parrainage</p>
              <div className="flex items-center gap-2">
                <p className="text-gray-300 text-sm font-mono flex-1 truncate">
                  {`https://www.sigmafactory.org/parrainage/${codeParrainAttribue}`}
                </p>
                <button
                  onClick={() => { navigator.clipboard.writeText(`https://www.sigmafactory.org/parrainage/${codeParrainAttribue}`); toast.success("Lien copié !"); }}
                  className="p-2 bg-[#222] text-gray-400 hover:text-white transition-colors shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {conventionUrl && (
              <a href={conventionUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[#C9A84C]/30 text-[#C9A84C] font-bold px-6 py-3 hover:bg-[#C9A84C]/10 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Télécharger ma convention
              </a>
            )}
            <a href="/dashboard/courtier"
              className="inline-flex items-center gap-2 bg-[#C9A84C] text-black font-bold px-6 py-3 hover:bg-[#b8943e] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Accéder à mon espace courtier
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#C9A84C]/20 py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-widest">SIGMA <span className="text-[#C9A84C]">FACTORY</span></h1>
            <p className="text-xs text-gray-500 tracking-widest mt-1">CONSEIL EN IMMOBILIER &amp; FINANCEMENT</p>
          </div>
          <div className="text-right">
            <div className="text-[#C9A84C] font-bold text-sm">PROGRAMME COURTIERS</div>
            <div className="text-gray-500 text-xs">Convention de partenariat</div>
          </div>
        </div>
      </div>

      {/* Indicateur d'étapes */}
      {step !== "accueil" && (
        <div className="border-b border-[#C9A84C]/10 bg-[#0d0d0d]">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 text-xs">
            {[
              { id: "identite", label: "1. Informations" },
              { id: "contrat", label: "2. Contrat" },
              { id: "signature", label: "3. Signature" },
            ].map((s, i) => {
              const steps: Step[] = ["identite", "contrat", "signature"];
              const currentIdx = steps.indexOf(step as any);
              const sIdx = steps.indexOf(s.id as any);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className={`font-bold ${sIdx <= currentIdx ? "text-[#C9A84C]" : "text-gray-600"}`}>
                    {s.label}
                  </span>
                  {i < 2 && <ChevronRight size={12} className="text-gray-700" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ÉTAPE ACCUEIL ─────────────────────────────────────────────────────── */}
      {step === "accueil" && (
        <div>
          <div className="bg-[#111] py-12 px-6 border-b border-[#C9A84C]/10">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-black mb-4">Rejoignez le réseau <span className="text-[#C9A84C]">Sigma</span></h2>
              <p className="text-gray-400 mb-8">
                Apportez des dossiers de financement, développez votre réseau et percevez des
                rétrocommissions sur votre réseau.
              </p>
              <div className="grid grid-cols-3 gap-6">
                <div className="border border-[#C9A84C]/30 p-4">
                  <div className="text-3xl font-black text-[#C9A84C]">75%</div>
                  <div className="text-gray-400 text-sm mt-1">Des honoraires<br/>pour vous</div>
                </div>
                <div className="border border-[#C9A84C]/30 p-4">
                  <div className="text-3xl font-black text-[#C9A84C]">10%</div>
                  <div className="text-gray-400 text-sm mt-1">Résiduel N1<br/>sur vos filleuls</div>
                </div>
                <div className="border border-[#C9A84C]/30 p-4">
                  <div className="text-3xl font-black text-[#C9A84C]">5%</div>
                  <div className="text-gray-400 text-sm mt-1">Résiduel N2<br/>réseau croisé</div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: FileText, title: "Remplissez le formulaire", desc: "Vos informations personnelles et professionnelles" },
                { icon: FileText, title: "Lisez la convention", desc: "Prenez connaissance des termes du partenariat avant de signer" },
                { icon: CheckCircle, title: "Signez électroniquement", desc: "Signature légale — convention PDF générée instantanément" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 bg-[#111] border border-[#222] p-5">
                  <div className="w-8 h-8 bg-[#C9A84C] text-black font-black text-sm flex items-center justify-center shrink-0">{i + 1}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={() => setStep("identite")}
                className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold text-lg px-12 py-6 h-auto"
              >
                Devenir Courtier Partenaire
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-gray-600 text-sm mt-4">Signature électronique sécurisée — Convention PDF générée automatiquement</p>
            </div>

            <div className="border border-[#222] bg-[#111] p-6 flex items-start gap-4 max-w-2xl mx-auto">
              <Shield className="w-6 h-6 text-[#C9A84C] shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold text-sm">SIGMA FACTORY SAS</p>
                <p className="text-gray-400 text-sm mt-1">
                  Capital 5 000 € — RCS Lyon 999 672 777 — Carte pro CPI69012026000000022 — CCI Lyon Métropole<br />
                  12 Rue de la Part-Dieu, 69003 Lyon
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ÉTAPE IDENTITÉ ────────────────────────────────────────────────────── */}
      {step === "identite" && (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-[#C9A84C] text-black font-black text-sm flex items-center justify-center">1</div>
              <h2 className="text-2xl font-black text-white">Vos informations</h2>
            </div>
            <p className="text-gray-400 text-sm ml-11">Ces informations apparaîtront sur votre convention de partenariat.</p>
          </div>

          {/* Identité */}
          <div className="bg-[#111] border border-[#222] p-8 space-y-6">
            <h3 className="text-[#C9A84C] font-bold text-sm tracking-widest uppercase border-l-2 border-[#C9A84C] pl-3">
              Informations personnelles
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Prénom *</Label>
                <Input value={form.prenom} onChange={set("prenom")} required className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Nom *</Label>
                <Input value={form.nom} onChange={set("nom")} required className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Email professionnel *</Label>
                <Input type="email" value={form.email} onChange={set("email")} required className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Téléphone *</Label>
                <Input value={form.telephone} onChange={set("telephone")} required className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div className="col-span-2">
                <Label className="text-gray-400 text-xs mb-1 block">Adresse *</Label>
                <Input value={form.adresse} onChange={set("adresse")} required className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Code postal *</Label>
                <Input value={form.codePostal} onChange={set("codePostal")} required className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Ville *</Label>
                <Input value={form.ville} onChange={set("ville")} required className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
            </div>
          </div>

          {/* Professionnel */}
          <div className="bg-[#111] border border-[#222] p-8 space-y-6">
            <h3 className="text-[#C9A84C] font-bold text-sm tracking-widest uppercase border-l-2 border-[#C9A84C] pl-3">
              Informations professionnelles
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Statut juridique *</Label>
                <Select value={form.statut} onValueChange={(v) => setForm(f => ({ ...f, statut: v as any }))}>
                  <SelectTrigger className="bg-[#0d0d0d] border-gray-700 text-white">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-gray-700">
                    <SelectItem value="auto_entrepreneur">Auto-entrepreneur</SelectItem>
                    <SelectItem value="eirl">EIRL</SelectItem>
                    <SelectItem value="eurl">EURL</SelectItem>
                    <SelectItem value="sasu">SASU</SelectItem>
                    <SelectItem value="sarl">SARL</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Numéro ORIAS</Label>
                <Input value={form.numeroOrias} onChange={set("numeroOrias")} placeholder="Ex: 12345678" className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Nom du cabinet</Label>
                <Input value={form.cabinetNom} onChange={set("cabinetNom")} className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">SIRET</Label>
                <Input value={form.siret} onChange={set("siret")} className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-3 block">Spécialités</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALITES.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      id={s.id}
                      checked={specialitesSelected.includes(s.id)}
                      onCheckedChange={(checked) => {
                        setSpecialitesSelected(prev =>
                          checked ? [...prev, s.id] : prev.filter(x => x !== s.id)
                        );
                      }}
                      className="border-gray-600"
                    />
                    <label htmlFor={s.id} className="text-gray-300 text-sm cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Informations juridiques */}
          <div className="bg-[#111] border border-[#222] p-8 space-y-6">
            <h3 className="text-[#C9A84C] font-bold text-sm tracking-widest uppercase border-l-2 border-[#C9A84C] pl-3">
              Informations juridiques <span className="text-gray-600 font-normal normal-case">(optionnel)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-gray-400 text-xs mb-1 block">Dénomination sociale</Label>
                <Input value={form.denominationSociale} onChange={set("denominationSociale")} placeholder="Ex: CABINET DUPONT FINANCES" className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Forme juridique</Label>
                <Input value={form.formeJuridique} onChange={set("formeJuridique")} placeholder="Ex: SARL, SAS, EI..." className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Capital social (€)</Label>
                <Input value={form.capitalSocial} onChange={set("capitalSocial")} placeholder="Ex: 10 000 €" className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div className="col-span-2">
                <Label className="text-gray-400 text-xs mb-1 block">Adresse du siège social</Label>
                <Input value={form.adresseSiegeSocial} onChange={set("adresseSiegeSocial")} placeholder="Numéro, rue, code postal, ville" className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Ville du greffe RCS</Label>
                <Input value={form.villeGreffe} onChange={set("villeGreffe")} placeholder="Ex: Paris" className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Numéro RCS</Label>
                <Input value={form.numeroRCS} onChange={set("numeroRCS")} placeholder="Ex: 123 456 789" className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Représentant légal</Label>
                <Input value={form.representantLegalNom} onChange={set("representantLegalNom")} placeholder="Ex: Jean DUPONT" className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Fonction du représentant</Label>
                <Input value={form.representantLegalFonction} onChange={set("representantLegalFonction")} placeholder="Ex: Gérant, Président..." className="bg-[#0d0d0d] border-gray-700 text-white" />
              </div>
            </div>
          </div>

          {/* Parrain */}
          <div className="bg-[#111] border border-[#222] p-8 space-y-4">
            <h3 className="text-[#C9A84C] font-bold text-sm tracking-widest uppercase border-l-2 border-[#C9A84C] pl-3">
              Code parrain <span className="text-gray-600 font-normal normal-case">(optionnel)</span>
            </h3>
            <div className="max-w-sm space-y-2">
              <Label className="text-gray-400 text-xs mb-1 block">Code ou email de votre parrain</Label>
              <div className="relative">
                <Input
                  value={parrainQuery}
                  onChange={e => setParrainQuery(e.target.value)}
                  placeholder="SIG-NOM-0001 ou email@exemple.fr"
                  className={`bg-[#0d0d0d] border-gray-700 text-white pr-10 ${parrainResolu ? "border-green-500/60" : ""}`}
                />
                {loadingParrain && parrainDebounced.length >= 3 && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
                )}
                {!loadingParrain && parrainResolu && (
                  <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
                )}
                {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && (
                  <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
                )}
              </div>
              {parrainResolu && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
                  <UserCheck size={14} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-green-400 text-sm font-semibold">{parrainResolu.nom}</p>
                    <p className="text-green-400/60 text-xs">
                      {parrainResolu.type === "agent" ? "Agent Immobilier" : parrainResolu.type === "courtier" ? "Courtier" : "Sigma Factory"} · {parrainResolu.code}
                    </p>
                  </div>
                </div>
              )}
              {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-xs">Code ou email non reconnu dans le réseau Sigma</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep("accueil")} className="border-[#333] text-gray-400 hover:bg-[#111]">
              <ChevronLeft className="mr-2 w-4 h-4" /> Retour
            </Button>
            <Button
              onClick={() => { if (validateIdentite()) setStep("contrat"); }}
              className="flex-1 bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold"
            >
              Lire la convention <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── ÉTAPE CONTRAT ─────────────────────────────────────────────────────── */}
      {step === "contrat" && (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-[#C9A84C] text-black font-black text-sm flex items-center justify-center">2</div>
              <h2 className="text-2xl font-black text-white">Convention de Partenariat Courtage</h2>
            </div>
            <p className="text-gray-400 text-sm ml-11">Lisez attentivement la convention avant de signer.</p>
          </div>

          <div className="bg-[#111] border border-[#C9A84C]/30 p-8 space-y-6 max-h-[65vh] overflow-y-auto text-sm text-gray-300 leading-relaxed">
            {/* En-tête */}
            <div className="text-center space-y-2 pb-6 border-b border-[#333]">
              <h3 className="text-white font-black text-xl tracking-widest">CONVENTION DE PARTENARIAT COURTAGE</h3>
              <p className="text-[#C9A84C] font-semibold">Programme d'Affiliation Réseau — Sigma Factory</p>
              <p className="text-gray-500 text-xs">Entre SIGMA FACTORY SAS et {form.prenom} {form.nom}</p>
            </div>

            {/* Parties */}
            <div className="bg-[#0d0d0d] border border-[#222] p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">La Société</p>
                <p className="text-white font-semibold">SIGMA FACTORY SAS</p>
                <p className="text-gray-400 text-xs mt-1">
                  Capital 5 000 € — RCS Lyon 999 672 777<br />
                  12 Rue de la Part-Dieu, 69003 Lyon<br />
                  Carte pro CPI69012026000000022<br />
                  Représentée par Carole Pennavayre, Présidente
                </p>
              </div>
              <div>
                <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">Le Courtier Partenaire</p>
                <p className="text-white font-semibold">{form.prenom} {form.nom}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {form.cabinetNom && <>{form.cabinetNom}<br /></>}
                  {form.statut}<br />
                  {form.adresse}<br />
                  {form.codePostal} {form.ville}<br />
                  {form.email}
                </p>
              </div>
            </div>

            {/* Grille commissions */}
            <div className="bg-[#0d0d0d] border border-[#C9A84C]/20 p-4 text-center">
              <p className="text-[#C9A84C] font-bold text-lg">Répartition des Honoraires</p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="border border-[#C9A84C]/30 p-3">
                  <p className="text-[#C9A84C] text-3xl font-black">75%</p>
                  <p className="text-gray-400 text-xs mt-1">Part Courtier<br />Sur chaque dossier finalisé</p>
                </div>
                <div className="border border-[#C9A84C]/30 p-3">
                  <p className="text-[#C9A84C] text-3xl font-black">10%</p>
                  <p className="text-gray-400 text-xs mt-1">Rétrocommission N1<br />Sur la Part Sigma</p>
                </div>
                <div className="border border-[#C9A84C]/30 p-3">
                  <p className="text-[#C9A84C] text-3xl font-black">5%</p>
                  <p className="text-gray-400 text-xs mt-1">Rétrocommission N2<br />Réseau croisé</p>
                </div>
              </div>
            </div>

            {/* Articles */}
            {[
              {
                title: "Article 1 — Objet de la Convention",
                content: "La présente convention a pour objet de définir les conditions dans lesquelles le Courtier s'engage à apporter des dossiers de financement à SIGMA FACTORY SAS dans le cadre d'un partenariat de courtage en crédit immobilier et/ou professionnel, et à développer un réseau de partenaires affiliés dans le cadre du Programme d'Affiliation Sigma. Le Courtier exerce son activité sous son propre numéro ORIAS et sous sa propre responsabilité professionnelle."
              },
              {
                title: "Article 2 — Missions du Courtier Partenaire",
                content: "Dans le cadre de la présente convention, le Courtier s'engage à : apporter des dossiers de financement qualifiés (crédit immobilier, prêt professionnel, rachat de crédit) à SIGMA FACTORY SAS ; assurer le montage et le suivi des dossiers jusqu'à leur finalisation ; respecter la réglementation en vigueur, notamment les obligations liées à son immatriculation ORIAS ; promouvoir le réseau SIGMA FACTORY auprès de son réseau professionnel ; maintenir la confidentialité sur les informations clients et les méthodes de travail de SIGMA FACTORY SAS."
              },
              {
                title: "Article 3 — Rémunération et Rétrocommissions",
                content: "Commission principale (75%) : Pour chaque dossier de financement finalisé, le Courtier perçoit 75% des honoraires HT encaissés par la Société. Les 25% restants constituent la Part Sigma. Programme d'affiliation : Niveau 1 — 10% de la Part Sigma sur tout dossier finalisé par un partenaire directement recruté. Niveau 2 — 5% de la Part Sigma sur tout dossier finalisé par un partenaire de niveau 2. Les rémunérations sont versées dans les 30 jours suivant l'encaissement effectif. Exemple : pour un dossier de 2 000 € d'honoraires, le Courtier perçoit 1 500 €, son parrain direct 50 €, et le grand-parrain 25 €."
              },
              {
                title: "Article 4 — Obligations Réglementaires",
                content: "Le Courtier déclare être régulièrement immatriculé à l'ORIAS en qualité d'Intermédiaire en Opérations de Banque et en Services de Paiement (IOBSP) et s'engage à maintenir cette immatriculation en cours de validité pendant toute la durée de la présente convention. Le Courtier est seul responsable du respect de la réglementation applicable à son activité."
              },
              {
                title: "Article 5 — Confidentialité et Protection des Données",
                content: "Le Courtier s'engage à maintenir strictement confidentielle toute information relative aux clients, prospects, tarifs, méthodes et outils de SIGMA FACTORY SAS, pendant toute la durée de la convention et pour une période de 5 ans après sa résiliation. Les données personnelles des clients sont traitées conformément au RGPD."
              },
              {
                title: "Article 6 — Non-Concurrence et Loyauté",
                content: "Pendant la durée de la convention et pendant les 12 mois suivant sa résiliation, le Courtier s'interdit de solliciter ou de tenter de recruter tout partenaire, salarié ou client de SIGMA FACTORY SAS pour le compte d'une structure concurrente."
              },
              {
                title: "Article 7 — Durée et Résiliation",
                content: "La présente convention est conclue pour une durée indéterminée à compter de sa signature électronique. Chaque partie peut y mettre fin à tout moment par notification écrite avec un préavis de 30 jours. SIGMA FACTORY SAS se réserve le droit de résilier la convention sans préavis en cas de manquement grave. En cas de résiliation ordinaire, le Courtier conserve le bénéfice de ses rétrocommissions sur les dossiers initiés avant la date d'effet, sous réserve qu'ils aboutissent dans les 6 mois suivant la rupture."
              },
              {
                title: "Article 8 — Statut Indépendant et Obligations Fiscales",
                content: "Le Courtier déclare exercer son activité en toute indépendance et sous sa propre responsabilité. Il est seul responsable du respect de ses obligations fiscales et sociales. La présente convention ne crée aucun lien de subordination entre les parties et ne peut être qualifiée de contrat de travail."
              },
              {
                title: "Article 9 — Droit Applicable et Litiges",
                content: "La présente convention est soumise au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours. À défaut, le Tribunal de Commerce de Lyon sera seul compétent."
              },
            ].map((art, i) => (
              <div key={i}>
                <p className="text-white font-bold text-sm mb-1">{art.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{art.content}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep("identite")} className="border-[#333] text-gray-400 hover:bg-[#111]">
              <ChevronLeft className="mr-2 w-4 h-4" /> Retour
            </Button>
            <Button
              onClick={() => setStep("signature")}
              className="flex-1 bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold"
            >
              J'ai lu la convention — Signer <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── ÉTAPE SIGNATURE ───────────────────────────────────────────────────── */}
      {step === "signature" && (
        <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-[#C9A84C] text-black font-black text-sm flex items-center justify-center">3</div>
              <h2 className="text-2xl font-black text-white">Signature électronique</h2>
            </div>
            <p className="text-gray-400 text-sm ml-11">Votre signature a valeur légale conformément au droit français.</p>
          </div>

          <div className="bg-[#111] border border-[#222] p-8 space-y-6">
            {/* Récapitulatif */}
            <div className="bg-[#0d0d0d] border border-[#C9A84C]/20 p-4 space-y-1">
              <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider">Récapitulatif</p>
              <p className="text-white font-semibold">{form.prenom} {form.nom}</p>
              <p className="text-gray-400 text-sm">{form.email} — {form.telephone}</p>
              <p className="text-gray-400 text-sm">{form.adresse}, {form.codePostal} {form.ville}</p>
              {form.cabinetNom && <p className="text-gray-400 text-sm">{form.cabinetNom}</p>}
              {form.numeroOrias && <p className="text-gray-400 text-sm">ORIAS : {form.numeroOrias}</p>}
            </div>

            {/* Champ signature */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">
                Signez en tapant votre nom complet *
              </Label>
              <Input
                value={form.signatureNom}
                onChange={set("signatureNom")}
                placeholder={`${form.prenom} ${form.nom}`}
                className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C] text-lg font-serif italic h-14"
                style={{ fontFamily: "Georgia, serif" }}
              />
              <p className="text-gray-600 text-xs">En saisissant votre nom, vous apposez votre signature électronique au sens de l'article 1367 du Code civil.</p>
            </div>

            {/* Cases à cocher */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="conditions"
                  checked={form.accepteConditions}
                  onCheckedChange={(v) => setForm(f => ({ ...f, accepteConditions: !!v }))}
                  className="border-[#444] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C] mt-0.5"
                />
                <label htmlFor="conditions" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                  J'ai lu et j'accepte les conditions générales du Programme Courtier Sigma Factory, notamment les modalités de rémunération (75% des honoraires, rétrocommissions réseau : 10% Niveau 1, 5% Niveau 2) et les obligations de confidentialité. J'accepte également le traitement de mes données personnelles conformément à la{" "}
                  <a href="/politique-confidentialite" target="_blank" rel="noreferrer" className="text-[#C9A84C] underline">politique de confidentialité</a>.
                </label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="contrat"
                  checked={form.accepteContrat}
                  onCheckedChange={(v) => setForm(f => ({ ...f, accepteContrat: !!v }))}
                  className="border-[#444] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C] mt-0.5"
                />
                <label htmlFor="contrat" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                  Je certifie avoir pris connaissance de la convention de partenariat dans son intégralité et je m'engage à respecter l'ensemble de ses clauses. Je confirme que les informations fournies sont exactes.
                </label>
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-[#333] p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
              <p className="text-gray-400 text-xs leading-relaxed">
                Une convention PDF horodatée sera générée et envoyée à votre adresse email. Cette signature électronique a valeur légale conformément à l'article 1367 du Code civil français et au règlement eIDAS.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep("contrat")} className="border-[#333] text-gray-400 hover:bg-[#111]">
              <ChevronLeft className="mr-2 w-4 h-4" /> Retour
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={inscrire.isPending}
              className="flex-1 bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold text-base h-12"
            >
              {inscrire.isPending ? "Signature en cours..." : "Signer et rejoindre le réseau Sigma"}
            </Button>
          </div>

          {inscrire.isError && (
            <p className="text-red-400 text-sm text-center">{inscrire.error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

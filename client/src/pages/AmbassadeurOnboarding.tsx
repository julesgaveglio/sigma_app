import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ChevronRight, ChevronLeft, FileText, Users, Zap, Shield, TrendingUp, Star, UserCheck, AlertCircle, Loader2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Step = "accueil" | "identite" | "contrat" | "signature" | "confirmation";

interface FormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  statut: "agent_immobilier" | "mandataire" | "courtier" | "auto_entrepreneur" | "autre";
  siret: string;
  activitePrincipale: string;
  parrainCode: string;
  signatureNom: string;
  accepteConditions: boolean;
  accepteContrat: boolean;
}

const STATUTS = [
  { value: "agent_immobilier", label: "Agent immobilier" },
  { value: "mandataire", label: "Mandataire immobilier" },
  { value: "courtier", label: "Courtier" },
  { value: "auto_entrepreneur", label: "Auto-entrepreneur" },
  { value: "autre", label: "Autre" },
];

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

  // Pré-remplir le code parrain depuis l'URL (?parrain=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("parrain");
    if (codeFromUrl) {
      setForm(f => ({ ...f, parrainCode: codeFromUrl }));
      setParrainDebounced(codeFromUrl);
    }
  }, []);

  // Debounce de la recherche parrain
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParrainDebounced(form.parrainCode);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.parrainCode]);

  // Résoudre le parrain
  const { data: parrainResolu, isLoading: loadingParrain } = trpc.courtiers.resoudreParrain.useQuery(
    { code: parrainDebounced },
    { enabled: parrainDebounced.length >= 3 }
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
    if (!form.nom) e.nom = "Requis";
    if (!form.prenom) e.prenom = "Requis";
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Email invalide";
    if (!form.telephone) e.telephone = "Requis";
    if (!form.adresse) e.adresse = "Requis";
    if (!form.codePostal) e.codePostal = "Requis";
    if (!form.ville) e.ville = "Requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!form.signatureNom || !form.accepteConditions || !form.accepteContrat) {
      setErrors({
        signatureNom: !form.signatureNom ? "Veuillez saisir votre nom complet" : undefined,
        accepteConditions: !form.accepteConditions ? "Requis" : undefined,
        accepteContrat: !form.accepteContrat ? "Requis" : undefined,
      });
      return;
    }
    inscrire.mutate({
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      telephone: form.telephone,
      adresse: form.adresse,
      codePostal: form.codePostal,
      ville: form.ville,
      statut: form.statut,
      siret: form.siret || undefined,
      activitePrincipale: form.activitePrincipale || undefined,
      signatureNom: form.signatureNom,
      signatureAcceptee: true,
      parrainId: (parrainResolu && 'id' in parrainResolu) ? (parrainResolu as any).id : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#C9A84C]/20 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest">
              SIGMA <span className="text-[#C9A84C]">FACTORY</span>
            </h1>
            <p className="text-xs text-gray-500 tracking-widest mt-0.5">PROGRAMME AGENT</p>
          </div>
          <Badge className="bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 text-xs px-3 py-1">
            Recrutement Ouvert
          </Badge>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* ÉTAPE ACCUEIL */}
        {step === "accueil" && (
          <div className="space-y-12">
            {/* Hero */}
            <div className="text-center space-y-6">
              <div className="inline-block bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-sm px-4 py-2 tracking-widest font-semibold">
                PROGRAMME D'AFFILIATION À 2 NIVEAUX
              </div>
              <h2 className="text-5xl font-black text-white leading-tight">
                Rejoignez le Réseau<br />
                <span className="text-[#C9A84C]">Agent Sigma</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Développez votre réseau, proposez des biens à nos clients qualifiés et percevez des rétrocommissions sur chaque transaction.
              </p>
            </div>

            {/* Avantages */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: TrendingUp, title: "50% des honoraires", desc: "Vous conservez 50% de chaque commission immobilière générée (agents)", color: "text-[#C9A84C]" },
                { icon: TrendingUp, title: "10% de rétrocommission", desc: "Sur chaque vente de votre réseau direct (Niveau 1)", color: "text-[#C9A84C]" },
                { icon: Users, title: "5% sur vos filleuls", desc: "Sur chaque vente des ambassadeurs que vous parrainez (Niveau 2)", color: "text-[#C9A84C]" },
                { icon: Zap, title: "Accès plateforme", desc: "Outil dédié pour soumettre vos biens et suivre vos commissions", color: "text-[#C9A84C]" },
              ].map((item, i) => (
                <div key={i} className="bg-[#111] border border-[#222] p-6 space-y-3">
                  <item.icon className={`w-8 h-8 ${item.color}`} />
                  <h3 className="text-white font-bold text-lg">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button
                onClick={() => setStep("identite")}
                className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold text-lg px-12 py-6 h-auto tracking-wide"
              >
                Devenir Agent Sigma
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-gray-600 text-sm mt-4">
                Signature électronique sécurisée — Contrat légal généré automatiquement
              </p>
            </div>

            {/* Sigma info */}
            <div className="border border-[#222] bg-[#111] p-6 flex items-start gap-4">
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
        )}

        {/* ÉTAPE IDENTITÉ */}
        {step === "identite" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#C9A84C] text-black font-black text-sm flex items-center justify-center">1</div>
                <h2 className="text-2xl font-black text-white">Vos informations</h2>
              </div>
              <p className="text-gray-400 text-sm ml-11">Ces informations apparaîtront sur votre contrat d'agent.</p>
            </div>

            <div className="bg-[#111] border border-[#222] p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Nom *</Label>
                  <Input
                    value={form.nom}
                    onChange={e => set("nom", e.target.value)}
                    placeholder="DUPONT"
                    className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                  />
                  {errors.nom && <p className="text-red-400 text-xs">{errors.nom}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Prénom *</Label>
                  <Input
                    value={form.prenom}
                    onChange={e => set("prenom", e.target.value)}
                    placeholder="Jean"
                    className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                  />
                  {errors.prenom && <p className="text-red-400 text-xs">{errors.prenom}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    placeholder="jean.dupont@email.com"
                    className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                  />
                  {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Téléphone *</Label>
                  <Input
                    value={form.telephone}
                    onChange={e => set("telephone", e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                  />
                  {errors.telephone && <p className="text-red-400 text-xs">{errors.telephone}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Adresse *</Label>
                <Input
                  value={form.adresse}
                  onChange={e => set("adresse", e.target.value)}
                  placeholder="12 rue de la Paix"
                  className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                />
                {errors.adresse && <p className="text-red-400 text-xs">{errors.adresse}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Code postal *</Label>
                  <Input
                    value={form.codePostal}
                    onChange={e => set("codePostal", e.target.value)}
                    placeholder="69001"
                    className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                  />
                  {errors.codePostal && <p className="text-red-400 text-xs">{errors.codePostal}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Ville *</Label>
                  <Input
                    value={form.ville}
                    onChange={e => set("ville", e.target.value)}
                    placeholder="Lyon"
                    className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                  />
                  {errors.ville && <p className="text-red-400 text-xs">{errors.ville}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Statut professionnel *</Label>
                <Select value={form.statut} onValueChange={v => set("statut", v)}>
                  <SelectTrigger className="bg-[#0d0d0d] border-[#333] text-white focus:border-[#C9A84C]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#333]">
                    {STATUTS.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-white hover:bg-[#222]">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">SIRET (optionnel)</Label>
                  <Input
                    value={form.siret}
                    onChange={e => set("siret", e.target.value)}
                    placeholder="123 456 789 00012"
                    className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Code parrain (optionnel)</Label>
                  <div className="relative">
                    <Input
                      value={form.parrainCode}
                      onChange={e => set("parrainCode", e.target.value)}
                      placeholder="SIG-NOM-0001 ou email"
                      className={`bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C] pr-8 ${parrainResolu ? "border-green-500/60" : ""}`}
                    />
                    {loadingParrain && parrainDebounced.length >= 3 && (
                      <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
                    )}
                    {!loadingParrain && parrainResolu && (
                      <CheckCircle size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-400" />
                    )}
                    {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && (
                      <AlertCircle size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400" />
                    )}
                  </div>
                  {parrainResolu && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <UserCheck size={12} className="text-green-400" />
                      <p className="text-green-400 text-xs font-semibold">{parrainResolu.nom}</p>
                      <span className="text-green-400/50 text-xs">·</span>
                      <p className="text-green-400/60 text-xs">{parrainResolu.type === "agent" ? "Agent" : parrainResolu.type === "courtier" ? "Courtier" : "Sigma"}</p>
                    </div>
                  )}
                  {!loadingParrain && parrainDebounced.length >= 3 && !parrainResolu && (
                    <p className="text-red-400 text-xs mt-1">Code non reconnu</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep("accueil")} className="border-[#333] text-gray-400 hover:bg-[#111]">
                <ChevronLeft className="mr-2 w-4 h-4" /> Retour
              </Button>
              <Button
                onClick={() => { if (validateIdentite()) setStep("contrat"); }}
                className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
              >
                Lire le contrat <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ÉTAPE CONTRAT */}
        {step === "contrat" && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#C9A84C] text-black font-black text-sm flex items-center justify-center">2</div>
                <h2 className="text-2xl font-black text-white">Contrat d'Agent</h2>
              </div>
              <p className="text-gray-400 text-sm ml-11">Lisez attentivement le contrat avant de signer.</p>
            </div>

            <div className="bg-[#111] border border-[#C9A84C]/30 p-8 space-y-6 max-h-[60vh] overflow-y-auto text-sm text-gray-300 leading-relaxed">
              <div className="text-center space-y-2 pb-6 border-b border-[#333]">
                <h3 className="text-white font-black text-xl tracking-widest">CONTRAT DE PARTENARIAT AMBASSADEUR</h3>
                <p className="text-[#C9A84C] font-semibold">Programme d'Affiliation Sigma Factory</p>
                <p className="text-gray-500 text-xs">Entre SIGMA FACTORY SAS et {form.prenom} {form.nom}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-[#0d0d0d] border border-[#222] p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">Le Mandant</p>
                    <p className="text-white font-semibold">SIGMA FACTORY SAS</p>
                    <p className="text-gray-400 text-xs mt-1">Capital 5 000 € — RCS Lyon 999 672 777<br />12 Rue de la Part-Dieu, 69003 Lyon<br />Carte pro CPI69012026000000022<br />Représentée par Mme PENNAVAYRE Bidossessi Carole</p>
                  </div>
                  <div>
                    <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">L'Ambassadeur</p>
                    <p className="text-white font-semibold">{form.prenom} {form.nom}</p>
                    <p className="text-gray-400 text-xs mt-1">{form.adresse}<br />{form.codePostal} {form.ville}<br />{form.email}<br />{form.telephone}</p>
                  </div>
                </div>

                <div className="bg-[#0d0d0d] border border-[#C9A84C]/20 p-4 text-center">
                  <p className="text-[#C9A84C] font-bold text-lg">Structure de Rémunération</p>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="border border-[#C9A84C]/30 p-3">
                      <p className="text-[#C9A84C] text-3xl font-black">50%</p>
                      <p className="text-gray-400 text-xs mt-1">Honoraires directs<br />Sur vos dossiers immobiliers</p>
                    </div>
                    <div className="border border-[#C9A84C]/30 p-3">
                      <p className="text-[#C9A84C] text-3xl font-black">10%</p>
                      <p className="text-gray-400 text-xs mt-1">Rétrocommission Niveau 1<br />Sur les ventes de votre réseau direct</p>
                    </div>
                    <div className="border border-[#C9A84C]/30 p-3">
                      <p className="text-[#C9A84C] text-3xl font-black">5%</p>
                      <p className="text-gray-400 text-xs mt-1">Rétrocommission Niveau 2<br />Sur les ventes des filleuls de vos ambassadeurs</p>
                    </div>
                  </div>
                </div>

                {[
                  { title: "Article 1 — Objet", content: "Le présent contrat définit les conditions dans lesquelles l'Ambassadeur s'engage à promouvoir les services de SIGMA FACTORY SAS et à développer un réseau de partenaires affiliés. L'Ambassadeur agit en qualité de partenaire indépendant et non salarié." },
                  { title: "Article 2 — Missions", content: "L'Ambassadeur s'engage à : promouvoir les services Sigma auprès de son réseau, présenter des biens immobiliers aux prospects qualifiés, recruter et parrainer de nouveaux Ambassadeurs, renseigner le portefeuille de biens via la plateforme avec des informations exactes, respecter la charte déontologique et les obligations légales." },
                  { title: "Article 3 — Rémunération", content: "Honoraires directs (50%) : En qualité d'agent immobilier partenaire, l'Ambassadeur perçoit 50% des honoraires HT encaissés par SIGMA FACTORY SAS sur chaque dossier immobilier qu'il apporte directement. Réseau Niveau 1 (10%) : L'Ambassadeur perçoit 10% de la Part Sigma sur toute transaction réalisée par un filleul qu'il a directement recruté. Réseau Niveau 2 (5%) : Le parrain perçoit 5% de la Part Sigma sur toute transaction réalisée par un filleul de Niveau 2. Les rémunérations sont versées dans les 30 jours suivant l'encaissement effectif." },
                  { title: "Article 4 — Durée et Résiliation", content: "Contrat à durée indéterminée à compter de la signature. Résiliation possible par chaque partie avec un préavis de 30 jours. Résiliation immédiate en cas de manquement grave ou comportement contraire à l'éthique." },
                  { title: "Article 5 — Confidentialité", content: "L'Ambassadeur s'engage à maintenir strictement confidentielle toute information relative aux clients, prospects, tarifs et méthodes de SIGMA FACTORY SAS pendant toute la durée du contrat et pour une période de 3 ans après sa résiliation." },
                  { title: "Article 6 — Statut Indépendant", content: "L'Ambassadeur exerce son activité en toute indépendance et est seul responsable de ses obligations fiscales et sociales découlant des rémunérations perçues dans le cadre du présent contrat." },
                  { title: "Article 7 — Droit Applicable", content: "Contrat soumis au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le Tribunal de Commerce de Lyon sera seul compétent." },
                ].map((art, i) => (
                  <div key={i}>
                    <p className="text-white font-bold text-sm mb-1">{art.title}</p>
                    <p className="text-gray-400 text-xs leading-relaxed">{art.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep("identite")} className="border-[#333] text-gray-400 hover:bg-[#111]">
                <ChevronLeft className="mr-2 w-4 h-4" /> Retour
              </Button>
              <Button
                onClick={() => setStep("signature")}
                className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
              >
                J'ai lu le contrat — Signer <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ÉTAPE SIGNATURE */}
        {step === "signature" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#C9A84C] text-black font-black text-sm flex items-center justify-center">3</div>
                <h2 className="text-2xl font-black text-white">Signature électronique</h2>
              </div>
              <p className="text-gray-400 text-sm ml-11">Votre signature a valeur légale conformément au droit français.</p>
            </div>

            <div className="bg-[#111] border border-[#222] p-8 space-y-6">
              <div className="bg-[#0d0d0d] border border-[#C9A84C]/20 p-4 space-y-1">
                <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider">Récapitulatif</p>
                <p className="text-white font-semibold">{form.prenom} {form.nom}</p>
                <p className="text-gray-400 text-sm">{form.email} — {form.telephone}</p>
                <p className="text-gray-400 text-sm">{form.adresse}, {form.codePostal} {form.ville}</p>
                <p className="text-gray-400 text-sm">{STATUTS.find(s => s.value === form.statut)?.label}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm font-semibold">
                  Signez en tapant votre nom complet *
                </Label>
                <Input
                  value={form.signatureNom}
                  onChange={e => set("signatureNom", e.target.value)}
                  placeholder={`${form.prenom} ${form.nom}`}
                  className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C] text-lg font-serif italic h-14"
                />
                {errors.signatureNom && <p className="text-red-400 text-xs">{errors.signatureNom}</p>}
                <p className="text-gray-600 text-xs">En saisissant votre nom, vous apposez votre signature électronique au sens de l'article 1367 du Code civil.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="conditions"
                    checked={form.accepteConditions}
                    onCheckedChange={v => set("accepteConditions", !!v)}
                    className="border-[#444] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C] mt-0.5"
                  />
                  <label htmlFor="conditions" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                    J'ai lu et j'accepte les conditions générales du Programme Agent Sigma Factory, notamment les modalités de rémunération (rétrocommissions réseau : 10% Niveau 1, 5% Niveau 2) et les obligations de confidentialité. J'accepte également le traitement de mes données personnelles conformément à la{" "}
                    <a href="/politique-confidentialite" target="_blank" rel="noreferrer" className="text-[#C9A84C] underline">politique de confidentialité</a>.
                  </label>
                </div>
                {errors.accepteConditions && <p className="text-red-400 text-xs ml-7">{errors.accepteConditions}</p>}

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="contrat"
                    checked={form.accepteContrat}
                    onCheckedChange={v => set("accepteContrat", !!v)}
                    className="border-[#444] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C] mt-0.5"
                  />
                  <label htmlFor="contrat" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                    Je certifie avoir pris connaissance du contrat de partenariat dans son intégralité et je m'engage à respecter l'ensemble de ses clauses. Je confirme que les informations fournies sont exactes.
                  </label>
                </div>
                {errors.accepteContrat && <p className="text-red-400 text-xs ml-7">{errors.accepteContrat}</p>}
              </div>

              <div className="bg-[#0d0d0d] border border-[#333] p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                <p className="text-gray-400 text-xs leading-relaxed">
                  Un contrat PDF horodaté sera généré et envoyé à votre adresse email. Cette signature électronique a valeur légale conformément à l'article 1367 du Code civil français et au règlement eIDAS.
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
                className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold text-base h-12"
              >
                {inscrire.isPending ? "Signature en cours..." : "Signer et rejoindre le réseau Sigma"}
              </Button>
            </div>

            {inscrire.isError && (
              <p className="text-red-400 text-sm text-center">{inscrire.error.message}</p>
            )}
          </div>
        )}

        {/* ÉTAPE CONFIRMATION */}
        {step === "confirmation" && (
          <div className="max-w-2xl mx-auto text-center space-y-8">
            {/* En-tête succès */}
            <div className="space-y-4">
              <div className="w-20 h-20 bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-[#C9A84C]" />
              </div>
              <h2 className="text-3xl font-black text-white">Bienvenue dans le réseau Sigma !</h2>
              <p className="text-gray-400 leading-relaxed">
                Votre inscription a été enregistrée. L'équipe Sigma Factory va examiner votre dossier et vous contacter sous 48h pour activer votre compte.
              </p>
            </div>

            {/* Code parrain */}
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
                <p className="text-gray-500 text-xs mt-2">Partagez ce code pour parrainer d'autres ambassadeurs</p>
              </div>
            )}

            {/* Lien portail */}
            <div className="bg-[#111] border border-[#C9A84C]/20 p-4 text-left">
              <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider mb-2">Votre espace personnel</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-gray-300 text-sm font-mono flex-1 truncate">
                  {`${window.location.origin}/portail-membre`}
                </p>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portail-membre`); toast.success("Lien copié !"); }}
                  className="p-2 bg-[#222] text-gray-400 hover:text-white transition-colors shrink-0"
                  title="Copier le lien"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { window.open(`${window.location.origin}/portail-membre`, '_blank'); toast.success("Pensez à ajouter cette page en favori !"); }}
                  className="p-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors shrink-0 text-xs font-bold px-3"
                  title="Ouvrir et ajouter aux favoris"
                >
                  ★ Ajouter aux favoris
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">Sauvegardez ce lien ou ajoutez-le à vos favoris pour y accéder facilement</p>
            </div>
            {/* Lien de parrainage */}
            {codeParrainAttribue && (
              <div className="bg-[#111] border border-[#222] p-4 text-left">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Votre lien de parrainage</p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-300 text-sm font-mono flex-1 truncate">
                    {`${window.location.origin}/rejoindre?parrain=${codeParrainAttribue}`}
                  </p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/rejoindre?parrain=${codeParrainAttribue}`); toast.success("Lien copié !"); }}
                    className="p-2 bg-[#222] text-gray-400 hover:text-white transition-colors shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Prochaines étapes */}
            <div className="bg-[#111] border border-[#222] p-6 space-y-4 text-left">
              <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider">Prochaines étapes</p>
              {[
                "Vérification de votre dossier par l'équipe Sigma (48h)",
                "Activation de votre espace ambassadeur",
                "Accès à la plateforme pour soumettre vos biens et suivre vos commissions",
                "Réception de votre contrat signé par email",
              ].map((stepLabel, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <p className="text-gray-300 text-sm">{stepLabel}</p>
                </div>
              ))}
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {contratUrl && (
                <a href={contratUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10 w-full sm:w-auto">
                    <FileText className="mr-2 w-4 h-4" />
                    Télécharger mon contrat
                  </Button>
                </a>
              )}
              <a href="/portail-membre">
                <Button className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold w-full sm:w-auto">
                  <ExternalLink className="mr-2 w-4 h-4" />
                  Accéder à mon espace ambassadeur
                </Button>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

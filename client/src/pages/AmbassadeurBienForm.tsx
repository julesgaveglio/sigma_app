import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Home, MapPin, Euro, Maximize2, Camera, ChevronRight, ChevronLeft,
  AlertCircle, TrendingUp, Plus, Upload, X, FileText, Image, Trash2,
} from "lucide-react";
import { toast } from "sonner";

const DPE_COLORS: Record<string, string> = {
  A: "bg-green-600", B: "bg-green-400", C: "bg-yellow-400",
  D: "bg-orange-400", E: "bg-orange-600", F: "bg-red-500", G: "bg-red-700", NC: "bg-gray-500",
};

// ─── Types médias ─────────────────────────────────────────────────────────────
type MediaCategorie = "photo" | "titre_propriete" | "taxe_fonciere" | "diagnostic" | "plan" | "autre";

interface MediaFile {
  id: string;
  file: File;
  preview?: string;   // URL.createObjectURL pour les images
  categorie: MediaCategorie;
  status: "pending" | "uploading" | "done" | "error";
  url?: string;
}

const CATEGORIE_LABELS: Record<MediaCategorie, string> = {
  photo: "Photo du bien",
  titre_propriete: "Titre de propriété",
  taxe_fonciere: "Taxe foncière",
  diagnostic: "Diagnostic (DPE/amiante…)",
  plan: "Plan du bien",
  autre: "Autre document",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AmbassadeurBienForm() {
  const params = new URLSearchParams(window.location.search);
  const ambFromUrl = parseInt(params.get("amb") ?? "0");
  // Auto-détection du profil agent si pas d'ID en URL (cas Elodie / direction)
  const { data: monProfil } = trpc.ambassadeurs.monProfil.useQuery(undefined, { enabled: !ambFromUrl });
  const ambassadeurId = ambFromUrl || (monProfil?.id ?? 0);
  const [mainTab, setMainTab] = useState<"bien" | "commissions">("bien");

  // ─── Commissions immo ───
  const [showDeclImmo, setShowDeclImmo] = useState(false);
  const [immoForm, setImmoForm] = useState({ adresseBien: "", typeTransaction: "vente" as "vente" | "location", montantHonoraires: "" });
  const montantHon = parseInt(immoForm.montantHonoraires) || 0;
  const prevAgent = Math.round(montantHon * 0.50);
  const prevSigma = montantHon - prevAgent;
  const prevParrainN1 = Math.round(prevSigma * 0.10);
  const prevParrainN2 = Math.round(prevSigma * 0.05);
  const prevSigmaNet = prevSigma - prevParrainN1 - prevParrainN2;

  const { data: mesTransactions = [], refetch: refetchTrans } = trpc.commissions.listTransactionsImmo.useQuery(
    { agentId: ambassadeurId },
    { enabled: !!ambassadeurId }
  );
  const creerTransImmoMut = trpc.commissions.creerTransactionImmo.useMutation({
    onSuccess: () => { toast.success("Transaction déclarée !"); setShowDeclImmo(false); setImmoForm({ adresseBien: "", typeTransaction: "vente", montantHonoraires: "" }); refetchTrans(); },
    onError: (e) => toast.error(e.message),
  });

  // ─── Étapes formulaire bien ───
  const [step, setStep] = useState<"localisation" | "caracteristiques" | "prix" | "medias" | "recap" | "confirmation">("localisation");
  const [form, setForm] = useState({
    titre: "", adresse: "", codePostal: "", ville: "", departement: "", region: "",
    typeBien: "appartement" as const, transaction: "vente" as const,
    usage: "residence_principale" as const, etatBien: "bon_etat" as const,
    surface: "", surfaceTerrain: "", nbPieces: "", nbChambres: "", nbSallesBain: "",
    nbEtages: "", etage: "", anneeConstruction: "",
    dpeLettre: "NC" as const, dpeValeur: "", gesLettre: "NC" as const, gesValeur: "",
    balcon: false, terrasse: false, jardin: false, parking: false, garage: false,
    cave: false, ascenseur: false, gardien: false, piscine: false,
    prix: "", prixNetVendeur: "", honorairesAgence: "", prixNegociable: false, chargesAnnuelles: "", taxeFonciere: "", travauxEstimes: "",
    description: "", pointsForts: "", exposition: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bienId, setBienId] = useState<number | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  // ─── Médias ───────────────────────────────────────────────────────────────
  const [medias, setMedias] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingAll, setUploadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadBienMedia = trpc.ambassadeurs.uploadBienMedia.useMutation();

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const newMedias: MediaFile[] = arr.map(file => {
      const isImage = file.type.startsWith("image/");
      return {
        id: Math.random().toString(36).slice(2),
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
        categorie: isImage ? "photo" : "autre",
        status: "pending",
      };
    });
    setMedias(prev => [...prev, ...newMedias]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeMedia = (id: string) => {
    setMedias(prev => {
      const m = prev.find(x => x.id === id);
      if (m?.preview) URL.revokeObjectURL(m.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const setCategorieMedia = (id: string, categorie: MediaCategorie) => {
    setMedias(prev => prev.map(m => m.id === id ? { ...m, categorie } : m));
  };

  // Upload tous les médias en attente vers S3
  const uploadAllMedias = async (currentBienId: number): Promise<boolean> => {
    const pending = medias.filter(m => m.status === "pending");
    if (pending.length === 0) return true;

    setUploadingAll(true);
    let allOk = true;

    for (const media of pending) {
      setMedias(prev => prev.map(m => m.id === media.id ? { ...m, status: "uploading" } : m));
      try {
        const base64 = await fileToBase64(media.file);
        const result = await uploadBienMedia.mutateAsync({
          bienId: currentBienId,
          ambassadeurId,
          fileBase64: base64,
          fileName: media.file.name,
          mimeType: media.file.type || "application/octet-stream",
          categorie: media.categorie,
        });
        setMedias(prev => prev.map(m => m.id === media.id ? { ...m, status: "done", url: result.url } : m));
      } catch (e) {
        console.error("[uploadBienMedia]", e);
        setMedias(prev => prev.map(m => m.id === media.id ? { ...m, status: "error" } : m));
        allOk = false;
      }
    }

    setUploadingAll(false);
    return allOk;
  };

  // ─── Soumission du bien ───────────────────────────────────────────────────
  const creerBien = trpc.ambassadeurs.creerBien.useMutation({
    onSuccess: async (data) => {
      setBienId(data.bienId);
      setReference(data.reference);
      // Uploader les médias maintenant qu'on a le bienId
      if (medias.length > 0) {
        const ok = await uploadAllMedias(data.bienId);
        if (!ok) toast.warning("Certains fichiers n'ont pas pu être uploadés. Le bien a quand même été soumis.");
      }
      setStep("confirmation");
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (key: string, value: string | boolean) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: "" }));
  };

  const validateStep = (s: string) => {
    const e: Record<string, string> = {};
    if (s === "localisation") {
      if (!form.titre) e.titre = "Requis";
      if (!form.adresse) e.adresse = "Requis";
      if (!form.codePostal) e.codePostal = "Requis";
      if (!form.ville) e.ville = "Requis";
    }
    if (s === "caracteristiques") {
      if (!form.surface) e.surface = "Requis";
    }
    if (s === "prix") {
      if (!form.prixNetVendeur) e.prixNetVendeur = "Requis";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    creerBien.mutate({
      ambassadeurId,
      titre: form.titre,
      typeBien: form.typeBien,
      transaction: form.transaction,
      usage: form.usage,
      adresse: form.adresse,
      codePostal: form.codePostal,
      ville: form.ville,
      departement: form.departement || undefined,
      region: form.region || undefined,
      surface: parseInt(form.surface),
      surfaceTerrain: form.surfaceTerrain ? parseInt(form.surfaceTerrain) : undefined,
      nbPieces: form.nbPieces ? parseInt(form.nbPieces) : undefined,
      nbChambres: form.nbChambres ? parseInt(form.nbChambres) : undefined,
      nbSallesBain: form.nbSallesBain ? parseInt(form.nbSallesBain) : undefined,
      nbEtages: form.nbEtages ? parseInt(form.nbEtages) : undefined,
      etage: form.etage ? parseInt(form.etage) : undefined,
      anneeConstruction: form.anneeConstruction ? parseInt(form.anneeConstruction) : undefined,
      etatBien: form.etatBien,
      travauxEstimes: form.travauxEstimes ? parseInt(form.travauxEstimes) : undefined,
      dpeLettre: form.dpeLettre,
      dpeValeur: form.dpeValeur ? parseInt(form.dpeValeur) : undefined,
      gesLettre: form.gesLettre,
      gesValeur: form.gesValeur ? parseInt(form.gesValeur) : undefined,
      balcon: form.balcon, terrasse: form.terrasse, jardin: form.jardin,
      parking: form.parking, garage: form.garage, cave: form.cave,
      ascenseur: form.ascenseur, gardien: form.gardien, piscine: form.piscine,
      prix: (parseInt(form.prixNetVendeur) || 0) + (parseInt(form.honorairesAgence) || 0) || parseInt(form.prix) || 0,
      prixNetVendeur: form.prixNetVendeur ? parseInt(form.prixNetVendeur) : undefined,
      honorairesAgence: form.honorairesAgence ? parseInt(form.honorairesAgence) : undefined,
      prixNegociable: form.prixNegociable,
      chargesAnnuelles: form.chargesAnnuelles ? parseInt(form.chargesAnnuelles) : undefined,
      taxeFonciere: form.taxeFonciere ? parseInt(form.taxeFonciere) : undefined,
      exposition: form.exposition || undefined,
      description: form.description || undefined,
      pointsForts: form.pointsForts || undefined,
    });
  };

  const steps = ["localisation", "caracteristiques", "prix", "medias", "recap"];
  const stepIndex = steps.indexOf(step);

  // Chargement en cours (monProfil pas encore répondu)
  if (!ambassadeurId && !ambFromUrl) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#C9A84C]/20 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-widest">
              SIGMA <span className="text-[#C9A84C]">FACTORY</span>
            </h1>
            <p className="text-xs text-gray-500 tracking-widest mt-0.5">SOUMETTRE UN BIEN</p>
          </div>
          <Badge className="bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 text-xs">
            Ambassadeur #{ambassadeurId}
          </Badge>
        </div>
        {/* Onglets */}
        <div className="max-w-3xl mx-auto px-6 flex gap-0 border-t border-[#222] mt-2">
          {[
            { key: "bien", label: "Soumettre un bien", icon: <Home className="w-3.5 h-3.5" /> },
            { key: "commissions", label: "Mes commissions", icon: <Euro className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                mainTab === tab.key ? "border-[#C9A84C] text-[#C9A84C]" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Progress */}
      {mainTab === "bien" && step !== "confirmation" && (
        <div className="max-w-3xl mx-auto px-6 pt-6">
          <div className="flex items-center gap-2">
            {["Localisation", "Caractéristiques", "Prix & DPE", "Photos & Docs", "Validation"].map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 ${i <= stepIndex ? "bg-[#C9A84C] text-black" : "bg-[#222] text-gray-500"}`}>
                  {i < stepIndex ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${i <= stepIndex ? "text-[#C9A84C]" : "text-gray-600"} hidden sm:block`}>{label}</span>
                {i < 4 && <div className={`flex-1 h-px ${i < stepIndex ? "bg-[#C9A84C]" : "bg-[#222]"}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Onglet Mes commissions ── */}
        {mainTab === "commissions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Mes commissions immobilières</h3>
              <button onClick={() => setShowDeclImmo(v => !v)} className="flex items-center gap-1.5 bg-[#C9A84C] text-black text-sm font-bold px-4 py-2 hover:bg-[#b8943d]">
                <Plus className="w-4 h-4" /> Déclarer une transaction
              </button>
            </div>
            {showDeclImmo && (
              <div className="bg-[#111] border border-[#C9A84C]/30 p-4 space-y-3">
                <h4 className="text-[#C9A84C] font-semibold text-sm">Nouvelle transaction</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-gray-400 text-xs block mb-1">Adresse du bien</label>
                    <input value={immoForm.adresseBien} onChange={e => setImmoForm(f => ({ ...f, adresseBien: e.target.value }))} placeholder="Ex: 12 rue de la Paix, 75001 Paris" className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Type de transaction</label>
                    <select value={immoForm.typeTransaction} onChange={e => setImmoForm(f => ({ ...f, typeTransaction: e.target.value as any }))} className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2">
                      <option value="vente">Vente</option>
                      <option value="location">Location</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Honoraires totaux (€ HT)</label>
                    <input type="number" value={immoForm.montantHonoraires} onChange={e => setImmoForm(f => ({ ...f, montantHonoraires: e.target.value }))} placeholder="Ex: 8000" className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2" />
                  </div>
                </div>
                {montantHon > 0 && (
                  <div className="bg-[#0d0d0d] border border-[#222] p-3 text-xs space-y-1">
                    <p className="text-gray-400 font-semibold mb-2">Répartition estimée :</p>
                    <div className="flex justify-between"><span className="text-gray-400">Votre part (50%)</span><span className="text-[#C9A84C] font-bold">{prevAgent.toLocaleString("fr-FR")} €</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Part Sigma (50%)</span><span className="text-gray-300">{prevSigma.toLocaleString("fr-FR")} €</span></div>
                    {prevParrainN1 > 0 && <div className="flex justify-between text-gray-500"><span>↳ Rétro parrain N1 (10%)</span><span>{prevParrainN1.toLocaleString("fr-FR")} €</span></div>}
                    {prevParrainN2 > 0 && <div className="flex justify-between text-gray-500"><span>↳ Rétro parrain N2 (5%)</span><span>{prevParrainN2.toLocaleString("fr-FR")} €</span></div>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDeclImmo(false)} className="border-[#333] text-gray-400 hover:bg-[#111]">Annuler</Button>
                  <Button onClick={() => creerTransImmoMut.mutate({ agentId: ambassadeurId, adresseBien: immoForm.adresseBien, typeTransaction: immoForm.typeTransaction, montantHonoraires: montantHon })} disabled={creerTransImmoMut.isPending || !immoForm.adresseBien || !montantHon} className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold">
                    {creerTransImmoMut.isPending ? "Envoi…" : "Déclarer"}
                  </Button>
                </div>
              </div>
            )}
            {mesTransactions.length === 0 ? (
              <div className="bg-[#111] border border-[#222] p-8 text-center">
                <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucune transaction déclarée pour l'instant.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mesTransactions.map((t: any) => (
                  <div key={t.id} className="bg-[#111] border border-[#222] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold">{t.adresseBien || "Bien sans adresse"}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{t.typeTransaction === "vente" ? "Vente" : "Location"} — {new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#C9A84C] font-bold">{(t.partAgent ?? 0).toLocaleString("fr-FR")} €</p>
                      <p className="text-gray-500 text-xs">Votre part</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mainTab === "bien" && (
          <>
            {/* ÉTAPE 1 — LOCALISATION */}
            {step === "localisation" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Localisation du bien</h2>
                  <p className="text-gray-400 text-sm mt-1">Informations d'identification et d'adresse</p>
                </div>

                <div className="bg-[#111] border border-[#222] p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Titre de l'annonce *</Label>
                    <Input value={form.titre} onChange={e => set("titre", e.target.value)} placeholder="Ex: Appartement 3 pièces lumineux centre-ville" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    {errors.titre && <p className="text-red-400 text-xs">{errors.titre}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Type de bien</Label>
                      <Select value={form.typeBien} onValueChange={v => set("typeBien", v)}>
                        <SelectTrigger className="bg-[#0d0d0d] border-[#333] text-white focus:border-[#C9A84C]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#333]">
                          {["appartement", "maison", "villa", "terrain", "local_commercial", "autre"].map(v => (
                            <SelectItem key={v} value={v} className="text-white hover:bg-[#222] capitalize">{v.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Transaction</Label>
                      <Select value={form.transaction} onValueChange={v => set("transaction", v)}>
                        <SelectTrigger className="bg-[#0d0d0d] border-[#333] text-white focus:border-[#C9A84C]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#333]">
                          <SelectItem value="vente" className="text-white hover:bg-[#222]">Vente</SelectItem>
                          <SelectItem value="location" className="text-white hover:bg-[#222]">Location</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Adresse *</Label>
                    <Input value={form.adresse} onChange={e => set("adresse", e.target.value)} placeholder="Numéro et nom de rue" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    {errors.adresse && <p className="text-red-400 text-xs">{errors.adresse}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Code postal *</Label>
                      <Input value={form.codePostal} onChange={e => set("codePostal", e.target.value)} placeholder="75001" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                      {errors.codePostal && <p className="text-red-400 text-xs">{errors.codePostal}</p>}
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-gray-300 text-sm">Ville *</Label>
                      <Input value={form.ville} onChange={e => set("ville", e.target.value)} placeholder="Paris" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                      {errors.ville && <p className="text-red-400 text-xs">{errors.ville}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Département</Label>
                      <Input value={form.departement} onChange={e => set("departement", e.target.value)} placeholder="Île-de-France" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Usage</Label>
                      <Select value={form.usage} onValueChange={v => set("usage", v)}>
                        <SelectTrigger className="bg-[#0d0d0d] border-[#333] text-white focus:border-[#C9A84C]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#333]">
                          <SelectItem value="residence_principale" className="text-white hover:bg-[#222]">Résidence principale</SelectItem>
                          <SelectItem value="residence_secondaire" className="text-white hover:bg-[#222]">Résidence secondaire</SelectItem>
                          <SelectItem value="investissement_locatif" className="text-white hover:bg-[#222]">Investissement locatif</SelectItem>
                          <SelectItem value="professionnel" className="text-white hover:bg-[#222]">Professionnel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button onClick={() => { if (validateStep("localisation")) setStep("caracteristiques"); }} className="w-full bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold h-12">
                  Continuer <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {/* ÉTAPE 2 — CARACTÉRISTIQUES */}
            {step === "caracteristiques" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Caractéristiques</h2>
                  <p className="text-gray-400 text-sm mt-1">Dimensions, état et équipements</p>
                </div>

                <div className="bg-[#111] border border-[#222] p-6 space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Surface (m²) *</Label>
                      <Input type="number" value={form.surface} onChange={e => set("surface", e.target.value)} placeholder="75" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                      {errors.surface && <p className="text-red-400 text-xs">{errors.surface}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Surface terrain (m²)</Label>
                      <Input type="number" value={form.surfaceTerrain} onChange={e => set("surfaceTerrain", e.target.value)} placeholder="0" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Nb pièces</Label>
                      <Input type="number" value={form.nbPieces} onChange={e => set("nbPieces", e.target.value)} placeholder="3" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Chambres</Label>
                      <Input type="number" value={form.nbChambres} onChange={e => set("nbChambres", e.target.value)} placeholder="2" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Salle(s) de bain</Label>
                      <Input type="number" value={form.nbSallesBain} onChange={e => set("nbSallesBain", e.target.value)} placeholder="1" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Année construction</Label>
                      <Input type="number" value={form.anneeConstruction} onChange={e => set("anneeConstruction", e.target.value)} placeholder="1990" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">État du bien</Label>
                      <Select value={form.etatBien} onValueChange={v => set("etatBien", v)}>
                        <SelectTrigger className="bg-[#0d0d0d] border-[#333] text-white focus:border-[#C9A84C]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#333]">
                          <SelectItem value="neuf" className="text-white hover:bg-[#222]">Neuf</SelectItem>
                          <SelectItem value="bon_etat" className="text-white hover:bg-[#222]">Bon état</SelectItem>
                          <SelectItem value="a_rafraichir" className="text-white hover:bg-[#222]">À rafraîchir</SelectItem>
                          <SelectItem value="a_renover" className="text-white hover:bg-[#222]">À rénover</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Travaux estimés (€)</Label>
                      <Input type="number" value={form.travauxEstimes} onChange={e => set("travauxEstimes", e.target.value)} placeholder="0" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                  </div>

                  {/* Équipements */}
                  <div className="border-t border-[#222] pt-4">
                    <p className="text-gray-300 text-sm font-semibold mb-3">Équipements</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "balcon", label: "Balcon" }, { key: "terrasse", label: "Terrasse" },
                        { key: "jardin", label: "Jardin" }, { key: "parking", label: "Parking" },
                        { key: "garage", label: "Garage" }, { key: "cave", label: "Cave" },
                        { key: "ascenseur", label: "Ascenseur" }, { key: "gardien", label: "Gardien" },
                        { key: "piscine", label: "Piscine" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={key}
                            checked={(form as any)[key]}
                            onCheckedChange={v => set(key, !!v)}
                            className="border-[#444] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C]"
                          />
                          <label htmlFor={key} className="text-gray-300 text-sm cursor-pointer">{label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Description</Label>
                    <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Décrivez le bien, ses atouts, son environnement..." rows={4} className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C] resize-none" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("localisation")} className="border-[#333] text-gray-400 hover:bg-[#111]">
                    <ChevronLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button onClick={() => { if (validateStep("caracteristiques")) setStep("prix"); }} className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold h-12">
                    Continuer <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 — PRIX & DPE */}
            {step === "prix" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Prix & Diagnostic énergétique</h2>
                  <p className="text-gray-400 text-sm mt-1">Informations financières et DPE</p>
                </div>

                <div className="bg-[#111] border border-[#222] p-6 space-y-5">
                  {/* Détail du prix */}
                  <div>
                    <p className="text-[#C9A84C] text-xs font-bold tracking-widest uppercase mb-3">Détail du prix</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Prix net vendeur (€) *</Label>
                        <Input type="number" value={form.prixNetVendeur} onChange={e => {
                          const nv = parseInt(e.target.value) || 0;
                          const ha = parseInt(form.honorairesAgence) || 0;
                          set("prixNetVendeur", e.target.value);
                          set("prix", String(nv + ha));
                        }} placeholder="330000" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C] text-lg font-bold" />
                        {errors.prixNetVendeur && <p className="text-red-400 text-xs">{errors.prixNetVendeur}</p>}
                        <p className="text-gray-500 text-xs">Sans frais d'agence</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Honoraires d'agence (€)</Label>
                        <Input type="number" value={form.honorairesAgence} onChange={e => {
                          const ha = parseInt(e.target.value) || 0;
                          const nv = parseInt(form.prixNetVendeur) || 0;
                          set("honorairesAgence", e.target.value);
                          set("prix", String(nv + ha));
                        }} placeholder="20000" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                        <p className="text-gray-500 text-xs">Frais à la charge de l'acquéreur</p>
                      </div>
                    </div>
                    {(form.prixNetVendeur || form.honorairesAgence) && (
                      <div className="mt-3 bg-[#C9A84C]/10 border border-[#C9A84C]/30 p-3 flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Prix FAI total (calculé automatiquement)</span>
                        <span className="text-[#C9A84C] font-black text-lg">
                          {((parseInt(form.prixNetVendeur) || 0) + (parseInt(form.honorairesAgence) || 0)).toLocaleString("fr-FR")} €
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Charges annuelles (€)</Label>
                      <Input type="number" value={form.chargesAnnuelles} onChange={e => set("chargesAnnuelles", e.target.value)} placeholder="2400" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Taxe foncière (€/an)</Label>
                      <Input type="number" value={form.taxeFonciere} onChange={e => set("taxeFonciere", e.target.value)} placeholder="1200" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                    </div>
                    <div className="flex items-end pb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id="negociable" checked={form.prixNegociable} onCheckedChange={v => set("prixNegociable", !!v)} className="border-[#444] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C]" />
                        <label htmlFor="negociable" className="text-gray-300 text-sm cursor-pointer">Prix négociable</label>
                      </div>
                    </div>
                  </div>

                  {/* DPE */}
                  <div className="border-t border-[#222] pt-4">
                    <p className="text-gray-300 text-sm font-semibold mb-3">Diagnostic de Performance Énergétique (DPE)</p>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-gray-300 text-sm">Classe DPE</Label>
                        <div className="flex gap-2 flex-wrap">
                          {["A", "B", "C", "D", "E", "F", "G", "NC"].map(l => (
                            <button key={l} type="button" onClick={() => set("dpeLettre", l)}
                              className={`w-9 h-9 font-black text-sm transition-all ${form.dpeLettre === l ? `${DPE_COLORS[l]} text-white ring-2 ring-white` : "bg-[#222] text-gray-400 hover:bg-[#333]"}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                        <Input type="number" value={form.dpeValeur} onChange={e => set("dpeValeur", e.target.value)} placeholder="kWh/m²/an" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-gray-300 text-sm">Classe GES</Label>
                        <div className="flex gap-2 flex-wrap">
                          {["A", "B", "C", "D", "E", "F", "G", "NC"].map(l => (
                            <button key={l} type="button" onClick={() => set("gesLettre", l)}
                              className={`w-9 h-9 font-black text-sm transition-all ${form.gesLettre === l ? `${DPE_COLORS[l]} text-white ring-2 ring-white` : "bg-[#222] text-gray-400 hover:bg-[#333]"}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                        <Input type="number" value={form.gesValeur} onChange={e => set("gesValeur", e.target.value)} placeholder="kg CO₂/m²/an" className="bg-[#0d0d0d] border-[#333] text-white placeholder:text-gray-600 focus:border-[#C9A84C]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("caracteristiques")} className="border-[#333] text-gray-400 hover:bg-[#111]">
                    <ChevronLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button onClick={() => { if (validateStep("prix")) setStep("medias"); }} className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold h-12">
                    Continuer <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 — PHOTOS & DOCUMENTS */}
            {step === "medias" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Photos & Documents</h2>
                  <p className="text-gray-400 text-sm mt-1">Ajoutez des photos et documents du bien (optionnel, vous pourrez en ajouter après la soumission)</p>
                </div>

                {/* Zone de dépôt */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-none p-8 text-center cursor-pointer transition-colors ${
                    isDragging ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#333] hover:border-[#C9A84C]/50 bg-[#111]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                  />
                  <Camera className="w-10 h-10 text-[#C9A84C]/50 mx-auto mb-3" />
                  <p className="text-white font-semibold text-sm">Glissez vos fichiers ici ou cliquez pour sélectionner</p>
                  <p className="text-gray-500 text-xs mt-1">Photos (JPG, PNG, WebP), PDF, documents Word — max 10 Mo par fichier</p>
                </div>

                {/* Liste des fichiers */}
                {medias.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">{medias.length} fichier{medias.length > 1 ? "s" : ""} sélectionné{medias.length > 1 ? "s" : ""}</p>
                    {medias.map(media => (
                      <div key={media.id} className="bg-[#111] border border-[#222] p-3 flex items-center gap-3">
                        {/* Miniature ou icône */}
                        {media.preview ? (
                          <img src={media.preview} alt="" className="w-14 h-14 object-cover shrink-0 border border-[#333]" />
                        ) : (
                          <div className="w-14 h-14 bg-[#1a1a1a] border border-[#333] flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-gray-500" />
                          </div>
                        )}

                        {/* Infos + catégorie */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{media.file.name}</p>
                          <p className="text-gray-500 text-xs">{(media.file.size / 1024).toFixed(0)} Ko</p>
                          <select
                            value={media.categorie}
                            onChange={e => setCategorieMedia(media.id, e.target.value as MediaCategorie)}
                            className="mt-1.5 bg-[#0d0d0d] border border-[#333] text-gray-300 text-xs px-2 py-1 w-full"
                          >
                            {(Object.entries(CATEGORIE_LABELS) as [MediaCategorie, string][]).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Statut + suppression */}
                        <div className="flex items-center gap-2 shrink-0">
                          {media.status === "done" && <CheckCircle className="w-4 h-4 text-green-400" />}
                          {media.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                          {media.status === "uploading" && (
                            <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                          )}
                          <button onClick={() => removeMedia(media.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-[#111] border border-[#C9A84C]/20 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                  <p className="text-gray-400 text-sm">
                    Les photos et documents seront uploadés lors de la soumission finale. Vous pouvez passer cette étape et ajouter des médias plus tard.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("prix")} className="border-[#333] text-gray-400 hover:bg-[#111]">
                    <ChevronLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button onClick={() => setStep("recap")} className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold h-12">
                    Récapitulatif <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ÉTAPE 5 — RÉCAPITULATIF & ENVOI */}
            {step === "recap" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Récapitulatif</h2>
                  <p className="text-gray-400 text-sm mt-1">Vérifiez les informations avant de soumettre</p>
                </div>

                <div className="bg-[#111] border border-[#C9A84C]/20 p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Bien</p>
                      <p className="text-white font-bold">{form.titre}</p>
                      <p className="text-gray-300">{form.typeBien} — {form.transaction}</p>
                      <p className="text-gray-300">{form.adresse}, {form.codePostal} {form.ville}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Caractéristiques</p>
                      <p className="text-white font-bold">{form.surface} m²</p>
                      {form.nbPieces && <p className="text-gray-300">{form.nbPieces} pièces</p>}
                      <p className="text-gray-300">{form.etatBien.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Prix</p>
                      <p className="text-[#C9A84C] font-black text-xl">{parseInt(form.prix || "0").toLocaleString("fr-FR")} €</p>
                      {form.prixNegociable && <p className="text-gray-400 text-xs">Prix négociable</p>}
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">DPE</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 flex items-center justify-center font-black text-white text-sm ${DPE_COLORS[form.dpeLettre]}`}>{form.dpeLettre}</span>
                        <span className="text-gray-300 text-sm">/ GES {form.gesLettre}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#222] pt-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Équipements</p>
                    <div className="flex flex-wrap gap-2">
                      {["balcon", "terrasse", "jardin", "parking", "garage", "cave", "ascenseur", "gardien", "piscine"]
                        .filter(k => (form as any)[k])
                        .map(k => (
                          <Badge key={k} className="bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30 text-xs capitalize">{k}</Badge>
                        ))}
                    </div>
                  </div>

                  {medias.length > 0 && (
                    <div className="border-t border-[#222] pt-4">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Médias ({medias.length} fichier{medias.length > 1 ? "s" : ""})</p>
                      <div className="flex flex-wrap gap-2">
                        {medias.map(m => (
                          <div key={m.id} className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333] px-2 py-1">
                            {m.preview ? <Image className="w-3 h-3 text-[#C9A84C]" /> : <FileText className="w-3 h-3 text-[#C9A84C]" />}
                            <span className="text-gray-300 text-xs truncate max-w-[120px]">{m.file.name}</span>
                            <span className="text-gray-600 text-xs">({CATEGORIE_LABELS[m.categorie].split(" ")[0]})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#111] border border-[#222] p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                  <p className="text-gray-400 text-sm">
                    Votre bien sera soumis à validation par l'équipe Sigma Factory avant publication. Vous serez contacté(e) sous 48h.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("medias")} className="border-[#333] text-gray-400 hover:bg-[#111]">
                    <ChevronLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={creerBien.isPending || uploadingAll}
                    className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold h-12"
                  >
                    {creerBien.isPending || uploadingAll
                      ? (uploadingAll ? `Upload en cours… (${medias.filter(m => m.status === "done").length}/${medias.length})` : "Envoi en cours…")
                      : "Soumettre le bien à Sigma Factory"
                    }
                  </Button>
                </div>

                {creerBien.isError && (
                  <p className="text-red-400 text-sm text-center">{creerBien.error.message}</p>
                )}
              </div>
            )}

            {/* CONFIRMATION */}
            {step === "confirmation" && (
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-[#C9A84C]" />
                  </div>
                  <h2 className="text-3xl font-black text-white">Bien soumis avec succès !</h2>
                  <p className="text-gray-400">L'équipe Sigma Factory va examiner votre bien et vous recontacter sous 48h.</p>
                  {reference && (
                    <div className="bg-[#111] border border-[#C9A84C]/30 p-4 inline-block">
                      <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-wider">Référence</p>
                      <p className="text-white font-mono text-lg font-bold mt-1">{reference}</p>
                    </div>
                  )}
                  {medias.length > 0 && (
                    <div className="text-sm text-gray-400">
                      {medias.filter(m => m.status === "done").length}/{medias.length} fichier{medias.length > 1 ? "s" : ""} uploadé{medias.length > 1 ? "s" : ""}
                      {medias.some(m => m.status === "error") && (
                        <span className="text-red-400 ml-2">— certains fichiers ont échoué</span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setStep("localisation");
                    setForm(f => ({ ...f, titre: "", adresse: "", description: "", pointsForts: "", prix: "" }));
                    setMedias([]);
                    setBienId(null);
                    setReference(null);
                  }}
                  className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold"
                >
                  <Home className="mr-2 w-4 h-4" /> Soumettre un autre bien
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

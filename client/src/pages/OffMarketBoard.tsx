import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminNav from "@/components/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, MapPin, ChevronLeft, ChevronRight, X, Gem, Building, Send, Users, Plus, Upload, Loader2, Trash2, Navigation, Clock, ExternalLink, CheckCircle, Eye } from "lucide-react";
import { useSearch, useLocation } from "wouter";

type Statut = "disponible" | "sous_compromis" | "vendu" | "archive";

const STATUT_LABELS: Record<Statut, string> = {
  disponible: "Disponible",
  sous_compromis: "Sous compromis",
  vendu: "Vendu",
  archive: "Archivé",
};

const STATUT_COLORS: Record<Statut, string> = {
  disponible: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  sous_compromis: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  vendu: "bg-red-500/20 text-red-400 border-red-500/30",
  archive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const REGIONS = [
  "Grand Est", "Hauts-de-France", "Île-de-France", "Auvergne-Rhône-Alpes",
  "PACA", "Occitanie", "Nouvelle-Aquitaine", "Bretagne", "Normandie",
  "Pays de la Loire", "Bourgogne-Franche-Comté", "Centre-Val de Loire",
  "Corse", "Guadeloupe", "Martinique", "Guyane", "La Réunion",
];

const TYPE_BIENS = [
  "Immeuble De Rapport", "Appartement", "Maison", "Studio",
  "Bien Résidentiel", "Bien De Prestige", "Local Commercial",
  "Terrain", "Parking", "Autre",
];

function formatPrice(n: number | null | undefined) {
  if (!n) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: string | number | null | undefined) {
  if (!n) return "—";
  return `${Number(n).toFixed(2)} %`;
}

function isNew(createdAt: number): boolean {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return createdAt > sevenDaysAgo;
}

type Bien = {
  id: number;
  titre: string;
  typeBien: string | null;
  region: string | null;
  departement: string | null;
  prixBien: number | null;
  honoraires: number | null;
  travauxEstimation: number | null;
  investissementTotal: number | null;
  nbLots: number | null;
  lots: string | null;
  surfaceTotale: string | null;
  rentabiliteBrute: string | null;
  rentabilitePotentielleLd: string | null;
  rentabilitePotentielleCd: string | null;
  revenusAnnuels: number | null;
  revenusPotenlielsLd: number | null;
  revenusPotentielsCd: number | null;
  situation: string | null;
  images: string | null;
  imagePrincipale: string | null;
  statut: string | null;
  source: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: number;
  updatedAt: number;
};

function parseImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : (raw.startsWith('http') ? [raw] : []);
    } catch {
      return raw.startsWith('http') ? [raw] : [];
    }
  }
  return [];
}

function BienCard({ bien, onClick }: { bien: Bien; onClick: () => void }) {
  const images = parseImages(bien.images);
  const mainImg = bien.imagePrincipale || images[0] || null;
  const statut = (bien.statut ?? "disponible") as Statut;
  const nouveau = isNew(bien.createdAt);

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
      onClick={onClick}
    >
      <div className="relative h-48 bg-zinc-800 overflow-hidden">
        {mainImg ? (
          <img src={mainImg} alt={bien.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building className="h-12 w-12 text-zinc-600" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${STATUT_COLORS[statut]}`}>
            {STATUT_LABELS[statut]}
          </span>
          {nouveau && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-500 text-black border border-amber-400">
              Nouveau
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {images.length} photos
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{bien.titre}</h3>
        </div>
        <div className="flex items-center gap-1 text-zinc-400 text-xs mb-3">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{bien.region || bien.departement || "—"}</span>
          {bien.typeBien && (
            <>
              <span className="mx-1">·</span>
              <span>{bien.typeBien}</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Prix bien</div>
            <div className="text-white font-medium">{formatPrice(bien.prixBien)}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Invest. total</div>
            <div className="text-white font-medium">{formatPrice(bien.investissementTotal)}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
            <div className="text-amber-400/70 mb-0.5">Rentabilité brute</div>
            <div className="text-amber-400 font-semibold">{formatPct(bien.rentabiliteBrute)}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Lots</div>
            <div className="text-white font-medium">{bien.nbLots ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  if (!images.length) return null;
  return (
    <div className="relative rounded-xl overflow-hidden bg-zinc-800">
      <img src={images[current]} alt={`${title} - photo ${current + 1}`} className="w-full h-72 object-cover" />
      {images.length > 1 && (
        <>
          <button className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors" onClick={() => setCurrent(i => (i - 1 + images.length) % images.length)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors" onClick={() => setCurrent(i => (i + 1) % images.length)}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} onClick={() => setCurrent(i)} />
            ))}
          </div>
          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {current + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

function ProposerLeadModal({ bien, onClose }: { bien: Bien; onClose: () => void }) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"preview" | "confirm" | "done">("preview");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: leadsData } = trpc.crm.list.useQuery({ limit: 200 });
  const leads = leadsData?.items ?? [];

  // Vérifier si ce bien a déjà été proposé au lead sélectionné (alerte doublon)
  const { data: doublonCheck } = trpc.calendar.checkDoublon.useQuery(
    { bienId: bien.id, crmLeadId: Number(selectedLeadId) },
    { enabled: !!selectedLeadId && step === "confirm" }
  );

  // Générer le PDF dès l'ouverture de la modal
  const previewPdfMutation = trpc.offMarket.previewPdf.useMutation({
    onSuccess: (data) => {
      setPdfUrl(data.url);
      setStep("confirm");
    },
    onError: (err) => {
      toast.error("Erreur génération PDF : " + err.message);
      // Passer quand même à l'étape confirm sans PDF
      setStep("confirm");
    },
  });

  // Lancer la génération PDF au montage
  useState(() => {
    previewPdfMutation.mutate({ offMarketId: bien.id });
  });

  const proposerMutation = trpc.offMarket.proposerAuLead.useMutation({
    onSuccess: (data) => {
      setStep("done");
      toast.success(`Fiche envoyée à ${data.leadEmail}${data.pdfUrl ? " avec PDF" : ""}`);
    },
    onError: (err) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const handleSend = async () => {
    if (!selectedLeadId) { toast.error("Sélectionnez un lead"); return; }
    proposerMutation.mutate({
      offMarketId: bien.id,
      crmLeadId: Number(selectedLeadId),
      messagePersonnalise: message || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Send className="h-4 w-4 text-amber-400" />
            {step === "done" ? "✅ Fiche envoyée" : "Proposer à un lead"}
          </DialogTitle>
        </DialogHeader>

        {/* Étape 1 : Génération PDF */}
        {step === "preview" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">Génération du PDF en cours...</p>
          </div>
        )}

        {/* Étape 2 : Confirmation + envoi */}
        {step === "confirm" && (
        <div className="space-y-4 pt-2">
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-1">Bien sélectionné</div>
            <div className="text-sm font-medium text-white">{bien.titre}</div>
            <div className="text-xs text-amber-400 mt-1">{formatPrice(bien.prixBien)}</div>
          </div>

          {/* Aperçu + téléchargement PDF */}
          <div className="bg-zinc-800/50 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-400/80 text-xs uppercase tracking-wider mb-2">Fiche PDF générée</p>
            {pdfUrl ? (
              <div className="flex items-center gap-3">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 text-xs hover:bg-amber-500/20 transition-colors rounded"
                >
                  📄 Ouvrir / Vérifier le PDF
                </a>
                <a
                  href={pdfUrl}
                  download={`fiche-off-market-${bien.id}.pdf`}
                  className="inline-flex items-center gap-2 bg-zinc-700 text-zinc-300 border border-zinc-600 px-3 py-1.5 text-xs hover:bg-zinc-600 transition-colors rounded"
                >
                  ⬇️ Télécharger
                </a>
              </div>
            ) : (
              <p className="text-zinc-500 text-xs">PDF non disponible — la fiche sera envoyée sans pièce jointe.</p>
            )}
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Lead destinataire *</label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Choisir un lead..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                {leads.map((lead: any) => (
                  <SelectItem key={lead.id} value={String(lead.id)} className="text-white">
                    <span className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-zinc-400" />
                      {lead.prenom} {lead.nom} — {lead.email}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Alerte doublon */}
            {doublonCheck?.alreadySent && (
              <div className="mt-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="text-orange-400 text-sm mt-0.5">⚠️</span>
                <div>
                  <p className="text-orange-400 text-xs font-semibold">Ce bien a déjà été envoyé à ce lead</p>
                  {doublonCheck.sentAt && (
                    <p className="text-orange-300/70 text-xs">
                      Envoyé le {new Date(doublonCheck.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  )}
                  <p className="text-orange-300/60 text-xs mt-0.5">Vous pouvez quand même renvoyer si nécessaire.</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Message personnalisé (optionnel)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Suite à notre échange, voici une opportunité off market qui correspond à vos critères..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-amber-500/50"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedLeadId || proposerMutation.isPending}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {proposerMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Envoi...</span>
              ) : "✉️ Envoyer la fiche"}
            </Button>
          </div>
        </div>
        )}

        {/* Étape 3 : Confirmation d'envoi */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="text-white font-semibold">Fiche envoyée avec succès !</p>
              <p className="text-zinc-400 text-sm mt-1">Le PDF a été joint à l'email du lead.</p>
            </div>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={`fiche-off-market-${bien.id}.pdf`}
                className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-4 py-2 text-sm hover:bg-amber-500/20 transition-colors rounded"
              >
                ⬇️ Télécharger le PDF
              </a>
            )}
            <Button onClick={onClose} className="bg-zinc-700 hover:bg-zinc-600 text-white">
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Formulaire d'ajout de bien Off Market ──
function NouveauBienModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    titre: "",
    typeBien: "",
    region: "",
    departement: "",
    prixBien: "",
    honoraires: "",
    travauxEstimation: "",
    investissementTotal: "",
    nbLots: "",
    surfaceTotale: "",
    rentabiliteBrute: "",
    rentabilitePotentielleLd: "",
    rentabilitePotentielleCd: "",
    revenusAnnuels: "",
    revenusPotenlielsLd: "",
    revenusPotentielsCd: "",
    statut: "disponible" as Statut,
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = trpc.offMarket.uploadImage.useMutation();
  const createMutation = trpc.offMarket.create.useMutation({
    onSuccess: () => {
      toast.success("Bien Off Market ajouté avec succès");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(`Erreur : ${err.message}`);
      setIsSaving(false);
    },
  });

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadImageMutation.mutateAsync({
          filename: file.name,
          contentType: file.type,
          base64,
        });
        newUrls.push(result.url);
      } catch {
        toast.error(`Erreur lors de l'upload de ${file.name}`);
      }
    }
    setUploadedImages(prev => [...prev, ...newUrls]);
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.titre.trim()) { toast.error("Le titre est obligatoire"); return; }
    setIsSaving(true);
    const prix = form.prixBien ? parseInt(form.prixBien.replace(/\s/g, "")) : undefined;
    const honoraires = form.honoraires ? parseInt(form.honoraires.replace(/\s/g, "")) : undefined;
    const travaux = form.travauxEstimation ? parseInt(form.travauxEstimation.replace(/\s/g, "")) : undefined;
    // Calculer l'investissement total si non renseigné
    let invest = form.investissementTotal ? parseInt(form.investissementTotal.replace(/\s/g, "")) : undefined;
    if (!invest && prix) {
      const notaire = Math.round(prix * 0.08);
      invest = prix + (honoraires ?? 0) + (travaux ?? 0) + notaire;
    }
    createMutation.mutate({
      titre: form.titre.trim(),
      typeBien: form.typeBien || undefined,
      region: form.region || undefined,
      departement: form.departement || undefined,
      prixBien: prix,
      honoraires,
      travauxEstimation: travaux,
      investissementTotal: invest,
      nbLots: form.nbLots ? parseInt(form.nbLots) : undefined,
      surfaceTotale: form.surfaceTotale || undefined,
      rentabiliteBrute: form.rentabiliteBrute || undefined,
      rentabilitePotentielleLd: form.rentabilitePotentielleLd || undefined,
      rentabilitePotentielleCd: form.rentabilitePotentielleCd || undefined,
      revenusAnnuels: form.revenusAnnuels ? parseInt(form.revenusAnnuels.replace(/\s/g, "")) : undefined,
      revenusPotenlielsLd: form.revenusPotenlielsLd ? parseInt(form.revenusPotenlielsLd.replace(/\s/g, "")) : undefined,
      revenusPotentielsCd: form.revenusPotentielsCd ? parseInt(form.revenusPotentielsCd.replace(/\s/g, "")) : undefined,
      images: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : undefined,
      imagePrincipale: uploadedImages[0] || undefined,
      statut: form.statut,
    });
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50";
  const labelClass = "text-xs text-zinc-400 mb-1 block";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-400" />
            Nouveau bien Off Market
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Infos de base */}
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Informations générales</div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={labelClass}>Titre *</label>
                <input value={form.titre} onChange={f("titre")} placeholder="Ex: Immeuble De Rapport — 450 000 €" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Type de bien</label>
                  <select value={form.typeBien} onChange={f("typeBien")} className={inputClass}>
                    <option value="">Sélectionner...</option>
                    {TYPE_BIENS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Statut</label>
                  <select value={form.statut} onChange={f("statut")} className={inputClass}>
                    {(Object.keys(STATUT_LABELS) as Statut[]).map(s => (
                      <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Région</label>
                  <select value={form.region} onChange={f("region")} className={inputClass}>
                    <option value="">Sélectionner...</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Département / Ville</label>
                  <input value={form.departement} onChange={f("departement")} placeholder="Ex: Bas-Rhin (67)" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Surface totale (m²)</label>
                  <input value={form.surfaceTotale} onChange={f("surfaceTotale")} placeholder="Ex: 280" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nombre de lots</label>
                  <input type="number" value={form.nbLots} onChange={f("nbLots")} placeholder="Ex: 6" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Données financières */}
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Données financières</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prix du bien (€)</label>
                <input value={form.prixBien} onChange={f("prixBien")} placeholder="Ex: 450000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Honoraires (€)</label>
                <input value={form.honoraires} onChange={f("honoraires")} placeholder="Calculé auto si vide" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Travaux estimés (€)</label>
                <input value={form.travauxEstimation} onChange={f("travauxEstimation")} placeholder="Ex: 30000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Investissement total (€)</label>
                <input value={form.investissementTotal} onChange={f("investissementTotal")} placeholder="Calculé auto si vide" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Revenus annuels actuels (€)</label>
                <input value={form.revenusAnnuels} onChange={f("revenusAnnuels")} placeholder="Ex: 36000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Revenus potentiels LD (€)</label>
                <input value={form.revenusPotenlielsLd} onChange={f("revenusPotenlielsLd")} placeholder="Ex: 42000" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Rentabilités */}
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Rentabilités</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Brute actuelle (%)</label>
                <input value={form.rentabiliteBrute} onChange={f("rentabiliteBrute")} placeholder="Ex: 8.50" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Potentielle LD (%)</label>
                <input value={form.rentabilitePotentielleLd} onChange={f("rentabilitePotentielleLd")} placeholder="Ex: 10.20" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Potentielle CD (%)</label>
                <input value={form.rentabilitePotentielleCd} onChange={f("rentabilitePotentielleCd")} placeholder="Ex: 12.50" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Photos</div>
            <div
              className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Upload en cours...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Cliquez pour ajouter des photos</p>
                  <p className="text-xs text-zinc-600 mt-1">JPG, PNG, WebP — plusieurs fichiers acceptés</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleImageUpload(e.target.files)}
            />
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {uploadedImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-amber-500 text-black text-xs px-1.5 py-0.5 rounded font-bold">Principal</span>
                    )}
                    <button
                      className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setUploadedImages(prev => prev.filter((_, j) => j !== i)); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || isUploading}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {isSaving ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Enregistrement...</span>
              ) : "Ajouter le bien"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoriqueEnvois({ bienId }: { bienId: number }) {
  const { data: envois, isLoading } = trpc.offMarket.listEnvoisBien.useQuery({ offMarketBienId: bienId });

  if (isLoading) return (
    <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      Chargement de l'historique...
    </div>
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-400" />
        Historique des envois
        {envois && envois.length > 0 && (
          <span className="text-xs font-normal text-zinc-500 normal-case tracking-normal">
            — {envois.length} envoi{envois.length > 1 ? "s" : ""}
          </span>
        )}
      </h3>
      {!envois || envois.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg p-4 text-center text-sm text-zinc-500">
          Aucun envoi enregistré pour ce bien
        </div>
      ) : (
        <div className="space-y-2">
          {envois.map((envoi) => (
            <div key={envoi.id} className="bg-zinc-900 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {envoi.statut === "sent" ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-white truncate">
                    {envoi.leadPrenom} {envoi.leadNom}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${
                    envoi.statut === "sent"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-700 text-zinc-400 border-zinc-600"
                  }`}>
                    {envoi.statut === "sent" ? "Envoyé" : "Prévisualisé"}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-3">
                  <span>{envoi.emailDestinataire}</span>
                  <span>·</span>
                  <span>par {envoi.envoyePar?.split("@")[0]}</span>
                  <span>·</span>
                  <span>{new Date(envoi.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {envoi.messagePersonnalise && (
                  <p className="text-xs text-zinc-400 mt-1.5 italic line-clamp-2">"{envoi.messagePersonnalise}"</p>
                )}
              </div>
              {envoi.pdfUrl && (
                <a
                  href={envoi.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-amber-400 hover:text-amber-300 transition-colors"
                  title="Voir le PDF envoyé"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BienDetail({ bien, onClose, onRefresh }: { bien: Bien; onClose: () => void; onRefresh: () => void }) {
  const utils = trpc.useUtils();
  const [showProposer, setShowProposer] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: string; lng: string } | null>(
    bien.latitude && bien.longitude ? { lat: bien.latitude, lng: bien.longitude } : null
  );

  const updateStatut = trpc.offMarket.updateStatut.useMutation({
    onSuccess: () => {
      utils.offMarket.list.invalidate();
      toast.success("Statut mis à jour");
    },
  });

  const deleteMutation = trpc.offMarket.delete.useMutation({
    onSuccess: () => {
      utils.offMarket.list.invalidate();
      toast.success("Bien supprimé");
      onClose();
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const geocodeMutation = trpc.offMarket.geocodeByRegion.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setGeoCoords({ lat: data.latitude!, lng: data.longitude! });
        utils.offMarket.list.invalidate();
        utils.ambassadeurs.getCarteReseau.invalidate();
        toast.success("Coordonnées GPS mises à jour — le bien apparaît sur la carte du réseau");
      }
      setIsGeolocating(false);
    },
    onError: (err) => {
      toast.error(`Géolocalisation impossible : ${err.message}`);
      setIsGeolocating(false);
    },
  });

  const handleGeolocate = async () => {
    if (!bien.region && !bien.departement) {
      toast.error("Ce bien n'a pas de région ou département renseigné");
      return;
    }
    setIsGeolocating(true);
    geocodeMutation.mutate({ id: bien.id, region: bien.region ?? bien.departement!, departement: bien.departement ?? undefined });
  };

  const images = parseImages(bien.images);
  const lots: Array<{ type: string; surface?: string; loyer?: string; statut?: string }> = (() => { try { return bien.lots ? JSON.parse(bien.lots) : []; } catch { return []; } })();
  const situation: string[] = (() => { try { return bien.situation ? JSON.parse(bien.situation) : []; } catch { return []; } })();
  const statut = (bien.statut ?? "disponible") as Statut;
  const nouveau = isNew(bien.createdAt);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-end">
        <div className="w-full max-w-2xl h-full bg-zinc-950 border-l border-zinc-800 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Gem className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">Off Market</span>
                {nouveau && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">Nouveau</span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-white leading-tight">{bien.titre}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_COLORS[statut]}`}>
                  {STATUT_LABELS[statut]}
                </span>
                {bien.region && (
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{bien.region}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors shrink-0 mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Galerie photos */}
            {images.length > 0 && <ImageGallery images={images} title={bien.titre} />}

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={() => setShowProposer(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
              >
                <Send className="h-4 w-4" />
                Proposer à un lead
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400 shrink-0">Statut :</span>
                <Select value={statut} onValueChange={(v) => updateStatut.mutate({ id: bien.id, statut: v as Statut })}>
                  <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700 text-white h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {(Object.keys(STATUT_LABELS) as Statut[]).map(s => (
                      <SelectItem key={s} value={s} className="text-white">{STATUT_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeolocate}
                disabled={isGeolocating}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                title={geoCoords ? `GPS : ${geoCoords.lat}, ${geoCoords.lng}` : "Géolocaliser ce bien sur la carte du réseau"}
              >
                {isGeolocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                {geoCoords ? "Re-géolocaliser" : "Géolocaliser"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (confirm("Supprimer ce bien ?")) deleteMutation.mutate({ id: bien.id }); }}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            </div>

            {/* Financier */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Données financières</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Prix du bien", value: formatPrice(bien.prixBien) },
                  { label: "Honoraires", value: formatPrice(bien.honoraires) },
                  { label: "Travaux estimés", value: formatPrice(bien.travauxEstimation) },
                  { label: "Investissement total", value: formatPrice(bien.investissementTotal), highlight: true },
                  { label: "Revenus annuels actuels", value: formatPrice(bien.revenusAnnuels) },
                  { label: "Revenus potentiels LD", value: formatPrice(bien.revenusPotenlielsLd) },
                  { label: "Revenus potentiels CD", value: formatPrice(bien.revenusPotentielsCd) },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={`rounded-lg p-3 ${highlight ? "bg-amber-500/10 border border-amber-500/20 col-span-2" : "bg-zinc-900"}`}>
                    <div className={`text-xs mb-1 ${highlight ? "text-amber-400/70" : "text-zinc-500"}`}>{label}</div>
                    <div className={`font-semibold ${highlight ? "text-amber-400 text-base" : "text-white text-sm"}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rentabilités */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Rentabilités</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Brute actuelle", value: formatPct(bien.rentabiliteBrute) },
                  { label: "Potentielle LD", value: formatPct(bien.rentabilitePotentielleLd) },
                  { label: "Potentielle CD", value: formatPct(bien.rentabilitePotentielleCd) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-emerald-400/70 mb-1">{label}</div>
                    <div className="text-emerald-400 font-bold text-lg">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lots */}
            {lots.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                  Composition — {bien.nbLots} lot{(bien.nbLots ?? 0) > 1 ? "s" : ""}
                </h3>
                <div className="space-y-2">
                  {lots.map((lot, i) => (
                    <div key={i} className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-zinc-500 font-mono shrink-0">#{i + 1}</span>
                        <span className="text-sm text-white truncate">{lot.type}</span>
                        {lot.surface && <span className="text-xs text-zinc-400 shrink-0">{lot.surface}</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {lot.loyer && <span className="text-sm text-amber-400 font-medium">{lot.loyer}</span>}
                        {lot.statut && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${lot.statut.toLowerCase().includes("loué") || lot.statut.toLowerCase().includes("loue") ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-700 text-zinc-300 border-zinc-600"}`}>
                            {lot.statut}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Situation */}
            {situation.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Situation</h3>
                <ul className="space-y-1.5">
                  {situation.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Infos générales */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Informations générales</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Type de bien", value: bien.typeBien },
                  { label: "Région", value: bien.region },
                  { label: "Département", value: bien.departement },
                  { label: "Surface totale", value: bien.surfaceTotale ? `${bien.surfaceTotale} m²` : null },
                  { label: "Nombre de lots", value: bien.nbLots?.toString() },
                  { label: "Ajouté le", value: new Date(bien.createdAt).toLocaleDateString("fr-FR") },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} className="bg-zinc-900 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-1">{label}</div>
                    <div className="text-sm text-white font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historique des envois */}
            <HistoriqueEnvois bienId={bien.id} />
          </div>
        </div>
      </div>

      {showProposer && <ProposerLeadModal bien={bien} onClose={() => setShowProposer(false)} />}
    </>
  );
}

export default function OffMarketBoard() {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");
  const [region, setRegion] = useState("toutes");
  const [typeBienFilter, setTypeBienFilter] = useState("tous");
  const [selectedBien, setSelectedBien] = useState<Bien | null>(null);
  const [showNouveauBien, setShowNouveauBien] = useState(false);
  const utils = trpc.useUtils();

  // Support du paramètre ?id=X pour ouvrir directement une fiche depuis la carte
  const searchStr = useSearch();
  const [, navigate] = useLocation();
  const urlParams = searchStr ? new URLSearchParams(searchStr) : new URLSearchParams();
  const urlId = parseInt(urlParams.get("id") ?? "");
  const fromCarte = urlParams.get("from") === "carte" || (!isNaN(urlId) && urlParams.has("id"));

  const { data, isLoading } = trpc.offMarket.list.useQuery({
    search: search || undefined,
    statut: statut !== "tous" ? statut : undefined,
    region: region !== "toutes" ? region : undefined,
    typeBien: typeBienFilter !== "tous" ? typeBienFilter : undefined,
    limit: 100,
  });

  const biens: Bien[] = data?.items ?? [];
  const total = data?.total ?? 0;

  // Ouvrir automatiquement la fiche si ?id=X dans l'URL
  useEffect(() => {
    if (!isNaN(urlId) && biens.length > 0 && !selectedBien) {
      const found = biens.find(b => b.id === urlId);
      if (found) setSelectedBien(found);
    }
  }, [urlId, biens.length]);

  // Extraire les régions uniques
  const { data: allData } = trpc.offMarket.list.useQuery({ limit: 200 });
  const regions = Array.from(new Set((allData?.items ?? []).map((b: Bien) => b.region).filter(Boolean))) as string[];

  const disponibles = biens.filter(b => b.statut === "disponible" || !b.statut).length;
  const sousCompromis = biens.filter(b => b.statut === "sous_compromis").length;
  const vendus = biens.filter(b => b.statut === "vendu").length;
  const nouveaux = biens.filter(b => isNew(b.createdAt)).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <div className="max-w-[1800px] mx-auto px-4 pt-8 pb-16">
        {/* Bouton retour si on vient de la carte */}
        {fromCarte && (
          <div className="mb-4">
            <button
              onClick={() => navigate("/dashboard/reseau")}
              className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour à la carte du réseau
            </button>
          </div>
        )}
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Gem className="h-6 w-6 text-amber-400" />
              <h1 className="text-2xl font-bold text-white">Biens Off Market</h1>
              {nouveaux > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-500 text-black">
                  {nouveaux} nouveau{nouveaux > 1 ? "x" : ""}
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-sm">Pépites exclusives — accès confidentiel</p>
          </div>
          <Button
            onClick={() => setShowNouveauBien(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nouveau bien
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: total, color: "text-white" },
            { label: "Disponibles", value: disponibles, color: "text-emerald-400" },
            { label: "Sous compromis", value: sousCompromis, color: "text-amber-400" },
            { label: "Vendus", value: vendus, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un bien..."
              className="pl-9 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-9"
            />
          </div>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700 text-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="tous" className="text-white">Tous les statuts</SelectItem>
              {(Object.keys(STATUT_LABELS) as Statut[]).map(s => (
                <SelectItem key={s} value={s} className="text-white">{STATUT_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-52 bg-zinc-900 border-zinc-700 text-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="toutes" className="text-white">Toutes les régions</SelectItem>
              {regions.map(r => (
                <SelectItem key={r} value={r} className="text-white">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeBienFilter} onValueChange={setTypeBienFilter}>
            <SelectTrigger className="w-52 bg-zinc-900 border-zinc-700 text-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="tous" className="text-white">Tous les types</SelectItem>
              <SelectItem value="Immeuble De Rapport" className="text-white">Immeuble de rapport</SelectItem>
              <SelectItem value="Immobilier Commercial" className="text-white">Immobilier commercial</SelectItem>
              <SelectItem value="Residence Senior" className="text-white">Résidence senior</SelectItem>
              <SelectItem value="Ferme Vosgienne" className="text-white">Ferme vosgienne</SelectItem>
              <SelectItem value="Plateau A Amenager" className="text-white">Plateau à aménager</SelectItem>
              <SelectItem value="Studio" className="text-white">Studio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grille */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : biens.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Gem className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucun bien off market trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {biens.map(bien => (
              <BienCard key={bien.id} bien={bien} onClick={() => setSelectedBien(bien)} />
            ))}
          </div>
        )}

        {/* Panel détail */}
        {selectedBien && (
          <BienDetail
            bien={selectedBien}
            onClose={() => setSelectedBien(null)}
            onRefresh={() => utils.offMarket.list.invalidate()}
          />
        )}

        {/* Modal nouveau bien */}
        {showNouveauBien && (
          <NouveauBienModal
            onClose={() => setShowNouveauBien(false)}
            onSuccess={() => utils.offMarket.list.invalidate()}
          />
        )}
      </div>
    </div>
  );
}

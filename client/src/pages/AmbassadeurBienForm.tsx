import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle, Home, Euro, Camera, ChevronRight, ChevronLeft,
  AlertCircle, TrendingUp, Plus, X, FileText, Image, Trash2, Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
  display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center",
};
const btnSecondary: React.CSSProperties = {
  padding: "12px 20px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "2px",
  fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, color: colors.muted,
  textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all 300ms ease",
  display: "inline-flex", alignItems: "center", gap: "6px",
};
const errorText = (msg?: string) => msg ? <p style={{ fontSize: "12px", color: colors.destructive, fontFamily: fonts.body, marginTop: "4px" }}>{msg}</p> : null;

function SInput({ value, onChange, placeholder, type = "text", style: extra }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    className="w-full focus:outline-none [color-scheme:dark]" style={{ ...inputStyle, ...extra }}
    onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }} />;
}
function SSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={e => onChange(e.target.value)} className="w-full focus:outline-none" style={selectStyle}
    onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }}>{children}</select>;
}
function SectionDivider({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "28px 0 20px" }}>
    <div style={{ flex: 1, height: "1px", background: colors.border }} />
    <span style={{ fontFamily: fonts.body, fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color: colors.muted }}>{children}</span>
    <div style={{ flex: 1, height: "1px", background: colors.border }} />
  </div>;
}

// ─── Types medias ─────────────────────────────────────────────────────────────
type MediaCategorie = "photo" | "titre_propriete" | "taxe_fonciere" | "diagnostic" | "plan" | "autre";
interface MediaFile { id: string; file: File; preview?: string; categorie: MediaCategorie; status: "pending" | "uploading" | "done" | "error"; url?: string; }
const CATEGORIE_LABELS: Record<MediaCategorie, string> = {
  photo: "Photo du bien", titre_propriete: "Titre de propriete", taxe_fonciere: "Taxe fonciere",
  diagnostic: "Diagnostic (DPE/amiante...)", plan: "Plan du bien", autre: "Autre document",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AmbassadeurBienForm() {
  const params = new URLSearchParams(window.location.search);
  const ambFromUrl = parseInt(params.get("amb") ?? "0");
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

  const { data: mesTransactions = [], refetch: refetchTrans } = trpc.commissions.listTransactionsImmo.useQuery({ agentId: ambassadeurId }, { enabled: !!ambassadeurId });
  const creerTransImmoMut = trpc.commissions.creerTransactionImmo.useMutation({
    onSuccess: () => { toast.success("Transaction declaree"); setShowDeclImmo(false); setImmoForm({ adresseBien: "", typeTransaction: "vente", montantHonoraires: "" }); refetchTrans(); },
    onError: (e) => toast.error(e.message),
  });

  // ─── Etapes formulaire bien ───
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

  // ─── Medias ───
  const [medias, setMedias] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingAll, setUploadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBienMedia = trpc.ambassadeurs.uploadBienMedia.useMutation();

  const addFiles = useCallback((files: FileList | File[]) => {
    const newMedias: MediaFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).slice(2), file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      categorie: file.type.startsWith("image/") ? "photo" : "autre", status: "pending",
    }));
    setMedias(prev => [...prev, ...newMedias]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }, [addFiles]);
  const removeMedia = (id: string) => { setMedias(prev => { const m = prev.find(x => x.id === id); if (m?.preview) URL.revokeObjectURL(m.preview); return prev.filter(x => x.id !== id); }); };
  const setCategorieMedia = (id: string, categorie: MediaCategorie) => { setMedias(prev => prev.map(m => m.id === id ? { ...m, categorie } : m)); };

  const uploadAllMedias = async (currentBienId: number): Promise<boolean> => {
    const pending = medias.filter(m => m.status === "pending");
    if (pending.length === 0) return true;
    setUploadingAll(true); let allOk = true;
    for (const media of pending) {
      setMedias(prev => prev.map(m => m.id === media.id ? { ...m, status: "uploading" } : m));
      try {
        const base64 = await fileToBase64(media.file);
        const result = await uploadBienMedia.mutateAsync({ bienId: currentBienId, ambassadeurId, fileBase64: base64, fileName: media.file.name, mimeType: media.file.type || "application/octet-stream", categorie: media.categorie });
        setMedias(prev => prev.map(m => m.id === media.id ? { ...m, status: "done", url: result.url } : m));
      } catch { setMedias(prev => prev.map(m => m.id === media.id ? { ...m, status: "error" } : m)); allOk = false; }
    }
    setUploadingAll(false); return allOk;
  };

  const creerBien = trpc.ambassadeurs.creerBien.useMutation({
    onSuccess: async (data) => {
      setBienId(data.bienId); setReference(data.reference);
      if (medias.length > 0) { const ok = await uploadAllMedias(data.bienId); if (!ok) toast.warning("Certains fichiers n'ont pas pu etre uploades."); }
      setStep("confirmation");
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (key: string, value: string | boolean) => { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: "" })); };
  const validateStep = (s: string) => {
    const e: Record<string, string> = {};
    if (s === "localisation") { if (!form.titre) e.titre = "Requis"; if (!form.adresse) e.adresse = "Requis"; if (!form.codePostal) e.codePostal = "Requis"; if (!form.ville) e.ville = "Requis"; }
    if (s === "caracteristiques") { if (!form.surface) e.surface = "Requis"; }
    if (s === "prix") { if (!form.prixNetVendeur) e.prixNetVendeur = "Requis"; }
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    creerBien.mutate({
      ambassadeurId, titre: form.titre, typeBien: form.typeBien, transaction: form.transaction,
      usage: form.usage, adresse: form.adresse, codePostal: form.codePostal, ville: form.ville,
      departement: form.departement || undefined, region: form.region || undefined,
      surface: parseInt(form.surface), surfaceTerrain: form.surfaceTerrain ? parseInt(form.surfaceTerrain) : undefined,
      nbPieces: form.nbPieces ? parseInt(form.nbPieces) : undefined, nbChambres: form.nbChambres ? parseInt(form.nbChambres) : undefined,
      nbSallesBain: form.nbSallesBain ? parseInt(form.nbSallesBain) : undefined, nbEtages: form.nbEtages ? parseInt(form.nbEtages) : undefined,
      etage: form.etage ? parseInt(form.etage) : undefined, anneeConstruction: form.anneeConstruction ? parseInt(form.anneeConstruction) : undefined,
      etatBien: form.etatBien, travauxEstimes: form.travauxEstimes ? parseInt(form.travauxEstimes) : undefined,
      dpeLettre: form.dpeLettre, dpeValeur: form.dpeValeur ? parseInt(form.dpeValeur) : undefined,
      gesLettre: form.gesLettre, gesValeur: form.gesValeur ? parseInt(form.gesValeur) : undefined,
      balcon: form.balcon, terrasse: form.terrasse, jardin: form.jardin, parking: form.parking,
      garage: form.garage, cave: form.cave, ascenseur: form.ascenseur, gardien: form.gardien, piscine: form.piscine,
      prix: (parseInt(form.prixNetVendeur) || 0) + (parseInt(form.honorairesAgence) || 0) || parseInt(form.prix) || 0,
      prixNetVendeur: form.prixNetVendeur ? parseInt(form.prixNetVendeur) : undefined,
      honorairesAgence: form.honorairesAgence ? parseInt(form.honorairesAgence) : undefined,
      prixNegociable: form.prixNegociable, chargesAnnuelles: form.chargesAnnuelles ? parseInt(form.chargesAnnuelles) : undefined,
      taxeFonciere: form.taxeFonciere ? parseInt(form.taxeFonciere) : undefined,
      exposition: form.exposition || undefined, description: form.description || undefined, pointsForts: form.pointsForts || undefined,
    });
  };

  const steps = ["localisation", "caracteristiques", "prix", "medias", "recap"];
  const stepIndex = steps.indexOf(step);

  if (!ambassadeurId && !ambFromUrl) {
    return <div style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} strokeWidth={1.5} className="animate-spin" style={{ color: colors.gold }} />
    </div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: 700, letterSpacing: "0.15em", color: colors.gold, margin: 0 }}>SIGMA FACTORY</h1>
            <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, letterSpacing: "0.08em", textTransform: "uppercase", margin: "2px 0 0" }}>Soumettre un bien</p>
          </div>
          <span style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, letterSpacing: "0.06em", padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: "2px" }}>
            Ambassadeur #{ambassadeurId}
          </span>
        </div>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px", display: "flex", gap: 0, borderTop: `1px solid ${colors.border}` }}>
          {[{ key: "bien", label: "Soumettre un bien" }, { key: "commissions", label: "Mes commissions" }].map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key as any)}
              style={{ padding: "10px 16px", fontFamily: fonts.body, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase",
                borderBottom: `2px solid ${mainTab === tab.key ? colors.gold : "transparent"}`,
                color: mainTab === tab.key ? colors.gold : colors.faint, background: "none", border: "none",
                borderBottomStyle: "solid", cursor: "pointer", transition: "all 300ms ease", marginBottom: "-1px" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Stepper */}
      {mainTab === "bien" && step !== "confirmation" && (
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {["Localisation", "Caracteristiques", "Prix & DPE", "Photos & Docs", "Validation"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
                <div style={{
                  width: "24px", height: "24px", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
                  background: i <= stepIndex ? colors.gold : "transparent", border: `1px solid ${i <= stepIndex ? colors.gold : colors.border}`,
                  fontFamily: fonts.body, fontSize: "10px", fontWeight: 600, color: i <= stepIndex ? colors.bg : colors.faint, flexShrink: 0,
                }}>
                  {i < stepIndex ? <CheckCircle size={12} strokeWidth={1.5} /> : i + 1}
                </div>
                <span style={{ fontFamily: fonts.body, fontSize: "9px", color: i <= stepIndex ? colors.gold : colors.faint, textTransform: "uppercase", letterSpacing: "0.06em", display: "none" }} className="sm:inline">{label}</span>
                {i < 4 && <div style={{ flex: 1, height: "1px", background: i < stepIndex ? colors.goldMuted : colors.border }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Commissions */}
        {mainTab === "commissions" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 600, color: colors.fg, margin: 0 }}>Mes commissions immobilieres</h3>
              <button onClick={() => setShowDeclImmo(v => !v)} style={btnPrimary}><Plus size={14} strokeWidth={1.5} /> Declarer</button>
            </div>
            {showDeclImmo && (
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "24px", marginBottom: "20px" }}>
                <p style={{ ...labelStyle, marginBottom: "16px" }}>Nouvelle transaction</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Adresse du bien</label><input value={immoForm.adresseBien} onChange={e => setImmoForm(f => ({ ...f, adresseBien: e.target.value }))} placeholder="Ex: 12 rue de la Paix, 75001 Paris" className="w-full focus:outline-none" style={inputStyle} onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }} /></div>
                  <div><label style={labelStyle}>Type de transaction</label><select value={immoForm.typeTransaction} onChange={e => setImmoForm(f => ({ ...f, typeTransaction: e.target.value as any }))} className="w-full focus:outline-none" style={selectStyle}><option value="vente">Vente</option><option value="location">Location</option></select></div>
                  <div><label style={labelStyle}>Honoraires totaux (EUR HT)</label><input type="number" value={immoForm.montantHonoraires} onChange={e => setImmoForm(f => ({ ...f, montantHonoraires: e.target.value }))} placeholder="Ex: 8000" className="w-full focus:outline-none" style={inputStyle} onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }} /></div>
                </div>
                {montantHon > 0 && (
                  <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "16px", fontFamily: fonts.body, fontSize: "12px", marginBottom: "16px" }}>
                    <p style={{ color: colors.muted, fontWeight: 500, marginBottom: "8px" }}>Repartition estimee :</p>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: colors.muted }}>Votre part (50%)</span><span style={{ color: colors.gold, fontWeight: 600 }}>{prevAgent.toLocaleString("fr-FR")} EUR</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: colors.muted }}>Part Sigma (50%)</span><span style={{ color: colors.fg }}>{prevSigma.toLocaleString("fr-FR")} EUR</span></div>
                    {prevParrainN1 > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: colors.faint }}>Retro parrain N1 (10%)</span><span style={{ color: colors.faint }}>{prevParrainN1.toLocaleString("fr-FR")} EUR</span></div>}
                    {prevParrainN2 > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.faint }}>Retro parrain N2 (5%)</span><span style={{ color: colors.faint }}>{prevParrainN2.toLocaleString("fr-FR")} EUR</span></div>}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowDeclImmo(false)} style={btnSecondary}>Annuler</button>
                  <button onClick={() => creerTransImmoMut.mutate({ agentId: ambassadeurId, adresseBien: immoForm.adresseBien, typeTransaction: immoForm.typeTransaction, montantHonoraires: montantHon })} disabled={creerTransImmoMut.isPending || !immoForm.adresseBien || !montantHon} style={{ ...btnPrimary, opacity: (creerTransImmoMut.isPending || !immoForm.adresseBien || !montantHon) ? 0.5 : 1 }}>
                    {creerTransImmoMut.isPending ? "Envoi..." : "Declarer"}
                  </button>
                </div>
              </div>
            )}
            {mesTransactions.length === 0 ? (
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "48px", textAlign: "center" }}>
                <TrendingUp size={24} strokeWidth={1.5} style={{ color: colors.faint, margin: "0 auto 12px", display: "block" }} />
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.faint }}>Aucune transaction declaree pour l'instant.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {mesTransactions.map((t: any) => (
                  <div key={t.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><p style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 500, color: colors.fg, margin: "0 0 2px" }}>{t.adresseBien || "Bien sans adresse"}</p><p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, margin: 0 }}>{t.typeTransaction === "vente" ? "Vente" : "Location"} — {new Date(t.createdAt).toLocaleDateString("fr-FR")}</p></div>
                    <div style={{ textAlign: "right" }}><p style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 600, color: colors.gold, margin: "0 0 2px" }}>{(t.partAgent ?? 0).toLocaleString("fr-FR")} EUR</p><p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, margin: 0 }}>Votre part</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mainTab === "bien" && (
          <>
            {/* LOCALISATION */}
            {step === "localisation" && (
              <div>
                <h2 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 600, color: colors.fg, marginBottom: "4px" }}>Localisation du bien</h2>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, marginBottom: "24px" }}>Informations d'identification et d'adresse</p>
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "24px" }}>
                  <div style={{ marginBottom: "16px" }}><label style={labelStyle}>Titre de l'annonce <span style={{ color: colors.gold }}>*</span></label><SInput value={form.titre} onChange={e => set("titre", e.target.value)} placeholder="Ex: Appartement 3 pieces lumineux centre-ville" />{errorText(errors.titre)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div><label style={labelStyle}>Type de bien</label><SSelect value={form.typeBien} onChange={v => set("typeBien", v)}>{["appartement","maison","villa","terrain","local_commercial","autre"].map(v => <option key={v} value={v}>{v.replace("_"," ")}</option>)}</SSelect></div>
                    <div><label style={labelStyle}>Transaction</label><SSelect value={form.transaction} onChange={v => set("transaction", v)}><option value="vente">Vente</option><option value="location">Location</option></SSelect></div>
                  </div>
                  <div style={{ marginBottom: "16px" }}><label style={labelStyle}>Adresse <span style={{ color: colors.gold }}>*</span></label><SInput value={form.adresse} onChange={e => set("adresse", e.target.value)} placeholder="Numero et nom de rue" />{errorText(errors.adresse)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px", marginBottom: "16px" }}>
                    <div><label style={labelStyle}>Code postal <span style={{ color: colors.gold }}>*</span></label><SInput value={form.codePostal} onChange={e => set("codePostal", e.target.value)} placeholder="75001" />{errorText(errors.codePostal)}</div>
                    <div><label style={labelStyle}>Ville <span style={{ color: colors.gold }}>*</span></label><SInput value={form.ville} onChange={e => set("ville", e.target.value)} placeholder="Paris" />{errorText(errors.ville)}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div><label style={labelStyle}>Departement</label><SInput value={form.departement} onChange={e => set("departement", e.target.value)} placeholder="Ile-de-France" /></div>
                    <div><label style={labelStyle}>Usage</label><SSelect value={form.usage} onChange={v => set("usage", v)}><option value="residence_principale">Residence principale</option><option value="residence_secondaire">Residence secondaire</option><option value="investissement_locatif">Investissement locatif</option><option value="professionnel">Professionnel</option></SSelect></div>
                  </div>
                </div>
                <button onClick={() => { if (validateStep("localisation")) setStep("caracteristiques"); }} style={{ ...btnPrimary, width: "100%" }}>Continuer <ChevronRight size={14} strokeWidth={1.5} /></button>
              </div>
            )}

            {/* CARACTERISTIQUES */}
            {step === "caracteristiques" && (
              <div>
                <h2 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 600, color: colors.fg, marginBottom: "4px" }}>Caracteristiques</h2>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, marginBottom: "24px" }}>Dimensions, etat et equipements</p>
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div><label style={labelStyle}>Surface (m2) <span style={{ color: colors.gold }}>*</span></label><SInput type="number" value={form.surface} onChange={e => set("surface", e.target.value)} placeholder="75" />{errorText(errors.surface)}</div>
                    <div><label style={labelStyle}>Surface terrain (m2)</label><SInput type="number" value={form.surfaceTerrain} onChange={e => set("surfaceTerrain", e.target.value)} placeholder="0" /></div>
                    <div><label style={labelStyle}>Nb pieces</label><SInput type="number" value={form.nbPieces} onChange={e => set("nbPieces", e.target.value)} placeholder="3" /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div><label style={labelStyle}>Chambres</label><SInput type="number" value={form.nbChambres} onChange={e => set("nbChambres", e.target.value)} placeholder="2" /></div>
                    <div><label style={labelStyle}>Salle(s) de bain</label><SInput type="number" value={form.nbSallesBain} onChange={e => set("nbSallesBain", e.target.value)} placeholder="1" /></div>
                    <div><label style={labelStyle}>Annee construction</label><SInput type="number" value={form.anneeConstruction} onChange={e => set("anneeConstruction", e.target.value)} placeholder="1990" /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div><label style={labelStyle}>Etat du bien</label><SSelect value={form.etatBien} onChange={v => set("etatBien", v)}><option value="neuf">Neuf</option><option value="bon_etat">Bon etat</option><option value="a_rafraichir">A rafraichir</option><option value="a_renover">A renover</option></SSelect></div>
                    <div><label style={labelStyle}>Travaux estimes (EUR)</label><SInput type="number" value={form.travauxEstimes} onChange={e => set("travauxEstimes", e.target.value)} placeholder="0" /></div>
                  </div>
                  <SectionDivider>Equipements</SectionDivider>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                    {[{k:"balcon",l:"Balcon"},{k:"terrasse",l:"Terrasse"},{k:"jardin",l:"Jardin"},{k:"parking",l:"Parking"},{k:"garage",l:"Garage"},{k:"cave",l:"Cave"},{k:"ascenseur",l:"Ascenseur"},{k:"gardien",l:"Gardien"},{k:"piscine",l:"Piscine"}].map(({k,l}) => (
                      <label key={k} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <input type="checkbox" checked={(form as any)[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: colors.gold }} />
                        <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg }}>{l}</span>
                      </label>
                    ))}
                  </div>
                  <div><label style={labelStyle}>Description</label><textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Decrivez le bien, ses atouts, son environnement..." rows={4} className="w-full focus:outline-none" style={{ ...inputStyle, resize: "none" as const }} onFocus={e => { e.target.style.borderColor = colors.gold; }} onBlur={e => { e.target.style.borderColor = colors.border; }} /></div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => setStep("localisation")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
                  <button onClick={() => { if (validateStep("caracteristiques")) setStep("prix"); }} style={{ ...btnPrimary, flex: 1 }}>Continuer <ChevronRight size={14} strokeWidth={1.5} /></button>
                </div>
              </div>
            )}

            {/* PRIX & DPE */}
            {step === "prix" && (
              <div>
                <h2 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 600, color: colors.fg, marginBottom: "4px" }}>Prix & Diagnostic energetique</h2>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, marginBottom: "24px" }}>Informations financieres et DPE</p>
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "24px" }}>
                  <SectionDivider>Detail du prix</SectionDivider>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div><label style={labelStyle}>Prix net vendeur (EUR) <span style={{ color: colors.gold }}>*</span></label><SInput type="number" value={form.prixNetVendeur} onChange={e => { const nv = parseInt(e.target.value) || 0; const ha = parseInt(form.honorairesAgence) || 0; set("prixNetVendeur", e.target.value); set("prix", String(nv + ha)); }} placeholder="330000" style={{ fontSize: "16px", fontWeight: 600 }} />{errorText(errors.prixNetVendeur)}<p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "4px" }}>Sans frais d'agence</p></div>
                    <div><label style={labelStyle}>Honoraires d'agence (EUR)</label><SInput type="number" value={form.honorairesAgence} onChange={e => { const ha = parseInt(e.target.value) || 0; const nv = parseInt(form.prixNetVendeur) || 0; set("honorairesAgence", e.target.value); set("prix", String(nv + ha)); }} placeholder="20000" /><p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, marginTop: "4px" }}>Frais a la charge de l'acquereur</p></div>
                  </div>
                  {(form.prixNetVendeur || form.honorairesAgence) && (
                    <div style={{ background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>Prix FAI total</span>
                      <span style={{ fontFamily: fonts.body, fontSize: "16px", fontWeight: 700, color: colors.gold }}>{((parseInt(form.prixNetVendeur) || 0) + (parseInt(form.honorairesAgence) || 0)).toLocaleString("fr-FR")} EUR</span>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div><label style={labelStyle}>Charges annuelles (EUR)</label><SInput type="number" value={form.chargesAnnuelles} onChange={e => set("chargesAnnuelles", e.target.value)} placeholder="2400" /></div>
                    <div><label style={labelStyle}>Taxe fonciere (EUR/an)</label><SInput type="number" value={form.taxeFonciere} onChange={e => set("taxeFonciere", e.target.value)} placeholder="1200" /></div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "24px" }}>
                    <input type="checkbox" checked={form.prixNegociable} onChange={e => set("prixNegociable", e.target.checked)} style={{ accentColor: colors.gold }} />
                    <span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.fg }}>Prix negociable</span>
                  </label>
                  <SectionDivider>Diagnostic de Performance Energetique (DPE)</SectionDivider>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    {[{ label: "Classe DPE", field: "dpeLettre", valField: "dpeValeur", placeholder: "kWh/m2/an" }, { label: "Classe GES", field: "gesLettre", valField: "gesValeur", placeholder: "kg CO2/m2/an" }].map(({ label, field, valField, placeholder }) => (
                      <div key={field}>
                        <label style={labelStyle}>{label}</label>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                          {["A","B","C","D","E","F","G","NC"].map(l => (
                            <button key={l} type="button" onClick={() => set(field, l)} style={{
                              width: "32px", height: "32px", borderRadius: "2px", fontFamily: fonts.body, fontSize: "11px", fontWeight: 700,
                              border: `1px solid ${(form as any)[field] === l ? colors.gold : colors.border}`,
                              background: (form as any)[field] === l ? colors.gold : "transparent",
                              color: (form as any)[field] === l ? colors.bg : colors.faint,
                              cursor: "pointer", transition: "all 300ms ease",
                            }}>{l}</button>
                          ))}
                        </div>
                        <SInput type="number" value={(form as any)[valField]} onChange={e => set(valField, e.target.value)} placeholder={placeholder} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => setStep("caracteristiques")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
                  <button onClick={() => { if (validateStep("prix")) setStep("medias"); }} style={{ ...btnPrimary, flex: 1 }}>Continuer <ChevronRight size={14} strokeWidth={1.5} /></button>
                </div>
              </div>
            )}

            {/* PHOTOS & DOCUMENTS */}
            {step === "medias" && (
              <div>
                <h2 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 600, color: colors.fg, marginBottom: "4px" }}>Photos & Documents</h2>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, marginBottom: "24px" }}>Ajoutez des photos et documents du bien (optionnel)</p>
                <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                  style={{ border: `1px dashed ${isDragging ? colors.gold : colors.border}`, borderRadius: "2px", padding: "40px", textAlign: "center", cursor: "pointer", transition: "border-color 300ms ease", marginBottom: "20px", background: isDragging ? `${colors.gold}08` : colors.surface }}>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" style={{ display: "none" }} onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                  <Camera size={28} strokeWidth={1.5} style={{ color: colors.faint, margin: "0 auto 8px", display: "block" }} />
                  <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: 500, color: colors.fg, margin: "0 0 4px" }}>Glissez vos fichiers ici ou cliquez pour selectionner</p>
                  <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint, margin: 0 }}>Photos (JPG, PNG, WebP), PDF, documents Word — max 10 Mo par fichier</p>
                </div>
                {medias.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                    <p style={{ ...labelStyle }}>{medias.length} fichier{medias.length > 1 ? "s" : ""} selectionne{medias.length > 1 ? "s" : ""}</p>
                    {medias.map(media => (
                      <div key={media.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                        {media.preview ? <img src={media.preview} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "2px", border: `1px solid ${colors.border}`, flexShrink: 0 }} /> : <div style={{ width: "48px", height: "48px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileText size={16} strokeWidth={1.5} style={{ color: colors.faint }} /></div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: fonts.body, fontSize: "13px", fontWeight: 500, color: colors.fg, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{media.file.name}</p>
                          <p style={{ fontFamily: fonts.body, fontSize: "10px", color: colors.faint, margin: "0 0 6px" }}>{(media.file.size / 1024).toFixed(0)} Ko</p>
                          <select value={media.categorie} onChange={e => setCategorieMedia(media.id, e.target.value as MediaCategorie)} className="focus:outline-none" style={{ ...selectStyle, fontSize: "11px", padding: "4px 28px 4px 8px" }}>
                            {(Object.entries(CATEGORIE_LABELS) as [MediaCategorie, string][]).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                          </select>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          {media.status === "done" && <CheckCircle size={14} strokeWidth={1.5} style={{ color: colors.success }} />}
                          {media.status === "error" && <AlertCircle size={14} strokeWidth={1.5} style={{ color: colors.destructive }} />}
                          {media.status === "uploading" && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" style={{ color: colors.gold }} />}
                          <button onClick={() => removeMedia(media.id)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.faint, transition: "color 300ms ease" }} onMouseEnter={e => { e.currentTarget.style.color = colors.destructive; }} onMouseLeave={e => { e.currentTarget.style.color = colors.faint; }}><X size={14} strokeWidth={1.5} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => setStep("prix")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
                  <button onClick={() => setStep("recap")} style={{ ...btnPrimary, flex: 1 }}>Recapitulatif <ChevronRight size={14} strokeWidth={1.5} /></button>
                </div>
              </div>
            )}

            {/* RECAP */}
            {step === "recap" && (
              <div>
                <h2 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 600, color: colors.fg, marginBottom: "4px" }}>Recapitulatif</h2>
                <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, marginBottom: "24px" }}>Verifiez les informations avant de soumettre</p>
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "32px", marginBottom: "24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px" }}>
                    <div><p style={{ ...labelStyle, marginBottom: "8px" }}>Bien</p><p style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 500, color: colors.fg, margin: "0 0 4px" }}>{form.titre}</p><p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: "0 0 2px" }}>{form.typeBien} — {form.transaction}</p><p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0 }}>{form.adresse}, {form.codePostal} {form.ville}</p></div>
                    <div><p style={{ ...labelStyle, marginBottom: "8px" }}>Caracteristiques</p><p style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 500, color: colors.fg, margin: "0 0 4px" }}>{form.surface} m2</p>{form.nbPieces && <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: "0 0 2px" }}>{form.nbPieces} pieces</p>}<p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, margin: 0 }}>{form.etatBien.replace(/_/g, " ")}</p></div>
                    <div><p style={{ ...labelStyle, marginBottom: "8px" }}>Prix</p><p style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 700, color: colors.gold, margin: "0 0 4px" }}>{parseInt(form.prix || "0").toLocaleString("fr-FR")} EUR</p>{form.prixNegociable && <p style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.faint }}>Prix negociable</p>}</div>
                    <div><p style={{ ...labelStyle, marginBottom: "8px" }}>DPE</p><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: "28px", height: "28px", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.body, fontSize: "12px", fontWeight: 700, background: colors.gold, color: colors.bg }}>{form.dpeLettre}</span><span style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted }}>/ GES {form.gesLettre}</span></div></div>
                  </div>
                  <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "16px", marginBottom: "16px" }}>
                    <p style={{ ...labelStyle, marginBottom: "8px" }}>Equipements</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {["balcon","terrasse","jardin","parking","garage","cave","ascenseur","gardien","piscine"].filter(k => (form as any)[k]).map(k => (
                        <span key={k} style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.gold, padding: "4px 10px", border: `1px solid ${colors.border}`, borderRadius: "2px", textTransform: "capitalize" }}>{k}</span>
                      ))}
                    </div>
                  </div>
                  {medias.length > 0 && (
                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "16px" }}>
                      <p style={{ ...labelStyle, marginBottom: "8px" }}>Medias ({medias.length} fichier{medias.length > 1 ? "s" : ""})</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {medias.map(m => (
                          <span key={m.id} style={{ fontFamily: fonts.body, fontSize: "11px", color: colors.muted, padding: "4px 8px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: "2px", display: "inline-flex", alignItems: "center", gap: "4px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.preview ? <Image size={10} strokeWidth={1.5} style={{ color: colors.gold }} /> : <FileText size={10} strokeWidth={1.5} style={{ color: colors.gold }} />}
                            {m.file.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => setStep("medias")} style={btnSecondary}><ChevronLeft size={14} strokeWidth={1.5} /> Retour</button>
                  <button onClick={handleSubmit} disabled={creerBien.isPending || uploadingAll} style={{ ...btnPrimary, flex: 1, opacity: (creerBien.isPending || uploadingAll) ? 0.7 : 1, cursor: (creerBien.isPending || uploadingAll) ? "not-allowed" : "pointer" }}>
                    {creerBien.isPending || uploadingAll ? (uploadingAll ? `Upload en cours... (${medias.filter(m => m.status === "done").length}/${medias.length})` : "Envoi en cours...") : "Soumettre le bien a Sigma Factory"}
                  </button>
                </div>
                {creerBien.isError && <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.destructive, textAlign: "center", marginTop: "16px" }}>{creerBien.error.message}</p>}
              </div>
            )}

            {/* CONFIRMATION */}
            {step === "confirmation" && (
              <div style={{ textAlign: "center" }}>
                <CheckCircle size={48} strokeWidth={1.5} style={{ color: colors.gold, margin: "0 auto 20px", display: "block" }} />
                <h2 style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: 600, color: colors.fg, letterSpacing: "0.04em", marginBottom: "8px" }}>Bien soumis avec succes</h2>
                <p style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.muted, marginBottom: "24px" }}>L'equipe Sigma Factory va examiner votre bien et vous recontacter sous 48h.</p>
                {reference && (
                  <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "2px", padding: "20px", display: "inline-block", marginBottom: "24px" }}>
                    <p style={{ ...labelStyle, marginBottom: "4px" }}>Reference</p>
                    <p style={{ fontFamily: "'Hanken Grotesk', monospace", fontSize: "18px", fontWeight: 700, color: colors.fg, margin: 0 }}>{reference}</p>
                  </div>
                )}
                {medias.length > 0 && (
                  <p style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.muted, marginBottom: "24px" }}>
                    {medias.filter(m => m.status === "done").length}/{medias.length} fichier{medias.length > 1 ? "s" : ""} uploade{medias.length > 1 ? "s" : ""}
                    {medias.some(m => m.status === "error") && <span style={{ color: colors.destructive, marginLeft: "8px" }}>— certains fichiers ont echoue</span>}
                  </p>
                )}
                <button onClick={() => { setStep("localisation"); setForm(f => ({ ...f, titre: "", adresse: "", description: "", pointsForts: "", prix: "" })); setMedias([]); setBienId(null); setReference(null); }} style={btnPrimary}>
                  <Home size={14} strokeWidth={1.5} /> Soumettre un autre bien
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

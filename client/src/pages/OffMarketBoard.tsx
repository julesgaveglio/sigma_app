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
  archive: "Archive",
};

const STATUT_STYLES: Record<Statut, { color: string; bg: string; border: string }> = {
  disponible: { color: "var(--success)", bg: "rgba(74,122,90,0.08)", border: "rgba(74,122,90,0.2)" },
  sous_compromis: { color: "var(--gold)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.2)" },
  vendu: { color: "var(--destructive)", bg: "rgba(160,64,64,0.08)", border: "rgba(160,64,64,0.2)" },
  archive: { color: "var(--foreground-faint)", bg: "rgba(58,54,50,0.08)", border: "rgba(58,54,50,0.2)" },
};

const STATUT_COLORS: Record<Statut, string> = {
  disponible: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  sous_compromis: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  vendu: "bg-red-500/20 text-red-400 border-red-500/30",
  archive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const REGIONS = [
  "Grand Est", "Hauts-de-France", "Ile-de-France", "Auvergne-Rhone-Alpes",
  "PACA", "Occitanie", "Nouvelle-Aquitaine", "Bretagne", "Normandie",
  "Pays de la Loire", "Bourgogne-Franche-Comte", "Centre-Val de Loire",
  "Corse", "Guadeloupe", "Martinique", "Guyane", "La Reunion",
];

const TYPE_BIENS = [
  "Immeuble De Rapport", "Appartement", "Maison", "Studio",
  "Bien Résidentiel", "Bien De Prestige", "Local Commercial",
  "Terrain", "Parking", "Autre",
];

function formatPrice(n: number | null | undefined) {
  if (!n) return "\u2014";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: string | number | null | undefined) {
  if (!n) return "\u2014";
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

function StatutBadge({ statut }: { statut: Statut }) {
  const s = STATUT_STYLES[statut] ?? STATUT_STYLES.archive;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "2px",
      fontSize: "10px",
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
    }}>
      {STATUT_LABELS[statut]}
    </span>
  );
}

function BienCard({ bien, onClick }: { bien: Bien; onClick: () => void }) {
  const images = parseImages(bien.images);
  const mainImg = bien.imagePrincipale || images[0] || null;
  const statut = (bien.statut ?? "disponible") as Statut;
  const nouveau = isNew(bien.createdAt);

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-colors duration-300"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Image */}
      <div style={{ position: "relative", height: "180px", background: "var(--surface-header)", overflow: "hidden" }}>
        {mainImg ? (
          <img
            src={mainImg}
            alt={bien.titre}
            className="transition-transform duration-300"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building style={{ width: "32px", height: "32px", color: "var(--border)", strokeWidth: 1.5 }} />
          </div>
        )}
        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px" }}>
          <StatutBadge statut={statut} />
          {nouveau && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: "2px",
              fontSize: "10px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "var(--background)",
              background: "var(--gold)",
            }}>
              Nouveau
            </span>
          )}
        </div>
        {images.length > 1 && (
          <span style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            background: "rgba(0,0,0,0.6)",
            color: "var(--foreground)",
            fontSize: "10px",
            fontFamily: "'Hanken Grotesk', sans-serif",
            padding: "2px 8px",
            borderRadius: "2px",
          }}>
            {images.length} photos
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px" }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--foreground)",
          lineHeight: 1.3,
          marginBottom: "6px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
          letterSpacing: "0.02em",
        }}>
          {bien.titre}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "14px" }}>
          <MapPin style={{ width: "12px", height: "12px", color: "var(--foreground-faint)", strokeWidth: 1.5, flexShrink: 0 }} />
          <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {bien.region || bien.departement || "\u2014"}
          </span>
          {bien.typeBien && (
            <>
              <span style={{ color: "var(--foreground-faint)", margin: "0 2px" }}>\u00b7</span>
              <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>{bien.typeBien}</span>
            </>
          )}
        </div>

        {/* Data grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ background: "var(--background)", padding: "10px 12px" }}>
            <p className="label-uppercase" style={{ marginBottom: "2px", fontSize: "9px" }}>Prix bien</p>
            <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{formatPrice(bien.prixBien)}</p>
          </div>
          <div style={{ background: "var(--background)", padding: "10px 12px" }}>
            <p className="label-uppercase" style={{ marginBottom: "2px", fontSize: "9px" }}>Invest. total</p>
            <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{formatPrice(bien.investissementTotal)}</p>
          </div>
          <div style={{ background: "var(--background)", padding: "10px 12px" }}>
            <p style={{ marginBottom: "2px", fontSize: "9px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--gold)" }}>Renta. brute</p>
            <p className="tabular-nums" style={{ fontSize: "14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: "var(--gold)" }}>{formatPct(bien.rentabiliteBrute)}</p>
          </div>
          <div style={{ background: "var(--background)", padding: "10px 12px" }}>
            <p className="label-uppercase" style={{ marginBottom: "2px", fontSize: "9px" }}>Lots</p>
            <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{bien.nbLots ?? "\u2014"}</p>
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
    <div style={{ position: "relative", borderRadius: "2px", overflow: "hidden", background: "var(--surface-header)" }}>
      <img src={images[current]} alt={`${title} - photo ${current + 1}`} style={{ width: "100%", height: "280px", objectFit: "cover" }} />
      {images.length > 1 && (
        <>
          <button
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "var(--foreground)", border: "none", borderRadius: "2px", padding: "6px", cursor: "pointer" }}
            className="transition-opacity duration-300 hover:opacity-80"
            onClick={() => setCurrent(i => (i - 1 + images.length) % images.length)}
          >
            <ChevronLeft style={{ width: "16px", height: "16px", strokeWidth: 1.5 }} />
          </button>
          <button
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "var(--foreground)", border: "none", borderRadius: "2px", padding: "6px", cursor: "pointer" }}
            className="transition-opacity duration-300 hover:opacity-80"
            onClick={() => setCurrent(i => (i + 1) % images.length)}
          >
            <ChevronRight style={{ width: "16px", height: "16px", strokeWidth: 1.5 }} />
          </button>
          <div style={{ position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "4px" }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "1px",
                  border: "none",
                  cursor: "pointer",
                  background: i === current ? "var(--foreground)" : "rgba(240,237,230,0.3)",
                  transition: "background 300ms ease",
                }}
              />
            ))}
          </div>
          <span style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(0,0,0,0.6)",
            color: "var(--foreground)",
            fontSize: "10px",
            fontFamily: "'Hanken Grotesk', sans-serif",
            padding: "2px 8px",
            borderRadius: "2px",
          }}>
            {current + 1} / {images.length}
          </span>
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
      toast.error("Erreur generation PDF : " + err.message);
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
      toast.success(`Fiche envoyee a ${data.leadEmail}${data.pdfUrl ? " avec PDF" : ""}`);
    },
    onError: (err) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const handleSend = async () => {
    if (!selectedLeadId) { toast.error("Selectionnez un lead"); return; }
    proposerMutation.mutate({
      offMarketId: bien.id,
      crmLeadId: Number(selectedLeadId),
      messagePersonnalise: message || undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: "2px",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: "var(--foreground)",
    resize: "none",
    outline: "none",
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", maxWidth: "480px" }} className="text-[var(--foreground)]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: "8px" }}>
            <Send style={{ width: "16px", height: "16px", color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
            {step === "done" ? "Fiche envoyee" : "Proposer a un lead"}
          </DialogTitle>
        </DialogHeader>

        {/* Etape 1 : Generation PDF */}
        {step === "preview" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "32px 0" }}>
            <Loader2 className="animate-spin" style={{ width: "20px", height: "20px", color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
            <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Generation du PDF en cours...</p>
          </div>
        )}

        {/* Etape 2 : Confirmation + envoi */}
        {step === "confirm" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "2px", padding: "12px 14px" }}>
            <p className="label-uppercase" style={{ marginBottom: "4px" }}>Bien selectionne</p>
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{bien.titre}</p>
            <p className="tabular-nums" style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--gold)", marginTop: "4px" }}>{formatPrice(bien.prixBien)}</p>
          </div>

          {/* Apercu PDF */}
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "2px", padding: "12px 14px" }}>
            <p className="label-uppercase" style={{ marginBottom: "8px" }}>Fiche PDF generee</p>
            {pdfUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity duration-300 hover:opacity-80"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "transparent",
                    color: "var(--gold)",
                    border: "1px solid rgba(201,168,76,0.3)",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                    textDecoration: "none",
                    borderRadius: "2px",
                  }}
                >
                  Ouvrir le PDF
                </a>
                <a
                  href={pdfUrl}
                  download={`fiche-off-market-${bien.id}.pdf`}
                  className="transition-opacity duration-300 hover:opacity-80"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "transparent",
                    color: "var(--foreground-muted)",
                    border: "1px solid var(--border)",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                    textDecoration: "none",
                    borderRadius: "2px",
                  }}
                >
                  Telecharger
                </a>
              </div>
            ) : (
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>PDF non disponible — la fiche sera envoyee sans piece jointe.</p>
            )}
          </div>

          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Lead destinataire *</p>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "2px", color: "var(--foreground)", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}>
                <SelectValue placeholder="Choisir un lead..." />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px" }} className="max-h-60">
                {leads.map((lead: any) => (
                  <SelectItem key={lead.id} value={String(lead.id)} style={{ color: "var(--foreground)", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    <span className="flex items-center gap-2">
                      <Users style={{ width: "12px", height: "12px", color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
                      {lead.prenom} {lead.nom} — {lead.email}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Alerte doublon */}
            {doublonCheck?.alreadySent && (
              <div style={{ marginTop: "8px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "2px", padding: "10px 12px" }}>
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, color: "var(--gold)", letterSpacing: "0.04em" }}>Ce bien a deja ete envoye a ce lead</p>
                {doublonCheck.sentAt && (
                  <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", marginTop: "2px" }}>
                    Envoye le {new Date(doublonCheck.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
                <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "2px" }}>Vous pouvez quand meme renvoyer si necessaire.</p>
              </div>
            )}
          </div>

          <div>
            <p className="label-uppercase" style={{ marginBottom: "6px" }}>Message personnalise (optionnel)</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Suite a notre echange, voici une opportunite off market qui correspond a vos criteres..."
              style={inputStyle}
              rows={3}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
            <button
              onClick={onClose}
              className="transition-colors duration-300"
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--foreground-muted)",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={!selectedLeadId || proposerMutation.isPending}
              className="transition-colors duration-300"
              style={{
                flex: 1,
                padding: "10px 16px",
                background: (!selectedLeadId || proposerMutation.isPending) ? "var(--gold-muted)" : "var(--gold)",
                border: "none",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: "var(--background)",
                cursor: (!selectedLeadId || proposerMutation.isPending) ? "not-allowed" : "pointer",
              }}
            >
              {proposerMutation.isPending ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Loader2 className="animate-spin" style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
                  Envoi...
                </span>
              ) : "Envoyer la fiche"}
            </button>
          </div>
        </div>
        )}

        {/* Etape 3 : Confirmation d'envoi */}
        {step === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "32px 0", textAlign: "center" }}>
            <CheckCircle style={{ width: "28px", height: "28px", color: "var(--success)", strokeWidth: 1.5 }} />
            <div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em" }}>Fiche envoyee avec succes</p>
              <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", marginTop: "4px" }}>Le PDF a ete joint a l'email du lead.</p>
            </div>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={`fiche-off-market-${bien.id}.pdf`}
                className="transition-opacity duration-300 hover:opacity-80"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "transparent",
                  color: "var(--gold)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  padding: "8px 16px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  textDecoration: "none",
                  borderRadius: "2px",
                }}
              >
                Telecharger le PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="transition-colors duration-300"
              style={{
                padding: "10px 24px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--foreground-muted)",
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// -- Formulaire d'ajout de bien Off Market --
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
      toast.success("Bien Off Market ajoute avec succes");
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: "2px",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: "var(--foreground)",
    outline: "none",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "auto" as const,
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "2px", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto" }} className="text-[var(--foreground)]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: "8px" }}>
            <Gem style={{ width: "16px", height: "16px", color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
            Nouveau bien Off Market
          </DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingTop: "8px" }}>
          {/* Infos de base */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Informations generales</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Titre *</p>
                <input value={form.titre} onChange={f("titre")} placeholder="Ex: Immeuble De Rapport - 450 000 EUR" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <p className="label-uppercase" style={{ marginBottom: "4px" }}>Type de bien</p>
                  <select value={form.typeBien} onChange={f("typeBien")} style={selectStyle}>
                    <option value="">Selectionner...</option>
                    {TYPE_BIENS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <p className="label-uppercase" style={{ marginBottom: "4px" }}>Statut</p>
                  <select value={form.statut} onChange={f("statut")} style={selectStyle}>
                    {(Object.keys(STATUT_LABELS) as Statut[]).map(s => (
                      <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <p className="label-uppercase" style={{ marginBottom: "4px" }}>Region</p>
                  <select value={form.region} onChange={f("region")} style={selectStyle}>
                    <option value="">Selectionner...</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <p className="label-uppercase" style={{ marginBottom: "4px" }}>Departement / Ville</p>
                  <input value={form.departement} onChange={f("departement")} placeholder="Ex: Bas-Rhin (67)" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <p className="label-uppercase" style={{ marginBottom: "4px" }}>Surface totale (m2)</p>
                  <input value={form.surfaceTotale} onChange={f("surfaceTotale")} placeholder="Ex: 280" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                </div>
                <div>
                  <p className="label-uppercase" style={{ marginBottom: "4px" }}>Nombre de lots</p>
                  <input type="number" value={form.nbLots} onChange={f("nbLots")} placeholder="Ex: 6" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                </div>
              </div>
            </div>
          </div>

          {/* Donnees financieres */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Donnees financieres</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Prix du bien (EUR)</p>
                <input value={form.prixBien} onChange={f("prixBien")} placeholder="Ex: 450000" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Honoraires (EUR)</p>
                <input value={form.honoraires} onChange={f("honoraires")} placeholder="Calcule auto si vide" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Travaux estimes (EUR)</p>
                <input value={form.travauxEstimation} onChange={f("travauxEstimation")} placeholder="Ex: 30000" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Investissement total (EUR)</p>
                <input value={form.investissementTotal} onChange={f("investissementTotal")} placeholder="Calcule auto si vide" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Revenus annuels actuels (EUR)</p>
                <input value={form.revenusAnnuels} onChange={f("revenusAnnuels")} placeholder="Ex: 36000" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Revenus potentiels LD (EUR)</p>
                <input value={form.revenusPotenlielsLd} onChange={f("revenusPotenlielsLd")} placeholder="Ex: 42000" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
            </div>
          </div>

          {/* Rentabilites */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Rentabilites</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Brute actuelle (%)</p>
                <input value={form.rentabiliteBrute} onChange={f("rentabiliteBrute")} placeholder="Ex: 8.50" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Potentielle LD (%)</p>
                <input value={form.rentabilitePotentielleLd} onChange={f("rentabilitePotentielleLd")} placeholder="Ex: 10.20" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <p className="label-uppercase" style={{ marginBottom: "4px" }}>Potentielle CD (%)</p>
                <input value={form.rentabilitePotentielleCd} onChange={f("rentabilitePotentielleCd")} placeholder="Ex: 12.50" style={inputStyle} onFocus={e => (e.target.style.borderColor = "var(--gold)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div>
            <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Photos</p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer transition-colors duration-300"
              style={{
                border: "1px dashed var(--border)",
                borderRadius: "2px",
                padding: "24px",
                textAlign: "center",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              {isUploading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <Loader2 className="animate-spin" style={{ width: "16px", height: "16px", color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
                  <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Upload en cours...</span>
                </div>
              ) : (
                <>
                  <Upload style={{ width: "20px", height: "20px", color: "var(--foreground-faint)", margin: "0 auto 8px", strokeWidth: 1.5 }} />
                  <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Cliquez pour ajouter des photos</p>
                  <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", marginTop: "4px" }}>JPG, PNG, WebP — plusieurs fichiers acceptes</p>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginTop: "12px" }}>
                {uploadedImages.map((url, i) => (
                  <div key={i} style={{ position: "relative" }} className="group">
                    <img src={url} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "64px", objectFit: "cover", borderRadius: "2px" }} />
                    {i === 0 && (
                      <span style={{
                        position: "absolute",
                        bottom: "4px",
                        left: "4px",
                        background: "var(--gold)",
                        color: "var(--background)",
                        fontSize: "9px",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: "2px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase" as const,
                      }}>Principal</span>
                    )}
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(160,64,64,0.8)",
                        color: "var(--foreground)",
                        border: "none",
                        borderRadius: "2px",
                        padding: "2px",
                        cursor: "pointer",
                      }}
                      onClick={(e) => { e.stopPropagation(); setUploadedImages(prev => prev.filter((_, j) => j !== i)); }}
                    >
                      <X style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
            <button
              onClick={onClose}
              className="transition-colors duration-300"
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--foreground-muted)",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || isUploading}
              className="transition-colors duration-300"
              style={{
                flex: 1,
                padding: "10px 16px",
                background: (isSaving || isUploading) ? "var(--gold-muted)" : "var(--gold)",
                border: "none",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: "var(--background)",
                cursor: (isSaving || isUploading) ? "not-allowed" : "pointer",
              }}
            >
              {isSaving ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Loader2 className="animate-spin" style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
                  Enregistrement...
                </span>
              ) : "Ajouter le bien"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoriqueEnvois({ bienId }: { bienId: number }) {
  const { data: envois, isLoading } = trpc.offMarket.listEnvoisBien.useQuery({ offMarketBienId: bienId });

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
      <Loader2 className="animate-spin" style={{ width: "14px", height: "14px", color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
      <span style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Chargement de l'historique...</span>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Clock style={{ width: "14px", height: "14px", color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
        <p className="label-uppercase" style={{ color: "var(--foreground)" }}>Historique des envois</p>
        {envois && envois.length > 0 && (
          <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>
            \u2014 {envois.length} envoi{envois.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {!envois || envois.length === 0 ? (
        <div style={{ background: "var(--surface-header)", border: "1px dashed var(--border)", borderRadius: "2px", padding: "16px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucun envoi enregistre pour ce bien</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
          {envois.map((envoi) => (
            <div key={envoi.id} style={{ background: "var(--surface)", padding: "12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  {envoi.statut === "sent" ? (
                    <CheckCircle style={{ width: "12px", height: "12px", color: "var(--success)", strokeWidth: 1.5, flexShrink: 0 }} />
                  ) : (
                    <Eye style={{ width: "12px", height: "12px", color: "var(--foreground-faint)", strokeWidth: 1.5, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {envoi.leadPrenom} {envoi.leadNom}
                  </span>
                  <span style={{
                    fontSize: "10px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    padding: "2px 6px",
                    borderRadius: "2px",
                    flexShrink: 0,
                    ...(envoi.statut === "sent"
                      ? { color: "var(--success)", background: "rgba(74,122,90,0.08)", border: "1px solid rgba(74,122,90,0.2)" }
                      : { color: "var(--foreground-faint)", background: "rgba(58,54,50,0.08)", border: "1px solid rgba(58,54,50,0.2)" }
                    ),
                  }}>
                    {envoi.statut === "sent" ? "Envoye" : "Previsualise"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{envoi.emailDestinataire}</span>
                  <span>\u00b7</span>
                  <span>par {envoi.envoyePar?.split("@")[0]}</span>
                  <span>\u00b7</span>
                  <span className="tabular-nums">{new Date(envoi.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {envoi.messagePersonnalise && (
                  <p style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", fontStyle: "italic", color: "var(--foreground-muted)", marginTop: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>"{envoi.messagePersonnalise}"</p>
                )}
              </div>
              {envoi.pdfUrl && (
                <a
                  href={envoi.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity duration-300 hover:opacity-70"
                  style={{ flexShrink: 0, color: "var(--foreground-muted)" }}
                  title="Voir le PDF envoye"
                >
                  <ExternalLink style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
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
      toast.success("Statut mis a jour");
    },
  });

  const deleteMutation = trpc.offMarket.delete.useMutation({
    onSuccess: () => {
      utils.offMarket.list.invalidate();
      toast.success("Bien supprime");
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
        toast.success("Coordonnees GPS mises a jour");
      }
      setIsGeolocating(false);
    },
    onError: (err) => {
      toast.error(`Geolocalisation impossible : ${err.message}`);
      setIsGeolocating(false);
    },
  });

  const handleGeolocate = async () => {
    if (!bien.region && !bien.departement) {
      toast.error("Ce bien n'a pas de region ou departement renseigne");
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
      <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
        <div style={{ width: "100%", maxWidth: "600px", height: "100%", background: "var(--surface)", borderLeft: "1px solid var(--border)", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 z-10" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Gem style={{ width: "14px", height: "14px", color: "var(--foreground-muted)", strokeWidth: 1.5, flexShrink: 0 }} />
                <span className="label-uppercase" style={{ color: "var(--foreground-muted)" }}>Off Market</span>
                {nouveau && (
                  <span style={{
                    fontSize: "10px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "2px",
                    background: "var(--gold)",
                    color: "var(--background)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                  }}>Nouveau</span>
                )}
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.3, letterSpacing: "0.02em" }}>{bien.titre}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                <StatutBadge statut={statut} />
                {bien.region && (
                  <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} />{bien.region}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="transition-opacity duration-300 hover:opacity-70" style={{ color: "var(--foreground-muted)", padding: "4px", marginTop: "4px", background: "transparent", border: "none", cursor: "pointer" }}>
              <X style={{ width: "16px", height: "16px", strokeWidth: 1.5 }} />
            </button>
          </div>

          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Galerie photos */}
            {images.length > 0 && <ImageGallery images={images} title={bien.titre} />}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowProposer(true)}
                className="transition-colors duration-300"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "var(--gold)",
                  border: "none",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  color: "var(--background)",
                  cursor: "pointer",
                }}
              >
                <Send style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} />
                Proposer a un lead
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)" }}>Statut :</span>
                <select
                  value={statut}
                  onChange={e => updateStatut.mutate({ id: bien.id, statut: e.target.value as Statut })}
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "2px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
                >
                  {(Object.keys(STATUT_LABELS) as Statut[]).map(s => (
                    <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGeolocate}
                disabled={isGeolocating}
                className="transition-colors duration-300"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  color: "var(--foreground-muted)",
                  cursor: isGeolocating ? "not-allowed" : "pointer",
                }}
                title={geoCoords ? `GPS : ${geoCoords.lat}, ${geoCoords.lng}` : "Geolocaliser ce bien"}
              >
                {isGeolocating
                  ? <Loader2 className="animate-spin" style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} />
                  : <Navigation style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} />
                }
                {geoCoords ? "Re-geolocaliser" : "Geolocaliser"}
              </button>
              <button
                onClick={() => { if (confirm("Supprimer ce bien ?")) deleteMutation.mutate({ id: bien.id }); }}
                className="transition-colors duration-300"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid rgba(160,64,64,0.2)",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  color: "var(--destructive)",
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                <Trash2 style={{ width: "12px", height: "12px", strokeWidth: 1.5 }} />
                Supprimer
              </button>
            </div>

            {/* Financier */}
            <div>
              <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Donnees financieres</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                {[
                  { label: "Prix du bien", value: formatPrice(bien.prixBien) },
                  { label: "Honoraires", value: formatPrice(bien.honoraires) },
                  { label: "Travaux estimes", value: formatPrice(bien.travauxEstimation) },
                  { label: "Revenus annuels actuels", value: formatPrice(bien.revenusAnnuels) },
                  { label: "Revenus potentiels LD", value: formatPrice(bien.revenusPotenlielsLd) },
                  { label: "Revenus potentiels CD", value: formatPrice(bien.revenusPotentielsCd) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--background)", padding: "12px 14px" }}>
                    <p className="label-uppercase" style={{ marginBottom: "2px", fontSize: "9px" }}>{label}</p>
                    <p className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{value}</p>
                  </div>
                ))}
              </div>
              {/* Investissement total - highlight */}
              <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "2px", padding: "14px 16px", marginTop: "8px" }}>
                <p style={{ fontSize: "9px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.7)", marginBottom: "2px" }}>Investissement total</p>
                <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "var(--gold)" }}>{formatPrice(bien.investissementTotal)}</p>
              </div>
            </div>

            {/* Rentabilites */}
            <div>
              <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Rentabilites</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                {[
                  { label: "Brute actuelle", value: formatPct(bien.rentabiliteBrute) },
                  { label: "Potentielle LD", value: formatPct(bien.rentabilitePotentielleLd) },
                  { label: "Potentielle CD", value: formatPct(bien.rentabilitePotentielleCd) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--background)", padding: "14px 12px", textAlign: "center" }}>
                    <p style={{ fontSize: "9px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(74,122,90,0.7)", marginBottom: "4px" }}>{label}</p>
                    <p className="tabular-nums" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: "var(--success)" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lots */}
            {lots.length > 0 && (
              <div>
                <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>
                  Composition — {bien.nbLots} lot{(bien.nbLots ?? 0) > 1 ? "s" : ""}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                  {lots.map((lot, i) => (
                    <div key={i} style={{ background: "var(--background)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <span className="tabular-nums" style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)", flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lot.type}</span>
                        {lot.surface && <span style={{ fontSize: "11px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-muted)", flexShrink: 0 }}>{lot.surface}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                        {lot.loyer && <span className="tabular-nums" style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--gold)" }}>{lot.loyer}</span>}
                        {lot.statut && (
                          <span style={{
                            fontSize: "10px",
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            fontWeight: 500,
                            padding: "2px 6px",
                            borderRadius: "2px",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase" as const,
                            ...(lot.statut.toLowerCase().includes("lou")
                              ? { color: "var(--success)", background: "rgba(74,122,90,0.08)", border: "1px solid rgba(74,122,90,0.2)" }
                              : { color: "var(--foreground-muted)", background: "rgba(58,54,50,0.08)", border: "1px solid rgba(58,54,50,0.2)" }
                            ),
                          }}>
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
                <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Situation</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {situation.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ color: "var(--foreground-faint)", marginTop: "2px", flexShrink: 0 }}>\u2022</span>
                      <span style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground)", lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Infos generales */}
            <div>
              <p className="label-uppercase" style={{ marginBottom: "12px", color: "var(--foreground)" }}>Informations generales</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                {[
                  { label: "Type de bien", value: bien.typeBien },
                  { label: "Region", value: bien.region },
                  { label: "Departement", value: bien.departement },
                  { label: "Surface totale", value: bien.surfaceTotale ? `${bien.surfaceTotale} m2` : null },
                  { label: "Nombre de lots", value: bien.nbLots?.toString() },
                  { label: "Ajoute le", value: new Date(bien.createdAt).toLocaleDateString("fr-FR") },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--background)", padding: "12px 14px" }}>
                    <p className="label-uppercase" style={{ marginBottom: "2px", fontSize: "9px" }}>{label}</p>
                    <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "var(--foreground)" }}>{value}</p>
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

  const selectStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "2px",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "'Hanken Grotesk', sans-serif",
    color: "var(--foreground)",
    outline: "none",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <AdminNav />
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 20px 64px" }}>
        {/* Bouton retour si on vient de la carte */}
        {fromCarte && (
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => navigate("/dashboard/reseau")}
              className="transition-opacity duration-300 hover:opacity-70"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "var(--foreground-muted)",
              }}
            >
              <ChevronLeft style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
              Retour a la carte du reseau
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 700,
                color: "var(--foreground)",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                lineHeight: 1,
              }}>Biens Off Market</h1>
              {nouveaux > 0 && (
                <span style={{
                  fontSize: "10px",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "2px",
                  background: "var(--gold)",
                  color: "var(--background)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                }}>
                  {nouveaux} nouveau{nouveaux > 1 ? "x" : ""}
                </span>
              )}
            </div>
            <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Acces confidentiel — opportunites exclusives</p>
          </div>
          <button
            onClick={() => setShowNouveauBien(true)}
            className="transition-colors duration-300"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              background: "var(--gold)",
              border: "none",
              borderRadius: "2px",
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "var(--background)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Plus style={{ width: "14px", height: "14px", strokeWidth: 1.5 }} />
            Nouveau bien
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--border)", border: "1px solid var(--border)", borderRadius: "2px", marginBottom: "32px" }}>
          {[
            { label: "Total", value: total, accent: true },
            { label: "Disponibles", value: disponibles },
            { label: "Sous compromis", value: sousCompromis },
            { label: "Vendus", value: vendus },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background: "var(--background)", padding: "20px" }}>
              <p className="tabular-nums" style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px",
                fontWeight: 600,
                color: accent ? "var(--gold)" : "var(--foreground)",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}>
                {value}
              </p>
              <p className="label-uppercase" style={{ marginTop: "8px" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "360px" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "var(--foreground-faint)", strokeWidth: 1.5 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un bien..."
              className="w-full transition-colors duration-300 focus:outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                paddingLeft: "34px",
                paddingRight: "12px",
                paddingTop: "8px",
                paddingBottom: "8px",
                fontSize: "13px",
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "var(--foreground)",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <select value={statut} onChange={e => setStatut(e.target.value)} style={selectStyle}>
            <option value="tous">Tous les statuts</option>
            {(Object.keys(STATUT_LABELS) as Statut[]).map(s => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
          <select value={region} onChange={e => setRegion(e.target.value)} style={selectStyle}>
            <option value="toutes">Toutes les regions</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={typeBienFilter} onChange={e => setTypeBienFilter(e.target.value)} style={selectStyle}>
            <option value="tous">Tous les types</option>
            <option value="Immeuble De Rapport">Immeuble de rapport</option>
            <option value="Immobilier Commercial">Immobilier commercial</option>
            <option value="Residence Senior">Residence senior</option>
            <option value="Ferme Vosgienne">Ferme vosgienne</option>
            <option value="Plateau A Amenager">Plateau a amenager</option>
            <option value="Studio">Studio</option>
          </select>
        </div>

        {/* Grille */}
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: "80px 0" }}>
            <Loader2 className="animate-spin" style={{ width: "20px", height: "20px", color: "var(--foreground-muted)", strokeWidth: 1.5 }} />
          </div>
        ) : biens.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Gem style={{ width: "28px", height: "28px", color: "var(--border)", margin: "0 auto 12px", strokeWidth: 1.5 }} />
            <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", color: "var(--foreground-faint)" }}>Aucun bien off market trouve</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {biens.map(bien => (
              <BienCard key={bien.id} bien={bien} onClick={() => setSelectedBien(bien)} />
            ))}
          </div>
        )}

        {/* Panel detail */}
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

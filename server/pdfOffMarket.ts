import PDFDocument from "pdfkit";
import https from "https";
import http from "http";
import { storagePut } from "./storage";

export interface OffMarketPdfData {
  id: number;
  titre: string;
  typeBien?: string | null;
  region?: string | null;
  prixBien?: number | null;
  honoraires?: number | null;
  travauxEstimation?: number | null;
  investissementTotal?: number | null;
  nbLots?: number | null;
  surfaceTotale?: string | null;
  rentabiliteBrute?: string | null;
  rentabilitePotentielleLd?: string | null;
  rentabilitePotentielleCd?: string | null;
  revenusAnnuels?: number | null;
  revenusPotenlielsLd?: number | null;
  revenusPotentielsCd?: number | null;
  situation?: string | null;
  lots?: string | null;
  images?: string | null;
  imagePrincipale?: string | null;
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function fmtPrice(n?: number | null): string {
  if (!n) return "—";
  const parts = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts + " EUR";
}

function fmtPct(n?: string | number | null): string {
  if (!n) return "—";
  return Number(n).toFixed(2) + " %";
}

function parseImages(raw: unknown): string[] {
  if (!raw) return [];
  // Drizzle peut retourner un tableau déjà parsé
  if (Array.isArray(raw)) return (raw as string[]).filter(Boolean);
  if (typeof raw === "string") {
    // Peut être une liste CSV (url1,url2,...) ou JSON
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    // CSV séparé par virgules
    if (raw.includes(",") && raw.startsWith("http")) {
      return raw.split(",").map(s => s.trim()).filter(s => s.startsWith("http"));
    }
    return raw.startsWith("http") ? [raw] : [];
  }
  return [];
}

export async function generateOffMarketPdf(bien: OffMarketPdfData): Promise<string> {
  const GOLD = "#C9A84C";
  const DARK = "#111111";
  const WHITE = "#FFFFFF";
  const LIGHT_GRAY = "#F8F8F8";
  const MID_GRAY = "#888888";
  const LIGHT_GOLD = "#F9F6EE";
  const GREEN = "#2D7A4F";
  const LIGHT_GREEN = "#F0F8F4";

  const images = parseImages(bien.images);
  const allImgs = bien.imagePrincipale ? [bien.imagePrincipale, ...images.filter(i => i !== bien.imagePrincipale)] : images;
  const photoUrls = allImgs.slice(0, 4);

  // Télécharger les photos
  const photoBuffers: Buffer[] = [];
  for (const url of photoUrls) {
    try {
      const buf = await fetchBuffer(url);
      photoBuffers.push(buf);
    } catch {
      // ignore
    }
  }

  const lots: Array<{ type: string; surface?: string; loyer?: string; statut?: string }> = (() => {
    if (!bien.lots) return [];
    // Drizzle peut retourner un tableau déjà parsé
    if (Array.isArray(bien.lots)) return bien.lots as any[];
    try { return JSON.parse(bien.lots as string); } catch { return []; }
  })();

  const situation: string[] = (() => {
    if (!bien.situation) return [];
    // Drizzle peut retourner un tableau déjà parsé
    if (Array.isArray(bien.situation)) return bien.situation as string[];
    const raw = bien.situation as string;
    // Peut être une liste CSV séparée par virgules
    if (raw.startsWith("[")) {
      try { return JSON.parse(raw); } catch { return raw.split(",").map(s => s.trim()).filter(Boolean); }
    }
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  })();

  const typeLabel = (bien.typeBien ?? "Bien immobilier")
    .charAt(0).toUpperCase() + (bien.typeBien ?? "Bien immobilier").slice(1).replace(/_/g, " ");

  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));

  const W = doc.page.width;   // 595.28
  const H = doc.page.height;  // 841.89
  const M = 36; // marge latérale

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════════════════════════
  doc.rect(0, 0, W, H).fill(WHITE);

  // ── HEADER (fond noir) ──
  const headerH = 56;
  doc.rect(0, 0, W, headerH).fill(DARK);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(GOLD).text("SIGMA FACTORY", M, 14, { width: W - M * 2 });
  doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY).text("PÔLE IMMOBILIER — BIENS OFF MARKET", M, 32);
  // Badge confidentiel
  doc.rect(W - M - 100, 16, 100, 22).fill(GOLD);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(DARK).text("DOCUMENT CONFIDENTIEL", W - M - 100, 22, { width: 100, align: "center" });

  // ── BARRE CONFIDENTIELLE ──
  doc.rect(0, headerH, W, 20).fill(LIGHT_GOLD);
  doc.rect(0, headerH + 19, W, 1).fill(GOLD);
  doc.font("Helvetica").fontSize(7).fillColor(GOLD).text(
    "⬥  OPPORTUNITÉ OFF MARKET — ACCÈS EXCLUSIF RÉSERVÉ  ⬥",
    0, headerH + 6, { width: W, align: "center" }
  );

  let y = headerH + 28;

  // ── HERO : TITRE + PRIX ──
  doc.font("Helvetica").fontSize(8).fillColor(GOLD).text(typeLabel.toUpperCase(), M, y, { characterSpacing: 2 });
  y += 14;
  doc.font("Helvetica-Bold").fontSize(18).fillColor(DARK).text(bien.titre, M, y, { width: W - M * 2 });
  doc.font("Helvetica-Bold").fontSize(18);
  y += doc.heightOfString(bien.titre, { width: W - M * 2 }) + 4;
  if (bien.region) {
    doc.font("Helvetica").fontSize(10).fillColor(MID_GRAY).text(`📍 ${bien.region}`, M, y);
    y += 14;
  }
  doc.font("Helvetica-Bold").fontSize(22).fillColor(GOLD).text(fmtPrice(bien.prixBien), M, y);
  y += 30;

  // ── PHOTOS ──
  if (photoBuffers.length > 0) {
    const photoAreaH = 200;
    if (photoBuffers.length === 1) {
      doc.image(photoBuffers[0], M, y, { width: W - M * 2, height: photoAreaH, cover: [W - M * 2, photoAreaH] });
    } else if (photoBuffers.length === 2) {
      const pw = (W - M * 2 - 4) / 2;
      doc.image(photoBuffers[0], M, y, { width: pw, height: photoAreaH, cover: [pw, photoAreaH] });
      doc.image(photoBuffers[1], M + pw + 4, y, { width: pw, height: photoAreaH, cover: [pw, photoAreaH] });
    } else {
      const mainW = (W - M * 2) * 0.6 - 2;
      const sideW = (W - M * 2) * 0.4 - 2;
      const sideH = (photoAreaH - 4) / 2;
      doc.image(photoBuffers[0], M, y, { width: mainW, height: photoAreaH, cover: [mainW, photoAreaH] });
      doc.image(photoBuffers[1], M + mainW + 4, y, { width: sideW, height: sideH, cover: [sideW, sideH] });
      if (photoBuffers[2]) {
        doc.image(photoBuffers[2], M + mainW + 4, y + sideH + 4, { width: sideW, height: sideH, cover: [sideW, sideH] });
      }
    }
    y += photoAreaH + 14;
  }

  // ── DONNÉES FINANCIÈRES ──
  const sectionTitleY = y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("DONNÉES FINANCIÈRES", M, sectionTitleY, { characterSpacing: 1.5 });
  doc.rect(M, sectionTitleY + 12, W - M * 2, 1).fill(GOLD);
  y = sectionTitleY + 18;

  const colW = (W - M * 2 - 8) / 3;
  const cellH = 38;

  // Ligne 1 : Prix bien, Honoraires, Travaux
  const finRow1 = [
    { label: "Prix du bien", value: fmtPrice(bien.prixBien), gold: false },
    { label: "Honoraires", value: fmtPrice(bien.honoraires), gold: false },
    { label: "Travaux estimés", value: fmtPrice(bien.travauxEstimation), gold: false },
  ];
  finRow1.forEach((item, i) => {
    const cx = M + i * (colW + 4);
    doc.rect(cx, y, colW, cellH).fill(LIGHT_GRAY);
    doc.font("Helvetica").fontSize(7).fillColor(MID_GRAY).text(item.label.toUpperCase(), cx + 6, y + 6, { width: colW - 12, characterSpacing: 0.5 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text(item.value, cx + 6, y + 18, { width: colW - 12 });
  });
  y += cellH + 4;

  // Ligne 2 : Investissement total (pleine largeur)
  doc.rect(M, y, W - M * 2, cellH).fill(LIGHT_GOLD);
  doc.rect(M, y, 3, cellH).fill(GOLD);
  doc.font("Helvetica").fontSize(7).fillColor(GOLD).text("INVESTISSEMENT TOTAL (FAI + NOTAIRE + TRAVAUX)", M + 10, y + 6, { width: W - M * 2 - 20, characterSpacing: 0.5 });
  doc.font("Helvetica-Bold").fontSize(14).fillColor(GOLD).text(fmtPrice(bien.investissementTotal), M + 10, y + 18, { width: W - M * 2 - 20 });
  y += cellH + 8;

  // Revenus (si disponibles)
  const hasRevenus = bien.revenusAnnuels || bien.revenusPotenlielsLd || bien.revenusPotentielsCd;
  if (hasRevenus) {
    const revRow = [
      { label: "Revenus annuels actuels", value: fmtPrice(bien.revenusAnnuels) },
      { label: "Revenus potentiels LD", value: fmtPrice(bien.revenusPotenlielsLd) },
      { label: "Revenus potentiels CD", value: fmtPrice(bien.revenusPotentielsCd) },
    ];
    revRow.forEach((item, i) => {
      const cx = M + i * (colW + 4);
      doc.rect(cx, y, colW, cellH).fill(LIGHT_GREEN);
      doc.font("Helvetica").fontSize(7).fillColor(GREEN).text(item.label.toUpperCase(), cx + 6, y + 6, { width: colW - 12, characterSpacing: 0.5 });
      doc.font("Helvetica-Bold").fontSize(11).fillColor(GREEN).text(item.value, cx + 6, y + 18, { width: colW - 12 });
    });
    y += cellH + 8;
  }

  // Rentabilités (si disponibles)
  const hasRentab = bien.rentabiliteBrute || bien.rentabilitePotentielleLd || bien.rentabilitePotentielleCd;
  if (hasRentab) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("RENTABILITÉS", M, y, { characterSpacing: 1.5 });
    doc.rect(M, y + 12, W - M * 2, 1).fill(GOLD);
    y += 18;

    const rentRow = [
      { label: "Brute actuelle", value: fmtPct(bien.rentabiliteBrute) },
      { label: "Potentielle LD", value: fmtPct(bien.rentabilitePotentielleLd) },
      { label: "Potentielle CD", value: fmtPct(bien.rentabilitePotentielleCd) },
    ];
    rentRow.forEach((item, i) => {
      const cx = M + i * (colW + 4);
      doc.rect(cx, y, colW, cellH).fill(LIGHT_GREEN);
      doc.rect(cx, y, colW, 3).fill(GREEN);
      doc.font("Helvetica").fontSize(7).fillColor(GREEN).text(item.label.toUpperCase(), cx + 6, y + 9, { width: colW - 12, characterSpacing: 0.5 });
      doc.font("Helvetica-Bold").fontSize(14).fillColor(GREEN).text(item.value, cx + 6, y + 20, { width: colW - 12 });
    });
    y += cellH + 8;
  }

  // ── COMPOSITION (LOTS) ──
  if (lots.length > 0 && y < H - 150) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text(`COMPOSITION — ${bien.nbLots ?? lots.length} LOT${(bien.nbLots ?? lots.length) > 1 ? "S" : ""}`, M, y, { characterSpacing: 1.5 });
    doc.rect(M, y + 12, W - M * 2, 1).fill(GOLD);
    y += 18;

    // En-tête tableau
    const colsLots = [
      { label: "#", w: 20 },
      { label: "Type", w: 160 },
      { label: "Surface", w: 70 },
      { label: "Loyer", w: 80 },
      { label: "Statut", w: 100 },
    ];
    doc.rect(M, y, W - M * 2, 18).fill(DARK);
    let cx = M;
    colsLots.forEach(col => {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD).text(col.label, cx + 4, y + 5, { width: col.w - 8, characterSpacing: 0.5 });
      cx += col.w;
    });
    y += 18;

    lots.forEach((lot, i) => {
      const rowH = 16;
      doc.rect(M, y, W - M * 2, rowH).fill(i % 2 === 0 ? WHITE : LIGHT_GRAY);
      let cx2 = M;
      const isLoue = lot.statut?.toLowerCase().includes("loué") || lot.statut?.toLowerCase().includes("loue");
      const rowData = [
        { text: String(i + 1), color: MID_GRAY },
        { text: lot.type || "—", color: DARK },
        { text: lot.surface || "—", color: DARK },
        { text: lot.loyer || "—", color: GOLD },
        { text: lot.statut || "—", color: isLoue ? GREEN : MID_GRAY },
      ];
      colsLots.forEach((col, j) => {
        doc.font(j === 3 ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(rowData[j].color)
          .text(rowData[j].text, cx2 + 4, y + 4, { width: col.w - 8 });
        cx2 += col.w;
      });
      y += rowH;
    });
    y += 10;
  }

  // ── SITUATION ──
  if (situation.length > 0 && y < H - 100) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("SITUATION", M, y, { characterSpacing: 1.5 });
    doc.rect(M, y + 12, W - M * 2, 1).fill(GOLD);
    y += 20;
    situation.forEach(s => {
      if (y < H - 60) {
        doc.font("Helvetica").fontSize(7).fillColor(GOLD).text("•", M, y);
        doc.font("Helvetica").fontSize(9).fillColor(DARK).text(s, M + 12, y, { width: W - M * 2 - 12 });
        y += 14;
      }
    });
    y += 4;
  }

  // ── INFOS GÉNÉRALES ──
  if (y < H - 80) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("INFORMATIONS GÉNÉRALES", M, y, { characterSpacing: 1.5 });
    doc.rect(M, y + 12, W - M * 2, 1).fill(GOLD);
    y += 18;
    const infos = [
      { label: "Type de bien", value: typeLabel },
      { label: "Région", value: bien.region },
      { label: "Surface totale", value: bien.surfaceTotale ? `${bien.surfaceTotale} m²` : null },
      { label: "Nombre de lots", value: bien.nbLots?.toString() },
    ].filter(i => i.value);

    const infoColW = (W - M * 2 - 4) / 2;
    infos.forEach((info, i) => {
      const cx = M + (i % 2) * (infoColW + 4);
      const rowY = y + Math.floor(i / 2) * 34;
      if (rowY < H - 60) {
        doc.rect(cx, rowY, infoColW, 30).fill(LIGHT_GRAY);
        doc.font("Helvetica").fontSize(7).fillColor(MID_GRAY).text(info.label.toUpperCase(), cx + 6, rowY + 5, { width: infoColW - 12, characterSpacing: 0.5 });
        doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK).text(info.value!, cx + 6, rowY + 16, { width: infoColW - 12 });
      }
    });
  }

  // ── FOOTER ──
  doc.rect(0, H - 36, W, 36).fill(DARK);
  doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY).text("SIGMA FACTORY — Document confidentiel — Ne pas diffuser", M, H - 24, { width: W - M * 2 - 120 });
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("elodie@sigmafactory.fr", W - M - 110, H - 24, { width: 110, align: "right" });

  // Finaliser le PDF
  doc.end();

  return new Promise<string>((resolve, reject) => {
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const key = `off-market-fiches/fiche-${bien.id}-${Date.now()}.pdf`;
        const { url } = await storagePut(key, pdfBuffer, "application/pdf");
        resolve(url);
      } catch (err) {
        reject(err);
      }
    });
    doc.on("error", reject);
  });
}

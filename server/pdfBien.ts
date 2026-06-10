import PDFDocument from "pdfkit";
import https from "https";
import http from "http";
import { imageSize } from "image-size";

export interface BienPdfData {
  reference: string;
  typeBien: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  surface?: number;
  nbPieces?: number;
  prix?: number;
  prixNetVendeur?: number;
  honorairesAgence?: number;
  description?: string;
  dpeLettre?: string;
  gesLettre?: string;
  chargesAnnuelles?: number;
  taxeFonciere?: number;
  anneeConstruction?: number;
  etatBien?: string;
  balconTerrasse?: boolean;
  parkingGarage?: boolean;
  calme?: boolean;
  lumineux?: boolean;
  cave?: boolean;
  ascenseur?: boolean;
  photos?: string[];
  agentNom?: string;
  agentPoste?: string;
  agentEmail?: string;
  agentTelephone?: string;
  etage?: number;
  dpeConso?: number;
  gesConso?: number;
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

/** Formate un prix en euros sans caractères spéciaux */
function fmt(n?: number): string {
  if (n == null) return "—";
  // Formatage manuel pour éviter les espaces insécables et les "/" de toLocaleString
  const parts = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts + " EUR";
}

function capitalize(s?: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function generateBienPdf(bien: BienPdfData): Promise<Buffer> {
  // Télécharger les photos
  const photoUrls = (bien.photos ?? []).slice(0, 6);
  const photoBuffers: Buffer[] = [];
  for (const url of photoUrls) {
    try {
      const buf = await fetchBuffer(url);
      photoBuffers.push(buf);
    } catch {
      // ignore
    }
  }

  const GOLD = "#C9A84C";
  const DARK = "#111111";
  const WHITE = "#FFFFFF";
  const LIGHT_GRAY = "#F5F5F5";
  const MID_GRAY = "#888888";
  const BORDER_GRAY = "#E0E0E0";

  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));

  const W = doc.page.width;   // 595.28
  const H = doc.page.height;  // 841.89
  const M = 36; // marge latérale

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : HEADER + PHOTO PLEINE LARGEUR + INFOS EN DESSOUS
  // ══════════════════════════════════════════════════════════════════════════

  // Fond blanc
  doc.rect(0, 0, W, H).fill(WHITE);

  // ── HEADER (fond noir, hauteur 60px) ──
  const HEADER_H = 60;
  doc.rect(0, 0, W, HEADER_H).fill(DARK);

  // Bande dorée en bas du header
  doc.rect(0, HEADER_H - 3, W, 3).fill(GOLD);

  // Logo / nom
  doc.fillColor(GOLD).fontSize(16).font("Helvetica-Bold")
    .text("SIGMA FACTORY", M, 16);
  doc.fillColor(WHITE).fontSize(8).font("Helvetica")
    .text("Réseau immobilier premium", M, 36);

  // Référence à droite
  doc.fillColor(WHITE).fontSize(8).font("Helvetica")
    .text(`Réf. ${bien.reference}`, W - M - 100, 22, { width: 100, align: "right" });
  doc.fillColor(MID_GRAY).fontSize(7).font("Helvetica")
    .text(new Date().toLocaleDateString("fr-FR"), W - M - 100, 36, { width: 100, align: "right" });

  // ── PHOTO PRINCIPALE ──
  // La photo occupe toute la largeur, hauteur proportionnelle (max 380px)
  const PHOTO_Y = HEADER_H;
  const MAX_PHOTO_H = 380;

  if (photoBuffers.length > 0) {
    try {
      const dims = imageSize(photoBuffers[0]);
      const imgW = dims.width ?? 800;
      const imgH = dims.height ?? 600;
      const ratio = imgH / imgW;

      // Largeur = pleine page, hauteur = proportionnelle mais max 380px
      const drawW = W;
      let drawH = Math.round(W * ratio);
      if (drawH > MAX_PHOTO_H) drawH = MAX_PHOTO_H;

      // Fond gris en cas d'image plus petite
      doc.rect(0, PHOTO_Y, W, drawH).fill(LIGHT_GRAY);

      // Centrer verticalement si image plus petite que drawH
      const actualH = Math.min(drawH, Math.round(W * ratio));
      const offsetY = PHOTO_Y + (drawH - actualH) / 2;

      doc.image(photoBuffers[0], 0, offsetY, { width: drawW, height: actualH });

      // Mettre à jour la position Y après la photo
      const INFO_Y = PHOTO_Y + drawH;

      // ── INFOS SOUS LA PHOTO (fond blanc) ──
      drawInfosPage1(doc, bien, INFO_Y, W, H, M, GOLD, DARK, WHITE, MID_GRAY, LIGHT_GRAY, BORDER_GRAY, fmt, capitalize);

    } catch {
      // Pas de photo : afficher un placeholder gris
      doc.rect(0, PHOTO_Y, W, 260).fill(LIGHT_GRAY);
      doc.fillColor(MID_GRAY).fontSize(10).font("Helvetica")
        .text("Photo non disponible", 0, PHOTO_Y + 120, { align: "center", width: W });
      const INFO_Y = PHOTO_Y + 260;
      drawInfosPage1(doc, bien, INFO_Y, W, H, M, GOLD, DARK, WHITE, MID_GRAY, LIGHT_GRAY, BORDER_GRAY, fmt, capitalize);
    }
  } else {
    // Pas de photo : placeholder
    doc.rect(0, PHOTO_Y, W, 260).fill(LIGHT_GRAY);
    doc.fillColor(MID_GRAY).fontSize(10).font("Helvetica")
      .text("Photo non disponible", 0, PHOTO_Y + 120, { align: "center", width: W });
    const INFO_Y = PHOTO_Y + 260;
    drawInfosPage1(doc, bien, INFO_Y, W, H, M, GOLD, DARK, WHITE, MID_GRAY, LIGHT_GRAY, BORDER_GRAY, fmt, capitalize);
  }

  // ── FOOTER PAGE 1 ──
  drawFooter(doc, W, H, M, DARK, GOLD, MID_GRAY);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : CARACTÉRISTIQUES + GALERIE + DESCRIPTION + AGENT
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.rect(0, 0, W, H).fill(WHITE);

  // Header page 2
  doc.rect(0, 0, W, HEADER_H).fill(DARK);
  doc.rect(0, HEADER_H - 3, W, 3).fill(GOLD);
  doc.fillColor(GOLD).fontSize(14).font("Helvetica-Bold")
    .text("SIGMA FACTORY", M, 20);
  doc.fillColor(MID_GRAY).fontSize(8).font("Helvetica")
    .text(`Réf. ${bien.reference}`, W - M - 100, 24, { width: 100, align: "right" });

  let y = HEADER_H + 20;

  // ── CARACTÉRISTIQUES ──
  doc.fillColor(DARK).fontSize(11).font("Helvetica-Bold")
    .text("CARACTÉRISTIQUES", M, y);
  doc.rect(M, y + 16, 40, 2).fill(GOLD);
  y += 28;

  const colW = (W - 2 * M) / 3;
  const chars: { label: string; value: string }[] = [];
  if (bien.surface) chars.push({ label: "Surface", value: `${bien.surface} m²` });
  if (bien.nbPieces) chars.push({ label: "Pièces", value: String(bien.nbPieces) });
  if (bien.etage !== undefined && bien.etage !== null) chars.push({ label: "Étage", value: String(bien.etage) });
  if (bien.anneeConstruction) chars.push({ label: "Année construction", value: String(bien.anneeConstruction) });
  if (bien.etatBien) chars.push({ label: "État du bien", value: capitalize(bien.etatBien) });
  if (bien.dpeLettre) chars.push({ label: "DPE", value: bien.dpeLettre + (bien.dpeConso ? ` (${bien.dpeConso} kWh/m²)` : "") });
  if (bien.gesLettre) chars.push({ label: "GES", value: bien.gesLettre + (bien.gesConso ? ` (${bien.gesConso} kg CO²)` : "") });
  if (bien.chargesAnnuelles) chars.push({ label: "Charges annuelles", value: fmt(bien.chargesAnnuelles) });
  if (bien.taxeFonciere) chars.push({ label: "Taxe foncière", value: fmt(bien.taxeFonciere) });

  const nbRows = Math.ceil(chars.length / 3);
  for (let i = 0; i < chars.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = M + col * colW;
    const cy = y + row * 42;
    doc.rect(cx + 2, cy, colW - 6, 36).fill(LIGHT_GRAY);
    doc.fillColor(MID_GRAY).fontSize(7).font("Helvetica")
      .text(chars[i].label.toUpperCase(), cx + 10, cy + 7);
    doc.fillColor(DARK).fontSize(11).font("Helvetica-Bold")
      .text(chars[i].value, cx + 10, cy + 18, { width: colW - 20 });
  }
  y += nbRows * 42 + 8;

  // Atouts (badges)
  const atouts = [
    bien.balconTerrasse ? "Balcon / Terrasse" : null,
    bien.parkingGarage ? "Parking / Garage" : null,
    bien.cave ? "Cave" : null,
    bien.ascenseur ? "Ascenseur" : null,
    bien.calme ? "Calme" : null,
    bien.lumineux ? "Lumineux" : null,
  ].filter(Boolean) as string[];

  if (atouts.length > 0) {
    let bx = M;
    for (const atout of atouts) {
      const tw = doc.widthOfString(atout) + 16;
      doc.rect(bx, y, tw, 20).fill(LIGHT_GRAY);
      doc.rect(bx, y, 3, 20).fill(GOLD);
      doc.fillColor(DARK).fontSize(8).font("Helvetica")
        .text(atout, bx + 8, y + 6);
      bx += tw + 6;
      if (bx > W - M - 80) { bx = M; y += 26; }
    }
    y += 28;
  }

  doc.rect(M, y, W - 2 * M, 0.5).fill(BORDER_GRAY);
  y += 16;

  // ── DESCRIPTION ──
  if (bien.description) {
    doc.fillColor(DARK).fontSize(11).font("Helvetica-Bold")
      .text("DESCRIPTION", M, y);
    doc.rect(M, y + 16, 40, 2).fill(GOLD);
    y += 28;
    doc.fillColor("#333333").fontSize(9.5).font("Helvetica")
      .text(bien.description, M, y, { width: W - 2 * M, lineGap: 3 });
    y += doc.heightOfString(bien.description, { width: W - 2 * M, lineGap: 3 }) + 16;
    doc.rect(M, y, W - 2 * M, 0.5).fill(BORDER_GRAY);
    y += 16;
  }

  // ── AGENT (avant la galerie pour éviter les problèmes de positionnement) ──
  if (bien.agentNom) {
    if (y > H - 120) {
      doc.addPage();
      doc.rect(0, 0, W, H).fill(WHITE);
      doc.rect(0, 0, W, HEADER_H).fill(DARK);
      doc.rect(0, HEADER_H - 3, W, 3).fill(GOLD);
      doc.fillColor(GOLD).fontSize(14).font("Helvetica-Bold")
        .text("SIGMA FACTORY", M, 20);
      y = HEADER_H + 20;
    }

    const agentNomPropre = bien.agentNom
      .split("—")[0].split(" — ")[0].split("/")[0].trim();

    doc.rect(M, y, W - 2 * M, 68).fill(LIGHT_GRAY);
    doc.rect(M, y, 3, 68).fill(GOLD);
    const poste = bien.agentPoste ?? "Responsable Pôle Immo";
    doc.fillColor(MID_GRAY).fontSize(7.5).font("Helvetica")
      .text("VOTRE CONTACT SIGMA FACTORY", M + 12, y + 10);
    doc.fillColor(DARK).fontSize(13).font("Helvetica-Bold")
      .text(agentNomPropre, M + 12, y + 24);
    doc.fillColor(GOLD).fontSize(8).font("Helvetica")
      .text(poste + "  —  Sigma Factory", M + 12, y + 40);
    const contact = [bien.agentEmail, bien.agentTelephone].filter(Boolean).join("   ·   ");
    if (contact) {
      doc.fillColor(MID_GRAY).fontSize(8.5).font("Helvetica")
        .text(contact, M + 12, y + 54);
    }
    y += 84;
    doc.rect(M, y, W - 2 * M, 0.5).fill(BORDER_GRAY);
    y += 16;
  }

  // ── GALERIE PHOTOS (toujours en dernier) ──
  if (photoBuffers.length > 1) {
    const galleryPhotos = photoBuffers.slice(1, 5);
    const photoW = (W - 2 * M - 8) / 2;
    const photoH = 140;
    const GAP = 8;

    // Vérifier si on a assez de place pour le titre + au moins une rangée
    if (y > H - 220) {
      doc.addPage();
      doc.rect(0, 0, W, H).fill(WHITE);
      doc.rect(0, 0, W, HEADER_H).fill(DARK);
      doc.rect(0, HEADER_H - 3, W, 3).fill(GOLD);
      doc.fillColor(GOLD).fontSize(14).font("Helvetica-Bold")
        .text("SIGMA FACTORY", M, 20);
      y = HEADER_H + 20;
    }

    doc.fillColor(DARK).fontSize(11).font("Helvetica-Bold")
      .text("GALERIE PHOTOS", M, y);
    doc.rect(M, y + 16, 40, 2).fill(GOLD);
    y += 28;

    // Placer les photos 2 par rangée avec gestion correcte des sauts de page
    let col = 0;
    let rowStartY = y;
    for (let i = 0; i < galleryPhotos.length; i++) {
      if (col === 0 && rowStartY + photoH > H - 40) {
        doc.addPage();
        doc.rect(0, 0, W, H).fill(WHITE);
        doc.rect(0, 0, W, HEADER_H).fill(DARK);
        doc.rect(0, HEADER_H - 3, W, 3).fill(GOLD);
        doc.fillColor(GOLD).fontSize(14).font("Helvetica-Bold")
          .text("SIGMA FACTORY", M, 20);
        rowStartY = HEADER_H + 20;
      }
      const px = M + col * (photoW + GAP);
      try {
        doc.rect(px, rowStartY, photoW, photoH).fill(LIGHT_GRAY);
        doc.image(galleryPhotos[i], px, rowStartY, {
          width: photoW, height: photoH, cover: [photoW, photoH],
        });
      } catch { /* skip */ }
      col++;
      if (col === 2) { col = 0; rowStartY += photoH + GAP; }
    }
    if (col !== 0) rowStartY += photoH + GAP;
    y = rowStartY;
  }

  // Footer page 2
  drawFooter(doc, W, H, M, DARK, GOLD, MID_GRAY);

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/** Dessine les informations sous la photo en page 1 */
function drawInfosPage1(
  doc: InstanceType<typeof PDFDocument>,
  bien: BienPdfData,
  infoY: number,
  W: number,
  H: number,
  M: number,
  GOLD: string,
  DARK: string,
  WHITE: string,
  MID_GRAY: string,
  LIGHT_GRAY: string,
  BORDER_GRAY: string,
  fmt: (n?: number) => string,
  capitalize: (s?: string) => string,
) {
  const FOOTER_H = 36;
  const availableH = H - infoY - FOOTER_H;

  // Fond blanc pour la zone infos
  doc.rect(0, infoY, W, availableH).fill(WHITE);

  let y = infoY + 20;

  // Type de bien (grand titre)
  doc.fillColor(DARK).fontSize(22).font("Helvetica-Bold")
    .text(capitalize(bien.typeBien), M, y);
  y += 30;
  // Adresse volontairement masquée (confidentialité off-market / PAP / ambassadeur)
  // Séparateur doré
  doc.rect(M, y, 50, 2).fill(GOLD);
  y += 14;

  // Prix FAI
  if (bien.prix) {
    doc.fillColor(GOLD).fontSize(24).font("Helvetica-Bold")
      .text(fmt(bien.prix), M, y);
    y += 32;

    // Décomposition prix sur la même ligne
    if (bien.prixNetVendeur || bien.honorairesAgence) {
      const parts = [];
      if (bien.prixNetVendeur) parts.push(`Net vendeur : ${fmt(bien.prixNetVendeur)}`);
      if (bien.honorairesAgence) parts.push(`Honoraires : ${fmt(bien.honorairesAgence)}`);
      doc.fillColor(MID_GRAY).fontSize(8.5).font("Helvetica")
        .text(parts.join("   ·   "), M, y);
      y += 16;
    }
  }

  // Résumé rapide (surface + pièces) sur une ligne
  const quickInfo = [];
  if (bien.surface) quickInfo.push(`${bien.surface} m²`);
  if (bien.nbPieces) quickInfo.push(`${bien.nbPieces} pièce${bien.nbPieces > 1 ? "s" : ""}`);
  if (bien.etatBien) quickInfo.push(capitalize(bien.etatBien));
  if (quickInfo.length > 0) {
    doc.fillColor(DARK).fontSize(10).font("Helvetica")
      .text(quickInfo.join("   ·   "), M, y);
  }
}

/** Dessine le footer en bas de page */
function drawFooter(
  doc: InstanceType<typeof PDFDocument>,
  W: number,
  H: number,
  M: number,
  DARK: string,
  GOLD: string,
  MID_GRAY: string,
) {
  const footerY = H - 28;
  doc.rect(0, footerY - 6, W, 34).fill(DARK);
  doc.fillColor(GOLD).fontSize(8).font("Helvetica-Bold")
    .text("sigma.factory", M, footerY);
  doc.fillColor(MID_GRAY).fontSize(7.5).font("Helvetica")
    .text("Document confidentiel — Usage exclusif du destinataire", 0, footerY, {
      align: "center",
      width: W,
    });
  doc.fillColor(MID_GRAY).fontSize(7.5).font("Helvetica")
    .text(new Date().toLocaleDateString("fr-FR"), W - M - 60, footerY, {
      width: 60,
      align: "right",
    });
}

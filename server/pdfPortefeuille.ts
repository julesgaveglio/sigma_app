import PDFDocument from "pdfkit";
import https from "https";
import http from "http";

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

function fmt(n?: number | null): string {
  if (n == null) return "—";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " EUR";
}

export interface BienPortefeuille {
  id: number;
  titre: string;
  typeBien?: string;
  ville?: string;
  region?: string;
  departement?: string;
  surface?: number | null;
  prix?: number | null;
  rentabiliteBrute?: number | null;
  statut?: string;
  source: "ambassadeur" | "pap" | "off_market";
  photoPrincipaleUrl?: string | null;
  imagePrincipale?: string | null;
  reference?: string;
  nbLots?: number | null;
  investissementTotal?: number | null;
}

export async function generatePortefeuillePdf(biens: BienPortefeuille[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));

  const GOLD = "#C9A84C";
  const DARK = "#0d0d0d";
  const GRAY = "#888888";
  const WIDTH = 515;

  // ─── HEADER ───────────────────────────────────────────────────────────────
  doc.rect(0, 0, 595, 80).fill(DARK);
  doc.fontSize(22).fillColor(GOLD).font("Helvetica-Bold").text("SIGMA FACTORY", 40, 22);
  doc.fontSize(10).fillColor(GRAY).font("Helvetica").text("Portefeuille de biens — Document confidentiel", 40, 50);
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.fontSize(9).fillColor(GRAY).text(dateStr, 40, 62);

  // ─── RÉSUMÉ ───────────────────────────────────────────────────────────────
  doc.moveDown(3);
  const ambassadeurBiens = biens.filter(b => b.source === "ambassadeur");
  const papBiens = biens.filter(b => b.source === "pap");
  const offMarketBiens = biens.filter(b => b.source === "off_market");

  doc.rect(40, doc.y, WIDTH, 50).fill("#111111");
  const summaryY = doc.y + 10;
  doc.fontSize(9).fillColor(GRAY).font("Helvetica").text(`Total biens : ${biens.length}`, 55, summaryY);
  doc.text(`Ambassadeurs : ${ambassadeurBiens.length}`, 55, summaryY + 14);
  doc.text(`PAP : ${papBiens.length}`, 200, summaryY);
  doc.text(`Off Market : ${offMarketBiens.length}`, 200, summaryY + 14);
  const avgPrix = biens.filter(b => b.prix).reduce((s, b) => s + (b.prix ?? 0), 0) / (biens.filter(b => b.prix).length || 1);
  doc.text(`Prix moyen : ${fmt(Math.round(avgPrix))}`, 360, summaryY);
  doc.moveDown(3.5);

  // ─── SECTIONS ─────────────────────────────────────────────────────────────
  const sections: { label: string; items: BienPortefeuille[]; color: string }[] = [
    { label: "Biens Ambassadeurs", items: ambassadeurBiens, color: GOLD },
    { label: "Biens PAP", items: papBiens, color: "#6B8E9F" },
    { label: "Biens Off Market", items: offMarketBiens, color: "#4CAF50" },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;

    // Section header
    doc.rect(40, doc.y, WIDTH, 22).fill(section.color);
    doc.fontSize(10).fillColor("#000000").font("Helvetica-Bold")
      .text(`${section.label} (${section.items.length})`, 50, doc.y - 17);
    doc.moveDown(0.5);

    // Table header
    const tableY = doc.y;
    doc.rect(40, tableY, WIDTH, 18).fill("#1a1a1a");
    doc.fontSize(7).fillColor(GRAY).font("Helvetica-Bold");
    doc.text("BIEN", 50, tableY + 5);
    doc.text("LOCALISATION", 200, tableY + 5);
    doc.text("SURFACE", 310, tableY + 5);
    doc.text("PRIX", 370, tableY + 5);
    doc.text("RENTAB.", 455, tableY + 5);
    doc.text("STATUT", 510, tableY + 5);
    doc.moveDown(1.2);

    // Rows
    for (let i = 0; i < section.items.length; i++) {
      const b = section.items[i];
      const rowY = doc.y;

      // Alternating background
      if (i % 2 === 0) {
        doc.rect(40, rowY, WIDTH, 28).fill("#111111");
      }

      // Photo thumbnail (optional, skip for speed)
      const photoUrl = b.photoPrincipaleUrl ?? b.imagePrincipale;
      let photoLoaded = false;
      if (photoUrl) {
        try {
          const buf = await Promise.race([
            fetchBuffer(photoUrl),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
          ]);
          doc.image(buf, 42, rowY + 2, { width: 36, height: 24, fit: [36, 24] });
          photoLoaded = true;
        } catch { /* skip */ }
      }
      const textX = photoLoaded ? 82 : 50;

      doc.fontSize(8).fillColor("#ffffff").font("Helvetica-Bold")
        .text(b.titre.length > 28 ? b.titre.substring(0, 28) + "…" : b.titre, textX, rowY + 4, { width: 115 });
      if (b.reference) {
        doc.fontSize(6).fillColor(GRAY).font("Helvetica")
          .text(`Réf. ${b.reference}`, textX, rowY + 16, { width: 115 });
      }

      doc.fontSize(7).fillColor("#cccccc").font("Helvetica")
        .text(b.ville ?? b.region ?? "—", 200, rowY + 4, { width: 105 });
      if (b.departement) {
        doc.fontSize(6).fillColor(GRAY).text(b.departement, 200, rowY + 16, { width: 105 });
      }

      doc.fontSize(7).fillColor("#cccccc")
        .text(b.surface ? `${b.surface} m²` : "—", 310, rowY + 9, { width: 55 });

      const prix = b.investissementTotal ?? b.prix;
      doc.fontSize(7).fillColor(GOLD).font("Helvetica-Bold")
        .text(prix ? `${Math.round(prix / 1000)}k €` : "—", 370, rowY + 9, { width: 80 });

      if (b.rentabiliteBrute) {
        doc.fontSize(7).fillColor("#4CAF50").font("Helvetica-Bold")
          .text(`${Number(b.rentabiliteBrute).toFixed(1)}%`, 455, rowY + 9, { width: 50 });
      } else {
        doc.fontSize(7).fillColor(GRAY).font("Helvetica").text("—", 455, rowY + 9, { width: 50 });
      }

      const statutColor = b.statut === "publie" || b.statut === "disponible" ? "#4CAF50"
        : b.statut === "sous_compromis" ? "#FF9800"
        : b.statut === "vendu" ? "#F44336"
        : GRAY;
      doc.fontSize(6).fillColor(statutColor).font("Helvetica-Bold")
        .text((b.statut ?? "—").replace(/_/g, " ").toUpperCase(), 510, rowY + 9, { width: 45 });

      doc.moveDown(1.8);

      // Page break check
      if (doc.y > 750) {
        doc.addPage();
        doc.rect(0, 0, 595, 30).fill(DARK);
        doc.fontSize(8).fillColor(GOLD).font("Helvetica-Bold").text("SIGMA FACTORY — Portefeuille de biens (suite)", 40, 10);
        doc.moveDown(1);
      }
    }

    doc.moveDown(1);
  }

  // ─── FOOTER ───────────────────────────────────────────────────────────────
  const pageCount = (doc as any).bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).fillColor(GRAY).font("Helvetica")
      .text(`Page ${i + 1} / ${pageCount} — Document confidentiel Sigma Factory`, 40, 820, { align: "center", width: WIDTH });
  }

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

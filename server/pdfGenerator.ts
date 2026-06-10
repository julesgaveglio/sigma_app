import puppeteer from "puppeteer-core";
import { storagePut } from "./storage";

interface OffMarketBienData {
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

function formatPrice(n: number | null | undefined): string {
  if (!n) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: string | number | null | undefined): string {
  if (!n) return "—";
  return `${Number(n).toFixed(2)} %`;
}

function parseImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : raw.startsWith("http") ? [raw] : [];
    } catch {
      return raw.startsWith("http") ? [raw] : [];
    }
  }
  return [];
}

function generateHtml(bien: OffMarketBienData): string {
  const images = parseImages(bien.images);
  const mainImg = bien.imagePrincipale || images[0] || null;
  const secondImg = images[1] || null;
  const thirdImg = images[2] || null;

  const lots: Array<{ type: string; surface?: string; loyer?: string; statut?: string }> = (() => {
    try { return bien.lots ? JSON.parse(bien.lots) : []; } catch { return []; }
  })();

  const situation: string[] = (() => {
    try { return bien.situation ? JSON.parse(bien.situation) : []; } catch { return []; }
  })();

  const typeLabel = (bien.typeBien ?? "Bien immobilier")
    .charAt(0).toUpperCase() + (bien.typeBien ?? "Bien immobilier").slice(1).replace(/_/g, " ");

  const hasRentab = bien.rentabiliteBrute || bien.rentabilitePotentielleLd || bien.rentabilitePotentielleCd;
  const hasRevenus = bien.revenusAnnuels || bien.revenusPotenlielsLd || bien.revenusPotentielsCd;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fiche Off Market — ${bien.titre}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #fff; color: #0d0d0d; width: 794px; }
  
  .header { background: #0d0d0d; padding: 24px 32px; display: flex; align-items: center; justify-content: space-between; }
  .header-logo { color: #C9A84C; font-size: 20px; font-weight: bold; letter-spacing: 3px; }
  .header-sub { color: #888; font-size: 10px; letter-spacing: 1px; margin-top: 4px; }
  .header-badge { background: #C9A84C; color: #0d0d0d; font-size: 9px; font-weight: bold; padding: 4px 10px; letter-spacing: 1px; text-transform: uppercase; }
  
  .confidential-bar { background: #f9f6ee; border-bottom: 2px solid #C9A84C; padding: 8px 32px; text-align: center; }
  .confidential-bar p { color: #C9A84C; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  
  .hero { padding: 28px 32px 20px; border-bottom: 1px solid #eee; }
  .hero-type { color: #C9A84C; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
  .hero-title { font-size: 22px; font-weight: bold; color: #0d0d0d; margin-bottom: 8px; line-height: 1.3; }
  .hero-region { color: #555; font-size: 13px; }
  .hero-price { font-size: 28px; font-weight: bold; color: #C9A84C; margin-top: 12px; }
  
  .photos-section { padding: 0 32px 20px; }
  .photos-grid { display: grid; gap: 6px; }
  .photos-grid.one { grid-template-columns: 1fr; }
  .photos-grid.two { grid-template-columns: 1fr 1fr; }
  .photos-grid.three { grid-template-columns: 2fr 1fr; grid-template-rows: auto auto; }
  .photo-main { width: 100%; height: 240px; object-fit: cover; }
  .photo-secondary { width: 100%; height: 117px; object-fit: cover; }
  .photo-main-three { grid-row: 1 / 3; width: 100%; height: 240px; object-fit: cover; }
  
  .section { padding: 16px 32px; border-bottom: 1px solid #f0f0f0; }
  .section-title { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #C9A84C; margin-bottom: 12px; font-family: Arial, sans-serif; }
  
  .finance-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .finance-item { background: #f9f9f9; padding: 10px 12px; }
  .finance-item.highlight { background: #f9f6ee; border-left: 3px solid #C9A84C; }
  .finance-item.full-width { grid-column: 1 / -1; }
  .finance-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; font-family: Arial, sans-serif; }
  .finance-value { font-size: 14px; font-weight: bold; color: #0d0d0d; }
  .finance-value.gold { color: #C9A84C; font-size: 16px; }
  .finance-value.green { color: #2d7a4f; }
  
  .rentab-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .rentab-item { background: #f0f8f4; border: 1px solid #c8e6d4; padding: 12px; text-align: center; }
  .rentab-label { font-size: 9px; color: #2d7a4f; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-family: Arial, sans-serif; }
  .rentab-value { font-size: 18px; font-weight: bold; color: #2d7a4f; }
  
  .lots-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .lots-table th { background: #0d0d0d; color: #C9A84C; padding: 7px 10px; text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; font-family: Arial, sans-serif; }
  .lots-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  .lots-table tr:nth-child(even) td { background: #fafafa; }
  .lot-statut-loue { background: #d4edda; color: #155724; padding: 2px 6px; font-size: 10px; border-radius: 2px; }
  .lot-statut-libre { background: #f8f9fa; color: #555; padding: 2px 6px; font-size: 10px; border-radius: 2px; }
  
  .situation-list { list-style: none; }
  .situation-list li { padding: 5px 0; font-size: 13px; color: #333; border-bottom: 1px solid #f5f5f5; display: flex; align-items: flex-start; gap: 8px; }
  .situation-list li::before { content: "•"; color: #C9A84C; font-size: 16px; line-height: 1; flex-shrink: 0; }
  
  .footer { background: #0d0d0d; padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
  .footer-text { color: #888; font-size: 10px; letter-spacing: 1px; }
  .footer-contact { color: #C9A84C; font-size: 10px; }
  
  .no-print-address { display: none; }
</style>
</head>
<body>

<!-- En-tête -->
<div class="header">
  <div>
    <div class="header-logo">SIGMA FACTORY</div>
    <div class="header-sub">PÔLE IMMOBILIER — BIENS OFF MARKET</div>
  </div>
  <div class="header-badge">Document Confidentiel</div>
</div>

<!-- Barre confidentielle -->
<div class="confidential-bar">
  <p>⬥ Opportunité Off Market — Accès Exclusif Réservé ⬥</p>
</div>

<!-- Hero -->
<div class="hero">
  <div class="hero-type">${typeLabel}</div>
  <div class="hero-title">${bien.titre}</div>
  ${bien.region ? `<div class="hero-region">📍 ${bien.region}</div>` : ""}
  <div class="hero-price">${formatPrice(bien.prixBien)}</div>
</div>

<!-- Photos -->
${mainImg ? `
<div class="photos-section" style="padding-top: 16px;">
  <div class="photos-grid ${!secondImg ? "one" : !thirdImg ? "two" : "three"}">
    ${!secondImg ? `
      <img src="${mainImg}" class="photo-main" alt="Photo principale" />
    ` : !thirdImg ? `
      <img src="${mainImg}" class="photo-main" alt="Photo 1" />
      <img src="${secondImg}" class="photo-main" alt="Photo 2" />
    ` : `
      <img src="${mainImg}" class="photo-main-three" alt="Photo principale" />
      <img src="${secondImg}" class="photo-secondary" alt="Photo 2" />
      <img src="${thirdImg}" class="photo-secondary" alt="Photo 3" />
    `}
  </div>
</div>
` : ""}

<!-- Données financières -->
<div class="section">
  <div class="section-title">Données Financières</div>
  <div class="finance-grid">
    <div class="finance-item">
      <div class="finance-label">Prix du bien</div>
      <div class="finance-value">${formatPrice(bien.prixBien)}</div>
    </div>
    <div class="finance-item">
      <div class="finance-label">Honoraires</div>
      <div class="finance-value">${formatPrice(bien.honoraires)}</div>
    </div>
    <div class="finance-item">
      <div class="finance-label">Travaux estimés</div>
      <div class="finance-value">${formatPrice(bien.travauxEstimation)}</div>
    </div>
    <div class="finance-item highlight full-width">
      <div class="finance-label">Investissement Total (FAI + Notaire + Travaux)</div>
      <div class="finance-value gold">${formatPrice(bien.investissementTotal)}</div>
    </div>
    ${hasRevenus ? `
    <div class="finance-item">
      <div class="finance-label">Revenus annuels actuels</div>
      <div class="finance-value green">${formatPrice(bien.revenusAnnuels)}</div>
    </div>
    ${bien.revenusPotenlielsLd ? `
    <div class="finance-item">
      <div class="finance-label">Revenus potentiels LD</div>
      <div class="finance-value green">${formatPrice(bien.revenusPotenlielsLd)}</div>
    </div>
    ` : ""}
    ${bien.revenusPotentielsCd ? `
    <div class="finance-item">
      <div class="finance-label">Revenus potentiels CD</div>
      <div class="finance-value green">${formatPrice(bien.revenusPotentielsCd)}</div>
    </div>
    ` : ""}
    ` : ""}
  </div>
</div>

<!-- Rentabilités -->
${hasRentab ? `
<div class="section">
  <div class="section-title">Rentabilités</div>
  <div class="rentab-grid">
    <div class="rentab-item">
      <div class="rentab-label">Brute Actuelle</div>
      <div class="rentab-value">${formatPct(bien.rentabiliteBrute)}</div>
    </div>
    <div class="rentab-item">
      <div class="rentab-label">Potentielle LD</div>
      <div class="rentab-value">${formatPct(bien.rentabilitePotentielleLd)}</div>
    </div>
    <div class="rentab-item">
      <div class="rentab-label">Potentielle CD</div>
      <div class="rentab-value">${formatPct(bien.rentabilitePotentielleCd)}</div>
    </div>
  </div>
</div>
` : ""}

<!-- Composition (lots) -->
${lots.length > 0 ? `
<div class="section">
  <div class="section-title">Composition — ${bien.nbLots ?? lots.length} lot${(bien.nbLots ?? lots.length) > 1 ? "s" : ""}</div>
  <table class="lots-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Type</th>
        <th>Surface</th>
        <th>Loyer</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      ${lots.map((lot, i) => `
      <tr>
        <td style="color:#888">${i + 1}</td>
        <td>${lot.type || "—"}</td>
        <td>${lot.surface || "—"}</td>
        <td style="color:#C9A84C;font-weight:bold">${lot.loyer || "—"}</td>
        <td>
          ${lot.statut ? `<span class="${(lot.statut.toLowerCase().includes("loué") || lot.statut.toLowerCase().includes("loue")) ? "lot-statut-loue" : "lot-statut-libre"}">${lot.statut}</span>` : "—"}
        </td>
      </tr>
      `).join("")}
    </tbody>
  </table>
</div>
` : ""}

<!-- Situation -->
${situation.length > 0 ? `
<div class="section">
  <div class="section-title">Situation</div>
  <ul class="situation-list">
    ${situation.map(s => `<li>${s}</li>`).join("")}
  </ul>
</div>
` : ""}

<!-- Informations générales -->
<div class="section">
  <div class="section-title">Informations Générales</div>
  <div class="finance-grid">
    ${bien.typeBien ? `<div class="finance-item"><div class="finance-label">Type de bien</div><div class="finance-value" style="font-size:13px">${typeLabel}</div></div>` : ""}
    ${bien.region ? `<div class="finance-item"><div class="finance-label">Région</div><div class="finance-value" style="font-size:13px">${bien.region}</div></div>` : ""}
    ${bien.surfaceTotale ? `<div class="finance-item"><div class="finance-label">Surface totale</div><div class="finance-value" style="font-size:13px">${bien.surfaceTotale} m²</div></div>` : ""}
    ${bien.nbLots ? `<div class="finance-item"><div class="finance-label">Nombre de lots</div><div class="finance-value" style="font-size:13px">${bien.nbLots}</div></div>` : ""}
  </div>
</div>

<!-- Pied de page -->
<div class="footer">
  <div class="footer-text">SIGMA FACTORY — Document confidentiel — Ne pas diffuser</div>
  <div class="footer-contact">elodie@sigmaipf.fr</div>
</div>

</body>
</html>`;
}

export async function generateOffMarketPdf(bien: OffMarketBienData): Promise<string> {
  const html = generateHtml(bien);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    
    const pdfBuffer = await page.pdf({
      width: "794px",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();

    // Upload to S3
    const key = `off-market-fiches/fiche-${bien.id}-${Date.now()}.pdf`;
    const { url } = await storagePut(key, Buffer.from(pdfBuffer), "application/pdf");
    
    return url;
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw err;
  }
}

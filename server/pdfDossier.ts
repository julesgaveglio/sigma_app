import PDFDocument from "pdfkit";
type PDFDoc = InstanceType<typeof PDFDocument>;
import type { Lead } from "../drizzle/schema";
import type { MandatRecherche } from "../drizzle/schema";
import type { DossierFinancement } from "../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DossierPdfData {
  lead: Lead | null;
  mandat: MandatRecherche | null;
  financement: DossierFinancement | null;
}

// ─── Couleurs Sigma Factory ────────────────────────────────────────────────────
const NOIR = "#0A0A0A";
const OR = "#C9A84C";
const GRIS_CLAIR = "#F5F5F0";
const GRIS_TEXTE = "#555555";
const BLANC = "#FFFFFF";
const GRIS_LIGNE = "#E0E0D8";

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function formatMontant(val: number | null | undefined): string {
  if (!val) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  return val;
}

function val(v: string | null | undefined): string {
  return v || "—";
}

function valBool(v: boolean | null | undefined): string {
  return v ? "Oui" : "Non";
}

function drawSectionHeader(doc: PDFDoc, title: string, y: number): number {
  doc.rect(40, y, doc.page.width - 80, 22).fill(NOIR);
  doc.fillColor(OR).fontSize(9).font("Helvetica-Bold")
    .text(title.toUpperCase(), 50, y + 6, { width: doc.page.width - 100 });
  return y + 30;
}

function drawField(doc: PDFDoc, label: string, value: string, x: number, y: number, colWidth: number): number {
  doc.fillColor(GRIS_TEXTE).fontSize(7).font("Helvetica")
    .text(label.toUpperCase(), x, y, { width: colWidth - 4 });
  doc.fillColor(NOIR).fontSize(8.5).font("Helvetica-Bold")
    .text(value, x, y + 9, { width: colWidth - 4 });
  return y + 24;
}

function drawHLine(doc: PDFDoc, y: number): void {
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor(GRIS_LIGNE).lineWidth(0.5).stroke();
}

function checkNewPage(doc: PDFDoc, y: number, needed = 60): number {
  if (y + needed > doc.page.height - 60) {
    doc.addPage();
    return drawPageHeader(doc);
  }
  return y;
}

function drawPageHeader(doc: PDFDoc): number {
  // Bande noire top
  doc.rect(0, 0, doc.page.width, 36).fill(NOIR);
  doc.fillColor(OR).fontSize(10).font("Helvetica-Bold")
    .text("SIGMA FACTORY", 40, 12, { continued: true });
  doc.fillColor(BLANC).fontSize(8).font("Helvetica")
    .text("  —  Dossier de Financement Immobilier", { continued: false });
  doc.fillColor(GRIS_TEXTE).fontSize(7).font("Helvetica")
    .text(`Document confidentiel — ${new Date().toLocaleDateString("fr-FR")}`, doc.page.width - 200, 14, { width: 160, align: "right" });
  return 52;
}

// ─── Générateur principal ─────────────────────────────────────────────────────
export async function generateDossierPdf(data: DossierPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { lead, mandat, financement } = data;
    const pageW = doc.page.width;
    const colW = (pageW - 80 - 16) / 3; // 3 colonnes avec gap
    const col2W = (pageW - 80 - 8) / 2;  // 2 colonnes avec gap

    // ── PAGE 1 : HEADER + ÉTAT CIVIL ─────────────────────────────────────────
    // Bande noire top
    doc.rect(0, 0, pageW, 36).fill(NOIR);
    doc.fillColor(OR).fontSize(13).font("Helvetica-Bold")
      .text("SIGMA FACTORY", 40, 10, { continued: true });
    doc.fillColor(BLANC).fontSize(9).font("Helvetica")
      .text("  —  Dossier de Financement Immobilier", { continued: false });
    doc.fillColor(GRIS_TEXTE).fontSize(7).font("Helvetica")
      .text(`Confidentiel — ${new Date().toLocaleDateString("fr-FR")}`, pageW - 200, 14, { width: 160, align: "right" });

    // Bande or sous le header
    doc.rect(0, 36, pageW, 3).fill(OR);

    let y = 48;

    // Titre dossier
    const nomLead = lead ? `${lead.prenoms} ${lead.nom}`.toUpperCase() : "DOSSIER CLIENT";
    doc.rect(40, y, pageW - 80, 32).fill(GRIS_CLAIR);
    doc.fillColor(NOIR).fontSize(14).font("Helvetica-Bold")
      .text(nomLead, 50, y + 8, { width: pageW - 100 });
    doc.fillColor(OR).fontSize(8).font("Helvetica")
      .text("DOSSIER DE FINANCEMENT IMMOBILIER", pageW - 230, y + 12, { width: 190, align: "right" });
    y += 42;

    // ── SECTION 1 : ÉTAT CIVIL ────────────────────────────────────────────────
    y = drawSectionHeader(doc, "1. État Civil — Acquéreur Principal", y);

    if (lead) {
      // Ligne 1 : Nom, Prénom, Date naissance
      drawField(doc, "Nom", val(lead.nom), 40, y, colW);
      drawField(doc, "Prénom(s)", val(lead.prenoms), 40 + colW + 8, y, colW);
      drawField(doc, "Date de naissance", formatDate(lead.dateNaissance), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      // Ligne 2 : Lieu naissance, Nationalité, Profession
      drawField(doc, "Lieu de naissance", val(lead.lieuNaissance), 40, y, colW);
      drawField(doc, "Nationalité", val(lead.nationalite), 40 + colW + 8, y, colW);
      drawField(doc, "Profession", val(lead.profession), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      // Ligne 3 : Situation familiale, Adresse
      drawField(doc, "Situation familiale", val(lead.situationFamiliale), 40, y, colW);
      drawField(doc, "Adresse", val(lead.adresse), 40 + colW + 8, y, col2W);
      y += 28;
      drawHLine(doc, y); y += 6;

      // Ligne 4 : Téléphones, Email
      drawField(doc, "Tél. portable", val(lead.telephonePortable), 40, y, colW);
      drawField(doc, "Tél. domicile", val(lead.telephoneDomicile), 40 + colW + 8, y, colW);
      drawField(doc, "Email", val(lead.email), 40 + 2 * (colW + 8), y, colW);
      y += 28;

      // Conjoint (si applicable)
      if (lead.conjointNom || lead.conjointPrenoms) {
        y += 4;
        y = checkNewPage(doc, y, 100);
        y = drawSectionHeader(doc, "1b. État Civil — Conjoint / Co-acquéreur", y);
        drawField(doc, "Nom", val(lead.conjointNom), 40, y, colW);
        drawField(doc, "Prénom(s)", val(lead.conjointPrenoms), 40 + colW + 8, y, colW);
        drawField(doc, "Date de naissance", formatDate(lead.conjointDateNaissance), 40 + 2 * (colW + 8), y, colW);
        y += 28;
        drawHLine(doc, y); y += 6;
        drawField(doc, "Lieu de naissance", val(lead.conjointLieuNaissance), 40, y, colW);
        drawField(doc, "Profession", val(lead.conjointProfession), 40 + colW + 8, y, colW);
        drawField(doc, "Email", val(lead.conjointEmail), 40 + 2 * (colW + 8), y, colW);
        y += 28;
        drawHLine(doc, y); y += 6;
        drawField(doc, "Tél. portable", val(lead.conjointTelephonePortable), 40, y, colW);
        drawField(doc, "Tél. domicile", val(lead.conjointTelephoneDomicile), 40, y, colW);
        y += 28;
      }

      // Régime matrimonial si marié
      if (lead.situationFamiliale === "marie" && (lead.regimeMatrimonial || lead.dateMariage)) {
        y += 4;
        y = checkNewPage(doc, y, 80);
        y = drawSectionHeader(doc, "1c. Régime Matrimonial", y);
        drawField(doc, "Commune de mariage", val(lead.communeMariage), 40, y, colW);
        drawField(doc, "Date de mariage", formatDate(lead.dateMariage), 40 + colW + 8, y, colW);
        drawField(doc, "Régime matrimonial", val(lead.regimeMatrimonial), 40 + 2 * (colW + 8), y, colW);
        y += 28;
        if (lead.contratMariage) {
          drawHLine(doc, y); y += 6;
          drawField(doc, "Contrat de mariage", valBool(lead.contratMariage), 40, y, colW);
          drawField(doc, "Notaire (nom)", val(lead.notaireContratNom), 40 + colW + 8, y, colW);
          drawField(doc, "Lieu notaire", val(lead.notaireContratLieu), 40 + 2 * (colW + 8), y, colW);
          y += 28;
        }
      }
    } else {
      doc.fillColor(GRIS_TEXTE).fontSize(9).font("Helvetica-Oblique")
        .text("Aucune fiche d'état civil disponible pour ce dossier.", 50, y + 4);
      y += 24;
    }

    y += 8;

    // ── SECTION 2 : MANDAT DE RECHERCHE ──────────────────────────────────────
    y = checkNewPage(doc, y, 120);
    y = drawSectionHeader(doc, "2. Mandat de Recherche", y);

    if (mandat) {
      // Bien recherché
      const typeBienLabel: Record<string, string> = {
        appartement: "Appartement", maison: "Maison", villa: "Villa",
        terrain: "Terrain", local_commercial: "Local commercial", autre: "Autre"
      };
      const usageLabel: Record<string, string> = {
        residence_principale: "Résidence principale",
        residence_secondaire: "Résidence secondaire",
        investissement_locatif: "Investissement locatif"
      };

      drawField(doc, "Type de bien", typeBienLabel[mandat.typeBien] || val(mandat.typeBien), 40, y, colW);
      drawField(doc, "Usage", usageLabel[mandat.usage] || val(mandat.usage), 40 + colW + 8, y, colW);
      drawField(doc, "Localisation souhaitée", val(mandat.localisation), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      drawField(doc, "Surface min (m²)", mandat.surfaceMin ? `${mandat.surfaceMin} m²` : "—", 40, y, colW);
      drawField(doc, "Surface max (m²)", mandat.surfaceMax ? `${mandat.surfaceMax} m²` : "—", 40 + colW + 8, y, colW);
      drawField(doc, "Nb pièces", mandat.nbPiecesMin ? `${mandat.nbPiecesMin}${mandat.nbPiecesMax ? ` à ${mandat.nbPiecesMax}` : "+"}` : "—", 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      drawField(doc, "Budget maximum", formatMontant(mandat.budgetMax), 40, y, colW);
      drawField(doc, "Mode de financement", val(mandat.modeFinancement), 40 + colW + 8, y, colW);
      drawField(doc, "Apport personnel", formatMontant(mandat.apportPersonnel), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      // Critères
      const criteres: string[] = [];
      if (mandat.balconTerrasse) criteres.push("Balcon/Terrasse");
      if (mandat.parkingGarage) criteres.push("Parking/Garage");
      if (mandat.cave) criteres.push("Cave");
      if (mandat.ascenseur) criteres.push("Ascenseur");
      if (mandat.gardien) criteres.push("Gardien");
      if (mandat.calme) criteres.push("Calme");
      if (mandat.lumineux) criteres.push("Lumineux");
      if (mandat.procheTransports) criteres.push("Proche transports");
      if (mandat.procheEcoles) criteres.push("Proche écoles");
      if (mandat.animaux) criteres.push("Animaux acceptés");

      doc.fillColor(GRIS_TEXTE).fontSize(7).font("Helvetica")
        .text("CRITÈRES SOUHAITÉS", 40, y, { width: pageW - 80 });
      y += 9;
      if (criteres.length > 0) {
        // Badges critères
        let bx = 40;
        for (const c of criteres) {
          const bw = doc.widthOfString(c) + 12;
          if (bx + bw > pageW - 40) { bx = 40; y += 16; }
          doc.rect(bx, y, bw, 13).fill(GRIS_CLAIR).stroke(GRIS_LIGNE);
          doc.fillColor(NOIR).fontSize(7).font("Helvetica").text(c, bx + 4, y + 3);
          bx += bw + 6;
        }
        y += 20;
      } else {
        doc.fillColor(GRIS_TEXTE).fontSize(8).font("Helvetica-Oblique").text("Aucun critère spécifique", 40, y);
        y += 14;
      }

      if (mandat.autresCriteres) {
        drawHLine(doc, y); y += 6;
        doc.fillColor(GRIS_TEXTE).fontSize(7).font("Helvetica").text("AUTRES CRITÈRES", 40, y);
        y += 9;
        doc.fillColor(NOIR).fontSize(8).font("Helvetica").text(mandat.autresCriteres, 40, y, { width: pageW - 80 });
        y += doc.heightOfString(mandat.autresCriteres, { width: pageW - 80 }) + 8;
      }

      drawHLine(doc, y); y += 6;
      drawField(doc, "Type de mandat", val(mandat.typeMandat), 40, y, colW);
      drawField(doc, "Durée mandat (mois)", mandat.dureeMandat ? `${mandat.dureeMandat} mois` : "—", 40 + colW + 8, y, colW);
      drawField(doc, "Accord bancaire", val(mandat.accordBancaire), 40 + 2 * (colW + 8), y, colW);
      y += 28;
    } else {
      doc.fillColor(GRIS_TEXTE).fontSize(9).font("Helvetica-Oblique")
        .text("Aucun mandat de recherche disponible pour ce dossier.", 50, y + 4);
      y += 24;
    }

    y += 8;

    // ── SECTION 3 : TABLEAU DE COURTAGE ──────────────────────────────────────
    y = checkNewPage(doc, y, 140);
    y = drawSectionHeader(doc, "3. Tableau de Courtage — Situation Financière", y);

    if (financement) {
      const patrimoine: Array<Record<string, string>> = financement.patrimoineJson
        ? JSON.parse(financement.patrimoineJson)
        : [];

      // Emprunteur 1
      doc.rect(40, y, pageW - 80, 16).fill("#F0EDE4");
      doc.fillColor(NOIR).fontSize(8).font("Helvetica-Bold")
        .text(`Emprunteur 1 — ${financement.emprunteur1Prenom || ""} ${financement.emprunteur1Nom || ""}`.trim(), 50, y + 4);
      y += 22;

      drawField(doc, "Date de naissance", formatDate(financement.emprunteur1DateNaissance), 40, y, colW);
      drawField(doc, "Nationalité", val(financement.emprunteur1Nationalite), 40 + colW + 8, y, colW);
      drawField(doc, "Situation matrimoniale", val(financement.emprunteur1SituationMatrimoniale), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      drawField(doc, "Activité", val(financement.emprunteur1Activite), 40, y, colW);
      drawField(doc, "Statut professionnel", val(financement.emprunteur1StatutPro), 40 + colW + 8, y, colW);
      drawField(doc, "Ancienneté", val(financement.emprunteur1Anciennete), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      drawField(doc, "Salaire net avis 2024", formatMontant(financement.emprunteur1SalaireAvis2024), 40, y, colW);
      drawField(doc, "Salaire net avis 2025", formatMontant(financement.emprunteur1SalaireAvis2025), 40 + colW + 8, y, colW);
      drawField(doc, "Salaire net 2026 (actuel)", formatMontant(financement.emprunteur1SalaireNet2026), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      drawField(doc, "Autres revenus", formatMontant(financement.emprunteur1AutresRevenus), 40, y, colW);
      drawField(doc, "Autres charges", formatMontant(financement.emprunteur1AutresCharges), 40 + colW + 8, y, colW);
      drawField(doc, "Propriétaire actuel", valBool(financement.emprunteur1Proprietaire), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      drawField(doc, "Épargne liquide", formatMontant(financement.emprunteur1EpargneLiquide), 40, y, colW);
      drawField(doc, "Épargne non liquide", formatMontant(financement.emprunteur1EpargneNonLiquide), 40 + colW + 8, y, colW);
      drawField(doc, "Apport", formatMontant(financement.emprunteur1Apport), 40 + 2 * (colW + 8), y, colW);
      y += 28;

      // Emprunteur 2 (si présent)
      if (financement.emprunteur2Nom || financement.emprunteur2Prenom) {
        y += 4;
        y = checkNewPage(doc, y, 120);
        doc.rect(40, y, pageW - 80, 16).fill("#F0EDE4");
        doc.fillColor(NOIR).fontSize(8).font("Helvetica-Bold")
          .text(`Emprunteur 2 — ${financement.emprunteur2Prenom || ""} ${financement.emprunteur2Nom || ""}`.trim(), 50, y + 4);
        y += 22;

        drawField(doc, "Date de naissance", formatDate(financement.emprunteur2DateNaissance), 40, y, colW);
        drawField(doc, "Nationalité", val(financement.emprunteur2Nationalite), 40 + colW + 8, y, colW);
        drawField(doc, "Activité", val(financement.emprunteur2Activite), 40 + 2 * (colW + 8), y, colW);
        y += 28;
        drawHLine(doc, y); y += 6;

        drawField(doc, "Statut professionnel", val(financement.emprunteur2StatutPro), 40, y, colW);
        drawField(doc, "Ancienneté", val(financement.emprunteur2Anciennete), 40 + colW + 8, y, colW);
        y += 28;
        drawHLine(doc, y); y += 6;

        drawField(doc, "Salaire net avis 2024", formatMontant(financement.emprunteur2SalaireAvis2024), 40, y, colW);
        drawField(doc, "Salaire net avis 2025", formatMontant(financement.emprunteur2SalaireAvis2025), 40 + colW + 8, y, colW);
        drawField(doc, "Salaire net 2026 (actuel)", formatMontant(financement.emprunteur2SalaireNet2026), 40 + 2 * (colW + 8), y, colW);
        y += 28;
        drawHLine(doc, y); y += 6;

        drawField(doc, "Épargne liquide", formatMontant(financement.emprunteur2EpargneLiquide), 40, y, colW);
        drawField(doc, "Épargne non liquide", formatMontant(financement.emprunteur2EpargneNonLiquide), 40 + colW + 8, y, colW);
        drawField(doc, "Apport", formatMontant(financement.emprunteur2Apport), 40 + 2 * (colW + 8), y, colW);
        y += 28;
      }

      // Projet de financement
      y += 4;
      y = checkNewPage(doc, y, 100);
      doc.rect(40, y, pageW - 80, 16).fill("#F0EDE4");
      doc.fillColor(NOIR).fontSize(8).font("Helvetica-Bold")
        .text("Projet de Financement", 50, y + 4);
      y += 22;

      drawField(doc, "Montant du projet", formatMontant(financement.montantProjet), 40, y, colW);
      drawField(doc, "Durée souhaitée (mois)", financement.duree ? `${financement.duree} mois` : "—", 40 + colW + 8, y, colW);
      drawField(doc, "Objet du financement", val(financement.objetFinancement), 40 + 2 * (colW + 8), y, colW);
      y += 28;
      drawHLine(doc, y); y += 6;

      drawField(doc, "Régime fiscal", val(financement.regimeFiscal), 40, y, colW);
      drawField(doc, "Incidents / ATD", valBool(financement.incidentsATD), 40 + colW + 8, y, colW);
      drawField(doc, "Personne garante", valBool(financement.personneGarante), 40 + 2 * (colW + 8), y, colW);
      y += 28;

      if (financement.commentaire) {
        drawHLine(doc, y); y += 6;
        doc.fillColor(GRIS_TEXTE).fontSize(7).font("Helvetica").text("COMMENTAIRE", 40, y);
        y += 9;
        doc.fillColor(NOIR).fontSize(8).font("Helvetica").text(financement.commentaire, 40, y, { width: pageW - 80 });
        y += doc.heightOfString(financement.commentaire, { width: pageW - 80 }) + 8;
      }

      // Patrimoine immobilier
      if (patrimoine.length > 0) {
        y += 4;
        y = checkNewPage(doc, y, 60 + patrimoine.length * 30);
        doc.rect(40, y, pageW - 80, 16).fill("#F0EDE4");
        doc.fillColor(NOIR).fontSize(8).font("Helvetica-Bold")
          .text("Patrimoine Immobilier", 50, y + 4);
        y += 22;

        // En-têtes tableau
        const pCols = [
          { label: "Mensualité", w: 80 },
          { label: "Type garantie", w: 90 },
          { label: "Format", w: 80 },
          { label: "DPE", w: 40 },
          { label: "Loyers HC", w: 70 },
          { label: "Capital restant", w: 80 },
          { label: "Valeur actuelle", w: 80 },
        ];
        let px = 40;
        doc.rect(40, y, pageW - 80, 14).fill(NOIR);
        for (const col of pCols) {
          doc.fillColor(OR).fontSize(6.5).font("Helvetica-Bold")
            .text(col.label.toUpperCase(), px + 2, y + 4, { width: col.w - 4 });
          px += col.w;
        }
        y += 14;

        for (let i = 0; i < patrimoine.length; i++) {
          const p = patrimoine[i];
          y = checkNewPage(doc, y, 20);
          if (i % 2 === 0) doc.rect(40, y, pageW - 80, 16).fill(GRIS_CLAIR);
          px = 40;
          const fields = [
            p.mensualite ? `${p.mensualite} €` : "—",
            p.typeGarantie || "—",
            p.formatPropriete || "—",
            p.dpe || "—",
            p.loyersHC ? `${p.loyersHC} €` : "—",
            p.capitalRestantDu ? `${p.capitalRestantDu} €` : "—",
            p.valeurActuelle ? `${p.valeurActuelle} €` : "—",
          ];
          for (let j = 0; j < pCols.length; j++) {
            doc.fillColor(NOIR).fontSize(7.5).font("Helvetica")
              .text(fields[j], px + 2, y + 4, { width: pCols[j].w - 4 });
            px += pCols[j].w;
          }
          y += 16;
        }
        y += 4;
      }
    } else {
      doc.fillColor(GRIS_TEXTE).fontSize(9).font("Helvetica-Oblique")
        .text("Aucun tableau de courtage disponible pour ce dossier.", 50, y + 4);
      y += 24;
    }

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const pageH = doc.page.height;
      doc.rect(0, pageH - 28, pageW, 28).fill(NOIR);
      doc.fillColor(OR).fontSize(7).font("Helvetica-Bold")
        .text("SIGMA FACTORY", 40, pageH - 18, { continued: true });
      doc.fillColor(BLANC).fontSize(7).font("Helvetica")
        .text("  —  Document confidentiel, réservé à usage professionnel", { continued: false });
      doc.fillColor(GRIS_TEXTE).fontSize(7).font("Helvetica")
        .text(`Page ${i + 1} / ${totalPages}`, pageW - 80, pageH - 18, { width: 40, align: "right" });
    }

    doc.end();
  });
}

/**
 * Génère la convention de partenariat courtier Sigma Factory
 * Modèle : même structure que le contrat ambassadeur, adapté au courtage
 */

interface ConventionCourtierData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  statut: string;
  siret?: string;
  numeroOrias?: string;
  cabinetNom?: string;
  specialites?: string;
  courtierId: number;
  dateSignature: string;
  signatureNom: string;
  parrainNom?: string;
  parrainType?: string; // "agent" | "courtier"
}

export async function generateConventionCourtierPdf(data: ConventionCourtierData): Promise<Buffer> {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 11pt; line-height: 1.6; }
  .page { padding: 40px 50px; max-width: 210mm; margin: 0 auto; }
  
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; margin-bottom: 30px; }
  .logo-block h1 { font-size: 24pt; font-weight: 900; color: #111; letter-spacing: 2px; }
  .logo-block span { color: #C9A84C; }
  .logo-block p { font-size: 8pt; color: #666; margin-top: 4px; letter-spacing: 1px; }
  .ref-block { text-align: right; }
  .ref-block .badge { background: #111; color: #C9A84C; padding: 6px 14px; font-size: 9pt; font-weight: 700; letter-spacing: 1px; }
  .ref-block p { font-size: 8pt; color: #888; margin-top: 6px; }
  
  /* Title */
  .title-section { text-align: center; margin: 30px 0; }
  .title-section h2 { font-size: 16pt; font-weight: 900; color: #111; text-transform: uppercase; letter-spacing: 3px; }
  .title-section .subtitle { color: #C9A84C; font-size: 10pt; font-weight: 600; margin-top: 6px; letter-spacing: 1px; }
  .gold-line { height: 2px; background: linear-gradient(to right, transparent, #C9A84C, transparent); margin: 15px auto; width: 60%; }
  
  /* Sections */
  .section { margin: 25px 0; }
  .section-title { font-size: 10pt; font-weight: 800; color: #C9A84C; text-transform: uppercase; letter-spacing: 2px; border-left: 3px solid #C9A84C; padding-left: 10px; margin-bottom: 12px; }
  
  /* Parties */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
  .partie-box { border: 1px solid #e0e0e0; padding: 15px; background: #fafafa; }
  .partie-box h4 { font-size: 9pt; font-weight: 700; color: #C9A84C; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .partie-box p { font-size: 9pt; color: #333; line-height: 1.7; }
  .partie-box strong { color: #111; }
  
  /* Articles */
  .article { margin: 20px 0; }
  .article h3 { font-size: 10pt; font-weight: 800; color: #111; margin-bottom: 8px; }
  .article p { font-size: 9.5pt; color: #333; text-align: justify; margin-bottom: 6px; }
  .article ul { margin: 8px 0 8px 20px; }
  .article ul li { font-size: 9.5pt; color: #333; margin-bottom: 4px; }
  
  /* Commission highlight */
  .commission-box { background: #111; color: #fff; padding: 20px; margin: 20px 0; text-align: center; }
  .commission-box h3 { color: #C9A84C; font-size: 12pt; margin-bottom: 10px; letter-spacing: 1px; }
  .commission-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
  .comm-item { border: 1px solid #C9A84C; padding: 10px; }
  .comm-item .taux { font-size: 18pt; font-weight: 900; color: #C9A84C; }
  .comm-item p { font-size: 7.5pt; color: #ccc; margin-top: 4px; }
  
  /* Signature */
  .signature-section { margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 25px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .sig-box h4 { font-size: 9pt; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
  .sig-box .sig-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 8px; display: flex; align-items: flex-end; padding-bottom: 4px; }
  .sig-box .sig-line span { font-family: 'Georgia', serif; font-size: 14pt; color: #111; font-style: italic; }
  .sig-box p { font-size: 8pt; color: #666; }
  
  /* Footer */
  .footer { margin-top: 30px; border-top: 2px solid #C9A84C; padding-top: 12px; text-align: center; }
  .footer p { font-size: 7.5pt; color: #888; line-height: 1.6; }
  
  /* Highlight */
  .highlight { color: #C9A84C; font-weight: 700; }
  .badge-courtier { display: inline-block; background: #C9A84C; color: #111; padding: 3px 10px; font-size: 8pt; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-block">
      <h1>SIGMA <span>FACTORY</span></h1>
      <p>CONSEIL EN IMMOBILIER &amp; FINANCEMENT</p>
    </div>
    <div class="ref-block">
      <div class="badge">CONVENTION COURTAGE</div>
      <p>Réf. CRT-${String(data.courtierId).padStart(4, "0")}</p>
      <p>Date : ${data.dateSignature}</p>
    </div>
  </div>

  <!-- TITLE -->
  <div class="title-section">
    <h2>Convention de Partenariat Courtage</h2>
    <div class="subtitle">Programme d'Affiliation Réseau — Sigma Factory</div>
    <div class="gold-line"></div>
    <p style="font-size:9pt; color:#888; margin-top:8px;">
      <span class="badge-courtier">Courtier Partenaire</span>
      ${data.numeroOrias ? `&nbsp;&nbsp;ORIAS : <strong>${data.numeroOrias}</strong>` : ""}
    </p>
  </div>

  <!-- PARTIES -->
  <div class="section">
    <div class="section-title">Entre les soussignés</div>
    <div class="parties">
      <div class="partie-box">
        <h4>La Société</h4>
        <p><strong>SIGMA FACTORY SAS</strong><br>
        Capital : 5 000 €<br>
        RCS Lyon : 999 672 777<br>
        12 Rue de la Part-Dieu, 69003 Lyon<br>
        Carte CPI : CPI69012026000000022<br>
        Représentée par : <strong>Carole Pennavayre</strong>, Présidente<br>
        Ci-après désignée <em>« SIGMA FACTORY »</em></p>
      </div>
      <div class="partie-box">
        <h4>Le Courtier Partenaire</h4>
        <p><strong>${data.prenom} ${data.nom}</strong><br>
        ${data.cabinetNom ? `Cabinet : ${data.cabinetNom}<br>` : ""}
        ${data.statut}<br>
        ${data.siret ? `SIRET : ${data.siret}<br>` : ""}
        ${data.numeroOrias ? `ORIAS : ${data.numeroOrias}<br>` : ""}
        ${data.adresse}, ${data.codePostal} ${data.ville}<br>
        Email : ${data.email}<br>
        Tél. : ${data.telephone}<br>
        ${data.parrainNom ? `Parrainé par : <strong>${data.parrainNom}</strong> (${data.parrainType === "agent" ? "Agent immobilier" : "Courtier partenaire"})<br>` : ""}
        Ci-après désigné <em>« le Courtier »</em></p>
      </div>
    </div>
  </div>

  <!-- COMMISSION BOX -->
  <div class="commission-box">
    <h3>Répartition des Honoraires</h3>
    <div class="commission-grid">
      <div class="comm-item">
        <div class="taux">75%</div>
        <p>Part Courtier<br>Sur chaque dossier finalisé</p>
      </div>
      <div class="comm-item">
        <div class="taux">10%</div>
        <p>Rétrocommission N1<br>Sur la Part Sigma (parrain direct)</p>
      </div>
      <div class="comm-item">
        <div class="taux">5%</div>
        <p>Rétrocommission N2<br>Sur la Part Sigma (grand-parrain)</p>
      </div>
    </div>
  </div>

  <!-- ARTICLE 1 -->
  <div class="article">
    <h3>Article 1 — Objet de la Convention</h3>
    <p>La présente convention a pour objet de définir les conditions dans lesquelles le Courtier s'engage à apporter des dossiers de financement à SIGMA FACTORY SAS dans le cadre d'un partenariat de courtage en crédit immobilier et/ou professionnel, et à développer un réseau de partenaires affiliés (ci-après « Filleuls ») dans le cadre du Programme d'Affiliation Sigma.</p>
    <p>Le Courtier exerce son activité sous son propre numéro ORIAS et sous sa propre responsabilité professionnelle. SIGMA FACTORY SAS agit en qualité de mandant et de gestionnaire du programme d'affiliation.</p>
  </div>

  <!-- ARTICLE 2 -->
  <div class="article">
    <h3>Article 2 — Missions du Courtier Partenaire</h3>
    <p>Dans le cadre de la présente convention, le Courtier s'engage à :</p>
    <ul>
      <li>Apporter des dossiers de financement qualifiés (crédit immobilier, prêt professionnel, rachat de crédit) à SIGMA FACTORY SAS</li>
      <li>Assurer le montage et le suivi des dossiers jusqu'à leur finalisation</li>
      <li>Respecter la réglementation en vigueur, notamment les obligations liées à son immatriculation ORIAS</li>
      <li>Promouvoir le réseau SIGMA FACTORY auprès de son réseau professionnel afin de recruter de nouveaux partenaires (agents immobiliers ou courtiers)</li>
      <li>Maintenir la confidentialité sur les informations clients et les méthodes de travail de SIGMA FACTORY SAS</li>
    </ul>
  </div>

  <!-- ARTICLE 3 -->
  <div class="article">
    <h3>Article 3 — Rémunération et Rétrocommissions</h3>
    <p><strong>3.1 — Commission principale :</strong> Pour chaque dossier de financement finalisé et dont les honoraires ont été encaissés par SIGMA FACTORY SAS, le Courtier perçoit <span class="highlight">75% des honoraires HT</span> encaissés par la Société. Les 25% restants constituent la Part Sigma.</p>
    <p><strong>3.2 — Programme d'affiliation (rétrocommissions) :</strong> En contrepartie du développement du réseau, le Courtier perçoit les rétrocommissions suivantes, calculées sur la Part Sigma des dossiers réalisés par ses Filleuls :</p>
    <ul>
      <li><strong class="highlight">Niveau 1 — 10%</strong> : Le Courtier perçoit 10% de la Part Sigma sur tout dossier finalisé par un partenaire qu'il a directement recruté (Filleul de Niveau 1), qu'il s'agisse d'un agent immobilier ou d'un courtier partenaire.</li>
      <li><strong class="highlight">Niveau 2 — 5%</strong> : Le Courtier perçoit 5% de la Part Sigma sur tout dossier finalisé par un partenaire recruté par l'un de ses Filleuls de Niveau 1 (Filleul de Niveau 2), qu'il s'agisse d'un agent immobilier ou d'un courtier partenaire.</li>
    </ul>
    <p><strong>Réseau croisé :</strong> Le programme d'affiliation est ouvert à l'ensemble des partenaires du réseau SIGMA FACTORY, sans distinction de métier. Un courtier peut recruter un agent immobilier et inversement. Les rétrocommissions s'appliquent dans les mêmes conditions (10% N1 / 5% N2 sur la Part Sigma) quelle que soit la nature professionnelle du parrain ou du filleul.</p>
    <p><strong>Exemple concret :</strong> Pour un dossier générant 2 000 € d'honoraires — le Courtier perçoit 1 500 € (75%), son parrain direct perçoit 50 € (10% × 500 €), et le grand-parrain perçoit 25 € (5% × 500 €). SIGMA FACTORY conserve 425 € nets.</p>
    <p>Les rémunérations sont versées dans les 30 jours suivant l'encaissement effectif par SIGMA FACTORY SAS. Aucun acompte ne sera versé avant encaissement. Un relevé mensuel des dossiers finalisés et des rétrocommissions dues sera transmis au Courtier.</p>
  </div>

  <!-- ARTICLE 4 -->
  <div class="article">
    <h3>Article 4 — Obligations Réglementaires</h3>
    <p>Le Courtier déclare être régulièrement immatriculé à l'ORIAS en qualité d'Intermédiaire en Opérations de Banque et en Services de Paiement (IOBSP) et s'engage à maintenir cette immatriculation en cours de validité pendant toute la durée de la présente convention.</p>
    <p>Le Courtier est seul responsable du respect de la réglementation applicable à son activité, notamment les obligations d'information et de conseil envers les emprunteurs, la protection des données personnelles (RGPD), et les règles de lutte contre le blanchiment de capitaux.</p>
    <p>SIGMA FACTORY SAS ne pourra être tenue responsable de tout manquement du Courtier à ses obligations légales, réglementaires ou déontologiques.</p>
  </div>

  <!-- ARTICLE 5 -->
  <div class="article">
    <h3>Article 5 — Confidentialité et Protection des Données</h3>
    <p>Le Courtier s'engage à maintenir strictement confidentielle toute information relative aux clients, prospects, tarifs, méthodes et outils de SIGMA FACTORY SAS, pendant toute la durée de la convention et pour une période de 5 ans après sa résiliation.</p>
    <p>Les données personnelles des clients sont traitées conformément au Règlement Général sur la Protection des Données (RGPD). Le Courtier s'engage à ne pas utiliser ces données à des fins autres que celles prévues par la présente convention.</p>
  </div>

  <!-- ARTICLE 6 -->
  <div class="article">
    <h3>Article 6 — Non-Concurrence et Loyauté</h3>
    <p>Pendant la durée de la convention et pendant les 12 mois suivant sa résiliation, le Courtier s'interdit de solliciter ou de tenter de recruter tout partenaire, salarié ou client de SIGMA FACTORY SAS pour le compte d'une structure concurrente.</p>
    <p>Le Courtier s'interdit de détourner à son profit ou au profit d'un tiers une affaire ou un client identifié dans le cadre de son partenariat avec SIGMA FACTORY SAS.</p>
  </div>

  <!-- ARTICLE 7 -->
  <div class="article">
    <h3>Article 7 — Durée et Résiliation</h3>
    <p>La présente convention est conclue pour une durée indéterminée à compter de sa signature électronique. Chaque partie peut y mettre fin à tout moment par notification écrite avec un préavis de 30 jours, sans indemnité de part ni d'autre.</p>
    <p>SIGMA FACTORY SAS se réserve le droit de résilier la convention sans préavis en cas de manquement grave aux obligations contractuelles, de perte de l'immatriculation ORIAS, ou de comportement contraire à l'éthique professionnelle.</p>
    <p>En cas de résiliation ordinaire, le Courtier conserve le bénéfice de ses rétrocommissions sur les dossiers initiés avant la date d'effet de la résiliation, sous réserve que ces dossiers aboutissent dans les 6 mois suivant la rupture.</p>
  </div>

  <!-- ARTICLE 8 -->
  <div class="article">
    <h3>Article 8 — Statut Indépendant et Obligations Fiscales</h3>
    <p>Le Courtier déclare exercer son activité en toute indépendance et sous sa propre responsabilité. Il est seul responsable du respect de ses obligations fiscales et sociales découlant des rémunérations perçues dans le cadre de la présente convention.</p>
    <p>La présente convention ne crée aucun lien de subordination entre les parties et ne peut être qualifiée de contrat de travail.</p>
  </div>

  <!-- ARTICLE 9 -->
  <div class="article">
    <h3>Article 9 — Droit Applicable et Litiges</h3>
    <p>La présente convention est soumise au droit français. En cas de litige relatif à son interprétation ou à son exécution, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours. À défaut, le Tribunal de Commerce de Lyon sera seul compétent.</p>
  </div>

  <!-- SIGNATURE -->
  <div class="signature-section">
    <div class="sig-grid">
      <div class="sig-box">
        <h4>Pour SIGMA FACTORY SAS</h4>
        <div class="sig-line"><span>Carole Pennavayre</span></div>
        <p>Présidente — SIGMA FACTORY SAS</p>
        <p>Signé électroniquement le ${data.dateSignature}</p>
      </div>
      <div class="sig-box">
        <h4>Le Courtier Partenaire</h4>
        <div class="sig-line"><span>${data.signatureNom}</span></div>
        <p>${data.prenom} ${data.nom}${data.cabinetNom ? ` — ${data.cabinetNom}` : ""}</p>
        <p>Signé électroniquement le ${data.dateSignature}</p>
        <p>Lu et approuvé — Bon pour accord</p>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>SIGMA FACTORY SAS — Capital 5 000 € — RCS Lyon 999 672 777 — 12 Rue de la Part-Dieu, 69003 Lyon</p>
    <p>Carte professionnelle CPI69012026000000022 — CCI Lyon Métropole</p>
    <p>Document généré électroniquement le ${data.dateSignature} — Réf. CRT-${String(data.courtierId).padStart(4, "0")} — Valeur légale</p>
  </div>

</div>
</body>
</html>`;

  const { spawn } = await import("child_process");
  const { writeFileSync, readFileSync, unlinkSync } = await import("fs");
  const { tmpdir } = await import("os");
  const { join } = await import("path");

  const tmpHtml = join(tmpdir(), `convention-courtier-${Date.now()}.html`);
  const tmpPdf = join(tmpdir(), `convention-courtier-${Date.now()}.pdf`);

  writeFileSync(tmpHtml, html, "utf8");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("python3", [
      "-c",
      `from weasyprint import HTML; HTML(filename='${tmpHtml}').write_pdf('${tmpPdf}')`,
    ]);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`WeasyPrint exited with code ${code}`));
    });
    proc.on("error", reject);
  });

  const pdfBuffer = readFileSync(tmpPdf);

  try { unlinkSync(tmpHtml); } catch {}
  try { unlinkSync(tmpPdf); } catch {}

  return pdfBuffer;
}

/**
 * Génère le contrat PDF d'ambassadeur Sigma Factory
 * Utilise jsPDF côté serveur via @jspdf/jspdf
 */

interface ContratData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  statut: string;
  siret?: string;
  activitePrincipale?: string;
  niveau: string;
  ambassadeurId: number;
  dateSignature: string;
  signatureNom: string;
  parrainId?: number;
}

export async function generateContratPdf(data: ContratData): Promise<Buffer> {
  const taux = data.niveau === "1" ? "10%" : "5%";
  const niveauLabel = data.niveau === "1" ? "Ambassadeur Niveau 1" : "Ambassadeur Niveau 2 (Filleul)";
  
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
  .commission-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 12px; }
  .comm-item { border: 1px solid #C9A84C; padding: 10px; }
  .comm-item .taux { font-size: 20pt; font-weight: 900; color: #C9A84C; }
  .comm-item p { font-size: 8pt; color: #ccc; margin-top: 4px; }
  
  /* Signature */
  .signature-section { margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 25px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .sig-box { }
  .sig-box h4 { font-size: 9pt; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
  .sig-box .sig-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 8px; display: flex; align-items: flex-end; padding-bottom: 4px; }
  .sig-box .sig-line span { font-family: 'Georgia', serif; font-size: 14pt; color: #111; font-style: italic; }
  .sig-box p { font-size: 8pt; color: #666; }
  
  /* Footer */
  .footer { margin-top: 30px; border-top: 2px solid #C9A84C; padding-top: 12px; text-align: center; }
  .footer p { font-size: 7.5pt; color: #888; line-height: 1.6; }
  
  /* Highlight */
  .highlight { color: #C9A84C; font-weight: 700; }
  .niveau-badge { display: inline-block; background: #C9A84C; color: #111; padding: 3px 10px; font-size: 8pt; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-block">
      <h1>SIGMA <span>FACTORY</span></h1>
      <p>RÉSEAU AMBASSADEURS — PROGRAMME D'AFFILIATION</p>
    </div>
    <div class="ref-block">
      <div class="badge">CONTRAT N° AMB-${String(data.ambassadeurId).padStart(4, "0")}</div>
      <p>Date : ${data.dateSignature}</p>
      <p><span class="niveau-badge">${niveauLabel}</span></p>
    </div>
  </div>

  <!-- TITRE -->
  <div class="title-section">
    <h2>Contrat de Partenariat Ambassadeur</h2>
    <div class="subtitle">Programme d'Affiliation Sigma Factory — Taux ${taux}</div>
    <div class="gold-line"></div>
  </div>

  <!-- PARTIES -->
  <div class="section">
    <div class="section-title">Les Parties</div>
    <div class="parties">
      <div class="partie-box">
        <h4>Le Mandant</h4>
        <p><strong>SIGMA FACTORY SAS</strong><br>
        Capital : 5 000 €<br>
        RCS Lyon : 999 672 777<br>
        Siège : 12 Rue de la Part-Dieu<br>
        69003 Lyon<br>
        Carte pro : CPI69012026000000022<br>
        CCI Lyon Métropole<br>
        Représentée par : Mme PENNAVAYRE Bidossessi Carole</p>
      </div>
      <div class="partie-box">
        <h4>L'Ambassadeur</h4>
        <p><strong>${data.prenom} ${data.nom}</strong><br>
        ${data.adresse}<br>
        ${data.codePostal} ${data.ville}<br>
        Email : ${data.email}<br>
        Tél : ${data.telephone}<br>
        Statut : ${data.statut.replace(/_/g, " ")}<br>
        ${data.siret ? `SIRET : ${data.siret}` : ""}
        </p>
      </div>
    </div>
  </div>

  <!-- COMMISSION HIGHLIGHT -->
  <div class="commission-box">
    <h3>Structure de Rémunération</h3>
    <div class="commission-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="comm-item">
        <div class="taux">50%</div>
        <p>Honoraires directs<br>Sur vos dossiers immobiliers</p>
      </div>
      <div class="comm-item">
        <div class="taux">10%</div>
        <p>Rétrocommission Niveau 1<br>Sur chaque vente de votre réseau direct</p>
      </div>
      <div class="comm-item">
        <div class="taux">5%</div>
        <p>Rétrocommission Niveau 2<br>Sur chaque vente des filleuls de vos ambassadeurs</p>
      </div>
    </div>
  </div>

  <!-- ARTICLE 1 -->
  <div class="article">
    <h3>Article 1 — Objet du Contrat</h3>
    <p>Le présent contrat a pour objet de définir les conditions dans lesquelles l'Ambassadeur s'engage à promouvoir les services de SIGMA FACTORY SAS, société de conseil en immobilier, et à développer un réseau de partenaires affiliés (ci-après « Filleuls ») dans le cadre du Programme Ambassadeur Sigma.</p>
    <p>L'Ambassadeur agit en qualité de partenaire indépendant et non salarié. Il ne peut en aucun cas engager la responsabilité de SIGMA FACTORY SAS vis-à-vis de tiers.</p>
  </div>

  <!-- ARTICLE 2 -->
  <div class="article">
    <h3>Article 2 — Missions de l'Ambassadeur</h3>
    <p>Dans le cadre de ce partenariat, l'Ambassadeur s'engage à :</p>
    <ul>
      <li>Promouvoir les services de SIGMA FACTORY SAS auprès de son réseau professionnel et personnel</li>
      <li>Présenter des biens immobiliers issus du portefeuille Sigma aux prospects qualifiés</li>
      <li>Recruter et parrainer de nouveaux Ambassadeurs (Niveau 2) dans le respect des valeurs Sigma</li>
      <li>Renseigner le portefeuille de biens via la plateforme dédiée avec des informations exactes et vérifiées</li>
      <li>Respecter la charte déontologique et les obligations légales en vigueur</li>
    </ul>
  </div>

  <!-- ARTICLE 3 -->
  <div class="article">
    <h3>Article 3 — Rémunération et Rétrocommissions</h3>
    <p>En contrepartie de ses missions, l'Ambassadeur bénéficie de la structure de rémunération suivante :</p>
    <ul>
      <li><strong class="highlight">Honoraires directs — 50%</strong> : En qualité d'agent immobilier partenaire, l'Ambassadeur perçoit 50% des honoraires HT encaissés par SIGMA FACTORY SAS sur chaque dossier immobilier qu'il apporte directement. Les 50% restants constituent la Part Sigma.</li>
      <li><strong class="highlight">Réseau Niveau 1 — 10%</strong> : L'Ambassadeur perçoit 10% de la Part Sigma sur toute transaction réalisée par un partenaire qu'il a directement recruté (Filleul de Niveau 1), qu'il s'agisse d'un agent immobilier ou d'un courtier partenaire.</li>
      <li><strong class="highlight">Réseau Niveau 2 — 5%</strong> : L'Ambassadeur perçoit 5% de la Part Sigma sur toute transaction réalisée par un partenaire recruté par l'un de ses Filleuls de Niveau 1 (Filleul de Niveau 2), qu'il s'agisse d'un agent immobilier ou d'un courtier partenaire.</li>
    </ul>
    <p><strong>Réseau croisé :</strong> Le présent programme d'affiliation est ouvert à l'ensemble des partenaires du réseau SIGMA FACTORY, sans distinction de métier. Un agent immobilier peut recruter un courtier partenaire et inversement. Les rétrocommissions s'appliquent dans les mêmes conditions (10% N1 / 5% N2 sur la Part Sigma) quelle que soit la nature professionnelle du parrain ou du filleul.</p>
    <p>Les rétrocommissions sont versées dans les 30 jours suivant l'encaissement effectif par SIGMA FACTORY SAS. Aucun acompte ne sera versé avant encaissement. Un relevé mensuel des affaires conclues et des rétrocommissions dues sera transmis à l'Ambassadeur.</p>
  </div>

  <!-- ARTICLE 4 -->
  <div class="article">
    <h3>Article 4 — Durée et Résiliation</h3>
    <p>Le présent contrat est conclu pour une durée indéterminée à compter de sa signature électronique. Chaque partie peut y mettre fin à tout moment par notification écrite avec un préavis de 30 jours, sans indemnité de part ni d'autre.</p>
    <p>SIGMA FACTORY SAS se réserve le droit de résilier le contrat sans préavis en cas de manquement grave aux obligations contractuelles, de comportement contraire à l'éthique ou de non-respect de la réglementation applicable.</p>
  </div>

  <!-- ARTICLE 5 -->
  <div class="article">
    <h3>Article 5 — Confidentialité et Propriété Intellectuelle</h3>
    <p>L'Ambassadeur s'engage à maintenir strictement confidentielle toute information relative aux clients, prospects, tarifs et méthodes de SIGMA FACTORY SAS, pendant toute la durée du contrat et pour une période de 3 ans après sa résiliation.</p>
    <p>L'utilisation du nom, logo et marque SIGMA FACTORY est autorisée uniquement dans le cadre des missions définies au présent contrat et selon les chartes graphiques fournies par la société.</p>
  </div>

  <!-- ARTICLE 6 -->
  <div class="article">
    <h3>Article 6 — Statut Indépendant et Obligations Fiscales</h3>
    <p>L'Ambassadeur déclare exercer son activité en toute indépendance et sous sa propre responsabilité. Il est seul responsable du respect de ses obligations fiscales et sociales découlant des rémunérations perçues dans le cadre du présent contrat.</p>
    <p>SIGMA FACTORY SAS ne pourra être tenue responsable de tout manquement de l'Ambassadeur à ses obligations légales, fiscales ou sociales.</p>
  </div>

  <!-- ARTICLE 7 -->
  <div class="article">
    <h3>Article 7 — Droit Applicable et Litiges</h3>
    <p>Le présent contrat est soumis au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, le Tribunal de Commerce de Lyon sera seul compétent.</p>
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
        <h4>L'Ambassadeur</h4>
        <div class="sig-line"><span>${data.signatureNom}</span></div>
        <p>${data.prenom} ${data.nom}</p>
        <p>Signé électroniquement le ${data.dateSignature}</p>
        <p>Lu et approuvé — Bon pour accord</p>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>SIGMA FACTORY SAS — Capital 5 000 € — RCS Lyon 999 672 777 — 12 Rue de la Part-Dieu, 69003 Lyon</p>
    <p>Carte professionnelle CPI69012026000000022 — CCI Lyon Métropole</p>
    <p>Document généré électroniquement le ${data.dateSignature} — Réf. AMB-${String(data.ambassadeurId).padStart(4, "0")} — Valeur légale</p>
  </div>

</div>
</body>
</html>`;

  // Utiliser WeasyPrint via spawn
  const { spawn } = await import("child_process");
  const { promisify } = await import("util");
  const { writeFileSync, readFileSync, unlinkSync } = await import("fs");
  const { tmpdir } = await import("os");
  const { join } = await import("path");
  
  const tmpHtml = join(tmpdir(), `contrat-${Date.now()}.html`);
  const tmpPdf = join(tmpdir(), `contrat-${Date.now()}.pdf`);
  
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

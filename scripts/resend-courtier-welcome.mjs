import mysql from "mysql2/promise";
import { Resend } from "resend";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const resend = new Resend(process.env.RESEND_API_KEY);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Récupérer tous les courtiers
const [rows] = await conn.execute(
  "SELECT id, prenom, nom, email, codeParrain, conventionPdfUrl FROM courtiers ORDER BY id"
);

console.log("Courtiers en base :", rows.length);
rows.forEach(r => console.log(`  - ${r.prenom} ${r.nom} <${r.email}> | code: ${r.codeParrain} | convention: ${r.conventionPdfUrl ? "OUI" : "NON"}`));

const portailUrl = "https://sigmacivil-ds69focn.manus.space/dashboard/courtier";

for (const courtier of rows) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #111; }
  .header { background: #000; padding: 32px 40px; border-bottom: 2px solid #C9A84C; }
  .logo { font-size: 22px; font-weight: 900; letter-spacing: 4px; color: #fff; }
  .logo span { color: #C9A84C; }
  .body { padding: 40px; }
  .title { font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 8px; }
  .subtitle { color: #C9A84C; font-size: 13px; font-weight: bold; letter-spacing: 2px; margin-bottom: 24px; }
  .block { background: #0a0a0a; border: 1px solid #222; padding: 20px 24px; margin: 20px 0; }
  .block-title { color: #C9A84C; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
  .block-value { color: #fff; font-size: 15px; font-weight: bold; }
  .block-sub { color: #888; font-size: 12px; margin-top: 4px; }
  .steps { margin: 20px 0; }
  .step { display: flex; align-items: flex-start; gap: 12px; margin: 10px 0; }
  .step-num { background: #C9A84C; color: #000; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; }
  .cta { display: block; background: #C9A84C; color: #000; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 2px; text-align: center; padding: 16px 32px; margin: 32px 0; }
  .footer { padding: 24px 40px; border-top: 1px solid #222; color: #555; font-size: 12px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">SIGMA <span>FACTORY</span></div>
    <div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;">CONSEIL EN IMMOBILIER &amp; FINANCEMENT</div>
  </div>
  <div class="body">
    <div class="title">Bienvenue dans le réseau, ${courtier.prenom} !</div>
    <div class="subtitle">COURTIER PARTENAIRE — SIGMA FACTORY</div>
    
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      Votre convention de partenariat a été signée électroniquement et enregistrée. 
      Voici toutes vos informations d'accès à votre espace courtier.
    </p>

    <div class="block">
      <div class="block-title">Accès à votre espace courtier</div>
      <div class="block-value">${portailUrl}</div>
      <div class="block-sub">Votre email de connexion : ${courtier.email}</div>
    </div>

    <div class="steps">
      <div class="block-title" style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Comment vous connecter</div>
      <div class="step">
        <div class="step-num">1</div>
        <div style="color:#ccc;font-size:14px;">Rendez-vous sur votre espace courtier en cliquant sur le bouton ci-dessous</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div style="color:#ccc;font-size:14px;">Saisissez votre adresse email : <strong style="color:#fff;">${courtier.email}</strong></div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div style="color:#ccc;font-size:14px;">Cliquez sur "Accéder à mon espace" — aucun mot de passe requis</div>
      </div>
    </div>

    ${courtier.codeParrain ? `
    <div class="block">
      <div class="block-title">Votre code parrain</div>
      <div class="block-value" style="font-family:monospace;font-size:22px;letter-spacing:4px;">${courtier.codeParrain}</div>
      <div class="block-sub">Partagez ce code pour parrainer d'autres courtiers et agents — 10% de rétrocommission N1</div>
    </div>
    ` : ""}

    ${courtier.conventionPdfUrl ? `
    <div class="block">
      <div class="block-title">Votre convention signée</div>
      <div class="block-sub" style="margin-bottom:10px;">Convention de Partenariat Courtage — signée électroniquement</div>
      <a href="${courtier.conventionPdfUrl}" style="color:#C9A84C;font-size:13px;font-weight:bold;">📄 Télécharger ma convention PDF →</a>
    </div>
    ` : ""}

    <a href="${portailUrl}" class="cta">ACCÉDER À MON ESPACE COURTIER →</a>

    <p style="color:#666;font-size:13px;line-height:1.6;">
      Pour toute question, contactez l'équipe Sigma Factory :<br>
      <a href="mailto:manondubost@sigmaipf.fr" style="color:#C9A84C;">manondubost@sigmaipf.fr</a>
    </p>
  </div>
  <div class="footer">
    Sigma Factory — Conseil en Immobilier &amp; Financement<br>
    Cet email a été envoyé à ${courtier.email} suite à votre inscription comme courtier partenaire.
  </div>
</div>
</body>
</html>`;

  const { data, error } = await resend.emails.send({
    from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
    to: courtier.email,
    subject: `Bienvenue dans le réseau Sigma Factory — ${courtier.prenom} ${courtier.nom}`,
    html,
  });

  if (error) {
    console.error(`❌ Erreur pour ${courtier.prenom} ${courtier.nom}:`, error);
  } else {
    console.log(`✅ Email envoyé à ${courtier.prenom} ${courtier.nom} <${courtier.email}> — ID: ${data.id}`);
  }
}

await conn.end();
console.log("\nTerminé !");

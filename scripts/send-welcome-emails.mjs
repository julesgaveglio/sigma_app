/**
 * Script d'envoi des emails de bienvenue à Mélanie et Jérôme
 * Usage: node scripts/send-welcome-emails.mjs
 */
import { Resend } from "resend";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const ORIGIN = "https://sigmacivil-ds69focn.manus.space";

if (!RESEND_API_KEY || !DATABASE_URL) {
  console.error("❌ Variables d'environnement manquantes");
  process.exit(1);
}

// ─── Template email ────────────────────────────────────────────────────────────
function buildHtml({ prenom, nom, email, codeParrain, portailUrl, contratUrl }) {
  const lienParrainage = `${ORIGIN}/parrainage/${codeParrain}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bienvenue chez Sigma Factory</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #C9A84C;border-radius:8px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a1a,#0d0d0d);padding:40px 32px;text-align:center;border-bottom:2px solid #C9A84C;">
      <div style="font-size:28px;font-weight:700;color:#C9A84C;letter-spacing:3px;">SIGMA FACTORY</div>
      <div style="color:#888;font-size:13px;margin-top:4px;letter-spacing:1px;">RÉSEAU IMMOBILIER PREMIUM</div>
    </div>
    <!-- Body -->
    <div style="padding:40px 32px;">
      <h1 style="color:#C9A84C;font-size:22px;margin:0 0 8px;">Bienvenue dans le réseau, ${prenom} !</h1>
      <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 32px;">
        Votre inscription en tant qu'agent immobilier partenaire a bien été enregistrée.<br>
        Voici toutes vos informations d'accès à conserver précieusement.
      </p>

      <!-- Infos connexion -->
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:24px;margin-bottom:24px;">
        <div style="color:#C9A84C;font-size:12px;font-weight:600;letter-spacing:2px;margin-bottom:16px;">ACCÈS À VOTRE ESPACE</div>
        
        <div style="margin-bottom:16px;">
          <div style="color:#888;font-size:12px;margin-bottom:4px;">URL de connexion</div>
          <div style="color:#fff;font-size:14px;word-break:break-all;">${portailUrl}</div>
        </div>
        
        <div style="margin-bottom:16px;">
          <div style="color:#888;font-size:12px;margin-bottom:4px;">Votre email de connexion</div>
          <div style="color:#C9A84C;font-size:14px;font-weight:600;">${email}</div>
        </div>

        <div style="background:#0d0d0d;border-radius:4px;padding:12px;margin-top:8px;">
          <div style="color:#888;font-size:12px;margin-bottom:6px;">📋 Comment vous connecter :</div>
          <div style="color:#ccc;font-size:13px;line-height:1.5;">
            1. Rendez-vous sur <strong style="color:#C9A84C;">${portailUrl}</strong><br>
            2. Saisissez votre email : <strong style="color:#C9A84C;">${email}</strong><br>
            3. Cliquez sur <strong>"Accéder à mon espace"</strong>
          </div>
        </div>
      </div>

      <!-- Code parrain -->
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:24px;margin-bottom:24px;">
        <div style="color:#C9A84C;font-size:12px;font-weight:600;letter-spacing:2px;margin-bottom:16px;">VOTRE CODE PARRAIN</div>
        
        <div style="margin-bottom:12px;">
          <div style="color:#888;font-size:12px;margin-bottom:4px;">Code unique</div>
          <div style="background:#0d0d0d;border:1px solid #C9A84C;border-radius:4px;padding:10px 16px;color:#C9A84C;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:2px;">${codeParrain}</div>
        </div>
        
        <div>
          <div style="color:#888;font-size:12px;margin-bottom:4px;">Votre lien de parrainage (50% de rétrocommission)</div>
          <div style="color:#aaa;font-size:13px;word-break:break-all;">${lienParrainage}</div>
        </div>
      </div>

      ${contratUrl ? `
      <!-- Contrat -->
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:24px;margin-bottom:24px;">
        <div style="color:#C9A84C;font-size:12px;font-weight:600;letter-spacing:2px;margin-bottom:12px;">VOTRE CONTRAT SIGNÉ</div>
        <a href="${contratUrl}" style="color:#C9A84C;font-size:14px;">📄 Télécharger votre contrat PDF</a>
      </div>
      ` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin-top:32px;">
        <a href="${portailUrl}" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
          ACCÉDER À MON ESPACE AGENT →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:24px 32px;border-top:1px solid #222;text-align:center;">
      <div style="color:#555;font-size:12px;">Sigma Factory — Réseau immobilier premium</div>
      <div style="color:#444;font-size:11px;margin-top:4px;">Pour toute question : elodie@sigmafactory.fr</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Connexion DB et envoi ─────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Récupérer Mélanie (ID:30002) et Jérôme (ID:90001)
  const [rows] = await conn.execute(
    "SELECT id, prenom, nom, email, codeParrain, contratPdfUrl, statutInterne FROM ambassadeurs WHERE id IN (30002, 90001)"
  );
  
  await conn.end();
  
  if (!rows || rows.length === 0) {
    console.error("❌ Aucun ambassadeur trouvé");
    process.exit(1);
  }

  console.log(`✅ ${rows.length} ambassadeur(s) trouvé(s)`);
  
  const resend = new Resend(RESEND_API_KEY);
  
  for (const amb of rows) {
    console.log(`\n📧 Envoi à ${amb.prenom} ${amb.nom} (${amb.email})...`);
    console.log(`   Code parrain: ${amb.codeParrain}`);
    console.log(`   Contrat PDF: ${amb.contratPdfUrl ? 'oui' : 'non'}`);
    
    const portailUrl = `${ORIGIN}/portail`;
    const html = buildHtml({
      prenom: amb.prenom,
      nom: amb.nom,
      email: amb.email,
      codeParrain: amb.codeParrain || "",
      portailUrl,
      contratUrl: amb.contratPdfUrl || null,
    });
    
    const { data, error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: amb.email,
      subject: `Bienvenue dans le réseau Sigma Factory — ${amb.prenom} ${amb.nom}`,
      html,
    });
    
    if (error) {
      console.error(`   ❌ Erreur: ${JSON.stringify(error)}`);
    } else {
      console.log(`   ✅ Email envoyé ! ID: ${data?.id}`);
    }
  }
  
  console.log("\n✅ Terminé !");
}

main().catch(console.error);

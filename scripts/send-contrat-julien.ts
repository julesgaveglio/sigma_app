import { getDb } from "../server/db";
import { courtiers } from "../drizzle/schema";
import { like } from "drizzle-orm";
import { Resend } from "resend";

const db = await getDb();
if (!db) { console.error("DB indisponible"); process.exit(1); }

const [julien] = await db.select().from(courtiers).where(like(courtiers.nom, "%Soumillon%")).limit(1);
if (!julien) { console.error("Julien Soumillon introuvable"); process.exit(1); }

console.log("Courtier:", julien.prenom, julien.nom, julien.email);
console.log("Convention PDF:", julien.conventionPdfUrl ?? "AUCUNE");

if (!julien.conventionPdfUrl) {
  console.error("Pas de PDF disponible pour Julien. Générez-le d'abord.");
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.header { background: #1a1a1a; padding: 24px 32px; text-align: center; }
.header h1 { color: #D4AF37; margin: 0; font-size: 22px; letter-spacing: 2px; }
.header p { color: #999; margin: 6px 0 0; font-size: 13px; }
.body { padding: 32px; color: #333; font-size: 15px; line-height: 1.6; }
.highlight { background: #fffbea; border-left: 3px solid #D4AF37; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
.cta { text-align: center; margin-top: 28px; }
.cta a { background: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; }
.footer { background: #f9f9f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
</style></head><body>
<div class="container">
  <div class="header">
    <h1>SIGMA FACTORY</h1>
    <p>Votre convention de partenariat courtier</p>
  </div>
  <div class="body">
    <p>Bonjour <strong>${julien.prenom}</strong>,</p>
    <p>Bienvenue dans le réseau <strong>Sigma Factory</strong> ! Nous sommes ravis de vous compter parmi nos partenaires courtiers.</p>
    <p>Vous trouverez ci-dessous le lien vers votre convention de partenariat signée. Nous vous invitons à la télécharger et à la conserver précieusement.</p>
    <div class="highlight">
      <strong>Votre convention est disponible en cliquant sur le bouton ci-dessous.</strong><br>
      Elle récapitule les conditions de notre partenariat, la grille de commissions et vos droits de parrainage.
    </div>
    <div class="cta">
      <a href="${julien.conventionPdfUrl}" target="_blank">📄 Télécharger ma convention</a>
    </div>
    <p style="margin-top: 28px;">Pour accéder à votre espace membre et retrouver votre code de parrainage :</p>
    <div class="cta">
      <a href="https://www.sigmafactory.org/portail-membre" target="_blank" style="background: #333; color: #D4AF37;">🔐 Mon espace membre</a>
    </div>
    <p style="margin-top: 24px; font-size: 13px; color: #666;">Si vous avez la moindre question, n'hésitez pas à nous contacter directement.</p>
    <p>À très bientôt,<br><strong>L'équipe Sigma Factory</strong></p>
  </div>
  <div class="footer">Sigma Factory — Réseau courtiers partenaires</div>
</div>
</body></html>`;

const result = await resend.emails.send({
  from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
  to: julien.email,
  cc: "manondubost@sigmaipf.fr",
  subject: "📄 Votre convention de partenariat Sigma Factory",
  html,
});

if (result.error) {
  console.error("✗ Erreur envoi email:", result.error.message);
} else {
  console.log("✓ Email avec convention envoyé à", julien.email, "— id:", result.data?.id);
  console.log("✓ Copie envoyée à manondubost@sigmaipf.fr");
}

process.exit(0);

// Script one-shot : renvoyer l'email de bienvenue à Julien Soumillon
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY manquant');
  process.exit(1);
}

const { Resend } = require('resend');
const resend = new Resend(RESEND_API_KEY);

const tempPassword = 'DusaWxNK58';
const email = 'julien@js-courtage-et-financement.com';
const portailUrl = 'https://www.sigmafactory.org/login';

const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#0a0a0a;padding:32px 40px;border-bottom:1px solid #222;">
            <h1 style="color:#c9a84c;margin:0;font-size:22px;letter-spacing:2px;">SIGMA FACTORY</h1>
            <p style="color:#555;margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Réseau de courtiers partenaires</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">Bonjour Julien,</h2>
            <p style="color:#aaa;line-height:1.7;margin:0 0 24px;">
              Bienvenue dans le réseau <strong style="color:#c9a84c;">Sigma Factory</strong> ! Votre espace courtier est maintenant actif. Voici vos identifiants de connexion :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #333;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Vos identifiants</p>
                  <p style="color:#fff;margin:0 0 8px;font-size:14px;"><strong>Email :</strong> ${email}</p>
                  <p style="color:#c9a84c;margin:0;font-size:14px;"><strong>Mot de passe temporaire :</strong> ${tempPassword}</p>
                </td>
              </tr>
            </table>
            <p style="color:#aaa;line-height:1.7;margin:0 0 32px;">
              Nous vous recommandons de changer votre mot de passe dès votre première connexion depuis votre profil.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${portailUrl}" style="display:inline-block;background:#c9a84c;color:#000;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;">
                    Accéder à mon espace →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #1a1a1a;">
            <p style="color:#444;font-size:12px;margin:0;text-align:center;">
              Problème de connexion ? Contactez Manon : <a href="mailto:manondubost@sigmaipf.fr" style="color:#c9a84c;">manondubost@sigmaipf.fr</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

try {
  const result = await resend.emails.send({
    from: 'Sigma Factory <noreply@fa.sigma-factory.fr>',
    to: email,
    subject: 'Bienvenue sur Sigma Factory — Vos accès portail',
    html,
  });
  console.log('Email envoyé avec succès:', JSON.stringify(result));
} catch (err) {
  console.error('Erreur envoi email:', err.message);
}

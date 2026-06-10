import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'Sigma Factory <noreply@fa.sigma-factory.fr>',
  to: 'julien@js-courtage-et-financement.com',
  subject: 'Vos accès Sigma Factory — identifiants confirmés',
  html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 10px; overflow: hidden; }
    .header { padding: 32px; text-align: center; border-bottom: 1px solid #333; }
    .header h1 { color: #D4AF37; margin: 0; font-size: 20px; letter-spacing: 3px; }
    .body { padding: 32px; }
    .body p { color: #ccc; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .credentials { background: #111; border: 1px solid #D4AF37; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .credentials .row { margin-bottom: 12px; }
    .credentials .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px; }
    .credentials .value { font-size: 16px; color: #fff; font-weight: bold; }
    .cta { text-align: center; margin-top: 28px; }
    .cta a { background: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; }
    .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #555; border-top: 1px solid #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SIGMA FACTORY</h1>
    </div>
    <div class="body">
      <p>Bonjour Julien,</p>
      <p>Voici vos identifiants de connexion à la plateforme Sigma Factory. Ces informations ont été vérifiées — vous pouvez vous connecter dès maintenant.</p>
      <div class="credentials">
        <div class="row">
          <span class="label">Adresse email</span>
          <span class="value">julien@js-courtage-et-financement.com</span>
        </div>
        <div class="row">
          <span class="label">Mot de passe</span>
          <span class="value">Sigma2026!</span>
        </div>
      </div>
      <p>Cliquez sur le bouton ci-dessous pour accéder à votre espace courtier.</p>
      <div class="cta">
        <a href="https://www.sigmafactory.org/login">Se connecter</a>
      </div>
    </div>
    <div class="footer">
      Sigma Factory — En cas de difficulté, répondez directement à cet email.
    </div>
  </div>
</body>
</html>`,
});

if (error) {
  console.error('❌ Erreur envoi:', error);
} else {
  console.log('✅ Email envoyé avec succès à Julien. ID:', data.id);
}

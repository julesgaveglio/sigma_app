import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const result = await resend.emails.send({
  from: 'Sigma Factory <noreply@fa.sigma-factory.fr>',
  to: 'julien@js-courtage-et-financement.com',
  subject: '✅ Vos accès Sigma Factory — Identifiants mis à jour',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#111;border-radius:12px;overflow:hidden;">
      <div style="background:#000;padding:24px 32px;border-bottom:2px solid #C9A84C;">
        <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff;">SIGMA <span style="color:#C9A84C;">FACTORY</span></div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#fff;margin:0 0 16px;">Bonjour Julien,</h2>
        <p style="color:#aaa;line-height:1.7;margin:0 0 24px;">Voici vos identifiants de connexion mis à jour pour accéder à votre espace courtier :</p>
        <div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.5);padding:20px 24px;margin-bottom:24px;border-radius:8px;">
          <p style="color:#fff;margin:0 0 10px;font-size:14px;"><strong>Email :</strong> julien@js-courtage-et-financement.com</p>
          <p style="color:#C9A84C;margin:0;font-size:16px;font-weight:bold;font-family:monospace;letter-spacing:2px;"><strong>Mot de passe :</strong> Sigma2026!</p>
        </div>
        <p style="color:#aaa;font-size:13px;line-height:1.6;margin:0 0 24px;">Nous vous recommandons de changer ce mot de passe après votre première connexion.</p>
        <a href="https://www.sigmafactory.org/login" style="display:block;background:#C9A84C;color:#000;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center;padding:14px 28px;border-radius:8px;">SE CONNECTER → www.sigmafactory.org</a>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;text-align:center;">Problème ? Contactez Manon : manondubost@sigmaipf.fr</div>
    </div>
  `,
});
console.log('Email envoyé:', JSON.stringify(result.data));

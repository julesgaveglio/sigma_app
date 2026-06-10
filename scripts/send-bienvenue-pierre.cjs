const { Resend } = require('/home/ubuntu/sigma-etat-civil/node_modules/resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#111">
  <div style="background:#000;padding:24px 32px;border-bottom:2px solid #C9A84C">
    <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff">SIGMA <span style="color:#C9A84C">FACTORY</span></div>
  </div>
  <div style="padding:32px">
    <h2 style="color:#fff;margin:0 0 8px">Bienvenue dans le réseau Sigma Factory, Pierre !</h2>
    <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 24px">Votre convention en tant que courtier partenaire a bien été enregistrée. Voici vos informations d'accès.</p>
    <div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:20px;margin-bottom:16px">
      <div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Votre email de connexion</div>
      <div style="color:#fff;font-size:14px">p.aries@aurafinance.fr</div>
    </div>
    <div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:20px;margin-bottom:16px">
      <div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Comment vous connecter</div>
      <div style="color:#fff;font-size:13px;line-height:1.6">Rendez-vous sur <a href="https://www.sigmafactory.org/login" style="color:#C9A84C">www.sigmafactory.org/login</a>, saisissez votre email et cliquez sur <strong style="color:#fff">Mot de passe oublié</strong> pour créer votre mot de passe.</div>
    </div>
    <div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:20px;margin-bottom:24px">
      <div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Votre code parrain unique</div>
      <div style="color:#fff;font-size:18px;font-weight:900;letter-spacing:3px;font-family:monospace">SIG-ARIES-120001</div>
    </div>
    <a href="https://www.sigmafactory.org/login" style="display:block;background:#C9A84C;color:#000;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center;padding:14px 28px">ACCÉDER À MON ESPACE COURTIER →</a>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;text-align:center">Sigma Factory — Réseau Courtiers Partenaires</div>
</div></body></html>`;

resend.emails.send({
  from: 'Sigma Factory <noreply@fa.sigma-factory.fr>',
  to: 'p.aries@aurafinance.fr',
  subject: 'Bienvenue dans le réseau Sigma Factory — Pierre Aries',
  html,
}).then(r => { console.log('Email envoyé:', JSON.stringify(r)); }).catch(e => console.error('Erreur:', e.message));

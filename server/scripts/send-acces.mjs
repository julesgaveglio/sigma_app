import { Resend } from "resend";
import { config } from "dotenv";
config();

const resend = new Resend(process.env.RESEND_API_KEY);
const portailUrl = "https://www.sigmafactory.org/portail";

function buildHtml(prenom, nom, email, mdp, roleLabel) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#C9A84C,#F0D080,#C9A84C);padding:24px 32px;">
      <div style="font-size:11px;letter-spacing:3px;color:#000;text-transform:uppercase;font-weight:600;">Sigma Factory — Portail membre</div>
      <div style="font-size:20px;font-weight:700;color:#000;margin-top:6px;">Vos accès au portail, ${prenom} !</div>
    </div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:#22c55e;color:#000;font-weight:bold;font-size:11px;padding:3px 12px;border-radius:20px;margin-bottom:20px;">Accès activé</span>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">Votre espace ${roleLabel} est maintenant accessible. Voici vos identifiants de connexion.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;width:40%;">Votre email</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">${email}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Mot de passe temporaire</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#D4AF37;font-size:13px;font-weight:bold;">${mdp}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:13px;">Important</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;">Connectez-vous et changez votre mot de passe dès votre première connexion via le bouton "Mot de passe" dans votre espace.</td>
        </tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${portailUrl}" style="background:#D4AF37;color:#000;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">Accéder à mon espace</a>
      </div>
    </div>
    <div style="background:#0d0d0d;padding:14px 32px;text-align:center;font-size:11px;color:#444;border-top:1px solid #1e1e1e;">
      Sigma Factory — Système de gestion interne
    </div>
  </div>
</body>
</html>`;
}

const membres = [
  { email: "p.aries@aurafinance.fr", prenom: "Pierre", nom: "Aries", role: "courtier partenaire", mdp: "Sigma2026!" },
  { email: "savesmelanie@gmail.com", prenom: "Mélanie", nom: "SAVES", role: "agent ambassadeur", mdp: "Sigma2026!" },
];

for (const m of membres) {
  const { error } = await resend.emails.send({
    from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
    to: m.email,
    subject: `Vos accès au portail Sigma Factory — ${m.prenom} ${m.nom}`,
    html: buildHtml(m.prenom, m.nom, m.email, m.mdp, m.role),
  });
  if (error) console.error("Erreur envoi", m.email, error);
  else console.log("✅ Email envoyé à", m.email);
}
console.log("Terminé");

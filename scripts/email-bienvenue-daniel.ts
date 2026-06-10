import { getDb } from "../server/db";
import { courtiers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

async function run() {
  const db = (await getDb());
  if (!db) { console.error("DB indisponible"); process.exit(1); }

  const [c] = await db.select().from(courtiers).where(eq(courtiers.email, "daniel.barcelo@ymanci.com")).limit(1);
  if (!c) { console.log("Courtier non trouvé"); process.exit(0); }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2a1f0a 100%);padding:40px 40px 30px;text-align:center;border-bottom:1px solid #d4a017;">
            <p style="margin:0 0 8px;font-size:13px;color:#d4a017;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Sigma Factory</p>
            <h1 style="margin:0;font-size:28px;color:#ffffff;font-weight:700;line-height:1.2;">Bienvenue dans le réseau,<br><span style="color:#d4a017;">Daniel !</span></h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#cccccc;font-size:15px;line-height:1.7;">
              Bonjour Daniel,
            </p>
            <p style="margin:0 0 20px;color:#cccccc;font-size:15px;line-height:1.7;">
              Nous sommes ravis de vous accueillir officiellement dans le réseau <strong style="color:#ffffff;">Sigma Factory</strong> en tant que courtier partenaire. Votre convention a bien été enregistrée et vous trouverez votre exemplaire signé en pièce jointe de cet email.
            </p>
            <p style="margin:0 0 30px;color:#cccccc;font-size:15px;line-height:1.7;">
              Voici comment accéder à votre espace partenaire :
            </p>

            <!-- Steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
              <tr>
                <td style="padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #d4a017;margin-bottom:12px;display:block;">
                  <p style="margin:0 0 4px;color:#d4a017;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Étape 1 — Connexion</p>
                  <p style="margin:0;color:#ffffff;font-size:14px;">Rendez-vous sur <a href="https://www.sigmafactory.org/login" style="color:#d4a017;text-decoration:none;font-weight:600;">www.sigmafactory.org/login</a></p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #d4a017;">
                  <p style="margin:0 0 4px;color:#d4a017;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Étape 2 — Vos identifiants</p>
                  <p style="margin:0 0 6px;color:#cccccc;font-size:14px;">Email : <strong style="color:#ffffff;">daniel.barcelo@ymanci.com</strong></p>
                  <p style="margin:0;color:#cccccc;font-size:14px;">Mot de passe : celui que vous avez créé lors de votre inscription. Si vous l'avez oublié, cliquez sur <strong style="color:#ffffff;">"Mot de passe oublié"</strong> sur la page de connexion.</p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #d4a017;">
                  <p style="margin:0 0 4px;color:#d4a017;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Étape 3 — Votre espace courtier</p>
                  <p style="margin:0;color:#cccccc;font-size:14px;">Depuis votre espace, vous retrouverez votre <strong style="color:#ffffff;">code parrain</strong>, vos <strong style="color:#ffffff;">dossiers de financement</strong> assignés par Manon, et le suivi de vos <strong style="color:#ffffff;">commissions</strong>.</p>
                </td>
              </tr>
            </table>

            <!-- Convention PDF -->
            ${c.conventionPdfUrl ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
              <tr>
                <td style="padding:20px;background:#1a1f0a;border-radius:8px;border:1px solid #2a3a0a;text-align:center;">
                  <p style="margin:0 0 8px;color:#86efac;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📄 Votre convention signée</p>
                  <a href="${c.conventionPdfUrl}" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#22c55e;color:#000000;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">Télécharger mon contrat (PDF)</a>
                </td>
              </tr>
            </table>
            ` : ""}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
              <tr>
                <td align="center">
                  <a href="https://www.sigmafactory.org/login" style="display:inline-block;padding:14px 36px;background:#d4a017;color:#000000;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.5px;">Accéder à mon espace →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#888888;font-size:13px;line-height:1.6;">
              Pour toute question, n'hésitez pas à contacter directement Manon Dubost, votre référente réseau.
            </p>
            <p style="margin:0;color:#cccccc;font-size:15px;line-height:1.7;">
              À très bientôt,<br>
              <strong style="color:#d4a017;">L'équipe Sigma Factory</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#0d0d0d;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="margin:0;color:#555555;font-size:12px;">© 2026 Sigma Factory — <a href="https://www.sigmafactory.org" style="color:#d4a017;text-decoration:none;">www.sigmafactory.org</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  const { error } = await resend.emails.send({
    from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
    to: "daniel.barcelo@ymanci.com",
    subject: "Bienvenue dans le réseau Sigma Factory — Vos accès et votre convention",
    html,
  });

  if (error) {
    console.error("Erreur envoi email:", error);
    process.exit(1);
  }

  console.log("✓ Email professionnel envoyé à daniel.barcelo@ymanci.com");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

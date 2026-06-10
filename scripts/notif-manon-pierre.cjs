const mysql = require('../node_modules/mysql2/promise.js');
const { Resend } = require('../node_modules/resend/dist/index.js');

async function main() {
  // 1. Vérifier si notif in-app déjà créée pour Manon
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [existing] = await conn.query(
    "SELECT id FROM notifications WHERE destinataire = 'Manon' AND titre LIKE '%Pierre%Aries%' LIMIT 1"
  );
  console.log('Notif in-app existante:', existing.length > 0 ? 'OUI — déjà envoyée' : 'NON — à créer');

  if (existing.length === 0) {
    await conn.execute(
      "INSERT INTO notifications (destinataire, type, titre, message, lien) VALUES (?, ?, ?, ?, ?)",
      ['Manon', 'nouveau_courtier', '🎉 Nouveau filleul courtier : Pierre Aries', 'Pierre Aries vient de rejoindre le réseau grâce à votre parrainage !', '/courtiers']
    );
    console.log('✓ Notif in-app Manon créée');
  }
  await conn.end();

  // 2. Envoyer l'email à Manon
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.header { background: #1a1a1a; padding: 24px 32px; text-align: center; }
.header h1 { color: #D4AF37; margin: 0; font-size: 22px; letter-spacing: 2px; }
.header p { color: #999; margin: 6px 0 0; font-size: 13px; }
.body { padding: 32px; }
.badge { display: inline-block; background: #D4AF37; color: #1a1a1a; font-weight: bold; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
.field { margin-bottom: 12px; }
.field label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px; }
.field span { font-size: 15px; color: #222; font-weight: 500; }
.cta { text-align: center; margin-top: 28px; }
.cta a { background: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; }
.footer { background: #f9f9f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
</style></head><body>
<div class="container">
  <div class="header">
    <h1>SIGMA FACTORY</h1>
    <p>Nouveau filleul courtier — parrainage confirmé</p>
  </div>
  <div class="body">
    <div class="badge">🎉 Nouveau filleul</div>
    <div class="field"><label>Nom</label><span>Pierre Aries</span></div>
    <div class="field"><label>Email</label><span>p.aries@aurafinance.fr</span></div>
    <div class="field"><label>Cabinet</label><span>Aura Finance</span></div>
    <div class="field"><label>Parrain</label><span>Manon Dubost</span></div>
    <div class="field"><label>Statut</label><span>Actif — convention signée ✓</span></div>
    <div class="cta"><a href="https://www.sigmafactory.org/courtiers">Voir le réseau courtiers</a></div>
  </div>
  <div class="footer">Sigma Factory — Réseau courtiers</div>
</div>
</body></html>`;

  const result = await resend.emails.send({
    from: 'Sigma Factory <noreply@fa.sigma-factory.fr>',
    to: 'manondubost@sigmaipf.fr',
    subject: '🎉 Nouveau filleul courtier : Pierre Aries',
    html,
  });

  if (result.error) {
    console.error('✗ Email ERREUR:', result.error.message);
  } else {
    console.log('✓ Email envoyé à Manon — id:', result.data?.id);
  }
}

main().catch(console.error);

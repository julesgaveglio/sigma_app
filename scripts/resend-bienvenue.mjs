/**
 * Script pour renvoyer l'email de bienvenue ambassadeur via la procédure tRPC
 * Usage: node scripts/resend-bienvenue.mjs
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Récupérer les infos de l'ambassadeur et appeler directement le mailer via require CJS
const { createRequire } = await import('module');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Récupérer les infos de Mélanie
  const [rows] = await conn.execute(
    'SELECT id, prenom, nom, email, codeParrain FROM ambassadeurs WHERE id = 30002'
  );
  await conn.end();
  
  if (!rows.length) {
    console.error('Ambassadeur introuvable');
    process.exit(1);
  }
  
  const amb = rows[0];
  console.log(`Renvoi email pour: ${amb.prenom} ${amb.nom} <${amb.email}>`);
  console.log(`Code parrain: ${amb.codeParrain}`);
  
  // Appeler l'API tRPC via fetch HTTP
  const portailUrl = 'https://sigmacivil-ds69focn.manus.space/portail-membre';
  
  const res = await fetch('http://localhost:3000/api/trpc/ambassadeurs.renvoyerEmailBienvenue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: amb.id }),
  });
  
  if (res.ok) {
    console.log('✓ Email envoyé avec succès');
  } else {
    // Fallback : appeler directement via Resend API
    console.log('Procédure tRPC non disponible, envoi direct via Resend...');
    await envoyerDirectement(amb, portailUrl);
  }
}

async function envoyerDirectement(amb, portailUrl) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY non disponible');
    process.exit(1);
  }
  
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #D4AF37; font-size: 28px;">SIGMA FACTORY</h1>
    </div>
    <h2 style="color: #D4AF37;">Bienvenue ${amb.prenom} !</h2>
    <p>Votre inscription en tant qu'ambassadrice Sigma Factory a bien été enregistrée.</p>
    <p><strong>Votre code parrain :</strong> <span style="color: #D4AF37; font-size: 18px; font-weight: bold;">${amb.codeParrain}</span></p>
    <p>Partagez ce code à vos filleuls lors de leur inscription pour développer votre réseau.</p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${portailUrl}" style="background: #D4AF37; color: #000; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Accéder à mon espace personnel →
      </a>
    </div>
    <p style="color: #888; font-size: 14px;">Votre lien de parrainage : ${portailUrl.replace('/portail-membre', '')}/rejoindre?parrain=${amb.codeParrain}</p>
    <hr style="border-color: #333; margin: 32px 0;">
    <p style="color: #888; font-size: 12px; text-align: center;">Sigma Factory — Confidentiel</p>
  </div>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Sigma Factory <onboarding@resend.dev>',
      to: ['othmanehiyadi@sigmaipf.fr'], // Mode test : envoi à l'owner pour transfert à Mélanie
      subject: `Bienvenue chez Sigma Factory — Votre code parrain ${amb.codeParrain}`,
      html,
    }),
  });
  
  const data = await response.json();
  if (response.ok) {
    console.log(`✓ Email envoyé avec succès (id: ${data.id})`);
  } else {
    console.error('Erreur Resend:', data);
  }
}

main().catch(console.error);

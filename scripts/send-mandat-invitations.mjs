import { createRequire } from "module";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const { default: mysql } = await import("mysql2/promise");
const { Resend } = await import("resend");

const db = await mysql.createConnection(process.env.DATABASE_URL);
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = "https://3000-imlxlm3o42tuxepz45ft6-a7ef2e5c.us2.manus.computer";

// Récupérer les leads sans mandat signé dans le pipe Immo
const [leads] = await db.execute(`
  SELECT id, nom, prenom, email, telephone, budgetMax, projetType
  FROM crm_leads
  WHERE etape = 'recherche_bien'
    AND (mandatSigne IS NULL OR mandatSigne = 0)
    AND email IS NOT NULL
    AND email != ''
  ORDER BY nom ASC
`);

console.log(`\n📋 ${leads.length} leads sans mandat trouvés\n`);

let envoyes = 0;
let erreurs = 0;
const resultats = [];

for (const lead of leads) {
  const nomAffiche = lead.nom ? lead.nom.toUpperCase() : "CLIENT";
  const isCouple = nomAffiche.includes("&") || nomAffiche.includes("ET ") || nomAffiche.includes(" ET");
  
  // Construire l'URL pré-remplie du formulaire mandat
  const params = new URLSearchParams({
    nom: lead.nom || "",
    prenom: lead.prenom || "",
    email: lead.email || "",
    tel: lead.telephone || "",
    budget: lead.budgetMax ? String(lead.budgetMax) : "",
    leadId: String(lead.id),
  });
  const mandatUrl = `${BASE_URL}/mandat?${params.toString()}`;

  const salutation = `Madame, Monsieur <strong style="color:#fff;">${nomAffiche}</strong>,`;
  const subject = `Famille ${nomAffiche} — Pré-remplissez votre Mandat de Recherche — Sigma Factory`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:0"><div style="max-width:600px;margin:0 auto;background:#111"><div style="background:#000;padding:28px 36px;border-bottom:2px solid #C9A84C"><div style="font-size:20px;font-weight:900;letter-spacing:4px">SIGMA <span style="color:#C9A84C">FACTORY</span></div><div style="color:#888;font-size:11px;letter-spacing:2px;margin-top:4px;text-transform:uppercase">Pôle Immobilier</div></div><div style="padding:36px"><h2 style="margin:0 0 6px;color:#fff">Votre Mandat de Recherche est prêt à compléter</h2><p style="color:#C9A84C;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Étape Recherche de Bien — Sigma Factory</p><p style="color:#aaa;font-size:14px;line-height:1.8;margin:0 0 20px">${salutation}<br><br>Votre dossier avance ! Dans le cadre de votre accompagnement Sigma Factory, nous vous invitons à <strong style="color:#fff">pré-remplir votre Mandat de Recherche et de Négociation</strong> afin qu'Élodie, votre conseillère immobilière dédiée, puisse démarrer officiellement la recherche de votre bien.<br><br>Une fois vos informations renseignées, vous recevrez le <strong style="color:#C9A84C">vrai mandat à signer électroniquement</strong> via notre plateforme officielle.</p><div style="background:#0a0a0a;border:1px solid rgba(201,168,76,0.3);padding:20px 24px;margin:0 0 28px"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Ce que vous allez renseigner</div><div style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px">Mandat de Recherche et de Négociation</div><div style="color:#aaa;font-size:13px;line-height:1.8">• Vos coordonnées et celles de votre co-acquéreur (si applicable)<br>• La description de votre bien idéal<br>• Votre budget maximum<br>• Durée : <strong style="color:#ddd">12 mois</strong> — Honoraires : <strong style="color:#ddd">5% H.T.</strong></div></div><div style="background:#1a1a0a;border:1px solid rgba(201,168,76,0.2);padding:14px 20px;margin:0 0 28px;border-radius:2px"><div style="color:#C9A84C;font-size:11px;font-weight:bold;margin-bottom:4px">ℹ Étape suivante après validation</div><div style="color:#aaa;font-size:12px">Vous recevrez le mandat officiel à signer électroniquement via notre plateforme partenaire.</div></div><div style="text-align:center;margin:28px 0"><a href="${mandatUrl}" style="background:#C9A84C;color:#000;text-decoration:none;padding:16px 36px;font-weight:900;font-size:15px;letter-spacing:1px;display:inline-block">PRÉ-REMPLIR MON MANDAT</a></div><p style="color:#666;font-size:12px;line-height:1.6;text-align:center;margin:0 0 24px">Le formulaire est pré-rempli avec vos informations.<br>Il vous suffit de vérifier et compléter la description de votre bien.</p><div style="border-top:1px solid #222;margin:24px 0"></div><div style="background:#0a0a0a;border:1px solid #222;padding:16px 20px;margin-bottom:20px"><div style="color:#C9A84C;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Après signature du mandat</div><div style="color:#fff;font-size:14px;font-weight:bold;margin-bottom:4px">Point Immobilier avec Élodie — 45 min</div><div style="color:#aaa;font-size:13px">Élodie vous contactera pour fixer votre premier rendez-vous de recherche.</div></div><p style="color:#555;font-size:12px;line-height:1.6;margin:0">Une question ? <a href="mailto:elodie@sigmafactory.fr" style="color:#C9A84C">elodie@sigmafactory.fr</a></p></div><div style="padding:16px 36px;border-top:1px solid #222;color:#444;font-size:11px;text-align:center;line-height:1.6">Sigma Factory — Pôle Immobilier<br><a href="https://www.sigmafactory.fr/politique-de-confidentialite-sigma-factory/" style="color:#555;text-decoration:none">Politique de confidentialité</a> &nbsp;·&nbsp; <a href="mailto:contact@sigmafactory.fr" style="color:#555;text-decoration:none">contact@sigmafactory.fr</a></div></div></body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: "Sigma Factory <noreply@fa.sigma-factory.fr>",
      to: lead.email,
      subject,
      html,
    });

    if (error) {
      console.error(`  ❌ ${nomAffiche} (${lead.email}) — ${error.message}`);
      erreurs++;
      resultats.push({ nom: nomAffiche, email: lead.email, statut: "ERREUR", detail: error.message });
    } else {
      console.log(`  ✅ ${nomAffiche} (${lead.email})`);
      envoyes++;
      resultats.push({ nom: nomAffiche, email: lead.email, statut: "ENVOYÉ" });
    }
  } catch (err) {
    console.error(`  ❌ ${nomAffiche} (${lead.email}) — ${err.message}`);
    erreurs++;
    resultats.push({ nom: nomAffiche, email: lead.email, statut: "ERREUR", detail: err.message });
  }

  // Pause 200ms entre chaque envoi pour éviter le rate limiting
  await new Promise(r => setTimeout(r, 200));
}

await db.end();

console.log(`\n${"─".repeat(50)}`);
console.log(`📊 Résultat : ${envoyes} envoyés, ${erreurs} erreurs`);
console.log(`${"─".repeat(50)}\n`);

// Afficher le tableau récapitulatif
console.table(resultats);

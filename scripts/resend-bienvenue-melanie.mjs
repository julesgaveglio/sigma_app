// Script pour renvoyer l'email de bienvenue à Mélanie Saves
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Charger les variables d'environnement
const dotenv = require('dotenv');
dotenv.config();

// Importer le mailer compilé via ts-node
import { execSync } from 'child_process';

const script = `
const { sendBienvenueAmbassadeur } = require('./server/mailer');

const portailUrl = 'https://sigmacivil-ds69focn.manus.space/portail-membre';

sendBienvenueAmbassadeur({
  prenom: 'Mélanie',
  nom: 'SAVES',
  email: 'savesmelanie@gmail.com',
  codeParrain: 'SIG-SAVES-30002',
  portailUrl,
  contratUrl: undefined,
}).then(() => {
  console.log('Email de bienvenue envoyé avec succès à savesmelanie@gmail.com');
}).catch((err) => {
  console.error('Erreur lors de l\\'envoi:', err);
});
`;

// Écrire un fichier temporaire et l'exécuter avec ts-node
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpFile = join(__dirname, '../_tmp_resend.js');
writeFileSync(tmpFile, script);

try {
  const result = execSync(`cd /home/ubuntu/sigma-etat-civil && node -r dotenv/config -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
    encoding: 'utf8',
    env: { ...process.env }
  });
  console.log(result);
} catch (e) {
  console.error(e.stdout || e.message);
} finally {
  try { unlinkSync(tmpFile); } catch {}
}

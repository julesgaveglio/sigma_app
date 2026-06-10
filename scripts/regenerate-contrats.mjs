/**
 * Script de régénération des contrats PDF manquants
 * Usage: node scripts/regenerate-contrats.mjs
 */
import mysql from 'mysql2/promise';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Charger les modules CommonJS
const { generateContratPdf } = await import('../server/contratGenerator.js').catch(async () => {
  // Fallback: compiler et charger via tsx
  const { execSync } = require('child_process');
  execSync('npx tsx --version', { stdio: 'ignore' });
  return {};
});

console.log('Modules chargés');

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Récupérer les données complètes
const [rows] = await conn.execute(
  'SELECT * FROM ambassadeurs WHERE id IN (60002, 90001)'
);

console.log(`${rows.length} ambassadeurs trouvés`);

for (const amb of rows) {
  console.log(`\nTraitement de ${amb.prenom} ${amb.nom} (ID: ${amb.id})...`);
  
  try {
    const pdfBuffer = await generateContratPdf({
      nom: amb.nom.trim(),
      prenom: amb.prenom.trim(),
      email: amb.email,
      telephone: amb.telephone || '',
      adresse: amb.adresse || '',
      codePostal: amb.codePostal || '',
      ville: amb.ville?.trim() || '',
      statut: amb.statut || 'agent_immobilier',
      niveau: amb.niveau || '1',
      ambassadeurId: amb.id,
      dateSignature: amb.dateSignature ? new Date(amb.dateSignature).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
      signatureNom: amb.signatureNom || `${amb.prenom} ${amb.nom}`,
      parrainId: amb.parrainId || undefined,
    });
    
    console.log(`  PDF généré: ${pdfBuffer.length} bytes`);
    
    // Upload vers S3
    const { storagePut } = await import('../server/storage.js');
    const key = `contrats/ambassadeur-${amb.id}-regen.pdf`;
    const { url } = await storagePut(key, pdfBuffer, 'application/pdf');
    
    console.log(`  Uploadé: ${url}`);
    
    // Mettre à jour en BDD
    await conn.execute(
      'UPDATE ambassadeurs SET contratPdfUrl = ?, contratPdfKey = ? WHERE id = ?',
      [url, key, amb.id]
    );
    
    console.log(`  BDD mise à jour ✓`);
  } catch (err) {
    console.error(`  ERREUR: ${err.message}`);
    console.error(err.stack);
  }
}

await conn.end();
console.log('\nTerminé.');

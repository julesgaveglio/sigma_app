import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [cols] = await conn.execute('DESCRIBE crm_leads');
const existing = cols.map(c => c.Field);
console.log('Champs existants:', existing.join(', '));

const needed = [
  { name: 'numeroMandat', sql: 'VARCHAR(32) NULL' },
  { name: 'projetType', sql: "ENUM('Rés. principale','Invest. locatif','RP + IL') NULL" },
  { name: 'budgetMax', sql: 'INT NULL' },
  { name: 'typeBien', sql: 'VARCHAR(255) NULL' },
  { name: 'zoneRecherche', sql: 'TEXT NULL' },
  { name: 'villeResidence', sql: 'VARCHAR(128) NULL' },
  { name: 'departement', sql: 'VARCHAR(8) NULL' },
  { name: 'codePostal', sql: 'VARCHAR(10) NULL' },
  { name: 'dateSignatureMandat', sql: 'VARCHAR(32) NULL' },
];

for (const field of needed) {
  if (!existing.includes(field.name)) {
    console.log(`Ajout colonne: ${field.name}`);
    await conn.execute(`ALTER TABLE crm_leads ADD COLUMN ${field.name} ${field.sql}`);
  } else {
    console.log(`Déjà présent: ${field.name}`);
  }
}

console.log('Migration terminée.');
await conn.end();

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS courtier_soumissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crmLeadId INT NOT NULL,
    courtierNom VARCHAR(255) NOT NULL,
    courtierEmail VARCHAR(320),
    courtierCabinet VARCHAR(255),
    dateEnvoi BIGINT NOT NULL,
    reponse ENUM('en_attente','ok_enveloppe','regroupement','refus','sans_suite') NOT NULL DEFAULT 'en_attente',
    montantEnveloppe INT,
    selectionne BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    creePar VARCHAR(128),
    createdAt BIGINT NOT NULL,
    updatedAt BIGINT NOT NULL
  )
`);

console.log('✅ Table courtier_soumissions créée avec succès');
await conn.end();

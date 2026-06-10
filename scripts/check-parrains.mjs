import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT id, nom, prenom, email, 'ambassadeur' as type, "codeParrain" 
  FROM ambassadeurs WHERE email IN ('manondubost@sigmaipf.fr','elodie@sigmafactory.fr','savesmelanie@gmail.com','jerome.chibau@iadfrance.fr')
  UNION ALL
  SELECT id, nom, prenom, email, 'courtier' as type, "codeParrain"
  FROM courtiers WHERE email IN ('manondubost@sigmaipf.fr','elodie@sigmafactory.fr','savesmelanie@gmail.com','jerome.chibau@iadfrance.fr')
`);

console.log(JSON.stringify(result.rows, null, 2));
await pool.end();

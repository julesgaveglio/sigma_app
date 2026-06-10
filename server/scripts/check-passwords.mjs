import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.query(
  `SELECT id, name, email, role, 
   CASE WHEN passwordHash IS NOT NULL THEN 'OUI' ELSE 'NON' END as has_password,
   CASE WHEN resetToken IS NOT NULL THEN 'OUI' ELSE 'NON' END as has_reset_token
   FROM users WHERE email IN ('othmanehiyadi@sigmaipf.fr', 'assistance.direction@sigmaipf.fr', 'sigmaipf@gmail.com')`
);
console.table(rows);
await conn.end();

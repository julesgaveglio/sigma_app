import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [ae] = await conn.execute(
  "SELECT email, nom, role, actif FROM allowed_emails WHERE email IN ('jerome.chibau@iadfrance.fr', 'savesmelanie@gmail.com')"
);
console.log('allowed_emails:', JSON.stringify(ae, null, 2));

const [us] = await conn.execute(
  "SELECT email, role FROM users WHERE email IN ('jerome.chibau@iadfrance.fr', 'savesmelanie@gmail.com')"
);
console.log('users:', JSON.stringify(us, null, 2));

await conn.end();

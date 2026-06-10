import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { leadActivities } from '../drizzle/schema.ts';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(conn);
  
  try {
    console.log('Test insertion via Drizzle...');
    const result = await db.insert(leadActivities).values({
      crmLeadId: 240002,
      type: 'note',
      auteur: 'Test Drizzle',
      titre: 'Test via Drizzle',
      contenu: 'Contenu test',
    });
    console.log('Insertion OK:', result);
    
    // Vérifier
    const acts = await db.select().from(leadActivities).where(
      (t) => t.crmLeadId.equals(240002)
    );
    console.log('Activités:', acts.length);
    
  } catch(e) {
    console.error('Erreur Drizzle:', e.message);
    console.error('SQL:', e.sql);
  }
  
  await conn.end();
}
main().catch(console.error);

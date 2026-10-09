import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_SCHEMA } from './schema';
import { importContent } from './content';
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_SCHEMA);
  await importContent(db);
}

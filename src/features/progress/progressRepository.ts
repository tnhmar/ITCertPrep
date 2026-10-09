import type { SQLiteDatabase } from 'expo-sqlite';

export interface ProgressTotals { total: number; practiced: number; attempts: number; correct: number; bookmarks: number }
export interface CategoryProgress extends ProgressTotals { id: string; title: string }
export interface RecentSession { id: string; origin: string; total: number; correct: number; created_at: string }
export interface ContentVersion { id: string; title: string; content_version: number; count: number }
export interface ProgressSnapshot { totals: ProgressTotals; categories: CategoryProgress[]; sessions: RecentSession[] }

export async function getProgress(db: SQLiteDatabase): Promise<ProgressSnapshot> {
  const totals = await db.getFirstAsync<ProgressTotals>(`SELECT COUNT(q.id) AS total, COALESCE(SUM(CASE WHEN p.attempts > 0 THEN 1 ELSE 0 END),0) AS practiced, COALESCE(SUM(p.attempts),0) AS attempts, COALESCE(SUM(p.correct_answers),0) AS correct, COALESCE(SUM(CASE WHEN p.bookmarked=1 THEN 1 ELSE 0 END),0) AS bookmarks FROM questions q LEFT JOIN question_progress p ON p.question_id=q.id`);
  const categories = await db.getAllAsync<CategoryProgress>(`SELECT c.id,c.title,COUNT(q.id) AS total, COALESCE(SUM(CASE WHEN p.attempts > 0 THEN 1 ELSE 0 END),0) AS practiced, COALESCE(SUM(p.attempts),0) AS attempts, COALESCE(SUM(p.correct_answers),0) AS correct, COALESCE(SUM(CASE WHEN p.bookmarked=1 THEN 1 ELSE 0 END),0) AS bookmarks FROM categories c LEFT JOIN questions q ON q.category_id=c.id LEFT JOIN question_progress p ON p.question_id=q.id GROUP BY c.id ORDER BY c.title`);
  const sessions = await db.getAllAsync<RecentSession>('SELECT id,origin,total,correct,created_at FROM quiz_sessions ORDER BY created_at DESC, id DESC LIMIT 10');
  return { totals: totals ?? { total: 0, practiced: 0, attempts: 0, correct: 0, bookmarks: 0 }, categories, sessions };
}

export async function getContentVersions(db: SQLiteDatabase): Promise<ContentVersion[]> {
  return db.getAllAsync<ContentVersion>('SELECT c.id,c.title,c.content_version,COUNT(q.id) AS count FROM categories c LEFT JOIN questions q ON q.category_id=c.id GROUP BY c.id ORDER BY c.title');
}

export async function resetStudyHistory(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM quiz_session_answers');
    await db.runAsync('DELETE FROM quiz_sessions');
    await db.runAsync('UPDATE question_progress SET attempts=0,correct_answers=0,last_answered_at=NULL');
  });
}

export async function clearBookmarks(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('UPDATE question_progress SET bookmarked=0 WHERE bookmarked=1');
}

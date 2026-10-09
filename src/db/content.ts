import { CategoryContent, ContentQuestion } from '../types/content';
import agenticAi from '../content/agentic-ai.json';
import cloud from '../content/cloud.json';
import javaSpring from '../content/java-spring.json';
import architecture from '../content/architecture.json';
export const CONTENT: CategoryContent[] = [cloud, javaSpring, architecture, agenticAi];
export function validateContent(content: CategoryContent): void {
  if (content.schemaVersion !== 1 || !content.category?.id || !content.category.title) throw new Error('Unsupported or invalid category content');
  const topics = new Map(content.topics.map(topic => [topic.id, topic]));
  if (topics.size !== content.topics.length) throw new Error(`Duplicate topic ID in ${content.category.id}`);
  const sections = new Set<string>();
  for (const topic of content.topics) for (const section of topic.sections) { const key = `${topic.id}/${section.id}`; if (sections.has(key)) throw new Error(`Duplicate section ID ${key}`); sections.add(key); }
  const ids = new Set<string>();
  for (const q of content.questions) {
    if (ids.has(q.id)) throw new Error(`Duplicate question ID ${q.id}`); ids.add(q.id);
    if (!topics.has(q.topicId) || !sections.has(`${q.topicId}/${q.sectionId}`)) throw new Error(`Question ${q.id} references an unknown topic or section`);
    if (!q.prompt || !q.explanation || !Array.isArray(q.options)) throw new Error(`Question ${q.id} is incomplete`);
    if (q.type === 'true-false' && (q.options.length !== 0 || typeof q.correctAnswer !== 'boolean')) throw new Error(`Invalid true/false question ${q.id}`);
    if (q.type === 'single-choice' && (typeof q.correctAnswer !== 'string' || !q.options.some(o => o.id === q.correctAnswer) || q.options.length < 2)) throw new Error(`Invalid single-choice question ${q.id}`);
  }
}
export async function importContent(db: any): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const content of CONTENT) {
      validateContent(content);
      const prior = await db.getFirstAsync('SELECT content_version FROM categories WHERE id = ?', content.category.id) as { content_version: number } | null;
      if (prior?.content_version === content.category.contentVersion) continue;
      await db.runAsync('INSERT INTO categories(id,title,content_version) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,content_version=excluded.content_version', content.category.id, content.category.title, content.category.contentVersion);
      const topicIds = content.topics.map(t => t.id);
      for (const topic of content.topics) {
        await db.runAsync('INSERT INTO topics(id,category_id,title) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,title=excluded.title', topic.id, content.category.id, topic.title);
        const sectionIds = topic.sections.map(s => s.id);
        for (const section of topic.sections) await db.runAsync('INSERT INTO sections(topic_id,id,title) VALUES(?,?,?) ON CONFLICT(topic_id,id) DO UPDATE SET title=excluded.title', topic.id, section.id, section.title);
        if (sectionIds.length) await db.runAsync(`DELETE FROM sections WHERE topic_id=? AND id NOT IN (${sectionIds.map(() => '?').join(',')})`, topic.id, ...sectionIds);
        else await db.runAsync('DELETE FROM sections WHERE topic_id=?', topic.id);
      }
      if (topicIds.length) await db.runAsync(`DELETE FROM topics WHERE category_id=? AND id NOT IN (${topicIds.map(() => '?').join(',')})`, content.category.id, ...topicIds);
      else await db.runAsync('DELETE FROM topics WHERE category_id=?', content.category.id);
      const questionIds = content.questions.map(q => q.id);
      for (const q of content.questions) await upsertQuestion(db, content, q);
      if (questionIds.length) await db.runAsync(`DELETE FROM questions WHERE category_id=? AND id NOT IN (${questionIds.map(() => '?').join(',')})`, content.category.id, ...questionIds);
      else await db.runAsync('DELETE FROM questions WHERE category_id=?', content.category.id);
    }
  });
}
async function upsertQuestion(db: any, content: CategoryContent, q: ContentQuestion): Promise<void> {
  await db.runAsync('INSERT INTO questions(id,category_id,topic_id,section_id,type,prompt,options_json,correct_answer_json,explanation,difficulty) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,topic_id=excluded.topic_id,section_id=excluded.section_id,type=excluded.type,prompt=excluded.prompt,options_json=excluded.options_json,correct_answer_json=excluded.correct_answer_json,explanation=excluded.explanation,difficulty=excluded.difficulty', q.id, content.category.id, q.topicId, q.sectionId, q.type, q.prompt, JSON.stringify(q.options), JSON.stringify(q.correctAnswer), q.explanation, q.difficulty);
}
export async function recordAnswer(db: any, questionId: string, correct: boolean): Promise<void> {
 await db.runAsync('INSERT INTO question_progress(question_id,attempts,correct_answers,last_answered_at) VALUES(?,1,?,?) ON CONFLICT(question_id) DO UPDATE SET attempts=attempts+1,correct_answers=correct_answers+excluded.correct_answers,last_answered_at=excluded.last_answered_at', questionId, correct ? 1 : 0, new Date().toISOString());
}
export async function toggleBookmark(db: any, questionId: string): Promise<void> {
 await db.runAsync('INSERT INTO question_progress(question_id,bookmarked) VALUES(?,1) ON CONFLICT(question_id) DO UPDATE SET bookmarked=1-bookmarked', questionId);
}
export interface DbQuestion extends Omit<ContentQuestion,'options'|'correctAnswer'> { categoryId:string; options:ContentQuestion['options']; correctAnswer:ContentQuestion['correctAnswer'] }

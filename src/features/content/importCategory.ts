import type { SQLiteDatabase } from 'expo-sqlite';
import type { CategoryContent } from '../../types/content';

export interface ImportIssue { path: string; message: string }
export type ValidationResult = { ok: true; content: CategoryContent } | { ok: false; issues: ImportIssue[] };
export interface ImportResult { preservedProgress: number; removedProgress: number }
const difficulties = new Set(['beginner', 'intermediate', 'advanced']);
const questionTypes = new Set(['true-false', 'single-choice']);
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export function validateCategoryContent(value: unknown): ValidationResult {
  const issues: ImportIssue[] = [];
  const issue = (path: string, message: string) => issues.push({ path, message });
  if (!isRecord(value)) return { ok: false, issues: [{ path: '$', message: 'Expected the JSON root to be an object.' }] };
  if (value.schemaVersion !== 1) issue('schemaVersion', 'Expected schemaVersion to be 1.');
  if (!isRecord(value.category)) issue('category', 'Expected an object with id, title, and contentVersion.');
  if (!Array.isArray(value.topics)) issue('topics', 'Expected an array.');
  if (!Array.isArray(value.questions)) issue('questions', 'Expected an array.');
  if (issues.length) return { ok: false, issues };
  const category = value.category as Record<string, unknown>;
  const topics = value.topics as unknown[];
  const questions = value.questions as unknown[];
  const validId = (v: unknown) => typeof v === 'string' && idPattern.test(v);
  if (!validId(category.id)) issue('category.id', 'Must be 1–128 letters, digits, period, underscore, colon, or hyphen; start with a letter or digit.');
  if (typeof category.title !== 'string' || !category.title.trim()) issue('category.title', 'Must be a non-empty string.');
  if (!Number.isSafeInteger(category.contentVersion) || Number(category.contentVersion) < 1) issue('category.contentVersion', 'Must be a positive integer.');
  const topicIds = new Set<string>();
  const topicSections = new Set<string>();
  topics.forEach((raw, ti) => {
    const path = `topics[${ti}]`;
    if (!isRecord(raw)) { issue(path, 'Expected a topic object.'); return; }
    if (!validId(raw.id)) issue(`${path}.id`, 'Must be a valid non-empty ID.');
    else if (topicIds.has(raw.id)) issue(`${path}.id`, `Duplicate topic ID “${raw.id}”.`);
    else topicIds.add(raw.id);
    if (typeof raw.title !== 'string' || !raw.title.trim()) issue(`${path}.title`, 'Must be a non-empty string.');
    if (!Array.isArray(raw.sections)) { issue(`${path}.sections`, 'Expected an array.'); return; }
    const localSections = new Set<string>();
    raw.sections.forEach((section, si) => {
      const sp = `${path}.sections[${si}]`;
      if (!isRecord(section)) { issue(sp, 'Expected a section object.'); return; }
      if (!validId(section.id)) issue(`${sp}.id`, 'Must be a valid non-empty ID.');
      else if (localSections.has(section.id)) issue(`${sp}.id`, `Duplicate section ID “${section.id}” within the topic.`);
      else { localSections.add(section.id); topicSections.add(`${String(raw.id)}/${section.id}`); }
      if (typeof section.title !== 'string' || !section.title.trim()) issue(`${sp}.title`, 'Must be a non-empty string.');
    });
  });
  const questionIds = new Set<string>();
  questions.forEach((raw, qi) => {
    const path = `questions[${qi}]`;
    if (!isRecord(raw)) { issue(path, 'Expected a question object.'); return; }
    for (const key of ['id', 'topicId', 'sectionId'] as const) if (!validId(raw[key])) issue(`${path}.${key}`, 'Must be a valid non-empty ID.');
    if (typeof raw.id === 'string' && validId(raw.id)) { if (questionIds.has(raw.id)) issue(`${path}.id`, `Duplicate question ID “${raw.id}”.`); else questionIds.add(raw.id); }
    if (typeof raw.topicId === 'string' && !topicIds.has(raw.topicId)) issue(`${path}.topicId`, `Topic “${raw.topicId}” is not defined in topics.`);
    if (typeof raw.topicId === 'string' && typeof raw.sectionId === 'string' && !topicSections.has(`${raw.topicId}/${raw.sectionId}`)) issue(`${path}.sectionId`, `Section “${raw.sectionId}” is not defined under topic “${raw.topicId}”.`);
    if (!questionTypes.has(String(raw.type))) issue(`${path}.type`, 'Must be “single-choice” or “true-false”.');
    for (const key of ['prompt', 'explanation'] as const) if (typeof raw[key] !== 'string' || !raw[key].trim()) issue(`${path}.${key}`, 'Must be a non-empty string.');
    if (!difficulties.has(String(raw.difficulty))) issue(`${path}.difficulty`, 'Must be beginner, intermediate, or advanced.');
    if (raw.source !== undefined && typeof raw.source !== 'string') issue(`${path}.source`, 'If provided, must be a string.');
    if (!Array.isArray(raw.options)) issue(`${path}.options`, 'Expected an array.');
    else if (raw.type === 'single-choice') {
      const optionIds = new Set<string>();
      if (raw.options.length < 2) issue(`${path}.options`, 'Single-choice questions require at least two options.');
      raw.options.forEach((option, oi) => {
        const op = `${path}.options[${oi}]`;
        if (!isRecord(option)) { issue(op, 'Expected an option object with id and text.'); return; }
        if (typeof option.id !== 'string' || !option.id.trim()) issue(`${op}.id`, 'Must be a non-empty string.');
        else if (optionIds.has(option.id)) issue(`${op}.id`, `Duplicate option ID “${option.id}”.`);
        else optionIds.add(option.id);
        if (typeof option.text !== 'string' || !option.text.trim()) issue(`${op}.text`, 'Must be a non-empty string.');
      });
      if (typeof raw.correctAnswer !== 'string' || !optionIds.has(raw.correctAnswer)) issue(`${path}.correctAnswer`, 'Must match one of the question’s option IDs.');
    } else if (raw.type === 'true-false') {
      if (raw.options.length !== 0) issue(`${path}.options`, 'True-false questions must have an empty options array.');
      if (typeof raw.correctAnswer !== 'boolean') issue(`${path}.correctAnswer`, 'Must be the JSON boolean true or false.');
    }
  });
  if (!topics.length) issue('topics', 'A category must contain at least one topic.');
  if (!questions.length) issue('questions', 'A category must contain at least one question.');
  return issues.length ? { ok: false, issues } : { ok: true, content: value as unknown as CategoryContent };
}

export async function categoryExists(db: SQLiteDatabase, id: string): Promise<boolean> {
  return Boolean(await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id=?', id));
}

export async function replaceCategory(db: SQLiteDatabase, content: CategoryContent): Promise<ImportResult> {
  let preservedProgress = 0;
  let removedProgress = 0;
  await db.withTransactionAsync(async () => {
    const categoryId = content.category.id;
    const exists = await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id=?', categoryId);
    const oldRows = exists ? await db.getAllAsync<{id:string;bookmarked:number;attempts:number;correct_answers:number;last_answered_at:string|null}>('SELECT q.id,COALESCE(p.bookmarked,0) AS bookmarked,COALESCE(p.attempts,0) AS attempts,COALESCE(p.correct_answers,0) AS correct_answers,p.last_answered_at FROM questions q LEFT JOIN question_progress p ON p.question_id=q.id WHERE q.category_id=?', categoryId) : [];
    const newIds = new Set(content.questions.map(q=>q.id));
    const preserved = new Map(oldRows.filter(row=>newIds.has(row.id)).map(row=>[row.id,row]));
    preservedProgress = [...preserved.values()].filter(row=>row.bookmarked||row.attempts||row.correct_answers||row.last_answered_at).length;
    removedProgress = oldRows.filter(row=>!newIds.has(row.id)&&(row.bookmarked||row.attempts||row.correct_answers||row.last_answered_at)).length;
    if (exists) {
      await db.runAsync('DELETE FROM question_progress WHERE question_id IN (SELECT id FROM questions WHERE category_id=?)',categoryId);
      await db.runAsync('DELETE FROM questions WHERE category_id=?',categoryId);
      const oldTopics = await db.getAllAsync<{id:string}>('SELECT id FROM topics WHERE category_id=?',categoryId);
      for (const topic of oldTopics) await db.runAsync('DELETE FROM sections WHERE topic_id=?',topic.id);
      await db.runAsync('DELETE FROM topics WHERE category_id=?',categoryId);
      await db.runAsync('UPDATE categories SET title=?,content_version=? WHERE id=?',content.category.title,content.category.contentVersion,categoryId);
    } else {
      await db.runAsync('INSERT INTO categories(id,title,content_version) VALUES(?,?,?)',categoryId,content.category.title,content.category.contentVersion);
    }
    for (const topic of content.topics) {
      await db.runAsync('INSERT INTO topics(id,category_id,title) VALUES(?,?,?)',topic.id,categoryId,topic.title);
      for (const section of topic.sections) await db.runAsync('INSERT INTO sections(topic_id,id,title) VALUES(?,?,?)',topic.id,section.id,section.title);
    }
    for (const q of content.questions) {
      await db.runAsync('INSERT INTO questions(id,category_id,topic_id,section_id,type,prompt,options_json,correct_answer_json,explanation,difficulty) VALUES(?,?,?,?,?,?,?,?,?,?)',q.id,categoryId,q.topicId,q.sectionId,q.type,q.prompt,JSON.stringify(q.options),JSON.stringify(q.correctAnswer),q.explanation,content.category.contentVersion);
      const old = preserved.get(q.id);
      if (old) await db.runAsync('INSERT INTO question_progress(question_id,attempts,correct_answers,bookmarked,last_answered_at) VALUES(?,?,?,?,?)',q.id,old.attempts,old.correct_answers,old.bookmarked,old.last_answered_at);
    }
  });
  return { preservedProgress, removedProgress };
}

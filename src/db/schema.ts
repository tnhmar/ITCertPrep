export const SCHEMA_VERSION = 1;
export const CREATE_SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content_version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS topics (id TEXT PRIMARY KEY NOT NULL, category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE, title TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sections (id TEXT NOT NULL, topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE, title TEXT NOT NULL, PRIMARY KEY(topic_id, id));
CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY NOT NULL, category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE, topic_id TEXT NOT NULL, section_id TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('true-false','single-choice')), prompt TEXT NOT NULL, options_json TEXT NOT NULL, correct_answer_json TEXT NOT NULL, explanation TEXT NOT NULL, difficulty TEXT NOT NULL, FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE CASCADE, FOREIGN KEY(topic_id, section_id) REFERENCES sections(topic_id, id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS question_progress (question_id TEXT PRIMARY KEY NOT NULL REFERENCES questions(id) ON DELETE CASCADE, attempts INTEGER NOT NULL DEFAULT 0, correct_answers INTEGER NOT NULL DEFAULT 0, bookmarked INTEGER NOT NULL DEFAULT 0, last_answered_at TEXT);
CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category_id);
CREATE INDEX IF NOT EXISTS idx_sections_topic ON sections(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_section ON questions(topic_id, section_id);
PRAGMA user_version = 1;
`;

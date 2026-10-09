export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuestionType = 'true-false' | 'single-choice';
export type Answer = boolean | string;
export interface ContentOption { id: string; text: string }
export interface ContentQuestion { id: string; topicId: string; sectionId: string; type: QuestionType; prompt: string; options: ContentOption[]; correctAnswer: Answer; explanation: string; difficulty: Difficulty }
export interface ContentSection { id: string; title: string }
export interface ContentTopic { id: string; title: string; sections: ContentSection[] }
export interface CategoryContent { schemaVersion: number; category: { id: string; title: string; contentVersion: number }; topics: ContentTopic[]; questions: ContentQuestion[] }

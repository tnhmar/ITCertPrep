import { scoreSummary, shuffleQuestions, isCorrect } from './quizService';
import type { DbQuestion, Answer } from '../../types/content';

const question = (id: string, correctAnswer: Answer): DbQuestion => ({
  id,
  categoryId: 'demo',
  topicId: 'topic',
  sectionId: 'section',
  type: typeof correctAnswer === 'boolean' ? 'true-false' : 'single-choice',
  prompt: `Question ${id}`,
  options: [],
  correctAnswer,
  explanation: 'Explanation',
  difficulty: 'beginner',
});

describe('quiz service', () => {
  it('scores correct, incorrect and unanswered questions', () => {
    const questions = [question('q1', true), question('q2', 'a'), question('q3', false)];
    const answers = new Map<string, Answer>([['q1', true], ['q2', 'b']]);
    const result = scoreSummary(questions, answers);
    expect(result).toEqual({ total: 3, correct: 1, incorrect: 2, percent: 33 });
  });

  it('returns zero score for an empty quiz', () => {
    expect(scoreSummary([], new Map<string, Answer>())).toEqual({ total: 0, correct: 0, incorrect: 0, percent: 0 });
  });

  it('recognizes both boolean and option-id answers', () => {
    expect(isCorrect(question('q1', true), true)).toBe(true);
    expect(isCorrect(question('q2', 'a'), 'a')).toBe(true);
    expect(isCorrect(question('q2', 'a'), 'b')).toBe(false);
  });

  it('shuffles without changing the original array or losing entries', () => {
    const input = [1, 2, 3, 4];
    const output = shuffleQuestions(input);
    expect(input).toEqual([1, 2, 3, 4]);
    expect([...output].sort()).toEqual([1, 2, 3, 4]);
  });
});

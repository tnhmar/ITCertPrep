import type { DbQuestion } from '../../db/content';
export function shuffleQuestions<T>(questions: T[]): T[] {
 const copy=[...questions]; for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];} return copy;
}
export function isCorrect(question: DbQuestion, answer: boolean|string): boolean { return question.correctAnswer===answer; }
export function scoreSummary(questions: DbQuestion[], answers: Map<string,boolean|string>) { const correct=questions.filter(q=>answers.has(q.id)&&isCorrect(q,answers.get(q.id)!)).length; return {total:questions.length,correct,incorrect:questions.length-correct,percent:questions.length?Math.round(correct/questions.length*100):0}; }

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext, type SQLiteBindValue } from 'expo-sqlite';
import { Button, Card, Page, Title, colors } from '../components/ui';
import { recordAnswer, createQuizSession, toggleBookmark } from '../db/content';
import type { DbQuestion, Answer as AnswerValue, ContentOption } from '../types/content';
import { isCorrect, shuffleQuestions } from '../features/quiz/quizService';
type QuizQuestion = DbQuestion & { bookmarked?: number };
export default function QuizScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; topicId?: string; sectionId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);
  const [index, setIndex] = React.useState(0);
  const [answer, setAnswer] = React.useState<AnswerValue | undefined>();
  const [answers, setAnswers] = React.useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = React.useState(true);
  const [bookmarkOverride, setBookmarkOverride] = React.useState<boolean | undefined>();
  React.useEffect(() => {
    let active = true;
    (async () => {
      const where: string[] = [];
      const args: SQLiteBindValue[] = [];
      if (params.categoryId) { where.push('q.category_id=?'); args.push(params.categoryId); }
      if (params.topicId) { where.push('q.topic_id=?'); args.push(params.topicId); }
      if (params.sectionId) { where.push('q.section_id=?'); args.push(params.sectionId); }
      const sql = `SELECT q.id,q.category_id AS categoryId,q.topic_id AS topicId,q.section_id AS sectionId,q.type,q.prompt,q.options_json,q.correct_answer_json,q.explanation,q.difficulty,COALESCE(p.bookmarked,0) AS bookmarked FROM questions q LEFT JOIN question_progress p ON p.question_id=q.id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
      const rows = await db.getAllAsync<any>(sql, ...args);
      if (!active) return;
      setQuestions(shuffleQuestions(rows.map((row: any) => ({ ...row, options: JSON.parse(row.options_json) as ContentOption[], correctAnswer: JSON.parse(row.correct_answer_json) as AnswerValue }))));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [db, params.categoryId, params.topicId, params.sectionId]);
  const q = questions[index];
  const bookmarked = bookmarkOverride ?? Boolean(q?.bookmarked);
  async function choose(value: AnswerValue) {
    if (answer !== undefined || !q) return;
    setAnswer(value);
    setAnswers(prev => ({ ...prev, [q.id]: value }));
    await recordAnswer(db, q.id, isCorrect(q, value));
  }
  async function toggleCurrentBookmark() {
    if (!q) return;
    await toggleBookmark(db, q.id);
    setBookmarkOverride(!bookmarked);
  }
  async function next() {
    if (index === questions.length - 1) {
      const answered = questions.flatMap(item => answers[item.id] === undefined ? [] : [{ id: item.id, answer: answers[item.id], correct: isCorrect(item, answers[item.id]) }]);
      const sessionId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const origin = params.categoryId ? `category:${params.categoryId}` : params.topicId ? `topic:${params.topicId}` : 'all';
      await createQuizSession(db, { id: sessionId, origin, questions: answered });
      router.replace({ pathname: '/results', params: { sessionId } });
    } else {
      setIndex(index + 1);
      setAnswer(undefined);
      setBookmarkOverride(undefined);
    }
  }
  if (loading) return <Page><Text style={{ color: colors.muted }}>Loading questions…</Text></Page>;
  if (!q) return <Page><Title>No questions yet</Title><Text style={{ color: colors.muted }}>This learning area has no questions in the current content bank.</Text><Button title="Back to categories" onPress={() => router.replace('/')} /></Page>;
  const correct = answer !== undefined && isCorrect(q, answer);
  return <Page><ScrollView contentContainerStyle={{ flexGrow: 1 }}><Title sub={`Question ${index + 1} of ${questions.length} · ${q.difficulty}`}>Practice</Title><View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 9, marginBottom: 22 }}><View style={{ height: 6, width: `${((index + 1) / questions.length) * 100}%`, backgroundColor: colors.brand, borderRadius: 9 }} /></View><Card><Text style={{ fontSize: 20, fontWeight: '700', lineHeight: 29, color: colors.ink }}>{q.prompt}</Text></Card><Card onPress={toggleCurrentBookmark}><Text style={{ color: bookmarked ? colors.brand : colors.muted, fontWeight: '700' }}>{bookmarked ? '★ Bookmarked' : '☆ Bookmark this question'}</Text></Card>{q.type === 'true-false' ? (['True', 'False'] as const).map(label => { const value = label === 'True'; return <AnswerOption key={label} text={label} selected={answer === value} disabled={answer !== undefined} onPress={() => choose(value)} state={answer === value ? (correct ? 'correct' : 'wrong') : answer !== undefined && value === q.correctAnswer ? 'correct' : undefined} />; }) : q.options.map(option => <AnswerOption key={option.id} text={option.text} selected={answer === option.id} disabled={answer !== undefined} onPress={() => choose(option.id)} state={answer === option.id ? (correct ? 'correct' : 'wrong') : answer !== undefined && option.id === q.correctAnswer ? 'correct' : undefined} />)}{answer !== undefined ? <Card><Text style={{ fontWeight: '800', fontSize: 16, color: correct ? colors.green : colors.red, marginBottom: 8 }}>{correct ? 'Correct!' : 'Not quite'}</Text><Text style={{ fontSize: 15, lineHeight: 23, color: colors.ink }}>{q.explanation}</Text></Card> : null}{answer !== undefined ? <Button title={index === questions.length - 1 ? 'See results' : 'Next question'} onPress={next} /> : null}</ScrollView></Page>;
}
function AnswerOption({ text, selected, disabled, onPress, state }: { text: string; selected: boolean; disabled: boolean; onPress: () => void; state?: 'correct' | 'wrong' }) {
  const border = state === 'correct' ? colors.green : state === 'wrong' ? colors.red : selected ? colors.brand : colors.line;
  return <Card onPress={disabled ? undefined : onPress}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: border, backgroundColor: state === 'correct' ? colors.green : state === 'wrong' ? colors.red : 'transparent', marginRight: 12 }} /><Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: colors.ink }}>{text}</Text></View></Card>;
}

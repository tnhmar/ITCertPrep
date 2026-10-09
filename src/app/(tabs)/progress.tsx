import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card, Page, Title, colors, styles } from '../../components/ui';
import { getProgress, type ProgressSnapshot } from '../../features/progress/progressRepository';

function percentage(numerator: number, denominator: number): number { return denominator > 0 ? Math.round(numerator / denominator * 100) : 0; }
function Meter({ value }: { value: number }) {
  return <View accessibilityLabel={`${value}% coverage`} style={local.track}><View style={[local.fill, { width: `${value}%` }]} /></View>;
}
function Metric({ value, label }: { value: string; label: string }) {
  return <View style={local.metric}><Text style={local.metricValue}>{value}</Text><Text style={local.metricLabel}>{label}</Text></View>;
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [snapshot, setSnapshot] = React.useState<ProgressSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  useFocusEffect(React.useCallback(() => {
    let active = true;
    getProgress(db).then(value => { if (active) { setSnapshot(value); setError(null); } })
      .catch(() => { if (active) setError('Unable to load local progress.'); });
    return () => { active = false; };
  }, [db]));
  if (error) return <Page><Title>Progress</Title><Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text></Page>;
  if (!snapshot) return <Page><Text style={{ color: colors.muted }}>Loading progress…</Text></Page>;
  const { totals, categories, sessions } = snapshot;
  const coverage = percentage(totals.practiced, totals.total);
  const accuracy = percentage(totals.correct, totals.attempts);
  return <Page><ScrollView showsVerticalScrollIndicator={false}>
    <Title sub="Your practice history, saved locally on this device.">Your progress</Title>
    <Card><Text style={styles.label}>Question coverage</Text><Text style={local.coverage}>{coverage}%</Text><Text style={local.detail}>{totals.practiced} of {totals.total} available questions answered at least once</Text><Meter value={coverage} /></Card>
    <Card><View style={local.metrics}><Metric value={totals.attempts ? `${accuracy}%` : '—'} label="Answer accuracy" /><Metric value={String(totals.attempts)} label="Total attempts" /></View><View style={local.metrics}><Metric value={String(totals.correct)} label="Correct answers" /><Metric value={String(totals.bookmarks)} label="Bookmarks" /></View><Text style={local.detail}>Accuracy counts all attempts, including retries. Coverage counts each available question only once.</Text></Card>
    {!totals.attempts ? <Card><Text style={local.heading}>Start your first session</Text><Text style={local.detail}>Answer a few questions in Study to begin tracking your progress.</Text></Card> : null}
    <Text style={[styles.label, local.section]}>By category</Text>
    {categories.map(category => <Card key={category.id}><Text style={local.heading}>{category.title}</Text><Text style={local.detail}>{category.practiced} / {category.total} questions practiced · {category.attempts ? `${percentage(category.correct, category.attempts)}% accuracy` : 'No attempts yet'}</Text><Meter value={percentage(category.practiced, category.total)} /></Card>)}
    <Text style={[styles.label, local.section]}>Recent completed quizzes</Text>
    {!sessions.length ? <Text style={local.detail}>No completed quizzes yet.</Text> : sessions.map(session => <Card key={session.id} onPress={() => router.push({ pathname: '/results', params: { sessionId: session.id } })}><View style={local.session}><View style={{ flex: 1 }}><Text style={local.heading}>{session.correct} / {session.total} correct</Text><Text style={local.detail}>{new Date(session.created_at).toLocaleString()}</Text></View><Text style={local.score}>{percentage(session.correct, session.total)}%</Text></View><Text style={local.link}>Review answers ›</Text></Card>)}
  </ScrollView></Page>;
}

const local = StyleSheet.create({ track: { height: 8, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden', marginTop: 14 }, fill: { height: 8, backgroundColor: colors.brand, borderRadius: 8 }, coverage: { fontSize: 44, fontWeight: '800', color: colors.brand, marginVertical: 8 }, heading: { fontSize: 17, fontWeight: '700', color: colors.ink }, detail: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6 }, metrics: { flexDirection: 'row', marginBottom: 12 }, metric: { flex: 1, paddingRight: 8 }, metricValue: { fontSize: 24, fontWeight: '800', color: colors.ink }, metricLabel: { color: colors.muted, fontSize: 12, marginTop: 4 }, section: { marginTop: 12, marginBottom: 12 }, session: { flexDirection: 'row', alignItems: 'center', gap: 12 }, score: { color: colors.brand, fontSize: 24, fontWeight: '800' }, link: { color: colors.brand, fontSize: 13, fontWeight: '700', marginTop: 10 } });

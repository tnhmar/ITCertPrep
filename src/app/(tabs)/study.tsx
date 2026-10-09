import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Page, Title, styles, colors } from '../../components/ui';

interface CategoryRow { id: string; title: string; count: number }

export default function StudyScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [rows, setRows] = React.useState<CategoryRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  useFocusEffect(React.useCallback(() => {
    let active = true;
    db.getAllAsync<CategoryRow>('SELECT c.id,c.title,COUNT(q.id) AS count FROM categories c LEFT JOIN questions q ON q.category_id=c.id GROUP BY c.id ORDER BY c.title')
      .then(value => { if (active) { setRows(value); setError(null); } })
      .catch(() => { if (active) setError('Unable to load the question catalogue.'); });
    return () => { active = false; };
  }, [db]));
  return (
    <Page><ScrollView showsVerticalScrollIndicator={false}>
      <Title sub="Choose a domain and build your knowledge one question at a time.">Study smarter.</Title>
      <Button title="View bookmarks" onPress={() => router.push('/saved')} />
      <Text style={[styles.label, { marginTop: 22, marginBottom: 12 }]}>Categories</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.red, marginBottom: 12 }}>{error}</Text> : null}
      {rows.map(row => <Card key={row.id} onPress={() => router.push({ pathname: '/category/[categoryId]', params: { categoryId: row.id } })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 10 }}><Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{row.title}</Text><Text style={{ color: colors.muted, marginTop: 5 }}>Browse topics and focused sections</Text></View>
          <View style={{ backgroundColor: colors.soft, borderRadius: 12, padding: 10 }}><Text style={{ color: colors.brand, fontWeight: '800' }}>{row.count} Q</Text></View>
        </View>
      </Card>)}
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8, lineHeight: 20 }}>Your question bank and study progress stay on this device. Questions include an explanation after every answer.</Text>
    </ScrollView></Page>
  );
}

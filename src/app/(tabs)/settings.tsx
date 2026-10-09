import React from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Page, Title, colors, styles } from '../../components/ui';
import { clearBookmarks, getContentVersions, resetStudyHistory, type ContentVersion } from '../../features/progress/progressRepository';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [versions, setVersions] = React.useState<ContentVersion[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  useFocusEffect(React.useCallback(() => {
    let active = true;
    getContentVersions(db).then(value => { if (active) setVersions(value); })
      .catch(() => { if (active) setMessage('Unable to load content versions.'); });
    return () => { active = false; };
  }, [db]));
  async function manageData(action: 'history' | 'bookmarks') {
    setBusy(true);
    try {
      if (action === 'history') await resetStudyHistory(db);
      else await clearBookmarks(db);
      setMessage(action === 'history' ? 'Study history reset. Your bookmarks and question bank are unchanged.' : 'Bookmarks cleared. Your study history and question bank are unchanged.');
    } catch {
      Alert.alert('Unable to update data', 'Your data could not be updated. Please try again.');
    } finally { setBusy(false); }
  }
  function confirmReset() {
    Alert.alert('Reset study history?', 'This permanently clears question attempts, accuracy, and completed quiz results on this device. It keeps your bookmarks and bundled question bank.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset history', style: 'destructive', onPress: () => { void manageData('history'); } }]);
  }
  function confirmClearBookmarks() {
    Alert.alert('Clear all bookmarks?', 'This removes all saved question bookmarks on this device. Your study history and question bank are kept.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear bookmarks', style: 'destructive', onPress: () => { void manageData('bookmarks'); } }]);
  }
  return <Page><ScrollView showsVerticalScrollIndicator={false}>
    <Title sub="Manage this device’s study data and view the bundled content.">Settings</Title>
    <Card><Text style={local.heading}>Offline study</Text><Text style={local.detail}>Questions, progress, bookmarks, and completed quiz results are stored locally. No account or backend is required for normal use.</Text><Text style={local.detail}>Uninstalling the app can remove this device’s saved data. New bundled questions arrive through an app update.</Text></Card>
    <Text style={[styles.label, local.section]}>Question bank</Text>
    {versions.map(category => <Card key={category.id}><Text style={local.heading}>{category.title}</Text><Text style={local.detail}>{category.count} questions · Content version {category.content_version}</Text></Card>)}
    <Text style={[styles.label, local.section]}>Local data</Text>
    <Card><Text style={local.heading}>Reset study history</Text><Text style={local.detail}>Clear attempts and completed quiz results. Keep bookmarks and question content.</Text><Button title={busy ? 'Updating…' : 'Reset study history'} disabled={busy} onPress={confirmReset} /></Card>
    <Card><Text style={local.heading}>Clear bookmarks</Text><Text style={local.detail}>Remove saved questions without changing attempts or quiz history.</Text><Button title="Clear all bookmarks" disabled={busy} onPress={confirmClearBookmarks} /></Card>
    {message ? <Text accessibilityLiveRegion="polite" style={local.message}>{message}</Text> : null}
    <Text style={local.footer}>ITCertPrep · Your study data stays on this device.</Text>
  </ScrollView></Page>;
}

const local = StyleSheet.create({ heading: { fontSize: 17, fontWeight: '700', color: colors.ink }, detail: { fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 7 }, section: { marginTop: 12, marginBottom: 12 }, message: { color: colors.green, fontSize: 14, lineHeight: 21, marginVertical: 10 }, footer: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 12 } });

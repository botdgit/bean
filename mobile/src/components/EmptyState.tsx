import { StyleSheet, Text, View } from 'react-native';

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#3E2723' },
  body: { fontSize: 14, color: '#8D6E63', textAlign: 'center' },
});

import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '@/lib/theme';

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space.xxxl, paddingHorizontal: space.xl, alignItems: 'center', gap: space.sm },
  title: { ...type.bodyStrong },
  body: { ...type.caption, textAlign: 'center', color: colors.inkMuted, lineHeight: 19 },
});

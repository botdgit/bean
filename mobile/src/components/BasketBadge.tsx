import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useBasket } from '@/state/basket';

export function BasketBadge() {
  const count = useBasket((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));
  if (count === 0) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.badge, pressed && styles.badgePressed]}
      onPress={() => router.push('/basket')}
    >
      <Text style={styles.text}>Basket · {count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#3E2723',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgePressed: { opacity: 0.85 },
  text: { color: '#FFF', fontWeight: '600', fontSize: 13 },
});

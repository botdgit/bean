import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPence } from '@/lib/format';
import { colors, floatShadow, radius, space } from '@/lib/theme';
import { useBasket } from '@/state/basket';

export function BasketBar() {
  const insets = useSafeAreaInsets();
  const count = useBasket((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));
  const subtotal = useBasket((s) => s.subtotalCents());
  if (count === 0) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.bar, floatShadow, pressed && styles.pressed]}
        onPress={() => router.push('/basket')}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
        <Text style={styles.label}>View basket</Text>
        <Text style={styles.total}>{formatPence(subtotal)}</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.accentInk} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.espresso,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
  },
  pressed: { opacity: 0.9 },
  badge: {
    minWidth: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: colors.accentInk, fontWeight: '800', fontSize: 13 },
  label: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '700' },
  total: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

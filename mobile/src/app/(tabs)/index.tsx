import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/ui';
import { useCafes } from '@/hooks/useCafes';
import { useProfile } from '@/hooks/useProfile';
import { colors, radius, space, TAB_BAR_CLEARANCE, type } from '@/lib/theme';
import type { Cafe } from '@/types/database';

function CafeCard({ cafe }: { cafe: Cafe }) {
  return (
    <Pressable
      style={({ pressed }) => [pressed && styles.pressed]}
      onPress={() => router.push(`/cafe/${cafe.id}`)}
    >
      <Card style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="cafe" size={24} color={colors.accent} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          {cafe.address ? (
            <Text style={styles.cafeAddress} numberOfLines={1}>
              {cafe.address}
            </Text>
          ) : null}
          <View style={styles.openRow}>
            <View style={styles.dot} />
            <Text style={styles.openText}>Open · order ahead</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
      </Card>
    </Pressable>
  );
}

export default function ShopList() {
  const { cafes, loading, error } = useCafes();
  const { profile } = useProfile();
  const firstName = profile?.name?.split(' ')[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={cafes}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CafeCard cafe={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>
              {firstName ? `Morning, ${firstName}` : 'Good morning'}
            </Text>
            <Text style={styles.title}>Find your coffee</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
          ) : error ? (
            <EmptyState title="Couldn't load shops" body={error} />
          ) : (
            <EmptyState title="No shops yet" body="BEAN is just getting started. Check back soon." />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: space.lg, paddingBottom: TAB_BAR_CLEARANCE },
  header: { paddingTop: space.md, paddingBottom: space.lg },
  greeting: { ...type.caption, color: colors.accent, marginBottom: 2 },
  title: { ...type.title },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cafeName: { ...type.bodyStrong, fontSize: 17 },
  cafeAddress: { ...type.caption },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  openText: { fontSize: 12, color: colors.success, fontWeight: '600' },
});

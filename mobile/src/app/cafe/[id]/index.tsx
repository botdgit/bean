import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BasketBar } from '@/components/BasketBar';
import { EmptyState } from '@/components/EmptyState';
import { BackButton, Card } from '@/components/ui';
import { useCafe } from '@/hooks/useCafes';
import { useCafeMenu } from '@/hooks/useCafeMenu';
import { formatPence } from '@/lib/format';
import { useBasket } from '@/state/basket';
import { colors, radius, space, type } from '@/lib/theme';
import type { CatalogItem } from '@/types/database';

function ItemRow({ cafeId, item, last }: { cafeId: string; item: CatalogItem; last: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.itemRow, !last && styles.itemBorder, pressed && styles.pressed]}
      onPress={() => router.push(`/cafe/${cafeId}/item/${item.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      <Text style={styles.itemPrice}>{formatPence(item.price_cents)}</Text>
      <View style={styles.addBtn}>
        <Ionicons name="add" size={18} color={colors.accentInk} />
      </View>
    </Pressable>
  );
}

export default function CafeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cafe, loading: cafeLoading } = useCafe(id);
  const { sections, loading: menuLoading } = useCafeMenu(id);
  const setCafe = useBasket((s) => s.setCafe);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <BackButton label="Shops" onPress={() => router.back()} />
      </View>

      {cafeLoading || !cafe ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => id && setCafe(id)}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="cafe" size={28} color={colors.accent} />
            </View>
            <Text style={styles.name}>{cafe.name}</Text>
            {cafe.address ? <Text style={styles.address}>{cafe.address}</Text> : null}
          </View>

          {menuLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : sections.length === 0 ? (
            <EmptyState title="Menu coming soon" />
          ) : (
            sections.map((section) => (
              <View key={section.category} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.category}</Text>
                <Card padded={false}>
                  {section.items.map((item, idx) => (
                    <ItemRow
                      key={item.id}
                      cafeId={cafe.id}
                      item={item}
                      last={idx === section.items.length - 1}
                    />
                  ))}
                </Card>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <BasketBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  scroll: { paddingHorizontal: space.lg, paddingBottom: 120 },
  hero: { paddingTop: space.sm, paddingBottom: space.lg, gap: 6 },
  heroIcon: {
    width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.sm,
  },
  name: { ...type.title },
  address: { ...type.body, fontSize: 14 },
  section: { marginTop: space.lg, gap: space.sm },
  sectionTitle: { ...type.overline, marginLeft: space.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.surfaceMuted },
  itemName: { ...type.bodyStrong, fontSize: 16 },
  itemDesc: { ...type.caption, marginTop: 2, lineHeight: 17 },
  itemPrice: { ...type.bodyStrong, fontSize: 15 },
  addBtn: {
    width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});

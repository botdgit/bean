import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BasketBadge } from '@/components/BasketBadge';
import { EmptyState } from '@/components/EmptyState';
import { MoneyText } from '@/components/MoneyText';
import { useCafe } from '@/hooks/useCafes';
import { useCafeMenu } from '@/hooks/useCafeMenu';
import { useBasket } from '@/state/basket';
import type { CatalogItem } from '@/types/database';

function ItemRow({ cafeId, item }: { cafeId: string; item: CatalogItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.itemRow, pressed && styles.itemRowPressed]}
      onPress={() => router.push(`/cafe/${cafeId}/item/${item.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.itemDesc}>{item.description}</Text>
        ) : null}
      </View>
      <MoneyText cents={item.price_cents} style={styles.itemPrice} />
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
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.back}>‹ Shops</Text>
        </Pressable>
        <BasketBadge />
      </View>

      {cafeLoading || !cafe ? (
        <ActivityIndicator color="#3E2723" style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          onScrollBeginDrag={() => id && setCafe(id)}
        >
          <View style={styles.header}>
            <Text style={styles.name}>{cafe.name}</Text>
            {cafe.address ? <Text style={styles.address}>{cafe.address}</Text> : null}
          </View>

          {menuLoading ? (
            <ActivityIndicator color="#3E2723" style={{ marginTop: 24 }} />
          ) : sections.length === 0 ? (
            <EmptyState title="Menu coming soon" />
          ) : (
            sections.map((section) => (
              <View key={section.category} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.category}</Text>
                {section.items.map((item, idx) => (
                  <View key={item.id}>
                    {idx > 0 ? <View style={styles.sep} /> : null}
                    <ItemRow cafeId={cafe.id} item={item} />
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  back: { color: '#3E2723', fontSize: 16 },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  name: { fontSize: 28, fontWeight: '700', color: '#3E2723' },
  address: { fontSize: 14, color: '#6D4C41', marginTop: 4 },
  section: { marginTop: 16, backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    fontSize: 13,
    color: '#8D6E63',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemRow: { flexDirection: 'row', padding: 16, alignItems: 'center', backgroundColor: '#FFF' },
  itemRowPressed: { backgroundColor: '#EFEBE9' },
  itemName: { fontSize: 16, fontWeight: '500', color: '#3E2723' },
  itemDesc: { fontSize: 13, color: '#8D6E63', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '600', color: '#3E2723', marginLeft: 12 },
  sep: { height: 1, backgroundColor: '#EFEBE9', marginHorizontal: 16 },
});

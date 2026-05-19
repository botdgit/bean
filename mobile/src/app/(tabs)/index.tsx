import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { useCafes } from '@/hooks/useCafes';
import type { Cafe } from '@/types/database';

function CafeRow({ cafe }: { cafe: Cafe }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/cafe/${cafe.id}`)}
    >
      <View style={styles.rowMain}>
        <Text style={styles.cafeName}>{cafe.name}</Text>
        {cafe.address ? (
          <Text style={styles.cafeAddress}>{cafe.address}</Text>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function ShopList() {
  const { cafes, loading, error } = useCafes();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Shops near you</Text>
        <Text style={styles.subtitle}>
          Independent coffee shops on BEAN. Tap to order ahead.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3E2723" />
        </View>
      ) : error ? (
        <EmptyState title="Couldn't load shops" body={error} />
      ) : cafes.length === 0 ? (
        <EmptyState
          title="No shops yet"
          body="BEAN is just getting started. Check back soon."
        />
      ) : (
        <FlatList
          data={cafes}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CafeRow cafe={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#3E2723' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#6D4C41' },
  list: { paddingBottom: 32 },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F1',
  },
  rowPressed: { backgroundColor: '#EFEBE9' },
  rowMain: { flex: 1 },
  cafeName: { fontSize: 17, fontWeight: '600', color: '#3E2723' },
  cafeAddress: { fontSize: 13, color: '#8D6E63', marginTop: 2 },
  chevron: { fontSize: 24, color: '#A1887F', marginLeft: 8 },
  sep: { height: 1, backgroundColor: '#EFEBE9', marginHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

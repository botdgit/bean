import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useSession } from '@/hooks/useSession';
import { formatPence } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types/database';

type OrderWithCafe = Order & { cafes: { name: string } | null };

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Sent to shop',
  accepted: 'Accepted',
  in_progress: 'Being made',
  ready: 'Ready for pickup',
  completed: 'Collected',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

function OrderRow({ order }: { order: OrderWithCafe }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/order/${order.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cafeName}>{order.cafes?.name ?? 'Order'}</Text>
        <Text style={styles.meta}>
          {new Date(order.created_at).toLocaleString('en-GB')} · {STATUS_LABEL[order.status]}
        </Text>
      </View>
      <Text style={styles.amount}>{formatPence(order.total_charged_cents)}</Text>
    </Pressable>
  );
}

export default function Orders() {
  const { session } = useSession();
  const [orders, setOrders] = useState<OrderWithCafe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    supabase
      .from('orders')
      .select('*, cafes(name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) {
          setOrders((data as OrderWithCafe[]) ?? []);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Your orders</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#3E2723" style={{ marginTop: 24 }} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" body="Tap a shop to place your first order." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => <OrderRow order={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#3E2723' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  rowPressed: { backgroundColor: '#EFEBE9' },
  cafeName: { fontSize: 16, fontWeight: '600', color: '#3E2723' },
  meta: { fontSize: 13, color: '#8D6E63', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '600', color: '#3E2723' },
  sep: { height: 1, backgroundColor: '#EFEBE9', marginHorizontal: 20 },
});

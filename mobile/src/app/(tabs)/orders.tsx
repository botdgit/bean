import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { formatPence } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, radius, space, TAB_BAR_CLEARANCE, type } from '@/lib/theme';
import type { Order, OrderStatus } from '@/types/database';

type OrderWithCafe = Order & { cafes: { name: string } | null };

const STATUS: Record<OrderStatus, { label: string; fg: string; bg: string }> = {
  pending: { label: 'Pending', fg: colors.inkSoft, bg: colors.surfaceMuted },
  paid: { label: 'Sent to shop', fg: '#7A5B12', bg: '#F6ECCF' },
  accepted: { label: 'Accepted', fg: '#7A5B12', bg: '#F6ECCF' },
  in_progress: { label: 'Being made', fg: '#7A5B12', bg: '#F6ECCF' },
  ready: { label: 'Ready', fg: colors.success, bg: colors.successBg },
  completed: { label: 'Collected', fg: colors.inkSoft, bg: colors.surfaceMuted },
  cancelled: { label: 'Cancelled', fg: colors.danger, bg: colors.dangerBg },
  failed: { label: 'Failed', fg: colors.danger, bg: colors.dangerBg },
};

function OrderCard({ order }: { order: OrderWithCafe }) {
  const s = STATUS[order.status];
  return (
    <Pressable
      style={({ pressed }) => [pressed && styles.pressed]}
      onPress={() => router.push(`/order/${order.id}`)}
    >
      <Card style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="bag-handle" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cafeName}>{order.cafes?.name ?? 'Order'}</Text>
          <Text style={styles.meta}>
            {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={[styles.pill, { backgroundColor: s.bg }]}>
            <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
          </View>
        </View>
        <Text style={styles.amount}>{formatPence(order.total_charged_cents)}</Text>
      </Card>
    </Pressable>
  );
}

export default function Orders() {
  const { session } = useSession();
  const [orders, setOrders] = useState<OrderWithCafe[]>([]);
  const [loading, setLoading] = useState(true);

  // Refetch each time the tab regains focus so a freshly placed order shows up.
  useFocusEffect(
    useCallback(() => {
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
    }, [session?.user.id]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>Orders</Text>}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
          ) : (
            <EmptyState title="No orders yet" body="Pick a shop and place your first order." />
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
  title: { ...type.title, marginTop: space.md, marginBottom: space.lg },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  avatar: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  cafeName: { ...type.bodyStrong, fontSize: 16 },
  meta: { ...type.caption, marginTop: 1 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  pillText: { fontSize: 12, fontWeight: '700' },
  amount: { ...type.bodyStrong, fontSize: 16 },
});

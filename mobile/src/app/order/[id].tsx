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

import { MoneyText } from '@/components/MoneyText';
import { useOrder } from '@/hooks/useOrder';
import { formatPence } from '@/lib/format';
import type { OrderStatus } from '@/types/database';

const STATUS_COPY: Record<OrderStatus, { title: string; body: string; accent: string }> = {
  pending:     { title: 'Confirming payment…',    body: 'Hang tight, this only takes a moment.', accent: '#8D6E63' },
  paid:        { title: 'Sent to the shop',       body: 'They\'ll start your order shortly.',     accent: '#5D4037' },
  accepted:    { title: 'Accepted',               body: 'The barista has your order.',            accent: '#5D4037' },
  in_progress: { title: 'Being made',             body: 'Good things take a few minutes.',        accent: '#5D4037' },
  ready:       { title: 'Ready for pickup',       body: 'Show your name at the counter.',        accent: '#2E7D32' },
  completed:   { title: 'Collected',              body: 'Enjoy. We\'ll see you again soon.',     accent: '#3E2723' },
  cancelled:   { title: 'Cancelled',              body: 'You won\'t be charged. Contact support if this was unexpected.', accent: '#B71C1C' },
  failed:      { title: 'Something went wrong',   body: 'We\'re looking into it. Reach out and we\'ll sort it.',          accent: '#B71C1C' },
};

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { order, loading } = useOrder(id);

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#3E2723" style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  const copy = STATUS_COPY[order.status];
  const live = order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'failed';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(tabs)/orders')} hitSlop={16}>
          <Text style={styles.back}>‹ Orders</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.statusCard, { borderLeftColor: copy.accent }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusTitle, { color: copy.accent }]}>{copy.title}</Text>
            {live ? <ActivityIndicator color={copy.accent} size="small" /> : null}
          </View>
          <Text style={styles.statusBody}>{copy.body}</Text>
        </View>

        <Text style={styles.section}>Order</Text>
        <View style={styles.card}>
          <Text style={styles.cafeName}>{order.cafes?.name}</Text>
          {order.cafes?.address ? (
            <Text style={styles.cafeAddress}>{order.cafes.address}</Text>
          ) : null}
        </View>

        <View style={[styles.card, { marginTop: 12 }]}>
          {order.order_items.map((item, idx) => (
            <View key={item.id}>
              {idx > 0 ? <View style={styles.sep} /> : null}
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {item.qty}× {item.name_snapshot}
                  </Text>
                  {item.modifiers_json.length > 0 ? (
                    <Text style={styles.itemMods}>
                      {item.modifiers_json.map((m) => m.name).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <MoneyText cents={item.unit_price_cents * item.qty} style={styles.itemPrice} />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { marginTop: 12 }]}>
          <TotalRow label="Subtotal" cents={order.subtotal_cents} />
          {order.tip_cents > 0 ? <TotalRow label="Tip" cents={order.tip_cents} /> : null}
          {order.beans_value_cents > 0 ? (
            <TotalRow
              label={`${order.beans_redeemed} Beans redeemed`}
              cents={-order.beans_value_cents}
              positive
            />
          ) : null}
          <View style={styles.divider} />
          <TotalRow label="Total paid" cents={order.total_charged_cents} bold />
        </View>

        <Text style={styles.timestamp}>
          Placed {new Date(order.created_at).toLocaleString('en-GB')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TotalRow({
  label,
  cents,
  bold,
  positive,
}: {
  label: string;
  cents: number;
  bold?: boolean;
  positive?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.bold]}>{label}</Text>
      <MoneyText
        cents={cents}
        style={[styles.totalValue, bold && styles.bold, positive && styles.positive]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  headerRow: { padding: 16, paddingBottom: 8 },
  back: { color: '#3E2723', fontSize: 16 },
  scroll: { padding: 16, paddingBottom: 32 },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 6,
    gap: 8,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusTitle: { fontSize: 20, fontWeight: '700' },
  statusBody: { fontSize: 14, color: '#5D4037' },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 13,
    color: '#3E2723',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14 },
  cafeName: { fontSize: 16, fontWeight: '600', color: '#3E2723' },
  cafeAddress: { fontSize: 13, color: '#8D6E63', marginTop: 4 },
  itemRow: { flexDirection: 'row', padding: 8, alignItems: 'center' },
  itemName: { fontSize: 15, color: '#3E2723' },
  itemMods: { fontSize: 13, color: '#8D6E63', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '500', color: '#3E2723' },
  sep: { height: 1, backgroundColor: '#EFEBE9' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: '#6D4C41', fontSize: 14 },
  totalValue: { color: '#3E2723', fontSize: 14, fontWeight: '500' },
  bold: { fontWeight: '700', fontSize: 16, color: '#3E2723' },
  positive: { color: '#2E7D32' },
  divider: { height: 1, backgroundColor: '#EFEBE9', marginVertical: 6 },
  timestamp: { marginTop: 16, fontSize: 12, color: '#8D6E63', textAlign: 'center' },
});

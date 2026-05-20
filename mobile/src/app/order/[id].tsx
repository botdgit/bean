import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton, Card, SectionLabel } from '@/components/ui';
import { useOrder } from '@/hooks/useOrder';
import { formatPence } from '@/lib/format';
import { colors, radius, space, type } from '@/lib/theme';
import type { OrderStatus } from '@/types/database';

const STATUS: Record<
  OrderStatus,
  { title: string; body: string; icon: keyof typeof Ionicons.glyphMap; accent: string; bg: string }
> = {
  pending: { title: 'Confirming payment…', body: 'This only takes a moment.', icon: 'hourglass', accent: colors.inkSoft, bg: colors.surfaceMuted },
  paid: { title: 'Sent to the shop', body: "They'll start your order shortly.", icon: 'paper-plane', accent: '#7A5B12', bg: '#F6ECCF' },
  accepted: { title: 'Accepted', body: 'The barista has your order.', icon: 'checkmark-circle', accent: '#7A5B12', bg: '#F6ECCF' },
  in_progress: { title: 'Being made', body: 'Good things take a few minutes.', icon: 'cafe', accent: '#7A5B12', bg: '#F6ECCF' },
  ready: { title: 'Ready for pickup', body: 'Show your name at the counter.', icon: 'bag-check', accent: colors.success, bg: colors.successBg },
  completed: { title: 'Collected', body: 'Enjoy. See you again soon.', icon: 'happy', accent: colors.inkSoft, bg: colors.surfaceMuted },
  cancelled: { title: 'Cancelled', body: "You won't be charged.", icon: 'close-circle', accent: colors.danger, bg: colors.dangerBg },
  failed: { title: 'Something went wrong', body: "We're looking into it.", icon: 'alert-circle', accent: colors.danger, bg: colors.dangerBg },
};

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { order, loading } = useOrder(id);

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  const s = STATUS[order.status];
  const live = !['completed', 'cancelled', 'failed'].includes(order.status);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <BackButton label="Orders" onPress={() => router.replace('/(tabs)/orders')} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { backgroundColor: s.bg }]}>
          <View style={[styles.statusIcon, { backgroundColor: s.accent }]}>
            <Ionicons name={s.icon} size={26} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: s.accent }]}>{s.title}</Text>
            <Text style={styles.statusBody}>{s.body}</Text>
          </View>
          {live ? <ActivityIndicator color={s.accent} /> : null}
        </View>

        <SectionLabel style={styles.section}>{order.cafes?.name ?? 'Your order'}</SectionLabel>
        <Card padded={false}>
          {order.order_items.map((item, idx) => (
            <View
              key={item.id}
              style={[styles.itemRow, idx < order.order_items.length - 1 && styles.itemBorder]}
            >
              <Text style={styles.itemQty}>{item.qty}×</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name_snapshot}</Text>
                {item.modifiers_json.length > 0 ? (
                  <Text style={styles.itemMods}>{item.modifiers_json.map((m) => m.name).join(' · ')}</Text>
                ) : null}
              </View>
              <Text style={styles.itemPrice}>{formatPence(item.unit_price_cents * item.qty)}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.totals}>
          <Row label="Subtotal" value={formatPence(order.subtotal_cents)} />
          {order.tip_cents > 0 ? <Row label="Tip" value={formatPence(order.tip_cents)} /> : null}
          {order.beans_value_cents > 0 ? (
            <Row label={`${order.beans_redeemed} Beans redeemed`} value={`−${formatPence(order.beans_value_cents)}`} positive />
          ) : null}
          <View style={styles.divider} />
          <Row label="Total paid" value={formatPence(order.total_charged_cents)} bold />
        </Card>

        <Text style={styles.timestamp}>
          Placed {new Date(order.created_at).toLocaleString('en-GB')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, positive }: { label: string; value: string; bold?: boolean; positive?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.bold, positive && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  scroll: { padding: space.lg, paddingBottom: space.xxl },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  statusIcon: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 19, fontWeight: '800' },
  statusBody: { ...type.caption, marginTop: 2, color: colors.inkSoft },
  section: { marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  itemQty: { ...type.bodyStrong, color: colors.accent },
  itemName: { ...type.bodyStrong, fontSize: 15 },
  itemMods: { ...type.caption, marginTop: 2 },
  itemPrice: { ...type.bodyStrong, fontSize: 14 },
  totals: { marginTop: space.lg, gap: space.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { ...type.body, fontSize: 14 },
  totalValue: { ...type.bodyStrong, fontSize: 14 },
  bold: { fontSize: 18, fontWeight: '800', color: colors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 4 },
  timestamp: { ...type.caption, textAlign: 'center', marginTop: space.lg },
});

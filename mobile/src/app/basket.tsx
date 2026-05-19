import { Stack, router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { MoneyText } from '@/components/MoneyText';
import { useProfile } from '@/hooks/useProfile';
import {
  REDEMPTION_THRESHOLD_BEANS,
  REDEMPTION_VALUE_CENTS,
  canRedeem,
  formatPence,
} from '@/lib/format';
import { BasketLine, useBasket } from '@/state/basket';

const TIP_OPTIONS = [
  { label: 'No tip', cents: 0 },
  { label: '50p',    cents: 50 },
  { label: '£1',     cents: 100 },
  { label: '£1.50',  cents: 150 },
];

function LineRow({ line }: { line: BasketLine }) {
  const updateQty = useBasket((s) => s.updateQty);
  const lineUnit =
    line.unitPriceCents + line.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0);
  return (
    <View style={styles.line}>
      <View style={{ flex: 1 }}>
        <Text style={styles.lineName}>{line.name}</Text>
        {line.modifiers.length ? (
          <Text style={styles.lineMods}>
            {line.modifiers.map((m) => m.name).join(' · ')}
          </Text>
        ) : null}
        {line.note ? <Text style={styles.lineNote}>“{line.note}”</Text> : null}
      </View>
      <View style={styles.lineRight}>
        <View style={styles.qtyControls}>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => updateQty(line.lineId, line.qty - 1)}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{line.qty}</Text>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => updateQty(line.lineId, line.qty + 1)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>
        <MoneyText cents={lineUnit * line.qty} style={styles.linePrice} />
      </View>
    </View>
  );
}

export default function Basket() {
  const lines = useBasket((s) => s.lines);
  const tipCents = useBasket((s) => s.tipCents);
  const setTip = useBasket((s) => s.setTip);
  const redeemBeans = useBasket((s) => s.redeemBeans);
  const setRedeemBeans = useBasket((s) => s.setRedeemBeans);
  const subtotalCents = useBasket((s) => s.subtotalCents());
  const clear = useBasket((s) => s.clear);

  const { profile } = useProfile();
  const balance = profile?.bean_balance ?? 0;
  const eligible = canRedeem(balance, subtotalCents);
  const redeem = redeemBeans && eligible;
  const redeemValue = redeem ? REDEMPTION_VALUE_CENTS : 0;
  const totalCents = Math.max(0, subtotalCents + tipCents - redeemValue);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Basket</Text>
        {lines.length ? (
          <Pressable onPress={clear} hitSlop={16}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {lines.length === 0 ? (
        <EmptyState title="Your basket is empty" body="Add something tasty from a shop." />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {lines.map((l, idx) => (
            <View key={l.lineId}>
              {idx > 0 ? <View style={styles.sep} /> : null}
              <LineRow line={l} />
            </View>
          ))}

          <Text style={styles.section}>Tip</Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((opt) => (
              <Pressable
                key={opt.cents}
                style={[styles.tipChip, tipCents === opt.cents && styles.tipChipOn]}
                onPress={() => setTip(opt.cents)}
              >
                <Text style={[styles.tipText, tipCents === opt.cents && styles.tipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>Beans</Text>
          <Pressable
            style={[styles.redeem, !eligible && styles.redeemDisabled]}
            onPress={() => eligible && setRedeemBeans(!redeem)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.redeemTitle}>
                Use {REDEMPTION_THRESHOLD_BEANS} Beans for {formatPence(REDEMPTION_VALUE_CENTS)} off
              </Text>
              <Text style={styles.redeemSub}>
                {eligible
                  ? `Balance: ${balance} Beans`
                  : balance < REDEMPTION_THRESHOLD_BEANS
                    ? `Earn ${REDEMPTION_THRESHOLD_BEANS - balance} more Beans to redeem.`
                    : `Order must be at least ${formatPence(REDEMPTION_VALUE_CENTS)} to redeem.`}
              </Text>
            </View>
            <View style={[styles.box, redeem && styles.boxOn]}>
              {redeem ? <Text style={styles.tick}>✓</Text> : null}
            </View>
          </Pressable>

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <MoneyText cents={subtotalCents} style={styles.totalValue} />
            </View>
            {tipCents > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tip</Text>
                <MoneyText cents={tipCents} style={styles.totalValue} />
              </View>
            ) : null}
            {redeem ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Beans redeemed</Text>
                <Text style={[styles.totalValue, { color: '#2E7D32' }]}>
                  −{formatPence(redeemValue)}
                </Text>
              </View>
            ) : null}
            <View style={[styles.totalRow, styles.grandRow]}>
              <Text style={styles.grandLabel}>Total</Text>
              <MoneyText cents={totalCents} style={styles.grandValue} />
            </View>
          </View>
        </ScrollView>
      )}

      {lines.length > 0 ? (
        <View style={styles.footer}>
          <Pressable
            style={styles.cta}
            onPress={() => router.push('/checkout')}
          >
            <Text style={styles.ctaText}>Checkout · {formatPence(totalCents)}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { color: '#3E2723', fontSize: 16, width: 50 },
  title: { fontSize: 17, fontWeight: '600', color: '#3E2723' },
  clear: { color: '#B71C1C', fontSize: 14, width: 50, textAlign: 'right' },
  scroll: { padding: 16, paddingBottom: 32 },
  line: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderRadius: 12 },
  lineName: { fontSize: 15, fontWeight: '500', color: '#3E2723' },
  lineMods: { fontSize: 13, color: '#8D6E63', marginTop: 2 },
  lineNote: { fontSize: 12, color: '#6D4C41', marginTop: 4, fontStyle: 'italic' },
  lineRight: { alignItems: 'flex-end', gap: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EFEBE9', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: '#3E2723', fontWeight: '600' },
  qtyValue: { fontSize: 15, fontWeight: '600', color: '#3E2723', minWidth: 18, textAlign: 'center' },
  linePrice: { fontSize: 15, fontWeight: '600', color: '#3E2723' },
  sep: { height: 8 },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 13,
    color: '#3E2723',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  tipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tipChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D7CCC8' },
  tipChipOn: { backgroundColor: '#3E2723', borderColor: '#3E2723' },
  tipText: { color: '#3E2723', fontWeight: '500' },
  tipTextOn: { color: '#FFF' },
  redeem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFF', borderRadius: 12 },
  redeemDisabled: { opacity: 0.5 },
  redeemTitle: { fontSize: 15, fontWeight: '500', color: '#3E2723' },
  redeemSub: { fontSize: 13, color: '#8D6E63', marginTop: 2 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#A1887F', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  boxOn: { backgroundColor: '#3E2723', borderColor: '#3E2723' },
  tick: { color: '#FFF', fontWeight: '700' },
  totals: { marginTop: 20, padding: 14, backgroundColor: '#FFF', borderRadius: 12, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: '#6D4C41', fontSize: 14 },
  totalValue: { color: '#3E2723', fontSize: 14, fontWeight: '500' },
  grandRow: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#EFEBE9', paddingTop: 10 },
  grandLabel: { color: '#3E2723', fontSize: 16, fontWeight: '700' },
  grandValue: { color: '#3E2723', fontSize: 18, fontWeight: '700' },
  footer: { padding: 16, backgroundColor: '#FFF8F1', borderTopWidth: 1, borderTopColor: '#EFEBE9' },
  cta: { backgroundColor: '#3E2723', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Button, Card, SectionLabel } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import {
  REDEMPTION_THRESHOLD_BEANS,
  REDEMPTION_VALUE_CENTS,
  canRedeem,
  formatPence,
} from '@/lib/format';
import { BasketLine, useBasket } from '@/state/basket';
import { colors, radius, space, type } from '@/lib/theme';

const TIPS = [
  { label: 'None', cents: 0 },
  { label: '50p', cents: 50 },
  { label: '£1', cents: 100 },
  { label: '£1.50', cents: 150 },
];

function LineRow({ line, last }: { line: BasketLine; last: boolean }) {
  const updateQty = useBasket((s) => s.updateQty);
  const lineUnit = line.unitPriceCents + line.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0);
  return (
    <View style={[styles.line, !last && styles.lineBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.lineName}>{line.name}</Text>
        {line.modifiers.length ? (
          <Text style={styles.lineMods}>{line.modifiers.map((m) => m.name).join(' · ')}</Text>
        ) : null}
        {line.note ? <Text style={styles.lineNote}>“{line.note}”</Text> : null}
        <Text style={styles.linePrice}>{formatPence(lineUnit * line.qty)}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => updateQty(line.lineId, line.qty - 1)}>
          <Ionicons name={line.qty === 1 ? 'trash-outline' : 'remove'} size={16} color={colors.ink} />
        </Pressable>
        <Text style={styles.qty}>{line.qty}</Text>
        <Pressable style={styles.stepBtn} onPress={() => updateQty(line.lineId, line.qty + 1)}>
          <Ionicons name="add" size={16} color={colors.ink} />
        </Pressable>
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
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Basket</Text>
        {lines.length ? (
          <Pressable onPress={clear} hitSlop={16} style={styles.headerBtn}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {lines.length === 0 ? (
        <EmptyState title="Your basket is empty" body="Add something tasty from a shop." />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Card padded={false}>
              {lines.map((l, i) => (
                <LineRow key={l.lineId} line={l} last={i === lines.length - 1} />
              ))}
            </Card>

            <SectionLabel style={styles.section}>Tip your barista</SectionLabel>
            <View style={styles.tipRow}>
              {TIPS.map((t) => {
                const on = tipCents === t.cents;
                return (
                  <Pressable
                    key={t.cents}
                    style={[styles.tip, on && styles.tipOn]}
                    onPress={() => setTip(t.cents)}
                  >
                    <Text style={[styles.tipText, on && styles.tipTextOn]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionLabel style={styles.section}>Beans</SectionLabel>
            <Pressable
              style={[styles.redeem, !eligible && styles.redeemOff]}
              onPress={() => eligible && setRedeemBeans(!redeem)}
            >
              <View style={styles.redeemIcon}>
                <Ionicons name="gift" size={20} color={redeem ? colors.accentInk : colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.redeemTitle}>
                  Use {REDEMPTION_THRESHOLD_BEANS} Beans · {formatPence(REDEMPTION_VALUE_CENTS)} off
                </Text>
                <Text style={styles.redeemSub}>
                  {eligible
                    ? `Balance: ${balance} Beans`
                    : balance < REDEMPTION_THRESHOLD_BEANS
                      ? `Earn ${REDEMPTION_THRESHOLD_BEANS - balance} more to redeem`
                      : `Spend at least ${formatPence(REDEMPTION_VALUE_CENTS)} to redeem`}
                </Text>
              </View>
              <View style={[styles.toggle, redeem && styles.toggleOn]}>
                {redeem ? <Ionicons name="checkmark" size={16} color={colors.accentInk} /> : null}
              </View>
            </Pressable>

            <Card style={styles.totals}>
              <Row label="Subtotal" value={formatPence(subtotalCents)} />
              {tipCents > 0 ? <Row label="Tip" value={formatPence(tipCents)} /> : null}
              {redeem ? <Row label="Beans redeemed" value={`−${formatPence(redeemValue)}`} positive /> : null}
              <View style={styles.divider} />
              <Row label="Total" value={formatPence(totalCents)} bold />
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <Button label={`Checkout  ·  ${formatPence(totalCents)}`} onPress={() => router.push('/checkout')} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value, bold, positive }: { label: string; value: string; bold?: boolean; positive?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold, positive && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md },
  headerBtn: { width: 56 },
  headerTitle: { ...type.heading },
  clear: { color: colors.danger, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  lineBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  lineName: { ...type.bodyStrong, fontSize: 16 },
  lineMods: { ...type.caption, marginTop: 2 },
  lineNote: { ...type.caption, fontStyle: 'italic', marginTop: 3 },
  linePrice: { ...type.bodyStrong, fontSize: 14, marginTop: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, padding: 3 },
  stepBtn: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 15, fontWeight: '700', color: colors.ink, minWidth: 16, textAlign: 'center' },
  section: { marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xs },
  tipRow: { flexDirection: 'row', gap: space.sm },
  tip: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  tipOn: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  tipText: { fontWeight: '700', color: colors.ink },
  tipTextOn: { color: '#FFF' },
  redeem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg },
  redeemOff: { opacity: 0.55 },
  redeemIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  redeemTitle: { ...type.bodyStrong, fontSize: 15 },
  redeemSub: { ...type.caption, marginTop: 2 },
  toggle: { width: 26, height: 26, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  totals: { marginTop: space.lg, gap: space.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { ...type.body, fontSize: 14 },
  totalValue: { ...type.bodyStrong, fontSize: 14 },
  totalBold: { fontSize: 18, fontWeight: '800', color: colors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 4 },
  footer: { padding: space.lg, paddingBottom: space.xl, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});

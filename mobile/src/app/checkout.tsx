import { Ionicons } from '@expo/vector-icons';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { canRedeem, formatPence } from '@/lib/format';
import { inExpoGo, stripeAvailable } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { useBasket } from '@/state/basket';
import { colors, radius, space, type } from '@/lib/theme';

type IntentResponse = {
  order_id: string;
  payment_intent_client_secret: string;
  ephemeral_key_secret: string;
  customer_id: string;
  totals: {
    subtotal_cents: number;
    tip_cents: number;
    beans_redeemed: number;
    beans_value_cents: number;
    total_charged_cents: number;
    app_fee_cents: number;
  };
};

type MockResponse = { order_id: string; status: 'paid'; mock: true };

export default function Checkout() {
  const cafeId = useBasket((s) => s.cafeId);
  const lines = useBasket((s) => s.lines);
  const tipCents = useBasket((s) => s.tipCents);
  const redeemBeans = useBasket((s) => s.redeemBeans);
  const subtotalCents = useBasket((s) => s.subtotalCents());
  const clearBasket = useBasket((s) => s.clear);

  const { profile } = useProfile();
  const balance = profile?.bean_balance ?? 0;
  const redeemEligible = canRedeem(balance, subtotalCents);
  const expectedRedeemCents = redeemEligible && redeemBeans ? 400 : 0;
  const expectedTotalCents = Math.max(0, subtotalCents + tipCents - expectedRedeemCents);

  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [sheetReady, setSheetReady] = useState(false);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'paying' | 'confirming'>('preparing');
  const [error, setError] = useState<string | null>(null);

  const useMock = !stripeAvailable;

  useEffect(() => {
    if (!cafeId || lines.length === 0) {
      router.back();
      return;
    }
    if (useMock) {
      setStatus('ready');
      setSheetReady(true);
      return;
    }

    let cancelled = false;
    setStatus('preparing');
    (async () => {
      const { data, error } = await supabase.functions.invoke<IntentResponse>('checkout-create-intent', {
        body: {
          cafe_id: cafeId,
          lines: lines.map((l) => ({
            catalog_item_id: l.catalogItemId,
            qty: l.qty,
            modifier_ids: l.modifiers.map((m) => m.localId),
            note: l.note,
          })),
          tip_cents: tipCents,
          redeem_beans: redeemBeans,
        },
      });
      if (cancelled) return;
      if (error || !data) {
        setError(error?.message ?? 'Could not start checkout');
        return;
      }
      setIntent(data);
      const init = await initPaymentSheet({
        merchantDisplayName: 'BEAN',
        paymentIntentClientSecret: data.payment_intent_client_secret,
        customerId: data.customer_id,
        customerEphemeralKeySecret: data.ephemeral_key_secret,
        applePay: { merchantCountryCode: 'GB' },
        defaultBillingDetails: { email: profile?.email ?? undefined, name: profile?.name ?? undefined },
        allowsDelayedPaymentMethods: false,
        returnURL: 'bean://checkout-return',
      });
      if (cancelled) return;
      if (init.error) {
        setError(init.error.message);
        return;
      }
      setSheetReady(true);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [cafeId, useMock]);

  async function pay() {
    if (useMock) {
      setError(null);
      setStatus('confirming');
      const { data, error } = await supabase.functions.invoke<MockResponse>('mock-checkout', {
        body: {
          cafe_id: cafeId,
          lines: lines.map((l) => ({
            catalog_item_id: l.catalogItemId,
            qty: l.qty,
            modifier_ids: l.modifiers.map((m) => m.localId),
            note: l.note,
          })),
          tip_cents: tipCents,
          redeem_beans: redeemBeans,
        },
      });
      if (error || !data) {
        setError(error?.message ?? 'Checkout failed');
        setStatus('ready');
        return;
      }
      clearBasket();
      router.replace(`/order/${data.order_id}`);
      return;
    }

    if (!intent || !sheetReady) return;
    setError(null);
    setStatus('paying');
    const { error } = await presentPaymentSheet();
    if (error) {
      setError(error.message);
      setStatus('ready');
      return;
    }
    setStatus('confirming');
    const { error: confirmError } = await supabase.functions.invoke('order-confirm', {
      body: { order_id: intent.order_id },
    });
    if (confirmError) console.warn('order-confirm failed; webhook will reconcile', confirmError);
    clearBasket();
    router.replace(`/order/${intent.order_id}`);
  }

  const busy = status === 'preparing' || status === 'paying' || status === 'confirming';
  const buttonLabel =
    status === 'preparing'
      ? 'Preparing…'
      : status === 'confirming'
        ? 'Confirming…'
        : useMock
          ? 'Place order (demo)'
          : `Pay  ·  ${formatPence(intent?.totals.total_charged_cents ?? expectedTotalCents)}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={16} disabled={status === 'confirming'} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={24} color={status === 'confirming' ? colors.inkMuted : colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.body}>
        {useMock ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={20} color="#7A5B12" />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>
                {inExpoGo ? 'Demo mode (Expo Go)' : 'Demo mode'}
              </Text>
              <Text style={styles.noticeBody}>
                Apple Pay needs a dev build. This records the order without charging, so you can try
                the full flow.
              </Text>
            </View>
          </View>
        ) : null}

        <Card style={styles.totals}>
          <Row label="Subtotal" value={formatPence(subtotalCents)} />
          {tipCents > 0 ? <Row label="Tip" value={formatPence(tipCents)} /> : null}
          {expectedRedeemCents > 0 ? (
            <Row label="Beans redeemed" value={`−${formatPence(expectedRedeemCents)}`} positive />
          ) : null}
          <View style={styles.divider} />
          <Row label="Total" value={formatPence(expectedTotalCents)} bold />
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button label={buttonLabel} onPress={pay} loading={busy} disabled={status !== 'ready'} />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, positive }: { label: string; value: string; bold?: boolean; positive?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold, positive && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md },
  headerBtn: { width: 40 },
  headerTitle: { ...type.heading },
  body: { flex: 1, padding: space.lg, gap: space.lg },
  notice: { flexDirection: 'row', gap: space.sm, backgroundColor: '#F6ECCF', borderRadius: radius.md, padding: space.lg },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: '#7A5B12' },
  noticeBody: { fontSize: 13, color: '#7A5B12', lineHeight: 18, marginTop: 2 },
  totals: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...type.body, fontSize: 14 },
  rowValue: { ...type.bodyStrong, fontSize: 14 },
  bold: { fontSize: 18, fontWeight: '800', color: colors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 4 },
  errorBox: { flexDirection: 'row', gap: space.sm, alignItems: 'center', backgroundColor: colors.dangerBg, borderRadius: radius.md, padding: space.md },
  errorText: { color: colors.danger, fontSize: 13, flex: 1 },
  footer: { padding: space.lg, paddingBottom: space.xl, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});

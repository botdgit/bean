import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoneyText } from '@/components/MoneyText';
import { useProfile } from '@/hooks/useProfile';
import { canRedeem, formatPence } from '@/lib/format';
import { inExpoGo, stripeAvailable } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { useBasket } from '@/state/basket';

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

type MockResponse = {
  order_id: string;
  status: 'paid';
  mock: true;
};

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

  // In Expo Go (or when no Stripe key is configured), we bypass Stripe and
  // call mock-checkout instead. The basket and totals UI are unchanged.
  const useMock = !stripeAvailable;

  useEffect(() => {
    if (!cafeId || lines.length === 0) {
      router.back();
      return;
    }

    if (useMock) {
      // No prep needed for the mock path.
      setStatus('ready');
      setSheetReady(true);
      return;
    }

    let cancelled = false;
    setStatus('preparing');

    (async () => {
      const { data, error } = await supabase.functions.invoke<IntentResponse>(
        'checkout-create-intent',
        {
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
        },
      );

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
        defaultBillingDetails: {
          email: profile?.email ?? undefined,
          name: profile?.name ?? undefined,
        },
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
        setError(error?.message ?? 'mock-checkout failed');
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
    if (confirmError) {
      console.warn('order-confirm failed; webhook will reconcile', confirmError);
    }

    clearBasket();
    router.replace(`/order/${intent.order_id}`);
  }

  const totalForButton = useMock
    ? expectedTotalCents
    : intent?.totals.total_charged_cents ?? expectedTotalCents;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={16} disabled={status === 'confirming'}>
          <Text style={[styles.back, status === 'confirming' && { opacity: 0.4 }]}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.body}>
        {useMock ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>
              {inExpoGo ? 'Demo mode (Expo Go)' : 'Demo mode (Stripe not configured)'}
            </Text>
            <Text style={styles.noticeBody}>
              Apple Pay is disabled. Tapping Pay records the order without
              charging anything so the full app loop (order tracking, Beans
              earned, wallet) can be tested.
            </Text>
          </View>
        ) : null}

        <View style={styles.totals}>
          <Row label="Subtotal" cents={subtotalCents} />
          {tipCents > 0 ? <Row label="Tip" cents={tipCents} /> : null}
          {expectedRedeemCents > 0 ? (
            <Row label="Beans redeemed" cents={-expectedRedeemCents} positive />
          ) : null}
          <View style={styles.divider} />
          <Row label="Total" cents={expectedTotalCents} bold />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.cta,
            (status !== 'ready' || (!useMock && !sheetReady)) && styles.ctaDisabled,
          ]}
          onPress={pay}
          disabled={status !== 'ready' || (!useMock && !sheetReady)}
        >
          {status === 'preparing' ? (
            <>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.ctaSub}>Preparing checkout…</Text>
            </>
          ) : status === 'paying' ? (
            <ActivityIndicator color="#FFF" />
          ) : status === 'confirming' ? (
            <>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.ctaSub}>Confirming…</Text>
            </>
          ) : (
            <Text style={styles.ctaText}>
              {useMock ? 'Place order (demo)' : `Pay ${formatPence(totalForButton)}`}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({
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
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <MoneyText
        cents={cents}
        style={[styles.rowValue, bold && styles.bold, positive && styles.positive]}
      />
    </View>
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
  body: { flex: 1, padding: 16, gap: 12 },
  notice: {
    backgroundColor: '#FFE0B2',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: '#5D4037' },
  noticeBody: { fontSize: 13, color: '#5D4037', lineHeight: 18 },
  totals: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#6D4C41', fontSize: 14 },
  rowValue: { color: '#3E2723', fontSize: 14, fontWeight: '500' },
  bold: { fontWeight: '700', fontSize: 16, color: '#3E2723' },
  positive: { color: '#2E7D32' },
  divider: { height: 1, backgroundColor: '#EFEBE9', marginVertical: 4 },
  error: { color: '#B71C1C', fontSize: 13, paddingHorizontal: 4 },
  footer: { padding: 16, backgroundColor: '#FFF8F1', borderTopWidth: 1, borderTopColor: '#EFEBE9' },
  cta: {
    backgroundColor: '#3E2723',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  ctaSub: { color: '#FFF', fontSize: 14 },
});

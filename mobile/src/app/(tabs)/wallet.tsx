import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, SectionLabel } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import {
  REDEMPTION_THRESHOLD_BEANS,
  REDEMPTION_VALUE_CENTS,
  formatBeans,
  formatPence,
} from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, radius, space, TAB_BAR_CLEARANCE, type } from '@/lib/theme';
import type { LedgerEntry } from '@/types/database';

const REASON: Record<LedgerEntry['reason'], { label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
  earn: { label: 'Earned', icon: 'add-circle' },
  redeem: { label: 'Redeemed', icon: 'gift' },
  adjust: { label: 'Adjustment', icon: 'swap-horizontal' },
  expire: { label: 'Expired', icon: 'time' },
};

function LedgerRow({ entry, last }: { entry: LedgerEntry; last: boolean }) {
  const positive = entry.delta >= 0;
  const meta = REASON[entry.reason];
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>
        <Ionicons name={meta.icon} size={18} color={positive ? colors.success : colors.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowReason}>{meta.label}</Text>
        <Text style={styles.rowDate}>{new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
      </View>
      <Text style={[styles.rowDelta, { color: positive ? colors.success : colors.danger }]}>
        {positive ? '+' : ''}{entry.delta}
      </Text>
    </View>
  );
}

export default function Wallet() {
  const { session } = useSession();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from('loyalty_ledger')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) {
          setEntries(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, profile?.bean_balance]);

  const balance = profile?.bean_balance ?? 0;
  const pct = Math.min(1, balance / REDEMPTION_THRESHOLD_BEANS);
  const remaining = Math.max(0, REDEMPTION_THRESHOLD_BEANS - balance);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Wallet</Text>

        <Card style={styles.hero} padded raised>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Bean balance</Text>
            <Ionicons name="cafe" size={20} color={colors.beans} />
          </View>
          <Text style={styles.heroBalance}>{formatBeans(balance)}</Text>

          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.heroHint}>
            {balance >= REDEMPTION_THRESHOLD_BEANS
              ? `Ready to redeem ${formatPence(REDEMPTION_VALUE_CENTS)} off your next order`
              : `${remaining} Beans to your next ${formatPence(REDEMPTION_VALUE_CENTS)} reward`}
          </Text>
        </Card>

        <SectionLabel style={{ marginTop: space.xl, marginBottom: space.md, marginLeft: space.xs }}>
          Activity
        </SectionLabel>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : entries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={28} color={colors.inkMuted} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyBody}>Place your first order to start earning Beans.</Text>
          </Card>
        ) : (
          <Card padded={false} style={styles.listCard}>
            {entries.map((e, i) => (
              <LedgerRow key={e.id} entry={e} last={i === entries.length - 1} />
            ))}
          </Card>
        )}

        <Button
          label="Sign out"
          variant="ghost"
          icon="log-out-outline"
          onPress={() => supabase.auth.signOut()}
          style={{ marginTop: space.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, paddingBottom: TAB_BAR_CLEARANCE },
  pageTitle: { ...type.title, marginTop: space.md, marginBottom: space.lg },
  hero: { backgroundColor: colors.espresso },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#D8C7B8', fontSize: 13, fontWeight: '600' },
  heroBalance: { color: '#FFF', fontSize: 36, fontWeight: '800', marginTop: space.sm, letterSpacing: -0.5 },
  bar: { marginTop: space.lg, height: 8, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.beans, borderRadius: 4 },
  heroHint: { color: '#D8C7B8', fontSize: 13, marginTop: space.md },
  listCard: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowIcon: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  rowReason: { ...type.bodyStrong, fontSize: 15 },
  rowDate: { ...type.caption, marginTop: 1 },
  rowDelta: { fontSize: 16, fontWeight: '700' },
  emptyCard: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  emptyTitle: { ...type.bodyStrong },
  emptyBody: { ...type.caption, textAlign: 'center' },
});

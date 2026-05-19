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
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import {
  REDEMPTION_THRESHOLD_BEANS,
  REDEMPTION_VALUE_CENTS,
  formatBeans,
  formatPence,
} from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { LedgerEntry } from '@/types/database';

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const sign = entry.delta >= 0 ? '+' : '';
  const colour = entry.delta >= 0 ? '#2E7D32' : '#B71C1C';
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowReason}>{labelFor(entry.reason)}</Text>
        <Text style={styles.rowDate}>{new Date(entry.created_at).toLocaleString('en-GB')}</Text>
      </View>
      <Text style={[styles.rowDelta, { color: colour }]}>
        {sign}
        {entry.delta} Beans
      </Text>
    </View>
  );
}

function labelFor(reason: LedgerEntry['reason']): string {
  switch (reason) {
    case 'earn':   return 'Earned';
    case 'redeem': return 'Redeemed';
    case 'adjust': return 'Adjustment';
    case 'expire': return 'Expired';
  }
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
  const towardsReward = Math.min(balance, REDEMPTION_THRESHOLD_BEANS);
  const pct = Math.min(1, balance / REDEMPTION_THRESHOLD_BEANS);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.label}>Your Beans</Text>
        <Text style={styles.balance}>{formatBeans(balance)}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.barHint}>
          {balance >= REDEMPTION_THRESHOLD_BEANS
            ? `Redeem ${REDEMPTION_THRESHOLD_BEANS} Beans for ${formatPence(REDEMPTION_VALUE_CENTS)} off your next order.`
            : `${REDEMPTION_THRESHOLD_BEANS - towardsReward} Beans until your next ${formatPence(REDEMPTION_VALUE_CENTS)} reward.`}
        </Text>
      </View>

      <Text style={styles.section}>Activity</Text>
      {loading ? (
        <ActivityIndicator color="#3E2723" style={{ marginTop: 24 }} />
      ) : entries.length === 0 ? (
        <EmptyState title="No activity yet" body="Place your first order to earn Beans." />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <LedgerRow entry={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}

      <Pressable
        style={styles.signOut}
        onPress={() => supabase.auth.signOut()}
        hitSlop={8}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  header: { padding: 20, gap: 8 },
  label: { fontSize: 13, color: '#6D4C41' },
  balance: { fontSize: 40, fontWeight: '800', color: '#3E2723' },
  bar: {
    marginTop: 12,
    height: 8,
    backgroundColor: '#EFEBE9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: '#3E2723' },
  barHint: { marginTop: 8, fontSize: 13, color: '#6D4C41' },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 13,
    color: '#8D6E63',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  rowReason: { fontSize: 15, color: '#3E2723', fontWeight: '500' },
  rowDate: { fontSize: 12, color: '#8D6E63', marginTop: 2 },
  rowDelta: { fontSize: 15, fontWeight: '600' },
  sep: { height: 1, backgroundColor: '#EFEBE9', marginHorizontal: 20 },
  signOut: { alignSelf: 'center', padding: 16, marginTop: 'auto' },
  signOutText: { color: '#8D6E63', fontSize: 14 },
});

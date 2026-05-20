import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModifierPicker, Selection, groupModifiers } from '@/components/ModifierPicker';
import { BackButton, Button } from '@/components/ui';
import { useCatalogItem } from '@/hooks/useCafeMenu';
import { formatPence } from '@/lib/format';
import { useBasket } from '@/state/basket';
import { colors, radius, space, subtleShadow, type } from '@/lib/theme';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ItemDetail() {
  const { id: cafeId, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const { item, modifiers, loading } = useCatalogItem(itemId);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [selection, setSelection] = useState<Selection>({});

  const setCafe = useBasket((s) => s.setCafe);
  const addLine = useBasket((s) => s.addLine);

  const groups = useMemo(() => groupModifiers(modifiers), [modifiers]);

  const chosen = useMemo(() => {
    const out: { localId: string; name: string; priceDeltaCents: number }[] = [];
    for (const g of groups) {
      const ids = selection[g.listId] ?? new Set<string>();
      for (const m of g.modifiers) {
        if (ids.has(m.id)) {
          out.push({ localId: m.id, name: m.name, priceDeltaCents: m.price_delta_cents });
        }
      }
    }
    return out;
  }, [selection, groups]);

  const unitCents = (item?.price_cents ?? 0) + chosen.reduce((s, m) => s + m.priceDeltaCents, 0);
  const totalCents = unitCents * qty;

  const unsetRequired = groups.some(
    (g) => g.selectionType === 'single' && !(selection[g.listId]?.size ?? 0),
  );

  function add() {
    if (!item || !cafeId) return;
    setCafe(cafeId);
    addLine({
      lineId: uuidv4(),
      catalogItemId: item.id,
      name: item.name,
      unitPriceCents: item.price_cents,
      qty,
      modifiers: chosen.map((m) => ({
        localId: m.localId,
        name: m.name,
        priceDeltaCents: m.priceDeltaCents,
      })),
      note: note.trim() || undefined,
    });
    router.back();
  }

  if (loading || !item) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <BackButton label="Menu" onPress={() => router.back()} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.name}>{item.name}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <Text style={styles.basePrice}>{formatPence(item.price_cents)}</Text>
          </View>

          {groups.length > 0 ? (
            <ModifierPicker groups={groups} selection={selection} onChange={setSelection} />
          ) : null}

          <Text style={styles.sectionLabel}>Notes for the barista</Text>
          <TextInput
            style={styles.note}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. extra hot, please"
            placeholderTextColor={colors.inkMuted}
            multiline
            maxLength={140}
          />

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyControls}>
              <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                <Ionicons name="remove" size={20} color={colors.ink} />
              </Pressable>
              <Text style={styles.qtyValue}>{qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => q + 1)}>
                <Ionicons name="add" size={20} color={colors.ink} />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={unsetRequired ? 'Choose your options' : `Add to basket  ·  ${formatPence(totalCents)}`}
            onPress={add}
            disabled={unsetRequired}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  headerRow: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  scroll: { padding: space.lg, paddingBottom: space.xxl, gap: space.lg },
  header: { gap: 4 },
  name: { ...type.title },
  desc: { ...type.body, fontSize: 15 },
  basePrice: { marginTop: space.sm, ...type.bodyStrong, fontSize: 17 },
  sectionLabel: { ...type.overline, marginLeft: space.xs },
  note: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    minHeight: 70,
    color: colors.ink,
    fontSize: 15,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.line,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { ...type.bodyStrong, fontSize: 16 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  qtyBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...subtleShadow,
  },
  qtyValue: { fontSize: 18, fontWeight: '700', color: colors.ink, minWidth: 24, textAlign: 'center' },
  footer: {
    padding: space.lg,
    paddingBottom: space.xl,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});

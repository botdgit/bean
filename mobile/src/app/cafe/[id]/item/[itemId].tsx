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
import { useCatalogItem } from '@/hooks/useCafeMenu';
import { formatPence } from '@/lib/format';
import { useBasket } from '@/state/basket';

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
    const out: { id: string; name: string; priceDeltaCents: number; squareObjectId: string }[] = [];
    for (const g of groups) {
      const ids = selection[g.listId] ?? new Set<string>();
      for (const m of g.modifiers) {
        if (ids.has(m.id)) {
          out.push({
            id: m.id,
            name: m.name,
            priceDeltaCents: m.price_delta_cents,
            squareObjectId: m.square_object_id,
          });
        }
      }
    }
    return out;
  }, [selection, groups]);

  const unitCents = (item?.price_cents ?? 0) + chosen.reduce((s, m) => s + m.priceDeltaCents, 0);
  const totalCents = unitCents * qty;

  // Disable Add if any single-select group is required but unset. For v1 we
  // treat all single-select groups as required (matches Square's default).
  const unsetRequired = groups.some(
    (g) => g.selectionType === 'single' && !(selection[g.listId]?.size ?? 0),
  );

  function add() {
    if (!item || !cafeId) return;
    setCafe(cafeId);
    addLine({
      lineId: uuidv4(),
      catalogItemId: item.id,
      squareCatalogObjectId: item.square_object_id,
      name: item.name,
      unitPriceCents: item.price_cents,
      qty,
      modifiers: chosen.map((m) => ({
        catalogObjectId: m.squareObjectId,
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
        <ActivityIndicator color="#3E2723" style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
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
            placeholderTextColor="#A1887F"
            multiline
            maxLength={140}
          />

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyControls}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => q + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.cta, unsetRequired && styles.ctaDisabled]}
            disabled={unsetRequired}
            onPress={add}
          >
            <Text style={styles.ctaText}>
              {unsetRequired ? 'Choose your options' : `Add to basket · ${formatPence(totalCents)}`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  flex: { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingVertical: 8 },
  back: { color: '#3E2723', fontSize: 16 },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },
  header: { gap: 4 },
  name: { fontSize: 24, fontWeight: '700', color: '#3E2723' },
  desc: { fontSize: 14, color: '#6D4C41' },
  basePrice: { marginTop: 8, fontSize: 16, fontWeight: '600', color: '#3E2723' },
  sectionLabel: {
    fontSize: 13,
    color: '#3E2723',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  note: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    minHeight: 60,
    color: '#3E2723',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { fontSize: 16, color: '#3E2723', fontWeight: '500' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, color: '#3E2723', fontWeight: '600' },
  qtyValue: { fontSize: 18, color: '#3E2723', fontWeight: '600', minWidth: 24, textAlign: 'center' },
  footer: { padding: 16, backgroundColor: '#FFF8F1', borderTopWidth: 1, borderTopColor: '#EFEBE9' },
  cta: { backgroundColor: '#3E2723', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

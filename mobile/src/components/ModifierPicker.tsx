import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPence } from '@/lib/format';
import type { CatalogModifier } from '@/types/database';

export type Selection = Record<string, Set<string>>;

export type ModifierGroup = {
  listId: string;
  // 'single' if any modifier in the group is single-select; that's the convention
  // Square uses (the modifier list dictates the selection type, not the option).
  selectionType: 'single' | 'multiple';
  modifiers: CatalogModifier[];
};

export function groupModifiers(modifiers: CatalogModifier[]): ModifierGroup[] {
  const map = new Map<string, ModifierGroup>();
  for (const m of modifiers) {
    const key = m.modifier_list_id ?? `__loose_${m.id}`;
    // selection_type lives in a CHECK constraint, so codegen sees it as
    // `string`. Coerce here; anything unexpected falls back to single-select.
    const selectionType: 'single' | 'multiple' =
      m.selection_type === 'multiple' ? 'multiple' : 'single';
    const existing = map.get(key);
    if (existing) {
      existing.modifiers.push(m);
    } else {
      map.set(key, { listId: key, selectionType, modifiers: [m] });
    }
  }
  return Array.from(map.values());
}

function labelFor(listId: string): string {
  if (listId === 'milk') return 'Milk';
  if (listId === 'extras') return 'Extras';
  if (listId === 'syrups') return 'Syrups';
  if (listId.startsWith('__loose_')) return 'Options';
  return listId.charAt(0).toUpperCase() + listId.slice(1);
}

export function ModifierPicker({
  groups,
  selection,
  onChange,
}: {
  groups: ModifierGroup[];
  selection: Selection;
  onChange: (next: Selection) => void;
}) {
  function toggle(group: ModifierGroup, modId: string) {
    const current = new Set(selection[group.listId] ?? []);
    if (group.selectionType === 'single') {
      current.clear();
      current.add(modId);
    } else if (current.has(modId)) {
      current.delete(modId);
    } else {
      current.add(modId);
    }
    onChange({ ...selection, [group.listId]: current });
  }

  return (
    <View style={{ gap: 16 }}>
      {groups.map((group) => (
        <View key={group.listId}>
          <Text style={styles.groupLabel}>
            {labelFor(group.listId)}
            <Text style={styles.groupHint}>
              {' · '}
              {group.selectionType === 'single' ? 'choose one' : 'choose any'}
            </Text>
          </Text>
          <View style={styles.card}>
            {group.modifiers.map((m, idx) => {
              const selected = selection[group.listId]?.has(m.id) ?? false;
              return (
                <View key={m.id}>
                  {idx > 0 ? <View style={styles.sep} /> : null}
                  <Pressable
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                    onPress={() => toggle(group, m.id)}
                  >
                    <Text style={styles.optionName}>{m.name}</Text>
                    <View style={styles.optionRight}>
                      {m.price_delta_cents > 0 ? (
                        <Text style={styles.delta}>+{formatPence(m.price_delta_cents)}</Text>
                      ) : null}
                      <View style={[styles.box, selected && styles.boxOn]}>
                        {selected ? <Text style={styles.tick}>✓</Text> : null}
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 13,
    color: '#3E2723',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontWeight: '600',
  },
  groupHint: { color: '#8D6E63', fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  card: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
  option: { padding: 14, flexDirection: 'row', alignItems: 'center' },
  optionPressed: { backgroundColor: '#EFEBE9' },
  optionName: { flex: 1, color: '#3E2723', fontSize: 15 },
  optionRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  delta: { color: '#6D4C41', fontSize: 14 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#A1887F', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: '#3E2723', borderColor: '#3E2723' },
  tick: { color: '#FFF', fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#EFEBE9' },
});

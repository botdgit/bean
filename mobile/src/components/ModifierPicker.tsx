import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPence } from '@/lib/format';
import { colors, radius, space, type } from '@/lib/theme';
import type { CatalogModifier } from '@/types/database';

export type Selection = Record<string, Set<string>>;

export type ModifierGroup = {
  listId: string;
  selectionType: 'single' | 'multiple';
  modifiers: CatalogModifier[];
};

export function groupModifiers(modifiers: CatalogModifier[]): ModifierGroup[] {
  const map = new Map<string, ModifierGroup>();
  for (const m of modifiers) {
    const key = m.modifier_list_id ?? `__loose_${m.id}`;
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
    <View style={{ gap: space.lg }}>
      {groups.map((group) => (
        <View key={group.listId} style={{ gap: space.sm }}>
          <Text style={styles.groupLabel}>
            {labelFor(group.listId)}
            <Text style={styles.groupHint}>
              {'   '}
              {group.selectionType === 'single' ? 'choose one' : 'choose any'}
            </Text>
          </Text>
          <View style={styles.card}>
            {group.modifiers.map((m, idx) => {
              const selected = selection[group.listId]?.has(m.id) ?? false;
              const single = group.selectionType === 'single';
              return (
                <Pressable
                  key={m.id}
                  style={[styles.option, idx > 0 && styles.optionBorder]}
                  onPress={() => toggle(group, m.id)}
                >
                  <Text style={[styles.optionName, selected && styles.optionNameOn]}>{m.name}</Text>
                  <View style={styles.optionRight}>
                    {m.price_delta_cents > 0 ? (
                      <Text style={styles.delta}>+{formatPence(m.price_delta_cents)}</Text>
                    ) : null}
                    <View
                      style={[
                        single ? styles.radio : styles.check,
                        selected && styles.controlOn,
                      ]}
                    >
                      {selected ? (
                        <Ionicons
                          name={single ? 'ellipse' : 'checkmark'}
                          size={single ? 10 : 14}
                          color={single ? colors.accentInk : colors.accentInk}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: { ...type.overline, marginLeft: space.xs },
  groupHint: { color: colors.inkMuted, fontWeight: '500', letterSpacing: 0 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  option: { padding: space.lg, flexDirection: 'row', alignItems: 'center' },
  optionBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  optionName: { flex: 1, ...type.body, color: colors.ink, fontSize: 15 },
  optionNameOn: { fontWeight: '700' },
  optionRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  delta: { ...type.caption, color: colors.inkSoft },
  radio: {
    width: 24, height: 24, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  check: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  controlOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});

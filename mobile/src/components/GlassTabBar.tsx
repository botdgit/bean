import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, floatShadow, radius } from '@/lib/theme';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { on: 'cafe', off: 'cafe-outline', label: 'Shops' },
  wallet: { on: 'wallet', off: 'wallet-outline', label: 'Wallet' },
  orders: { on: 'receipt', off: 'receipt-outline', label: 'Orders' },
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <BlurView intensity={48} tint="light" style={[styles.bar, floatShadow]}>
        <View style={styles.barInner}>
          {state.routes.map((route, index) => {
            const meta = ICONS[route.name];
            if (!meta) return null;
            const focused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.item}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
              >
                <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                  <Ionicons
                    name={focused ? meta.on : meta.off}
                    size={22}
                    color={focused ? colors.accentInk : colors.inkMuted}
                  />
                </View>
                <Text style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  barInner: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 3,
  },
  iconPill: {
    width: 48,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: { backgroundColor: colors.espresso },
  label: { fontSize: 11, fontWeight: '600', color: colors.inkMuted },
  labelActive: { color: colors.ink },
});

import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, softShadow, space, subtleShadow, type } from '@/lib/theme';

export function Card({
  children,
  style,
  padded = true,
  raised = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  raised?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        raised ? softShadow : subtleShadow,
        padded && styles.cardPadded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.overline, style]}>{children}</Text>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'light';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const palette = BUTTON_PALETTE[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: palette.border ? 1 : 0 },
        variant === 'primary' && subtleShadow,
        pressed && !isDisabled && styles.btnPressed,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.btnContent}>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[styles.btnLabel, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const BUTTON_PALETTE: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.espresso, fg: '#FFF' },
  secondary: { bg: colors.surfaceMuted, fg: colors.ink, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.inkSoft },
  dark: { bg: '#000', fg: '#FFF' },
  light: { bg: colors.surface, fg: colors.ink, border: colors.line },
};

export function Field({
  label,
  style,
  ...props
}: { label?: string } & TextInputProps) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={[styles.field, style]}
        {...props}
      />
    </View>
  );
}

export function IconCircle({
  name,
  size = 20,
  color = colors.ink,
  bg = colors.surfaceMuted,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export function BackButton({ label = 'Back', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={16} style={styles.back}>
      <Ionicons name="chevron-back" size={22} color={colors.ink} />
      <Text style={styles.backLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  cardPadded: { padding: space.lg },
  btn: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  btnDisabled: { opacity: 0.4 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  btnLabel: { fontSize: 16, fontWeight: '700' },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.inkSoft, marginLeft: 2 },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.ink,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontSize: 16, color: colors.ink, fontWeight: '600' },
});

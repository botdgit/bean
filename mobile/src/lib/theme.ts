import { Platform, ViewStyle } from 'react-native';

// Warm, minimal coffee palette. Cream canvas, off-white surfaces, espresso ink,
// caramel accent. Soft shadows give the neumorphic/elevated feel.
export const colors = {
  bg: '#F3ECE2',
  bgSunken: '#ECE3D6',
  surface: '#FFFFFF',
  surfaceMuted: '#FBF7F1',
  ink: '#241712',
  inkSoft: '#5B4A3F',
  inkMuted: '#9A8a7B',
  line: '#E7DDD980',
  accent: '#B97A4B',
  accentInk: '#FFFFFF',
  espresso: '#2A1A14',
  success: '#3C7D4E',
  successBg: '#E4F0E5',
  danger: '#C0392B',
  dangerBg: '#F6E2DF',
  beans: '#C8915B',
  glass: 'rgba(255, 250, 244, 0.72)',
  glassBorder: 'rgba(255,255,255,0.55)',
  scrim: 'rgba(36, 23, 18, 0.45)',
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 };

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// Soft, warm, blurred drop shadow — the "raised" neumorphic surface.
export const softShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#6F4A2E',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 6 },
  default: {},
}) as ViewStyle;

export const subtleShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#6F4A2E',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
  default: {},
}) as ViewStyle;

export const floatShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#3A2415',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  android: { elevation: 12 },
  default: {},
}) as ViewStyle;

export const type = {
  display: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -0.5, color: colors.ink },
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.ink },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.inkSoft },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, color: colors.ink },
  caption: { fontSize: 13, fontWeight: '500' as const, color: colors.inkMuted },
  overline: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: colors.inkMuted,
  },
};

// Bottom inset to keep scroll content clear of the floating glass tab bar.
export const TAB_BAR_CLEARANCE = 108;

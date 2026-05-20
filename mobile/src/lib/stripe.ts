import Constants from 'expo-constants';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const merchantIdentifier = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER;

export const stripeConfig = {
  publishableKey,
  merchantIdentifier: merchantIdentifier ?? 'merchant.com.bean.app',
  urlScheme: (Constants.expoConfig?.scheme as string | undefined) ?? 'bean',
};

// Expo Go's app binary doesn't include the Stripe native module, so any
// StripeProvider / initPaymentSheet call will throw. Detect once so screens
// can branch on it.
export const inExpoGo = Constants.appOwnership === 'expo';

// True when the publishable key is missing or still the placeholder from
// .env.example. Useful for skipping Stripe wiring while the project is
// being set up.
export const stripeKeyMissing =
  !publishableKey || publishableKey === 'pk_test_REPLACE_ME';

export const stripeAvailable = !inExpoGo && !stripeKeyMissing;

// Lazily load the native Stripe module. NEVER call this unless `stripeAvailable`
// is true: importing @stripe/stripe-react-native runs
// `TurboModuleRegistry.getEnforcing('StripeSdk')` at module load, which throws
// (and blanks the app) when the native module isn't present — e.g. in Expo Go.
export function loadStripeNative(): typeof import('@stripe/stripe-react-native') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@stripe/stripe-react-native');
}

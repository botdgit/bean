import Constants from 'expo-constants';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const merchantIdentifier = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER;

if (!publishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY. Set it in .env before running the app.',
  );
}

export const stripeConfig = {
  publishableKey,
  merchantIdentifier: merchantIdentifier ?? 'merchant.com.bean.app',
  urlScheme: (Constants.expoConfig?.scheme as string | undefined) ?? 'bean',
};

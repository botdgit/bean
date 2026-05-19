import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { stripeConfig } from '@/lib/stripe';

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey={stripeConfig.publishableKey}
      merchantIdentifier={stripeConfig.merchantIdentifier}
      urlScheme={stripeConfig.urlScheme}
    >
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </StripeProvider>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/hooks/useSession';
import { loadStripeNative, stripeAvailable, stripeConfig } from '@/lib/stripe';

function MaybeStripeProvider({ children }: { children: ReactNode }) {
  // In Expo Go (or without a Stripe key) skip Stripe entirely — importing it
  // would crash the app, so it's loaded lazily here only when available.
  if (!stripeAvailable) return <>{children}</>;
  const { StripeProvider } = loadStripeNative();
  return (
    <StripeProvider
      publishableKey={stripeConfig.publishableKey}
      merchantIdentifier={stripeConfig.merchantIdentifier}
      urlScheme={stripeConfig.urlScheme}
    >
      <>{children}</>
    </StripeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <MaybeStripeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </MaybeStripeProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

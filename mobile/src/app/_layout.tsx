import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/hooks/useSession';
import { stripeAvailable, stripeConfig } from '@/lib/stripe';

function MaybeStripeProvider({ children }: { children: ReactNode }) {
  if (!stripeAvailable) return <>{children}</>;
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

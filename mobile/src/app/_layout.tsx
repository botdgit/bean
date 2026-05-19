import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/hooks/useSession';
import { stripeConfig } from '@/lib/stripe';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StripeProvider
          publishableKey={stripeConfig.publishableKey}
          merchantIdentifier={stripeConfig.merchantIdentifier}
          urlScheme={stripeConfig.urlScheme}
        >
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </StripeProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

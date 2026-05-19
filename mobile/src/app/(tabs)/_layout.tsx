import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';

export default function TabsLayout() {
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  if (sessionLoading || (session && profileLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3E2723" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile?.name) return <Redirect href="/(auth)/profile" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3E2723',
        tabBarInactiveTintColor: '#A1887F',
        tabBarStyle: { backgroundColor: '#FFF8F1', borderTopColor: '#EFEBE9' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shops' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F1',
  },
});

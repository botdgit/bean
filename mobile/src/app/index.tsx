import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/lib/theme';

export default function Gate() {
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  if (sessionLoading || (session && profileLoading)) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>BEAN</Text>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile?.name) return <Redirect href="/(auth)/profile" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 24,
  },
  brand: { fontSize: 48, fontWeight: '800', letterSpacing: 4, color: colors.espresso },
});

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Landing() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>BEAN</Text>
        <Text style={styles.tagline}>
          Order ahead from independent coffee shops.
        </Text>
        <Text style={styles.status}>
          v0.0.1 — Skateboard (M1). Auth, shop list, and checkout coming next.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand: { fontSize: 56, fontWeight: '800', letterSpacing: 4, color: '#3E2723' },
  tagline: { marginTop: 16, fontSize: 16, color: '#5D4037', textAlign: 'center' },
  status: { marginTop: 32, fontSize: 12, color: '#8D6E63', textAlign: 'center' },
});

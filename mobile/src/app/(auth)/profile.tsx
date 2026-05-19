import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

export default function ProfileSetup() {
  const { session } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!session) return;
    setError(null);
    setSubmitting(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        email: email.trim() || null,
      })
      .eq('id', session.user.id);

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.heading}>Welcome to BEAN</Text>
          <Text style={styles.sub}>Tell us a little about you.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#A1887F"
              autoComplete="name"
              autoFocus
            />

            <Text style={[styles.label, styles.labelTop]}>Email (optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#A1887F"
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              We use this for receipts only. No marketing without your say-so.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primary, !name.trim() && styles.primaryDisabled]}
              disabled={submitting || !name.trim()}
              onPress={save}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryText}>Continue</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  heading: { fontSize: 32, fontWeight: '700', color: '#3E2723' },
  sub: { fontSize: 15, color: '#6D4C41', marginTop: 8, marginBottom: 32 },
  form: { gap: 8 },
  label: { fontSize: 13, color: '#6D4C41', marginBottom: 4 },
  labelTop: { marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#D7CCC8',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#3E2723',
  },
  hint: { fontSize: 12, color: '#8D6E63', marginTop: 4 },
  error: { color: '#B71C1C', marginTop: 8, fontSize: 13 },
  primary: {
    marginTop: 24,
    backgroundColor: '#3E2723',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

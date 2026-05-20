import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/lib/theme';

export default function ProfileSetup() {
  const { session } = useSession();
  const meta = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const suggestedName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    '';
  const contact = session?.user.email ?? session?.user.phone ?? '';

  const [name, setName] = useState(suggestedName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!session) return;
    setError(null);
    setSubmitting(true);
    // Email is already on the profile from sign-up; we only capture the name.
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
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
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.heading}>What should we call you?</Text>
          {contact ? (
            <Text style={styles.sub}>Signed in as {contact}</Text>
          ) : null}

          <View style={styles.form}>
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoComplete="name"
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => name.trim() && save()}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label="Continue"
              onPress={save}
              loading={submitting}
              disabled={!name.trim()}
              style={{ marginTop: space.sm }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: { flex: 1, padding: space.xxl, justifyContent: 'center' },
  emoji: { fontSize: 44, marginBottom: space.md },
  heading: { ...type.title },
  sub: { ...type.body, marginTop: space.sm, marginBottom: space.xxl },
  form: { gap: space.md },
  error: { color: colors.danger, fontSize: 13 },
});

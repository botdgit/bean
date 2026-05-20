import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OAuthProvider, signInWithOAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'email' | OAuthProvider>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6 && busy === null;

  async function submitEmail() {
    setError(null);
    setNotice(null);
    setBusy('email');

    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds);

    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    // With email confirmation disabled, signUp returns a session immediately.
    // If a project later requires confirmation, signUp returns no session.
    if (mode === 'signup' && !data.session) {
      setNotice('Check your email to confirm your account, then sign in.');
      setMode('signin');
      return;
    }
    router.replace('/');
  }

  async function social(provider: OAuthProvider) {
    setError(null);
    setNotice(null);
    setBusy(provider);
    const result = await signInWithOAuth(provider);
    setBusy(null);
    if (result.ok) {
      router.replace('/');
      return;
    }
    if (!result.cancelled) setError(result.message);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>BEAN</Text>
          <Text style={styles.tagline}>Order ahead. Earn Beans.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#A1887F"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />

            <Text style={[styles.label, styles.labelTop]}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#A1887F"
              secureTextEntry
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <Pressable
              style={[styles.primary, !canSubmit && styles.disabled]}
              disabled={!canSubmit}
              onPress={submitEmail}
            >
              {busy === 'email' ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setNotice(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.toggle}>
                {mode === 'signin'
                  ? "New here? Create an account"
                  : 'Have an account? Sign in'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            style={[styles.social, styles.apple, busy !== null && styles.disabled]}
            disabled={busy !== null}
            onPress={() => social('apple')}
          >
            {busy === 'apple' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.appleText}> Continue with Apple</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.social, styles.google, busy !== null && styles.disabled]}
            disabled={busy !== null}
            onPress={() => social('google')}
          >
            {busy === 'google' ? (
              <ActivityIndicator color="#3E2723" />
            ) : (
              <Text style={styles.googleText}>Continue with Google</Text>
            )}
          </Pressable>

          <Text style={styles.legal}>
            By continuing you agree to BEAN's Terms and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 48, gap: 4 },
  brand: { fontSize: 48, fontWeight: '800', letterSpacing: 4, color: '#3E2723' },
  tagline: { marginTop: 8, fontSize: 16, color: '#5D4037', marginBottom: 24 },
  form: { gap: 8 },
  label: { fontSize: 13, color: '#6D4C41' },
  labelTop: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#D7CCC8',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#3E2723',
  },
  error: { color: '#B71C1C', fontSize: 13, marginTop: 4 },
  notice: { color: '#2E7D32', fontSize: 13, marginTop: 4 },
  primary: {
    marginTop: 12,
    backgroundColor: '#3E2723',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  toggle: { color: '#6D4C41', textAlign: 'center', marginTop: 14, fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#E0D5CE' },
  dividerText: { color: '#8D6E63', fontSize: 13 },
  social: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  apple: { backgroundColor: '#000' },
  appleText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  google: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D7CCC8' },
  googleText: { color: '#3E2723', fontSize: 16, fontWeight: '600' },
  legal: { color: '#8D6E63', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
});

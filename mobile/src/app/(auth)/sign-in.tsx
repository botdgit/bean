import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field } from '@/components/ui';
import { OAuthProvider, signInWithOAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/lib/theme';

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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>BEAN</Text>
            <Text style={styles.tagline}>Order ahead. Earn Beans.</Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <Button
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={submitEmail}
              loading={busy === 'email'}
              disabled={!canSubmit}
              style={{ marginTop: space.sm }}
            />

            <Pressable
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setNotice(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.toggle}>
                {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Button
            label="Continue with Apple"
            icon="logo-apple"
            variant="dark"
            onPress={() => social('apple')}
            loading={busy === 'apple'}
            disabled={busy !== null}
            style={{ marginBottom: space.md }}
          />
          <Button
            label="Continue with Google"
            icon="logo-google"
            variant="light"
            onPress={() => social('google')}
            loading={busy === 'google'}
            disabled={busy !== null}
          />

          <Text style={styles.legal}>By continuing you agree to BEAN's Terms and Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: space.xxl, paddingTop: space.xxxl },
  brandWrap: { marginBottom: space.xxl },
  brand: { fontSize: 52, fontWeight: '800', letterSpacing: 4, color: colors.espresso },
  tagline: { ...type.body, marginTop: space.sm },
  form: { gap: space.md },
  error: { color: colors.danger, fontSize: 13 },
  notice: { color: colors.success, fontSize: 13 },
  toggle: { color: colors.inkSoft, textAlign: 'center', marginTop: space.md, fontSize: 14, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xl },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  dividerText: { color: colors.inkMuted, fontSize: 13 },
  legal: { color: colors.inkMuted, fontSize: 12, textAlign: 'center', marginTop: space.xl, lineHeight: 17 },
});

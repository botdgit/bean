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

import { supabase } from '@/lib/supabase';

type Step = 'phone' | 'code';

function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  return `+44${digits}`;
}

export default function SignIn() {
  const [step, setStep] = useState<Step>('phone');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phone = normalisePhone(phoneRaw);

  async function sendCode() {
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('code');
  }

  async function verifyCode() {
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code.trim(),
      type: 'sms',
    });
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
          <Text style={styles.brand}>BEAN</Text>
          <Text style={styles.tagline}>Order ahead. Earn Beans.</Text>

          {step === 'phone' ? (
            <View style={styles.form}>
              <Text style={styles.label}>Mobile number</Text>
              <TextInput
                style={styles.input}
                value={phoneRaw}
                onChangeText={setPhoneRaw}
                placeholder="07700 900123"
                placeholderTextColor="#A1887F"
                keyboardType="phone-pad"
                autoComplete="tel"
                autoFocus
              />
              <Text style={styles.hint}>We'll text you a 6-digit code.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                style={[styles.primary, !phoneRaw.length && styles.primaryDisabled]}
                disabled={submitting || phoneRaw.length < 6}
                onPress={sendCode}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>Send code</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Code</Text>
              <TextInput
                style={[styles.input, styles.code]}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor="#A1887F"
                keyboardType="number-pad"
                autoComplete="sms-otp"
                autoFocus
                maxLength={6}
              />
              <Text style={styles.hint}>Sent to {phone}.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                style={[styles.primary, code.length < 6 && styles.primaryDisabled]}
                disabled={submitting || code.length < 6}
                onPress={verifyCode}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>Verify</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep('phone')}>
                <Text style={styles.linkText}>Change number</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F1' },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  brand: { fontSize: 48, fontWeight: '800', letterSpacing: 4, color: '#3E2723' },
  tagline: { marginTop: 8, fontSize: 16, color: '#5D4037', marginBottom: 32 },
  form: { gap: 8 },
  label: { fontSize: 13, color: '#6D4C41', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#D7CCC8',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#3E2723',
  },
  code: { letterSpacing: 8, textAlign: 'center', fontSize: 24 },
  hint: { fontSize: 12, color: '#8D6E63', marginTop: 4 },
  error: { color: '#B71C1C', marginTop: 8, fontSize: 13 },
  primary: {
    marginTop: 16,
    backgroundColor: '#3E2723',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  linkText: {
    color: '#6D4C41',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});

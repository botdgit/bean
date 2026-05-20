import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Ensures the auth popup dismisses cleanly when control returns to the app.
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'apple';

export type OAuthResult =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string };

// Web-based OAuth via the system browser, then exchange the PKCE code for a
// session. `Linking.createURL` produces the right redirect for the current
// runtime (bean:// in a dev/standalone build, an exp:// URL in Expo Go), so
// the same code path works in both — provided the resulting URL is allow-listed
// in the Supabase project's auth redirect URLs.
export async function signInWithOAuth(provider: OAuthProvider): Promise<OAuthResult> {
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { ok: false, cancelled: false, message: error.message };
  if (!data?.url) return { ok: false, cancelled: false, message: 'No sign-in URL returned' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, cancelled: true };
  }
  if (result.type !== 'success') {
    return { ok: false, cancelled: false, message: 'Sign-in did not complete' };
  }

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  if (typeof code !== 'string') {
    const errDesc = queryParams?.error_description;
    return {
      ok: false,
      cancelled: false,
      message: typeof errDesc === 'string' ? errDesc : 'No authorization code returned',
    };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return { ok: false, cancelled: false, message: exchangeError.message };

  return { ok: true };
}

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';
import { supabase } from '@/lib/supabase';

export type OAuthResult = { error: string | null; cancelled?: boolean };

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/**
 * Native Sign in with Apple, which iOS requires of an app offering other social logins. The
 * identity token goes straight to Supabase.
 */
export async function signInWithApple(): Promise<OAuthResult> {
  if (Platform.OS !== 'ios') {
    return { error: 'Sign in with Apple is only available on iOS.' };
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return { error: 'Sign in with Apple is not available on this device.' };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { error: FAILURE_MESSAGE };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    return { error: error ? failureMessage(error) : null };
  } catch (thrown) {
    // Dismissing the sheet is a choice, not a failure — say nothing.
    const code = (thrown as { code?: string }).code;
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
      return { error: null, cancelled: true };
    }

    // Apple reports "unknown" when no Apple ID is signed in on the device, by far the most common
    // cause.
    if (code === 'ERR_REQUEST_UNKNOWN') {
      return { error: 'Sign in to an Apple ID on this device first, then try again.' };
    }

    return { error: failureMessage(thrown) };
  }
}

/**
 * Google uses its own sheet on iOS and the system browser elsewhere. The browser route makes iOS
 * prompt with the Supabase project URL, which no user recognises as ours; the SDK keeps Supabase
 * out of the flow and hands the identity token to signInWithIdToken, as Apple's does.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  if (Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID) {
    return signInWithGoogleNatively(GOOGLE_IOS_CLIENT_ID);
  }
  return signInWithGoogleInBrowser();
}

/**
 * The SDK is imported lazily: its native module only exists in a build that included it, and web
 * and Expo Go must still load this file and fall through to the browser flow.
 */
async function signInWithGoogleNatively(iosClientId: string): Promise<OAuthResult> {
  const { GoogleSignin, isErrorWithCode, statusCodes } =
    await import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    iosClientId,
    // Both client ids sit in Supabase's Google provider, so the token is
    // accepted whichever of the two Google stamps as its audience.
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  try {
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      return { error: null, cancelled: true };
    }

    const { idToken } = response.data;
    if (!idToken) {
      return { error: FAILURE_MESSAGE };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    return { error: error ? failureMessage(error) : null };
  } catch (thrown) {
    // Older SDK versions throw on cancel instead of returning it.
    if (isErrorWithCode(thrown) && thrown.code === statusCodes.SIGN_IN_CANCELLED) {
      return { error: null, cancelled: true };
    }
    return { error: failureMessage(thrown) };
  }
}

/**
 * With PKCE the redirect carries a one-time code, exchanged here for a session; tokens never travel
 * in a URL.
 */
async function signInWithGoogleInBrowser(): Promise<OAuthResult> {
  const redirectTo = Linking.createURL('auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Open it ourselves, so the session comes back inside the app.
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: failureMessage(error) };
  if (!data?.url) return { error: FAILURE_MESSAGE };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: null, cancelled: true };
  }
  if (result.type !== 'success') {
    return { error: FAILURE_MESSAGE };
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) {
    return { error: FAILURE_MESSAGE };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return { error: exchangeError ? failureMessage(exchangeError) : null };
}

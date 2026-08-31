import { supabase } from '@/lib/supabase';

export type AuthResult = { error: string | null };

export type SignUpResult = AuthResult & {
  /** False when the project requires email confirmation before signing in. */
  signedIn: boolean;
};

/** Supabase messages are terse; these read like something a person wrote. */
function readable(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'That email and password do not match.';
  if (lower.includes('already registered')) return 'That email already has an account.';
  if (lower.includes('password should be')) return 'Password must be at least 6 characters.';
  if (lower.includes('unable to validate email')) return 'That email address does not look right.';
  if (lower.includes('network')) return 'Could not reach the server. Check your connection.';
  if (lower.includes('token has expired') || lower.includes('expired'))
    return 'That code has expired. Send a new one.';
  if (lower.includes('invalid token') || lower.includes('otp'))
    return 'That code is not right. Check it and try again.';
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Too many attempts. Wait a minute and try again.';
  return message;
}

/**
 * Six-digit codes, not confirmation links.
 *
 * Supabase sends whichever the email template contains: {{ .Token }} for a
 * code, {{ .ConfirmationURL }} for a link. Nothing here changes based on that —
 * verifyOtp accepts the token either way — so the app and the template only
 * have to agree on which one the user is shown.
 */
export type OtpPurpose = 'signup' | 'recovery';

export async function verifyOtp(
  email: string,
  token: string,
  purpose: OtpPurpose,
): Promise<AuthResult> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: purpose === 'signup' ? 'signup' : 'recovery',
  });
  return { error: error ? readable(error.message) : null };
}

export async function resendOtp(email: string, purpose: OtpPurpose): Promise<AuthResult> {
  if (purpose === 'recovery') {
    // Recovery has no resend endpoint; asking again re-sends the same way.
    return sendPasswordReset(email);
  }
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
  return { error: error ? readable(error.message) : null };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  // Only works while the recovery session from verifyOtp is active.
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? readable(error.message) : null };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: displayName ? { display_name: displayName } : undefined },
  });

  // With email confirmation enabled Supabase creates the user but returns no
  // session. Reporting that is the difference between "check your inbox" and a
  // screen that silently does nothing.
  return {
    error: error ? readable(error.message) : null,
    signedIn: Boolean(data.session),
  };
}

export type SignInResult = AuthResult & {
  /** The account exists but was never verified — send them to the code screen. */
  needsConfirmation: boolean;
};

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  const unconfirmed = Boolean(error && /not confirmed|email.*confirm/i.test(error.message));

  return {
    error: error && !unconfirmed ? readable(error.message) : null,
    needsConfirmation: unconfirmed,
  };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return { error: error ? readable(error.message) : null };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { error: error ? readable(error.message) : null };
}

/**
 * Deletes the signed-in user and everything belonging to them.
 *
 * The client cannot touch auth.users, so this calls a security-definer RPC
 * that deletes exactly one row — whatever auth.uid() resolves to for this
 * session. There is no id to pass and nothing to tamper with.
 *
 * Every table cascades from auth.users, so the data goes with the account.
 * The local session is cleared afterwards regardless: the user it referred to
 * no longer exists, and leaving a dead token in storage would leave the app
 * in a state where every request 401s with no explanation.
 */
export async function deleteAccount(): Promise<AuthResult> {
  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    return { error: readable(error.message) };
  }

  // Trust, then verify. "No error" once meant "deleted" here, and a server
  // fault proved able to say nothing while deleting nothing — so the app
  // announced success over an account that was still alive. The token in hand
  // stays technically valid after a real deletion, but the auth server checks
  // the row itself: a deleted account cannot answer getUser.
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return {
      error:
        'Your account is still there — the deletion did not go through. Try again, and message us if it happens twice.',
    };
  }

  await supabase.auth.signOut();
  return { error: null };
}

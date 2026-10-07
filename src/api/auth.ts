import { forgetDevice } from '@/api/push';
import { forgetKnownStores } from '@/api/known-stores';
import { forgetVoiceAliases } from '@/api/voice-aliases';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { supabase } from '@/lib/supabase';
import { clearVoiceDraft } from '@/lib/voice-draft';

export type AuthResult = { error: string | null };

export type SignUpResult = AuthResult & {
  /** False when the project requires email confirmation before signing in. */
  signedIn: boolean;
};

/**
 * What a refused sign-in says. A wrong password, a taken email or an expired code will not mend on
 * a retry, so these say what to do instead; anything unrecognised gets the one failure line.
 */
function readable(error: { message?: string } | null | undefined): string {
  const lower = (error?.message ?? '').toLowerCase();
  if (lower.includes('invalid login credentials')) return t('api.auth.wrongPassword');
  if (lower.includes('already registered')) return t('api.auth.emailTaken');
  if (lower.includes('password should be')) return t('api.auth.shortPassword');
  if (lower.includes('unable to validate email')) return t('api.auth.badEmail');
  if (lower.includes('token has expired') || lower.includes('expired'))
    return t('api.auth.codeExpired');
  if (lower.includes('invalid token') || lower.includes('otp')) return t('api.auth.codeWrong');
  if (lower.includes('rate limit') || lower.includes('too many')) return t('api.auth.tooMany');
  return failureMessage(error);
}

/**
 * Six-digit codes. verifyOtp accepts the token whichever the email template sends: `{{ .Token }}`
 * or `{{ .ConfirmationURL }}`.
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
  return { error: error ? readable(error) : null };
}

export async function resendOtp(email: string, purpose: OtpPurpose): Promise<AuthResult> {
  if (purpose === 'recovery') {
    // Recovery has no resend endpoint; asking again re-sends the same way.
    return sendPasswordReset(email);
  }
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
  return { error: error ? readable(error) : null };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  // Only works while the recovery session from verifyOtp is active.
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? readable(error) : null };
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

  // With email confirmation on, Supabase creates the user but returns no session; `signedIn` is
  // what lets the screen say "check your inbox".
  return {
    error: error ? readable(error) : null,
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
    error: error && !unconfirmed ? readable(error) : null,
    needsConfirmation: unconfirmed,
  };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return { error: error ? readable(error) : null };
}

/**
 * Signs out, first deleting this device's push row. `device_tokens` is protected by
 * `auth.uid() = user_id`, so once the session is gone the row is unreachable and the scheduler
 * would keep pushing this account's reminders to the phone. A failed tidy-up (simulator token read,
 * offline) is logged and never blocks signing out; the sender drops a stale row once APNs answers
 * Unregistered.
 */
export async function signOut(): Promise<AuthResult> {
  await forgetThisDevice();
  await forgetThisPersonsVoice();

  const { error } = await supabase.auth.signOut();
  return { error: error ? failureMessage(error) : null };
}

/**
 * Best-effort removal of the unsaved voice draft, the learned voice corrections and the stores this
 * person added. Both are keyed by user id, so this runs while the session can still say whose they are.
 */
async function forgetThisPersonsVoice(): Promise<void> {
  try {
    clearVoiceDraft();
  } catch (error) {
    console.warn('Could not clear the voice draft', error);
  }
  try {
    const { data } = await supabase.auth.getSession();
    await forgetVoiceAliases(data.session?.user?.id);
    await forgetKnownStores(data.session?.user?.id);
  } catch (error) {
    console.warn('Could not clear learned voice corrections', error);
  }
}

/** Best-effort removal of this device's push row, while a session still exists. */
async function forgetThisDevice(): Promise<void> {
  try {
    // getSession reads the stored session rather than asking the auth server,
    // so a phone that is offline can still identify whose row to delete.
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;
    await forgetDevice(userId);
  } catch (error) {
    console.warn('Could not unregister this device for push notifications', error);
  }
}

/**
 * Deletes the signed-in user and everything belonging to them.
 *
 * The client cannot touch auth.users, so this calls a security-definer RPC that deletes the row
 * auth.uid() resolves to; there is no id to pass. Every table cascades from auth.users, including
 * this device's `device_tokens` row, so unlike signOut there is no client-side push delete.
 */
export async function deleteAccount(): Promise<AuthResult> {
  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    return { error: failureMessage(error) };
  }

  // Verify rather than trust: a server fault can return no error while deleting nothing, and a
  // deleted account cannot answer getUser.
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return { error: failureText() };
  }

  // The server has nothing left; clear the learned voice corrections while the stored session
  // still names the person.
  await forgetThisPersonsVoice();
  await supabase.auth.signOut();
  return { error: null };
}

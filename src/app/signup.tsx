import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { signUpWithEmail } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { resetTo } from '@/lib/nav';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    if (busy) return;
    setError(null);

    if (!email.trim() || !password) {
      setError(t('auth.signup.missing'));
      return;
    }
    if (password.length < 6) {
      setError(t('api.auth.shortPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDiffer'));
      return;
    }

    setBusy(true);
    const { error: authError, signedIn } = await signUpWithEmail(email, password);
    setBusy(false);

    if (authError) {
      setError(authError);
      return;
    }

    // With confirmation off Supabase signs the user straight in; with it on, a code is emailed.
    if (signedIn) {
      // resetTo: a one-way door — see auth.tsx.
      resetTo('/hello');
      return;
    }
    router.push({ pathname: '/verify-otp', params: { email: email.trim(), purpose: 'signup' } });
  };

  return (
    <Screen title={t('auth.signup.title')} showBack avoidKeyboard>
      <Subtitle className="mt-3">{t('auth.signup.subtitle')}</Subtitle>

      <View className="mt-8 w-full gap-5">
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextField
          label={t('auth.signup.confirm')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          error={error ?? undefined}
        />
      </View>

      <View className="mt-auto w-full gap-2 pt-10">
        <Button
          label={busy ? t('auth.signup.creating') : t('auth.signup.button')}
          onPress={handleCreateAccount}
        />
        <TextLink label={t('auth.haveAccount')} onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}

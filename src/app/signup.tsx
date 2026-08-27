import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { signUpWithEmail } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle, Title } from '@/components/ui/typography';

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
      setError('Enter an email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }

    setBusy(true);
    const { error: authError, signedIn } = await signUpWithEmail(email, password);
    setBusy(false);

    if (authError) {
      setError(authError);
      return;
    }

    // With confirmation off Supabase signs the user straight in; with it on a
    // code is emailed. Handle both rather than assuming one is configured.
    if (signedIn) {
      router.replace('/home');
      return;
    }
    router.push({ pathname: '/verify-otp', params: { email: email.trim(), purpose: 'signup' } });
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-4">Create your account</Title>
      <Subtitle className="mt-3">Use your email and a password you will remember.</Subtitle>

      <View className="mt-8 w-full gap-5">
        <TextField
          label="Email"
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
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextField
          label="Confirm password"
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
        <Button label={busy ? 'Creating…' : 'Create account'} onPress={handleCreateAccount} />
        <TextLink label="I already have an account" onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}

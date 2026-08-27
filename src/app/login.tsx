import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { resendOtp, signInWithEmail } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle, Title } from '@/components/ui/typography';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (busy) return;
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setBusy(true);
    const { error: authError, needsConfirmation } = await signInWithEmail(email, password);

    // An unverified account is not a failed login — it just has a step left.
    // Send a fresh code and carry them to it rather than showing a dead error.
    if (needsConfirmation) {
      await resendOtp(email, 'signup');
      setBusy(false);
      router.push({
        pathname: '/verify-otp',
        params: { email: email.trim(), purpose: 'signup' },
      });
      return;
    }

    setBusy(false);

    if (authError) {
      setError(authError);
      return;
    }
    router.replace('/home');
  };
  const handleForgotPassword = () => router.push('/forgot-password');

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-4">Log in</Title>
      <Subtitle className="mt-3">Welcome back. Pick up where you left off.</Subtitle>

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

        <View className="w-full">
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            error={error ?? undefined}
          />
          <TextLink
            label="Forgot password?"
            variant="subtle"
            onPress={handleForgotPassword}
            className="self-end py-2 pr-1"
          />
        </View>
      </View>

      <View className="mt-auto w-full pt-10">
        <Button label={busy ? 'Signing in…' : 'Log in'} onPress={handleLogin} />
      </View>
    </Screen>
  );
}

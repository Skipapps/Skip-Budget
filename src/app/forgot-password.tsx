import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { sendPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Subtitle, Title } from '@/components/ui/typography';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (busy) return;
    setError(null);

    if (!email.trim()) {
      setError('Enter the email on your account.');
      return;
    }

    setBusy(true);
    const { error: resetError } = await sendPasswordReset(email);
    setBusy(false);

    if (resetError) {
      setError(resetError);
      return;
    }
    router.push({
      pathname: '/verify-otp',
      params: { email: email.trim(), purpose: 'recovery' },
    });
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-4">Forgot password?</Title>
      <Subtitle className="mt-3">
        Enter your email and we will send you a 6-digit verification code.
      </Subtitle>

      <View className="mt-8 w-full">
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          error={error ?? undefined}
        />
      </View>

      <View className="mt-auto w-full pt-10">
        <Button label={busy ? 'Sending…' : 'Continue'} onPress={handleContinue} />
      </View>
    </Screen>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { updatePassword } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Subtitle, Title } from '@/components/ui/typography';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replaces rather than pushes so Back cannot return into a spent reset flow.
  const handleContinue = async () => {
    if (busy) return;
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }

    setBusy(true);
    const { error: updateError } = await updatePassword(password);
    setBusy(false);

    if (updateError) {
      setError(updateError);
      return;
    }
    router.replace('/home');
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-4">Set a new password</Title>
      <Subtitle className="mt-3">Choose a password you have not used before.</Subtitle>

      <View className="mt-8 w-full gap-5">
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextField
          label="Confirm new password"
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

      <View className="mt-auto w-full pt-10">
        <Button label={busy ? 'Saving…' : 'Continue'} onPress={handleContinue} />
      </View>
    </Screen>
  );
}

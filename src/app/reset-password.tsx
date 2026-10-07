import { resetTo } from '@/lib/nav';
import { useState } from 'react';
import { View } from 'react-native';

import { updatePassword } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ends with resetTo so Back cannot return into a spent reset flow.
  const handleContinue = async () => {
    if (busy) return;
    setError(null);

    if (password.length < 6) {
      setError(t('api.auth.shortPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDiffer'));
      return;
    }

    setBusy(true);
    const { error: updateError } = await updatePassword(password);
    setBusy(false);

    if (updateError) {
      setError(updateError);
      return;
    }
    resetTo('/home');
  };

  return (
    <Screen title={t('auth.reset.title')} showBack avoidKeyboard>
      <Subtitle className="mt-3">{t('auth.reset.subtitle')}</Subtitle>

      <View className="mt-8 w-full gap-5">
        <TextField
          label={t('auth.reset.newPassword')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextField
          label={t('auth.reset.confirm')}
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
        <Button
          label={busy ? t('auth.reset.saving') : t('common.continue')}
          onPress={handleContinue}
        />
      </View>
    </Screen>
  );
}

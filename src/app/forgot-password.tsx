import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { sendPasswordReset } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (busy) return;
    setError(null);

    if (!email.trim()) {
      setError(t('auth.forgot.missing'));
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
    <Screen title={t('auth.forgot.title')} showBack avoidKeyboard>
      <Subtitle className="mt-3">{t('auth.forgot.subtitle')}</Subtitle>

      <View className="mt-8 w-full">
        <TextField
          label={t('auth.email')}
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
        <Button
          label={busy ? t('auth.forgot.sending') : t('common.continue')}
          onPress={handleContinue}
        />
      </View>
    </Screen>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { resendOtp, verifyOtp, type OtpPurpose } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Strong, Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { resetTo } from '@/lib/nav';

const CODE_LENGTH = 6;

export default function VerifyOtpScreen() {
  const { email, purpose } = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const mode: OtpPurpose = purpose === 'recovery' ? 'recovery' : 'signup';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (value: string) => {
    if (busy || !email) return;
    setError(null);
    setNotice(null);

    if (value.length !== CODE_LENGTH) {
      setError(t('auth.otp.enterAll', { digits: CODE_LENGTH }));
      return;
    }

    setBusy(true);
    const { error: verifyError } = await verifyOtp(email, value, mode);
    setBusy(false);

    if (verifyError) {
      setError(verifyError);
      return;
    }

    // A verified signup is already signed in; recovery gets a short-lived session only to change
    // the password. Signup is a one-way door (resetTo) so the new account cannot swipe back into
    // the pitch; recovery stays a plain replace.
    if (mode === 'signup') resetTo('/hello');
    else router.replace('/reset-password');
  };

  const handleResend = async () => {
    if (busy || !email) return;
    setError(null);
    setBusy(true);
    const { error: resendError } = await resendOtp(email, mode);
    setBusy(false);
    setNotice(resendError ? null : t('auth.otp.resent'));
    setError(resendError);
  };

  // The address is drawn in bold, so the sentence is cut around it rather than filled.
  const [beforeEmail, afterEmail] = t('auth.otp.sentTo', { digits: CODE_LENGTH }).split('{email}');

  return (
    <Screen title={t('auth.otp.title')} showBack avoidKeyboard>
      <Subtitle className="mt-3">
        {email ? (
          <>
            {beforeEmail}
            <Strong>{email}</Strong>
            {afterEmail}
          </>
        ) : (
          t('auth.otp.sentToYou', { digits: CODE_LENGTH })
        )}
      </Subtitle>

      <View className="mt-10 w-full">
        <OtpInput value={code} onChangeText={setCode} length={CODE_LENGTH} onComplete={submit} />
      </View>

      {error ? (
        <Text
          className="mt-4 w-full text-center font-app text-[13px] text-danger"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      {notice ? (
        <Text
          className="mt-4 w-full text-center font-app text-[13px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {notice}
        </Text>
      ) : null}

      <View className="mt-auto w-full gap-2 pt-10">
        <Button
          label={busy ? t('auth.otp.checking') : t('common.continue')}
          onPress={() => submit(code)}
        />
        <TextLink label={t('auth.otp.resend')} variant="subtle" onPress={handleResend} />
      </View>
    </Screen>
  );
}

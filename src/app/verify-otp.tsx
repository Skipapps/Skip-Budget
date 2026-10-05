import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { resendOtp, verifyOtp, type OtpPurpose } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Strong, Subtitle } from '@/components/ui/typography';
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
      setError(`Enter all ${CODE_LENGTH} digits.`);
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
    setNotice(resendError ? null : 'A new code is on its way.');
    setError(resendError);
  };

  return (
    <Screen title="Enter the code" showBack avoidKeyboard>
      <Subtitle className="mt-3">
        {email ? (
          <>
            We sent a {CODE_LENGTH}-digit code to <Strong>{email}</Strong>.
          </>
        ) : (
          `We sent a ${CODE_LENGTH}-digit code to your email.`
        )}
      </Subtitle>

      <View className="mt-10 w-full">
        <OtpInput value={code} onChangeText={setCode} length={CODE_LENGTH} onComplete={submit} />
      </View>

      {error ? (
        <Text
          className="mt-4 w-full text-center font-poppins text-[13px] text-danger"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      {notice ? (
        <Text
          className="mt-4 w-full text-center font-poppins text-[13px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {notice}
        </Text>
      ) : null}

      <View className="mt-auto w-full gap-2 pt-10">
        <Button label={busy ? 'Checking…' : 'Continue'} onPress={() => submit(code)} />
        <TextLink label="Resend code" variant="subtle" onPress={handleResend} />
      </View>
    </Screen>
  );
}

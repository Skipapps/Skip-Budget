import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { resendOtp, signInWithEmail } from '@/api/auth';
import { resetTo } from '@/lib/nav';
import { SocialSignIn } from '@/components/auth/social-sign-in';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { TEXT_CAP } from '@/theme/text-scale';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (busy) return;
    setError(null);

    if (!email.trim() || !password) {
      setError(t('auth.login.missing'));
      return;
    }

    setBusy(true);
    const { error: authError, needsConfirmation } = await signInWithEmail(email, password);

    // An unverified account is not a failed login: send a fresh code and carry them to it.
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
    resetTo('/setup');
  };
  const handleForgotPassword = () => router.push('/forgot-password');

  // One sentence with the two links inside it, cut at the links so each can be its own element.
  const [beforeTerms, rest = ''] = t('auth.login.agreement').split('{terms}');
  const [betweenLinks] = rest.split('{privacy}');

  return (
    <Screen title={t('auth.login.title')} showBack avoidKeyboard>
      <Subtitle className="mt-3">{t('auth.login.subtitle')}</Subtitle>

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

        <View className="w-full">
          <TextField
            label={t('auth.password')}
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
            label={t('auth.forgot.title')}
            variant="subtle"
            onPress={handleForgotPassword}
            className="self-end py-2 pr-1"
          />
        </View>
      </View>

      <View className="mt-auto w-full pt-10">
        <Button label={busy ? t('auth.signingIn') : t('auth.login.title')} onPress={handleLogin} />

        <View className="my-5 w-full flex-row items-center gap-3">
          <View className="h-px flex-1 bg-line" />
          <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
            {t('auth.login.or')}
          </Text>
          <View className="h-px flex-1 bg-line" />
        </View>

        <SocialSignIn />

        <View className="mt-5 w-full flex-row flex-wrap items-center justify-center">
          <Text
            className="font-app text-[12px] leading-[18px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            {beforeTerms}
          </Text>
          <TextLink
            label={t('auth.login.terms')}
            variant="subtle"
            onPress={() => router.push('/terms')}
          />
          <Text
            className="font-app text-[12px] leading-[18px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            {betweenLinks}
          </Text>
          <TextLink
            label={t('auth.login.privacy')}
            variant="subtle"
            onPress={() => router.push('/privacy')}
          />
        </View>
      </View>
    </Screen>
  );
}

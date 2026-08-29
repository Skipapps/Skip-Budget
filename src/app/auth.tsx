import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { signInWithApple, signInWithGoogle } from '@/api/oauth';
import { AppleIcon } from '@/components/icons/apple-icon';
import { GoogleIcon } from '@/components/icons/google-icon';
import { Button } from '@/components/ui/button';
import { Illustration } from '@/components/ui/illustration';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle, Title } from '@/components/ui/typography';

export default function AuthScreen() {
  const artwork = useArtwork();
  // Auth is wired up after the database work — these are intentionally inert for now.
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    provider: 'google' | 'apple',
    start: () => Promise<{ error: string | null; cancelled?: boolean }>,
  ) => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    const { error: authError, cancelled } = await start();
    setBusy(null);

    // Backing out of the sheet is not an error worth shouting about.
    if (cancelled) return;
    if (authError) {
      setError(authError);
      return;
    }
    router.replace('/home');
  };

  const handleGoogle = () => run('google', signInWithGoogle);
  const handleApple = () => run('apple', signInWithApple);
  const handleEmail = () => router.push('/signup');

  return (
    <Screen showBack>
      <Illustration source={artwork.loginHero} widthRatio={0.78} maxWidth={290} className="pt-2" />

      <Title className="mt-6">Set up your login</Title>
      <Subtitle className="mt-3">
        Keep your data synced across devices and make account recovery easier.
      </Subtitle>

      <View className="mt-auto w-full gap-4 pt-10">
        <Button
          label={busy === 'google' ? 'Opening Google…' : 'Continue with google'}
          variant="outline"
          icon={<GoogleIcon size={22} />}
          onPress={handleGoogle}
        />
        <Button
          label={busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          icon={<AppleIcon size={22} />}
          onPress={handleApple}
        />
        <TextLink label="Continue with Email" onPress={handleEmail} />

        {error ? (
          <Text
            className="w-full text-center font-poppins text-[13px] text-red-600"
            maxFontSizeMultiplier={1.4}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

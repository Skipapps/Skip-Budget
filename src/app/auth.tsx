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
import { Subtitle } from '@/components/ui/typography';
import { resetTo } from '@/lib/nav';

/**
 * Apple and Google sign-in, and the door to email sign-up.
 *
 * Providers return a session but no name (`display_name` is only written on email signup), so they
 * land on `/hello`, which asks for a name only when the profile has none, rather than on `/home`.
 */
export default function AuthScreen() {
  const artwork = useArtwork();
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

    if (cancelled) return;
    if (authError) {
      setError(authError);
      return;
    }
    // resetTo, not replace: signing in is a one-way door, and replace leaves the welcome pages
    // underneath for the edge swipe to walk back into.
    resetTo('/hello');
  };

  const handleGoogle = () => run('google', signInWithGoogle);
  const handleApple = () => run('apple', signInWithApple);
  const handleEmail = () => router.push('/signup');

  return (
    <Screen title="Set up your login" showBack>
      <Illustration source={artwork.loginHero} widthRatio={0.78} maxWidth={290} className="pt-2" />

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
            className="w-full text-center font-app text-[13px] text-danger"
            maxFontSizeMultiplier={1.4}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

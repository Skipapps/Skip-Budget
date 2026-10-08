import { useState } from 'react';
import { Text, View } from 'react-native';

import { signInWithApple, signInWithGoogle, type OAuthResult } from '@/api/oauth';
import { AppleIcon } from '@/components/icons/apple-icon';
import { GoogleIcon } from '@/components/icons/google-icon';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { resetTo } from '@/lib/nav';
import { TEXT_CAP } from '@/theme/text-scale';

type Provider = 'google' | 'apple';

/**
 * Google and Apple sign-in, the same on the sign-up and log-in pages: either one signs in an
 * existing account or makes a new one.
 *
 * Providers return a session but no name (`display_name` is only written on email signup), so they
 * land on `/hello`, which asks for a name only when the profile has none, rather than on `/home`.
 */
export function SocialSignIn() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (provider: Provider, start: () => Promise<OAuthResult>) => {
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

  return (
    <View className="w-full gap-4">
      <Button
        label={busy === 'google' ? t('auth.start.openingGoogle') : t('auth.start.google')}
        variant="outline"
        icon={<GoogleIcon size={22} />}
        onPress={() => run('google', signInWithGoogle)}
      />
      <Button
        label={busy === 'apple' ? t('auth.signingIn') : t('auth.start.apple')}
        icon={<AppleIcon size={22} />}
        onPress={() => run('apple', signInWithApple)}
      />
      {error ? (
        <Text
          className="w-full text-center font-app text-[13px] text-danger"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

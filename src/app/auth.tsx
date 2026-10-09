import { router } from 'expo-router';
import { View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { SocialSignIn } from '@/components/auth/social-sign-in';
import { Illustration } from '@/components/ui/illustration';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';

/** Apple and Google sign-in, and the door to email sign-up. */
export default function AuthScreen() {
  const artwork = useArtwork();

  return (
    <Screen
      title={t('auth.start.title')}
      showBack
      footer={
        <View className="w-full gap-4">
          <SocialSignIn />
          <TextLink label={t('auth.start.email')} onPress={() => router.push('/signup')} />
        </View>
      }
    >
      <View className="w-full flex-1 justify-center py-6">
        <Illustration source={artwork.loginHero} widthRatio={0.78} maxWidth={290} />

        <Subtitle className="mt-3">{t('auth.start.subtitle')}</Subtitle>
      </View>
    </Screen>
  );
}

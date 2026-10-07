import { Redirect, router } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@/providers/session-provider';
import { useArtwork } from '@/theme/artwork';
import { Button } from '@/components/ui/button';
import { FeatureRow } from '@/components/ui/feature-row';
import { Illustration } from '@/components/ui/illustration';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Body, Strong, Title } from '@/components/ui/typography';
import { t } from '@/i18n';

export default function WelcomeScreen() {
  const artwork = useArtwork();
  const { session, ready } = useSession();

  // Someone signed in who lands here (stale deep link, stray back gesture) belongs in the app.
  if (ready && session) return <Redirect href="/home" />;

  // Each sentence has a bold phrase inside it, so it is cut around the phrase rather than filled.
  const [beforePlace, afterPlace] = t('onboarding.welcome.track').split('{place}');
  const [beforeNoLogin, afterNoLogin] = t('onboarding.welcome.privacy').split('{noLogin}');

  return (
    <Screen
      footer={
        <View className="w-full gap-2">
          <Button
            label={t('onboarding.welcome.start')}
            onPress={() => router.push('/what-skip-can-do')}
          />
          <TextLink label={t('auth.haveAccount')} onPress={() => router.push('/login')} />
        </View>
      }
    >
      <Illustration source={artwork.welcomeHero} widthRatio={0.82} maxWidth={300} />

      <Title>{t('onboarding.welcome.title')}</Title>

      <View className="mt-6 w-full gap-5">
        <FeatureRow
          illustration={<Illustration source={artwork.welcomeTrack} widthRatio={1} maxWidth={96} />}
        >
          <Body>
            {beforePlace}
            <Strong>{t('onboarding.welcome.trackPlace')}</Strong>
            {afterPlace}
          </Body>
        </FeatureRow>

        <FeatureRow
          illustration={
            <Illustration source={artwork.welcomePrivacy} widthRatio={1} maxWidth={96} />
          }
        >
          <Body>
            {beforeNoLogin}
            <Strong>{t('onboarding.welcome.noLogin')}</Strong>
            {afterNoLogin}
          </Body>
        </FeatureRow>
      </View>
    </Screen>
  );
}

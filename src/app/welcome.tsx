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

export default function WelcomeScreen() {
  const artwork = useArtwork();
  const { session, ready } = useSession();

  // Someone signed in who lands here (stale deep link, stray back gesture) belongs in the app.
  if (ready && session) return <Redirect href="/home" />;

  return (
    <Screen
      footer={
        <View className="w-full gap-2">
          <Button label="Get started" onPress={() => router.push('/what-skip-can-do')} />
          <TextLink label="I already have an account" onPress={() => router.push('/login')} />
        </View>
      }
    >
      <Illustration source={artwork.welcomeHero} widthRatio={0.82} maxWidth={300} />

      <Title>Your money, your privacy.</Title>

      <View className="mt-6 w-full gap-5">
        <FeatureRow
          illustration={<Illustration source={artwork.welcomeTrack} widthRatio={1} maxWidth={96} />}
        >
          <Body>
            Track spending, bills, subscriptions and card balances —{' '}
            <Strong>all in one place</Strong>.
          </Body>
        </FeatureRow>

        <FeatureRow
          illustration={
            <Illustration source={artwork.welcomePrivacy} widthRatio={1} maxWidth={96} />
          }
        >
          <Body>
            <Strong>No bank login, ever.</Strong> You decide what Skip knows, and nothing else.
          </Body>
        </FeatureRow>
      </View>
    </Screen>
  );
}

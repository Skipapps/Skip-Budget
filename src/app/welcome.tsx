import { router } from 'expo-router';
import { View } from 'react-native';

import PrivacyIllustration from '@/assets/illustrations/welcome-privacy.svg';
import TrackIllustration from '@/assets/illustrations/welcome-track.svg';
import WelcomeHero from '@/assets/illustrations/welcome-hero.svg';
import { Button } from '@/components/ui/button';
import { FeatureRow } from '@/components/ui/feature-row';
import { Illustration } from '@/components/ui/illustration';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Body, Strong, Subtitle, Title } from '@/components/ui/typography';

export default function WelcomeScreen() {
  return (
    <Screen>
      <Illustration source={WelcomeHero} widthRatio={0.82} maxWidth={300} />

      <Title className="mt-4">Your money, your privacy.</Title>
      <Subtitle className="mt-5 text-[18px] text-ink">Track</Subtitle>

      <View className="mt-6 w-full gap-5">
        <FeatureRow illustration={<Illustration source={TrackIllustration} maxWidth={80} />}>
          <Body>
            spending, bills, subscriptions, card balances, and account balances —{' '}
            <Strong>all in one place</Strong>
          </Body>
        </FeatureRow>

        <FeatureRow illustration={<Illustration source={PrivacyIllustration} maxWidth={80} />}>
          <Body>
            <Strong>without connecting your bank</Strong>. Your financial data stays private,
            secure, and in your control.
          </Body>
        </FeatureRow>
      </View>

      <View className="mt-auto w-full gap-2 pt-8">
        <Button label="Get Started" onPress={() => router.push('/message')} />
        <TextLink label="I already have an account" onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}

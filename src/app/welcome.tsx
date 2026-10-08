import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SkipLogo } from '@/components/ui/skip-logo';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { useSession } from '@/providers/session-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/** The soft shape the hero stands in front of, in a 300 × 300 box. */
const BLOB =
  'M152 52 C214 46 276 86 284 150 C292 218 238 268 160 270 C84 272 22 232 18 162 C14 96 86 58 152 52 Z';

export default function WelcomeScreen() {
  const { session, ready } = useSession();

  // Someone signed in who lands here (stale deep link, stray back gesture) belongs in the app.
  if (ready && session) return <Redirect href="/home" />;

  const haveAccount = t('onboarding.welcome.haveAccount');
  const logIn = t('onboarding.welcome.logIn');

  return (
    <Screen
      footer={
        <View className="w-full items-center gap-2">
          <Button
            label={t('onboarding.welcome.start')}
            onPress={() => router.push('/what-skip-can-do')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${haveAccount} ${logIn}`}
            onPress={() => router.push('/login')}
            className="min-h-11 w-full items-center justify-center rounded-full active:bg-ink/5"
          >
            <Text
              className="text-center font-app text-[14px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {haveAccount} <Text className="font-app-semibold text-ink">{logIn}</Text>
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="mt-4 w-full items-center">
        <SkipLogo />
      </View>

      <Hero />

      <Text
        accessibilityRole="header"
        className="mt-6 w-full text-center font-app-bold text-[32px] leading-[38px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {t('onboarding.welcome.title')}
      </Text>
      <Text
        className="mb-4 mt-4 w-full text-center font-app text-[15px] leading-[22px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('onboarding.welcome.subtitle')}
      </Text>
    </Screen>
  );
}

/** The welcome illustration on its soft shape, both following the theme. */
function Hero() {
  const artwork = useArtwork();
  const colors = useColors();
  const Art = artwork.welcomeHero;

  return (
    <View className="mt-8 w-full items-center">
      <View style={{ width: '86%', maxWidth: 320, aspectRatio: 1 }}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 300">
          <Path d={BLOB} fill={colors.ink} fillOpacity={0.05} />
        </Svg>
        <Art width="100%" height="100%" />
      </View>
    </View>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { PRO_FEATURES } from '@/data/pro-features';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Subtitle, Title } from '@/components/ui/typography';
import { PRO_MONTHLY_LABEL, PRO_YEARLY_LABEL } from '@/lib/wall';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

/**
 * What a locked feature says for itself.
 *
 * Never "upgrade to continue". Three concrete benefits in the app's voice, a
 * quiet lock, then the price — so somebody who taps "Not now" leaves having
 * learned what the feature does, and that page earns the next tap too.
 */
export default function ProFeatureScreen() {
  const colors = useColors();
  const artwork = useArtwork();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const feature = PRO_FEATURES[id ?? ''] ?? PRO_FEATURES.unlimited;
  const Art = artwork[feature.artwork];

  return (
    <Screen showBack>
      <View className="mt-4 w-full items-center rounded-[14px] bg-ink/5 py-6">
        <View className="h-[110px] w-[110px]">
          <Art width="100%" height="100%" />
        </View>
      </View>

      <Title align="left" className="mt-6">
        {feature.title}
      </Title>
      <Subtitle className="mt-2 w-full text-left">{feature.tagline}</Subtitle>

      <View className="mt-6 w-full gap-4">
        {feature.benefits.map((benefit) => (
          <View key={benefit.title} className="w-full flex-row gap-3">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-accent">
              <Text
                allowFontScaling={false}
                className="font-poppins-bold text-[12px] text-on-control"
              >
                ✓
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="font-poppins-semibold text-[15px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                {benefit.title}
              </Text>
              <Text
                className="mt-0.5 font-poppins text-[13px] leading-[19px] text-muted"
                maxFontSizeMultiplier={1.4}
              >
                {benefit.detail}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-7 w-full flex-row items-center gap-3 rounded-[14px] border border-line bg-card px-4 py-3.5">
        <Lock size={17} color={colors.muted} strokeWidth={1.9} />
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.3}>
            Part of Skip Pro
          </Text>
          <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            With everything else Pro unlocks
          </Text>
        </View>
      </View>

      <View className="mb-8 mt-auto w-full gap-2 pt-8">
        <Button label={`See Skip Pro — ${PRO_MONTHLY_LABEL}`} onPress={() => router.push('/pro')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Not now"
          onPress={() => router.back()}
          className="min-h-11 w-full items-center justify-center rounded-[10px] active:bg-ink/5"
        >
          <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            or {PRO_YEARLY_LABEL} · Not now
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

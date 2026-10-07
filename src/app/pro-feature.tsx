import { router, useLocalSearchParams } from 'expo-router';
import { Check, Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useProPrices } from '@/api/pro';
import { PRO_FEATURES } from '@/data/pro-features';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Subtitle, Title } from '@/components/ui/typography';
import { t } from '@/i18n';
import { proMonthlyLabel, proYearlyLabel } from '@/lib/wall';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

/** What a locked feature says for itself: its benefits first, the price last. */
export default function ProFeatureScreen() {
  const colors = useColors();
  const artwork = useArtwork();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const prices = useProPrices();

  const feature = PRO_FEATURES[id ?? ''] ?? PRO_FEATURES.unlimited;
  const Art = artwork[feature.artwork];

  // The store's own prices when it has answered; the dollar fallbacks until then.
  const monthlyStore = prices.data?.monthly?.product.priceString;
  const yearlyStore = prices.data?.yearly?.product.priceString;
  const monthly = monthlyStore
    ? t('pro.price.monthly', { price: monthlyStore })
    : proMonthlyLabel();
  const yearly = yearlyStore ? t('pro.price.yearly', { price: yearlyStore }) : proYearlyLabel();

  return (
    <Screen title="Skip Pro" showBack>
      <View className="mt-4 w-full items-center py-4">
        <View className="h-[130px] w-[130px]">
          <Art width="100%" height="100%" />
        </View>
      </View>

      <Title align="left">{feature.title}</Title>
      <Subtitle className="mt-2 w-full text-left">{feature.tagline}</Subtitle>

      <View className="mt-6 w-full gap-4">
        {feature.benefits.map((benefit) => (
          <View key={benefit.title} className="w-full flex-row gap-3">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-accent">
              <Check size={14} color={colors.onControl} strokeWidth={2} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
                {benefit.title}
              </Text>
              <Text
                className="mt-0.5 font-app text-[13px] leading-[19px] text-muted"
                maxFontSizeMultiplier={1.4}
              >
                {benefit.detail}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-6 w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3.5">
        <Lock size={18} color={colors.muted} strokeWidth={1.8} />
        <View className="min-w-0 flex-1">
          <Text className="font-app-medium text-[14px] text-ink" maxFontSizeMultiplier={1.3}>
            {t('pro.feature.partOf')}
          </Text>
          <Text className="mt-0.5 font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            {t('pro.feature.withEverything')}
          </Text>
        </View>
      </View>

      <View className="mb-8 mt-auto w-full gap-2 pt-8">
        <Button label={t('pro.feature.see', { monthly })} onPress={() => router.push('/pro')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.notNow')}
          onPress={() => router.back()}
          className="min-h-11 w-full items-center justify-center rounded-full active:bg-ink/5"
        >
          <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            {t('pro.feature.orYearly', { yearly })}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

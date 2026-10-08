import { router, useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useProPrices } from '@/api/pro';
import { PRO_FEATURES } from '@/data/pro-features';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { proMonthlyLabel } from '@/lib/wall';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * What a locked feature says for itself, one glance: its icon, an example, a heading, one line and
 * three points, with the price last. The comparison and the purchase live on the Pro page.
 */
export default function ProFeatureScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const prices = useProPrices();

  const feature = PRO_FEATURES[id ?? ''] ?? PRO_FEATURES.unlimited;
  const Icon = feature.icon;

  // The store's own price when it has answered; the dollar fallback until then.
  const monthlyStore = prices.data?.monthly?.product.priceString;
  const monthly = monthlyStore
    ? t('pro.price.monthly', { price: monthlyStore })
    : proMonthlyLabel();

  return (
    <Screen
      title="Skip Pro"
      showBack
      footer={
        <View className="w-full items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <Lock size={13} color={colors.muted} strokeWidth={1.8} />
            <Text
              className="font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {t('pro.feature.included')}
            </Text>
          </View>
          <Button label={t('pro.feature.get', { monthly })} onPress={() => router.push('/pro')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.notNow')}
            onPress={() => router.back()}
            className="min-h-11 w-full items-center justify-center rounded-full active:bg-ink/5"
          >
            <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
              {t('common.notNow')}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="w-full flex-1 items-center justify-center py-6">
        <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-accent">
          <Icon size={44} color={colors.onControl} strokeWidth={1.7} />
        </View>

        <View className="mt-6 max-w-full rounded-full border border-line bg-card px-4 py-2.5">
          <Text
            className="text-center font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {feature.example}
          </Text>
        </View>

        <Text
          accessibilityRole="header"
          className="mt-8 text-center font-app-bold text-[28px] leading-9 text-ink"
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {feature.title}
        </Text>
        <Text
          className="mt-2 text-center font-app text-[15px] leading-6 text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {feature.subtitle}
        </Text>

        <View className="mt-9 w-full gap-5 px-2">
          {feature.points.map(({ icon: PointIcon, text }) => (
            <View key={text} className="w-full flex-row items-center gap-4">
              <PointIcon size={22} color={colors.accentInk} strokeWidth={1.7} />
              <Text
                className="min-w-0 flex-1 font-app text-[15px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {text}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Subtitle } from '@/components/ui/typography';
import { t, type MessageKey } from '@/i18n';
import { useArtwork, type ArtworkName } from '@/theme/artwork';
import { useColors } from '@/providers/theme-provider';

type Stop = {
  artwork: ArtworkName;
  title: MessageKey;
  detail: MessageKey;
  href: string;
};

/** The welcome promises, rereadable in the app: one card per thing Skip does, linking to it. */
const STOPS: Stop[] = [
  {
    artwork: 'tileSalary',
    title: 'onboarding.stop.bank.title',
    detail: 'onboarding.tour.bank.detail',
    href: '/salary',
  },
  {
    artwork: 'tileReceipts',
    title: 'onboarding.stop.receipts.title',
    detail: 'onboarding.tour.receipts.detail',
    href: '/receipts',
  },
  {
    artwork: 'tileLoanRepayment',
    title: 'onboarding.stop.loans.title',
    detail: 'onboarding.tour.loans.detail',
    href: '/loan-calculator',
  },
  {
    artwork: 'tileSavings',
    title: 'onboarding.stop.savings.title',
    detail: 'onboarding.tour.savings.detail',
    href: '/savings',
  },
  {
    artwork: 'tileMonthlyBills',
    title: 'onboarding.stop.reminders.title',
    detail: 'onboarding.tour.reminders.detail',
    href: '/reminders',
  },
];

export default function TourScreen() {
  const artwork = useArtwork();
  const colors = useColors();

  return (
    <Screen title={t('onboarding.canDo.title')} showBack>
      <Subtitle className="mt-3 w-full text-left">{t('onboarding.tour.subtitle')}</Subtitle>

      <View className="mb-10 mt-7 w-full gap-3">
        {STOPS.map((stop) => {
          const Art = artwork[stop.artwork];
          const title = t(stop.title);
          const detail = t(stop.detail);
          return (
            <Pressable
              key={stop.href}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${detail}`}
              onPress={() => router.push(stop.href as never)}
              className="w-full flex-row items-center gap-4 rounded-[16px] border border-line bg-card p-4 active:bg-ink/5"
            >
              <View className="h-[64px] w-[64px] shrink-0">
                <Art width="100%" height="100%" />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="font-app-semibold text-[15px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {title}
                </Text>
                <Text
                  className="mt-1 font-app text-[12px] leading-[18px] text-muted"
                  maxFontSizeMultiplier={1.4}
                >
                  {detail}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

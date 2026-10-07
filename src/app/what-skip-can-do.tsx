import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { t, type MessageKey } from '@/i18n';
import { useArtwork, type ArtworkName } from '@/theme/artwork';

/** The tour's cards in a line each. Nothing navigates: there is no account yet. */
const CAN_DO: { artwork: ArtworkName; title: MessageKey; detail: MessageKey }[] = [
  {
    artwork: 'tileSalary',
    title: 'onboarding.stop.bank.title',
    detail: 'onboarding.canDo.bank.detail',
  },
  {
    artwork: 'tileReceipts',
    title: 'onboarding.stop.receipts.title',
    detail: 'onboarding.canDo.receipts.detail',
  },
  {
    artwork: 'tileLoanRepayment',
    title: 'onboarding.stop.loans.title',
    detail: 'onboarding.canDo.loans.detail',
  },
  {
    artwork: 'tileSavings',
    title: 'onboarding.stop.savings.title',
    detail: 'onboarding.canDo.savings.detail',
  },
  {
    artwork: 'tileMonthlyBills',
    title: 'onboarding.stop.reminders.title',
    detail: 'onboarding.canDo.reminders.detail',
  },
];

export default function WhatSkipCanDoScreen() {
  const artwork = useArtwork();

  return (
    <Screen
      title={t('onboarding.canDo.title')}
      showBack
      footer={<Button label={t('common.continue')} onPress={() => router.push('/message')} />}
    >
      <View className="mt-7 w-full gap-3">
        {CAN_DO.map((item) => {
          const Art = artwork[item.artwork];
          return (
            <View
              key={item.title}
              className="w-full flex-row items-center gap-4 rounded-[16px] border border-line bg-card p-4"
            >
              <View className="h-[72px] w-[72px] shrink-0">
                <Art width="100%" height="100%" />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="font-app-semibold text-[15px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {t(item.title)}
                </Text>
                <Text
                  className="mt-1 font-app text-[12px] leading-[18px] text-muted"
                  maxFontSizeMultiplier={1.4}
                >
                  {t(item.detail)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

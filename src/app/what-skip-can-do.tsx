import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useArtwork, type ArtworkName } from '@/theme/artwork';

/** The tour's cards in a line each. Nothing navigates: there is no account yet. */
const CAN_DO: { artwork: ArtworkName; title: string; detail: string }[] = [
  {
    artwork: 'tileSalary',
    title: 'Track without linking a bank',
    detail: 'You tell Skip what happens. Your bank never knows Skip exists.',
  },
  {
    artwork: 'tileReceipts',
    title: 'Scan receipts in a tap',
    detail: 'Read on your phone — the photo never leaves it.',
  },
  {
    artwork: 'tileLoanRepayment',
    title: 'Loans, to the cent',
    detail: 'Daily interest, so the payoff matches your statement.',
  },
  {
    artwork: 'tileSavings',
    title: 'Savings that explain themselves',
    detail: 'Whatever a month leaves over lands here, arithmetic shown.',
  },
  {
    artwork: 'tileMonthlyBills',
    title: 'Reminded before things land',
    detail: 'Bills, renewals and payday, announced ahead.',
  },
];

export default function WhatSkipCanDoScreen() {
  const artwork = useArtwork();

  return (
    <Screen
      title="What Skip can do"
      showBack
      footer={<Button label="Continue" onPress={() => router.push('/message')} />}
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
                  {item.title}
                </Text>
                <Text
                  className="mt-1 font-app text-[12px] leading-[18px] text-muted"
                  maxFontSizeMultiplier={1.4}
                >
                  {item.detail}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

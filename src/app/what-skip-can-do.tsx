import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Title } from '@/components/ui/typography';
import { useArtwork, type ArtworkName } from '@/theme/artwork';

/**
 * The tour's six cards, retold in a line each — the stop between the welcome
 * screen and "Why Skip is different". The tour keeps the full paragraphs and
 * the doors; here the same promises just have to be scannable on the way in,
 * so nothing navigates: there is no account yet, and every door would only
 * lead to sign-in.
 */
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
    artwork: 'tileSplitCalculator',
    title: 'Split bills with friends',
    detail: 'One running total everyone can see.',
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
    <Screen showBack footer={<Button label="Continue" onPress={() => router.push('/message')} />}>
      <Title>What Skip can do</Title>

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
                  className="font-poppins-semibold text-[15px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {item.title}
                </Text>
                <Text
                  className="mt-1 font-poppins text-[12px] leading-[18px] text-muted"
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

import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Subtitle, Title } from '@/components/ui/typography';
import { useArtwork, type ArtworkName } from '@/theme/artwork';
import { useColors } from '@/providers/theme-provider';

type Stop = {
  artwork: ArtworkName;
  title: string;
  detail: string;
  href: string;
};

/**
 * The welcome screen's promises, kept somewhere they can be reread.
 *
 * "Your money, your privacy" scrolls past once, before sign-in, and then that
 * knowledge is gone. This is the same story told from inside the app, one card
 * per thing Skip does, each leading to the thing itself — a tour that ends in
 * doors rather than a Done button.
 */
const STOPS: Stop[] = [
  {
    artwork: 'tileSalary',
    title: 'Track without linking a bank',
    detail:
      'No credentials, no aggregator. You tell Skip what happens and it does the arithmetic — your bank never knows Skip exists.',
    href: '/salary',
  },
  {
    artwork: 'tileReceipts',
    title: 'Scan receipts in a tap',
    detail:
      'Point the camera at a receipt and it is read on your phone and filed — store, date, total. The photo never leaves the device.',
    href: '/receipts',
  },
  {
    artwork: 'tileSplitCalculator',
    title: 'Split bills with friends',
    detail:
      'Groups for the flat or the trip. Everyone sees the same running total, and settling up is written down, not transferred.',
    href: '/splits',
  },
  {
    artwork: 'tileLoanRepayment',
    title: 'Loans, to the cent',
    detail:
      'Interest charged by the day, the way lenders actually bill — so Skip’s payoff matches your statement exactly.',
    href: '/loan-calculator',
  },
  {
    artwork: 'tileSavings',
    title: 'Savings that explain themselves',
    detail:
      'When a month ends, whatever was left of it is added here — with the arithmetic shown, and corrections when Skip missed something.',
    href: '/savings',
  },
  {
    artwork: 'tileMonthlyBills',
    title: 'Reminded before things land',
    detail:
      'Bills, renewals and payday, announced before they happen instead of discovered afterwards.',
    href: '/reminders',
  },
];

export default function TourScreen() {
  const artwork = useArtwork();
  const colors = useColors();

  return (
    <Screen showBack>
      <Title align="left" className="mt-2">
        What Skip can do
      </Title>
      <Subtitle className="mt-3 w-full text-left">
        Six things, each a tap away. No setup order to follow — start wherever your money bothers
        you most.
      </Subtitle>

      <View className="mb-10 mt-7 w-full gap-3">
        {STOPS.map((stop) => {
          const Art = artwork[stop.artwork];
          return (
            <Pressable
              key={stop.title}
              accessibilityRole="button"
              accessibilityLabel={`${stop.title}. ${stop.detail}`}
              onPress={() => router.push(stop.href as never)}
              className="w-full flex-row items-center gap-4 rounded-[14px] border border-line bg-card p-4 active:bg-ink/5"
            >
              <View className="h-[64px] w-[64px] shrink-0 opacity-70">
                <Art width="100%" height="100%" />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="font-poppins-semibold text-[15px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {stop.title}
                </Text>
                <Text
                  className="mt-1 font-poppins text-[12px] leading-[18px] text-muted"
                  maxFontSizeMultiplier={1.4}
                >
                  {stop.detail}
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

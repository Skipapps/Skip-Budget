import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { percent, t } from '@/i18n';
import { useArtwork } from '@/theme/artwork';
import { formatCurrency } from '@/lib/format';
import type { AmortisationRow } from '@/lib/loan';
import { useColors } from '@/providers/theme-provider';

/**
 * A loan term in the language on screen: "5 yrs 3 mo", "5 años 3 meses", "5 ans 3 mois". The
 * English is exactly formatTerm's in src/lib/loan.ts, which stays English for its own tests.
 */
export function loanTermText(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return t('loan.term.months', { count: remainder });
  if (remainder === 0) return t('loan.term.years', { count: years });
  return t('loan.term.yearsMonths', {
    years: t('loan.term.years', { count: years }),
    months: t('loan.term.months', { count: remainder }),
  });
}

/**
 * A rate to exactly the decimals it was given: 7.5 reads "7.5%" and 6.99 "6.99%", never padded or
 * rounded. toFixed at the length of the shortest decimal String() writes gives back those digits.
 */
export function loanRateText(rate: number): string {
  const decimals = (String(rate).split('.')[1] ?? '').length;
  return percent(rate, Math.min(decimals, 20));
}

type ScheduleCardProps = {
  rows: AmortisationRow[];
  onPress: () => void;
};

/**
 * The way into the payment-by-payment breakdown. Leads with the first payment's split because on a
 * normal loan most of it is interest, which explains the whole schedule.
 */
export function ScheduleCard({ rows, onPress }: ScheduleCardProps) {
  const artwork = useArtwork();
  const colors = useColors();
  const first = rows[0];
  if (!first) return null;

  const interestShare = first.payment > 0 ? first.interest / first.payment : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('loan.scheduleCard.a11y', {
        interest: formatCurrency(first.interest),
        principal: formatCurrency(first.principal),
      })}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 rounded-[16px] border border-line px-4 py-4 active:bg-ink/5"
    >
      <View className="h-[72px] w-[72px]">
        <artwork.loanSchedule width="100%" height="100%" />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {t('loan.scheduleCard.title')}
        </Text>
        <Text
          className="mt-1 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={1.3}
        >
          {t('loan.scheduleCard.summary', {
            share: percent(Math.round(interestShare * 100), 0),
            count: rows.length,
          })}
        </Text>

        {/* Same two colours as the summary bar above, so the split reads as the same idea. */}
        <View className="mt-2.5 h-2 w-full flex-row overflow-hidden rounded-full bg-ink/5">
          <View style={{ flex: Math.max(first.principal, 0) }} className="bg-body" />
          <View style={{ flex: Math.max(first.interest, 0) }} className="bg-accent" />
        </View>
      </View>

      <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}

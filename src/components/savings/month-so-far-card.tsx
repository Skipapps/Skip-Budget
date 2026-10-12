import { Text, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import {
  capitalised,
  dayMonthText,
  monthInSentence,
  shortMoney,
} from '@/components/savings/savings-words';
import { StatusPill } from '@/components/savings/status-pill';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

type MonthSoFarCardProps = {
  /** yyyy-mm-dd of any day in the month running now. */
  month: string;
  earned: number;
  spent: number;
  /** Earned less spent so far; below zero until pay lands, which early in a month is usual. */
  leftOver: number;
  /** yyyy-mm-dd the month closes and moves to savings. */
  movesOn: string;
};

/**
 * The month still running: what it would move to savings if it ended today. A figure below zero is
 * written signed, in the ordinary ink: before the first payday it is no cause for alarm. Side by side
 * while the title's widest word fits beside the figure; otherwise the figure goes under the title.
 */
export function MonthSoFarCard({ month, earned, spent, leftOver, movesOn }: MonthSoFarCardProps) {
  const pair = useFitGroup({ mode: 'switch' });
  const side = pair.fits;
  const title = capitalised(t('savings.soFar.title', { month: monthInSentence(month) }));
  const figures = t('savings.earnedSpent', {
    earned: shortMoney(earned),
    spent: shortMoney(spent),
  });
  const moves = t('savings.soFar.movesOn', { date: dayMonthText(movesOn) });
  const amount = formatCurrency(leftOver);

  return (
    <View
      testID="savings-so-far-card"
      accessible
      accessibilityLabel={[title, t('savings.soFar.inProgress'), amount, figures, moves].join('. ')}
      className="mt-4 w-full rounded-[20px] border border-line bg-card px-[20px] py-[18px]"
    >
      <FitGroup
        group={pair}
        className={side ? 'w-full flex-row items-start gap-3' : 'w-full'}
        testID="so-far-title"
      >
        <FitText
          id="so-far-title"
          role="row"
          size={15}
          className="font-app-semibold text-ink"
          slotClassName="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1"
          after={<StatusPill status={{ kind: 'inProgress' }} />}
        >
          {title}
        </FitText>
        <View className={side ? 'shrink-0' : 'mt-1'}>
          <Text
            testID="so-far-amount"
            className="font-app-bold text-[18px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {amount}
          </Text>
        </View>
      </FitGroup>

      <Text
        className="mt-[6px] font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {figures}
      </Text>
      <Text
        className="mt-[4px] font-app text-[13px] text-accent-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {moves}
      </Text>
    </View>
  );
}

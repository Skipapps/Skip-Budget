import { Text, View } from 'react-native';

import { PigIcon } from '@/components/savings/goal-icon';
import { dayMonthText } from '@/components/savings/savings-words';
import { SplitFigure } from '@/components/savings/split-figure';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { toCents } from '@/lib/money';
import { TEXT_CAP } from '@/theme/text-scale';

type ReadyCardProps = {
  /** What can still be sent to goals. */
  amount: number;
  /** The Send button; drawn only while there is something to send. */
  onSend?: () => void;
  /**
   * yyyy-mm-dd of the first wrap-up, for an account that has not closed a month yet: the card says
   * when its first money arrives instead of where it comes from.
   */
  firstWrapUpOn?: string;
};

/** The top of the Savings page: the pig, what is ready to use, and the way to send it to goals. */
export function ReadyCard({ amount, onSend, firstWrapUpOn }: ReadyCardProps) {
  return (
    <View
      testID="savings-ready-card"
      className="mt-3 w-full rounded-[20px] border border-line bg-card p-[20px]"
    >
      <View className="w-full flex-row items-center gap-[16px]">
        <PigIcon size={48} />
        <View className="min-w-0 flex-1">
          <Text
            className="font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('savings.ready.label')}
          </Text>
          <SplitFigure id="ready-to-use" amount={amount} size={36} centsSize={20} />
        </View>
      </View>

      <Text
        className="mt-[14px] font-app text-[14px] leading-5 text-body"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {firstWrapUpOn
          ? t('savings.ready.firstWrapUp', { date: dayMonthText(firstWrapUpOn) })
          : t('savings.ready.caption')}
      </Text>

      {onSend && toCents(amount) > 0 ? (
        <Button className="mt-[16px]" label={t('savings.send')} onPress={onSend} />
      ) : null}
    </View>
  );
}

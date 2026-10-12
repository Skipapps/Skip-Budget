import { Check } from 'lucide-react-native';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { GoalBar } from '@/components/savings/goal-bar';
import { GoalIcon, PigIcon } from '@/components/savings/goal-icon';
import { shortMoney } from '@/components/savings/savings-words';
import { FitGroup, FitRows, FitText, useFitGroup, useGroupFits } from '@/components/ui/fit-group';
import { Title } from '@/components/ui/typography';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

const CARD = 'w-full rounded-[20px] border border-line bg-card';

/** The tick, the heading and how much moved, at the top of the Sent page. */
export function SentHero({ total }: { total: number }) {
  const colors = useColors();
  return (
    <View testID="sent-hero" className="mt-[48px] w-full items-center">
      <View
        className="h-[72px] w-[72px] items-center justify-center rounded-full bg-tint"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Check size={28} color={colors.tintInk} strokeWidth={2.2} />
      </View>
      <Title header className="mt-[24px]">
        {t('savings.sent.title')}
      </Title>
      <Text
        className="mt-[8px] text-center font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('savings.sent.subtitle', { amount: shortMoney(total) })}
      </Text>
    </View>
  );
}

export type SentLine = {
  id: string;
  name: string;
  iconId: string | null;
  /** What this send put in it. */
  added: number;
  /** In it now, this send included. */
  saved: number;
  target: number;
  /** Whole percent of the target, this send included. */
  percent: number;
};

/**
 * Each goal the send reached: what it got, and where it stands now. The added figure stays beside
 * the name while the name's widest word fits there; otherwise every line puts it under the name.
 */
export function SentGoalsCard({ lines }: { lines: readonly SentLine[] }) {
  return (
    <FitRows testID="sent-goals" className={cn(CARD, 'mt-[28px] px-[18px] py-[4px]')}>
      {lines.map((line, index) => (
        <Fragment key={line.id}>
          {index > 0 ? <View className="ml-[54px] h-px bg-line" /> : null}
          <SentGoalLine line={line} />
        </Fragment>
      ))}
    </FitRows>
  );
}

function SentGoalLine({ line }: { line: SentLine }) {
  const stacked = !useGroupFits();
  const added = t('savings.sent.added', { amount: shortMoney(line.added) });
  const now = t('savings.sent.now', {
    saved: shortMoney(line.saved),
    target: shortMoney(line.target),
  });
  return (
    <View
      accessible
      accessibilityLabel={t('savings.sent.lineA11y', {
        name: line.name,
        amount: shortMoney(line.added),
        saved: shortMoney(line.saved),
        target: shortMoney(line.target),
      })}
      testID={`sent-line-${line.id}`}
      className="w-full flex-row items-center gap-[14px] py-[14px]"
    >
      <GoalIcon iconId={line.iconId} size={40} />
      <View className="min-w-0 flex-1">
        <View className={stacked ? 'w-full' : 'w-full flex-row items-baseline gap-3'}>
          <FitText
            id={`${line.id}-sent-name`}
            role="row"
            size={16}
            className="font-app-semibold text-ink"
            slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
          >
            {line.name}
          </FitText>
          <Text
            className="font-app-semibold text-[16px] text-accent-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {added}
          </Text>
        </View>
        <GoalBar percent={line.percent} className="mt-[8px]" testID={`sent-bar-${line.id}`} />
        <Text
          className="mt-[8px] font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {now}
        </Text>
      </View>
    </View>
  );
}

/**
 * What stayed behind in savings after the send. The figure sits at the right while the title's
 * widest word fits beside it, else under the title.
 */
export function StillInSavingsCard({ amount }: { amount: number }) {
  const pair = useFitGroup({ mode: 'switch' });
  const figure = formatCurrency(amount);
  const amountText = (
    <Text className="font-app-bold text-[17px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
      {figure}
    </Text>
  );
  return (
    <View
      testID="still-in-savings"
      accessible
      accessibilityLabel={`${t('savings.sent.still')}, ${figure}. ${t('savings.sent.stillBody')}`}
      className={cn(CARD, 'mt-4 px-[16px] py-[14px]')}
    >
      <FitGroup
        group={pair}
        className="w-full flex-row items-center gap-[14px]"
        testID="still-head"
      >
        <PigIcon size={40} />
        <View className="min-w-0 flex-1">
          <FitText
            id="still-title"
            role="row"
            size={15}
            className="font-app-semibold text-ink"
            slotClassName="w-full"
          >
            {t('savings.sent.still')}
          </FitText>
          <Text
            className="mt-[2px] font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('savings.sent.stillBody')}
          </Text>
          {pair.fits ? null : <View className="mt-[4px]">{amountText}</View>}
        </View>
        {pair.fits ? amountText : null}
      </FitGroup>
    </View>
  );
}

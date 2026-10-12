import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { goalByText, goalPaceText, type GoalPace } from '@/components/savings/goal-cards';
import { GoalBar } from '@/components/savings/goal-bar';
import { GoalIcon } from '@/components/savings/goal-icon';
import { shortMoney, shortMonthYear } from '@/components/savings/savings-words';
import { SectionHeading } from '@/components/ui/typography';
import { percent as percentText, t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useGradientIcons } from '@/theme/gradient-icons';
import { TEXT_CAP } from '@/theme/text-scale';

const CARD = 'w-full rounded-[20px] border border-line bg-card';

/**
 * What a goal asks for, on the calculator and the save page: "About $37 a week", then "$160 a month",
 * to reach the target by its month. Without a month there is no rate to give, so it says to pick one.
 */
export function GoalPlanCard({
  target,
  targetDate,
  weekly,
  monthly,
  alreadyThere,
}: {
  target: number;
  /** yyyy-mm-dd, or null for no date. */
  targetDate: string | null;
  weekly: number | null;
  monthly: number | null;
  /** What is already saved covers the target. */
  alreadyThere: boolean;
}) {
  const { goals: TargetIcon } = useGradientIcons();
  const reach = targetDate
    ? t('goals.calculator.reachBy', {
        target: shortMoney(target),
        date: shortMonthYear(targetDate),
      })
    : t('goals.calculator.reach', { target: shortMoney(target) });
  const rated = !alreadyThere && weekly !== null && monthly !== null;
  const headline = alreadyThere
    ? t('goals.calculator.alreadyThere')
    : rated
      ? t('goals.calculator.weekly', { amount: shortMoney(weekly) })
      : t('goals.calculator.resultNoDate');
  const perMonth = rated ? t('goals.calculator.monthly', { amount: shortMoney(monthly) }) : null;

  return (
    <View
      testID="goal-plan"
      accessible
      accessibilityLabel={[reach, headline, perMonth].filter(Boolean).join('. ')}
      className={cn(CARD, 'mt-3 flex-row items-center gap-[16px] p-[20px]')}
    >
      <View className="h-[48px] w-[48px]">
        <TargetIcon width="100%" height="100%" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {reach}
        </Text>
        <Text
          className="mt-[4px] font-app-bold text-[19px] leading-[25px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.figure}
        >
          {headline}
        </Text>
        {perMonth ? (
          <Text
            className="mt-[2px] font-app text-[14px] text-body"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {perMonth}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** The top of a goal's page: what it is, how far along, and what it still asks. */
export function GoalHeroCard({
  name,
  iconId,
  targetDate,
  saved,
  target,
  percent,
  pace,
  reachedOn,
}: {
  name: string;
  iconId: string;
  targetDate: string | null;
  saved: number;
  target: number;
  percent: number;
  pace: GoalPace | null;
  /** yyyy-mm-dd once the goal is reached; else null. */
  reachedOn: string | null;
}) {
  const by = goalByText(targetDate);
  const percentLabel = percentText(percent, 0);
  const last = reachedOn
    ? t('goals.reached', { amount: shortMoney(saved), date: shortMonthYear(reachedOn) })
    : pace
      ? goalPaceText(pace)
      : null;

  return (
    <View testID="goal-hero" className={cn(CARD, 'mt-3 p-[20px]')}>
      <View className="w-full flex-row items-center gap-[14px]">
        <GoalIcon iconId={iconId} size={52} reached={reachedOn !== null} />
        <View className="min-w-0 flex-1">
          <Text
            accessibilityRole="header"
            className="font-app-bold text-[20px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {name}
          </Text>
          {by ? (
            <Text
              className="mt-[2px] font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {by}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={[
          `${shortMoney(saved)} ${t('goals.of', { target: shortMoney(target) })}`,
          t('goals.detail.percentSaved', { percent: percentLabel }),
          last,
        ]
          .filter(Boolean)
          .join('. ')}
        className="mt-[18px] w-full"
      >
        <Text
          className="font-app-bold text-[22px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.figure}
        >
          {shortMoney(saved)}
          <Text className="font-app text-[15px] text-muted">
            {' '}
            {t('goals.of', { target: shortMoney(target) })}
          </Text>
        </Text>
        <GoalBar percent={percent} className="mt-[10px]" testID="goal-hero-bar" />
        <View className="mt-[10px] w-full flex-row flex-wrap justify-between gap-x-3 gap-y-1">
          <Text
            className="font-app-semibold text-[13px] text-accent-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('goals.detail.percentSaved', { percent: percentLabel })}
          </Text>
          {last ? (
            <Text
              className="shrink font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {last}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** One line of a goal's history: a send, money taken back, or what it started with. */
export type GoalMoveLine = { id: string; text: string };

export function GoalMovesCard({ lines }: { lines: readonly GoalMoveLine[] }) {
  return (
    <View className="w-full">
      <SectionHeading className="mb-3 mt-7 px-1">{t('goals.detail.moves')}</SectionHeading>
      <View testID="goal-moves" className={cn(CARD, 'px-[18px]')}>
        {lines.length === 0 ? (
          <Text
            className="py-[16px] font-app text-[14px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('goals.detail.noMoves')}
          </Text>
        ) : (
          lines.map((line, index) => (
            <Fragment key={line.id}>
              {index > 0 ? <View className="h-px w-full bg-line" /> : null}
              <Text
                testID={`goal-move-${line.id}`}
                className="py-[14px] font-app text-[14px] text-body"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {line.text}
              </Text>
            </Fragment>
          ))
        )}
      </View>
    </View>
  );
}

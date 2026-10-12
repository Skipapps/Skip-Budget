import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GoalBar } from '@/components/savings/goal-bar';
import { GoalIcon } from '@/components/savings/goal-icon';
import { capitalised, shortMoney, shortMonthYear } from '@/components/savings/savings-words';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { percent as percentText, t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { useGradientIcons } from '@/theme/gradient-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** What a goal still asks for: a weekly amount to its date, or how far short it is once the date has passed. */
export type GoalPace = { kind: 'weekly'; amount: number } | { kind: 'passed'; toGo: number };

export function goalPaceText(pace: GoalPace): string {
  return pace.kind === 'weekly'
    ? t('goals.weekly', { amount: shortMoney(pace.amount) })
    : t('goals.passed', { amount: shortMoney(pace.toGo) });
}

/** "by Mar 2027", or nothing for a goal without a date. */
export function goalByText(targetDate: string | null): string | null {
  return targetDate ? t('goals.by', { date: shortMonthYear(targetDate) }) : null;
}

const CARD = 'w-full rounded-[20px] border border-line bg-card';

/** What has been saved toward every goal, of what they all ask for, and how many are done. */
export function GoalsSummaryCard({
  saved,
  target,
  active,
  done,
}: {
  saved: number;
  target: number;
  active: number;
  done: number;
}) {
  const { goals: TargetIcon } = useGradientIcons();
  const figure = useFitGroup({ mode: 'shrink' });
  const [ofWidth, setOfWidth] = useState(0);
  const of = t('goals.of', { target: shortMoney(target) });
  const counts = [
    t('goals.summary.active', { count: active }),
    t('goals.summary.done', { count: done }),
  ].join(' · ');

  return (
    <View
      testID="goals-summary"
      accessible
      accessibilityLabel={t('goals.summary.a11y', {
        saved: formatCurrency(saved),
        target: shortMoney(target),
        counts,
      })}
      className={cn(CARD, 'mt-3 p-[20px]')}
    >
      <View className="w-full flex-row items-center gap-[16px]">
        <View className="h-[48px] w-[48px]">
          <TargetIcon width="100%" height="100%" />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('goals.summary.saved')}
          </Text>
          <FitGroup group={figure} className="w-full" testID="fit-figure-goals-saved">
            <FitText
              id="goals-saved"
              role="figure"
              size={36}
              className="font-app-bold text-ink"
              slotClassName="w-full flex-row items-baseline"
              reserve={ofWidth}
              scrollWhenTooWide
              after={
                <Text
                  onLayout={(event) => setOfWidth(Math.ceil(event.nativeEvent.layout.width))}
                  className="shrink-0 pl-[8px] font-app text-[15px] text-muted"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {of}
                </Text>
              }
            >
              {formatCurrency(saved)}
            </FitText>
          </FitGroup>
        </View>
      </View>
      <View className="mt-[16px] h-px w-full bg-line" />
      <Text
        className="mt-[14px] font-app text-[13px] text-body"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {counts}
      </Text>
    </View>
  );
}

type GoalCardProps = {
  id: string;
  name: string;
  iconId: string | null;
  /** yyyy-mm-dd, or null for a goal with no date. */
  targetDate: string | null;
  saved: number;
  target: number;
  /** Whole percent, never 100 while short. */
  percent: number;
  pace: GoalPace | null;
  onPress: () => void;
};

/**
 * An active goal: its icon, name and date, how far along it is, and what it asks for a week. The
 * percent sits beside the name while the name's widest word fits there, else under it.
 */
export function GoalCard({
  id,
  name,
  iconId,
  targetDate,
  saved,
  target,
  percent,
  pace,
  onPress,
}: GoalCardProps) {
  const header = useFitGroup({ mode: 'switch' });
  const by = goalByText(targetDate);
  const percentLabel = percentText(percent, 0);
  const paceLine = pace ? goalPaceText(pace) : null;
  const spoken = [
    t('goals.card.a11y', {
      name,
      percent: percentLabel,
      saved: shortMoney(saved),
      target: shortMoney(target),
    }),
    by ? `${capitalised(by)}.` : null,
    paceLine ? `${paceLine}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const percentFigure = (
    <Text
      testID={`goal-percent-${id}`}
      className="font-app-semibold text-[16px] text-accent-ink"
      maxFontSizeMultiplier={TEXT_CAP.row}
    >
      {percentLabel}
    </Text>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={t('goals.card.openHint')}
      onPress={withTap(onPress)}
      testID={`goal-card-${id}`}
      className={cn(CARD, 'p-[18px] active:bg-ink/5')}
    >
      <FitGroup
        group={header}
        className="w-full flex-row items-center gap-[12px]"
        testID={`goal-head-${id}`}
      >
        <GoalIcon iconId={iconId} size={40} />
        <View className="min-w-0 flex-1">
          <FitText
            id={`${id}-name`}
            role="row"
            size={17}
            className="font-app-semibold text-ink"
            slotClassName="w-full"
          >
            {name}
          </FitText>
          {by ? (
            <Text
              className="mt-[2px] font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {by}
            </Text>
          ) : null}
          {header.fits ? null : <View className="mt-[4px]">{percentFigure}</View>}
        </View>
        {header.fits ? percentFigure : null}
      </FitGroup>

      <Text
        className="mt-[14px] font-app-bold text-[16px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {shortMoney(saved)}
        <Text className="font-app text-[14px] text-muted">
          {' '}
          {t('goals.of', { target: shortMoney(target) })}
        </Text>
      </Text>
      <GoalBar percent={percent} className="mt-[8px]" testID={`goal-bar-${id}`} />
      {paceLine ? (
        <Text
          className="mt-[8px] font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {paceLine}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A goal that has been reached: the medal, its name in the muted ink, what it holds and when. */
export function CompletedGoalCard({
  id,
  name,
  saved,
  reachedOn,
  onPress,
}: {
  id: string;
  name: string;
  saved: number;
  /** yyyy-mm-dd of the send that reached it. */
  reachedOn: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const line = t('goals.reached', { amount: shortMoney(saved), date: shortMonthYear(reachedOn) });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${t('goals.card.done')}. ${line}`}
      accessibilityHint={t('goals.card.openHint')}
      onPress={withTap(onPress)}
      testID={`goal-done-${id}`}
      className="w-full flex-row items-center gap-[12px] rounded-[20px] border border-line bg-card/60 px-[18px] py-[14px] active:bg-ink/5"
    >
      <GoalIcon iconId={null} size={40} reached />
      <View className="min-w-0 flex-1">
        <Text
          className="font-app-semibold text-[16px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {name}
        </Text>
        <Text
          className="mt-[2px] font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {line}
        </Text>
      </View>
      <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-tint">
        <Check size={16} color={colors.tintInk} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

/**
 * No goals yet: what a goal is for. On the Goals page it sits above the New goal button; on the
 * Send page it says the money can wait in savings until there is one.
 */
export function GoalInviteCard({ on }: { on: 'goals' | 'send' }) {
  const { goals: TargetIcon } = useGradientIcons();
  const [title, body] =
    on === 'goals'
      ? [t('goals.empty.title'), t('goals.empty.body')]
      : [t('savings.sendPage.noGoals'), t('savings.sendPage.noGoalsBody')];
  return (
    <View
      testID={`goal-invite-${on}`}
      className={cn(CARD, 'mt-3 items-center px-[20px] py-[24px]')}
    >
      <View
        className="h-[56px] w-[56px]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <TargetIcon width="100%" height="100%" />
      </View>
      <Text
        accessibilityRole="header"
        className="mt-3 text-center font-app-semibold text-[17px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {title}
      </Text>
      <Text
        className="mt-2 text-center font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {body}
      </Text>
    </View>
  );
}

/** "+ New goal": a quiet outline under the list, as drawn; the header "+" does the same. */
export function NewGoalButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const label = t('goals.new');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={withTap(onPress)}
      testID="new-goal"
      className="mb-4 mt-4 min-h-[52px] w-full flex-row items-center justify-center gap-2 rounded-full border border-line px-5 py-3 active:bg-ink/5"
    >
      <Plus size={18} color={colors.accentInk} strokeWidth={2} />
      <Text
        className="shrink text-center font-app-medium text-[15px] text-accent-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {label}
      </Text>
    </Pressable>
  );
}

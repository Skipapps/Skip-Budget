import { Check, ChevronDown, ChevronRight } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shortDay, spokenDay } from '@/components/habits/day-row';
import { progressText, SpendBar } from '@/components/habits/habit-card';
import type { PlanDetailRow } from '@/components/plans/detail-parts';
import {
  FitGroup,
  FitRows,
  FitText,
  useFitGroup,
  useGroupFits,
  type FitGroupHandle,
} from '@/components/ui/fit-group';
import { habitColor, type HabitColor } from '@/data/habit-colors';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import {
  formatWeekRange,
  shiftWeek,
  weekStartOf,
  type HabitHistoryDay,
  type HabitWeek,
} from '@/lib/habit-week';
import { withTap } from '@/lib/press';
import { useColors, useMoneyColor, useTheme } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

function weekLabel(weekStart: string, today: string): string | null {
  const thisWeek = weekStartOf(today);
  if (weekStart === thisWeek) return t('habits.week.this');
  if (weekStart === shiftWeek(thisWeek, -1)) return t('habits.week.last');
  return null;
}

type HabitWeekCardProps = {
  week: HabitWeek;
  color: HabitColor;
  today: string;
  open: boolean;
  onToggle: (weekStart: string) => void;
  onOpenReceipt: (receiptId: string) => void;
};

/**
 * One week of a habit's history: its figures, then, once opened, its days newest first. The whole
 * top of the card is the one button that opens and closes it. Memoised, so opening one week of a
 * long history does not draw every other week again.
 */
export const HabitWeekCard = memo(function HabitWeekCard({
  week,
  color,
  today,
  open,
  onToggle,
  onOpenReceipt,
}: HabitWeekCardProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const moneyColor = useMoneyColor();

  const label = weekLabel(week.weekStart, today);
  const range = formatWeekRange(week.weekStart, today);
  const progress = progressText(week.progress);
  // Before the habit began the week tracks no day, so it has no limit to measure against.
  const startsText =
    week.progress.kind === 'notStarted'
      ? t('habits.card.startsOn', { date: shortDay(week.progress.startsOn) })
      : null;
  const spent = formatCurrency(week.spent);
  const saved = formatCurrency(week.saved);
  const limit = formatCurrency(week.limit);
  const when = label ? t('habits.week.spoken', { label, range }) : range;
  const spoken =
    startsText !== null
      ? t('habits.detail.week.spokenStarts', { when, spent, saved, starts: startsText })
      : progress
        ? t('habits.detail.week.spoken', { when, spent, saved, limit, progress })
        : t('habits.detail.week.spokenNoProgress', { when, spent, saved, limit });

  return (
    <View
      testID={`habit-week-${week.weekStart}`}
      className="mt-[12px] w-full rounded-[20px] border border-line bg-card"
      style={scheme === 'light' ? shadows.card : null}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint={t(open ? 'habits.detail.week.hide' : 'habits.detail.week.show')}
        accessibilityState={{ expanded: open }}
        onPress={withTap(() => onToggle(week.weekStart))}
        className="w-full py-[16px] pl-[18px] pr-[16px] active:opacity-60"
      >
        <View className="w-full flex-row items-center gap-[10px]">
          <View className="min-w-0 flex-1">
            {label ? (
              <Text
                className="font-app text-[12px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.control}
              >
                {label}
              </Text>
            ) : null}
            <Text
              className="mt-[1px] font-app-semibold text-[16px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {range}
            </Text>
          </View>
          <View
            className="h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-ink/[0.04]"
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          >
            <ChevronDown size={18} color={colors.ink} strokeWidth={2} />
          </View>
        </View>

        <WeekTiles
          id={week.weekStart}
          spent={spent}
          saved={saved}
          savedColor={moneyColor(week.saved)}
        />

        {startsText !== null ? (
          <Text
            className="mt-[12px] font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {startsText}
          </Text>
        ) : (
          <>
            <SpendBar
              spent={week.spent}
              limit={week.limit}
              thickness={6}
              className="mt-[12px]"
              testID={`habit-week-bar-${week.weekStart}`}
            />
            <View className="mt-[8px] w-full flex-row flex-wrap justify-between gap-x-[12px] gap-y-[2px]">
              <Text
                className="shrink font-app text-[12px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {t('habits.card.limit', { limit })}
              </Text>
              {progress ? (
                <Text
                  className="shrink font-app text-[12px] text-muted"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {progress}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </Pressable>

      {open && week.days.length > 0 ? (
        <FitRows
          className="w-full border-t border-line"
          testID={`habit-week-days-${week.weekStart}`}
        >
          {week.days.map((day, index) => (
            <DayLine
              key={day.day}
              day={day}
              color={color}
              today={today}
              divider={index > 0}
              onOpenReceipt={onOpenReceipt}
            />
          ))}
        </FitRows>
      ) : null}
    </View>
  );
});

/** Spent and Saved side by side while both fit at one size; stacked otherwise. */
function WeekTiles({
  id,
  spent,
  saved,
  savedColor,
}: {
  id: string;
  spent: string;
  saved: string;
  savedColor: string;
}) {
  const labels = useFitGroup({ mode: 'shrink' });
  const figures = useFitGroup({ mode: 'shrink' });
  const stacked = !labels.fits || !figures.fits;

  return (
    <FitGroup group={labels} className="mt-[12px] w-full" testID={`habit-week-labels-${id}`}>
      <FitGroup
        group={figures}
        className={stacked ? 'w-full gap-[10px]' : 'w-full flex-row gap-[10px]'}
        testID={`habit-week-figures-${id}`}
      >
        <WeekTile
          id="spent"
          label={t('habits.detail.week.spent')}
          amount={spent}
          labels={labels}
          figures={figures}
          stacked={stacked}
        />
        <WeekTile
          id="saved"
          label={t('habits.detail.week.saved')}
          amount={saved}
          color={savedColor}
          labels={labels}
          figures={figures}
          stacked={stacked}
        />
      </FitGroup>
    </FitGroup>
  );
}

function WeekTile({
  id,
  label,
  amount,
  color,
  labels,
  figures,
  stacked,
}: {
  id: string;
  label: string;
  amount: string;
  color?: string;
  labels: FitGroupHandle;
  figures: FitGroupHandle;
  stacked: boolean;
}) {
  return (
    <View
      className={cn(
        'rounded-[14px] bg-ink/[0.04] px-[12px] py-[10px]',
        stacked ? 'w-full' : 'min-w-0 flex-1',
      )}
    >
      <FitText
        group={labels}
        id={`${id}-label`}
        role="control"
        size={12}
        className="font-app text-muted"
        slotClassName="w-full"
      >
        {label}
      </FitText>
      <FitText
        group={figures}
        id={`${id}-figure`}
        role="figure"
        size={18}
        className="font-app-bold text-ink"
        style={color ? { color } : undefined}
        slotClassName="mt-[2px] w-full"
      >
        {amount}
      </FitText>
    </View>
  );
}

/**
 * A day in an opened week. Side by side, the amount keeps its own width and the date wraps in the
 * rest; once a word of a date cannot fit, every day in the week puts its amount under its words.
 */
function DayLine({
  day,
  color,
  today,
  divider,
  onOpenReceipt,
}: {
  day: HabitHistoryDay;
  color: HabitColor;
  today: string;
  divider: boolean;
  onOpenReceipt: (receiptId: string) => void;
}) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  const stacked = !useGroupFits();
  const { fill } = habitColor(color);

  const date = shortDay(day.day);
  const spokenDate = spokenDay(day.day);
  const amountText = formatCurrency(day.amount);

  const status =
    day.kind === 'bought'
      ? t(day.day === today ? 'habits.detail.day.boughtToday' : 'habits.detail.day.bought')
      : day.kind === 'skipped'
        ? t('habits.detail.day.skipped')
        : t('habits.detail.day.today');

  const markStyle =
    day.kind === 'bought'
      ? { backgroundColor: fill, borderWidth: 1.5, borderColor: fill }
      : day.kind === 'today'
        ? { borderWidth: 2, borderColor: fill }
        : { borderWidth: 1.5, borderColor: colors.line };

  const amount =
    day.kind === 'bought' ? (
      <FitText
        id={`${day.day}-amount`}
        hug
        role="row"
        size={15}
        className="font-app-semibold text-ink"
        slotClassName={stacked ? 'mt-[2px]' : 'shrink-0'}
      >
        {amountText}
      </FitText>
    ) : day.kind === 'skipped' ? (
      <View className={stacked ? 'mt-[2px] items-start' : 'shrink-0 items-end'}>
        <FitText
          id={`${day.day}-amount`}
          hug
          role="row"
          size={15}
          className="font-app-semibold"
          style={{ color: moneyColor(day.amount) }}
        >
          {t('habits.detail.day.plus', { amount: amountText })}
        </FitText>
        <Text
          className="font-app-medium text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('habits.detail.day.saved')}
        </Text>
      </View>
    ) : (
      <Text
        className={cn(
          'font-app-semibold text-[15px] text-muted',
          stacked ? 'mt-[2px]' : 'shrink-0',
        )}
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        –
      </Text>
    );

  const content = (
    <>
      <View
        style={[{ width: 28, height: 28 }, markStyle]}
        className={cn(
          'shrink-0 items-center justify-center rounded-full',
          day.kind !== 'bought' && 'bg-ink/[0.04]',
        )}
      >
        {day.kind === 'bought' ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
      <View className="min-w-0 flex-1 items-start">
        <FitText
          id={`${day.day}-date`}
          role="row"
          size={15}
          className="font-app-semibold text-ink"
          slotClassName="w-full"
        >
          {date}
        </FitText>
        <Text
          className="mt-[1px] font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {status}
        </Text>
        {stacked ? amount : null}
      </View>
      {stacked ? null : amount}
      {day.kind === 'bought' ? (
        <ChevronRight size={16} color={colors.muted} strokeWidth={2} />
      ) : null}
    </>
  );

  const className = cn(
    'w-full flex-row items-center gap-[12px] py-[12px] pl-[18px] pr-[16px]',
    divider && 'border-t border-line',
  );
  const testID = `habit-day-${day.day}`;
  const receiptId = day.receiptId;

  if (day.kind === 'bought' && receiptId) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={t('habits.day.bought', { day: spokenDate, amount: amountText })}
        accessibilityHint={t('habits.detail.day.opensReceipt')}
        onPress={withTap(() => onOpenReceipt(receiptId))}
        className={cn(className, 'active:opacity-60')}
      >
        {content}
      </Pressable>
    );
  }

  const spoken =
    day.kind === 'skipped'
      ? t('habits.detail.day.skippedSpoken', { day: spokenDate, amount: amountText })
      : day.kind === 'today'
        ? t('habits.day.today', { day: spokenDate })
        : t('habits.day.bought', { day: spokenDate, amount: amountText });

  return (
    <View testID={testID} accessible accessibilityLabel={spoken} className={className}>
      {content}
    </View>
  );
}

/** Facts about the habit, a label and its value per row. */
export function HabitAboutCard({ rows }: { rows: PlanDetailRow[] }) {
  const { scheme } = useTheme();
  return (
    <View
      className="mt-[12px] w-full rounded-[20px] border border-line bg-card"
      style={scheme === 'light' ? shadows.card : null}
    >
      <FitRows className="w-full" testID="habit-about">
        {rows.map((row, index) => (
          <AboutRow key={row.label} id={`about-${index}`} row={row} divider={index > 0} />
        ))}
      </FitRows>
    </View>
  );
}

/** Once a word of any label or value cannot sit beside the other, every row stacks. */
function AboutRow({ id, row, divider }: { id: string; row: PlanDetailRow; divider: boolean }) {
  const stacked = !useGroupFits();
  return (
    <View
      accessible
      accessibilityLabel={`${row.label}, ${row.value}`}
      className={cn(
        'w-full px-[18px] py-[14px]',
        divider && 'border-t border-line',
        stacked ? 'items-start' : 'flex-row items-start justify-between gap-[16px]',
      )}
    >
      <FitText
        id={`${id}-label`}
        role="row"
        size={15}
        className="font-app text-muted"
        slotClassName={stacked ? 'w-full' : 'shrink'}
      >
        {row.label}
      </FitText>
      <FitText
        id={`${id}-value`}
        role="row"
        size={15}
        className={cn('font-app-semibold text-ink', !stacked && 'text-right')}
        slotClassName={stacked ? 'mt-[2px] w-full' : 'min-w-0 flex-1'}
      >
        {row.value}
      </FitText>
    </View>
  );
}

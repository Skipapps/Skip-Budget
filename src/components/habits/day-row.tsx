import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { habitColor, type HabitColor } from '@/data/habit-colors';
import { t } from '@/i18n';
import { monthLong, weekdayInitials, weekdayLong } from '@/i18n/calendar';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import {
  dayState,
  weekDays,
  type DayState,
  type HabitMaths,
  type HabitTap,
} from '@/lib/habit-week';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

const CIRCLE = 34;

/** weekdayInitials() starts on Sunday; the habit weeks start on Monday. */
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

const asDate = (iso: string) => new Date(`${iso}T00:00:00`);

/** "Monday, October 5", as VoiceOver reads a day. */
export function spokenDay(iso: string): string {
  const date = asDate(iso);
  return t('habits.day.date', {
    weekday: weekdayLong(date.getDay()),
    month: monthLong(date.getMonth()),
    day: date.getDate(),
  });
}

type DayRowProps = {
  habit: HabitMaths & { color: HabitColor; name: string };
  /** Any day of the week shown. */
  weekStart: string;
  /** This habit's receipts by day. */
  byDay: ReadonlyMap<string, HabitTap>;
  today: string;
  /** Off: drawn only, with nothing to press or read (the card speaks for itself). */
  interactive: boolean;
  busyDays?: ReadonlySet<string>;
  /**
   * The first day the plan shows (a free account's 90-day floor). Days before it are drawn like
   * days before the start and do nothing, so no receipt the list hides is filed or removed here.
   */
  floor?: string;
  onTapDay?: (day: string) => void;
  onUntapDay?: (tap: HabitTap) => void;
  className?: string;
};

/**
 * A habit's week, Monday to Sunday, one column per day across the full width. Each column, initial
 * and circle together, is its own button, so a thumb never has to find a 34pt circle.
 */
export function DayRow({
  habit,
  weekStart,
  byDay,
  today,
  interactive,
  busyDays,
  floor,
  onTapDay,
  onUntapDay,
  className,
}: DayRowProps) {
  const initials = weekdayInitials();

  return (
    <View
      className={cn('w-full flex-row', className)}
      accessibilityElementsHidden={!interactive}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
    >
      {weekDays(weekStart).map((day, index) => {
        const tap = byDay.get(day);
        const hidden = floor !== undefined && day < floor;
        return (
          <DayCircle
            key={day}
            day={day}
            name={habit.name}
            initial={initials[MONDAY_FIRST[index]]}
            state={hidden ? 'before' : dayState(habit, day, Boolean(tap), today)}
            hidden={hidden}
            isToday={day === today}
            color={habit.color}
            price={habit.price}
            tap={tap}
            interactive={interactive}
            busy={busyDays?.has(day) ?? false}
            onTapDay={onTapDay}
            onUntapDay={onUntapDay}
          />
        );
      })}
    </View>
  );
}

type DayCircleProps = {
  day: string;
  /** The habit's, at the start of every label. */
  name: string;
  initial: string;
  state: DayState;
  /** Before the plan's floor: drawn as `before`, read as kept but not shown. */
  hidden: boolean;
  isToday: boolean;
  color: HabitColor;
  price: number;
  tap: HabitTap | undefined;
  interactive: boolean;
  busy: boolean;
  onTapDay?: (day: string) => void;
  onUntapDay?: (tap: HabitTap) => void;
};

function DayCircle({
  day,
  name,
  initial,
  state,
  hidden,
  isToday,
  color,
  price,
  tap,
  interactive,
  busy,
  onTapDay,
  onUntapDay,
}: DayCircleProps) {
  const colors = useColors();
  const { fill } = habitColor(color);

  // A past day is tappable, so its empty ring is `muted` (it must read as a control, 3:1); a
  // future day is inert and keeps the faint `line`.
  const circleStyle =
    state === 'tapped'
      ? { backgroundColor: fill }
      : state === 'today'
        ? { borderWidth: 2, borderColor: fill }
        : state === 'open'
          ? { borderWidth: 1.5, borderColor: colors.muted }
          : state === 'future'
            ? { borderWidth: 1.5, borderColor: colors.line }
            : null;

  const label = (
    <Text
      className={cn(
        'text-[11px]',
        isToday ? 'font-app-bold text-ink' : 'font-app-medium text-muted',
        state === 'before' && 'opacity-40',
      )}
      maxFontSizeMultiplier={TEXT_CAP.control}
    >
      {initial}
    </Text>
  );

  const circle = (pressed: boolean) => (
    <View
      testID={`day-${day}`}
      style={[
        { width: CIRCLE, height: CIRCLE, transform: [{ scale: pressed ? 0.92 : 1 }] },
        circleStyle,
      ]}
      className={cn(
        'mt-1 items-center justify-center rounded-full',
        state === 'before' && 'bg-ink/5',
      )}
    >
      {state === 'tapped' ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
    </View>
  );

  const column = 'min-h-[52px] flex-1 items-center';
  if (!interactive) {
    return (
      <View className={column}>
        {label}
        {circle(false)}
      </View>
    );
  }

  const spoken = spokenDay(day);
  const priceText = formatCurrency(price);
  // Filling a day is felt as the caller's success haptic, so only the undo gets the press tap.
  const press =
    state === 'tapped' && tap && onUntapDay
      ? withTap(() => onUntapDay(tap))
      : (state === 'today' || state === 'open') && onTapDay
        ? () => onTapDay(day)
        : undefined;

  const accessibility =
    state === 'tapped'
      ? {
          label: t('habits.day.bought', { day: spoken, amount: formatCurrency(tap?.amount ?? 0) }),
          hint: t('habits.day.boughtHint'),
        }
      : state === 'today'
        ? {
            label: t('habits.day.today', { day: spoken }),
            hint: t('habits.day.openHint', { amount: priceText }),
          }
        : state === 'open'
          ? {
              label: t('habits.day.open', { day: spoken }),
              hint: t('habits.day.openHint', { amount: priceText }),
            }
          : state === 'future'
            ? { label: t('habits.day.future', { day: spoken }), hint: undefined }
            : hidden
              ? { label: t('habits.day.hidden', { day: spoken }), hint: undefined }
              : { label: t('habits.day.before', { day: spoken }), hint: undefined };

  const inert = !press || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('habits.day.named', { name, label: accessibility.label })}
      accessibilityHint={inert ? undefined : accessibility.hint}
      accessibilityState={{ disabled: inert, busy }}
      onPress={press}
      disabled={inert}
      className={column}
    >
      {({ pressed }) => (
        <>
          {label}
          {circle(pressed && !inert)}
        </>
      )}
    </Pressable>
  );
}

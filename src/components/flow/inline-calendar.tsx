import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ActionPill } from '@/components/ui/action-pill';
import { monthLong, monthsShort, weekdayInitials, weekdayLong } from '@/i18n/calendar';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { getDaysInMonth, getFirstWeekday } from '@/lib/date';
import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type DayGridProps = {
  year: number;
  month: number;
  /** Day of `month` that is selected, or null when the selection is elsewhere. */
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  /** Draws the ring. Pass null to draw no today marker. */
  today?: Date | null;
  /** Earliest day that can be chosen; earlier days are dimmed and cannot be pressed. */
  minDate?: Date | null;
  compact?: boolean;
};

/** Midnight, so a time of day cannot decide a day comparison. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The month's days, Sunday-first. Shared by the inline step and the date-picker modal. */
export function DayGrid({
  year,
  month,
  selectedDay,
  onSelectDay,
  today = null,
  minDate = null,
  compact = false,
}: DayGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const leadingBlanks = getFirstWeekday(year, month);

  return (
    <View role="grid" className="w-full flex-row flex-wrap">
      {weekdayInitials().map((initial, index) => (
        <View key={`${initial}-${index}`} className="w-[14.28%] items-center py-1">
          <Text allowFontScaling={false} className="font-app-medium text-[11px] text-muted">
            {initial}
          </Text>
        </View>
      ))}

      {Array.from({ length: leadingBlanks }).map((_, index) => (
        <View key={`blank-${index}`} className="w-[14.28%] py-1" />
      ))}

      {Array.from({ length: daysInMonth }).map((_, index) => {
        const dayNumber = index + 1;
        const date = new Date(year, month, dayNumber);
        const selected = dayNumber === selectedDay;
        const isToday = today ? isSameDay(date, today) : false;
        const blocked = minDate ? startOfDay(date) < startOfDay(minDate) : false;
        const spoken = t('ui.calendar.day', {
          weekday: weekdayLong(date.getDay()),
          day: dayNumber,
          month: monthLong(month),
          year,
        });

        return (
          <View key={dayNumber} className="w-[14.28%] items-center py-0.5">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: blocked }}
              accessibilityLabel={isToday ? t('ui.calendar.today', { date: spoken }) : spoken}
              disabled={blocked}
              onPress={() => {
                selection();
                onSelectDay(dayNumber);
              }}
              className={cn(
                'items-center justify-center rounded-full',
                compact ? 'h-10 w-10' : 'h-11 w-11',
                blocked
                  ? null
                  : selected
                    ? 'bg-control'
                    : // Today is a ring, not a fill: a fill means "chosen".
                      isToday
                      ? 'border-[1.5px] border-control active:bg-ink/5'
                      : 'active:bg-ink/5',
              )}
            >
              <Text
                allowFontScaling={false}
                className={cn(
                  'text-[15px]',
                  blocked
                    ? 'font-app text-muted/40'
                    : selected
                      ? 'font-app-semibold text-on-control'
                      : isToday
                        ? 'font-app-medium text-accent-ink'
                        : 'font-app text-ink',
                )}
              >
                {dayNumber}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

type InlineCalendarProps = {
  /** null opens on this month with nothing selected — no date has been picked. */
  value: Date | null;
  onChange: (date: Date) => void;
  /** Earliest day that can be chosen, handed to the grid. */
  minDate?: Date | null;
};

/**
 * A calendar that is the page, not a dialog over it.
 *
 * Paging is chevrons only: a swipeable grid inside a scrolling page fights the scroll.
 */
export function InlineCalendar({ value, onChange, minDate = null }: InlineCalendarProps) {
  const colors = useColors();
  const opensOn = value ?? new Date();
  const [month, setMonth] = useState(opensOn.getMonth());
  const [year, setYear] = useState(opensOn.getFullYear());
  const [pickingMonth, setPickingMonth] = useState(false);
  const today = new Date();
  const todayBlocked = minDate ? startOfDay(today) < startOfDay(minDate) : false;

  const selectedDay =
    value && value.getFullYear() === year && value.getMonth() === month ? value.getDate() : null;

  const step = (delta: number) => {
    selection();
    const next = new Date(year, month + delta, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  };

  return (
    <View className="w-full">
      <View className="w-full flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ui.calendar.previousMonth')}
          onPress={() => step(-1)}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
        >
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ui.calendar.pickMonth', { month: monthLong(month), year })}
          onPress={() => setPickingMonth((open) => !open)}
          className="min-h-11 shrink flex-row items-center justify-center rounded-full px-4 active:bg-ink/5"
        >
          <Text
            className="shrink text-center font-app-semibold text-[17px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {t('ui.calendar.monthYear', { month: monthLong(month), year })}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ui.calendar.nextMonth')}
          onPress={() => step(1)}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
        >
          <ChevronRight size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      {pickingMonth ? (
        <View className="mt-2 w-full">
          <View className="w-full flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ui.calendar.previousYear')}
              onPress={() => {
                selection();
                setYear((current) => current - 1);
              }}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
            >
              <ChevronLeft size={22} color={colors.ink} strokeWidth={2} />
            </Pressable>
            <Text
              className="font-app-semibold text-[17px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.heading}
            >
              {year}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ui.calendar.nextYear')}
              onPress={() => {
                selection();
                setYear((current) => current + 1);
              }}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
            >
              <ChevronRight size={22} color={colors.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <View className="mt-1 w-full flex-row flex-wrap">
            {monthsShort().map((label, index) => {
              const selected = index === month;
              return (
                <View key={label} className="w-1/4 items-center py-1.5">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={monthLong(index)}
                    onPress={() => {
                      selection();
                      setMonth(index);
                      setPickingMonth(false);
                    }}
                    className={cn(
                      'min-h-11 w-full items-center justify-center rounded-full px-2',
                      selected ? 'bg-control' : 'active:bg-ink/5',
                    )}
                  >
                    {/* No fit group: the widest short month, French "mars" when chosen
                        (SemiBold), is 51pt at the control ceiling, inside the narrowest pill's
                        52pt. */}
                    <Text
                      className={cn(
                        'text-[15px]',
                        selected ? 'font-app-semibold text-on-control' : 'font-app text-ink',
                      )}
                      maxFontSizeMultiplier={TEXT_CAP.control}
                    >
                      {label}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View className="mt-2 w-full">
          <DayGrid
            year={year}
            month={month}
            selectedDay={selectedDay}
            today={today}
            minDate={minDate}
            onSelectDay={(day) => onChange(new Date(year, month, day))}
          />
        </View>
      )}

      {/* Hidden when today is below the floor: it would pick a day the grid greys out. */}
      {todayBlocked ? null : (
        <View className="mt-4 w-full flex-row justify-end">
          <ActionPill
            icon={CalendarDays}
            label={t('dates.today')}
            onPress={() => {
              const now = new Date();
              setMonth(now.getMonth());
              setYear(now.getFullYear());
              setPickingMonth(false);
              onChange(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
            }}
          />
        </View>
      )}
    </View>
  );
}

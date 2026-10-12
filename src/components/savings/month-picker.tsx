import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { monthLong, monthsShort } from '@/i18n/calendar';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

const monthKey = (year: number, index: number) => `${year}-${String(index + 1).padStart(2, '0')}`;

/**
 * Picks a month (yyyy-mm), drawn in the page rather than as a dialog: the year with its arrows, then
 * the twelve months. Months before `from` are dimmed and dead, and so are the years wholly before it.
 */
export function MonthPicker({
  value,
  from,
  onChange,
}: {
  /** yyyy-mm, or null for none picked. */
  value: string | null;
  /** yyyy-mm: the earliest month that can be picked. */
  from: string;
  onChange: (month: string) => void;
}) {
  const colors = useColors();
  const fromYear = Number(from.slice(0, 4));
  const [year, setYear] = useState(() => (value ? Number(value.slice(0, 4)) : fromYear));
  const canGoBack = year > fromYear;

  return (
    <View testID="month-picker" className="w-full">
      <View className="w-full flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ui.calendar.previousYear')}
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          onPress={() => setYear((current) => current - 1)}
          className={cn(
            'h-11 w-11 items-center justify-center rounded-full active:bg-ink/5',
            !canGoBack && 'opacity-30',
          )}
        >
          <ChevronLeft size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="font-app-semibold text-[17px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {String(year)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ui.calendar.nextYear')}
          onPress={() => setYear((current) => current + 1)}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
        >
          <ChevronRight size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      <View className="mt-2 w-full flex-row flex-wrap">
        {monthsShort().map((label, index) => {
          const key = monthKey(year, index);
          const selected = key === value;
          const blocked = key < from;
          return (
            <View key={label} className="w-1/4 p-1">
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={t('ui.calendar.monthYear', { month: monthLong(index), year })}
                accessibilityState={{ selected, checked: selected, disabled: blocked }}
                disabled={blocked}
                onPress={() => {
                  selection();
                  onChange(key);
                }}
                testID={`month-${key}`}
                className={cn(
                  'min-h-[44px] items-center justify-center rounded-full px-1',
                  blocked ? undefined : selected ? 'bg-control' : 'active:bg-ink/5',
                )}
              >
                <Text
                  className={cn(
                    'text-center text-[15px]',
                    blocked
                      ? 'font-app text-muted/40'
                      : selected
                        ? 'font-app-semibold text-on-control'
                        : 'font-app text-ink',
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
  );
}

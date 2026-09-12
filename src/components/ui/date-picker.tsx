import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { DayGrid } from '@/components/flow/inline-calendar';
import { cn } from '@/lib/cn';
import { MONTHS_SHORT, getDaysInMonth } from '@/lib/date';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

type DatePickerProps = {
  /** Date the picker opens on. */
  value: Date;
  /**
   * Earliest date that can be chosen, inclusive.
   *
   * Earlier days are dimmed and dead, earlier months with them, and OK is held
   * back while the draft sits before it — so a range that ends before it starts
   * cannot be built in the first place, rather than being built and then
   * refused.
   */
  minDate?: Date | null;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};

/** Midnight-to-midnight, so a time of day cannot decide a day comparison. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Two-step date chooser: pick a month, then a day within it.
 *
 * Mount it only while open — the useState initialisers then reseed the draft on
 * every open, so no effect is needed to sync props into state, and Cancel
 * genuinely discards.
 */
export function DatePicker({ value, minDate = null, onCancel, onConfirm }: DatePickerProps) {
  const colors = useColors();
  const [step, setStep] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(value.getMonth());
  const [year, setYear] = useState(value.getFullYear());
  const [day, setDay] = useState(value.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  // Clamp: 31 → February must not produce an invalid date.
  const safeDay = Math.min(day, daysInMonth);
  const draft = new Date(year, month, safeDay);
  // The draft can fall below the floor without anybody choosing a blocked day:
  // stepping the year down keeps the day number and moves the date.
  const belowFloor = minDate ? startOfDay(draft) < startOfDay(minDate) : false;

  const handleMonthPress = (index: number) => {
    setMonth(index);
    setStep('day');
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessibilityLabel="Close date picker"
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        <Pressable
          onPress={() => {}}
          style={shadows.floating}
          className="w-full max-w-[340px] overflow-hidden rounded-[16px] bg-card"
        >
          <View className="bg-control px-5 py-4">
            <Text
              className="font-poppins text-[13px] text-on-control/85"
              maxFontSizeMultiplier={1.2}
            >
              {safeDay} {MONTHS_SHORT[month]} {year}
            </Text>

            <View className="mt-1 flex-row items-center justify-between">
              <Text
                className="font-poppins-bold text-[30px] text-on-control"
                maxFontSizeMultiplier={1.2}
              >
                {year}
              </Text>

              <View className="flex-row items-center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next year"
                  onPress={() => setYear((current) => current + 1)}
                  className="h-11 w-11 items-center justify-center rounded-[12px] active:bg-on-control/10"
                >
                  <ChevronUp size={22} color={colors.onControl} strokeWidth={2} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous year"
                  onPress={() => setYear((current) => current - 1)}
                  className="h-11 w-11 items-center justify-center rounded-[12px] active:bg-on-control/10"
                >
                  <ChevronDown size={22} color={colors.onControl} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </View>

          {step === 'month' ? (
            <View className="flex-row flex-wrap px-3 py-4">
              {MONTHS_SHORT.map((label, index) => {
                const selected = index === month;
                // Dead only when the whole month is below the floor; a month
                // the floor falls inside still has days worth offering.
                const blocked = minDate
                  ? startOfDay(new Date(year, index, getDaysInMonth(year, index))) <
                    startOfDay(minDate)
                  : false;
                return (
                  <View key={label} className="w-1/4 items-center py-1.5">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: blocked }}
                      accessibilityLabel={label}
                      disabled={blocked}
                      onPress={() => handleMonthPress(index)}
                      className={cn(
                        'h-14 w-14 items-center justify-center rounded-full',
                        blocked ? null : selected ? 'bg-control' : 'active:bg-ink/5',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-[15px]',
                          blocked
                            ? 'font-poppins text-muted/40'
                            : selected
                              ? 'font-poppins-semibold text-on-control'
                              : 'font-poppins text-ink',
                        )}
                        maxFontSizeMultiplier={1.2}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="px-3 pb-2 pt-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to months"
                onPress={() => setStep('month')}
                className="mb-2 flex-row items-center gap-1 self-start rounded-[12px] px-2 py-1.5 active:bg-ink/5"
              >
                <ChevronLeft size={16} color={colors.muted} strokeWidth={2} />
                <Text
                  className="font-poppins-medium text-[14px] text-body"
                  maxFontSizeMultiplier={1.2}
                >
                  {MONTHS_SHORT[month]} {year}
                </Text>
              </Pressable>

              <DayGrid
                year={year}
                month={month}
                selectedDay={belowFloor ? null : safeDay}
                today={new Date()}
                minDate={minDate}
                onSelectDay={setDay}
                compact
              />
            </View>
          )}

          <View className="flex-row justify-end gap-1 px-3 pb-3 pt-1">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="min-h-11 justify-center rounded-full px-5 active:bg-ink/5"
            >
              <Text className="font-poppins-medium text-[15px] text-body">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              // On the month step this advances to the days rather than
              // confirming — a month alone is not a date.
              disabled={step === 'day' && belowFloor}
              onPress={() => (step === 'month' ? setStep('day') : onConfirm(draft))}
              className={cn(
                'min-h-11 justify-center rounded-full px-5',
                step === 'day' && belowFloor
                  ? 'bg-control/40'
                  : 'bg-control active:bg-control-pressed',
              )}
            >
              <Text className="font-poppins-semibold text-[15px] text-on-control">
                {step === 'month' ? 'Next' : 'OK'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

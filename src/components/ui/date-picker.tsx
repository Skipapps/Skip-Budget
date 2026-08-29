import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { MONTHS_SHORT, WEEKDAY_INITIALS, getDaysInMonth, getFirstWeekday } from '@/lib/date';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

type DatePickerProps = {
  /** Date the picker opens on. */
  value: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};

/**
 * Two-step date chooser: pick a month, then a day within it.
 *
 * Mount it only while open — the useState initialisers then reseed the draft on
 * every open, so no effect is needed to sync props into state, and Cancel
 * genuinely discards.
 */
export function DatePicker({ value, onCancel, onConfirm }: DatePickerProps) {
  const colors = useColors();
  const [step, setStep] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(value.getMonth());
  const [year, setYear] = useState(value.getFullYear());
  const [day, setDay] = useState(value.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const leadingBlanks = getFirstWeekday(year, month);
  // Clamp: 31 → February must not produce an invalid date.
  const safeDay = Math.min(day, daysInMonth);

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
          className="w-full max-w-[340px] overflow-hidden rounded-[10px] bg-card"
        >
          <View className="bg-control px-5 py-4">
            <Text
              className="font-poppins text-[13px] text-on-control/70"
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
                  className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-on-control/10"
                >
                  <ChevronUp size={22} color={colors.surface} strokeWidth={2} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous year"
                  onPress={() => setYear((current) => current - 1)}
                  className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-on-control/10"
                >
                  <ChevronDown size={22} color={colors.surface} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </View>

          {step === 'month' ? (
            <View className="flex-row flex-wrap px-3 py-4">
              {MONTHS_SHORT.map((label, index) => {
                const selected = index === month;
                return (
                  <View key={label} className="w-1/4 items-center py-1.5">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={label}
                      onPress={() => handleMonthPress(index)}
                      className={cn(
                        'h-14 w-14 items-center justify-center rounded-full',
                        selected ? 'bg-control' : 'active:bg-ink/5',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-[15px]',
                          selected
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
                className="mb-2 flex-row items-center gap-1 self-start rounded-[8px] px-2 py-1.5 active:bg-ink/5"
              >
                <ChevronLeft size={16} color={colors.muted} strokeWidth={2} />
                <Text
                  className="font-poppins-medium text-[14px] text-body"
                  maxFontSizeMultiplier={1.2}
                >
                  {MONTHS_SHORT[month]} {year}
                </Text>
              </Pressable>

              <View className="flex-row flex-wrap">
                {WEEKDAY_INITIALS.map((initial, index) => (
                  <View key={`${initial}-${index}`} className="w-[14.28%] items-center py-1">
                    <Text
                      allowFontScaling={false}
                      className="font-poppins-medium text-[11px] text-muted"
                    >
                      {initial}
                    </Text>
                  </View>
                ))}

                {Array.from({ length: leadingBlanks }).map((_, index) => (
                  <View key={`blank-${index}`} className="w-[14.28%] py-1" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const dayNumber = index + 1;
                  const selected = dayNumber === safeDay;
                  return (
                    <View key={dayNumber} className="w-[14.28%] items-center py-1">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${dayNumber}`}
                        onPress={() => setDay(dayNumber)}
                        className={cn(
                          'h-10 w-10 items-center justify-center rounded-full',
                          selected ? 'bg-control' : 'active:bg-ink/5',
                        )}
                      >
                        <Text
                          allowFontScaling={false}
                          className={cn(
                            'text-[14px]',
                            selected
                              ? 'font-poppins-semibold text-on-control'
                              : 'font-poppins text-ink',
                          )}
                        >
                          {dayNumber}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View className="flex-row justify-end gap-1 px-3 pb-3 pt-1">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="rounded-[10px] px-5 py-3 active:bg-ink/5"
            >
              <Text className="font-poppins-medium text-[15px] text-muted">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              // On the month step this advances to the days rather than
              // confirming — a month alone is not a date.
              onPress={() =>
                step === 'month' ? setStep('day') : onConfirm(new Date(year, month, safeDay))
              }
              className="rounded-[10px] px-5 py-3 active:bg-ink/5"
            >
              <Text className="font-poppins-semibold text-[15px] text-ink">
                {step === 'month' ? 'Next' : 'OK'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

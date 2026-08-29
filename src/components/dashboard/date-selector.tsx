import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

type DateSelectorProps = {
  weekday: string;
  date: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onPickDate?: () => void;
  /**
   * Stops the stepper going past today.
   *
   * The dashboard looks back over a week that has happened, so there is no
   * day after today to step onto — the week ahead is already on screen under
   * its own heading.
   */
  atLatest?: boolean;
};

/** Day stepper for the transaction list below it. */
export function DateSelector({
  weekday,
  date,
  onPrevious,
  onNext,
  onPickDate,
  atLatest = false,
}: DateSelectorProps) {
  return (
    <View className="w-full flex-row items-center justify-between rounded-[10px] border border-line px-1.5 py-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        onPress={onPrevious}
        className="h-10 w-10 items-center justify-center rounded-[8px] active:bg-black/5"
      >
        <ChevronLeft size={20} color={colors.ink} strokeWidth={2} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${weekday} ${date}. Choose a date`}
        onPress={onPickDate}
        className="flex-1 flex-row items-center justify-center gap-2 active:opacity-70"
      >
        <View className="items-center">
          <Text className="font-poppins-medium text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            {weekday}
          </Text>
          <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
            {date}
          </Text>
        </View>
        <Calendar size={18} color={colors.muted} strokeWidth={1.8} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        accessibilityState={{ disabled: atLatest }}
        disabled={atLatest}
        onPress={onNext}
        className={
          atLatest
            ? 'h-10 w-10 items-center justify-center rounded-[8px] opacity-30'
            : 'h-10 w-10 items-center justify-center rounded-[8px] active:bg-black/5'
        }
      >
        <ChevronRight size={20} color={colors.ink} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

import { Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  REMINDER_CAPTION,
  REMINDER_CHOICES,
  type ReminderChoice,
  type ReminderKind,
} from '@/api/reminders';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { TextLink } from '@/components/ui/text-link';
import { TimePicker } from '@/components/ui/time-picker';
import { FieldLabel } from '@/components/ui/typography';
import { formatClock, parseClock } from '@/lib/date';
import { useColors } from '@/providers/theme-provider';

type ReminderFieldProps = {
  kind: ReminderKind;
  value: ReminderChoice;
  onChange: (value: ReminderChoice) => void;
  /** "HH:MM" the reminder is sent at. */
  time: string;
  onTimeChange: (value: string) => void;
  /**
   * Why this thing cannot be reminded about yet, if it cannot. Shown instead
   * of the controls — one that would save a setting nothing can act on is
   * worse than an explanation.
   */
  unavailable?: string | null;
  /**
   * Offered under `unavailable` when the reason is a read that failed rather
   * than a fact about the thing. "Add the income paid into this account" is
   * something to go and do; "we could not check" is something to try again.
   */
  onRetry?: () => void;
};

/**
 * Setting a reminder where the thing is created, rather than only in Settings.
 *
 * Both places write the same row. This is the moment somebody is thinking
 * about the bill, so it is the moment to ask; the page in Settings is for
 * seeing all of them at once and changing their minds later.
 *
 * The time only appears once there is a reminder to time. Asking when to send
 * something nobody has asked to be sent is a question about nothing.
 */
export function ReminderField({
  kind,
  value,
  onChange,
  time,
  onTimeChange,
  unavailable,
  onRetry,
}: ReminderFieldProps) {
  const colors = useColors();
  const [pickerOpen, setPickerOpen] = useState(false);
  const clock = parseClock(time);

  return (
    <View className="w-full">
      <FieldLabel className="mb-1">Reminder</FieldLabel>
      <Text className="mb-2.5 font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
        {unavailable ?? REMINDER_CAPTION[kind]}
      </Text>

      {unavailable && onRetry ? (
        <TextLink
          label="Try again"
          variant="subtle"
          onPress={onRetry}
          className="mb-1 self-start"
        />
      ) : null}

      {unavailable ? null : (
        <>
          <ChoiceChips options={REMINDER_CHOICES} value={value} onChange={onChange} />

          {value === 'off' ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sent at ${formatClock(clock.hour, clock.minute)}. Change the time.`}
              onPress={() => setPickerOpen(true)}
              // The pill is 40pt tall by design; the target is the 44pt floor.
              hitSlop={{ top: 4, bottom: 4 }}
              className="mt-3 min-h-10 flex-row items-center gap-2 self-start rounded-full bg-ink/5 px-4 active:bg-ink/10"
            >
              <Clock size={18} color={colors.body} strokeWidth={1.8} />
              <Text
                className="font-poppins-medium text-[14px] text-ink"
                maxFontSizeMultiplier={1.2}
              >
                at {formatClock(clock.hour, clock.minute)}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {pickerOpen ? (
        <TimePicker
          value={time}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(next) => {
            onTimeChange(next);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

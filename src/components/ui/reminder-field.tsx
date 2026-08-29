import { Text, View } from 'react-native';

import {
  REMINDER_CAPTION,
  REMINDER_CHOICES,
  type ReminderChoice,
  type ReminderKind,
} from '@/api/reminders';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FieldLabel } from '@/components/ui/typography';

type ReminderFieldProps = {
  kind: ReminderKind;
  value: ReminderChoice;
  onChange: (value: ReminderChoice) => void;
  /**
   * Why this thing cannot be reminded about yet, if it cannot. Shown instead
   * of the chips — a control that would save a setting nothing can act on is
   * worse than an explanation.
   */
  unavailable?: string | null;
};

/**
 * Setting a reminder where the thing is created, rather than only in Settings.
 *
 * Both places write the same row. This is the moment somebody is thinking
 * about the bill, so it is the moment to ask; the page in Settings is for
 * seeing all of them at once and changing their minds later.
 */
export function ReminderField({ kind, value, onChange, unavailable }: ReminderFieldProps) {
  return (
    <View className="w-full">
      <FieldLabel className="mb-1">Reminder</FieldLabel>
      <Text className="mb-2.5 font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
        {unavailable ?? REMINDER_CAPTION[kind]}
      </Text>

      {unavailable ? null : (
        <ChoiceChips options={REMINDER_CHOICES} value={value} onChange={onChange} />
      )}
    </View>
  );
}

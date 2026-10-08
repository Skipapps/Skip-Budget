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
import { t } from '@/i18n';
import { formatClock, parseClock } from '@/lib/date';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type ReminderFieldProps = {
  kind: ReminderKind;
  value: ReminderChoice;
  onChange: (value: ReminderChoice) => void;
  /** "HH:MM" the reminder is sent at. */
  time: string;
  onTimeChange: (value: string) => void;
  /** Why this thing cannot be reminded about yet, if it cannot. Shown instead of the controls. */
  unavailable?: string | null;
  /** Offered under `unavailable` when the reason is a failed read rather than a fact about the thing. */
  onRetry?: () => void;
};

/**
 * Sets a reminder where the thing is created; Settings writes the same row. The time only appears
 * once there is a reminder to time.
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
  const clockLabel = formatClock(clock.hour, clock.minute);

  return (
    <View className="w-full">
      <FieldLabel className="mb-1">{t('ui.reminder.label')}</FieldLabel>
      <Text
        className="mb-2.5 font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {unavailable ?? REMINDER_CAPTION[kind]}
      </Text>

      {unavailable && onRetry ? (
        <TextLink
          label={t('common.tryAgain')}
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
              accessibilityLabel={t('ui.reminder.sentAt', { time: clockLabel })}
              onPress={() => setPickerOpen(true)}
              // The pill is 40pt tall by design; the target is the 44pt floor.
              hitSlop={{ top: 4, bottom: 4 }}
              className="mt-3 min-h-10 max-w-full flex-row items-center gap-2 self-start rounded-full bg-ink/5 px-4 py-2 active:bg-ink/10"
            >
              <Clock size={18} color={colors.body} strokeWidth={1.8} />
              <Text
                className="shrink font-app-medium text-[14px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.control}
              >
                {t('ui.reminder.at', { time: clockLabel, count: clock.hour % 12 || 12 })}
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

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { InlineCalendar } from '@/components/flow/inline-calendar';
import { TextLink } from '@/components/ui/text-link';
import { FieldLabel } from '@/components/ui/typography';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatEntryDay } from '@/lib/entry-day';
import { withTap } from '@/lib/press';
import { TEXT_CAP } from '@/theme/text-scale';

type DateBoxProps = {
  label: string;
  value: Date | null;
  /** For "Yesterday, Tue Oct 6". */
  today: Date;
  onChange: (day: Date) => void;
  /** In the box while there is no day. */
  placeholder: string;
  /** Earlier days are dimmed and cannot be picked. */
  minDate?: Date | null;
  /** An optional day can be taken off again ("Clear — make it ongoing"). */
  clear?: { label: string; onPress: () => void };
};

/**
 * A day set on the page like any other box: the calendar opens right under it, and picking a day
 * fills the box and folds the calendar away. Nothing leaves the page.
 */
export function DateBox({
  label,
  value,
  today,
  onChange,
  placeholder,
  minDate,
  clear,
}: DateBoxProps) {
  const [open, setOpen] = useState(false);
  const shown = value ? formatEntryDay(value, today) : null;

  return (
    <View className="w-full">
      <FieldLabel className="mb-2">{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('entry.row.spoken', { label, value: shown ?? placeholder })}
        accessibilityState={{ expanded: open }}
        onPress={withTap(() => setOpen((was) => !was))}
        className={cn(
          'min-h-14 w-full justify-center rounded-[10px] border px-5 py-4 active:bg-ink/5',
          open ? 'border-control' : 'border-line',
        )}
      >
        <Text
          className={cn('font-app text-[16px]', shown ? 'text-ink' : 'text-muted')}
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {shown ?? placeholder}
        </Text>
      </Pressable>

      {open ? (
        <View className="mt-3 w-full">
          <InlineCalendar
            value={value}
            minDate={minDate}
            onChange={(day) => {
              onChange(day);
              setOpen(false);
            }}
          />
        </View>
      ) : null}

      {value && clear ? (
        <TextLink
          label={clear.label}
          variant="subtle"
          onPress={() => {
            clear.onPress();
            setOpen(false);
          }}
          className="mt-1 self-start"
        />
      ) : null}
    </View>
  );
}

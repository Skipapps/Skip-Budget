import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { TextField } from '@/components/ui/text-field';
import { currencyMark } from '@/i18n';
import { draftFromTyped, formatDraft } from '@/lib/typed-amount';
import { TEXT_CAP } from '@/theme/text-scale';

type CurrencyFieldProps = {
  label: string;
  /** The draft as the keypad makes it: ASCII digits and "." ("1234.5"), "" for empty. */
  value: string;
  onChange: (draft: string) => void;
  placeholder?: string;
  optional?: boolean;
  filled?: boolean;
  trailing?: ReactNode;
};

/**
 * An amount typed with the phone's decimal pad, in the field rather than on a page of its own. The
 * currency mark is drawn beside the digits on the language's side; the digits are grouped as typed.
 */
export function CurrencyField({
  label,
  value,
  onChange,
  placeholder,
  optional,
  filled,
  trailing,
}: CurrencyFieldProps) {
  const shown = formatDraft(value);
  const { symbol, after } = currencyMark();
  // Only beside digits: before an empty field it would read as part of the placeholder.
  const mark = shown ? (
    <Text
      className="font-app text-[16px] text-ink"
      maxFontSizeMultiplier={TEXT_CAP.row}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {symbol}
    </Text>
  ) : null;

  return (
    <TextField
      label={label}
      value={shown}
      onChangeText={(text) => onChange(draftFromTyped(shown, text))}
      placeholder={placeholder}
      optional={optional}
      filled={filled}
      keyboardType="decimal-pad"
      returnKeyType="done"
      leading={after ? undefined : mark}
      trailing={
        (after && mark) || trailing ? (
          <View className="flex-row items-center gap-2">
            {after ? mark : null}
            {trailing}
          </View>
        ) : undefined
      }
    />
  );
}

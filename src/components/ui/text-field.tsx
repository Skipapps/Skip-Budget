import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { EyeIcon } from '@/components/icons/eye-icon';
import { FieldLabel } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Validation message. Wired up with the auth work; unused for now. */
  error?: string;
  className?: string;
  /** Optional-field hint, shown next to the label rather than in the input. */
  optional?: boolean;
} & Pick<
  TextInputProps,
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'keyboardType'
  | 'secureTextEntry'
  | 'textContentType'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'multiline'
  | 'maxLength'
>;

/**
 * Labelled text input with 10px corners. Password fields get a reveal toggle;
 * the eye sits inside the border so the tap target never overlaps the text.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  className,
  secureTextEntry,
  optional,
  multiline,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View className={cn('w-full', className)}>
      <View className="mb-2 flex-row items-baseline">
        <FieldLabel>{label}</FieldLabel>
        {optional ? (
          <Text className="ml-1.5 font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            (optional)
          </Text>
        ) : null}
      </View>

      <View
        className={cn(
          'w-full rounded-[10px] border px-5',
          // A multiline box grows downward, so the input must sit at the top
          // rather than be vertically centred like a single-line field.
          multiline ? 'min-h-24 py-1' : 'min-h-14 flex-row items-center',
          error ? 'border-red-500' : focused ? 'border-control' : 'border-line',
        )}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !revealed}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={cn('flex-1 py-4 font-poppins text-[16px] text-ink', multiline && 'min-h-20')}
          maxFontSizeMultiplier={1.5}
          {...inputProps}
        />

        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={10}
            onPress={() => setRevealed((previous) => !previous)}
            className="-mr-1 ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          >
            <EyeIcon open={revealed} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          className="ml-5 mt-1.5 font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { cn } from '@/lib/cn';

type OtpInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** Number of digits. */
  length?: number;
  autoFocus?: boolean;
  /** Called once the final digit is entered. */
  onComplete?: (value: string) => void;
  className?: string;
};

/**
 * Segmented code entry.
 *
 * Renders `length` boxes but keeps a single transparent TextInput stretched over
 * them. One input means iOS SMS autofill and paste drop the whole code in at
 * once, which per-box inputs cannot do, and there is no focus juggling.
 */
export function OtpInput({
  value,
  onChangeText,
  length = 6,
  autoFocus = true,
  onComplete,
  className,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (next: string) => {
    const digitsOnly = next.replace(/\D/g, '').slice(0, length);
    onChangeText(digitsOnly);
    if (digitsOnly.length === length) {
      onComplete?.(digitsOnly);
    }
  };

  return (
    <View className={cn('w-full', className)}>
      <View className="w-full flex-row justify-between gap-2">
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] ?? '';
          // Highlight the box the next digit will land in.
          const isCursor = focused && index === Math.min(value.length, length - 1);

          return (
            <View
              key={index}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-[10px] border',
                isCursor ? 'border-control' : digit ? 'border-control' : 'border-line',
              )}
            >
              <Text
                className="font-poppins-semibold text-[22px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                {digit}
              </Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[StyleSheet.absoluteFill, { opacity: 0 }]}
        accessibilityLabel={`${length} digit verification code`}
      />
    </View>
  );
}

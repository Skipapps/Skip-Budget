import { ChevronLeft, Delete } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type AmountPadProps = {
  title: string;
  /** Caption under the figure, e.g. "Card balance". */
  caption: string;
  value: string;
  /** `percent` swaps the leading $ for a trailing % — same keypad otherwise. */
  unit?: 'currency' | 'percent';
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'] as const;

/** Groups the whole part so long figures stay readable while typing. */
function displayAmount(raw: string): string {
  if (!raw) return '0';
  const [whole, fraction] = raw.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * Full-screen amount entry with its own keypad.
 *
 * Replaces the system keyboard for money: the figure stays large and centred,
 * there is no numeric row to mis-hit, and no keyboard to scroll clear of.
 */
export function AmountPad({
  title,
  caption,
  value,
  unit = 'currency',
  onCancel,
  onConfirm,
}: AmountPadProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  const press = (key: (typeof KEYS)[number]) => {
    setDraft((current) => {
      if (key === 'delete') return current.slice(0, -1);
      // One decimal point, and at most two digits after it.
      if (key === '.') return current.includes('.') ? current : `${current || '0'}.`;
      const [, fraction] = current.split('.');
      if (fraction !== undefined && fraction.length >= 2) return current;
      if (current === '0') return key;
      return current + key;
    });
  };

  const isEmpty = draft === '' || Number(draft) === 0;

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-card"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-ink/5"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-poppins-semibold text-[18px] text-ink"
            maxFontSizeMultiplier={1.2}
          >
            {title}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="flex-row items-start">
            {unit === 'currency' ? (
              <Text
                allowFontScaling={false}
                className={cn(
                  'mt-2 font-poppins-bold text-[24px]',
                  isEmpty ? 'text-muted' : 'text-body',
                )}
              >
                $
              </Text>
            ) : null}
            <Text
              allowFontScaling={false}
              className={cn('font-poppins-bold text-[54px]', isEmpty ? 'text-muted' : 'text-ink')}
            >
              {displayAmount(draft)}
            </Text>
            {unit === 'percent' ? (
              <Text
                allowFontScaling={false}
                className={cn(
                  'mt-2 font-poppins-bold text-[24px]',
                  isEmpty ? 'text-muted' : 'text-body',
                )}
              >
                %
              </Text>
            ) : null}
          </View>
          <Text className="mt-2 font-poppins text-[15px] text-muted" maxFontSizeMultiplier={1.2}>
            {caption}
          </Text>
        </View>

        <View className="flex-row flex-wrap px-4">
          {KEYS.map((key) => (
            <View key={key} className="w-1/3 p-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={key === 'delete' ? 'Delete' : key}
                onPress={() => press(key)}
                className="h-[68px] items-center justify-center rounded-[10px] border border-line bg-card active:bg-ink/5"
              >
                {key === 'delete' ? (
                  <Delete size={24} color={colors.ink} strokeWidth={1.8} />
                ) : (
                  <Text allowFontScaling={false} className="font-poppins text-[26px] text-ink">
                    {key}
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>

        <View className="px-5 pt-4">
          <Button label="Done" onPress={() => onConfirm(draft)} />
        </View>
      </View>
    </Modal>
  );
}

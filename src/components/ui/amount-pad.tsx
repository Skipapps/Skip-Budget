import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountKeypad, applyAmountKey } from '@/components/flow/amount-keypad';
import { Button } from '@/components/ui/button';
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

/**
 * Full-screen amount entry with its own keypad.
 *
 * Replaces the system keyboard for money: the figure stays large and centred,
 * there is no numeric row to mis-hit, and no keyboard to scroll clear of.
 *
 * Kept alongside the stepped flows for the *secondary* amounts — one person's
 * exact share, an expected income, an interest rate — where the figure is not
 * the headline of the screen and a modal is the right weight. The figure and
 * the keys are the same components step 1 uses, so the two cannot drift.
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

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-surface"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-poppins-semibold text-[17px] text-ink"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
        </View>

        <View className="flex-1 justify-center px-6">
          <AmountFigure value={draft} unit={unit} />
          <Text
            className="mt-2 w-full text-center font-poppins text-[15px] text-muted"
            maxFontSizeMultiplier={1.2}
          >
            {caption}
          </Text>
        </View>

        <View className="px-6">
          <AmountKeypad onKey={(key) => setDraft((current) => applyAmountKey(current, key))} />
        </View>

        <View className="px-6 pt-5">
          <Button label="Done" onPress={() => onConfirm(draft)} />
        </View>
      </View>
    </Modal>
  );
}

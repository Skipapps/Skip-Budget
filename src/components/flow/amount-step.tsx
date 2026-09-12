import { View } from 'react-native';

import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountKeypad, applyAmountKey } from '@/components/flow/amount-keypad';

type AmountStepProps = {
  /** The raw draft string the screen already holds in state. */
  value: string;
  onChange: (value: string) => void;
  unit?: 'currency' | 'percent';
};

/**
 * Step 1 of every add flow: the figure floats, the pad sits under the thumb.
 *
 * The draft goes straight back to the screen's own amount state, character for
 * character. Nothing here parses, rounds or defaults it — the step is a way of
 * typing, not a place money gets decided.
 */
export function AmountStep({ value, onChange, unit = 'currency' }: AmountStepProps) {
  return (
    <View className="w-full flex-1">
      <AmountFigure value={value} unit={unit} />

      <View className="mt-auto w-full pt-8">
        <AmountKeypad onKey={(key) => onChange(applyAmountKey(value, key))} />
      </View>
    </View>
  );
}

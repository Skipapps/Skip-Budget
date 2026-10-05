import { View } from 'react-native';

import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountKeypad, applyAmountKey } from '@/components/flow/amount-keypad';

type AmountStepProps = {
  value: string;
  onChange: (value: string) => void;
  unit?: 'currency' | 'percent';
};

/** Step 1 of every add flow. The draft goes back to the screen's state as typed: nothing parses, rounds or defaults it. */
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

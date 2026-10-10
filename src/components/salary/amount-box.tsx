import { Calculator } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type AmountBoxProps = {
  label: string;
  /** The amount as shown, or empty for none yet. */
  value: string;
  placeholder: string;
  onPress: () => void;
  /** Gives the calculator glyph a press of its own; without it the glyph is part of the box. */
  onCalculator?: () => void;
  calculatorLabel?: string;
};

/** A filled box with its label inside, above the amount, that opens the keypad for it. */
export function AmountBox({
  label,
  value,
  placeholder,
  onPress,
  onCalculator,
  calculatorLabel,
}: AmountBoxProps) {
  const colors = useColors();
  const glyph = <Calculator size={20} color={colors.body} strokeWidth={1.8} />;

  return (
    <View className="w-full flex-row items-center rounded-[14px] bg-ink/5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value || placeholder }}
        onPress={onPress}
        className="min-h-[60px] min-w-0 flex-1 flex-row items-center gap-3 py-2.5 pl-4 pr-2 active:opacity-70"
      >
        <View className="min-w-0 flex-1">
          <Text
            className="font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {label}
          </Text>
          <Text
            className={cn(
              'mt-0.5',
              value ? 'font-app-bold text-[17px] text-ink' : 'font-app text-[15px] text-muted',
            )}
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {value || placeholder}
          </Text>
        </View>
        {onCalculator ? null : (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {glyph}
          </View>
        )}
      </Pressable>

      {onCalculator ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={calculatorLabel}
          onPress={onCalculator}
          className="mr-2 h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
        >
          {glyph}
        </Pressable>
      ) : null}
    </View>
  );
}

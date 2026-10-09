import { Delete } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { numberMarks, t } from '@/i18n';
import { AMOUNT_KEYS, type AmountKey } from '@/lib/amount-keys';
import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';

// The rule lives in lib so a typed field can share it without the keypad's drawing.
export { applyAmountKey, type AmountKey } from '@/lib/amount-keys';

type AmountKeypadProps = {
  onKey: (key: AmountKey) => void;
};

const KEY_ROWS: AmountKey[][] = [
  AMOUNT_KEYS.slice(0, 3),
  AMOUNT_KEYS.slice(3, 6),
  AMOUNT_KEYS.slice(6, 9),
  AMOUNT_KEYS.slice(9, 12),
];

export function AmountKeypad({ onKey }: AmountKeypadProps) {
  const colors = useColors();
  const { decimal } = numberMarks();

  return (
    <View className="w-full gap-3">
      {KEY_ROWS.map((row) => (
        <View key={row.join('')} className="w-full flex-row gap-3">
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={
                key === 'delete'
                  ? t('loan.keypad.deleteLast')
                  : key === '.'
                    ? t('loan.keypad.decimal')
                    : key
              }
              onPress={() => {
                selection();
                onKey(key);
              }}
              className="h-[64px] flex-1 items-center justify-center rounded-[16px] bg-ink/5 active:bg-ink/10"
            >
              {key === 'delete' ? (
                <Delete size={24} color={colors.ink} strokeWidth={1.8} />
              ) : (
                <Text allowFontScaling={false} className="font-app text-[26px] text-ink">
                  {key === '.' ? decimal : key}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

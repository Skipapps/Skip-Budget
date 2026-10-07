import { Delete } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { numberMarks, t } from '@/i18n';
import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';

/** Key identities, not faces: '.' is the decimal key in every language and is drawn with its mark. */
export const AMOUNT_KEYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '.',
  '0',
  'delete',
] as const;

export type AmountKey = (typeof AMOUNT_KEYS)[number];

/** Nine whole digits — $999,999,999.99 fits a 375pt screen and no budget needs more. */
const MAX_WHOLE_DIGITS = 9;

/**
 * One keystroke against the draft amount. Nothing rounds or pre-fills, and the cap applies to
 * *appended* keystrokes only: a longer figure loaded from a record is never truncated.
 */
export function applyAmountKey(current: string, key: AmountKey): string {
  if (key === 'delete') return current.slice(0, -1);
  if (key === '.') return current.includes('.') ? current : `${current || '0'}.`;

  const [whole, fraction] = current.split('.');
  if (fraction !== undefined && fraction.length >= 2) return current;
  if (current === '0') return key;
  if (fraction === undefined && whole.length >= MAX_WHOLE_DIGITS) return current;
  return current + key;
}

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

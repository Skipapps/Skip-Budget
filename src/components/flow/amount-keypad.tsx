import { Delete } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';

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
 * One keystroke against the draft amount.
 *
 * The rules are the ones the amount pad has always had; they only moved here
 * so the stepped flow and the modal cannot drift apart. Nothing rounds,
 * nothing is pre-filled, and the cap applies to *appended* keystrokes only —
 * a longer figure loaded from an existing record is never truncated, because
 * silently shortening money somebody already saved would be a lie about it.
 */
export function applyAmountKey(current: string, key: AmountKey): string {
  if (key === 'delete') return current.slice(0, -1);
  // One decimal point, and at most two digits after it.
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

/** The 4x3 layout, read off the one list of keys rather than written again. */
const KEY_ROWS: AmountKey[][] = [
  AMOUNT_KEYS.slice(0, 3),
  AMOUNT_KEYS.slice(3, 6),
  AMOUNT_KEYS.slice(6, 9),
  AMOUNT_KEYS.slice(9, 12),
];

/**
 * The twelve tiles. Tonal fill, no border, no shadow — separation here comes
 * from the fill, and an outline around every key turns a keypad into a grid of
 * boxes to read rather than targets to hit.
 */
export function AmountKeypad({ onKey }: AmountKeypadProps) {
  const colors = useColors();

  return (
    <View className="w-full gap-3">
      {KEY_ROWS.map((row) => (
        <View key={row.join('')} className="w-full flex-row gap-3">
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={
                key === 'delete' ? 'Delete last digit' : key === '.' ? 'Decimal point' : key
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
                <Text allowFontScaling={false} className="font-poppins text-[26px] text-ink">
                  {key}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

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

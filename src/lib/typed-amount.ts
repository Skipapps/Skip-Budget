import { applyAmountKey, type AmountKey } from '@/lib/amount-keys';
import { numberMarks } from '@/i18n';
import { groupDigits } from '@/i18n/number';
import { toCents } from '@/lib/money';

/**
 * An amount typed into a text field rather than on the keypad. The draft stays what the keypad
 * makes, ASCII digits with "." for the decimal ("1234.5"); only what the field draws follows the
 * language ("1,234.5", "1 234,5"). Every keystroke is replayed through the keypad's own rules, so
 * the two ways of typing an amount cannot disagree about digits, decimals or the cap.
 */

/** The draft as the field draws it, grouped and with the language's decimal mark. */
export function formatDraft(draft: string): string {
  if (!draft) return '';
  const { decimal, group } = numberMarks();
  const [whole, fraction] = draft.split('.');
  const grouped = groupDigits(whole, group);
  return fraction === undefined ? grouped : `${grouped}${decimal}${fraction}`;
}

const DIGIT = /[0-9]/;

/**
 * The draft after the field's text changed from `shown` (what it drew) to `next` (what came
 * back). Characters that were already drawn are read by the language's marks, so the grouping
 * the field put in is never taken for a decimal. What was just typed is read by the keyboard's:
 * a phone set to another region sends "," or "." as its decimal key, and either is the decimal.
 * Pasted text (more than one character) is read by the language's marks.
 */
export function draftFromTyped(shown: string, next: string): string {
  const { decimal } = numberMarks();

  let start = 0;
  while (start < shown.length && start < next.length && shown[start] === next[start]) start += 1;
  let end = 0;
  while (
    end < shown.length - start &&
    end < next.length - start &&
    shown[shown.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end += 1;
  }
  const typedFrom = start;
  const typedTo = next.length - end;
  const oneKey = typedTo - typedFrom === 1;

  const keys: AmountKey[] = [];
  for (let index = 0; index < next.length; index += 1) {
    const char = next[index];
    const typed = index >= typedFrom && index < typedTo;
    if (DIGIT.test(char)) keys.push(char as AmountKey);
    else if (char === decimal) keys.push('.');
    // A "." is never a grouping mark in any language here, so pasted or typed it is the decimal.
    else if (char === '.') keys.push('.');
    else if (typed && oneKey && char === ',') keys.push('.');
  }

  return keys.reduce<string>((draft, key) => applyAmountKey(draft, key), '');
}

/**
 * A worked-out amount (the calculator's "1233.3333333333333", float dust like "0.30000000000000004")
 * as a keypad draft: rounded to the cent the way amounts are posted, with no trailing zeros, and
 * empty for nothing, a negative or not a number, since none is an amount to save.
 */
export function draftFromAmount(text: string): string {
  const cents = toCents(Number(text));
  if (!text.trim() || cents <= 0) return '';
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100)
    .padStart(2, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

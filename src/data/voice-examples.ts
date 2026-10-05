/**
 * The three hints the voice page shows above its mic, one per kind Skip can add, as plain data.
 *
 * They are a promise: each one parses to exactly its bold values. src/lib/voice/catalog.test.ts
 * parses every sentence against the real brand catalog, so the screen and the parser cannot drift.
 * Amounts are digits with a $, because that is how iOS writes them down. If one stops parsing,
 * change the hint, not the parser's promise.
 */

/** A run of a sentence; `strong` marks what Skip picks up from it. */
export type VoiceExamplePart = { text: string; strong?: boolean };

export type VoiceExample = {
  /** What it adds: the kind the parser must read it as. */
  kind: 'receipt' | 'bill' | 'subscription';
  parts: VoiceExamplePart[];
};

const b = (text: string): VoiceExamplePart => ({ text, strong: true });
const t = (text: string): VoiceExamplePart => ({ text });

/** In the order the page stacks them: a receipt, a bill, a subscription. */
export const VOICE_EXAMPLES: VoiceExample[] = [
  {
    kind: 'receipt',
    parts: [t('Spent '), b('$12.50'), t(' at '), b('Starbucks'), t(' '), b('today')],
  },
  { kind: 'bill', parts: [b('Electric bill'), t(' '), b('$85'), t(', due '), b('on the 15th')] },
  { kind: 'subscription', parts: [b('Netflix'), t(' '), b('$15.99'), t(' '), b('every month')] },
];

/** The sentence as plain words, for the screen reader and for tests. */
export function sentenceText(parts: VoiceExamplePart[]): string {
  return parts.map((part) => part.text).join('');
}

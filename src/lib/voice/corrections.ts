/**
 * Self-corrections, slot by slot. "Paid forty, no, fifty bucks for Comcast yesterday" corrects the
 * amount and nothing else. Each value found by the other rules is a span with a slot (amount, date,
 * merchant, cycle, category); a correction removes only earlier spans of the slot it corrects.
 *
 * - **Strong triggers** ("no wait", "actually", "I mean", "sorry", "scratch that", "make that",
 *   "or rather", "hold on", "oops") correct the slot of the next value said, within three words
 *   ("actually it was 45"). With no earlier value of that slot, nothing is removed.
 * - **A bare "no"** is a correction only between two values of the same slot, side by side ("forty
 *   no fifty", "Walmart no Target"). Anywhere else it is just a word ("No Frills groceries 40").
 * - **"not"** between two values of the same slot drops the second: "forty not fifty" is forty.
 */
import type { Token } from './clean';

export type Slot = 'amount' | 'date' | 'merchant' | 'cycle' | 'category';

export type SlotSpan = { slot: Slot; start: number; end: number };

const STRONG: string[][] = [
  ['no', 'wait'],
  ['wait', 'no'],
  ['no', 'sorry'],
  ['no', 'no'],
  ['scratch', 'that'],
  ['make', 'that'],
  ['make', 'it'],
  ['or', 'rather'],
  ['hold', 'on'],
  ['i', 'mean'],
  ['i', 'meant'],
  ['wait'],
  ['actually'],
  ['sorry'],
  ['correction'],
  ['oops'],
];

/** Words allowed between a bare "no" and the value it brings: "forty, no, it was fifty". */
const GLUE = new Set(['it', 'its', 'was', 'is', 'that', 'the', 'i', 'meant', 'mean']);

const STRONG_REACH = 3;
const GLUE_REACH = 2;

/** The spans a correction overrules. The caller drops them and reads each slot from the rest. */
export function overruledSpans(
  tokens: readonly Token[],
  spans: readonly SlotSpan[],
): Set<SlotSpan> {
  const removed = new Set<SlotSpan>();
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const covered = new Array<boolean>(tokens.length).fill(false);
  for (const span of spans) {
    for (let index = span.start; index < span.end; index += 1) covered[index] = true;
  }

  const live = (span: SlotSpan) => !removed.has(span);
  const nextAfter = (from: number, reach: number, glueOnly: boolean): SlotSpan | null => {
    const next = sorted.find((span) => live(span) && span.start >= from);
    if (!next || next.start - from > reach) return null;
    if (glueOnly) {
      for (let index = from; index < next.start; index += 1) {
        if (!GLUE.has(tokens[index].key)) return null;
      }
    }
    return next;
  };
  const endingAt = (index: number): SlotSpan | null =>
    [...sorted].reverse().find((span) => live(span) && span.end === index) ?? null;

  for (let index = 0; index < tokens.length; index += 1) {
    if (covered[index]) continue;

    const strong = STRONG.find((words) =>
      words.every(
        (word, offset) => !covered[index + offset] && tokens[index + offset]?.key === word,
      ),
    );
    if (strong) {
      const end = index + strong.length;
      const next = nextAfter(end, STRONG_REACH, false);
      if (next) {
        for (const span of sorted) {
          if (span.slot === next.slot && span.end <= index && live(span)) removed.add(span);
        }
      }
      index = end - 1;
      continue;
    }

    const key = tokens[index].key;
    if (key === 'no' || key === 'nope' || key === 'not') {
      const previous = endingAt(index);
      const next = nextAfter(index + 1, GLUE_REACH, true);
      if (previous && next && previous.slot === next.slot) {
        removed.add(key === 'not' ? next : previous);
      }
    }
  }
  return removed;
}

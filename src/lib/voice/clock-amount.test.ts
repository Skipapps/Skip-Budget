import { parseVoice } from './parse';
import { DIRECTORY, TODAY } from './test-fixtures';

/**
 * Review L1: only a real clock reading is read as an amount.
 *
 * iOS sometimes writes "twelve fifty" as "12:50", so a clock time is offered
 * as both readings ($12.50 or $1,250). "99:99", "12:60" or "24:30" are not
 * times anyone said, and must not be offered as money at all.
 *
 * Kept in its own file (by Diego, on the CEO's L1 assignment) so it could not
 * collide with Drew's edits to parse.test.ts; fold it in whenever convenient.
 */

const ctx = { today: TODAY, directory: DIRECTORY, aliases: {} };

describe('clock times as amounts', () => {
  it.each(['Spent 99:99 at Target', 'Spent 12:60 at Target', 'Spent 24:30 at Target'])(
    'offers nothing for %p',
    (said) => {
      const draft = parseVoice([said], ctx);
      expect(draft.amount).toBeNull();
      expect(draft.amountChoices).toEqual([]);
      expect(draft.missing).toContain('amount');
    },
  );

  it('still offers both readings of a real one', () => {
    const draft = parseVoice(['Spent 12:50 at Starbucks'], ctx);
    expect(draft.amountChoices).toEqual([12.5, 1250]);
    expect(draft.missing).toContain('amount');
  });

  it('reads the edges of the clock', () => {
    expect(parseVoice(['Spent 1:00 at Target'], ctx).amountChoices).toEqual([1, 100]);
    expect(parseVoice(['Spent 23:59 at Target'], ctx).amountChoices).toEqual([23.59, 2359]);
  });
});

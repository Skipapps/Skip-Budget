import { faceAt, planTurn } from '@/lib/odometer';

const LINE = 20;

/** What the window actually shows at each end of the turn. */
const shows = (turn: ReturnType<typeof planTurn>, offset: number) =>
  turn.faces[faceAt(offset, LINE)];

describe('planTurn', () => {
  it('starts on the digit being left and ends on the new one', () => {
    for (let from = 0; from < 10; from += 1) {
      for (let to = 0; to < 10; to += 1) {
        if (from === to) continue;
        for (const forwards of [true, false]) {
          const turn = planTurn(from, to, forwards, LINE);
          expect(shows(turn, turn.startOffset)).toBe(from);
          expect(shows(turn, turn.endOffset)).toBe(to);
        }
      }
    }
  });

  it('crosses one face per digit and never more than a full turn', () => {
    expect(planTurn(7, 8, true, LINE).faces).toEqual([7, 8]);
    expect(planTurn(8, 7, false, LINE).faces).toEqual([7, 8]);
    expect(planTurn(2, 7, true, LINE).faces).toEqual([2, 3, 4, 5, 6, 7]);

    for (let from = 0; from < 10; from += 1) {
      for (let to = 0; to < 10; to += 1) {
        if (from === to) continue;
        for (const forwards of [true, false]) {
          const { faces } = planTurn(from, to, forwards, LINE);
          expect(faces.length).toBeGreaterThanOrEqual(2);
          expect(faces.length).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('crosses the 9-to-0 seam in one step, not nine', () => {
    // Counting up past 9 is a single step forwards.
    expect(planTurn(9, 0, true, LINE).faces).toEqual([9, 0]);
    // And counting down past 0 is a single step back.
    expect(planTurn(0, 9, false, LINE).faces).toEqual([9, 0]);
  });

  it('travels up when the figure grew and down when it shrank', () => {
    for (let from = 0; from < 10; from += 1) {
      for (let to = 0; to < 10; to += 1) {
        if (from === to) continue;
        // Up: the strip slides so later faces come into view from below.
        expect(planTurn(from, to, true, LINE).endOffset).toBeLessThan(
          planTurn(from, to, true, LINE).startOffset,
        );
        expect(planTurn(from, to, false, LINE).endOffset).toBeGreaterThan(
          planTurn(from, to, false, LINE).startOffset,
        );
      }
    }
  });

  it('keeps every face inside the strip it built', () => {
    for (let from = 0; from < 10; from += 1) {
      for (let to = 0; to < 10; to += 1) {
        if (from === to) continue;
        for (const forwards of [true, false]) {
          const turn = planTurn(from, to, forwards, LINE);
          for (const offset of [turn.startOffset, turn.endOffset]) {
            const index = faceAt(offset, LINE);
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(turn.faces.length);
          }
        }
      }
    }
  });
});

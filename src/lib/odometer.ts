/**
 * What one digit wheel does when the figure changes.
 *
 * A wheel only ever shows the faces it actually crosses. Rendering a full
 * 0–9 strip per digit is the obvious way to build this and the wrong one: a
 * dashboard carries dozens of digits, and at thirty faces each that is over a
 * thousand text nodes standing by to do nothing. Most turns cross a single
 * face, so the strip is built per turn and thrown away after.
 */

export type Turn = {
  /** Faces top to bottom. Ascending mod 10 whichever way the wheel turns. */
  faces: number[];
  /** Vertical offset showing the outgoing digit. */
  startOffset: number;
  /** Vertical offset showing the incoming one. */
  endOffset: number;
};

/** Which face a given offset puts in the window. */
export function faceAt(offset: number, lineHeight: number): number {
  return Math.round(-offset / lineHeight);
}

/**
 * Plans the turn from one digit to another.
 *
 * Direction comes from the whole figure, not the digit: going 199 to 200 the
 * tens wheel reads 9 to 0, which is forwards, and deciding that locally would
 * wind it back through every number in between.
 *
 * Counting up, the incoming digit arrives from below, so the strip starts on
 * the outgoing face and travels up. Counting down it is the other way about —
 * but the faces are listed ascending either way, because that is what makes a
 * wheel read as one continuous surface rather than two.
 */
export function planTurn(from: number, to: number, forwards: boolean, lineHeight: number): Turn {
  const steps = forwards ? (to - from + 10) % 10 : (from - to + 10) % 10;
  const first = forwards ? from : to;
  const faces = Array.from({ length: steps + 1 }, (_, index) => (first + index) % 10);
  const travel = -steps * lineHeight;

  return {
    faces,
    startOffset: forwards ? 0 : travel,
    endOffset: forwards ? travel : 0,
  };
}

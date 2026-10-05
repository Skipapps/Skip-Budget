/**
 * What one digit wheel does when the figure changes.
 *
 * A wheel only renders the faces it crosses: a full 0–9 strip per digit would mean over a
 * thousand idle text nodes on a dashboard, and most turns cross a single face.
 */

export type Turn = {
  /** Faces top to bottom. Ascending mod 10 whichever way the wheel turns. */
  faces: number[];
  /** Vertical offset showing the outgoing digit. */
  startOffset: number;
  /** Vertical offset showing the incoming one. */
  endOffset: number;
};

export function faceAt(offset: number, lineHeight: number): number {
  return Math.round(-offset / lineHeight);
}

/**
 * Plans the turn from one digit to another.
 *
 * Direction comes from the whole figure, not the digit: going 199 to 200 the tens wheel reads
 * 9 to 0, which is forwards, and deciding locally would wind it back through every number between.
 *
 * Counting up the strip travels up; counting down it travels down. Faces are listed ascending
 * either way so the wheel reads as one continuous surface.
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

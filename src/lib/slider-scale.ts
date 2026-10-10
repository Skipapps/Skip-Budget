export type SliderScale = {
  min: number;
  max: number;
  step: number;
  /**
   * `log` spaces the track by orders of magnitude, for money ranges: on a linear 500–1,000,000 track
   * a $30k loan sits in the leftmost 3% and is undraggable. Requires min > 0.
   */
  scale: 'linear' | 'log';
};

/** Where a value sits along the track, 0–1. A value past either end waits at that end. */
export function sliderRatio(value: number, { min, max, scale }: SliderScale): number {
  const ratio =
    scale === 'log'
      ? Math.log(Math.max(value, min) / min) / Math.log(max / min)
      : (value - min) / Math.max(max - min, 0.000001);
  return Math.min(1, Math.max(0, ratio));
}

/** The value at a point along the track, 0–1, snapped and kept inside the range. */
export function sliderValue(ratio: number, { min, max, step, scale }: SliderScale): number {
  const along = Math.min(1, Math.max(0, ratio));
  let snapped: number;
  if (scale === 'log') {
    const raw = min * Math.pow(max / min, along);
    // Snap relative to magnitude, so it steps by 10s in the hundreds and by 10,000s in the
    // hundred-thousands instead of one fixed increment.
    const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1));
    snapped = Math.round(raw / magnitude) * magnitude;
  } else {
    const raw = min + along * Math.max(max - min, 0.000001);
    snapped = Math.round(raw / step) * step;
  }
  // Guard against float drift pushing the value a hair outside the range.
  return Math.min(max, Math.max(min, Number(snapped.toFixed(6))));
}

/**
 * Decides whether a colour needs dark or light type on top of it.
 *
 * Cards can be any colour from the palette, so foreground cannot be hardcoded
 * per card — it is derived from WCAG relative luminance instead.
 */
export function isLightColor(hex: string): boolean {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);

  const r = toLinear(parseInt(full.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(full.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(full.slice(4, 6), 16) / 255);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
}

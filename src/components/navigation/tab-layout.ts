/**
 * The tab bar's geometry, worked out from the window width alone.
 *
 * Every tab gets an explicit width, so nothing in the row depends on measuring text or on flex
 * shrinking: a selection change swaps two numbers and lays out the same way every time, and the
 * widths add up to no more than the bar, so it cannot overflow.
 */

/** The pill and the round Voice button beside it share this height. */
export const ROW_HEIGHT = 64;
export const TAB_HEIGHT = 48;
export const TAB_ICON = 22;
export const PILL_PADDING = 12;
export const PILL_GAP = 6;

/** The page gutter either side of the row, and the space between the bar and the Voice button. */
const GUTTER = 16;
const VOICE_GAP = 14;
/** The bar's own border and horizontal padding, each side. */
const BAR_EDGE = 1 + 7;

const ICON_MAX = 48;
const ICON_MIN = 32;
const TOUCH_TARGET = 44;

/**
 * The widest the selected pill gets: room for "Settings" whole at the largest text size the label
 * allows (77pt of label at 1.2x, measured from the app font's semibold), plus its padding, icon
 * and gap.
 * Every label is narrower, and a fixed width means the pill does not change size between tabs.
 */
const PILL_MAX = 130;

export type TabLayout = {
  /** The width inside the bar's border and padding that the tabs share. */
  inner: number;
  /** Each icon-only tab. */
  icon: number;
  /** The selected tab. */
  pill: number;
  /** The most the selected tab's label may take; beyond it the font shrinks. */
  label: number;
  /** Horizontal hit slop each side of an icon-only tab, to reach a 44pt target. */
  slop: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Widths for a bar of `routeCount` tabs on a window `windowWidth` wide. The pill takes PILL_MAX
 * when there is room and the icons share the rest, up to ICON_MAX; on a narrow window the icons
 * stop at ICON_MIN and the pill takes what is left. The widths never add up to more than `inner`
 * and none is negative; any space left over is spread between the tabs.
 */
export function tabLayout(windowWidth: number, routeCount: number): TabLayout {
  const inner = Math.max(0, windowWidth - 2 * GUTTER - VOICE_GAP - ROW_HEIGHT - 2 * BAR_EDGE);
  const icons = Math.max(0, routeCount - 1);

  const icon =
    icons === 0
      ? 0
      : Math.min(
          clamp(Math.floor((inner - PILL_MAX) / icons), ICON_MIN, ICON_MAX),
          // Only on a window narrower than any phone: keeps the pill a share of the row.
          Math.floor(inner / Math.max(routeCount, 1)),
        );
  const pill = Math.max(0, Math.min(PILL_MAX, inner - icons * icon));
  const label = Math.max(0, pill - 2 * PILL_PADDING - TAB_ICON - PILL_GAP);
  const slop = icon >= TOUCH_TARGET ? 0 : Math.ceil((TOUCH_TARGET - icon) / 2);

  return { inner, icon, pill, label, slop };
}

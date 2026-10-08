/**
 * The shape of each logo image once it has loaded, by URL. A square image is an app icon (or a tile
 * the logo service made) and is meant to fill the round frame; anything else is a wordmark, and
 * filling the frame with it would cut its corners off. Kept for the session, so a recycled row or a
 * remount draws the right size first time.
 */
const aspects = new Map<string, number>();

/** Width over height within this of 1 counts as square. */
const SQUARE_ENOUGH = 1.05;
/** A wordmark's diagonal as a share of the circle's diameter, leaving a sliver of margin. */
const CORNER_ROOM = 0.92;

/** The image's width over height, or undefined when the sizes are not usable. */
export function rememberLogoAspect(url: string, width: number, height: number): number | undefined {
  if (!(width > 0 && height > 0)) return undefined;
  const aspect = width / height;
  aspects.set(url, aspect);
  return aspect;
}

export function logoAspect(url: string | null | undefined): number | undefined {
  return url ? aspects.get(url) : undefined;
}

/** How big to draw a logo in a circle of `size`: square fills it, a wordmark fits corner to corner. */
export function logoBox(
  size: number,
  aspect: number | undefined,
): { width: number; height: number } {
  if (!aspect || (aspect <= SQUARE_ENOUGH && aspect >= 1 / SQUARE_ENOUGH)) {
    return { width: size, height: size };
  }
  const height = (size * CORNER_ROOM) / Math.hypot(aspect, 1);
  return { width: Math.round(height * aspect), height: Math.round(height) };
}

export function resetLogoShapesForTests() {
  aspects.clear();
}

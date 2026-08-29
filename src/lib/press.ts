import { tap } from '@/lib/haptics';

/**
 * Adds the press feedback to a handler, and nothing else.
 *
 * Wrapping at the primitive rather than at every call site is what keeps the
 * rule honest: haptics belong to "a control was pressed", so they live on the
 * controls. A screen that writes its own Pressable is opting out, which is
 * usually right — a card that opens a detail page is navigation, not a switch.
 *
 * Undefined in, undefined out, so a disabled or decorative row stays inert
 * instead of buzzing at a touch that does nothing.
 */
export function withTap<T extends unknown[]>(
  handler: ((...args: T) => void) | undefined,
): ((...args: T) => void) | undefined {
  if (!handler) return undefined;
  return (...args: T) => {
    tap();
    handler(...args);
  };
}

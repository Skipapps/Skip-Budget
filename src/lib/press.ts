import { tap } from '@/lib/haptics';

/**
 * Adds the press haptic to a handler. Undefined in, undefined out, so a disabled or decorative
 * row stays inert instead of buzzing.
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

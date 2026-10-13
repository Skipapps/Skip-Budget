/**
 * What a read's state means for the screen, one rule app-wide.
 *
 * TanStack keeps `isError` true after a failed background refetch while the last good answer stays
 * in `data` (a resume on a weak network refetches every mounted read). So `isError` alone cannot
 * tell "nothing to show" from "older figures still showing": `data` decides.
 */

/** The part of a TanStack read result the rules look at. */
export type ReadState = { isError: boolean; data?: unknown };

/**
 * Failed with nothing to show: the screen says the failure line instead of a figure. TanStack's
 * own `isLoadingError`. A combined result with no `data` of its own passes its `isError` through.
 */
export function failedEmpty(q: ReadState): boolean {
  return q.isError && q.data === undefined;
}

/**
 * A reload failed, but the last good answer is still showing. TanStack's own `isRefetchError`.
 * Never true for a combined result with no `data`; those carry a `refreshFailed` flag of their own.
 */
export function refreshFailed(q: ReadState): boolean {
  return q.isError && q.data !== undefined;
}

/** Whether any of the reads failed to reload while still showing its last answer. */
export function anyRefreshFailed(qs: readonly ReadState[]): boolean {
  return qs.some(refreshFailed);
}

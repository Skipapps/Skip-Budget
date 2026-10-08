/** How long a logo that would not load is drawn as letters before it is asked for again. */
export const FAILED_LOGO_RETRY_MS = 10 * 60 * 1000;

/**
 * Logo URLs that failed in the last FAILED_LOGO_RETRY_MS. A website with no logo answers 404 every
 * time, so without this every row showing it would ask again on every mount. Forgotten after the
 * wait rather than kept for the session, because a phone that was briefly offline fails the same
 * way and must get its logos back; forgotten at once when the logo service says the logo now
 * exists. Rows read it as a store, so a row on screen redraws (and asks again) when a failure is
 * forgotten, not only rows mounted later.
 */
const failedLately = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function rememberLogoFailure(url: string) {
  if (failedLately.has(url)) return;
  failedLately.add(url);
  notify();
  setTimeout(() => {
    if (failedLately.delete(url)) notify();
  }, FAILED_LOGO_RETRY_MS);
}

/** A logo that exists now: rows showing letters for it ask again straight away. */
export function forgetLogoFailure(url: string | null | undefined) {
  if (url && failedLately.delete(url)) notify();
}

export function logoFailedLately(url: string | null): boolean {
  return url ? failedLately.has(url) : false;
}

export function subscribeLogoFailures(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

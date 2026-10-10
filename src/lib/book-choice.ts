import { useEffect } from 'react';

/**
 * A book just made is shown on the receipts page underneath, which is still mounted: Back carries
 * no params, so the new-book flow tells it here.
 */
const listeners = new Set<(book: string) => void>();

export function showBookOnReturn(book: string) {
  for (const listener of listeners) listener(book);
}

/** `show` must be stable (a state setter), or it re-subscribes on every render. */
export function useBookOnReturn(show: (book: string) => void) {
  useEffect(() => {
    listeners.add(show);
    return () => {
      listeners.delete(show);
    };
  }, [show]);
}

/** "Tap to start" over Add book is shown until the person taps either. It describes this phone. */
const TIP_KEY = 'skip.receipts.bookTipSeen';

// Loaded when used: a page that only lists receipts should not need storage to be there.
const storage = async () => (await import('@react-native-async-storage/async-storage')).default;

export async function bookTipSeen(): Promise<boolean> {
  try {
    return (await (await storage()).getItem(TIP_KEY)) === '1';
  } catch {
    // Unreadable storage shows the tip, which is only a hint.
    return false;
  }
}

export function markBookTipSeen() {
  storage()
    .then((store) => store.setItem(TIP_KEY, '1'))
    .catch(() => {});
}

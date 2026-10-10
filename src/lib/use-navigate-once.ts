import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Runs one navigation per visit to this screen. In expo-router `router.back()` and `router.push()`
 * act on whatever is on top, not on the screen that called them, so a second tap before the first
 * has landed would pop the page under this one (losing its unsaved edits) or push a second copy.
 * The screen can navigate again once it is back in focus.
 */
export function useNavigateOnce(): (go: () => void) => void {
  const gone = useRef(false);
  useFocusEffect(
    useCallback(() => {
      gone.current = false;
    }, []),
  );
  return (go) => {
    if (gone.current) return;
    gone.current = true;
    go();
  };
}

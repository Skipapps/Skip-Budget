import type { Href } from 'expo-router';

/**
 * The explainer's `next`, kept only when it is a page of this app. It can arrive in a link, which
 * carries anything, and expo-router hands a web address (or `//host`) to Safari, not the stack.
 */
export function inAppNext(next: string | string[] | undefined): Href | null {
  if (typeof next !== 'string') return null;
  return /^\/(?![/\\])/.test(next) ? (next as Href) : null;
}

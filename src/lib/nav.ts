import { router } from 'expo-router';

/**
 * Crosses a one-way door: signing in, handing over to the app, signing out.
 *
 * `router.replace` swaps only the top screen and leaves everything beneath
 * it — so Home sat on top of the whole onboarding stack, and the iOS edge
 * swipe (or Android's back gesture) walked straight back out of the app
 * into the pitch, the auth screen, a checklist already finished. Popping to
 * the root first makes the destination the only screen there is: back has
 * nowhere left to go.
 */
export function resetTo(href: string): void {
  if (router.canGoBack()) router.dismissAll();
  router.replace(href as Parameters<typeof router.replace>[0]);
}

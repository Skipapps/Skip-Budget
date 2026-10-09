import { router } from 'expo-router';

/**
 * Crosses a one-way door: signing in, handing over to the app, signing out.
 *
 * `router.replace` swaps only the top screen and keeps the stack beneath it, so the back gesture
 * would walk out of the app into onboarding or auth. Popping to the root first leaves the
 * destination as the only screen.
 */
export function resetTo(href: string): void {
  // canDismiss, not canGoBack: on a tab canGoBack is true (the tab bar can go back to Home) but
  // there is no stack screen to pop, and an unhandled popToTop shows a red box in development.
  if (router.canDismiss()) router.dismissAll();
  router.replace(href as Parameters<typeof router.replace>[0]);
}

/**
 * Leaves a finished add flow for wherever it was opened from (the Cards tab), or for the Cards tab
 * when nothing is under it. The flow's steps are in the same route, so nothing goes back into them.
 */
export function leaveFlow(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/cards');
}

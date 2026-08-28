/**
 * Putting a ceiling on how long the app will wait.
 *
 * Neither Supabase nor React Query sets a deadline of its own, so a request
 * that is never answered — a dropped connection, a captive portal, a server
 * that accepted the socket and went quiet — leaves a query pending forever.
 * Nothing failed, so nothing retries, and the screen keeps its skeleton until
 * the app is force quit. These two put a floor under that.
 */

/**
 * Fails the work if it has not answered in time.
 *
 * For reads, where a timeout should look like any other error: the query goes
 * to its error state, the screen offers "try again", and the person has
 * something to act on rather than a spinner.
 */
export function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  // Cleared either way, so work that answered in time leaves no timer behind.
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Stops waiting on the work, without failing it.
 *
 * For the pull-to-refresh control, which is answering a different question: it
 * only has to say "I looked". Reads still in flight will land in the cache
 * when they land and the screen updates then, so holding the spinner open adds
 * nothing but the impression of a stuck app.
 *
 * Never rejects. A failed read has already put its own query into an error
 * state with something to retry; making the gesture that started it throw as
 * well would only produce an unhandled rejection nobody can act on.
 */
export function settleWithin(work: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  const quiet = work.then(
    () => undefined,
    () => undefined,
  );
  return Promise.race([quiet, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Neither Supabase nor React Query sets a deadline, so a request that is never answered leaves a
 * query pending forever. These two put a ceiling on the wait.
 */

/** Fails the work if it has not answered in time, so a read lands in its error state with a retry. */
export function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Stops waiting on the work without failing it, for pull-to-refresh (late reads still land in the
 * cache). Never rejects: a failed read has already put its own query into an error state.
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

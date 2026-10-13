// Skip · send-push · who may be told a payment went out
//
// Plain TypeScript with no Deno or Node globals, so the app's Jest suite can test it directly;
// index.ts imports it as `./notices.ts`.

/** The profiles read, narrowed to the accounts among `ids` that turned payment notices off. */
export type QuietRead = (
  ids: string[],
) => PromiseLike<{ data: { id: string }[] | null; error: { message: string } | null }>;

/**
 * The accounts among `userIds` that may be told a payment went out: all but those that turned
 * "Payment notices" off. When the switch cannot be read, none of them: an account that turned the
 * notices off must never get one, and a notice missed costs less than one unwanted.
 */
export async function noticeRecipients(
  userIds: readonly string[],
  readQuiet: QuietRead,
): Promise<{ allowed: Set<string>; error: string | null }> {
  if (userIds.length === 0) return { allowed: new Set(), error: null };
  const { data, error } = await readQuiet([...userIds]);
  if (error) return { allowed: new Set(), error: error.message };
  const quiet = new Set((data ?? []).map((row) => row.id));
  return { allowed: new Set(userIds.filter((id) => !quiet.has(id))), error: null };
}

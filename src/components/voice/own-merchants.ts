/**
 * The names this person has already used, for the recogniser's vocabulary.
 *
 * Receipts first and by how often the shop comes up, then bills, then
 * subscriptions; each name once, whatever its case. These are the words most
 * likely to be said next, so they lead the list the speech engine is told to
 * listen for.
 */
export function ownMerchants(
  receipts: readonly { merchant: string }[] | undefined,
  bills: readonly { name: string }[] | undefined,
  subscriptions: readonly { name: string }[] | undefined,
): string[] {
  const counts = new Map<string, { name: string; count: number; first: number }>();
  (receipts ?? []).forEach((receipt, index) => {
    const name = receipt.merchant?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    const seen = counts.get(key);
    if (seen) seen.count += 1;
    else counts.set(key, { name, count: 1, first: index });
  });

  const byFrequency = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .map((entry) => entry.name);

  const out: string[] = [];
  const taken = new Set<string>();
  for (const name of [
    ...byFrequency,
    ...(bills ?? []).map((bill) => bill.name),
    ...(subscriptions ?? []).map((subscription) => subscription.name),
  ]) {
    const tidy = name?.trim();
    if (!tidy || taken.has(tidy.toLowerCase())) continue;
    taken.add(tidy.toLowerCase());
    out.push(tidy);
  }
  return out;
}

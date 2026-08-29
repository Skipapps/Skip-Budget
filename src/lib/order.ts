/**
 * Applying a stored order to a shipped list.
 *
 * Deliberately tolerant in both directions, because the two lists drift apart
 * on their own: a release adds a tile that nobody's saved order mentions, or
 * retires one that half of them still do. Neither should produce a gap, a
 * duplicate or a lost item, and neither should need every stored row rewritten
 * on deploy.
 *
 * So the stored ids are a preference rather than an instruction — what it names
 * comes first in the order it names them, and everything else keeps its shipped
 * position behind that.
 */
export function orderByIds<T extends { id: string }>(
  items: readonly T[],
  order: readonly string[] | null | undefined,
): T[] {
  if (!order?.length) return [...items];

  const byId = new Map(items.map((item) => [item.id, item]));
  const named: T[] = [];
  const taken = new Set<string>();

  for (const id of order) {
    const item = byId.get(id);
    // Skipped rather than left as a hole: an id from a retired tile, or the
    // same id twice from a bad write.
    if (!item || taken.has(id)) continue;
    named.push(item);
    taken.add(id);
  }

  return [...named, ...items.filter((item) => !taken.has(item.id))];
}

/** The list with one item moved a step, or unchanged at either end. */
export function moveBy<T>(items: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

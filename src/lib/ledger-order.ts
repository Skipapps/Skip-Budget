/**
 * A card's or account's rows, newest first: the latest day on top, and within a day the latest
 * created first, as the receipts list orders them. Only some rows know when they were created (a
 * receipt does; a projected bill does not): those lead their day, and the rest keep the order they
 * came in, so the list never reshuffles between reads.
 */
export function newestFirst<T extends { id: string; date: string }>(
  rows: readonly T[],
  createdAt: ReadonlyMap<string, string>,
): T[] {
  return rows
    .map((row, index) => ({ row, index, created: createdAt.get(row.id) }))
    .sort((a, b) => {
      if (a.row.date !== b.row.date) return b.row.date.localeCompare(a.row.date);
      if (a.created && b.created && a.created !== b.created) {
        return b.created.localeCompare(a.created);
      }
      if (a.created && !b.created) return -1;
      if (!a.created && b.created) return 1;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

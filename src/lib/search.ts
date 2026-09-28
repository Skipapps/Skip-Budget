/**
 * Whether a label answers a search.
 *
 * Case-insensitive, and forgiving of typing: a plain letter-for-letter
 * substring hits first, and failing that the query may sit anywhere in the
 * label with a small number of letter mistakes — a swapped, missing, doubled
 * or wrong letter. "wallmart" and "walmrat" both find Walmart.
 *
 * How many mistakes depends on how much was typed: none for three letters or
 * fewer (at that length every word is one mistake from every other), one for
 * four to six, two from seven up. An empty query matches everything, so a
 * cleared search field never filters.
 */
export function matchesSearch(label: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = label.toLowerCase();
  if (hay.includes(needle)) return true;

  const allowed = needle.length >= 7 ? 2 : needle.length >= 4 ? 1 : 0;
  if (allowed === 0) return false;
  return fuzzyContains(hay, needle, allowed);
}

/**
 * Approximate substring match (Sellers' algorithm): true when `needle` sits
 * anywhere in `hay` within `max` single-letter edits. One dynamic-programming
 * column per hay character, so a forty-letter label costs a few hundred
 * comparisons — nothing, at list sizes this app sees.
 */
function fuzzyContains(hay: string, needle: string, max: number): boolean {
  const m = needle.length;
  // col[i] holds the distance between needle[0..i) and the best substring of
  // hay ending at the current position. A match may start anywhere, so the
  // empty-pattern row stays 0 the whole way along.
  const col: number[] = [];
  for (let i = 0; i <= m; i += 1) col[i] = i;

  for (let j = 1; j <= hay.length; j += 1) {
    let diagonal = col[0];
    col[0] = 0;
    for (let i = 1; i <= m; i += 1) {
      const substitution = diagonal + (needle[i - 1] === hay[j - 1] ? 0 : 1);
      diagonal = col[i];
      col[i] = Math.min(substitution, col[i] + 1, col[i - 1] + 1);
    }
    if (col[m] <= max) return true;
  }
  return false;
}

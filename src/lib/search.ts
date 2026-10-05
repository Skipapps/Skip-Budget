/**
 * Whether a label answers a search: case-insensitive, substring first, then tolerant of letter
 * mistakes ("wallmart" and "walmrat" both find Walmart). Allowed mistakes scale with the query:
 * none up to three letters (every short word is one mistake from every other), one for four to
 * six, two from seven. An empty query matches everything.
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

/** Approximate substring match (Sellers' algorithm): `needle` in `hay` within `max` edits. */
function fuzzyContains(hay: string, needle: string, max: number): boolean {
  const m = needle.length;
  // col[i] is the distance between needle[0..i) and the best substring of hay ending here. A match
  // may start anywhere, so the empty-pattern row stays 0.
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

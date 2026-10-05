/**
 * Learned corrections: "spot a fly" → "Spotify", kept on the phone.
 *
 * Pairs are an ordered array, not an object: JS lists integer-like keys ("711", "24") first, which
 * would break oldest-first eviction. A heard phrase is stored the way the parser reads text and
 * matches with or without spaces ("spotafly"), since the recogniser splits the same sound
 * differently from one day to the next.
 */
import { joinKeys, tokenize, type Token } from './clean';

export type AliasPair = [heard: string, canonical: string];

export const DEFAULT_ALIAS_CAP = 200;

/** The stored form of a heard phrase. */
export function normaliseHeard(heard: string): string {
  return tokenize(heard)
    .map((token) => token.text)
    .join(' ');
}

function squash(text: string): string {
  const tokens = tokenize(text);
  return joinKeys(tokens, 0, tokens.length);
}

/**
 * Records that `heard` meant `canonical`. A pair learned again moves to the newest end; past `cap`
 * the oldest pairs go.
 *
 * Correcting back un-learns: when `canonical` reads as the heard words themselves once normalised
 * ("target" → "Target"), any pair for those words is removed. A name that differs only in spacing
 * or an apostrophe ("joes diner" → "Joe's Diner") is a real correction and is learned.
 *
 * Returns `pairs` itself when nothing changes, so a caller can skip the write.
 *
 * **Callers: never learn when the draft's `merchantSource` is `catalog`.** The heard words were an
 * exact catalog name, so a change means the person changed their mind, not that Skip misheard.
 */
export function learnAlias(
  pairs: readonly AliasPair[],
  heard: string,
  canonical: string,
  cap: number = DEFAULT_ALIAS_CAP,
): AliasPair[] {
  const key = normaliseHeard(typeof heard === 'string' ? heard : '');
  const name = typeof canonical === 'string' ? canonical.trim() : '';
  const heardKey = squash(key);
  if (heardKey.length < 2 || !name) return pairs as AliasPair[];

  const list: readonly unknown[] = Array.isArray(pairs) ? pairs : [];
  const others = list.filter(
    (pair): pair is AliasPair =>
      Array.isArray(pair) &&
      typeof pair[0] === 'string' &&
      typeof pair[1] === 'string' &&
      squash(pair[0]) !== heardKey,
  );

  if (normaliseHeard(name) === key) {
    return others.length === list.length ? (pairs as AliasPair[]) : others;
  }

  const next: AliasPair[] = [...others, [key, name]];
  const limit = Math.max(0, Math.floor(cap));
  return next.slice(Math.max(0, next.length - limit));
}

type AliasEntry = { joined: string; canonical: string };

function entriesOf(aliases: Record<string, string> | null | undefined): AliasEntry[] {
  if (!aliases || typeof aliases !== 'object') return [];
  return Object.entries(aliases)
    .filter(([heard, canonical]) => typeof heard === 'string' && typeof canonical === 'string')
    .map(([heard, canonical]) => ({ joined: squash(heard), canonical: canonical.trim() }))
    .filter((entry) => entry.joined.length >= 2 && entry.canonical.length > 0)
    .sort((a, b) => b.joined.length - a.joined.length);
}

export type AliasSpan = { start: number; end: number; canonical: string };

const WINDOW = 6;

/** Where learned phrases were said, longest first, never across a claimed token. */
export function findAliasSpans(
  tokens: readonly Token[],
  aliases: Record<string, string> | null | undefined,
  usable: (index: number) => boolean,
): AliasSpan[] {
  const entries = entriesOf(aliases);
  if (entries.length === 0) return [];
  const byJoined = new Map<string, string>();
  for (const entry of entries)
    if (!byJoined.has(entry.joined)) byJoined.set(entry.joined, entry.canonical);

  const found: AliasSpan[] = [];
  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = Math.min(WINDOW, tokens.length - start); length >= 1; length -= 1) {
      let free = true;
      for (let index = start; index < start + length; index += 1) free = free && usable(index);
      if (!free) continue;
      const canonical = byJoined.get(joinKeys(tokens, start, start + length));
      if (canonical !== undefined) {
        found.push({ start, end: start + length, canonical });
        start += length - 1;
        break;
      }
    }
  }
  return found;
}

/** The cleaned text with each learned phrase swapped for its name. */
export function applyAliases(text: string, aliases: Record<string, string>): string {
  const tokens = tokenize(typeof text === 'string' ? text : '');
  const spans = findAliasSpans(tokens, aliases, () => true);
  const words: string[] = [];
  for (let index = 0; index < tokens.length;) {
    const span = spans.find((candidate) => candidate.start === index);
    if (span) {
      words.push(span.canonical);
      index = span.end;
    } else {
      words.push(tokens[index].text);
      index += 1;
    }
  }
  return words.join(' ');
}

/**
 * Contextual strings for the recogniser, so the engine leans toward "Netflix" over "net flicks".
 *
 * Order is priority, because the list is capped at 100 (Apple's guidance for
 * SFSpeechRecognitionRequest.contextualStrings): the person's own merchants first (most-used
 * first), then the kind words, then the directory's brand names in rank order.
 */
import type { BrandRow } from './types';

export const VOCABULARY_CAP = 100;

const KIND_PHRASES = [
  'receipt',
  'bill',
  'subscription',
  'rent',
  'mortgage',
  'electric bill',
  'water bill',
  'internet bill',
  'phone bill',
  'insurance',
  'due',
  'renews',
  'every month',
  'monthly',
  'yearly',
  'weekly',
];

export function voiceVocabulary(directory: readonly BrandRow[], own: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (phrase: unknown) => {
    if (typeof phrase !== 'string' || out.length >= VOCABULARY_CAP) return;
    const trimmed = phrase.trim().replace(/\s+/g, ' ');
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  for (const name of Array.isArray(own) ? own : []) add(name);
  for (const phrase of KIND_PHRASES) add(phrase);
  for (const brand of Array.isArray(directory) ? directory : []) add(brand?.name);
  return out;
}

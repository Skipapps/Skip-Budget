import { FALLBACK_GLYPH, GLYPHS, type Glyph } from '@/data/glyphs';

/**
 * Every glyph the app ships, for a group. Bills get a shorter list because their category implies
 * the icon; a group is named by its maker, so it gets the whole set, roughly by likelihood.
 */
export const GROUP_ICON_CHOICES: { id: string; icon: Glyph }[] = [
  'housing',
  'travel',
  'coffee',
  'shopping',
  'transport',
  'family',
  'pets',
  'energy',
  'water',
  'internet',
  'mobile',
  'tv',
  'music',
  'software',
  'health',
  'education',
  'insurance',
  'loans',
  'waste',
  'other',
].map((id) => ({ id, icon: GLYPHS[id] }));

const BY_ID = new Map(GROUP_ICON_CHOICES.map((choice) => [choice.id, choice.icon]));

/** The neutral glyph, and what a retired id falls back to. */
export const FALLBACK_GROUP_ICON = FALLBACK_GLYPH;

export function groupIconFor(iconId: string | null | undefined): Glyph {
  return (iconId ? BY_ID.get(iconId) : undefined) ?? FALLBACK_GROUP_ICON;
}

/**
 * Tints for the icon well. The background is the same hue at low alpha so it tints whatever is
 * behind it, which keeps one set working on both a white and a near-black surface.
 */
export const GROUP_TINTS = [
  { bg: 'rgba(244,121,90,0.16)', fg: '#E2643F' },
  { bg: 'rgba(79,168,232,0.16)', fg: '#3E8FCC' },
  { bg: 'rgba(139,123,245,0.16)', fg: '#7B6AE0' },
  { bg: 'rgba(156,194,46,0.18)', fg: '#7C9C1F' },
  { bg: 'rgba(62,140,116,0.16)', fg: '#37836B' },
  { bg: 'rgba(232,145,59,0.16)', fg: '#CE7A26' },
  { bg: 'rgba(232,106,155,0.16)', fg: '#D65A8B' },
  { bg: 'rgba(201,162,78,0.18)', fg: '#A9843A' },
] as const;

/**
 * A stable tint for a group, derived from its id (not its icon) so two flats with the same house
 * glyph still look different. Derived rather than stored: no column, and no older group lacks one.
 */
export function groupTint(groupId: string | null | undefined) {
  if (!groupId) return GROUP_TINTS[0];

  let hash = 0;
  for (let index = 0; index < groupId.length; index += 1) {
    hash = (hash * 31 + groupId.charCodeAt(index)) >>> 0;
  }
  return GROUP_TINTS[hash % GROUP_TINTS.length];
}

import fs from 'node:fs';
import path from 'node:path';

import { HABIT_ICON_ART } from '@/data/habit-icon-art';
import {
  FALLBACK_HABIT_ICON,
  HABIT_ICON_CATEGORIES,
  HABIT_ICONS,
  habitIcon,
} from '@/data/habit-icons';
import { LANGUAGES } from '@/i18n/config';
import { MESSAGES } from '@/i18n/messages';

/*
 * Jest has no SVG transformer, so each drawing imports as a number here. The drawings themselves
 * are checked by reading the files and the import lines.
 */

const ROOT = path.join(__dirname, '..', '..', '..');
const ICON_DIR = path.join(ROOT, 'assets', 'habit-icons');
const ART_SOURCE = fs.readFileSync(path.join(ROOT, 'src', 'data', 'habit-icon-art.ts'), 'utf8');

const camel = (kebab: string) =>
  kebab.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Every spend_categories id the migrations insert: what receipts.category_id can point at. */
function spendCategoryIds(): Set<string> {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const ids = new Set<string>();
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const block of sql.matchAll(
      /insert into public\.spend_categories[^;]*?values([^;]*?)on conflict/gi,
    )) {
      for (const row of block[1].matchAll(/\(\s*'([a-z_-]+)'\s*,/g)) ids.add(row[1]);
    }
  }
  return ids;
}

function svgFilesOnDisk(): string[] {
  return fs
    .readdirSync(ICON_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((folder) =>
      fs
        .readdirSync(path.join(ICON_DIR, folder.name))
        .filter((name) => name.endsWith('.svg'))
        .map((name) => `${folder.name}/${name.replace(/\.svg$/, '')}`),
    )
    .sort();
}

const IDS = HABIT_ICONS.map((icon) => icon.id);

describe('the habit icon registry', () => {
  it('has the 13 groups, food first and goals last', () => {
    expect(HABIT_ICON_CATEGORIES.map((category) => category.id)).toEqual([
      'food-dining',
      'transport',
      'shopping',
      'entertainment',
      'health',
      'fitness',
      'wellness',
      'home-bills',
      'family-pets',
      'relationships',
      'learning-growth',
      'finance',
      'goals',
    ]);
  });

  it('has exactly 100 icons with unique ids, each filed under its own group', () => {
    expect(HABIT_ICONS).toHaveLength(100);
    expect(new Set(IDS).size).toBe(100);
    for (const category of HABIT_ICON_CATEGORIES) {
      expect(category.icons.length).toBeGreaterThan(0);
      for (const icon of category.icons) {
        expect(icon.id).toMatch(/^[a-z]+(-[a-z]+)*\/[a-z]+(-[a-z]+)*$/);
        expect(icon.id.startsWith(`${category.id}/`)).toBe(true);
      }
    }
    expect(HABIT_ICON_CATEGORIES.map((category) => category.icons.length)).toEqual([
      10, 7, 8, 7, 8, 5, 9, 10, 5, 2, 8, 6, 15,
    ]);
  });

  it('resolves every id to its own icon, and nothing else', () => {
    for (const icon of HABIT_ICONS) expect(habitIcon(icon.id)).toBe(icon);
    expect(habitIcon('food-dining/caviar')).toBeUndefined();
    expect(habitIcon('coffee')).toBeUndefined();
    expect(habitIcon('')).toBeUndefined();
    expect(habitIcon(null)).toBeUndefined();
    expect(habitIcon(undefined)).toBeUndefined();
  });

  it('falls back to "Other"', () => {
    expect(FALLBACK_HABIT_ICON).toBe(habitIcon('goals/other'));
  });

  it('has every icon the presets name', () => {
    for (const id of [
      'food-dining/coffee',
      'food-dining/breakfast',
      'food-dining/lunch-out',
      'food-dining/fast-food',
      'food-dining/snacks-sweets',
      'transport/taxi-rides',
      'shopping/online-shopping',
      'food-dining/alcohol-nightlife',
      'food-dining/soft-drinks',
      'food-dining/dinner-out',
    ]) {
      expect(habitIcon(id)?.id).toBe(id);
    }
  });

  it('gives each group a distinct light and dark tint', () => {
    const hex = /^#[0-9A-F]{6}$/;
    for (const { tint } of HABIT_ICON_CATEGORIES) {
      expect(tint.light).toMatch(hex);
      expect(tint.dark).toMatch(hex);
    }
    expect(new Set(HABIT_ICON_CATEGORIES.map(({ tint }) => tint.light)).size).toBe(13);
    expect(new Set(HABIT_ICON_CATEGORIES.map(({ tint }) => tint.dark)).size).toBe(13);
  });
});

describe('habit icon names', () => {
  it('names every icon by its id, in all three languages', () => {
    for (const icon of HABIT_ICONS) {
      const [category, name] = icon.id.split('/');
      expect(icon.label).toBe(`habits.icon.${camel(category)}.${camel(name)}`);
      for (const language of LANGUAGES)
        expect(MESSAGES[icon.label][language]).toEqual(expect.any(String));
    }
  });

  it('names every group in all three languages', () => {
    for (const category of HABIT_ICON_CATEGORIES) {
      expect(category.label).toBe(`habits.category.${camel(category.id)}`);
      for (const language of LANGUAGES) {
        expect(MESSAGES[category.label][language]).toEqual(expect.any(String));
      }
    }
  });

  it('never gives two icons the same name in one language', () => {
    for (const language of LANGUAGES) {
      const names = HABIT_ICONS.map((icon) => MESSAGES[icon.label][language]);
      const repeated = names.filter((name, i) => names.indexOf(name) !== i);
      expect({ language, repeated }).toEqual({ language, repeated: [] });
    }
  });
});

describe('habit icon spend categories', () => {
  it('files every icon under a spend category the database has', () => {
    const real = spendCategoryIds();
    // The parse must be live: these ids are known to be seeded.
    for (const id of ['groceries', 'dining', 'transport', 'other', 'utilities', 'telecom']) {
      expect(real.has(id)).toBe(true);
    }
    for (const id of ['insurance', 'finance']) expect(real.has(id)).toBe(true);
    for (const icon of HABIT_ICONS) {
      expect({ id: icon.id, known: real.has(icon.spendCategory) }).toEqual({
        id: icon.id,
        known: true,
      });
    }
  });

  it('follows the agreed map: a group default, and the named exceptions', () => {
    const GROUP_DEFAULT: Record<string, string> = {
      'food-dining': 'dining',
      transport: 'transport',
      shopping: 'shopping',
      entertainment: 'entertainment',
      health: 'pharmacy',
      fitness: 'fitness',
      wellness: 'fitness',
      'home-bills': 'home',
      'family-pets': 'other',
      relationships: 'other',
      'learning-growth': 'news',
      finance: 'other',
      goals: 'other',
    };
    const EXCEPTIONS: Record<string, string> = {
      'food-dining/groceries': 'groceries',
      'shopping/clothes': 'clothing',
      'shopping/shoes': 'clothing',
      'shopping/accessories': 'clothing',
      'shopping/jewelry': 'clothing',
      'shopping/personal-care': 'beauty',
      'shopping/hair-care': 'beauty',
      'entertainment/books': 'news',
      'health/gym-membership': 'fitness',
      'family-pets/pets': 'pets',
      'home-bills/electricity': 'utilities',
      'home-bills/water-bill': 'utilities',
      'home-bills/internet': 'telecom',
      'home-bills/phone-bill': 'telecom',
      'health/health-insurance': 'insurance',
      'finance/insurance': 'insurance',
      'finance/bank-fees': 'finance',
      'finance/credit-card': 'finance',
    };
    for (const icon of HABIT_ICONS) {
      const group = icon.id.split('/')[0];
      expect({ id: icon.id, spend: icon.spendCategory }).toEqual({
        id: icon.id,
        spend: EXCEPTIONS[icon.id] ?? GROUP_DEFAULT[group],
      });
    }
  });
});

describe('habit icon drawings', () => {
  it('has one file on disk per icon, and no stray file', () => {
    expect(svgFilesOnDisk()).toEqual([...IDS].sort());
  });

  it('gives every icon its own drawing', () => {
    expect(Object.keys(HABIT_ICON_ART).sort()).toEqual([...IDS].sort());
    for (const icon of HABIT_ICONS) expect(icon.Svg).toBeDefined();

    // Each id's entry must name the binding imported from that id's own file, so two drawings
    // cannot be swapped by a typo.
    const fileOf = new Map(
      [
        ...ART_SOURCE.matchAll(
          /^import (\w+) from '\.\.\/\.\.\/assets\/habit-icons\/([a-z/-]+)\.svg';$/gm,
        ),
      ].map((match) => [match[1], match[2]]),
    );
    const entries = [...ART_SOURCE.matchAll(/^ {2}'([a-z/-]+)': (\w+),$/gm)];
    expect(fileOf.size).toBe(100);
    expect(entries).toHaveLength(100);
    for (const [, id, binding] of entries)
      expect({ id, file: fileOf.get(binding) }).toEqual({ id, file: id });
  });

  it('keeps every drawing to what react-native-svg draws: a viewBox and plain shapes', () => {
    const ALLOWED = new Set([
      'svg',
      'g',
      'path',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
    ]);
    for (const id of IDS) {
      const svg = fs.readFileSync(path.join(ICON_DIR, `${id}.svg`), 'utf8');
      const tags = [...svg.matchAll(/<([a-zA-Z][\w:-]*)/g)].map((match) => match[1]);
      expect({ id, root: tags[0] }).toEqual({ id, root: 'svg' });
      expect({ id, unsupported: tags.filter((tag) => !ALLOWED.has(tag)) }).toEqual({
        id,
        unsupported: [],
      });
      expect({ id, viewBox: /<svg[^>]*\sviewBox="0 0 96 96"/.test(svg) }).toEqual({
        id,
        viewBox: true,
      });
      // CSS needs a <style> sheet react-native-svg does not read.
      expect({ id, css: /\s(style|class)=/.test(svg) }).toEqual({ id, css: false });
    }
  });
});

import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { billCategoryHint, billCategoryLabel } from '@/components/bills/bill-row';
import { CategoryPicker } from '@/components/bills/category-picker';
import { BILL_CATEGORIES } from '@/data/bill-categories';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The bill category grid at large text sizes in every language. A word cannot wrap, so the ten
 * names shrink together until the widest fits a two-up tile, and so do the ten hints; once either
 * would go under its default size the grid is one column. Which words are widest depends on the
 * language: English's "Transportation", Spanish's "mantenimiento", French's "Assurances".
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/theme/bill-icons', () => ({
  useBillIcons: () => new Proxy({}, { get: () => () => null }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Host = NonNullable<Screen['root']>;
type Id = (typeof BILL_CATEGORIES)[number]['id'];

/**
 * Each name's and hint's widest word at the default text size (Montserrat SemiBold 15pt and Regular
 * 12pt), summed from the font's advance widths. A larger text size multiplies them, up to the
 * control ceiling.
 */
const WIDEST: Record<Language, { label: Record<Id, number>; hint: Record<Id, number> }> = {
  en: {
    label: {
      housing: 64.78,
      energy: 77.5,
      water: 49.68,
      internet: 63.02,
      mobile: 52.29,
      insurance: 76.72,
      transport: 114.81,
      health: 60.45,
      education: 79.03,
      other: 44.9,
    },
    hint: {
      housing: 63.25,
      energy: 49.42,
      water: 39.89,
      internet: 68.06,
      mobile: 44.98,
      insurance: 41.2,
      transport: 41.38,
      health: 43.94,
      education: 46.12,
      other: 55.76,
    },
  },
  es: {
    label: {
      housing: 67.29,
      energy: 27.24,
      water: 52.74,
      internet: 63.02,
      mobile: 54.39,
      insurance: 63.09,
      transport: 84.39,
      health: 65.88,
      education: 81.39,
      other: 34.4,
    },
    hint: {
      housing: 95.1,
      energy: 70.38,
      water: 48.47,
      internet: 48.9,
      mobile: 48.19,
      insurance: 54.02,
      transport: 63.32,
      health: 62.38,
      education: 75.72,
      other: 58.37,
    },
  },
  fr: {
    label: {
      housing: 80.16,
      energy: 78.17,
      water: 62.04,
      internet: 63.02,
      mobile: 72.39,
      insurance: 88.35,
      transport: 75.06,
      health: 76.39,
      education: 79.03,
      other: 43.44,
    },
    hint: {
      housing: 76.5,
      energy: 63.24,
      water: 46.45,
      internet: 48.9,
      mobile: 54.8,
      insurance: 64.79,
      transport: 58.46,
      health: 84,
      education: 50.6,
      other: 30.04,
    },
  },
};

/**
 * The grid takes the page's width less its 24pt margins. A two-up tile is 47.5% of it, and its text
 * has that less 16pt of padding and 1pt of border a side; a one-column tile has the whole width.
 */
function room(window: number) {
  const grid = window - 48;
  return { grid, twoUp: grid * 0.475 - 34, oneColumn: grid - 34 };
}

function phone(width: number, fontScale: number) {
  const window = { width, height: 812, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

const tile = (screen: Screen, id: Id) =>
  screen.getByLabelText(`${billCategoryLabel(id)}. ${billCategoryHint(id)}`);

/** A tile's share of the row: 47.5% two-up, 100% in one column. */
const tileWidth = (screen: Screen, id: Id) =>
  StyleSheet.flatten(tile(screen, id).props.style as StyleProp<ViewStyle>)?.width;

const oneColumn = (screen: Screen) => tileWidth(screen, 'transport') === '100%';

/**
 * One layout pass at the tiles' current width: every name's and hint's room and widest word, then
 * the two group boxes. Delivered together, as the phone delivers one pass's layout events.
 */
async function layOut(screen: Screen, language: Language, width: number, fontScale: number) {
  const grow = Math.min(fontScale, TEXT_CAP.control);
  const space = room(width);
  const slot = oneColumn(screen) ? space.oneColumn : space.twoUp;
  const hidden = { includeHiddenElements: true };
  const widths: [Host, number][] = [];
  for (const { id } of BILL_CATEGORIES) {
    for (const part of ['label', 'hint'] as const) {
      widths.push([screen.getByTestId(`fit-slot-${id}-${part}`, hidden), slot]);
      widths.push([
        screen.getByTestId(`fit-copy-${id}-${part}`, hidden),
        WIDEST[language][part][id as Id] * grow,
      ]);
    }
  }
  widths.push([screen.getByTestId('category-picker'), space.grid]);
  // The hints' group box is the grid itself, the row the tiles wrap in.
  const grid = tile(screen, 'housing').parent;
  if (!grid) throw new Error('no grid');
  widths.push([grid, space.grid]);

  await act(async () => {
    for (const [node, width] of widths) {
      const onLayout = node.props.onLayout as (event: unknown) => void;
      onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });
    }
  });
}

/** Lays the grid out, then once more at whatever width its tiles took, as the phone would. */
async function settle(screen: Screen, language: Language, width: number, fontScale: number) {
  await layOut(screen, language, width, fontScale);
  await layOut(screen, language, width, fontScale);
}

const sizesOf = (screen: Screen, part: 'label' | 'hint') =>
  new Set(
    BILL_CATEGORIES.map(({ id }) => {
      const text = part === 'label' ? billCategoryLabel(id) : billCategoryHint(id);
      return StyleSheet.flatten(screen.getByText(text).props.style).fontSize as number;
    }),
  );

async function picker(language: Language, width: number, fontScale: number, onSelect = jest.fn()) {
  phone(width, fontScale);
  setLanguage(language);
  const screen = await render(<CategoryPicker onSelect={onSelect} />);
  await settle(screen, language, width, fontScale);
  return screen;
}

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

type Expected = { columns: 1 | 2; label: number; hint: number };

// The default size of a 375pt phone, its largest control size, and the same at 320pt (Display Zoom).
const CASES: [Language, number, number, Expected][] = [
  ['en', 375, 1, { columns: 2, label: 15, hint: 12 }],
  ['es', 375, 1, { columns: 2, label: 15, hint: 12 }],
  ['fr', 375, 1, { columns: 2, label: 15, hint: 12 }],
  // "Transportation" needs 149pt of a 121pt tile: every name shrinks to 0.8 together, 15.6pt drawn.
  ['en', 375, 1.3, { columns: 2, label: 12, hint: 12 }],
  // "mantenimiento" takes the hints to 0.97, still above their 12pt.
  ['es', 375, 1.3, { columns: 2, label: 15, hint: 11.64 }],
  ['fr', 375, 1.3, { columns: 2, label: 15, hint: 12 }],
  ['en', 375, 3.1, { columns: 2, label: 12, hint: 12 }],
  // At 320pt the names would go under their size: one column, at full size.
  ['en', 320, 1.3, { columns: 1, label: 15, hint: 12 }],
  ['es', 320, 1.3, { columns: 1, label: 15, hint: 12 }],
  ['fr', 320, 1.3, { columns: 2, label: 12.3, hint: 10.32 }],
  ['en', 320, 1, { columns: 1, label: 15, hint: 12 }],
  // "mantenimiento" is a point too wide for a 320pt two-up tile at the default size.
  ['es', 320, 1, { columns: 1, label: 15, hint: 12 }],
];

describe.each(CASES)('in %s at %ipt and %fx', (language, width, fontScale, expected) => {
  it(`is ${expected.columns === 2 ? 'two-up' : 'one column'}, every name and every hint at one size`, async () => {
    const screen = await picker(language, width, fontScale);

    expect(oneColumn(screen)).toBe(expected.columns === 1);
    for (const { id } of BILL_CATEGORIES) {
      expect(tileWidth(screen, id as Id)).toBe(expected.columns === 2 ? '47.5%' : '100%');
    }
    for (const part of ['label', 'hint'] as const) {
      const sizes = [...sizesOf(screen, part)];
      expect(sizes).toHaveLength(1);
      expect(sizes[0]).toBeCloseTo(expected[part], 6);
    }
  });
});

describe.each(['en', 'es', 'fr'] as const)('in %s', (language) => {
  it('writes every name and hint whole, in the language, on the control ceiling', async () => {
    const screen = await picker(language, 375, 1.3);

    for (const { id } of BILL_CATEGORIES) {
      for (const text of [billCategoryLabel(id), billCategoryHint(id)]) {
        const node = screen.getByText(text);
        expect(node.props.numberOfLines).toBeUndefined();
        expect(node.props.adjustsFontSizeToFit).toBeUndefined();
        expect(node.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
      }
    }
    const lines = screen
      .getAllByRole('button')
      .map((button) => String(button.props.accessibilityLabel));
    expect(lines).toHaveLength(BILL_CATEGORIES.length);
    expect(lines.filter((line) => /^[a-z]{2,}\.[a-zA-Z]{2,}\.|\{\w+\}/.test(line))).toEqual([]);
  });

  it('hands back the category itself, not the words on its tile', async () => {
    const onSelect = jest.fn();
    const screen = await picker(language, 320, 1.3, onSelect);
    await fireEvent.press(tile(screen, 'transport'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'transport' }));
  });
});

it('stays one column once its tiles have room, rather than going back and forth', async () => {
  const screen = await picker('en', 320, 1.3);
  expect(oneColumn(screen)).toBe(true);

  // Judged from the one-column tiles, "Transportation" would fit two-up; the grid holds.
  await layOut(screen, 'en', 320, 1.3);
  await layOut(screen, 'en', 320, 1.3);
  expect(oneColumn(screen)).toBe(true);
});

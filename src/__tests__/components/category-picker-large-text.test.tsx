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
 * language: English's "Transportation", Spanish's "estacionamiento", French's "Assurances".
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

type Screen = Awaited<ReturnType<typeof render>>;
type Host = NonNullable<Screen['root']>;
type Id = (typeof BILL_CATEGORIES)[number]['id'];

/**
 * Each name's and hint's widest word at the default text size (Montserrat Medium 14pt and Regular
 * 11pt), summed from the font's advance widths. A larger text size multiplies them, up to the
 * control ceiling.
 */
const WIDEST: Record<Language, { label: Record<Id, number>; hint: Record<Id, number> }> = {
  en: {
    label: {
      housing: 59.85,
      energy: 70.81,
      water: 45.51,
      internet: 57.88,
      mobile: 48.19,
      insurance: 70.57,
      loans: 43.54,
      transport: 105.35,
      family: 78.22,
      other: 41.4,
    },
    hint: {
      housing: 57.98,
      energy: 45.3,
      water: 46.56,
      internet: 61.56,
      mobile: 55.49,
      insurance: 37.76,
      loans: 47.66,
      transport: 45.2,
      family: 54.68,
      other: 33.75,
    },
  },
  es: {
    label: {
      housing: 61.63,
      energy: 25.09,
      water: 48.52,
      internet: 57.88,
      mobile: 49.95,
      insurance: 58.04,
      loans: 76.3,
      transport: 77.42,
      family: 52.15,
      other: 50.69,
    },
    hint: {
      housing: 87.17,
      energy: 64.52,
      water: 44.43,
      internet: 44.83,
      mobile: 39.38,
      insurance: 49.52,
      loans: 72.94,
      transport: 95.35,
      family: 70.14,
      other: 44.52,
    },
  },
  fr: {
    label: {
      housing: 74.13,
      energy: 71.55,
      water: 57.02,
      internet: 57.88,
      mobile: 66.33,
      insurance: 80.98,
      loans: 41.55,
      transport: 68.85,
      family: 52.35,
      other: 50.89,
    },
    hint: {
      housing: 70.12,
      energy: 57.97,
      water: 42.58,
      internet: 44.83,
      mobile: 59.14,
      insurance: 59.39,
      loans: 60.62,
      transport: 84.71,
      family: 54.68,
      other: 55.01,
    },
  },
};

/**
 * The grid takes the page's width less its 24pt margins. A two-up tile is 47.5% of it, and its text
 * has that less 14pt of padding and 1pt of border a side; a one-column tile has the whole width.
 */
function room(window: number) {
  const grid = window - 48;
  return { grid, twoUp: grid * 0.475 - 30, oneColumn: grid - 30 };
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
  ['en', 375, 1, { columns: 2, label: 14, hint: 11 }],
  ['es', 375, 1, { columns: 2, label: 14, hint: 11 }],
  ['fr', 375, 1, { columns: 2, label: 14, hint: 11 }],
  // "Transportation" needs 137pt of a 124pt tile: every name shrinks to 0.9 together.
  ['en', 375, 1.3, { columns: 2, label: 12.6, hint: 11 }],
  ['es', 375, 1.3, { columns: 2, label: 14, hint: 11 }],
  ['fr', 375, 1.3, { columns: 2, label: 14, hint: 11 }],
  ['en', 375, 3.1, { columns: 2, label: 12.6, hint: 11 }],
  // At 320pt it would take 0.71, under the default size: one column, at full size.
  ['en', 320, 1.3, { columns: 1, label: 14, hint: 11 }],
  // "estacionamiento" takes the hints to 0.79 (11.3pt as drawn), still above 11pt.
  ['es', 320, 1.3, { columns: 2, label: 13.58, hint: 8.69 }],
  ['fr', 320, 1.3, { columns: 2, label: 13.02, hint: 9.79 }],
  ['en', 320, 1, { columns: 1, label: 14, hint: 11 }],
  ['es', 320, 1, { columns: 2, label: 14, hint: 11 }],
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

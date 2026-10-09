import { fireEvent, render, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { QuickActions } from '@/components/dashboard/quick-actions';
import { MIN_TEXT_SIZE } from '@/theme/text-scale';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ accentInk: '#0000FF', muted: '#777777' }),
}));

// Each gradient icon stands in as a view named after it; the drawings have suites of their own.
jest.mock('@/theme/home-icons', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const icons = new Proxy(
    {},
    { get: (_, name) => () => createElement(View, { testID: `icon-${String(name)}` }) },
  );
  return { useHomeIcons: () => icons };
});

// Mirrors home.tsx's own wiring: `<QuickActions onPress={(href) => router.push(href)} />`.
const EXPECTED: { id: string; label: string; note: string; hint: string; href: string }[] = [
  {
    id: 'receipt',
    label: 'Receipt',
    note: 'Snap or type it',
    hint: 'Add a receipt',
    href: '/add-receipt',
  },
  { id: 'bill', label: 'Bill', note: 'Rent, phone, power', hint: 'Add a bill', href: '/add-bill' },
  {
    id: 'subscription',
    label: 'Subscription',
    note: 'Netflix, Spotify',
    hint: 'Add a subscription',
    href: '/add-subscription',
  },
  {
    id: 'salary',
    label: 'Salary',
    note: 'Add a payday',
    hint: 'Your salary and where it lands',
    href: '/salary',
  },
];

type Screen = Awaited<ReturnType<typeof render>>;

/** Montserrat SemiBold at 15pt, each name's widest word, from the font's advance widths. */
const NAME_AT_1: Record<string, number> = {
  receipt: 59.3,
  bill: 24.4,
  subscription: 98.0,
  salary: 47.0,
};

/** Montserrat Regular at 12pt, each note's widest word. */
const NOTE_AT_1: Record<string, number> = {
  receipt: 30.7,
  bill: 41.7,
  subscription: 41.7,
  salary: 43.5,
};

function phone(width: number, fontScale: number) {
  const window = { width, height: 844, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

/**
 * One layout pass at a text scale: each name's and note's room (the tile less its padding) and its
 * measured widest word, then the boxes around the tiles.
 */
async function layOut(screen: Screen, box: number, room: number, fontScale: number) {
  for (const { id } of EXPECTED) {
    await layout(screen, `fit-slot-${id}-name`, room);
    await layout(screen, `fit-copy-${id}-name`, NAME_AT_1[id] * Math.min(fontScale, 1.3));
    await layout(screen, `fit-slot-${id}-note`, room);
    await layout(screen, `fit-copy-${id}-note`, NOTE_AT_1[id] * Math.min(fontScale, 1.3));
  }
  await layout(screen, 'quick-add-notes', box);
  await layout(screen, 'quick-add', box);
}

const sizeOf = (screen: Screen, text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).fontSize as number;
const tileOf = (screen: Screen, hint: string) => screen.getByLabelText(hint);

/** Which row each tile sits in, in reading order. */
const rowsOf = (screen: Screen) =>
  screen.getAllByTestId('quick-add-row').map((row) =>
    within(row)
      .getAllByRole('button')
      .map((tile) => tile.props.accessibilityLabel),
  );

const TWO_BY_TWO = [
  ['Add a receipt', 'Add a bill'],
  ['Add a subscription', 'Your salary and where it lands'],
];

describe('QuickActions', () => {
  beforeEach(() => phone(375, 1));

  it('renders exactly the four logging shortcuts, in order, read by what each does', async () => {
    const { getAllByRole } = await render(<QuickActions onPress={() => {}} />);
    expect(getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(
      EXPECTED.map(({ hint }) => hint),
    );
  });

  it.each(EXPECTED)('routes "$label" to $href', async ({ label, hint, href }) => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = await render(<QuickActions onPress={onPress} />);

    expect(getByText(label)).toBeTruthy();
    await fireEvent.press(getByLabelText(hint));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(href);
  });

  it.each(EXPECTED)(
    'draws "$label" as designed: its gradient icon, the plus, the name and the note',
    async ({ id, label, note, hint }) => {
      const screen = await render(<QuickActions onPress={() => {}} />);
      const node = tileOf(screen, hint);
      const tile = within(node);
      const hidden = { includeHiddenElements: true };

      expect(tile.getByTestId(`icon-${id}`, hidden)).toBeTruthy();
      expect(tile.getByText(label)).toBeTruthy();
      expect(tile.getByText(note)).toBeTruthy();

      // The plus is a mark, not a second button: the whole tile is the button, and VoiceOver
      // hears the tile's label once.
      const plus = tile.getByTestId('quick-add-plus', hidden);
      expect(tile.queryByTestId('quick-add-plus')).toBeNull();
      expect(plus.props.className).toContain('rounded-full');
      expect(plus.props.className).toContain('bg-accent/10');
      expect(tile.queryAllByRole('button', hidden).filter((button) => button !== node)).toEqual([]);
    },
  );

  it('lays the four out two by two, in reading order, as cards that match their row', async () => {
    const screen = await render(<QuickActions onPress={() => {}} />);
    expect(rowsOf(screen)).toEqual(TWO_BY_TWO);

    for (const row of screen.getAllByTestId('quick-add-row')) {
      const classes = String(row.props.className).split(/\s+/);
      expect(classes).toContain('flex-row');
      // Left to stretch, so the shorter tile takes the height of the taller one.
      expect(classes.filter((name) => /^items-/.test(name))).toEqual([]);
    }
    for (const { hint } of EXPECTED) {
      const classes = String(tileOf(screen, hint).props.className).split(/\s+/);
      expect(classes).toEqual(
        expect.arrayContaining(['flex-1', 'min-w-0', 'border', 'border-line', 'bg-card']),
      );
      expect(classes.filter((name) => /^(h|min-h|max-h)-/.test(name))).toEqual([]);
    }
  });

  it('draws the names at one size and the notes at another, whole, with the control ceiling', async () => {
    const screen = await render(<QuickActions onPress={() => {}} />);
    for (const { label, note } of EXPECTED) {
      for (const [text, size] of [
        [label, 15],
        [note, 12],
      ] as const) {
        const node = screen.getByText(text);
        expect(sizeOf(screen, text)).toBe(size);
        expect(node.props.numberOfLines).toBeUndefined();
        expect(node.props.adjustsFontSizeToFit).toBeUndefined();
        expect(node.props.maxFontSizeMultiplier).toBe(1.3);
      }
    }
  });

  it('keeps the full size where the tiles have room', async () => {
    // 402pt at 1.3x: 140pt in each tile, and "Subscription" needs 127.4pt.
    phone(402, 1.3);
    const screen = await render(<QuickActions onPress={() => {}} />);
    await layOut(screen, 360, 140, 1.3);

    for (const { label, note } of EXPECTED) {
      expect(sizeOf(screen, label)).toBe(15);
      expect(sizeOf(screen, note)).toBe(12);
    }
    expect(rowsOf(screen)).toEqual(TWO_BY_TWO);
  });

  it('shrinks all four names together when "Subscription" outgrows its tile', async () => {
    // 375pt at 1.3x: 126.5pt in each tile, and "Subscription" needs 127.4pt.
    phone(375, 1.3);
    const screen = await render(<QuickActions onPress={() => {}} />);
    await layOut(screen, 333, 126.5, 1.3);

    const sizes = EXPECTED.map(({ label }) => sizeOf(screen, label));
    expect(new Set(sizes).size).toBe(1);
    // 0.98 of 15pt, drawn at 1.3x: 19.1pt.
    expect(sizes[0]).toBeCloseTo(15 * 0.98, 5);
    // The notes are a group of their own, and theirs fit.
    for (const { note } of EXPECTED) expect(sizeOf(screen, note)).toBe(12);
    expect(rowsOf(screen)).toEqual(TWO_BY_TWO);
  });

  it('stays two by two where one column used to take over, a little under the design size', async () => {
    // 320pt (Display Zoom on a small phone) at 1.3x: 99pt in each tile. Before the Founder's rule
    // this went to one column; now the names share 0.76 of 15pt, drawn at 14.8pt.
    phone(320, 1.3);
    const screen = await render(<QuickActions onPress={() => {}} />);
    await layOut(screen, 278, 99, 1.3);

    const sizes = EXPECTED.map(({ label }) => sizeOf(screen, label));
    expect(new Set(sizes).size).toBe(1);
    expect(sizes[0]).toBeCloseTo(15 * 0.76, 5);
    expect(sizes[0] * 1.3).toBeGreaterThanOrEqual(MIN_TEXT_SIZE);
    expect(rowsOf(screen)).toEqual(TWO_BY_TWO);
  });

  it('never takes a name under the 11pt floor, and still never leaves two by two', async () => {
    // A tile far narrower than any iPhone gives: the floor holds and the grid stays.
    phone(375, 1.3);
    const screen = await render(<QuickActions onPress={() => {}} />);
    await layOut(screen, 140, 50, 1.3);

    const size = sizeOf(screen, 'Subscription');
    expect(size * 1.3).toBeCloseTo(MIN_TEXT_SIZE, 1);
    expect(size * 1.3).toBeGreaterThanOrEqual(MIN_TEXT_SIZE - 0.2);
    expect(rowsOf(screen)).toEqual(TWO_BY_TWO);
  });
});

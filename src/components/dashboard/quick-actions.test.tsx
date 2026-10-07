import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { QuickActions } from '@/components/dashboard/quick-actions';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ accentInk: '#0000FF' }),
}));

// Mirrors home.tsx's own wiring: `<QuickActions onPress={(href) => router.push(href)} />`.
const EXPECTED: { id: string; label: string; hint: string; href: string }[] = [
  { id: 'receipt', label: 'Receipt', hint: 'Add a receipt', href: '/add-receipt' },
  { id: 'bill', label: 'Bill', hint: 'Add a bill', href: '/add-bill' },
  {
    id: 'subscription',
    label: 'Subscription',
    hint: 'Add a subscription',
    href: '/add-subscription',
  },
  { id: 'salary', label: 'Salary', hint: 'Your salary and where it lands', href: '/salary' },
];

type Screen = Awaited<ReturnType<typeof render>>;

/** Montserrat Medium at 15pt with the phone at 1.3x, from the font's advance widths. */
const WIDTH_AT_1_3: Record<string, number> = {
  receipt: 76.0,
  bill: 31.1,
  subscription: 125.4,
  salary: 59.8,
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

/** One layout pass: each label's room and its measured width, then the box around the tiles. */
async function layOut(screen: Screen, box: number, room: number) {
  for (const { id } of EXPECTED) {
    await layout(screen, `fit-slot-${id}`, room);
    await layout(screen, `fit-copy-${id}`, WIDTH_AT_1_3[id]);
  }
  await layout(screen, 'quick-add', box);
}

const labelOf = (screen: Screen, label: string) => screen.getByText(label);
const sizeOf = (screen: Screen, label: string) =>
  StyleSheet.flatten(labelOf(screen, label).props.style).fontSize as number;
const rowOf = (screen: Screen, hint: string) => screen.getByLabelText(hint).parent;

describe('QuickActions', () => {
  beforeEach(() => phone(375, 1.3));

  it('renders exactly the four logging shortcuts, in order', async () => {
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

  it('lays the four out two by two, in reading order', async () => {
    const screen = await render(<QuickActions onPress={() => {}} />);
    const [receipt, bill, subscription, salary] = EXPECTED.map(({ hint }) => rowOf(screen, hint));

    expect(receipt).toBe(bill);
    expect(subscription).toBe(salary);
    expect(receipt).not.toBe(subscription);
  });

  it('draws all four labels at one size, whole, with the control ceiling', async () => {
    const screen = await render(<QuickActions onPress={() => {}} />);
    for (const { label } of EXPECTED) {
      const text = labelOf(screen, label);
      expect(sizeOf(screen, label)).toBe(15);
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
      expect(text.props.maxFontSizeMultiplier).toBe(1.3);
    }
  });

  it('shrinks all four together when "Subscription" outgrows its tile, staying two by two', async () => {
    // A 375pt phone at 1.3x: 100.5pt for each label, and "Subscription" needs 125.4pt.
    const screen = await render(<QuickActions onPress={() => {}} />);
    await layOut(screen, 327, 100.5);

    const sizes = EXPECTED.map(({ label }) => sizeOf(screen, label));
    expect(new Set(sizes).size).toBe(1);
    // 0.79 of 15pt, drawn at 1.3x: 15.4pt, above the 15pt default.
    expect(sizes[0]).toBeCloseTo(15 * 0.79, 5);
    expect(rowOf(screen, 'Add a receipt')).toBe(rowOf(screen, 'Add a bill'));
  });

  it('keeps the full size where the tiles have room', async () => {
    // A 428pt phone: 127pt each, enough for 125.4pt.
    const screen = await render(<QuickActions onPress={() => {}} />);
    await layOut(screen, 380, 127);
    for (const { label } of EXPECTED) expect(sizeOf(screen, label)).toBe(15);
  });

  it('goes to one column, at full size, rather than shrink under the default size', async () => {
    // 320pt (Display Zoom on a small phone): 73pt each would mean 11.3pt type.
    const screen = await render(<QuickActions onPress={() => {}} />);
    await layOut(screen, 272, 73);

    const tiles = EXPECTED.map(({ hint }) => rowOf(screen, hint));
    expect(new Set(tiles).size).toBe(1);

    // In one column each label has the whole tile, so the size returns to 15pt.
    for (const { id } of EXPECTED) await layout(screen, `fit-slot-${id}`, 215);
    for (const { label } of EXPECTED) expect(sizeOf(screen, label)).toBe(15);
    expect(new Set(EXPECTED.map(({ hint }) => rowOf(screen, hint))).size).toBe(1);
  });
});

import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { BalanceSummary } from '@/components/dashboard/balance-summary';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// Both pull in react-native-reanimated, whose mock needs the native worklets module.
jest.mock('@/components/ui/rolling-number', () => ({ RollingNumber: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ onControl: '#FFFFFF' }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

/** Montserrat SemiBold at 17pt x 1.2 for the figures, Medium at 12pt x 1.3 for the labels. */
const FIGURES = { Income: 100.7, Expenses: 113.1 };
const LABELS = { Income: 60.3, Expenses: 75.1 };

/** One layout pass with `room` points for each stat's text, then the two group boxes. */
async function layOut(screen: Screen, room: number) {
  for (const name of ['Income', 'Expenses'] as const) {
    // The label's slot also holds the 20pt icon and gap beside it.
    await layout(screen, `fit-slot-${name}-label`, room + 20);
    await layout(screen, `fit-copy-${name}-label`, LABELS[name]);
    await layout(screen, `fit-slot-${name}-figure`, room);
    await layout(screen, `fit-copy-${name}-figure`, FIGURES[name]);
  }
  await layout(screen, 'stat-labels', 287);
  await layout(screen, 'stat-figures', 287);
}

const sizeOf = (screen: Screen, text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).fontSize as number;

/** Each Stat is the accessible element named by its label; stacked, their row is a column. */
const isStacked = (screen: Screen) =>
  !String(screen.getByLabelText('Income, $1,234.56').parent?.props.className).includes('flex-row');

function Summary() {
  return <BalanceSummary leftThisMonth={-11111.11} payday={1234.56} expenses={12345.67} />;
}

describe('BalanceSummary at large text sizes', () => {
  beforeEach(() => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
    Dimensions.set({ window, screen: window });
  });

  it('lets the days-left pill follow the text size, whole', async () => {
    const screen = await render(<Summary />);
    const pill = screen.getByText(/days? left|Last day/);
    expect(pill.props.allowFontScaling).toBeUndefined();
    expect(pill.props.numberOfLines).toBeUndefined();
    expect(pill.props.maxFontSizeMultiplier).toBe(1.3);
  });

  it('prints both figures whole, with their cents, and no per-figure shrinking', async () => {
    const screen = await render(<Summary />);
    for (const figure of ['$1,234.56', '-$12,345.67']) {
      const text = screen.getByText(figure);
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.maxFontSizeMultiplier).toBe(1.2);
    }
  });

  it('shrinks the two figures together, side by side, when the wider one needs it', async () => {
    const screen = await render(<Summary />);
    // 375pt: each stat leaves 113.5pt for text; "-$12,345.67" needs 113.1pt plus a point to spare.
    await layOut(screen, 113.5);

    expect(sizeOf(screen, '$1,234.56')).toBe(sizeOf(screen, '-$12,345.67'));
    expect(sizeOf(screen, '-$12,345.67')).toBeCloseTo(17 * 0.99, 5);
    expect(sizeOf(screen, 'Income')).toBe(sizeOf(screen, 'Expenses'));
    expect(isStacked(screen)).toBe(false);
  });

  it('stacks the pair rather than take the figures under their default size', async () => {
    const screen = await render(<Summary />);
    // 80pt would need 17pt x 1.2 x 0.69 = 14.1pt, under the 17pt default.
    await layOut(screen, 80);
    expect(isStacked(screen)).toBe(true);
  });
});

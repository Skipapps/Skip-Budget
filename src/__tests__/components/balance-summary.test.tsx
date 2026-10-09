import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { BalanceSummary } from '@/components/dashboard/balance-summary';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
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
  return <BalanceSummary balance={-11111.11} income={1234.56} expenses={12345.67} />;
}

describe('BalanceSummary at large text sizes', () => {
  beforeEach(() => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
    Dimensions.set({ window, screen: window });
  });

  it('lets the heading follow the text size, whole', async () => {
    const screen = await render(<Summary />);
    const heading = screen.getByText('Current balance');
    expect(heading.props.allowFontScaling).toBeUndefined();
    expect(heading.props.numberOfLines).toBeUndefined();
    expect(heading.props.maxFontSizeMultiplier).toBe(1.3);
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

describe('BalanceSummary’s headline', () => {
  it('names the current balance and reads it, to the cent, as one line', async () => {
    const screen = await render(
      <BalanceSummary balance={7707.51} income={4629.64} expenses={231.95} />,
    );

    expect(screen.getByText('Current balance')).toBeTruthy();
    expect(screen.getByLabelText('Current balance, $7,707.51')).toBeTruthy();
    expect(screen.getByLabelText('Income, $4,629.64')).toBeTruthy();
    expect(screen.getByLabelText('Expenses, -$231.95')).toBeTruthy();
  });

  it('reads a balance below zero with its minus sign', async () => {
    const screen = await render(<Summary />);
    expect(screen.getByLabelText('Current balance, -$11,111.11')).toBeTruthy();
  });

  it('reads a balance of nothing as $0.00', async () => {
    const screen = await render(<BalanceSummary balance={0} income={0} expenses={0} />);
    expect(screen.getByLabelText('Current balance, $0.00')).toBeTruthy();
  });

  it('has no days-left pill and no month in its wording', async () => {
    const screen = await render(<Summary />);

    expect(screen.queryByText(/days? left|Last day/)).toBeNull();
    expect(screen.queryByText(/this month/i)).toBeNull();
    expect(screen.queryByLabelText(/left|this month/i)).toBeNull();
  });

  it('says it is unavailable, and shows no figure or bar, when a part would not load', async () => {
    const screen = await render(
      <BalanceSummary balance={7707.51} income={4629.64} expenses={231.95} error />,
    );

    expect(screen.getByLabelText('Current balance, unavailable')).toBeTruthy();
    expect(screen.getByLabelText('Income, unavailable')).toBeTruthy();
    expect(screen.getByLabelText('Expenses, unavailable')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByLabelText(/7,707|4,629|231/)).toBeNull();
  });

  it('keeps the heading and says the stats are loading while the figures arrive', async () => {
    const screen = await render(<BalanceSummary balance={0} income={0} expenses={0} loading />);

    expect(screen.getByText('Current balance')).toBeTruthy();
    expect(screen.getByLabelText('Income, loading')).toBeTruthy();
    expect(screen.getByLabelText('Expenses, loading')).toBeTruthy();
  });
});

describe('BalanceSummary’s bar', () => {
  const bar = (screen: Screen) => screen.getByRole('progressbar');

  it('shows the share of the income already spent, expenses over income', async () => {
    const screen = await render(<BalanceSummary balance={2700} income={2000} expenses={500} />);

    expect(screen.getByText('25% of the income is spent')).toBeTruthy();
    expect(bar(screen).props.accessibilityLabel).toBe('25% of the income is spent');
    expect(bar(screen).props.accessibilityValue).toEqual({ min: 0, max: 100, now: 25 });
  });

  it('rounds the share to a whole percent', async () => {
    // 231.95 / 4,629.64 is 5.01 %.
    const screen = await render(
      <BalanceSummary balance={7707.51} income={4629.64} expenses={231.95} />,
    );
    expect(bar(screen).props.accessibilityValue.now).toBe(5);
  });

  it('stops at 100% when more went out than came in', async () => {
    const screen = await render(<BalanceSummary balance={-1000} income={2000} expenses={3000} />);

    expect(screen.getByText('100% of the income is spent')).toBeTruthy();
    expect(bar(screen).props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it('shows 0% when income came in and nothing went out', async () => {
    const screen = await render(<BalanceSummary balance={3000} income={2000} expenses={0} />);
    expect(screen.getByText('0% of the income is spent')).toBeTruthy();
  });

  it('is not drawn while no income has been counted', async () => {
    const screen = await render(<BalanceSummary balance={900} income={0} expenses={100} />);

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText(/of the income is spent/)).toBeNull();
  });
});

import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { DestinationList } from '@/components/dashboard/destination-list';
import type { SpendingCategory } from '@/data/spending-categories';
import { FAILURE_MESSAGE } from '@/lib/failure';

// jest.mock is hoisted above the imports, so each factory uses `require` rather than closing over
// an out-of-scope import binding.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// `Skeleton` pulls in react-native-reanimated, whose own mock.js in this version (4.5.1 with the
// split-out react-native-worklets) imports the real native module and throws "Cannot read
// properties of undefined (reading 'loadUnpackers')" outside a device. Stubbed so the test stays
// about DestinationList's own loading branch.
jest.mock('@/components/ui/skeleton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- required inside the factory, see note above
  const { View } = require('react-native');
  return { Skeleton: (props: Record<string, unknown>) => <View testID="skeleton" {...props} /> };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    body: '#111111',
    muted: '#666666',
    accentInk: '#0000FF',
    ink: '#000000',
  }),
  useMoneyColor: () => (amount: number) => (amount < 0 ? '#FF0000' : '#00FF00'),
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

const CATEGORIES: SpendingCategory[] = [
  { id: 'monthly-bills', label: 'Monthly Bills' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'loan-calculator', label: 'Loan calculator' },
];

const AMOUNTS = {
  'monthly-bills': -120,
  receipts: -45.5,
  subscriptions: -9.99,
};

describe('DestinationList', () => {
  it('renders rows in the given order, not the fixture order', async () => {
    // Deliberately reversed, so only following the order it is given can pass.
    const reordered = [...CATEGORIES].reverse();

    const { getAllByRole } = await render(
      <DestinationList items={reordered} amounts={AMOUNTS} onPress={() => {}} />,
    );

    const rowLabels = getAllByRole('button').map((row) => row.props.accessibilityLabel as string);
    const expectedOrder = reordered.map((category) => category.label);

    expect(rowLabels).toHaveLength(expectedOrder.length);
    rowLabels.forEach((label, index) => {
      expect(label.startsWith(expectedOrder[index])).toBe(true);
    });
  });

  it('opens the loan calculator for everyone: it is free, with no PRO pill', async () => {
    const screen = await render(
      <DestinationList items={CATEGORIES} amounts={AMOUNTS} onPress={() => {}} />,
    );
    expect(screen.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(0);
    expect(screen.getByLabelText('Loan calculator. Opens the tool.')).toBeTruthy();
  });

  it('draws each row with its gradient icon, the ones Quick add uses, hidden from VoiceOver', async () => {
    const screen = await render(
      <DestinationList items={CATEGORIES} amounts={AMOUNTS} onPress={() => {}} />,
    );
    const hidden = { includeHiddenElements: true };
    const drawn = (id: string) =>
      screen
        .getByTestId(`destination-icon-${id}`, hidden)
        .children.map((icon) => (typeof icon === 'string' ? icon : icon.props.testID));

    expect(drawn('monthly-bills')).toEqual(['icon-bill']);
    expect(drawn('receipts')).toEqual(['icon-receipt']);
    expect(drawn('subscriptions')).toEqual(['icon-subscription']);
    expect(drawn('loan-calculator')).toEqual(['icon-loanCalculator']);
    // No plum outline circle behind them any more.
    for (const { id } of CATEGORIES) {
      const box = screen.getByTestId(`destination-icon-${id}`, hidden);
      expect(box.props.className).not.toContain('rounded-full');
      expect(box.props.className).not.toContain('bg-accent');
      expect(screen.queryByTestId(`destination-icon-${id}`)).toBeNull();
    }
  });

  it('gives a row it has no icon for a document glyph, so the column still lines up', async () => {
    const screen = await render(
      <DestinationList
        items={[...CATEGORIES, { id: 'something-new', label: 'Something new' }]}
        amounts={AMOUNTS}
        onPress={() => {}}
      />,
    );
    expect(screen.queryByTestId('destination-icon-something-new')).toBeNull();
    expect(screen.getByTestId('destination-glyph-something-new').props.className).toContain(
      'h-[44px] w-[44px]',
    );
    expect(screen.queryByTestId('destination-glyph-receipts')).toBeNull();
    expect(screen.getByLabelText('Something new. Opens the tool.')).toBeTruthy();
  });

  it('shows a skeleton in place of each amount while loading', async () => {
    const { getByLabelText, getAllByTestId, queryByText } = await render(
      <DestinationList items={CATEGORIES} amounts={AMOUNTS} loading onPress={() => {}} />,
    );

    expect(getAllByTestId('skeleton')).toHaveLength(3);
    expect(getByLabelText('Monthly Bills, amount loading')).toBeTruthy();
    expect(getByLabelText('Receipts, amount loading')).toBeTruthy();
    expect(getByLabelText('Subscriptions, amount loading')).toBeTruthy();
    expect(queryByText('-$120.00')).toBeNull();
  });

  it('shows a dash per row and a retry action on error', async () => {
    const onRetry = jest.fn();
    const { getAllByText, getByText } = await render(
      <DestinationList
        items={CATEGORIES}
        amounts={AMOUNTS}
        error
        onRetry={onRetry}
        onPress={() => {}}
      />,
    );

    expect(getAllByText('—')).toHaveLength(3);
    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();

    const retry = getByText('Try again');
    await fireEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

/** Home's three rows: no tool row, so every row has an amount. */
const HOME = CATEGORIES.slice(0, 3);

/** Montserrat at 15pt with the phone at 1.4x: each label's widest word, and each amount. */
const WIDEST_WORD = { 'monthly-bills': 88.3, receipts: 92.4, subscriptions: 145.6 };
const FIGURE = { 'monthly-bills': 89.0, receipts: 79.3, subscriptions: 65.9 };

type Screen = Awaited<ReturnType<typeof render>>;

function phone(width: number, fontScale: number) {
  const window = { width, height: 844, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

/** One layout pass: each label's room beside its amount and the measured widths, then the card. */
async function layOut(screen: Screen, room: number, scale = 1) {
  for (const { id } of HOME) {
    const key = id as keyof typeof WIDEST_WORD;
    await layout(screen, `fit-slot-${id}-label`, room);
    await layout(screen, `fit-copy-${id}-label`, WIDEST_WORD[key] * scale);
    await layout(screen, `fit-slot-${id}-amount`, FIGURE[key] * scale);
  }
  await layout(screen, 'where-it-goes', 380);
}

const slot = (screen: Screen, id: string) =>
  screen.getByTestId(`fit-slot-${id}`, { includeHiddenElements: true });

/** The amount sits under its label: both in one column, label first. */
function isStacked(screen: Screen, id: string) {
  const label = slot(screen, `${id}-label`);
  const amount = slot(screen, `${id}-amount`);
  if (label.parent !== amount.parent) return false;
  const order = label.parent?.children ?? [];
  return order.indexOf(label) < order.indexOf(amount);
}

describe('DestinationList at large text sizes', () => {
  beforeEach(() => phone(428, 1.4));

  it('lets labels wrap and prints every amount whole, with its cents', async () => {
    const screen = await render(
      <DestinationList items={HOME} amounts={AMOUNTS} onPress={() => {}} />,
    );

    for (const { label } of HOME) {
      const text = screen.getByText(label);
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.maxFontSizeMultiplier).toBe(1.4);
    }
    for (const figure of ['-$120.00', '-$45.50', '-$9.99']) {
      const text = screen.getByText(figure);
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
      expect(text.props.maxFontSizeMultiplier).toBe(1.4);
    }
  });

  it('keeps each amount beside its label while every word fits', async () => {
    const screen = await render(
      <DestinationList items={HOME} amounts={AMOUNTS} onPress={() => {}} />,
    );
    await layOut(screen, 150);
    for (const { id } of HOME) expect(isStacked(screen, id)).toBe(false);
  });

  it('puts every amount under its label once one word cannot fit beside its amount', async () => {
    // 428pt at 1.4x leaves about 137pt beside the amount; "Subscriptions" needs 145.6pt. The other
    // two labels fit, and stack anyway: the card switches as one.
    const screen = await render(
      <DestinationList items={HOME} amounts={AMOUNTS} onPress={() => {}} />,
    );
    await layOut(screen, 137);

    for (const { id } of HOME) expect(isStacked(screen, id)).toBe(true);
    expect(screen.getByText('-$9.99')).toBeTruthy();
    expect(screen.getByLabelText('Subscriptions, -$9.99, this month')).toBeTruthy();
  });

  it('goes back beside the labels when a smaller text size makes the words fit', async () => {
    const screen = await render(
      <DestinationList items={HOME} amounts={AMOUNTS} onPress={() => {}} />,
    );
    await layOut(screen, 137);
    expect(isStacked(screen, 'subscriptions')).toBe(true);

    // The default size: every width is 1/1.4 of what it was, and 104pt fits in 137pt.
    await act(() => phone(428, 1));
    await layOut(screen, 137, 1 / 1.4);
    for (const { id } of HOME) expect(isStacked(screen, id)).toBe(false);
  });
});

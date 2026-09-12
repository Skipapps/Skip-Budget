import { fireEvent, render } from '@testing-library/react-native';

import { DestinationList } from '@/components/dashboard/destination-list';
import type { SpendingCategory } from '@/data/dashboard-mock';

// jest.mock calls are hoisted above these imports by babel-plugin-jest-hoist,
// so the ordering here is for readability, not execution. Each factory below
// uses `require` rather than a module-level import for the same reason: the
// hoist plugin forbids a mock factory from closing over an out-of-scope
// import binding.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// `Skeleton` pulls in react-native-reanimated, whose own mock.js in this
// installed version (4.5.1, paired with the split-out react-native-worklets
// package) itself imports the real native module and throws
// "Cannot read properties of undefined (reading 'loadUnpackers')" outside a
// device/simulator — see the report to the team. Stubbing this leaf UI
// primitive keeps the test about DestinationList's own loading branch
// (skeleton renders, no figure renders, and the a11y label says "loading")
// rather than about Reanimated's jest support.
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

const CATEGORIES: SpendingCategory[] = [
  { id: 'monthly-bills', label: 'Monthly Bills' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'loan-calculator', label: 'Loan calculator' },
  { id: 'split-calculator', label: 'Split manager' },
];

const AMOUNTS = {
  'monthly-bills': -120,
  receipts: -45.5,
  subscriptions: -9.99,
};

describe('DestinationList', () => {
  it('renders rows in the given order, not the fixture order', async () => {
    // Deliberately reversed from the CATEGORIES fixture, standing in for
    // whatever order `tile_order` produced.
    const reordered = [...CATEGORIES].reverse();

    const { getAllByRole } = await render(
      <DestinationList items={reordered} amounts={AMOUNTS} pro onPress={() => {}} />,
    );

    const rowLabels = getAllByRole('button').map((row) => row.props.accessibilityLabel as string);
    const expectedOrder = reordered.map((category) => category.label);

    expect(rowLabels).toHaveLength(expectedOrder.length);
    rowLabels.forEach((label, index) => {
      expect(label.startsWith(expectedOrder[index])).toBe(true);
    });
  });

  it('shows a PRO pill on the two calculators only when the account is not pro', async () => {
    // The PRO badge is deliberately hidden from the accessibility tree (the
    // row's own a11y label already says "Pro feature"), so the query has to
    // ask for hidden elements too or it will always come back empty.
    const notPro = await render(
      <DestinationList items={CATEGORIES} amounts={AMOUNTS} pro={false} onPress={() => {}} />,
    );
    // loan-calculator and split-calculator are locked; the other three are not.
    expect(notPro.getAllByText('PRO', { includeHiddenElements: true })).toHaveLength(2);

    const isPro = await render(
      <DestinationList items={CATEGORIES} amounts={AMOUNTS} pro onPress={() => {}} />,
    );
    expect(isPro.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(0);
  });

  it('shows a skeleton in place of each amount while loading', async () => {
    const { getByLabelText, getAllByTestId, queryByText } = await render(
      <DestinationList items={CATEGORIES} amounts={AMOUNTS} pro loading onPress={() => {}} />,
    );

    // The three money rows each get a skeleton and an a11y label that says
    // the amount is loading; no formatted currency renders meanwhile.
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
        pro
        error
        onRetry={onRetry}
        onPress={() => {}}
      />,
    );

    // One "—" per money row (three of the five categories carry a figure).
    expect(getAllByText('—')).toHaveLength(3);
    expect(getByText('Amounts are unavailable right now.')).toBeTruthy();

    const retry = getByText('Try again');
    await fireEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

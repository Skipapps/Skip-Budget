import { fireEvent, render } from '@testing-library/react-native';

import { DestinationList } from '@/components/dashboard/destination-list';
import type { SpendingCategory } from '@/data/dashboard-mock';
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
    // Deliberately reversed, so only following the order it is given can pass.
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
    // The PRO badge is hidden from the accessibility tree (the row's label already says "Pro
    // feature"), so the query has to include hidden elements.
    const notPro = await render(
      <DestinationList items={CATEGORIES} amounts={AMOUNTS} pro={false} onPress={() => {}} />,
    );
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

    expect(getAllByText('—')).toHaveLength(3);
    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();

    const retry = getByText('Try again');
    await fireEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

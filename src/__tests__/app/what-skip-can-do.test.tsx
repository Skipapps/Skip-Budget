import { render } from '@testing-library/react-native';

import WhatSkipCanDoScreen from '@/app/what-skip-can-do';

/**
 * The welcome's list of what Skip does, shown before there is an account: it promises only what
 * this app can do.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// Artwork imports SVGs, which Jest has no transformer for. Every card draws one, so this counts them.
jest.mock('@/theme/artwork', () => {
  const { View } = jest.requireActual('react-native');
  const Art = () => <View testID="artwork" />;
  return { useArtwork: () => new Proxy({}, { get: () => Art }) };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));

const ITEMS = [
  'Track without linking a bank',
  'Scan receipts in a tap',
  'Loans, to the cent',
  'Savings that explain themselves',
  'Reminded before things land',
];

describe('What Skip can do', () => {
  it('lists the five things this app does, and nothing about splitting', async () => {
    const screen = await render(<WhatSkipCanDoScreen />);

    expect(screen.getAllByTestId('artwork')).toHaveLength(ITEMS.length);
    const titles = screen
      .getAllByText(new RegExp(`^(${ITEMS.join('|')})$`))
      .map((node) => node.props.children);
    expect(titles).toEqual(ITEMS);
    expect(screen.queryByText(/split|friend|running total/i)).toBeNull();
  });
});

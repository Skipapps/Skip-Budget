import { render } from '@testing-library/react-native';

import ProScreen from '@/app/pro';

/** The Pro page sells only what this app does. */

// Each icon draws a marker named after it; every feature row ends in a Check, so this counts them.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return new Proxy({}, { get: (_target, name) => () => <View testID={`icon-${String(name)}`} /> });
});

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    line: '#DDDDDD',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  }),
}));

jest.mock('@/api/pro', () => ({
  usePro: () => ({ pro: false }),
  useProPrices: () => ({
    data: undefined,
    error: null,
    isFetched: true,
    isFetching: false,
    refetch: jest.fn(),
  }),
  usePurchasePro: () => ({ purchase: jest.fn(), restore: jest.fn() }),
  purchasesAvailable: () => false,
}));

const FEATURES = [
  'Unlimited credit cards, accounts & incomes',
  'Unlimited receipt scanning',
  'Loan calculator, to the cent',
  'Insights',
  'Early features, first-in-line support',
];

describe('Pro page', () => {
  it('lists five features, none of them splitting', async () => {
    const screen = await render(<ProScreen />);

    expect(screen.getAllByTestId('icon-Check')).toHaveLength(FEATURES.length);
    const titles = screen
      .getAllByText(new RegExp(`^(${FEATURES.join('|')})$`))
      .map((node) => node.props.children);
    expect(titles).toEqual(FEATURES);
    expect(screen.queryByText(/split|friend|\bgroup/i)).toBeNull();
  });
});

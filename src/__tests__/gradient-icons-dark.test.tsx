import { render } from '@testing-library/react-native';

import CardsScreen from '@/app/(tabs)/cards';
import { RemindMeCard } from '@/components/flow/remind-me-card';

/**
 * Each gradient icon has a light and a dark drawing, picked by the app's own Light/Dark/System
 * setting (the theme provider's scheme), not by the phone. Every drawing is stood in by a view
 * named after its file, so the test sees which one was drawn.
 */

function mockSvg(file: string) {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => createElement(View, { testID: `svg-${file}` }) };
}
jest.mock('../../assets/gradient-icons/salary.svg', () => mockSvg('salary'));
jest.mock('../../assets/gradient-icons/salary-dark.svg', () => mockSvg('salary-dark'));
jest.mock('../../assets/gradient-icons/savings.svg', () => mockSvg('savings'));
jest.mock('../../assets/gradient-icons/savings-dark.svg', () => mockSvg('savings-dark'));
jest.mock('../../assets/gradient-icons/loans.svg', () => mockSvg('loans'));
jest.mock('../../assets/gradient-icons/loans-dark.svg', () => mockSvg('loans-dark'));
jest.mock('../../assets/gradient-icons/goals.svg', () => mockSvg('goals'));
jest.mock('../../assets/gradient-icons/goals-dark.svg', () => mockSvg('goals-dark'));
jest.mock('../../assets/gradient-icons/reminder.svg', () => mockSvg('reminder'));
jest.mock('../../assets/gradient-icons/reminder-dark.svg', () => mockSvg('reminder-dark'));

// The reminder card reads its choices from the reminders module, never its client.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: mockScheme }),
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true }) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('@/lib/use-today', () => ({ useToday: () => ({ today: '2026-10-09' }) }));
jest.mock('@/api/queries', () => ({
  useCards: () => ({ data: [], isPending: false, isError: false }),
  useBankAccounts: () => ({ data: [], isPending: false, isError: false }),
  useSalarySources: () => ({ data: [], isPending: false, isError: false }),
  useSourceBalances: () => ({
    balances: new Map(),
    updated: new Map(),
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/api/loans', () => ({
  useActiveLoans: () => ({ loans: [], isPending: false, isError: false, refetch: jest.fn() }),
}));

const TILES = ['salary', 'savings', 'loans', 'goals'];

const bell = <RemindMeCard on={false} onToggle={() => {}} lead={3} onLead={() => {}} caption="" />;

describe.each([
  ['dark', '-dark'],
  ['light', ''],
] as const)('in %s mode', (scheme, suffix) => {
  beforeEach(() => {
    mockScheme = scheme;
  });

  it('draws each Money tile with its own drawing for the mode', async () => {
    const screen = await render(<CardsScreen />);
    for (const name of TILES) {
      expect(
        screen.getByTestId(`svg-${name}${suffix}`, { includeHiddenElements: true }),
      ).toBeTruthy();
      const other = scheme === 'dark' ? `svg-${name}` : `svg-${name}-dark`;
      expect(screen.queryByTestId(other, { includeHiddenElements: true })).toBeNull();
    }
  });

  it('draws the reminder bell with its own drawing for the mode', async () => {
    const screen = await render(bell);
    expect(
      screen.getByTestId(`svg-reminder${suffix}`, { includeHiddenElements: true }),
    ).toBeTruthy();
  });
});

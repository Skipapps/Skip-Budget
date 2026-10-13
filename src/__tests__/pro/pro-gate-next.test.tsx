import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import AddAccountScreen from '@/app/add-account';
import AddCardScreen from '@/app/add-card';
import { useProGate } from '@/components/pro/pro-gate';

/**
 * A gate swaps its page for the explainer and tells the explainer to open that same page again,
 * params and all, once Pro is bought: a free account lands back where it was going, not on the
 * explainer and not on a bare form that lost what it came with.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));
// Reanimated 4 wants a native worklets module; the swatches are the only animated part of the form.
jest.mock('@/components/ui/color-picker', () => ({ ColorPicker: () => null }));
jest.mock('@/components/flow/amount-step', () => ({ AmountStep: () => null }));
jest.mock('@/components/flow/inline-calendar', () => ({ InlineCalendar: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

let mockParams: Record<string, string> = {};
/** The route of the page the gate is drawn in, as expo-router reports it for that screen. */
let mockRoute: { pathnameWithParams: string } | undefined;
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useCurrentRouteInfo: () => mockRoute,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));

let mockPro = { pro: false, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

let mockOwned: { data: unknown[] | undefined; isPending: boolean; isFetching?: boolean };
jest.mock('@/api/queries', () => ({
  useCard: () => ({ data: null, isError: false, isFetched: false, refetch: jest.fn() }),
  useCards: () => mockOwned,
  useSourceLedger: () => ({ ledger: null }),
  useBankAccount: () => ({ data: null, isError: false, isFetched: false, refetch: jest.fn() }),
  useBankAccounts: () => mockOwned,
  useSalaryAccountIds: () => ({ ids: new Set<string>(), isLoading: false, isError: false }),
  useSalarySources: () => ({ data: [] }),
}));
const idle = () => ({ mutateAsync: jest.fn(), isPending: false });
// Only creditLimitValue is real, and it never touches the client.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/mutations', () => ({
  creditLimitValue: jest.requireActual('@/api/mutations').creditLimitValue,
  useCreateCard: idle,
  useUpdateCard: idle,
  useDeleteCard: idle,
  useCreateBankAccount: idle,
  useUpdateBankAccount: idle,
  useDeleteBankAccount: idle,
  useDeleteUnseenPay: idle,
  useCreateSalarySource: idle,
  useSetSalaryAccounts: idle,
  useLinkAccountToSalaries: idle,
}));
jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => ({ mutateAsync: jest.fn() }),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

beforeEach(() => {
  mockParams = {};
  mockRoute = undefined;
  mockPro = { pro: false, ready: true };
  mockOwned = { data: [{ id: 'one' }], isPending: false };
  mockRedirect.mockClear();
});

function Gated({ id }: { id: string }) {
  const gate = useProGate(id);
  if (gate) return gate;
  return <Text>the feature</Text>;
}

describe('useProGate', () => {
  it('sends free to the explainer with the page’s own route, params and all', async () => {
    mockRoute = { pathnameWithParams: '/payment-export?kind=bill&year=2025' };
    const screen = await render(<Gated id="export" />);
    expect(mockRedirect.mock.calls).toEqual([
      [
        {
          pathname: '/pro-feature',
          params: { id: 'export', next: '/payment-export?kind=bill&year=2025' },
        },
      ],
    ]);
    expect(screen.queryByText('the feature')).toBeNull();
  });

  it('sends free to the explainer alone when the route cannot be read', async () => {
    await render(<Gated id="insights" />);
    expect(mockRedirect.mock.calls).toEqual([
      [{ pathname: '/pro-feature', params: { id: 'insights' } }],
    ]);
  });

  it('lets Pro through and draws nothing while Pro is unknown', async () => {
    mockRoute = { pathnameWithParams: '/insights' };
    mockPro = { pro: true, ready: true };
    const paid = await render(<Gated id="insights" />);
    expect(paid.getByText('the feature')).toBeTruthy();
    await paid.unmount();

    mockPro = { pro: false, ready: false };
    const unknown = await render(<Gated id="insights" />);
    expect(unknown.queryByText('the feature')).toBeNull();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe.each([
  ['card', AddCardScreen, '/add-card'],
  ['bank account', AddAccountScreen, '/add-account'],
] as const)('the second %s', (_, Screen, path) => {
  it('opens the explainer, which opens this form again once Pro', async () => {
    mockRoute = { pathnameWithParams: path };
    await render(<Screen />);
    expect(mockRedirect).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'unlimited', next: path },
    });
  });

  it('keeps what the form came with, so the salary flow carries on after Pro', async () => {
    mockParams = { from: 'salary' };
    mockRoute = { pathnameWithParams: `${path}?from=salary` };
    await render(<Screen />);
    expect(mockRedirect).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'unlimited', next: `${path}?from=salary` },
    });
  });

  it('opens the form itself for Pro', async () => {
    mockPro = { pro: true, ready: true };
    mockRoute = { pathnameWithParams: path };
    await render(<Screen />);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import BillPlansScreen from '@/app/bill-plans';
import BillsScreen from '@/app/bills';
import YourMoneyScreen from '@/app/settings/your-money';
import SubscriptionPlansScreen from '@/app/subscription-plans';
import SubscriptionsScreen from '@/app/subscriptions';
import { resetLocaleForTests } from '@/i18n/store';

/**
 * The swap: /bills and /subscriptions are the month pages, with a month from a link held to what
 * Choose month offers (90 days back on free, seven calendar years on Pro, a year ahead); the old
 * /bill-plans and /subscription-plans land on them; Settings → Your money opens them. Seen on
 * 12 Oct 2026. The page itself is tested on its own, so here it only says what it was given.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
let mockParams: Record<string, string | string[] | undefined> = {};
jest.mock('expo-router', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => mockParams,
    Redirect: ({ href }: { href: unknown }) => createElement(View, { testID: 'redirect', href }),
  };
});
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));
jest.mock('@/components/payments/plan-month-screen', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    PlanMonthScreen: ({ kind, month }: { kind: string; month?: string }) =>
      createElement(View, { testID: 'plan-month-screen', kind, month }),
  };
});
jest.mock('@/components/settings/use-money-counts', () => ({
  useMoneyCounts: () => ({
    bills: 4,
    subscriptions: 3,
    cards: 1,
    accounts: 1,
    salarySources: 1,
    oneOffPays: 0,
  }),
  plural: (count: number, thing: string) => `${count} ${thing}`,
}));

let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
let mockFloor = { floor: '2026-07-15', free: true };
jest.mock('@/api/history', () => ({ useHistoryFloor: () => mockFloor }));

const FREE = { floor: '2026-07-15', free: true };
const PRO = { floor: '2019-10-12', free: false };

const page = () => {
  const node = screen.getByTestId('plan-month-screen');
  return { kind: node.props.kind as string, month: node.props.month as string };
};

beforeEach(() => {
  resetLocaleForTests();
  mockToday = '2026-10-12';
  mockFloor = FREE;
  mockParams = {};
  jest.clearAllMocks();
});

describe.each([
  ['/bills', BillsScreen, 'bill'],
  ['/subscriptions', SubscriptionsScreen, 'subscription'],
] as const)('%s', (_route, Route, kind) => {
  it('is the month page for its kind, on this month when no month is asked', async () => {
    await render(<Route />);
    expect(page()).toEqual({ kind, month: '2026-10' });
  });

  it('shows the month in the link', async () => {
    mockParams = { month: '2026-08' };
    await render(<Route />);
    expect(page()).toEqual({ kind, month: '2026-08' });

    mockParams = { month: '2027-03' };
    await render(<Route />);
    expect(page().month).toBe('2027-03');
  });

  it.each(['2026-13', 'october', '2026-1', '', '2026-10-01'])(
    'reads a month that is not one (%p) as this month',
    async (month) => {
      mockParams = { month };
      await render(<Route />);
      expect(page().month).toBe('2026-10');
    },
  );

  it('takes the first of a repeated month', async () => {
    mockParams = { month: ['2026-09', '2026-08'] };
    await render(<Route />);
    expect(page().month).toBe('2026-09');
  });

  it('on free, holds an older month to July, the 90-day floor’s month', async () => {
    mockParams = { month: '2025-01' };
    await render(<Route />);
    expect(page().month).toBe('2026-07');
  });

  it('on Pro, keeps an older month back to January 2020, and no further', async () => {
    mockFloor = PRO;
    mockParams = { month: '2021-05' };
    await render(<Route />);
    expect(page().month).toBe('2021-05');

    mockParams = { month: '2019-11' };
    await render(<Route />);
    expect(page().month).toBe('2020-01');
  });

  it('holds a month too far ahead to a year from now', async () => {
    mockParams = { month: '2028-01' };
    await render(<Route />);
    expect(page().month).toBe('2027-10');
  });
});

describe('the old pages', () => {
  it.each([
    ['/bill-plans', BillPlansScreen, '/bills'],
    ['/subscription-plans', SubscriptionPlansScreen, '/subscriptions'],
  ] as const)('%s lands on %s', async (_old, Old, href) => {
    await render(<Old />);
    expect(screen.getByTestId('redirect').props.href).toBe(href);
  });
});

describe('Settings → Your money', () => {
  it('opens Monthly bills and Subscriptions, never the old lists', async () => {
    await render(<YourMoneyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^Bills/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Subscriptions/ }));
    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([
      '/bills',
      '/subscriptions',
    ]);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import PaymentFilterScreen from '@/app/payment-filter';
import {
  amountFilterHref,
  draftCents,
  readAmountParams,
} from '@/components/payments/amount-filter';
import {
  dateRangeFilterHref,
  rangeParams,
  readRangeParams,
} from '@/components/payments/date-range-filter';
import {
  paidFromFilterHref,
  readSourceParam,
  sourceParam,
} from '@/components/payments/paid-from-filter';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { onPaymentPicked, type PickedFilter } from '@/lib/payment-pick';

/**
 * The payment search filters, each a page of its own: a date range (ready-made or picked days), an
 * amount (at least, at most, in whole cents) and where it was paid from (every card and account, a
 * free account's locked second card too, or Card not set). A choice is handed back to the search
 * that opened the page, which goes back; a smaller "at most" is refused with a line, never a toast.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockParams: Record<string, string | string[]> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: () => '#000000' });
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-12', todayDate: new Date(2026, 9, 12) }),
}));

type PickerProps = {
  value: Date;
  minDate?: Date | null;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};
/** The calendar has its own suite; here it only records what it was opened with. */
let mockPicker: PickerProps | null = null;
jest.mock('@/components/ui/date-picker', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    DatePicker: (props: PickerProps) => {
      mockPicker = props;
      return createElement(View, { testID: 'date-picker' });
    },
  };
});

type Table = 'cards' | 'bank_accounts';
const mockFailing = new Set<Table>();
const mockHeld: (() => void)[] = [];
let mockHold = false;
const mockRows: Record<Table, Record<string, unknown>[]> = {
  cards: [
    { id: 'card-1', holder: 'Komal', network: 'Visa', last4: '7010', color: '#111', balance: 0 },
    { id: 'card-2', holder: '', network: 'Discover', last4: '6334', color: '#222', balance: 0 },
  ],
  bank_accounts: [
    {
      id: 'acct-1',
      bank_name: 'Chase',
      nickname: 'Komal',
      account_type: 'checking',
      last4: '4410',
      color: '#333',
      balance: 0,
    },
    {
      id: 'acct-2',
      bank_name: 'Ally',
      nickname: null,
      account_type: 'savings',
      last4: null,
      color: '#444',
      balance: 0,
    },
  ],
};
jest.mock('@/lib/supabase', () => {
  const build = (table: Table) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        const answer = () =>
          resolve(
            mockFailing.has(table)
              ? { data: null, error: { code: '08006', message: 'offline' } }
              : { data: mockRows[table], error: null },
          );
        if (mockHold) mockHeld.push(answer);
        else answer();
      },
    };
    return builder;
  };
  return { supabase: { from: (table: Table) => build(table) } };
});
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
// Free: the Paid with pickers offer only the first card and account.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false, ready: true }) }));

const OWNER = 'search-1';
let picks: PickedFilter[] = [];
let stopListening: () => void = () => {};
let client: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = {};
  mockPicker = null;
  mockFailing.clear();
  mockHeld.length = 0;
  mockHold = false;
  picks = [];
  stopListening = onPaymentPicked(OWNER, 'filters', (pick) => picks.push(pick.filter));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  stopListening();
  client.clear();
  resetLocaleForTests();
});

async function open(params: Record<string, string | string[]>) {
  mockParams = { owner: OWNER, ...params };
  await render(
    <QueryClientProvider client={client}>
      <PaymentFilterScreen />
    </QueryClientProvider>,
  );
}

const radio = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });
const checked = () =>
  screen
    .queryAllByRole('radio')
    .filter((node) => node.props.accessibilityState?.checked)
    .map((node) => node.props.accessibilityLabel);

type Host = NonNullable<typeof screen.root>;

function insideScroll(node: Host | null): boolean {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return true;
  }
  return false;
}

/**
 * The primary action sits in the pinned footer, outside the scroll, so large text cannot bury it;
 * `inScroll` is drawn in the scroll above it.
 */
function expectPinned(label: string, inScroll: Host) {
  expect(insideScroll(screen.getByRole('button', { name: label }))).toBe(false);
  expect(insideScroll(inScroll)).toBe(true);
}

describe('the filter page', () => {
  it('goes back from a link that names no filter', async () => {
    await open({ type: 'colour' });
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(screen.toJSON()).toBeNull();
  });

  it('hands a choice to nobody when no page opened it, and still goes back', async () => {
    mockParams = { type: 'date' };
    await render(
      <QueryClientProvider client={client}>
        <PaymentFilterScreen />
      </QueryClientProvider>,
    );
    await fireEvent.press(radio('Last year'));
    expect(picks).toEqual([]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('hands back one choice and goes back once, however fast the taps', async () => {
    await open({ type: 'date' });
    await fireEvent.press(radio('This year'));
    await fireEvent.press(radio('Last year'));
    expect(picks).toEqual([{ range: 'thisYear' }]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('date range', () => {
  it('offers the ready-made ranges with their days, and ticks the one in use', async () => {
    await open({ type: 'date', range: 'lastYear' });

    expect(screen.getByText('Date range')).toBeTruthy();
    expect(screen.getAllByRole('radio').map((node) => node.props.accessibilityLabel)).toEqual([
      'Any time',
      'This month, 1 Oct 2026 – 12 Oct 2026',
      'Last 3 months, 1 Aug 2026 – 12 Oct 2026',
      'This year, 1 Jan 2026 – 12 Oct 2026',
      'Last year, 1 Jan 2025 – 31 Dec 2025',
      'Pick dates',
    ]);
    expect(checked()).toEqual(['Last year, 1 Jan 2025 – 31 Dec 2025']);
    expect(screen.queryByRole('button', { name: 'Show payments' })).toBeNull();
  });

  it.each([
    ['Any time', 'any'],
    ['This month', 'thisMonth'],
    ['Last 3 months', 'last3Months'],
  ] as const)('hands back %s as soon as it is tapped', async (label, range) => {
    await open({ type: 'date', range: 'lastYear' });
    await fireEvent.press(radio(label));
    expect(picks).toEqual([{ range }]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('picks days: From and To start on this month, and Show payments hands them back', async () => {
    await open({ type: 'date' });
    await fireEvent.press(radio('Pick dates'));

    expect(picks).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'From. 1 Oct 2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'To. 12 Oct 2026' })).toBeTruthy();
    expectPinned('Show payments', screen.getByRole('button', { name: 'To. 12 Oct 2026' }));

    await fireEvent.press(screen.getByRole('button', { name: 'From. 1 Oct 2026' }));
    expect(mockPicker?.value).toEqual(new Date(2026, 9, 1));
    expect(mockPicker?.minDate).toBeNull();
    await act(async () => mockPicker?.onConfirm(new Date(2026, 8, 5)));
    expect(screen.queryByTestId('date-picker')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'To. 12 Oct 2026' }));
    // To's calendar starts at From, so a range that ends before it starts cannot be built.
    expect(mockPicker?.minDate).toEqual(new Date(2026, 8, 5));
    await act(async () => mockPicker?.onConfirm(new Date(2026, 8, 30)));

    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));
    expect(picks).toEqual([{ range: { from: '2026-09-05', to: '2026-09-30' } }]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('brings To along when From moves past it', async () => {
    await open({ type: 'date', range: 'custom', from: '2026-03-01', to: '2026-03-31' });

    expect(checked()).toEqual(['Pick dates']);
    await fireEvent.press(screen.getByRole('button', { name: 'From. 1 Mar 2026' }));
    await act(async () => mockPicker?.onConfirm(new Date(2026, 4, 20)));
    expect(screen.getByRole('button', { name: 'To. 20 May 2026' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));
    expect(picks).toEqual([{ range: { from: '2026-05-20', to: '2026-05-20' } }]);
  });

  it('changes nothing when a calendar is cancelled', async () => {
    await open({ type: 'date', range: 'custom', from: '2026-03-01', to: '2026-03-31' });
    await fireEvent.press(screen.getByRole('button', { name: 'To. 31 Mar 2026' }));
    await act(async () => mockPicker?.onCancel());

    expect(screen.queryByTestId('date-picker')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));
    expect(picks).toEqual([{ range: { from: '2026-03-01', to: '2026-03-31' } }]);
  });

  it('reads a link the way it writes one', () => {
    for (const range of [
      'any',
      'thisMonth',
      'last3Months',
      'thisYear',
      'lastYear',
      { from: '2024-03-01', to: '2024-05-31' },
    ] as const) {
      expect(readRangeParams(rangeParams(range))).toEqual(range);
    }
    expect(dateRangeFilterHref(OWNER, { from: '2024-03-01', to: '2024-05-31' })).toEqual({
      pathname: '/payment-filter',
      params: { type: 'date', owner: OWNER, range: 'custom', from: '2024-03-01', to: '2024-05-31' },
    });
    expect(dateRangeFilterHref(OWNER, 'thisYear')).toEqual({
      pathname: '/payment-filter',
      params: { type: 'date', owner: OWNER, range: 'thisYear' },
    });
  });

  it.each([
    [{}],
    [{ range: 'nextYear' }],
    [{ range: 'toString' }],
    [{ range: 'custom' }],
    [{ range: 'custom', from: '2024-05-31', to: '2024-03-01' }],
    [{ range: 'custom', from: '2024-13-01', to: '2024-14-01' }],
    [{ range: 'custom', from: '2024-03-01' }],
  ])('reads %j as any time', (params) => {
    expect(readRangeParams(params)).toBe('any');
  });

  it('reads the first of a repeated param', () => {
    expect(readRangeParams({ range: ['thisYear', 'lastYear'] })).toBe('thisYear');
  });
});

describe('amount', () => {
  const fields = () => screen.getAllByDisplayValue(/.*/);

  it('starts from the bounds in use, drawn as amounts', async () => {
    await open({ type: 'amount', min: '1599', max: '100000' });

    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('At least')).toBeTruthy();
    expect(screen.getByText('At most')).toBeTruthy();
    expect(fields().map((field) => field.props.value)).toEqual(['15.99', '1,000']);
    expectPinned('Show payments', fields()[1]);
    expectPinned('Clear', fields()[1]);
  });

  it('hands back both bounds in whole cents, an empty one as none', async () => {
    await open({ type: 'amount' });
    await fireEvent.changeText(fields()[0], '10.07');
    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));

    expect(picks).toEqual([{ minCents: 1007, maxCents: null }]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('takes the same amount at both ends', async () => {
    await open({ type: 'amount' });
    await fireEvent.changeText(fields()[0], '15.99');
    await fireEvent.changeText(fields()[1], '15.99');
    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));

    expect(picks).toEqual([{ minCents: 1599, maxCents: 1599 }]);
  });

  it('refuses a smaller "at most" with a line above the buttons, and says it', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await open({ type: 'amount', min: '5000', max: '2000' });
    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));

    expect(screen.getByRole('alert').props.children).toBe('The smaller amount must come first.');
    expect(insideScroll(screen.getByRole('alert'))).toBe(false);
    expect(announce).toHaveBeenCalledWith('The smaller amount must come first.');
    expect(picks).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();

    await fireEvent.changeText(fields()[1], '50');
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));
    expect(picks).toEqual([{ minCents: 5000, maxCents: 5000 }]);
  });

  it('clears both fields with Clear, and hands back no bounds', async () => {
    await open({ type: 'amount', min: '5000', max: '2000' });
    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));

    expect(fields().map((field) => field.props.value)).toEqual(['', '']);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(picks).toEqual([]);

    await fireEvent.press(screen.getByRole('button', { name: 'Show payments' }));
    expect(picks).toEqual([{ minCents: null, maxCents: null }]);
  });

  it('reads a link the way it writes one, and a bound that is not whole cents as none', () => {
    expect(amountFilterHref(OWNER, { minCents: 1599, maxCents: null })).toEqual({
      pathname: '/payment-filter',
      params: { type: 'amount', owner: OWNER, min: '1599' },
    });
    expect(readAmountParams({ min: '1599', max: ['250', '9'] })).toEqual({
      minCents: 1599,
      maxCents: 250,
    });
    for (const bad of ['-5', '15.99', '1e3', ' 5', 'abc', '', '9999999999999999']) {
      expect(readAmountParams({ min: bad, max: bad })).toEqual({ minCents: null, maxCents: null });
    }
    expect(readAmountParams({ min: '99999999999999' }).minCents).toBe(99_999_999_999_999);
    expect(readAmountParams({ min: '100000000000000' }).minCents).toBeNull();
  });

  it.each([
    ['', null],
    ['0.1', 10],
    ['15.', 1500],
    ['10.07', 1007],
    ['1035', 103500],
    ['.', null],
  ])('reads the draft %j as %j cents', (draft, cents) => {
    expect(draftCents(draft)).toBe(cents);
  });
});

describe('paid from', () => {
  it('lists every card and account, a free account’s locked second card too', async () => {
    await open({ type: 'from' });
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));

    expect(screen.getByText('Paid from')).toBeTruthy();
    expect(screen.getAllByRole('radio').map((node) => node.props.accessibilityLabel)).toEqual([
      'All accounts',
      'Visa ••7010',
      'Discover ••6334',
      'Komal ••4410',
      'Ally',
      'Card not set',
    ]);
    expect(checked()).toEqual(['All accounts']);
  });

  it.each([
    ['Discover ••6334', 'card-2'],
    ['Ally', 'acct-2'],
    ['Card not set', ''],
    ['All accounts', null],
  ] as const)('hands back %s as soon as it is tapped', async (label, source) => {
    await open({ type: 'from', source: 'card-1' });
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
    await fireEvent.press(radio(label));

    expect(picks).toEqual([{ source }]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['none', ['Card not set']],
    ['all', ['All accounts']],
    ['card-2', ['Discover ••6334']],
    ['card-deleted', []],
  ])('ticks the source in use for %j', async (source, ticked) => {
    await open({ type: 'from', source });
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
    expect(checked()).toEqual(ticked);
  });

  it('waits for the cards and accounts before listing anything', async () => {
    mockHold = true;
    await open({ type: 'from' });

    expect(screen.queryAllByRole('radio')).toEqual([]);
    expect(screen.getByText('Paid from')).toBeTruthy();
    await act(async () => {
      for (const answer of mockHeld.splice(0)) answer();
    });
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
  });

  it('says a failed read failed, never "Card not set" for everything, and tries again', async () => {
    mockFailing.add('cards');
    await open({ type: 'from' });

    await waitFor(() =>
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy(),
    );
    expect(screen.queryAllByRole('radio')).toEqual([]);

    mockFailing.clear();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
  });

  it('reads a link the way it writes one', () => {
    for (const source of [null, '', 'card-2']) {
      expect(readSourceParam(sourceParam(source))).toBe(source);
    }
    expect(paidFromFilterHref(OWNER, '')).toEqual({
      pathname: '/payment-filter',
      params: { type: 'from', owner: OWNER, source: 'none' },
    });
    expect(readSourceParam(undefined)).toBeNull();
    expect(readSourceParam('')).toBeNull();
    expect(readSourceParam(['none', 'card-1'])).toBe('');
  });
});

describe('in Spanish and French', () => {
  it.each([
    ['es', 'Rango de fechas', 'Este mes', 'Elegir fechas', 'Ver pagos'],
    ['fr', 'Période', 'Ce mois-ci', 'Choisir les dates', 'Voir les paiements'],
  ] as const)('%s: the date range page', async (language, title, thisMonth, custom, apply) => {
    setLanguage(language);
    await open({ type: 'date' });

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(thisMonth)).toBeTruthy();
    await fireEvent.press(radio(custom));
    expect(screen.getByRole('button', { name: apply })).toBeTruthy();
  });

  it.each([
    ['es', 'Importe', 'El importe menor debe ir primero.', 'Borrar'],
    ['fr', 'Montant', 'Le plus petit montant doit venir en premier.', 'Effacer'],
  ] as const)('%s: the amount page and its refusal', async (language, title, refusal, clear) => {
    setLanguage(language);
    await open({ type: 'amount', min: '5000', max: '2000' });

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByRole('button', { name: clear })).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: language === 'es' ? 'Ver pagos' : 'Voir les paiements' }),
    );
    expect(screen.getByRole('alert').props.children).toBe(refusal);
  });

  it.each([
    ['es', 'Pagado con', 'Sin tarjeta'],
    ['fr', 'Payé avec', 'Aucune carte'],
  ] as const)('%s: the Paid from page', async (language, title, none) => {
    setLanguage(language);
    await open({ type: 'from' });
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(none)).toBeTruthy();
  });
});

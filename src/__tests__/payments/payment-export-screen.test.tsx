import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  configure,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { useSyncExternalStore, type Context, type ReactElement } from 'react';
import { AccessibilityInfo, Dimensions, Text, View } from 'react-native';

import { sharePayments } from '@/api/payment-export';
import { usePayments } from '@/api/payment-ledger';
import PaymentExportRoute from '@/app/payment-export';
import PaymentHistoryScreen from '@/app/payment-history';
import ProFeatureScreen from '@/app/pro-feature';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE, failureText } from '@/lib/failure';
import { ofKind, type PaymentKindFilter } from '@/lib/payment-entries';
import { monthGroups } from '@/lib/payment-years';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, type Scheme } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Export as a person meets it: the real route over the real `usePayments` and ledger, the real
 * history page it is opened from, and the real share-out down to the phone's file system, print and
 * share sheet, which are fakes in memory. The account is a bank statement in whole cents; what is
 * exported is read against it, and against what the history page shows for the same view.
 */

// A loaded machine can be slow to settle a page; a wait that is really stuck still fails.
configure({ asyncUtilTimeout: 3000 });

jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    {
      get:
        (_target, name) =>
        ({ color }: { color?: string }) =>
          createElement(View, { testID: `icon-${String(name)}`, iconColor: color }),
    },
  );
});
// A stack of pages, as expo-router's native stack keeps them: every page stays mounted under the
// one on top, hidden from VoiceOver, and a page is told its own params.
jest.mock('expo-router', () => {
  const { createContext, useContext, useEffect } = jest.requireActual('react');
  const ParamsContext = createContext({});
  return {
    __ParamsContext: ParamsContext,
    router: {
      push: jest.fn((href: unknown) => mockNav.push(href)),
      back: jest.fn(() => mockNav.back()),
      replace: jest.fn((href: unknown) => mockNav.replace(href)),
      canGoBack: () => mockNav.stack.length > 1,
    },
    useLocalSearchParams: () => useContext(ParamsContext),
    // Only the export page is gated here, so its params are the route's query.
    useCurrentRouteInfo: () => {
      const query = new URLSearchParams(useContext(ParamsContext)).toString();
      return { pathnameWithParams: query ? `/payment-export?${query}` : '/payment-export' };
    },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    // Replaces the page it is drawn in, as expo-router's does.
    Redirect: ({ href }: { href: unknown }) => {
      useEffect(() => {
        mockNav.replace(href);
      }, [href]);
      return null;
    },
  };
});
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('@/theme/artwork', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useArtwork: () =>
      new Proxy(
        {},
        { get: (_target, name) => () => createElement(View, { testID: `art-${String(name)}` }) },
      ),
  };
});
// Reanimated's shimmer does not run under Jest; the page only needs to know a skeleton is drawn.
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: () => createElement(View, { testID: 'skeleton' }),
    SkeletonList: () => createElement(View, { testID: 'skeleton-list' }),
  };
});
jest.mock('@/components/bills/bill-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BillMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'bill-mark', mark: props }),
  };
});
jest.mock('@/components/brands/brand-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BrandMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'brand-mark', mark: props }),
  };
});
// RevenueCat's bundle does not load under Jest; the real usePro() reads this same store.
jest.mock('@/api/pro', () => ({
  usePro: () => jest.requireActual('@/lib/pro-status').useProStatus(),
  useProPrices: () => ({ data: undefined }),
}));

let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
let mockUserId: string | null = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

// The phone's storage: the recent searches and the theme's choice live in it.
const mockStore = new Map<string, string>();
const mockStorage = { refuseRead: false, refuseWrite: false };
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      if (mockStorage.refuseRead) throw new Error('storage refused');
      return mockStore.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      if (mockStorage.refuseWrite) throw new Error('storage refused');
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
  },
}));

// The database, table by table. A fresh copy of the rows on every read, as the network gives.
const mockDatabase: Record<string, unknown[]> = {};
const mockReads: string[] = [];
const mockFailing = new Set<string>();
const mockHeld: (() => void)[] = [];
let mockHold = false;
jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        const answer = () => {
          mockReads.push(table);
          if (mockFailing.has(table)) {
            return resolve({ data: null, error: { code: '08006', message: 'offline' } });
          }
          return resolve({
            data: JSON.parse(JSON.stringify(mockDatabase[table] ?? [])),
            error: null,
          });
        };
        if (mockHold) mockHeld.push(answer);
        else answer();
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

// ---------------------------------------------------------------------------------------------
// The statement: what the bank says went out, in whole cents. Never derived from the app's code.

const VISA = 'card-visa';
const DISCOVER = 'card-discover';
const CHASE = 'acct-chase';
const ALLY = 'acct-ally';
const LABELS: Record<string, string> = {
  [VISA]: 'Visa ••4421',
  [DISCOVER]: 'Discover ••6334',
  [CHASE]: 'Komal ••7010',
  [ALLY]: 'Ally',
};

type Plan = {
  id: string;
  kind: 'bill' | 'subscription';
  name: string;
  day: number;
  from: string;
  /** Last day it was charged; open for a plan still running. */
  to?: string;
  cents: (date: string) => number;
  /** What each charge was recorded under, when that was not the plan's name now. */
  label?: (date: string) => string;
  source: string;
  category?: string;
  icon?: string;
  domain?: string;
};

const winter = (date: string) => ['12', '01', '02'].includes(date.slice(5, 7));
const summer = (date: string) => ['06', '07', '08'].includes(date.slice(5, 7));

const PLANS: Plan[] = [
  {
    id: 'netflix',
    kind: 'subscription',
    name: 'Netflix',
    day: 9,
    from: '2021-09-09',
    cents: (date) =>
      date < '2023-01-01' ? 1399 : date < '2024-01-01' ? 1499 : date < '2025-01-01' ? 1549 : 1599,
    source: '',
    domain: 'netflix.com',
  },
  {
    id: 'spotify',
    kind: 'subscription',
    name: 'Spotify',
    day: 12,
    from: '2024-03-12',
    cents: (date) => (date < '2025-07-01' ? 1099 : 1199),
    source: DISCOVER,
    domain: 'spotify.com',
  },
  {
    id: 'hulu',
    kind: 'subscription',
    name: 'Hulu',
    day: 14,
    from: '2022-01-14',
    to: '2024-06-14',
    cents: () => 799,
    source: VISA,
    domain: 'hulu.com',
  },
  {
    id: 'aep',
    kind: 'bill',
    name: 'AEP',
    day: 22,
    from: '2023-01-22',
    cents: (date) => (winter(date) ? 16840 : summer(date) ? 14217 : 9655),
    source: CHASE,
    category: 'energy',
  },
  {
    id: 'rent',
    kind: 'bill',
    name: 'Rent',
    day: 1,
    from: '2021-03-01',
    cents: (date) => (date < '2025-01-01' ? 98500 : 103500),
    source: CHASE,
    category: 'housing',
  },
  {
    id: 'car',
    kind: 'bill',
    name: 'Car loan',
    day: 28,
    from: '2024-04-28',
    cents: () => 55400,
    source: VISA,
    category: 'loans',
    icon: 'loan-car',
  },
  // Charged as "Fios" until it was renamed.
  {
    id: 'internet',
    kind: 'bill',
    name: 'Internet',
    day: 18,
    from: '2023-01-18',
    cents: (date) => (date < '2025-01-01' ? 7999 : 8499),
    label: (date) => (date < '2025-01-01' ? 'Fios' : 'Internet'),
    source: CHASE,
    category: 'internet',
  },
  // A name that needs quoting in a CSV and escaping in a page, and one that would be a formula.
  {
    id: 'garage',
    kind: 'bill',
    name: 'Smith & Sons, "Bay 2"',
    day: 15,
    from: '2026-04-15',
    cents: () => 6000,
    source: VISA,
    category: 'other',
  },
  {
    id: 'cheap',
    kind: 'bill',
    name: '=Cheap',
    day: 6,
    from: '2026-05-06',
    cents: () => 2550,
    source: '',
    category: 'other',
  },
  {
    id: 'nationwide',
    kind: 'bill',
    name: 'Nationwide',
    day: 3,
    from: '2025-02-03',
    cents: () => 14500,
    source: '',
    category: 'insurance',
  },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** The `day`th of every month from `from` to `to`, both ends included. */
function monthly(from: string, day: number, to: string): string[] {
  const dates: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  for (;;) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    if (date > to) return dates;
    if (date >= from) dates.push(date);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

const nextAfter = (day: number, today: string): string => {
  const [first] = monthly(today, day, `${Number(today.slice(0, 4)) + 1}-12-31`).filter(
    (date) => date > today,
  );
  return first;
};

type Paid = {
  /** The ledger's id for it, which is also the row's test id after `payment-`. */
  id: string;
  date: string;
  name: string;
  cents: number;
  kind: 'bill' | 'subscription';
  status: 'paid' | 'extraPayment';
  source: string;
  plan: string;
  route: { pathname: string; id: string };
};

/** A $1,000 extra payment on the car loan, from the Chase account. */
const PAYOFF = { id: 'car-extra', date: '2025-09-10', cents: 100000 };

/** Every payment up to `today`, newest first. */
function statement(today: string): Paid[] {
  const paid: Paid[] = [];
  for (const plan of PLANS) {
    for (const date of monthly(plan.from, plan.day, plan.to ?? today)) {
      paid.push({
        id: `charge-${plan.id}-${date}`,
        date,
        name: plan.label?.(date) ?? plan.name,
        cents: plan.cents(date),
        kind: plan.kind,
        status: 'paid',
        source: plan.source,
        plan: plan.id,
        route: {
          pathname:
            plan.kind === 'subscription'
              ? '/subscription/[id]'
              : plan.category === 'loans'
                ? '/loan/[id]'
                : '/bill/[id]',
          id: plan.id,
        },
      });
    }
  }
  if (PAYOFF.date <= today) {
    paid.push({
      id: `payoff-${PAYOFF.id}`,
      date: PAYOFF.date,
      name: 'Car loan',
      cents: PAYOFF.cents,
      kind: 'bill',
      status: 'extraPayment',
      source: CHASE,
      plan: 'car',
      route: { pathname: '/loan/[id]', id: 'car' },
    });
  }
  return paid.sort((a, b) =>
    a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? 1 : -1,
  );
}

/** The database as it would hold that account on `today`. */
function load(today: string) {
  const row = (plan: Plan) => ({
    id: plan.id,
    name: plan.name,
    amount: plan.cents(today) / 100,
    created_at: '2019-06-01T12:00:00Z',
    card_id: plan.source.startsWith('card') ? plan.source : null,
    bank_account_id: plan.source.startsWith('acct') ? plan.source : null,
    brand_id: null,
    brands: plan.domain ? { domain: plan.domain } : null,
  });
  mockDatabase.cards = [
    { id: VISA, holder: 'Sam', network: 'Visa', last4: '4421', color: '#111111', balance: 0 },
    { id: DISCOVER, holder: '', network: 'Discover', last4: '6334', color: '#222222', balance: 0 },
  ];
  mockDatabase.bank_accounts = [
    {
      id: CHASE,
      bank_name: 'Chase',
      nickname: 'Komal',
      account_type: 'checking',
      last4: '7010',
      color: '#333333',
      balance: 0,
    },
    {
      id: ALLY,
      bank_name: 'Ally',
      nickname: null,
      account_type: 'savings',
      last4: null,
      color: '#444444',
      balance: 0,
    },
  ];
  mockDatabase.subscriptions = PLANS.filter((plan) => plan.kind === 'subscription').map((plan) => ({
    ...row(plan),
    cycle: 'monthly',
    next_renewal_on: plan.to ? null : nextAfter(plan.day, today),
    started_on: plan.from,
    category_id: 'entertainment',
    note: null,
    active: !plan.to,
  }));
  mockDatabase.bills = PLANS.filter((plan) => plan.kind === 'bill').map((plan) => ({
    ...row(plan),
    category_id: plan.category ?? 'other',
    icon_id: plan.icon ?? null,
    recurrence: 'monthly',
    next_due_on: nextAfter(plan.day, today),
    starts_on: plan.from,
    ends_on: null,
  }));
  mockDatabase.charges = statement(today)
    .filter((paid) => paid.status === 'paid')
    .map((paid) => {
      const plan = PLANS.find((candidate) => candidate.id === paid.plan)!;
      return {
        id: `${paid.plan}-${paid.date}`,
        bill_id: plan.kind === 'bill' ? plan.id : null,
        subscription_id: plan.kind === 'subscription' ? plan.id : null,
        label: paid.name,
        amount: paid.cents / 100,
        charged_on: paid.date,
        card_id: paid.source.startsWith('card') ? paid.source : null,
        bank_account_id: paid.source.startsWith('acct') ? paid.source : null,
      };
    });
  mockDatabase.loan_payoffs = [
    {
      id: PAYOFF.id,
      bill_id: 'car',
      paid_on: PAYOFF.date,
      amount: PAYOFF.cents / 100,
      kind: 'partial',
      card_id: null,
      bank_account_id: CHASE,
      counted: true,
      created_at: `${PAYOFF.date}T12:00:00Z`,
      card: null,
      account: null,
    },
  ];
}

/** "$1,035.00" from whole cents. */
const usd = (cents: number) =>
  `$${String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${pad(cents % 100)}`;

const sum = (rows: readonly { cents: number }[]) =>
  rows.reduce((total, row) => total + row.cents, 0);

// The phone's native sharing, in memory: the files written, the sheet opened, the PDF printed.
const mockNative = {
  region: 'US' as string | null,
  available: true,
  shareHeld: false,
  shareHolds: [] as (() => void)[],
  shareFails: false,
  printFails: false,
  writeFails: false,
  files: new Map<string, string>(),
  dirs: new Set<string>(['file:///cache']),
  shared: [] as { uri: string; options: Record<string, unknown>; content: string | undefined }[],
  printed: [] as Record<string, unknown>[],
};

jest.mock('expo-file-system', () => {
  const uriOf = (parts: unknown[]) =>
    parts
      .map((part) => (typeof part === 'string' ? part : (part as { uri: string }).uri))
      .map((part) => part.replace(/\/+$/, ''))
      .join('/');
  const parentOf = (uri: string) => uri.slice(0, uri.lastIndexOf('/'));
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = uriOf(parts);
    }
    get exists() {
      return mockNative.dirs.has(this.uri);
    }
    delete() {
      for (const uri of [...mockNative.files.keys()]) {
        if (uri.startsWith(`${this.uri}/`)) mockNative.files.delete(uri);
      }
      mockNative.dirs.delete(this.uri);
    }
    create() {
      mockNative.dirs.add(this.uri);
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = uriOf(parts);
    }
    get exists() {
      return mockNative.files.has(this.uri);
    }
    create() {
      if (!mockNative.dirs.has(parentOf(this.uri))) throw new Error('no parent folder');
      mockNative.files.set(this.uri, '');
    }
    write(content: string) {
      if (mockNative.writeFails) throw new Error('disk full');
      mockNative.files.set(this.uri, content);
    }
    delete() {
      mockNative.files.delete(this.uri);
    }
    async move(to: File) {
      mockNative.files.set(to.uri, mockNative.files.get(this.uri) ?? '');
      mockNative.files.delete(this.uri);
      this.uri = to.uri;
    }
  }
  return { Directory, File, Paths: { cache: new Directory('file:///cache') } };
});
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => mockNative.available),
  shareAsync: jest.fn(async (uri: string, options: Record<string, unknown>) => {
    mockNative.shared.push({ uri, options, content: mockNative.files.get(uri) });
    if (mockNative.shareFails) throw new Error('no view controller');
    if (mockNative.shareHeld)
      await new Promise<void>((resolve) => mockNative.shareHolds.push(resolve));
  }),
}));
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async (options: Record<string, unknown>) => {
    mockNative.printed.push(options);
    if (mockNative.printFails) throw new Error('print failed');
    mockNative.dirs.add('file:///cache/Print');
    mockNative.files.set('file:///cache/Print/5C1D.pdf', '%PDF-1.7');
    return { uri: 'file:///cache/Print/5C1D.pdf', numberOfPages: 2 };
  }),
}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ regionCode: mockNative.region }] }));

// The real share-out, watched: every call the page makes to it is kept.
jest.mock('@/api/payment-export', () => {
  const actual = jest.requireActual('@/api/payment-export');
  return { ...actual, sharePayments: jest.fn(actual.sharePayments) };
});

// ---------------------------------------------------------------------------------------------
// The stack.

type Entry = { key: number; pathname: string; params: Record<string, string> };

function entryOf(href: unknown, key: number): Entry {
  if (typeof href === 'string') {
    const [pathname, query = ''] = href.split('?');
    return { key, pathname, params: Object.fromEntries(new URLSearchParams(query)) };
  }
  const given = href as { pathname: string; params?: Record<string, unknown> };
  return {
    key,
    pathname: given.pathname,
    params: Object.fromEntries(
      Object.entries(given.params ?? {}).map(([name, value]) => [name, String(value)]),
    ),
  };
}

const mockNav = {
  stack: [] as Entry[],
  next: 1,
  listeners: new Set<() => void>(),
  set(stack: Entry[]) {
    this.stack = stack;
    this.listeners.forEach((listener) => listener());
  },
  push(href: unknown) {
    this.set([...this.stack, entryOf(href, this.next++)]);
  },
  back() {
    this.set(this.stack.slice(0, -1));
  },
  replace(href: unknown) {
    this.set([...this.stack.slice(0, -1), entryOf(href, this.next++)]);
  },
  /** Another set of pages in the same stack, shown at once. */
  show(pages: unknown[]) {
    this.set(pages.map((page) => entryOf(page, this.next++)));
  },
  reset(pages: unknown[]) {
    this.next = 1;
    this.stack = pages.map((page) => entryOf(page, this.next++));
    this.listeners.clear();
  },
  subscribe: (listener: () => void) => {
    mockNav.listeners.add(listener);
    return () => {
      mockNav.listeners.delete(listener);
    };
  },
};

const ParamsContext = (
  jest.requireMock('expo-router') as { __ParamsContext: Context<Record<string, string>> }
).__ParamsContext;

function Host() {
  const stack = useSyncExternalStore(mockNav.subscribe, () => mockNav.stack);
  return (
    <>
      {stack.map((entry, index) => {
        const covered = index < stack.length - 1;
        return (
          <View
            key={entry.key}
            testID={`page-${entry.key}`}
            accessibilityElementsHidden={covered}
            importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
          >
            <ParamsContext.Provider value={entry.params}>
              {entry.pathname === '/payment-export' ? (
                <PaymentExportRoute />
              ) : entry.pathname === '/payment-history' ? (
                <PaymentHistoryScreen />
              ) : entry.pathname === '/pro-feature' ? (
                <ProFeatureScreen />
              ) : (
                <Text testID="stub">{`${entry.pathname} ${JSON.stringify(entry.params)}`}</Text>
              )}
            </ParamsContext.Provider>
          </View>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Mounting and reading.

let client: QueryClient;

function app(node: ReactElement) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{node}</ThemeProvider>
    </QueryClientProvider>
  );
}

/** Every table read and no read still on its way. */
const loaded = () =>
  waitFor(() => {
    expect(new Set(mockReads).size).toBe(6);
    expect(client.isFetching()).toBe(0);
  });

const exportPage = (kind?: string, year?: string) => ({
  pathname: '/payment-export',
  params: { ...(kind === undefined ? {} : { kind }), ...(year === undefined ? {} : { year }) },
});

/** The export page for a view, once the account has been read. */
async function openExport(kind?: string, year?: string, button = 'Export') {
  mockNav.reset([exportPage(kind, year)]);
  const view = await render(app(<Host />));
  await loaded();
  await screen.findByRole('button', { name: button });
  return view;
}

const hidden = { includeHiddenElements: true };
const top = () => mockNav.stack[mockNav.stack.length - 1];
const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');
const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');
const labelOf = (node: { props: Record<string, unknown> }) => String(node.props.accessibilityLabel);
const pageLines = () => [...new Set(screen.getAllByText(/./).map(textOf))];
const exportButton = (name = 'Export') => screen.getByRole('button', { name });
const csvRadio = () => screen.getByRole('radio', { name: /^CSV/ });
const pdfRadio = () => screen.getByRole('radio', { name: /^PDF/ });

const rowIds = () =>
  screen
    .queryAllByTestId(/^payment-/)
    .map((node) => String(node.props.testID))
    .filter((id) => !id.endsWith('-words'))
    .map((id) => id.replace(/^payment-/, ''));

const TODAY = '2026-10-12';
const ALL = statement(TODAY);
const FLOOR = '2020-01-01';

/** What a view of the history is: the kind, the year, every payment in it. */
const viewOf = (kind: string, year: number | 'all', rows: readonly Paid[] = ALL) =>
  rows.filter(
    (p) =>
      (kind === 'all' || p.kind === kind) &&
      p.date >= FLOOR &&
      p.date <= TODAY &&
      (year === 'all' || p.date.startsWith(`${year}-`)),
  );

// What a CSV says of a row, written out by hand: RFC 4180 quoting, a guard against formulas,
// plain amounts from whole cents, and the words of the language on screen.
const csvCell = (text: string) => {
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};
const plain = (cents: number) => `${Math.floor(cents / 100)}.${pad(cents % 100)}`;
const KIND_WORDS = {
  en: { bill: 'Bill', subscription: 'Subscription', extraPayment: 'Extra payment' },
  es: { bill: 'Factura', subscription: 'Suscripción', extraPayment: 'Pago extra' },
  fr: { bill: 'Facture', subscription: 'Abonnement', extraPayment: 'Paiement supplémentaire' },
} as const;
const csvLine = (p: Paid, words: Record<string, string> = KIND_WORDS.en, notSet = 'Card not set') =>
  [
    p.date,
    csvCell(p.name),
    p.status === 'extraPayment' ? words.extraPayment : words[p.kind],
    plain(p.cents),
    csvCell(LABELS[p.source] ?? notSet),
  ].join(',');

const HEADER = '﻿Date,Name,Kind,Amount (USD),Paid from';

/** The request the last export sent to the share-out. */
const lastRequest = () => {
  const calls = jest.mocked(sharePayments).mock.calls;
  return calls[calls.length - 1][0];
};
const csvOf = (request = lastRequest()) => (request.format === 'csv' ? request.csv : '');
const htmlOf = (request = lastRequest()) => (request.format === 'pdf' ? request.html : '');
/** The data lines of a CSV: no header, no trailing break. */
const csvRows = (text: string) => text.split('\r\n').slice(1, -1);

beforeEach(() => {
  resetLocaleForTests();
  resetProStatusForTests();
  publishProStatus({ pro: true, ready: true });
  mockToday = TODAY;
  mockUserId = 'user-1';
  mockStore.clear();
  mockStorage.refuseRead = false;
  mockStorage.refuseWrite = false;
  mockReads.length = 0;
  mockFailing.clear();
  mockHeld.length = 0;
  mockHold = false;
  load(mockToday);
  Object.assign(mockNative, {
    region: 'US',
    available: true,
    shareHeld: false,
    shareHolds: [],
    shareFails: false,
    printFails: false,
    writeFails: false,
    shared: [],
    printed: [],
  });
  mockNative.files.clear();
  mockNative.dirs = new Set(['file:///cache']);
  jest.clearAllMocks();
  const window = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  client.clear();
});

const BY_ID = new Map(ALL.map((p) => [p.id, p]));
const paid = (id: string) => BY_ID.get(id)!;

/** What the history page shows for a kind and year: the ids of the rows it lists, top to bottom. */
async function historyIds(kind: string, year: number): Promise<string[]> {
  mockNav.reset([{ pathname: '/payment-history', params: { kind, year: String(year) } }]);
  const view = await render(app(<Host />));
  await loaded();
  await waitFor(() => expect(screen.queryByTestId('history-loading')).toBeNull());
  const ids = rowIds();
  await view.unmount();
  return ids;
}

/** The same, from the hook the page reads, the kind's tab and the month groups it draws. */
async function hookRows(kind: PaymentKindFilter, year: number | 'all') {
  const view = await renderHook(() => usePayments(TODAY), {
    wrapper: ({ children }: { children: ReactElement }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  const { payments, listFloor } = view.result.current;
  const years =
    year === 'all'
      ? [...new Set(payments.map((p) => Number(p.date.slice(0, 4))))].sort((a, b) => b - a)
      : [year];
  const rows = years.flatMap((each) =>
    monthGroups(
      ofKind(payments, kind).filter((p) => p.date.startsWith(`${each}-`)),
      listFloor,
    ).flatMap((group) => group.rows),
  );
  await view.unmount();
  return rows;
}

/** Opens the export page for a view and exports it as it opens: CSV, or PDF when asked. */
async function exportView(kind: string, year: string, format: 'csv' | 'pdf' = 'csv') {
  const view = await openExport(kind, year);
  if (format === 'pdf') await fireEvent.press(pdfRadio());
  await fireEvent.press(exportButton());
  await waitFor(() => expect(sharePayments).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy());
  const request = lastRequest();
  await view.unmount();
  jest.mocked(sharePayments).mockClear();
  return request;
}

// ---------------------------------------------------------------------------------------------
// The gate.

describe('the Pro gate', () => {
  it('sends free to the export explainer, and never reads a payment', async () => {
    publishProStatus({ pro: false, ready: true });
    mockNav.reset([exportPage('bill', '2026')]);
    await render(app(<Host />));
    await act(async () => {});

    expect(top()).toEqual(
      expect.objectContaining({
        pathname: '/pro-feature',
        params: { id: 'export', next: '/payment-export?kind=bill&year=2026' },
      }),
    );
    // The real explainer, with its own words.
    expect(await screen.findByText('Export your payments')).toBeTruthy();
    expect(screen.getByText('skip-payments-all-years.pdf')).toBeTruthy();
    expect(screen.getByText('Every payment, as a spreadsheet or a PDF.')).toBeTruthy();
    expect(screen.getByText('CSV for Numbers, Excel or Google Sheets')).toBeTruthy();
    expect(screen.getByText('A PDF statement to print or send')).toBeTruthy();
    expect(screen.getByText('Any year, up to 7 years back')).toBeTruthy();
    // Not one table was read, and nothing could be shared.
    expect(mockReads).toEqual([]);
    expect(sharePayments).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
  });

  it('draws nothing and reads nothing while Pro is being checked, then opens when it is known', async () => {
    resetProStatusForTests();
    mockNav.reset([exportPage('bill', '2026')]);
    await render(app(<Host />));
    await act(async () => {});
    expect(top().pathname).toBe('/payment-export');
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    expect(screen.queryByText('Export')).toBeNull();
    expect(mockReads).toEqual([]);

    await act(async () => publishProStatus({ pro: true, ready: true }));
    await loaded();
    expect(await screen.findByRole('button', { name: 'Export' })).toBeTruthy();
    expect(top().pathname).toBe('/payment-export');
  });

  it('while Pro is being checked, and free is the answer: the explainer, and still nothing read', async () => {
    resetProStatusForTests();
    mockNav.reset([exportPage()]);
    await render(app(<Host />));
    await act(async () => publishProStatus({ pro: false, ready: true }));
    expect(top().pathname).toBe('/pro-feature');
    expect(mockReads).toEqual([]);
  });

  it('Pro: opens on the view it was sent, having read the account', async () => {
    await openExport('bill', '2026');
    expect(new Set(mockReads).size).toBe(6);
    expect(top().pathname).toBe('/payment-export');
    expect(screen.getByText('Bills')).toBeTruthy();
  });

  it('keeps a page left open when Pro lapses under it: nothing locks on lapse', async () => {
    await openExport('bill', '2026');
    await act(async () => publishProStatus({ pro: false, ready: true }));
    expect(top().pathname).toBe('/payment-export');
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------------------------
// What the page says it will export.

describe('the scope summary', () => {
  const COMBOS = [
    ['bill', '2026', 'Bills', 'This year'],
    ['subscription', '2026', 'Subscriptions', 'This year'],
    ['all', '2026', 'Bills and subscriptions', 'This year'],
    ['bill', '2025', 'Bills', '2025'],
    ['subscription', '2024', 'Subscriptions', '2024'],
    ['all', '2021', 'Bills and subscriptions', '2021'],
    ['all', 'all', 'Bills and subscriptions', 'All years'],
    ['bill', 'all', 'Bills', 'All years'],
    ['subscription', 'all', 'Subscriptions', 'All years'],
  ] as const;

  it.each(COMBOS)(
    'kind %s, year %s: "%s", counted against the statement',
    async (kind, year, heading, when) => {
      await openExport(kind, year);
      const rows = viewOf(kind, year === 'all' ? 'all' : Number(year));
      expect(rows.length).toBeGreaterThan(0);
      const count = `${rows.length} ${rows.length === 1 ? 'payment' : 'payments'}`;
      expect(screen.getByText(heading)).toBeTruthy();
      expect(screen.getByText(`${count} · ${when}`)).toBeTruthy();
      // VoiceOver reads it as one stop.
      expect(screen.getByLabelText(`${heading}, ${count}, ${when}`)).toBeTruthy();
      expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
    },
  );

  it.each([
    ['a kind it does not know', 'nonsense', '2026', 'Bills and subscriptions', 'This year'],
    ['no kind at all', undefined, '2026', 'Bills and subscriptions', 'This year'],
    ['no year at all', 'bill', undefined, 'Bills', 'This year'],
    ['a year that is not a year', 'bill', 'soon', 'Bills', 'This year'],
    ['a whole date for a year', 'bill', '2026-10-12', 'Bills', 'This year'],
    ['a year from the future', 'bill', '2099', 'Bills', 'This year'],
    ['"ALL" in capitals', 'bill', 'ALL', 'Bills', 'This year'],
  ] as const)('falls back for %s', async (_, kind, year, heading, when) => {
    await openExport(kind, year);
    const rows = viewOf(kind === 'bill' ? 'bill' : 'all', 2026);
    expect(screen.getByText(heading)).toBeTruthy();
    expect(screen.getByText(`${rows.length} payments · ${when}`)).toBeTruthy();
  });

  it('holds a year before the seven kept to the first of them', async () => {
    await openExport('all', '2010');
    // 2020 is the first kept year, and this account has nothing in it.
    expect(screen.getByText('Nothing to export for 2020.')).toBeTruthy();
    expect(screen.getByText('0 payments · 2020')).toBeTruthy();
  });

  it('counts a payment made today, and never one still to come', async () => {
    const request = await exportView('subscription', '2026');
    const rows = csvRows(csvOf(request));
    expect(rows).toContain(csvLine(paid('charge-spotify-2026-10-12')));
    // Netflix is next due on 9 Nov, and Spotify on 12 Nov: not payments yet.
    expect(rows.every((line) => line.slice(0, 10) <= TODAY)).toBe(true);
    expect(rows.some((line) => line.startsWith('2026-11-'))).toBe(false);
  });

  it('says there is nothing to export for a year with nothing in it, with Export off and no choices', async () => {
    mockNav.reset([exportPage('all', '2020')]);
    await render(app(<Host />));
    await loaded();
    expect(await screen.findByText('Nothing to export for 2020.')).toBeTruthy();
    expect(screen.queryByTestId('export-choices')).toBeNull();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(exportButton());
    expect(sharePayments).not.toHaveBeenCalled();
  });

  it('says there is nothing to export yet for an account with no payments, across all years', async () => {
    for (const table of ['bills', 'subscriptions', 'charges', 'loan_payoffs']) {
      mockDatabase[table] = [];
    }
    await openExport('all', 'all');
    expect(screen.getByText('Nothing to export yet.')).toBeTruthy();
    expect(screen.getByText('0 payments · All years')).toBeTruthy();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.queryByText(/Nothing to export for/)).toBeNull();
  });

  it('waits for the account, and never says there is nothing while it reads', async () => {
    mockHold = true;
    mockNav.reset([exportPage('bill', '2026')]);
    await render(app(<Host />));
    expect(await screen.findByTestId('export-loading')).toBeTruthy();
    expect(screen.queryByText(/Nothing to export/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();

    mockHold = false;
    await act(async () => {
      for (const answer of mockHeld.splice(0)) answer();
    });
    expect(await screen.findByRole('button', { name: 'Export' })).toBeTruthy();
    expect(screen.queryByTestId('export-loading')).toBeNull();
  });

  it.each(['charges', 'cards', 'subscriptions', 'loan_payoffs'])(
    'a failed read of %s is the failure page with Try again, never "nothing to export"',
    async (table) => {
      mockFailing.add(table);
      mockNav.reset([exportPage('bill', '2026')]);
      await render(app(<Host />));
      expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByText(/Nothing to export/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();

      mockFailing.clear();
      await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByRole('button', { name: 'Export' })).toBeTruthy();
      expect(screen.getByText('Bills')).toBeTruthy();
    },
  );
});

// ---------------------------------------------------------------------------------------------
// The file is the history page's rows.

describe('what is exported is what the history page shows', () => {
  const KINDS = ['all', 'bill', 'subscription'] as const;
  const YEARS = [2026, 2025, 2024, 2021] as const;

  it.each(KINDS.flatMap((kind) => YEARS.map((year) => [kind, year] as const)))(
    'kind %s, %s: the CSV is the history page’s rows, to the cent',
    async (kind, year) => {
      const shown = await historyIds(kind, year);
      const viaHook = await hookRows(kind, year);
      const request = await exportView(kind, String(year));

      // The history page, the hook it reads and the statement agree on the rows...
      expect(shown.length).toBeGreaterThan(0);
      expect(viaHook.map((row) => row.id)).toEqual(shown);
      expect(viewOf(kind, year).map((p) => p.id)).toEqual(shown);
      // ...and the file is exactly those rows, in that order.
      expect(csvRows(csvOf(request))).toEqual(shown.map((id) => csvLine(paid(id))));
      expect(request).toMatchObject({ format: 'csv', kind, year, dialogTitle: 'Export' });
    },
  );

  it.each(KINDS)(
    'kind %s, all years: the CSV is every year’s rows, newest year first',
    async (kind) => {
      const viaHook = await hookRows(kind, 'all');
      const request = await exportView(kind, 'all');
      expect(viaHook.map((row) => row.id)).toEqual(viewOf(kind, 'all').map((p) => p.id));
      expect(csvRows(csvOf(request))).toEqual(viaHook.map((row) => csvLine(paid(row.id))));
      expect(request).toMatchObject({ format: 'csv', kind, year: 'all' });
    },
  );

  it('the file’s money adds up to the page’s count and the statement, to the cent', async () => {
    const request = await exportView('all', '2025');
    const rows = viewOf('all', 2025);
    const cents = csvRows(csvOf(request)).map((line) => {
      const cell = /,(\d+)\.(\d\d),[^,]*$/.exec(line)!;
      return Number(cell[1]) * 100 + Number(cell[2]);
    });
    expect(cents).toHaveLength(rows.length);
    expect(cents.reduce((total, each) => total + each, 0)).toBe(sum(rows));
  });

  it.each([
    ['bill', 2026],
    ['subscription', 2025],
    ['all', 2025],
  ] as const)(
    'kind %s, %s: the PDF has the same rows, month subtotals and total',
    async (kind, year) => {
      const request = await exportView(kind, String(year), 'pdf');
      const html = htmlOf(request);
      const rows = viewOf(kind, year);

      const [columns, ...found] = [
        ...html.matchAll(
          /<div class="date">([^<]*)<\/div><div class="name">([^<]*)<\/div><div class="kind">([^<]*)<\/div><div class="amount">([^<]*)<\/div><div class="from">([^<]*)<\/div>/g,
        ),
      ].map((match) => match.slice(1, 6).map(unescapeHtml));
      expect(columns).toEqual(['Date', 'Name', 'Kind', 'Amount (USD)', 'Paid from']);
      expect(found).toEqual(
        rows.map((p) => [
          dayText(p.date),
          p.name,
          p.status === 'extraPayment'
            ? 'Extra payment'
            : p.kind === 'bill'
              ? 'Bill'
              : 'Subscription',
          usd(p.cents),
          LABELS[p.source] ?? 'Card not set',
        ]),
      );

      // Each month, newest first, with the whole month's total.
      const months = [...new Set(rows.map((p) => p.date.slice(0, 7)))];
      expect(
        [
          ...html.matchAll(
            /<div class="heading">([^<]*)<\/div><div class="amount">([^<]*)<\/div>/g,
          ),
        ].map((match) => [match[1], match[2]]),
      ).toEqual(
        months.map((month) => [
          `${MONTHS_LONG[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`,
          usd(sum(rows.filter((p) => p.date.startsWith(month)))),
        ]),
      );
      expect(html).toContain(`<span class="figure">${usd(sum(rows))}</span>`);
      expect(request).toMatchObject({ format: 'pdf', kind, year });
    },
  );
});

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const dayText = (date: string) =>
  `${Number(date.slice(8))} ${MONTHS_LONG[Number(date.slice(5, 7)) - 1].slice(0, 3)} ${date.slice(0, 4)}`;
const unescapeHtml = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// ---------------------------------------------------------------------------------------------
// The files, as the share sheet receives them.

describe('the file that is shared', () => {
  const FOLDER = 'file:///cache/payment-exports';
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  it('is a CSV named for its view, UTF-8 with a byte-order mark and CRLF lines, shared as a CSV', async () => {
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockNative.shared).toHaveLength(1));

    const rows = viewOf('bill', 2026);
    const [shared] = mockNative.shared;
    expect(shared.uri).toBe(`${FOLDER}/skip-bills-2026.csv`);
    expect(shared.options).toEqual({
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Export',
    });
    // The sheet opens the file the page wrote, which holds exactly the CSV it built.
    expect(shared.content).toBe(csvOf());
    expect(shared.content).toBe([HEADER, ...rows.map((p) => csvLine(p)), ''].join('\r\n'));
    expect(shared.content!.startsWith('﻿')).toBe(true);
    expect(shared.content!.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('quotes a name with a comma and quotes, and guards one that would be a formula', async () => {
    const request = await exportView('bill', '2026');
    const lines = csvRows(csvOf(request));
    expect(lines).toContain('2026-09-15,"Smith & Sons, ""Bay 2""",Bill,60.00,Visa ••4421');
    expect(lines).toContain("2026-09-06,'=Cheap,Bill,25.50,Card not set");
    // Every line still has its five cells once the quoting is read back.
    for (const line of lines) {
      const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.filter((cell) => cell !== '');
      expect([line, cells.length]).toEqual([line, 5]);
    }
  });

  it('escapes the same names in the PDF, so a name cannot add markup to the statement', async () => {
    const request = await exportView('bill', '2026', 'pdf');
    const html = htmlOf(request);
    expect(html).toContain('Smith &amp; Sons, &quot;Bay 2&quot;');
    expect(html).not.toContain('Smith & Sons');
    expect(html).not.toContain('"Bay 2"</div>');
    expect(html).toContain('<div class="name">=Cheap</div>');
  });

  it('is a PDF printed on the paper of the phone’s region, moved under its name, shared as a PDF', async () => {
    await openExport('all', 'all');
    await fireEvent.press(pdfRadio());
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockNative.shared).toHaveLength(1));

    const request = lastRequest();
    expect(mockNative.printed).toEqual([
      {
        html: htmlOf(request),
        width: 612,
        height: 792,
        margins: { top: 40, right: 36, bottom: 40, left: 36 },
      },
    ]);
    const [shared] = mockNative.shared;
    expect(shared.uri).toBe(`${FOLDER}/skip-payments-all-years.pdf`);
    expect(shared.options).toEqual({
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Export',
    });
    expect(shared.content).toBe('%PDF-1.7');
    // Moved, not copied: the printer's own file does not pile up in the cache.
    expect(mockNative.files.has('file:///cache/Print/5C1D.pdf')).toBe(false);
  });

  it('is printed on A4 outside the places that use Letter', async () => {
    mockNative.region = 'GB';
    await openExport('bill', '2026');
    await fireEvent.press(pdfRadio());
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockNative.printed).toHaveLength(1));
    expect(mockNative.printed[0]).toMatchObject({ width: 595.28, height: 841.89 });
  });

  it('keeps only the newest export in the cache', async () => {
    await exportView('bill', '2026');
    expect([...mockNative.files.keys()]).toEqual([`${FOLDER}/skip-bills-2026.csv`]);
    await exportView('subscription', '2025', 'pdf');
    expect([...mockNative.files.keys()]).toEqual([`${FOLDER}/skip-subscriptions-2025.pdf`]);
  });

  it('names the file for the kind and the year, or for all years', async () => {
    await exportView('all', '2024');
    expect(mockNative.shared.at(-1)!.uri).toBe(`${FOLDER}/skip-payments-2024.csv`);
    await exportView('subscription', 'all', 'pdf');
    expect(mockNative.shared.at(-1)!.uri).toBe(`${FOLDER}/skip-subscriptions-all-years.pdf`);
  });
});

// ---------------------------------------------------------------------------------------------
// Busy, cancelled, failed.

describe('while sharing, and after', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  it('is busy until the sheet closes: "Preparing…", off, and a second tap does nothing', async () => {
    mockNative.shareHeld = true;
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());

    const busy = await screen.findByRole('button', { name: 'Preparing…' });
    expect(busy.props.accessibilityState).toMatchObject({ disabled: true });
    await waitFor(() => expect(mockNative.shared).toHaveLength(1));
    await fireEvent.press(busy);
    await fireEvent.press(busy);
    await act(async () => {});
    expect(sharePayments).toHaveBeenCalledTimes(1);
    expect(mockNative.shared).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();

    await act(async () => mockNative.shareHolds.shift()!());
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(sharePayments).toHaveBeenCalledTimes(1);
  });

  it('says nothing when the sheet closes, shared or cancelled: iOS reports both the same way', async () => {
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());
    await waitFor(() => expect(sharePayments).toHaveBeenCalledTimes(1));
    await expect(jest.mocked(sharePayments).mock.results[0].value).resolves.toEqual({
      status: 'done',
    });
    await waitFor(() => expect(exportButton()).toBeTruthy());
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    // It can be exported again at once.
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it.each([
    ['the share sheet cannot open', () => (mockNative.shareFails = true)],
    ['sharing is not available here', () => (mockNative.available = false)],
    ['the file cannot be written', () => (mockNative.writeFails = true)],
  ])('shows the one failure line when %s, and lets it be tried again', async (_, breakIt) => {
    breakIt();
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    // One line, and the button is back.
    expect(screen.getAllByText(/Something went wrong/)).toHaveLength(1);
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
    await expect(jest.mocked(sharePayments).mock.results[0].value).resolves.toEqual({
      status: 'failed',
      error: FAILURE_MESSAGE,
    });

    // Mend it and try again: the line goes as the try starts, and stays gone.
    Object.assign(mockNative, { shareFails: false, available: true, writeFails: false });
    mockNative.shareHeld = true;
    await fireEvent.press(exportButton());
    await screen.findByRole('button', { name: 'Preparing…' });
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    await waitFor(() => expect(mockNative.shared.length).toBeGreaterThan(0));
    await act(async () => mockNative.shareHolds.shift()!());
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('treats a file that cannot be built like any failure: the one line, the button back, the cause logged', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    jest.mocked(sharePayments).mockRejectedValueOnce(new Error('build blew up'));
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getAllByText(/Something went wrong/)).toHaveLength(1);
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: false });
    expect(log).toHaveBeenCalledWith(
      '[failure]',
      expect.objectContaining({ message: 'build blew up' }),
    );
    expect(announce.mock.calls).toEqual([[FAILURE_MESSAGE]]);
    announce.mockRestore();
  });

  it('reports the real cause where it can be found, and shows only the one line', async () => {
    mockNative.shareFails = true;
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());
    await screen.findByText(FAILURE_MESSAGE);
    expect(log).toHaveBeenCalledWith(
      '[failure]',
      expect.objectContaining({ message: 'no view controller' }),
    );
    expect(screen.queryByText(/view controller/)).toBeNull();
  });

  it('a PDF that cannot be printed is a failure; the CSV still works, and nothing is left behind', async () => {
    mockNative.printFails = true;
    await openExport('bill', '2026');
    await fireEvent.press(pdfRadio());
    await fireEvent.press(exportButton());
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(mockNative.shared).toHaveLength(0);
    expect([...mockNative.files.keys()].filter((uri) => uri.endsWith('.pdf'))).toEqual([]);

    await fireEvent.press(csvRadio());
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockNative.shared).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull());
    expect(mockNative.shared[0].uri.endsWith('.csv')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// From the history page to the file.

describe('from the history page', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  it('Pro: the Export link opens the export page on the view, and the file is that view’s rows', async () => {
    mockNav.reset([{ pathname: '/payment-history', params: { kind: 'bill', year: '2025' } }]);
    await render(app(<Host />));
    await loaded();
    await waitFor(() => expect(screen.queryByTestId('history-loading')).toBeNull());
    const shown = rowIds();
    expect(shown.length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV or PDF' }));
    expect(top()).toEqual(
      expect.objectContaining({
        pathname: '/payment-export',
        params: { kind: 'bill', year: '2025' },
      }),
    );
    expect(await screen.findByText('Bills')).toBeTruthy();
    expect(screen.getByText(`${shown.length} payments · 2025`)).toBeTruthy();

    await fireEvent.press(exportButton());
    await waitFor(() => expect(sharePayments).toHaveBeenCalledTimes(1));
    expect(csvRows(csvOf())).toEqual(shown.map((id) => csvLine(paid(id))));
  });

  it.each(['Export CSV or PDF', 'Export payments'])(
    'free: "%s" opens the explainer, and nothing is exported',
    async (name) => {
      publishProStatus({ pro: false, ready: true });
      mockNav.reset([{ pathname: '/payment-history', params: { kind: 'bill', year: '2026' } }]);
      await render(app(<Host />));
      await loaded();
      await fireEvent.press(screen.getByRole('button', { name }));
      // Straight to the explainer: free is never taken through the export page on the way.
      const explainer = {
        pathname: '/pro-feature',
        params: { id: 'export', next: '/payment-export?kind=bill&year=2026' },
      };
      expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([explainer]);
      expect(top()).toEqual(expect.objectContaining(explainer));
      expect(await screen.findByText('Export your payments')).toBeTruthy();
      expect(sharePayments).not.toHaveBeenCalled();
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Spanish, French and another currency.

describe('in Spanish and French', () => {
  /** Money as each language writes it, from whole cents: 1,987.39 and 1 987,39 $. */
  const MONEY = {
    es: (cents: number) => usd(cents),
    fr: (cents: number) =>
      `${String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${pad(cents % 100)} $`,
  };
  const WORDS = {
    es: {
      export: 'Exportar',
      everything: 'Facturas y suscripciones',
      count: (n: number) => `${n} pagos · 2025`,
      header: '﻿Fecha,Nombre,Tipo,Importe (USD),Pagado con',
      notSet: 'Sin tarjeta',
      csv: 'CSV, Para Numbers, Excel o Google Sheets',
      pdf: 'PDF, Un estado de cuenta para imprimir o enviar',
      title: 'Historial de pagos',
      scope: (n: number) => `${n} pagos · Facturas · 2025`,
      month: 'diciembre de 2025',
      made: 'Hecho con Skip Budget el 12 oct 2026',
      columns: ['Fecha', 'Nombre', 'Tipo', 'Importe (USD)', 'Pagado con'],
    },
    fr: {
      export: 'Exporter',
      everything: 'Factures et abonnements',
      count: (n: number) => `${n} paiements · 2025`,
      header: '﻿Date,Nom,Type,Montant (USD),Payé avec',
      notSet: 'Aucune carte',
      csv: 'CSV, Pour Numbers, Excel ou Google Sheets',
      pdf: 'PDF, Un relevé à imprimer ou à envoyer',
      title: 'Historique des paiements',
      scope: (n: number) => `${n} paiements · Factures · 2025`,
      month: 'décembre 2025',
      made: 'Créé avec Skip Budget le 12 oct. 2026',
      columns: ['Date', 'Nom', 'Type', 'Montant (USD)', 'Payé avec'],
    },
  } as const;

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: the page, and a CSV in that language to the cent',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      await openExport('all', '2025', words.export);
      const rows = viewOf('all', 2025);

      expect(pageLines()).toEqual([
        words.export,
        words.everything,
        words.count(rows.length),
        'CSV',
        expect.any(String),
        'PDF',
        expect.any(String),
      ]);
      expect(screen.getAllByRole('radio').map(labelOf)).toEqual([words.csv, words.pdf]);

      await fireEvent.press(exportButton(words.export));
      await waitFor(() => expect(sharePayments).toHaveBeenCalledTimes(1));
      const request = lastRequest();
      expect(request.dialogTitle).toBe(words.export);
      const lines = csvOf(request).split('\r\n');
      expect(lines[0]).toBe(words.header);
      // Plain numbers whatever the language: a spreadsheet reads 1000.00, never "1 000,00".
      expect(lines.slice(1, -1)).toEqual(
        rows.map((p) => csvLine(p, KIND_WORDS[language], words.notSet)),
      );
      expect(
        lines.slice(1, -1).some((line) => line.includes(KIND_WORDS[language].extraPayment)),
      ).toBe(true);
    },
  );

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: a PDF in that language, its money written that way, to the cent',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      await openExport('bill', '2025', words.export);
      await fireEvent.press(pdfRadio());
      await fireEvent.press(exportButton(words.export));
      await waitFor(() => expect(sharePayments).toHaveBeenCalledTimes(1));
      const html = htmlOf();
      const rows = viewOf('bill', 2025);

      expect(html).toContain(
        `<h1>${words.title}</h1><p class="scope">${words.scope(rows.length)}</p>`,
      );
      expect(html).toContain(`<span class="figure">${MONEY[language](sum(rows))}</span>`);
      const december = rows.filter((p) => p.date.startsWith('2025-12'));
      expect(html).toContain(
        `<div class="heading">${words.month}</div><div class="amount">${MONEY[language](sum(december))}</div>`,
      );
      expect(html).toContain(`<footer>${words.made}</footer>`);
      expect(html).toContain(
        `<div class="row columns">${words.columns
          .map(
            (column, index) =>
              `<div class="${['date', 'name', 'kind', 'amount', 'from'][index]}">${column}</div>`,
          )
          .join('')}</div>`,
      );
    },
  );

  it('writes the person’s currency into the CSV header and the PDF’s money, never into the numbers', async () => {
    setCurrency('GBP');
    const csv = await exportView('bill', '2025');
    const lines = csvOf(csv).split('\r\n');
    expect(lines[0]).toBe('﻿Date,Name,Kind,Amount (GBP),Paid from');
    expect(lines.slice(1, -1)).toEqual(viewOf('bill', 2025).map((p) => csvLine(p)));

    const pdf = await exportView('bill', '2025', 'pdf');
    expect(htmlOf(pdf)).toContain(
      `<span class="figure">£${usd(sum(viewOf('bill', 2025))).slice(1)}</span>`,
    );
  });

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: the explainer free sees has its own words, and no raw key',
    async (language) => {
      setLanguage(language);
      publishProStatus({ pro: false, ready: true });
      mockNav.reset([exportPage('bill', '2026')]);
      await render(app(<Host />));
      expect(top().pathname).toBe('/pro-feature');
      const title = {
        en: 'Export your payments',
        es: 'Exporta tus pagos',
        fr: 'Exporte tes paiements',
      }[language];
      expect(await screen.findByText(title)).toBeTruthy();
      for (const line of screen.getAllByText(/./).map(textOf)) {
        expect(line).not.toMatch(/\b(payments|pro|common|ui)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}|undefined|NaN/);
      }
    },
  );

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: no raw key, unfilled {token} or undefined on the page, busy, or failed',
    async (language) => {
      setLanguage(language);
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      const exportName = { en: 'Export', es: 'Exportar', fr: 'Exporter' }[language];
      await openExport('all', 'all', exportName);
      const scan = () => {
        const lines = [
          ...screen.getAllByText(/./, hidden).map(textOf),
          ...screen.queryAllByRole('button').map(labelOf),
          ...screen.queryAllByRole('radio').map(labelOf),
          ...screen.queryAllByLabelText(/./).map(labelOf),
        ];
        expect(lines.length).toBeGreaterThan(5);
        for (const line of lines) {
          expect(line).not.toMatch(/\b(payments|pro|common|ui)\.[a-z]/);
          expect(line).not.toMatch(/\{\w+\}|undefined|NaN|\[object/);
        }
      };
      scan();
      mockNative.shareFails = true;
      await fireEvent.press(exportButton(exportName));
      await waitFor(() => expect(mockNative.shared).toHaveLength(1));
      await waitFor(() =>
        expect(exportButton(exportName).props.accessibilityState.disabled).toBe(false),
      );
      // The failure line is drawn, and is as clean as the rest.
      expect(screen.getAllByText(/./).map(textOf)).toContain(failureText());
      scan();
      log.mockRestore();
    },
  );
});

// ---------------------------------------------------------------------------------------------
// The native modules load only when someone exports.

/**
 * Statements that load `module` when the file is loaded: an import (not `import type`), an
 * `export … from`, a side-effect import, or a require at the left margin, which is a top-level
 * statement in formatted code. A require inside a function is indented and is not one.
 */
function loadsAtTopLevel(source: string, module: string): string[] {
  const name = module.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
  const from = `\\bfrom\\s+['"]${name}(?:/[^'"]*)?['"]`;
  const body = `(?:[^;'"]|'[^']*'|"[^"]*")*?`;
  const patterns = [
    new RegExp(`^import\\s+(?!type\\b)${body}${from}`, 'gm'),
    new RegExp(`^export\\s+(?!type\\b)${body}${from}`, 'gm'),
    new RegExp(`^import\\s+['"]${name}(?:/[^'"]*)?['"]`, 'gm'),
    new RegExp(
      `^(?:(?:const|let|var)\\s[^;]*?)?require\\(\\s*['"]${name}(?:/[^'"]*)?['"]\\s*\\)`,
      'gm',
    ),
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[0]));
}

/** The files the app ships under src: no tests, no test folders. */
function appFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : appFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('expo-print is never imported at the top of a file', () => {
  const SRC = join(__dirname, '..', '..');
  const FILES = appFiles(SRC);

  it('knows a top-level load when it sees one, and a lazy one when it sees one', () => {
    for (const bad of [
      "import * as Print from 'expo-print';",
      "import { printToFileAsync } from 'expo-print';",
      'import Print, { type PrintOptions } from "expo-print";',
      "import {\n  printToFileAsync,\n  selectPrinterAsync,\n} from 'expo-print';",
      "import 'expo-print';",
      "import * as Print from 'expo-print/build/Print';",
      "const Print = require('expo-print');",
      "export { printToFileAsync } from 'expo-print';",
      "export * from 'expo-print';",
    ]) {
      expect([bad, loadsAtTopLevel(bad, 'expo-print').length > 0]).toEqual([bad, true]);
    }
    for (const fine of [
      "import type { PrintOptions } from 'expo-print';",
      "type PrintModule = typeof import('expo-print');",
      "async function share() {\n    const Print = require('expo-print') as PrintModule;\n  }",
      "// import * as Print from 'expo-print';",
      "import * as Printer from 'expo-printer';",
      "import { a } from 'expo-print-helpers';",
    ]) {
      expect([fine, loadsAtTopLevel(fine, 'expo-print')]).toEqual([fine, []]);
    }
  });

  it('scans the whole app, and finds files to scan', () => {
    expect(FILES.length).toBeGreaterThan(300);
    expect(FILES).toContain(join(SRC, 'api', 'payment-export.ts'));
    expect(FILES).toContain(join(SRC, 'app', 'payment-export.tsx'));
    expect(FILES).toContain(join(SRC, 'components', 'payments', 'export-choices.tsx'));
    expect(FILES.some((file) => file.includes('__tests__'))).toBe(false);
  });

  it('is imported at the top of no file under src', () => {
    const offenders = FILES.flatMap((file) =>
      loadsAtTopLevel(readFileSync(file, 'utf8'), 'expo-print').map(
        (statement) => `${relative(SRC, file)}: ${statement}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('is loaded in one place only, inside the function that shares: the pages and hooks never name it', () => {
    const mentions = FILES.filter((file) => /['"]expo-print/.test(readFileSync(file, 'utf8')));
    expect(mentions.map((file) => relative(SRC, file))).toEqual([join('api', 'payment-export.ts')]);

    const source = readFileSync(join(SRC, 'api', 'payment-export.ts'), 'utf8');
    const required = source.indexOf("require('expo-print')");
    expect(required).toBeGreaterThan(source.indexOf('export async function sharePayments'));
    // On an indented line of its own: inside the function.
    expect(source.slice(source.lastIndexOf('\n', required) + 1, required)).toMatch(/^\s+.*$/);
  });

  it('the file system and sharing modules are not loaded at the top of the export pages and hooks either', () => {
    for (const file of [
      join('api', 'payment-export.ts'),
      join('app', 'payment-export.tsx'),
      join('components', 'payments', 'export-choices.tsx'),
      join('components', 'payments', 'use-export.ts'),
    ]) {
      const source = readFileSync(join(SRC, file), 'utf8');
      for (const module of ['expo-file-system', 'expo-sharing', 'expo-print']) {
        expect([file, module, loadsAtTopLevel(source, module)]).toEqual([file, module, []]);
      }
    }
  });

  it('opens every page that exports even when none of the three native modules can be loaded', () => {
    jest.isolateModules(() => {
      for (const module of ['expo-print', 'expo-file-system', 'expo-sharing']) {
        jest.doMock(module, () => {
          throw new Error(`Cannot find native module '${module}'`);
        });
      }
      expect(() => {
        // Required fresh, with the modules broken, as a build made before they were added loads them.
        /* eslint-disable @typescript-eslint/no-require-imports */
        require('@/api/payment-export');
        require('@/app/payment-export');
        require('@/app/payment-history');
        require('@/components/payments/export-choices');
        require('@/components/payments/use-export');
        /* eslint-enable @typescript-eslint/no-require-imports */
      }).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Light and dark.

type HostNode = { type: unknown; parent: HostNode | null; props: Record<string, any> };
type Surface = 'surface' | 'card' | 'tint' | 'accent';

/** The scroll view a node is drawn in, or null when it is pinned outside it. */
function scrollOf(node: HostNode | null): HostNode | null {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return at;
  }
  return null;
}
const insideScroll = (node: unknown) => scrollOf(node as HostNode) !== null;

/** What a node is drawn on: the nearest ancestor that paints a surface; the page itself otherwise. */
function surfaceOf(node: unknown): Surface {
  for (let at = (node as HostNode).parent; at; at = at.parent) {
    const names = String(at.props.className ?? '');
    if (/(^|\s)bg-card(\s|$)/.test(names)) return 'card';
    if (/(^|\s)bg-tint(\s|$)/.test(names)) return 'tint';
    if (/(^|\s)bg-(accent|control)(\s|$)/.test(names)) return 'accent';
    if (/(^|\s)bg-surface(\s|$)/.test(names)) return 'surface';
  }
  return 'surface';
}

const TEXT_COLOUR = /\btext-(ink|body|muted|accent-ink|tint-ink|money-in|danger|on-control)\b/g;
const TOKEN_OF = {
  'text-ink': 'ink',
  'text-body': 'body',
  'text-muted': 'muted',
  'text-accent-ink': 'accentInk',
  'text-tint-ink': 'tintInk',
  'text-money-in': 'moneyIn',
  'text-danger': 'danger',
  'text-on-control': 'onControl',
} as const;

/** True for a node inside a control that is switched off: WCAG leaves those out of contrast. */
function inactive(node: unknown): boolean {
  for (let at = node as HostNode | null; at; at = at.parent) {
    if (at.props.accessibilityState?.disabled === true) return true;
  }
  return false;
}

function colourPairs() {
  const found: { colour: keyof typeof TOKEN_OF; surface: Surface; line: string }[] = [];
  for (const node of screen.getAllByText(/./, hidden)) {
    if (inactive(node)) continue;
    for (const colour of classOf(node).match(TEXT_COLOUR) ?? []) {
      found.push({
        colour: colour as keyof typeof TOKEN_OF,
        surface: surfaceOf(node),
        line: textOf(node),
      });
    }
  }
  return found;
}

describe.each<Scheme>(['light', 'dark'])('in %s', (scheme) => {
  const tokens = buildTokens(scheme);
  const ratio = (colour: keyof typeof TOKEN_OF, surface: Surface) =>
    contrast(tokens[TOKEN_OF[colour]], tokens[surface]);
  let log: jest.SpyInstance;

  beforeEach(() => {
    mockStore.set('skip.theme.mode', scheme);
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  const check = (seen: Set<string>) => {
    const pairs = colourPairs();
    expect(pairs.length).toBeGreaterThan(2);
    for (const { colour, surface, line } of pairs) {
      seen.add(`${colour} on ${surface}`);
      expect([line, colour, surface, ratio(colour, surface) >= 4.5]).toEqual([
        line,
        colour,
        surface,
        true,
      ]);
    }
  };

  it('draws every state of the page in colours that read on what they sit on, 4.5 to 1', async () => {
    const seen = new Set<string>();

    // The page, CSV ticked, then PDF ticked.
    await openExport('bill', '2026');
    check(seen);
    await fireEvent.press(pdfRadio());
    check(seen);

    // After a failure: the one failure line.
    mockNative.shareFails = true;
    await fireEvent.press(exportButton());
    await screen.findByText(FAILURE_MESSAGE);
    check(seen);
    mockNative.shareFails = false;

    // Busy.
    mockNative.shareHeld = true;
    await fireEvent.press(exportButton());
    await screen.findByRole('button', { name: 'Preparing…' });
    check(seen);
    await act(async () => mockNative.shareHolds.shift()!());

    // Nothing to export.
    await fireEvent.press(csvRadio());
    await act(async () => mockNav.show([exportPage('all', '2020')]));
    await screen.findByText('Nothing to export for 2020.');
    check(seen);

    expect([...seen]).toEqual(
      expect.arrayContaining([
        'text-ink on card',
        'text-muted on card',
        'text-body on card',
        'text-danger on surface',
        'text-muted on surface',
        'text-on-control on accent',
      ]),
    );
  });

  it('draws the error page and the loading page in this mode’s colours too', async () => {
    const seen = new Set<string>();
    mockFailing.add('charges');
    mockNav.reset([exportPage('bill', '2026')]);
    await render(app(<Host />));
    await screen.findByText(FAILURE_MESSAGE);
    check(seen);
  });

  it('draws the tick on the chosen format in this mode’s accent ink, 3 to 1 on its card', async () => {
    await openExport('bill', '2026');
    const tick = within(csvRadio()).getByTestId('icon-Check');
    expect(tick.props.iconColor).toBe(tokens.accentInk);
    expect(contrast(tokens.accentInk, tokens.card)).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------------------------
// Large text.

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

function drawnTexts() {
  const texts: { line: string; props: Json['props'] }[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'Text') {
      texts.push({
        line: (node.children ?? []).filter((part) => typeof part === 'string').join(''),
        props: node.props,
      });
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Tree;
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return texts;
}

describe.each<Language>(['en', 'es', 'fr'])('at large text, in %s', (language) => {
  const NAME = { en: 'Export', es: 'Exportar', fr: 'Exporter' }[language];
  const BUSY = { en: 'Preparing…', es: 'Preparando…', fr: 'Préparation…' }[language];
  let log: jest.SpyInstance;

  beforeEach(() => {
    setLanguage(language);
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const window = { width: 390, height: 844, scale: 3, fontScale: 3 };
    Dimensions.set({ window, screen: window });
  });
  afterEach(() => log.mockRestore());

  const ceilings = new Set<number>(Object.values(TEXT_CAP));
  const checkTexts = () => {
    const texts = drawnTexts();
    expect(texts.length).toBeGreaterThan(3);
    for (const { line, props } of texts) {
      expect([line, ceilings.has(props.maxFontSizeMultiplier as number)]).toEqual([line, true]);
      expect([line, props.numberOfLines]).toEqual([line, undefined]);
      expect([line, props.adjustsFontSizeToFit]).toEqual([line, undefined]);
    }
  };

  it('gives every line its role’s ceiling, never cut or shrunk: ready, busy, failed, empty', async () => {
    await openExport('all', '2025', NAME);
    checkTexts();

    mockNative.shareFails = true;
    await fireEvent.press(exportButton(NAME));
    await waitFor(() => expect(mockNative.shared).toHaveLength(1));
    await waitFor(() => expect(exportButton(NAME).props.accessibilityState.disabled).toBe(false));
    expect(screen.getAllByText(/./).map(textOf)).toContain(failureText());
    checkTexts();

    mockNative.shareFails = false;
    mockNative.shareHeld = true;
    await fireEvent.press(exportButton(NAME));
    await screen.findByRole('button', { name: BUSY });
    checkTexts();
    await act(async () => mockNative.shareHolds.shift()!());

    await act(async () => mockNav.show([exportPage('all', '2020')]));
    expect(exportButton(NAME).props.accessibilityState.disabled).toBe(true);
    checkTexts();
  });

  it('keeps Export pinned below the scroll in every state, with the summary and choices inside it', async () => {
    await openExport('all', '2025', NAME);
    expect(insideScroll(exportButton(NAME))).toBe(false);
    expect(insideScroll(screen.getByTestId('export-summary'))).toBe(true);
    expect(insideScroll(screen.getByTestId('export-choices'))).toBe(true);
    for (const format of screen.getAllByRole('radio')) expect(insideScroll(format)).toBe(true);

    mockNative.shareHeld = true;
    await fireEvent.press(exportButton(NAME));
    const busy = await screen.findByRole('button', { name: BUSY });
    expect(insideScroll(busy)).toBe(false);
    await act(async () => mockNative.shareHolds.shift()!());

    await act(async () => mockNav.show([exportPage('all', '2020')]));
    // Disabled, but still pinned where a person looks for it, not lost at the foot of a long page.
    expect(insideScroll(exportButton(NAME))).toBe(false);
  });

  it('keeps the failure pinned in the footer, in the block that holds Export, and says it once', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    mockNative.shareFails = true;
    await openExport('all', '2025', NAME);
    await fireEvent.press(exportButton(NAME));
    const line = await screen.findByRole('alert');
    expect(textOf(line)).toBe(failureText());

    // Out of the scroll, so it cannot sit below the fold, and in the same block as the button.
    expect(insideScroll(line)).toBe(false);
    expect(insideScroll(exportButton(NAME))).toBe(false);
    const footerOf = (node: unknown) => {
      for (let at = node as HostNode | null; at; at = at.parent) {
        if (/\bpb-2 pt-3\b/.test(String(at.props.className ?? ''))) return at;
      }
      return null;
    };
    expect(footerOf(line)).not.toBeNull();
    expect(footerOf(line)).toBe(footerOf(exportButton(NAME)));
    expect(screen.getAllByText(failureText())).toHaveLength(1);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(failureText());
    announce.mockRestore();
  });
});

// ---------------------------------------------------------------------------------------------
// VoiceOver.

describe('for VoiceOver', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  it('reads the page: its title, the view as one stop, the formats as a radio group, a button', async () => {
    await openExport('bill', '2026');
    const rows = viewOf('bill', 2026);
    expect(screen.getByRole('header', { name: 'Export' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
    expect(screen.getByLabelText(`Bills, ${rows.length} payments, This year`)).toBeTruthy();
    expect(screen.getByTestId('export-choices-card').props.accessibilityRole).toBe('radiogroup');
    expect(
      screen.getAllByRole('radio').map((node) => [labelOf(node), node.props.accessibilityState]),
    ).toEqual([
      ['CSV, For Numbers, Excel or Google Sheets', { selected: true, checked: true }],
      ['PDF, A statement to print or send', { selected: false, checked: false }],
    ]);
    expect(screen.getAllByRole('button').map(labelOf)).toEqual(['Go back', 'Export']);
  });

  it('tells which format is chosen, and moves it', async () => {
    await openExport('bill', '2026');
    await fireEvent.press(pdfRadio());
    expect(screen.getByRole('radio', { name: /^PDF/, checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /^CSV/, checked: false })).toBeTruthy();
  });

  it('says the button is off when there is nothing to export, and while it prepares', async () => {
    mockNav.reset([exportPage('all', '2020')]);
    const empty = await render(app(<Host />));
    await loaded();
    expect(await screen.findByText('Nothing to export for 2020.')).toBeTruthy();
    expect(exportButton().props.accessibilityState).toMatchObject({ disabled: true });
    await empty.unmount();

    mockNative.shareHeld = true;
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());
    const busy = await screen.findByRole('button', { name: 'Preparing…' });
    expect(busy.props.accessibilityState).toMatchObject({ disabled: true });
    await act(async () => mockNative.shareHolds.shift()!());
  });

  it('says a failure as an alert above Export, announces it once per failure, and drops it on a retry', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    mockNative.shareFails = true;
    await openExport('bill', '2026');
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.press(exportButton());

    const line = await screen.findByRole('alert');
    expect(textOf(line)).toBe(FAILURE_MESSAGE);
    // An alert, not a live region: iOS VoiceOver ignores those, so it is announced as well.
    expect(line.props.accessibilityLiveRegion).toBeUndefined();
    expect(announce.mock.calls).toEqual([[FAILURE_MESSAGE]]);
    expect(insideScroll(line)).toBe(false);
    expect(screen.getAllByText(/Something went wrong/)).toHaveLength(1);

    // A retry takes the line away while it works; the next failure is announced again.
    mockNative.shareHeld = true;
    mockNative.shareFails = false;
    await fireEvent.press(exportButton());
    await screen.findByRole('button', { name: 'Preparing…' });
    expect(screen.queryByRole('alert')).toBeNull();
    await act(async () => mockNative.shareHolds.shift()!());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(announce).toHaveBeenCalledTimes(1);

    mockNative.shareHeld = false;
    mockNative.shareFails = true;
    await fireEvent.press(exportButton());
    await screen.findByRole('alert');
    expect(announce.mock.calls).toEqual([[FAILURE_MESSAGE], [FAILURE_MESSAGE]]);
    announce.mockRestore();
  });

  it('announces nothing when the sheet closes, shared or cancelled', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await openExport('bill', '2026');
    await fireEvent.press(exportButton());
    await waitFor(() => expect(mockNative.shared).toHaveLength(1));
    await waitFor(() => expect(exportButton().props.accessibilityState.disabled).toBe(false));
    expect(announce).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    announce.mockRestore();
  });

  it('reads the error page with its Try again as a button', async () => {
    mockFailing.add('charges');
    mockNav.reset([exportPage('bill', '2026')]);
    await render(app(<Host />));
    await screen.findByText(FAILURE_MESSAGE);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('reads the explainer free is sent to: a headed page with a back button and its points', async () => {
    publishProStatus({ pro: false, ready: true });
    mockNav.reset([exportPage('bill', '2026')]);
    await render(app(<Host />));
    expect(await screen.findByRole('header', { name: 'Export your payments' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
  });
});

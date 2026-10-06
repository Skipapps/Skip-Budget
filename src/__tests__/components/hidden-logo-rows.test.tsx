import { render } from '@testing-library/react-native';

import type { LedgerEntry } from '@/api/queries';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { LedgerRow } from '@/components/transactions/ledger-row';

/**
 * The lists built from the ledger (Home, Transactions, Subscriptions, a card's page) draw a row with
 * no logo of its own by matching its name to the catalog. A row whose owner chose letters must
 * keep letters there too, or the logo they turned off comes straight back.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: (props: object) => <View testID="logo" {...props} /> };
});

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockDirectory = [
  {
    id: 'b-nf',
    name: 'Netflix',
    domain: 'netflix.com',
    category_id: 'entertainment',
    logo_path: null,
  },
];
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandDirectory: () => ({ data: mockDirectory }),
}));

const API = 'https://logos.test';
const savedApi = process.env.EXPO_PUBLIC_LOGO_API_URL;
const savedCdn = process.env.EXPO_PUBLIC_LOGO_CDN_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_LOGO_API_URL = API;
  process.env.EXPO_PUBLIC_LOGO_CDN_URL = '';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_LOGO_API_URL = savedApi;
  process.env.EXPO_PUBLIC_LOGO_CDN_URL = savedCdn;
});

/** A Netflix renewal as the ledger hands it over: logoDomainOf already gave null. */
const netflix = (logoHidden: boolean): LedgerEntry => ({
  id: 'subscription:s1@2026-10-01',
  label: 'Netflix',
  amount: -15.49,
  date: '2026-10-01',
  kind: 'subscription',
  sourceId: 'card-1',
  domain: null,
  logoHidden,
  planId: 's1',
});

type Screen = Awaited<ReturnType<typeof render>>;
const drawsCatalogLogo = (screen: Screen) =>
  (screen.getByTestId('logo').props as { source: { uri: string } }).source.uri ===
  `${API}/v1/logo/netflix.com`;

describe.each([
  [
    'Transactions (LedgerRow)',
    (entry: LedgerEntry) => (
      <LedgerRow entry={entry} sourceLabel="VISA ••4421" kindLabel="Subscription" />
    ),
  ],
  [
    'Home, Subscriptions and a card’s page (TransactionRow)',
    (entry: LedgerEntry) => (
      <TransactionRow
        label={entry.label}
        amount={entry.amount}
        kind="subscription"
        domain={entry.domain}
        logoHidden={entry.logoHidden}
      />
    ),
  ],
])('%s', (_, row) => {
  it('draws letters for a hidden Netflix entry, not the catalog logo', async () => {
    const screen = await render(row(netflix(true)));

    expect(screen.queryByTestId('logo')).toBeNull();
    expect(screen.getByText('NE')).toBeTruthy();
  });

  it('still draws the catalog logo for a Netflix entry that chose nothing', async () => {
    const screen = await render(row(netflix(false)));

    expect(drawsCatalogLogo(screen)).toBe(true);
  });
});

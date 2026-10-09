import { fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptDetailScreen from '@/app/receipt/[id]';
import type { LedgerEntry } from '@/api/queries';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { ReceiptRow } from '@/components/receipts/receipt-row';
import { LedgerRow } from '@/components/transactions/ledger-row';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * A receipt filed from a habit draws the habit's icon wherever receipts are listed, and its own page
 * leads back to the habit (or says the habit is gone) and lists that habit's receipts only.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'r1' }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

const mockHabitIcon = jest.fn();
jest.mock('@/components/habits/habit-icon', () => ({
  HabitIcon: (props: object) => {
    mockHabitIcon(props);
    return null;
  },
}));
const mockBrandMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: object) => {
    mockBrandMark(props);
    return null;
  },
}));
const mockChangeLogo = jest.fn();
jest.mock('@/components/brands/change-logo-button', () => ({
  ChangeLogoButton: ({ children }: { children: unknown }) => {
    mockChangeLogo();
    return children;
  },
}));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));

const mockHabitMark = { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' as const };

const row = (id: string, purchased_on: string, extra: Record<string, unknown> = {}) => ({
  id,
  brand_id: null,
  merchant: 'Coffee',
  amount: 5,
  purchased_on,
  category_id: 'dining',
  card_id: 'card1',
  bank_account_id: null,
  note: null,
  source: 'habit',
  image_path: null,
  brands: null,
  habit_id: 'coffee',
  habit: mockHabitMark,
  ...extra,
});

const mockReceiptRows = [
  row('r1', '2026-10-02'),
  row('r2', '2026-09-28', { amount: 6 }),
  // A café called Coffee, typed by hand: the same name, but not this habit's.
  row('r3', '2026-09-30', { habit_id: null, habit: null, source: 'manual', amount: 40 }),
];

let mockHabit: { data: { name: string; archived_at: string | null } | undefined } = {
  data: { name: 'Coffee', archived_at: null },
};
jest.mock('@/api/habits', () => ({ useHabit: () => mockHabit }));
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({
    data: mockReceiptRows,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [{ id: 'card1', label: 'VISA ••4821' }] }),
}));
jest.mock('@/api/brands', () => ({ useSpendCategories: () => ({ data: [] }) }));
jest.mock('@/api/history', () => ({
  useHistoryFloor: () => ({ floor: '2019-10-03', free: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockHabit = { data: { name: 'Coffee', archived_at: null } };
});
afterAll(() => resetLocaleForTests());

const drewHabit = (size: number) =>
  expect(mockHabitIcon).toHaveBeenCalledWith({
    iconId: 'food-dining/coffee',
    color: 'caramel',
    size,
  });

describe('habit receipts in lists', () => {
  it('Home and a card’s activity draw the habit’s icon in place of a logo', async () => {
    const screen = await render(
      <TransactionRow
        label="Coffee"
        amount={-5}
        kindLabel="Receipt"
        kind="receipt"
        habit={{ iconId: 'food-dining/coffee', color: 'caramel' }}
        onPress={() => {}}
      />,
    );
    drewHabit(40);
    expect(mockBrandMark).not.toHaveBeenCalled();
    // The rest of the row is unchanged.
    expect(screen.getByLabelText('Coffee, -$5.00, Receipt')).toBeTruthy();

    await render(<TransactionRow label="Bakery" amount={-6} kind="receipt" />);
    expect(mockBrandMark).toHaveBeenCalledTimes(1);
  });

  it('Activity draws it from the ledger entry', async () => {
    const entry: LedgerEntry = {
      id: 'receipt-r1',
      label: 'Coffee',
      amount: -5,
      date: '2026-10-02',
      kind: 'receipt',
      sourceId: 'card1',
      habit: { iconId: 'food-dining/coffee', color: 'caramel' },
    };
    await render(<LedgerRow entry={entry} sourceLabel="VISA ••4821" kindLabel="Receipt" />);
    drewHabit(40);
    expect(mockBrandMark).not.toHaveBeenCalled();
  });

  it('the receipts list draws it from the row’s habit', async () => {
    await render(
      <ReceiptRow
        merchant="Coffee"
        amount={5}
        date="2026-10-02"
        sourceLabel="VISA ••4821"
        habit={mockHabitMark}
      />,
    );
    drewHabit(40);
    expect(mockBrandMark).not.toHaveBeenCalled();
  });
});

describe('a habit receipt’s own page', () => {
  it('draws the habit’s icon with no logo to change, and leads to the habit', async () => {
    const screen = await render(<ReceiptDetailScreen />);
    drewHabit(52);
    expect(mockChangeLogo).not.toHaveBeenCalled();
    expect(mockBrandMark).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('From your habit: Coffee'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/habit/[id]',
      params: { id: 'coffee' },
    });

    // The pencil still edits the receipt itself.
    await fireEvent.press(screen.getByLabelText('Edit Coffee'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/add-receipt',
      params: { id: 'r1' },
    });
  });

  it('lists the habit’s receipts, not another store of the same name', async () => {
    const screen = await render(<ReceiptDetailScreen />);
    const list = within(screen.getByTestId('receipts-from-store'));
    expect(
      list.getAllByText(/^\d{1,2} (Sep|Oct) 2026$/).map((node) => node.props.children),
    ).toEqual(['2 Oct 2026', '28 Sep 2026']);
    expect(screen.getByText('2 · $11.00')).toBeTruthy();
  });

  it('says plainly when the habit has been deleted', async () => {
    mockHabit = { data: { name: 'Coffee', archived_at: '2026-10-05T10:00:00Z' } };
    const screen = await render(<ReceiptDetailScreen />);
    expect(screen.getByText('From a deleted habit: Coffee')).toBeTruthy();
    expect(screen.queryByLabelText('From your habit: Coffee')).toBeNull();
    drewHabit(52);
  });

  it('reads in Spanish and French', async () => {
    setLanguage('es');
    const es = await render(<ReceiptDetailScreen />);
    expect(es.getByLabelText('De tu hábito: Coffee')).toBeTruthy();

    setLanguage('fr');
    mockHabit = { data: { name: 'Coffee', archived_at: '2026-10-05T10:00:00Z' } };
    const fr = await render(<ReceiptDetailScreen />);
    expect(fr.getByText('D’une habitude supprimée : Coffee')).toBeTruthy();
  });
});

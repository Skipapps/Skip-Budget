import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptDetailScreen from '@/app/receipt/[id]';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * One receipt's own page, in the bill page's style: what was bought and how it was paid, then every
 * receipt from the same store (old and new, newest first) with a Month / Year / All filter, and the
 * header pencil to edit. A receipt deleted from its edit flow steps this page back out.
 */

jest.mock('@/components/receipts/book-icon', () => ({ BookIcon: () => null }));
jest.mock('@/api/receipt-books', () => ({
  useReceiptBooks: () => ({
    data: [],
    isLoading: false,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useReceiptBookDefault: () => ({ data: null, isPending: false }),
  useSetReceiptBookDefault: () => ({ mutate: jest.fn() }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockId = 'r1';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: mockId }),
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: object) => {
    mockMark(props);
    return null;
  },
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));

jest.useFakeTimers({
  now: new Date('2026-10-03T12:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

const row = (
  id: string,
  merchant: string,
  purchased_on: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  brand_id: null,
  merchant,
  amount: 12.5,
  purchased_on,
  category_id: 'dining',
  card_id: 'card1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  brands: null,
  ...extra,
});

const RECEIPTS = [
  row('r1', 'Starbucks', '2026-10-02', { amount: 12.5, note: 'Team coffee' }),
  // The same shop typed another way is still the same shop.
  row('r4', ' starbucks ', '2026-10-01', { amount: 5 }),
  row('r2', 'Starbucks', '2026-09-20', { amount: 7.25, card_id: null, bank_account_id: 'acc1' }),
  row('r3', 'Starbucks', '2025-12-01', { amount: 9, card_id: null }),
  // Another store's receipt, which must not appear on this page.
  row('r9', 'Target', '2026-10-02', { amount: 80, category_id: 'shopping' }),
];

const mockReceipts = {
  data: RECEIPTS as unknown[] | undefined,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/api/queries', () => ({ useReceipts: () => mockReceipts }));
// Every card and account by name, as usePaymentLabels gives them; null while they are still read.
// card-2 is a free account's locked extra: no picker offers it, but what it paid is named.
const mockNames: Record<string, string> = {
  card1: 'VISA ••4821',
  acc1: 'Chase Checking ••7730',
  'card-2': 'Amex ••3005',
};
let mockNamesLoading = false;
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({
    sources: [],
    labelOf: (id: string) => (mockNamesLoading ? null : (mockNames[id] ?? null)),
    isLoading: mockNamesLoading,
  }),
}));
// None of these receipts is a habit's.
jest.mock('@/api/habits', () => ({ useHabit: () => ({ data: undefined }) }));
jest.mock('@/api/brands', () => ({
  useSpendCategories: () => ({ data: [{ id: 'dining', label: 'Dining' }] }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockId = 'r1';
  mockReceipts.data = RECEIPTS;
  mockReceipts.isPending = false;
  mockReceipts.isError = false;
  mockNamesLoading = false;
});
afterAll(() => resetLocaleForTests());

/** The dates drawn in the list of receipts, top to bottom. */
const listed = (screen: Awaited<ReturnType<typeof render>>) =>
  screen
    .getAllByText(/^\d{1,2} (Sep|Oct|Nov|Dec) 202[56]$/)
    .map((node) => node.props.children as string);

describe('a receipt’s page', () => {
  it('shows the receipt, then every receipt from its store, newest first', async () => {
    const screen = await render(<ReceiptDetailScreen />);

    // The receipt that was opened: amount, day, how it was paid, what it is filed under, its note.
    expect(screen.getByText('$12.50')).toBeTruthy();
    expect(screen.getByText('Bought on 2 Oct 2026')).toBeTruthy();
    // How it was paid: in the details, and again on the other receipt from the same card.
    expect(screen.getAllByText('VISA ••4821').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dining & Takeout')).toBeTruthy();
    expect(screen.getByText('Team coffee')).toBeTruthy();

    // The store's receipts, all of them, under their own heading with the count and the total.
    expect(screen.getByText('Receipts from Starbucks')).toBeTruthy();
    expect(screen.getByText('4 · $33.75')).toBeTruthy();
    expect(screen.getByText('This receipt', { exact: false })).toBeTruthy();
    // Another store's receipt is not here.
    expect(screen.queryByText('$80.00')).toBeNull();
    expect(listed(screen)).toEqual([
      '2 Oct 2026', // the one opened, in the list as well as in "Bought on"
      '1 Oct 2026',
      '20 Sep 2026',
      '1 Dec 2025',
    ]);
  });

  it('opens the edit flow from the pencil, for the receipt that is open', async () => {
    const screen = await render(<ReceiptDetailScreen />);

    await fireEvent.press(screen.getByLabelText('Edit Starbucks'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/add-receipt', params: { id: 'r1' } });
  });

  it('offers Month, Year and All, and opens on All so the receipt opened is always in view', async () => {
    mockId = 'r3';
    const screen = await render(<ReceiptDetailScreen />);

    // A receipt from 2025 is on the page it was opened from, with the whole history around it.
    expect(listed(screen)).toContain('1 Dec 2025');

    await fireEvent.press(screen.getByLabelText('Year'));
    expect(listed(screen)).not.toContain('1 Dec 2025');
    expect(listed(screen)).toEqual(['2 Oct 2026', '1 Oct 2026', '20 Sep 2026']);

    await fireEvent.press(screen.getByLabelText('Month'));
    expect(listed(screen)).toEqual(['2 Oct 2026', '1 Oct 2026']);

    await fireEvent.press(screen.getByLabelText('All'));
    expect(listed(screen)).toHaveLength(4);
  });

  it('says so when the chosen period holds no receipt from the store', async () => {
    // The only Starbucks receipt is from 2025, so this month has none.
    mockId = 'r3';
    mockReceipts.data = [RECEIPTS[3]];
    const screen = await render(<ReceiptDetailScreen />);

    await fireEvent.press(screen.getByLabelText('Month'));

    expect(screen.getByText('No receipts from Starbucks in this period.')).toBeTruthy();
    // The receipt that was opened is still described at the top.
    expect(screen.getByText('Bought on 1 Dec 2025')).toBeTruthy();
  });

  it('opens another receipt from the same store on its own page', async () => {
    const screen = await render(<ReceiptDetailScreen />);

    await fireEvent.press(screen.getByLabelText('20 Sep 2026, -$7.25, Chase Checking ••7730'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/receipt/[id]', params: { id: 'r2' } });
  });

  it('leaves the receipt that is open as a plain line, since it is already open', async () => {
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.queryByLabelText(/^2 Oct 2026, -\$12\.50/)).toBeNull();
  });

  it('says there is no card or account when none was chosen', async () => {
    mockId = 'r3';
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getAllByText(/No card or account/).length).toBeGreaterThan(0);
  });

  it('steps back out when the receipt is gone, rather than showing an empty page', async () => {
    mockId = 'deleted';

    await render(<ReceiptDetailScreen />);

    expect(router.back).toHaveBeenCalled();
  });

  it('shows the one failure line and a way to try again when the receipts will not load', async () => {
    mockReceipts.data = undefined;
    mockReceipts.isError = true;

    const screen = await render(<ReceiptDetailScreen />);
    await fireEvent.press(screen.getByText('Try again'));

    expect(mockReceipts.refetch).toHaveBeenCalled();
  });

  it('opens Change logo for this receipt from its logo', async () => {
    const screen = await render(<ReceiptDetailScreen />);

    await fireEvent.press(screen.getByLabelText('Change logo'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/change-logo',
      params: { kind: 'receipt', id: 'r1', name: 'Starbucks' },
    });
  });

  it('draws the store’s logo by the row’s own rule', async () => {
    mockReceipts.data = [
      row('r1', 'Starbucks', '2026-10-02', {
        brands: { domain: 'starbucks.com' },
        logo_domain: 'starbucks.com',
        logo_hidden: false,
      }),
    ];
    await render(<ReceiptDetailScreen />);

    expect(mockMark).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Starbucks', domain: 'starbucks.com' }),
    );
  });
});

describe('a receipt’s page in Spanish and French', () => {
  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getByText(/^Comprado el 2 /)).toBeTruthy();
    expect(screen.getByText('Pagado con')).toBeTruthy();
    expect(screen.getByText('Categoría')).toBeTruthy();
    expect(screen.getByText('Recibos de Starbucks')).toBeTruthy();
    expect(screen.getByLabelText('Editar Starbucks')).toBeTruthy();
    expect(screen.getByLabelText('Todo')).toBeTruthy();
  });

  it('reads in French', async () => {
    setLanguage('fr');
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getByText(/^Acheté le 2 /)).toBeTruthy();
    expect(screen.getByText('Payé avec')).toBeTruthy();
    expect(screen.getByText('Catégorie')).toBeTruthy();
    expect(screen.getByText('Reçus de Starbucks')).toBeTruthy();
    expect(screen.getByLabelText('Modifier Starbucks')).toBeTruthy();
    expect(screen.getByLabelText('Tout')).toBeTruthy();
  });
});

describe('on the free plan', () => {
  afterEach(() => resetProStatusForTests());

  it('lists the store’s last 90 days, with the heading still counting all of them', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getByText('4 · $33.75')).toBeTruthy();
    expect(listed(screen)).toEqual(['2 Oct 2026', '1 Oct 2026', '20 Sep 2026']);
    expect(
      screen.getByLabelText(
        'Older history is saved. Free shows the last 90 days. Skip Pro shows up to 7 years.',
      ),
    ).toBeTruthy();
  });
});

describe('paid with a card the free plan has locked', () => {
  // r5 was paid with the locked card; r1, from the same store, with an offered one.
  const LOCKED = row('r5', 'Starbucks', '2026-09-28', { amount: 4.5, card_id: 'card-2' });

  beforeEach(() => {
    mockId = 'r5';
    mockReceipts.data = [RECEIPTS[0], LOCKED];
  });
  afterEach(() => resetLocaleForTests());

  it.each([
    ['en', 'No card or account'],
    ['es', 'Sin tarjeta ni cuenta'],
    ['fr', 'Aucune carte ni aucun compte'],
  ] as const)(
    'names the card on the page and in the store’s list in %s',
    async (language, none) => {
      setLanguage(language);
      const screen = await render(<ReceiptDetailScreen />);

      // In the details, and on the receipt's own line in the store's list.
      expect(screen.getByText('Amex ••3005')).toBeTruthy();
      expect(screen.getByText(/^Amex ••3005 · /)).toBeTruthy();
      expect(screen.queryByText(none)).toBeNull();
    },
  );

  it('names it on another receipt’s page too, in that page’s list', async () => {
    mockId = 'r1';
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getByLabelText(/^28 Sep 2026, -\$4\.50, Amex ••3005/)).toBeTruthy();
  });

  it('says nothing about how it was paid until the names are read', async () => {
    mockNamesLoading = true;
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.queryByText(/No card or account/)).toBeNull();
    expect(screen.queryByText('$4.50')).toBeNull();

    mockNamesLoading = false;
    await screen.rerender(<ReceiptDetailScreen />);
    expect(screen.getByText('Amex ••3005')).toBeTruthy();
  });
});

describe('a receipt’s page after a failed reload', () => {
  const NOTE = 'Couldn’t refresh · showing your last figures';

  /** Every line the page draws, top to bottom, with the end of the receipt card marked. */
  const drawnInOrder = (screen: Awaited<ReturnType<typeof render>>) => {
    const out: string[] = [];
    const walk = (node: unknown): void => {
      if (node == null) return;
      if (typeof node === 'string') {
        out.push(node);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const element = node as { props?: { testID?: string }; children?: unknown[] | null };
      (element.children ?? []).forEach(walk);
      if (element.props?.testID === 'plan-details') out.push('<end of card>');
    };
    walk(screen.toJSON());
    return out;
  };

  it('says nothing about refreshing while the read is fresh', async () => {
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getByText('$12.50')).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('keeps the receipt and its store’s list, with the note straight under the card', async () => {
    // TanStack keeps the last good answer and reports the failed reload as isError.
    mockReceipts.isError = true;
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getByText('$12.50')).toBeTruthy();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    const drawn = drawnInOrder(screen);
    expect(drawn[drawn.indexOf('<end of card>') + 1]).toBe(NOTE);
    expect(screen.getByTestId('receipts-from-store')).toBeTruthy();
    expect(screen.queryByText('Something went wrong. Please try again.')).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('is the failure page, with no note, when there is nothing to show', async () => {
    mockReceipts.data = undefined;
    mockReceipts.isError = true;
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it.each([
    ['es', 'No se pudo actualizar · mostrando tus últimas cifras'],
    ['fr', 'Impossible d’actualiser · voici tes derniers chiffres'],
  ] as const)('says the note in %s', async (language, note) => {
    setLanguage(language);
    mockReceipts.isError = true;
    const screen = await render(<ReceiptDetailScreen />);

    expect(screen.getAllByText(note)).toHaveLength(1);
  });
});

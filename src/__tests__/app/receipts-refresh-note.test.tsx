import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';

import ReceiptsScreen from '@/app/receipts';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Receipts after a reload that failed behind the list (a resume on a weak network refetches every
 * mounted read). TanStack keeps the last good answer but reports `isError`; the page must keep the
 * rows, the count and the total, and say once under them that they may be behind. With nothing
 * cached it is the failure page, with no note.
 *
 * The receipt, book and default-book reads are the real ones over a fake database, so the decision
 * is the one the app makes.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/receipts/book-icon', () => ({ BookIcon: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('@/api/scan', () => ({
  useReceiptScan: () => ({ scan: jest.fn(), scanning: false, available: false }),
  draftToParams: () => ({}),
}));
jest.mock('@/api/capture-allowance', () => ({
  useCaptureAllowance: () => ({ ready: true, scan: { allowed: true } }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

const mockRows: Record<string, unknown> = {};
// Every table fails while this is on; the tables in mockFailing fail on their own.
let mockOffline = false;
const mockFailing = new Set<string>();

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let single = false;
    const answer = () => {
      if (mockOffline || mockFailing.has(table)) {
        return { data: null, error: new Error(`${table} is unreachable`) };
      }
      const rows = mockRows[table] ?? [];
      return { data: single ? ((rows as unknown[])[0] ?? null) : rows, error: null };
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      maybeSingle: () => {
        single = true;
        return builder;
      },
      // Awaited directly by every read, so the builder is its own promise.
      then: (resolve: (value: unknown) => unknown) => resolve(answer()),
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => build(table),
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
});

const TODAY = '2026-09-12';

jest.useFakeTimers({
  now: new Date(`${TODAY}T09:00:00`),
  doNotFake: ['nextTick', 'setImmediate'],
});

const NOTE = 'Couldn’t refresh · showing your last figures';
const BAKERY = 'Bakery, -$6.00';
const CHEMIST = 'Chemist, -$5.00';

const receipt = (id: string, merchant: string, amount: number, purchased_on: string) => ({
  id,
  brand_id: null,
  merchant,
  amount,
  purchased_on,
  category_id: 'other',
  card_id: null,
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  created_at: `${purchased_on}T08:00:00Z`,
  book_id: null,
  brands: null,
});

async function show() {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <ReceiptsScreen />
    </QueryClientProvider>,
  );
  return client;
}

/** Every line the page draws, top to bottom. */
function drawnInOrder(): string[] {
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
    ((node as { children?: unknown[] | null }).children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

beforeEach(() => {
  mockOffline = false;
  mockFailing.clear();
  for (const table of Object.keys(mockRows)) delete mockRows[table];
  mockRows.receipts = [
    receipt('r2', 'Bakery', 6, TODAY),
    receipt('r1', 'Chemist', 5, '2026-09-11'),
  ];
});

describe('Receipts after a failed background reload', () => {
  it('says nothing about refreshing while every read is fresh', async () => {
    await show();
    expect(await screen.findByLabelText(BAKERY)).toBeTruthy();

    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('keeps the rows, the count and the total, with the note straight under them', async () => {
    const client = await show();
    expect(await screen.findByLabelText(BAKERY)).toBeTruthy();
    expect(screen.getByText('2 receipts')).toBeTruthy();
    expect(screen.getByText('-$11.00')).toBeTruthy();

    mockOffline = true;
    await act(() => client.refetchQueries());

    expect(await screen.findByText(NOTE)).toBeTruthy();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(BAKERY)).toBeTruthy();
    expect(screen.getByLabelText(CHEMIST)).toBeTruthy();
    const drawn = drawnInOrder();
    const count = drawn.indexOf('2 receipts');
    expect(drawn.slice(count, count + 3)).toEqual(['2 receipts', '-$11.00', NOTE]);
  });

  it.each([['receipts'], ['receipt_books'], ['profiles']])(
    'shows the note when only %s fails to reload',
    async (table) => {
      const client = await show();
      expect(await screen.findByLabelText(BAKERY)).toBeTruthy();

      mockFailing.add(table);
      await act(() => client.refetchQueries());

      expect(await screen.findByText(NOTE)).toBeTruthy();
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
      expect(screen.getByLabelText(BAKERY)).toBeTruthy();
      expect(screen.getByText('-$11.00')).toBeTruthy();
    },
  );

  it('keeps an empty book empty, not failed, with the note', async () => {
    mockRows.receipts = [];
    const client = await show();
    expect(await screen.findByText('No receipts yet')).toBeTruthy();

    mockOffline = true;
    await act(() => client.refetchQueries());

    expect(await screen.findByText(NOTE)).toBeTruthy();
    expect(screen.getByText('No receipts yet')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });
});

describe('Receipts when the reads fail with nothing cached', () => {
  it('is the failure page, with no rows and no note', async () => {
    mockOffline = true;
    await show();

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByLabelText(BAKERY)).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('is the failure page when only the books cannot be read', async () => {
    mockFailing.add('receipt_books');
    await show();

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByLabelText(BAKERY)).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});

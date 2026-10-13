import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';

import GoalsScreen from '@/app/goals';
import { resetLocaleForTests } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The Goals page after a reload that failed behind it: the summary and the goals stay, and one
 * quiet line under the summary says they may be behind. A read that failed with nothing cached is
 * the failure page, even when the other read landed: a goal counted without its moves would show
 * $0.00 saved as if it were so.
 *
 * `useGoals` is the real hook over a fake database, so the decision is the one the app makes.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null, Skeleton: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: 'light' }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/goal-icons', () => ({
  useGoalTypeIcons: () => new Proxy({}, { get: () => () => null }),
  useSavingsIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-11', todayDate: new Date('2026-10-11T00:00:00') }),
}));
// Goals never read the money book; savings.ts brings it along.
jest.mock('@/api/queries', () => ({
  useBookFlows: jest.fn(),
  bookFlows: jest.fn(),
  ledgerEntries: jest.fn(),
}));

type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};
// Every table fails while this is on; the tables in mockFailing fail on their own.
let mockOffline = false;
const mockFailing = new Set<string>();

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      is: () => builder,
      gt: () => builder,
      order: () => builder,
      limit: () => builder,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(
          resolve(
            mockOffline || mockFailing.has(table)
              ? { data: null, error: { message: `${table} is unreachable` }, count: null }
              : { data: mockTables[table] ?? [], error: null, count: null },
          ),
        ),
    };
    return builder;
  };
  return { supabase: { from: build, rpc: async () => ({ data: null, error: null }) } };
});

const NOTE = 'Couldn’t refresh · showing your last figures';
const TRIP_SAVED = 'Saved toward goals, $300.00 of $1,200. 1 active · 0 done';

async function show() {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <GoalsScreen />
    </QueryClientProvider>,
  );
  return client;
}

/** Every line the page draws, top to bottom, with the summary card's end marked. */
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
    const element = node as { props?: { testID?: string }; children?: unknown[] | null };
    (element.children ?? []).forEach(walk);
    if (element.props?.testID === 'goals-summary') out.push('<end of summary>');
  };
  walk(screen.toJSON());
  return out;
}

beforeEach(() => {
  resetLocaleForTests();
  mockOffline = false;
  mockFailing.clear();
  // Trip, $300 of $1,200.
  mockTables.goals = [
    {
      id: 'trip',
      name: 'Trip',
      icon_id: 'trip',
      target: '1200.00',
      target_date: null,
      start_amount: '0.00',
      created_at: '2026-09-01T09:00:00Z',
      closed_at: null,
    },
  ];
  mockTables.goal_moves = [
    {
      id: 'm1',
      goal_id: 'trip',
      pot_id: 'aug',
      amount: 300,
      batch_id: 'b1',
      created_at: '2026-09-02T10:00:00Z',
    },
  ];
});

describe('the Goals page after a failed background reload', () => {
  it('says nothing about refreshing while its reads are fresh', async () => {
    await show();
    expect(await screen.findByLabelText(TRIP_SAVED)).toBeTruthy();

    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it.each([['goals'], ['goal_moves']])(
    'keeps the figures and puts the note straight under the summary when %s fails',
    async (table) => {
      const client = await show();
      expect(await screen.findByLabelText(TRIP_SAVED)).toBeTruthy();

      mockFailing.add(table);
      await act(() => client.refetchQueries());

      expect(await screen.findByText(NOTE)).toBeTruthy();
      expect(screen.getAllByText(NOTE)).toHaveLength(1);
      expect(screen.getByLabelText(TRIP_SAVED)).toBeTruthy();
      expect(screen.getByText('Trip')).toBeTruthy();
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
      const drawn = drawnInOrder();
      expect(drawn[drawn.indexOf('<end of summary>') + 1]).toBe(NOTE);
    },
  );

  it('keeps the first-goal invite, not the failure page, when no goals were cached', async () => {
    mockTables.goals = [];
    mockTables.goal_moves = [];
    const client = await show();
    expect(await screen.findByTestId('goal-invite-goals')).toBeTruthy();

    mockOffline = true;
    await act(() => client.refetchQueries());

    expect(await screen.findByText(NOTE)).toBeTruthy();
    expect(screen.getByTestId('goal-invite-goals')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });
});

describe('the Goals page when a read has nothing cached', () => {
  it.each([['goals'], ['goal_moves']])(
    'is the failure page, with no figures and no note, when %s cannot be read',
    async (table) => {
      mockFailing.add(table);
      await show();

      expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByText('Trip')).toBeNull();
      expect(screen.queryByTestId('goals-summary')).toBeNull();
      expect(screen.queryByText(NOTE)).toBeNull();
    },
  );
});

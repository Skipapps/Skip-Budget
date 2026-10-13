import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';

import NotificationsScreen from '@/app/notifications';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Notifications after a reload that failed behind the news already on screen: the news stays and
 * one quiet line above it says it may be behind. With nothing cached it is the failure page, with
 * no note.
 *
 * `useAnnouncements` is the real read over a fake database, so the decision is the one the app makes.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));
jest.mock('@/api/news', () => ({ useMarkNewsSeen: () => jest.fn() }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let mockOffline = false;
let mockNews: unknown[] = [];

jest.mock('@/lib/supabase', () => {
  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: unknown) => unknown) =>
      resolve(
        mockOffline
          ? { data: null, error: new Error('announcements is unreachable') }
          : { data: mockNews, error: null },
      ),
  };
  return { supabase: { from: () => builder } };
});

const NOTE = 'Couldn’t refresh · showing your last figures';
const RELEASE = {
  id: 'n-1',
  kind: 'update',
  title: 'Version 1.2 is out',
  body: 'Update from the App Store for faster scanning.',
  published_at: '2026-09-28T09:00:00+00:00',
};

async function show() {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <NotificationsScreen />
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
  mockNews = [RELEASE];
});

describe('Notifications after a failed background reload', () => {
  it('says nothing about refreshing while the news is fresh', async () => {
    await show();
    expect(await screen.findByText('Version 1.2 is out')).toBeTruthy();

    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('keeps the news, with the note at the top of the list', async () => {
    const client = await show();
    expect(await screen.findByText('Version 1.2 is out')).toBeTruthy();

    mockOffline = true;
    await act(() => client.refetchQueries());

    expect(await screen.findByText(NOTE)).toBeTruthy();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(screen.getByText('Version 1.2 is out')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    const drawn = drawnInOrder();
    expect(drawn.indexOf(NOTE)).toBeLessThan(drawn.indexOf('Version 1.2 is out'));
  });

  it('keeps "no news" as it was, with the note, when nothing had been posted', async () => {
    mockNews = [];
    const client = await show();
    expect(await screen.findByText('No news yet')).toBeTruthy();

    mockOffline = true;
    await act(() => client.refetchQueries());

    expect(await screen.findByText(NOTE)).toBeTruthy();
    expect(screen.getByText('No news yet')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });
});

describe('Notifications when the news has never been read', () => {
  it('is the failure page, with no note', async () => {
    mockOffline = true;
    await show();

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText('Version 1.2 is out')).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});

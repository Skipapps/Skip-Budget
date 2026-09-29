import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useHasUnreadNews, useMarkNewsSeen } from '@/api/news';

/**
 * The dot on the Home bell: lit while the newest published item is newer than
 * the newest one seen, out once Notifications has been opened.
 */

const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
  },
}));

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let mockNews: { published_at: string }[] | undefined;
jest.mock('@/api/queries', () => ({
  useAnnouncements: () => ({ data: mockNews }),
}));

const NEWEST = '2026-09-28T09:00:00+00:00';
const OLDER = '2026-09-20T09:00:00+00:00';
const KEY = 'skip.news.seenThrough.user-1';

/** Long enough for storage to answer and the query to notify, which is on a timer. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockStorage.clear();
  mockNews = [{ published_at: NEWEST }, { published_at: OLDER }];
});

it('has nothing to say when there is no news', async () => {
  mockNews = [];
  const { result } = await renderHook(() => useHasUnreadNews(), { wrapper });
  await settle();
  expect(result.current).toBe(false);
});

it('lights the dot for an account that has never opened Notifications', async () => {
  const { result } = await renderHook(() => useHasUnreadNews(), { wrapper });
  await waitFor(() => expect(result.current).toBe(true));
});

it('lights it again when something newer is published', async () => {
  mockStorage.set(KEY, OLDER);
  const { result } = await renderHook(() => useHasUnreadNews(), { wrapper });
  await waitFor(() => expect(result.current).toBe(true));
});

it('stays dark once the newest has been seen', async () => {
  mockStorage.set(KEY, NEWEST);
  const { result } = await renderHook(() => useHasUnreadNews(), { wrapper });
  // Settled, not merely still loading: the same wait lights it in the tests above.
  await settle();
  expect(result.current).toBe(false);
});

it('goes out when Notifications marks the newest as seen, and remembers it', async () => {
  const { result } = await renderHook(
    () => ({ unread: useHasUnreadNews(), markSeen: useMarkNewsSeen() }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.unread).toBe(true));

  await act(() => result.current.markSeen(NEWEST));

  await waitFor(() => expect(result.current.unread).toBe(false));
  expect(mockStorage.get(KEY)).toBe(NEWEST);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { RealtimeProvider } from '@/providers/realtime-provider';

/**
 * The socket carries only the signed-in account's own rows. The shared topics the server still
 * broadcasts on (`group:<id>`, `user:<id>`) carry Splits changes, and this app has no Splits
 * screen: a listener on one would hold a channel open to invalidate caches nothing reads.
 */

let mockUserId: string | null = 'user-A';

const mockChain = {
  on: () => mockChain,
  subscribe: () => mockChain,
};
const mockChannel = jest.fn((_topic: string, _options?: unknown) => mockChain);
const mockRemoveChannel = jest.fn((_channel: unknown) => Promise.resolve('ok'));
// Answers as an account in one group would, so a group listener put back would have a topic to open.
const mockFrom = jest.fn((_table: string) => ({
  select: async () => ({ data: [{ group_id: 'group-1' }], error: null }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: (topic: string, options?: unknown) => mockChannel(topic, options),
    removeChannel: (channel: unknown) => mockRemoveChannel(channel),
    from: (table: string) => mockFrom(table),
  },
}));

jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

async function renderProvider() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await render(
    <QueryClientProvider client={client}>
      <RealtimeProvider>
        <Text>Home</Text>
      </RealtimeProvider>
    </QueryClientProvider>,
  );
  // A listener that waits on a read opens its channel a tick later; let that tick pass before
  // asserting that nothing else opened.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
}

beforeEach(() => {
  mockUserId = 'user-A';
  mockChannel.mockClear();
  mockRemoveChannel.mockClear();
  mockFrom.mockClear();
});

describe('RealtimeProvider', () => {
  it("listens on the account's own channel and nothing shared", async () => {
    const { unmount } = await renderProvider();

    expect(screen.getByText('Home')).toBeTruthy();
    expect(mockChannel.mock.calls.map(([topic]) => topic)).toEqual(['skip:user-A']);
    expect(mockFrom).not.toHaveBeenCalled();

    await unmount();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('opens no channel while signed out', async () => {
    mockUserId = null;
    const { unmount } = await renderProvider();

    expect(screen.getByText('Home')).toBeTruthy();
    expect(mockChannel).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();

    await unmount();
  });
});

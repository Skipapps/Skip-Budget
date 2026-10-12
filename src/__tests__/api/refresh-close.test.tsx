import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useKeepSchedulesCurrent } from '@/api/refresh';

/**
 * Where the savings close sits in the sweep: after pay and charges are written down, so a month is
 * frozen on all of them, and before schedules roll forward. Savings are re-read only when a month
 * closed.
 */

const mockSteps: string[] = [];
let mockClosed = 0;

jest.mock('@/api/charges', () => ({
  recordDueCharges: async () => {
    mockSteps.push('charges');
    return 0;
  },
}));
jest.mock('@/api/pay', () => ({
  recordDuePay: async () => {
    mockSteps.push('pay');
    return 0;
  },
}));
jest.mock('@/api/savings', () => ({
  closeFinishedMonths: async (userId: string, today: string) => {
    mockSteps.push(`close ${userId} ${today.length}`);
    return mockClosed;
  },
}));
jest.mock('@/lib/supabase', () => {
  const read = () => {
    mockSteps.push('roll');
    const builder: Record<string, unknown> = {
      select: () => builder,
      not: () => builder,
      lt: () => builder,
      eq: () => builder,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(resolve({ data: [], error: null })),
    };
    return builder;
  };
  return { supabase: { from: read } };
});
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let client: QueryClient;
let invalidated: unknown[][];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockSteps.length = 0;
  client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  invalidated = [];
  client.invalidateQueries = ((filters?: { queryKey?: unknown[] }) => {
    invalidated.push(filters?.queryKey ?? []);
    return Promise.resolve();
  }) as typeof client.invalidateQueries;
});

it('closes months after recording pay and charges, before rolling schedules on', async () => {
  mockClosed = 2;
  await renderHook(() => useKeepSchedulesCurrent(), { wrapper });
  await waitFor(() => expect(mockSteps).toContain('roll'));

  expect(mockSteps.slice(0, 4)).toEqual(['charges', 'pay', 'close user-1 10', 'roll']);
  expect(invalidated).toEqual([['savings']]);
});

it('leaves savings alone when no month closed', async () => {
  mockClosed = 0;
  await renderHook(() => useKeepSchedulesCurrent(), { wrapper });
  await waitFor(() => expect(mockSteps).toContain('roll'));
  expect(invalidated).toEqual([]);
});

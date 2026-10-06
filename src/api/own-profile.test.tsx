import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useProfile } from '@/api/queries';
import { useReceiptReminder } from '@/api/reminders';

/**
 * The profiles select policy shows more than the caller's own row: friends', groupmates' and either
 * side of a pending request. A read that leans on RLS alone and asks for one row then gets several,
 * and PostgREST answers `.maybeSingle()` with an error rather than a row. So this mock answers the
 * way PostgREST does under that policy, with a friend's row visible beside the signed-in one.
 */

type Row = Record<string, unknown>;

const VISIBLE_PROFILES: Row[] = [
  {
    id: 'user-1',
    display_name: 'Sam',
    currency: 'USD',
    avatar_id: null,
    getting_started_dismissed_at: null,
    reminders_enabled_at: null,
    receipt_reminder_enabled: true,
    receipt_reminder_at: '07:15:00',
  },
  {
    id: 'user-2',
    display_name: 'Priya',
    currency: 'USD',
    avatar_id: null,
    getting_started_dismissed_at: null,
    reminders_enabled_at: null,
    receipt_reminder_enabled: false,
    receipt_reminder_at: '21:00:00',
  },
];

jest.mock('@/lib/supabase', () => {
  const build = (rows: Row[]) => {
    let columns: string[] = [];
    let remaining = rows;
    let failure: { code: string; message: string } | null = null;

    const builder: Record<string, unknown> = {
      select: (list: string) => {
        columns = list.split(',').map((column) => column.trim());
        return builder;
      },
      eq: (column: string, value: unknown) => {
        if (!rows.every((row) => column in row)) {
          failure = { code: '42703', message: `column profiles.${column} does not exist` };
        }
        remaining = remaining.filter((row) => row[column] === value);
        return builder;
      },
      maybeSingle: () => {
        if (failure) return Promise.resolve({ data: null, error: failure });
        if (remaining.length > 1) {
          return Promise.resolve({
            data: null,
            error: {
              code: 'PGRST116',
              message: 'JSON object requested, multiple (or no) rows returned',
            },
          });
        }
        const row = remaining[0];
        return Promise.resolve({
          data: row ? Object.fromEntries(columns.map((column) => [column, row[column]])) : null,
          error: null,
        });
      },
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table !== 'profiles') throw new Error(`unexpected read of ${table}`);
        return build(VISIBLE_PROFILES);
      },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({
  useUserId: () => 'user-1',
}));

// queries.ts imports usePro for the payment-source list; the real one needs react-native-purchases.
jest.mock('@/api/pro', () => ({
  usePro: () => ({ pro: true, ready: true }),
}));

// reminders.ts imports enableReminders; the real module pulls in expo-notifications.
jest.mock('@/api/push', () => ({
  enableReminders: async () => true,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    // No retries: an error must surface on the first answer, not after three silent attempts.
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('reads of the signed-in profile', () => {
  it("useProfile returns the signed-in account's row when the policy also shows a friend's", async () => {
    const { result } = await renderHook(() => useProfile(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data?.display_name).toBe('Sam');
  });

  it("useReceiptReminder reads the signed-in account's setting, not an error", async () => {
    const { result } = await renderHook(() => useReceiptReminder(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ isError: false, enabled: true, remindAt: '07:15' });
  });
});

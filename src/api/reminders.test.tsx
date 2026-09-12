import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { NOTHING_SAVED } from '@/api/mutations';
import {
  DEFAULT_RECEIPT_REMIND_AT,
  receiptReminderFrom,
  useReceiptReminder,
  useSetReceiptReminder,
} from '@/api/reminders';

/**
 * The daily receipts reminder setting.
 *
 * Two things are worth pinning here and neither is visible from the screen:
 * the default time is 8pm even when nothing has been stored, and turning the
 * reminder on asks for notification permission before it writes — a reminder
 * saved on a phone that was never asked is a promise we cannot keep.
 */

/** The profile row the fake client hands back. Set per test. */
let mockProfile: Record<string, unknown> | null = null;
/** Every update the hooks send, so the payload can be asserted rather than assumed. */
const mockUpdates: {
  table: string;
  values: Record<string, unknown>;
  id: unknown;
  selected: string;
}[] = [];
/** Rows the update answers with. Empty means the filter matched nothing. */
let mockUpdatedRows: { id: string }[] = [];

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      maybeSingle: () => Promise.resolve({ data: mockProfile, error: null }),
      update: (values: Record<string, unknown>) => ({
        eq: (_column: string, id: unknown) => ({
          // The update only resolves through `select`, because that is the
          // only shape the hook uses: an update with no rows asked for is the
          // silent no-op this mock must not be able to imitate.
          select: (columns: string) => {
            mockUpdates.push({ table, values, id, selected: columns });
            return Promise.resolve({ data: mockUpdatedRows, error: null });
          },
        }),
      }),
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => build(table),
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    },
  };
});

const mockEnableReminders = jest.fn(async (_userId: string) => true);
jest.mock('@/api/push', () => ({
  enableReminders: (userId: string) => mockEnableReminders(userId),
}));

jest.mock('@/providers/session-provider', () => ({
  useUserId: () => 'user-1',
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockProfile = null;
  mockUpdates.length = 0;
  mockUpdatedRows = [{ id: 'user-1' }];
  mockEnableReminders.mockClear();
});

describe('receiptReminderFrom', () => {
  it('is off at 8pm when there is no profile row to read', () => {
    expect(receiptReminderFrom(null)).toEqual({ enabled: false, remindAt: '20:00' });
    expect(DEFAULT_RECEIPT_REMIND_AT).toBe('20:00');
  });

  it('trims the seconds Postgres adds to a time', () => {
    expect(
      receiptReminderFrom({ receipt_reminder_enabled: true, receipt_reminder_at: '21:30:00' }),
    ).toEqual({ enabled: true, remindAt: '21:30' });
  });

  it('falls back to 8pm rather than midnight when the column is null', () => {
    // The column is `not null default '20:00'`, so this is the row written
    // before the migration — the app must not answer that with 00:00.
    expect(
      receiptReminderFrom({ receipt_reminder_enabled: true, receipt_reminder_at: null }),
    ).toEqual({ enabled: true, remindAt: '20:00' });
  });

  it('treats anything that is not a wall-clock time as unset', () => {
    expect(
      receiptReminderFrom({ receipt_reminder_enabled: false, receipt_reminder_at: 'sometime' }),
    ).toEqual({ enabled: false, remindAt: '20:00' });
  });
});

describe('useReceiptReminder', () => {
  it('shows the stored setting once the read lands', async () => {
    mockProfile = { receipt_reminder_enabled: true, receipt_reminder_at: '07:15:00' };

    const { result } = await renderHook(() => useReceiptReminder(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ enabled: true, remindAt: '07:15' });
  });

  it('is off at 8pm for an account that has never set one', async () => {
    const { result } = await renderHook(() => useReceiptReminder(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ enabled: false, remindAt: '20:00' });
  });
});

describe('useSetReceiptReminder', () => {
  it('asks for notification permission before it stores a yes', async () => {
    const { result } = await renderHook(() => useSetReceiptReminder(), { wrapper });

    await result.current.mutateAsync({ enabled: true, remindAt: '20:00' });

    expect(mockEnableReminders).toHaveBeenCalledWith('user-1');
    expect(mockUpdates).toEqual([
      {
        table: 'profiles',
        values: { receipt_reminder_enabled: true, receipt_reminder_at: '20:00' },
        id: 'user-1',
        selected: 'id',
      },
    ]);
  });

  it('does not ask for permission when switching off', async () => {
    const { result } = await renderHook(() => useSetReceiptReminder(), { wrapper });

    await result.current.mutateAsync({ enabled: false });

    expect(mockEnableReminders).not.toHaveBeenCalled();
  });

  it('leaves the stored time alone when none is given', async () => {
    const { result } = await renderHook(() => useSetReceiptReminder(), { wrapper });

    await result.current.mutateAsync({ enabled: false });

    expect(mockUpdates[0].values).toEqual({ receipt_reminder_enabled: false });
  });

  it('fails rather than reporting success when no profile row was updated', async () => {
    // The switch reading "on" after a write that touched nothing is worse than
    // an error: the next launch reads the setting back off with no explanation.
    //
    // The wording is the settings one, not the records one: this reminder is a
    // column on the profile, so "it may have been deleted on another device"
    // would be a guess and "open the list again" would point at no list.
    mockUpdatedRows = [];
    const { result } = await renderHook(() => useSetReceiptReminder(), { wrapper });

    await expect(result.current.mutateAsync({ enabled: true, remindAt: '20:00' })).rejects.toThrow(
      NOTHING_SAVED,
    );
  });
});

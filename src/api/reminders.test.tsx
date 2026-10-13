import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { NOTHING_SAVED } from '@/api/mutations';
import {
  DEFAULT_RECEIPT_REMIND_AT,
  LEAD_OPTIONS,
  leadToChoice,
  receiptReminderFrom,
  REMINDER_CAPTION,
  REMINDER_CHOICES,
  useReceiptReminder,
  usePaymentNotices,
  useSetPaymentNotices,
  useSetReceiptReminder,
  useSetReminder,
} from '@/api/reminders';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The daily receipts reminder setting. Two things to pin: the default time is 8pm even when nothing
 * is stored, and turning it on asks for notification permission before it writes.
 */

let mockProfile: Record<string, unknown> | null = null;
const mockUpdates: {
  table: string;
  values: Record<string, unknown>;
  id: unknown;
  selected: string;
}[] = [];
let mockUpdatedRows: { id: string }[] = [];
const mockUpserts: { table: string; values: Record<string, unknown> }[] = [];

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve({ data: mockProfile, error: null }),
      upsert: (values: Record<string, unknown>) => {
        mockUpserts.push({ table, values });
        return Promise.resolve({ error: null });
      },
      update: (values: Record<string, unknown>) => ({
        eq: (_column: string, id: unknown) => ({
          // The update only resolves through `select`, the only shape the hook uses: an update with
          // no rows asked for is the silent no-op this mock must not imitate.
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
    // The column is `not null default '20:00'`; this is a row written before the migration.
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
    // A switch reading "on" after a write that touched nothing is worse than an error. The wording
    // is the settings one: this reminder is a profile column, so "deleted on another device" would
    // be a guess and "open the list again" would point at no list.
    mockUpdatedRows = [];
    const { result } = await renderHook(() => useSetReceiptReminder(), { wrapper });

    await expect(result.current.mutateAsync({ enabled: true, remindAt: '20:00' })).rejects.toThrow(
      NOTHING_SAVED,
    );
  });
});

describe('the reminder choices in each language', () => {
  beforeEach(() => resetLocaleForTests());
  afterAll(() => resetLocaleForTests());

  const labels = (options: readonly { label: string }[]) => options.map((option) => option.label);

  it('keeps the English labels and every stored value', () => {
    expect(labels(LEAD_OPTIONS)).toEqual(['On the day', '1 day', '3 days', '1 week']);
    expect(labels(REMINDER_CHOICES)).toEqual(['Off', 'On the day', '1 day', '3 days', '1 week']);
    expect(REMINDER_CAPTION.card).toBe("Before this card's payment day");

    setLanguage('fr');
    expect(LEAD_OPTIONS.map((option) => option.value)).toEqual([0, 1, 3, 7]);
    expect(REMINDER_CHOICES.map((option) => option.value)).toEqual(['off', '0', '1', '3', '7']);
    expect(leadToChoice(3)).toBe('3');
  });

  it('reads in Spanish', () => {
    setLanguage('es');
    expect(labels(REMINDER_CHOICES)).toEqual([
      'Desactivado',
      'El mismo día',
      '1 día',
      '3 días',
      '1 semana',
    ]);
    expect(REMINDER_CAPTION.bill).toBe('Antes de que venza la factura');
    expect(REMINDER_CAPTION.account).toBe('Cuando tu salario llegue aquí');
  });

  it('reads in French', () => {
    setLanguage('fr');
    expect(labels(LEAD_OPTIONS)).toEqual(['Le jour même', '1 jour', '3 jours', '1 semaine']);
    expect(REMINDER_CAPTION.subscription).toBe('Avant le renouvellement');
    expect(REMINDER_CAPTION.card).toBe('Avant la date de paiement de cette carte');
  });
});

describe('useSetReminder', () => {
  beforeEach(() => {
    mockUpserts.length = 0;
  });

  it('leaves the stored time alone when a switch turns a reminder off or on without one', async () => {
    const { result } = await renderHook(() => useSetReminder(), { wrapper });

    await result.current.mutateAsync({
      kind: 'bill',
      targetId: 'bill-1',
      enabled: false,
      leadDays: 3,
    });
    await result.current.mutateAsync({
      kind: 'bill',
      targetId: 'bill-1',
      enabled: true,
      leadDays: 3,
    });

    expect(mockUpserts).toHaveLength(2);
    for (const { table, values } of mockUpserts) {
      expect(table).toBe('reminders');
      expect(values).not.toHaveProperty('remind_at');
      expect(values).toMatchObject({ bill_id: 'bill-1', lead_days: 3 });
    }
    expect(mockUpserts.map(({ values }) => values.enabled)).toEqual([false, true]);
  });

  it('writes the time it is given', async () => {
    const { result } = await renderHook(() => useSetReminder(), { wrapper });

    await result.current.mutateAsync({
      kind: 'subscription',
      targetId: 'sub-1',
      enabled: true,
      leadDays: 1,
      remindAt: '21:30',
    });

    expect(mockUpserts[0].values).toMatchObject({
      subscription_id: 'sub-1',
      bill_id: null,
      enabled: true,
      lead_days: 1,
      remind_at: '21:30',
    });
  });
});

describe('payment notices', () => {
  it('are on when the profile holds nothing about them', async () => {
    mockProfile = null;
    const { result } = await renderHook(() => usePaymentNotices(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('are off once the profile says so', async () => {
    mockProfile = { payment_notices: false };
    const { result } = await renderHook(() => usePaymentNotices(), { wrapper });
    await waitFor(() => expect(result.current.enabled).toBe(false));
  });

  it('writes the switch to this profile, asking for notifications when it goes on', async () => {
    const { result } = await renderHook(() => useSetPaymentNotices(), { wrapper });

    await result.current.mutateAsync(true);

    expect(mockUpdates).toEqual([
      { table: 'profiles', values: { payment_notices: true }, id: 'user-1', selected: 'id' },
    ]);
    expect(mockEnableReminders).toHaveBeenCalledWith('user-1');
  });

  it('asks nothing when it goes off', async () => {
    const { result } = await renderHook(() => useSetPaymentNotices(), { wrapper });

    await result.current.mutateAsync(false);

    expect(mockUpdates[0].values).toEqual({ payment_notices: false });
    expect(mockEnableReminders).not.toHaveBeenCalled();
  });

  it('reports a profile it could not write to, rather than a switch that only looks saved', async () => {
    mockUpdatedRows = [];
    const { result } = await renderHook(() => useSetPaymentNotices(), { wrapper });

    await expect(result.current.mutateAsync(false)).rejects.toThrow(NOTHING_SAVED);
  });
});

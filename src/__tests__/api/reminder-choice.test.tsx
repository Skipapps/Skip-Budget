import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useReminderChoice, useReminders } from '@/api/reminders';

/**
 * A form's saved reminder is 'off' both when none is saved and while it cannot be read. `unknown`
 * tells the two apart, so a Save never deletes a reminder it could not see.
 */

let mockAnswer: () => Promise<{ data: unknown; error: unknown }>;

jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ select: () => mockAnswer() }) },
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));

const ROW = {
  id: 'reminder-1',
  bill_id: null,
  subscription_id: null,
  card_id: 'card-1',
  bank_account_id: null,
  enabled: true,
  lead_days: 3,
  remind_at: '18:30:00',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useReminderChoice', () => {
  it('is unknown for a saved card while the read is still loading', async () => {
    mockAnswer = () => new Promise(() => {});
    const { result } = await renderHook(() => useReminderChoice('card', 'card-1'), { wrapper });

    expect(result.current).toEqual({ choice: 'off', remindAt: '09:00', unknown: true });
  });

  it('is unknown after the read failed', async () => {
    mockAnswer = async () => ({ data: null, error: { code: '08006', message: 'offline' } });
    const { result } = await renderHook(
      () => ({ choice: useReminderChoice('card', 'card-1'), read: useReminders() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.read.isError).toBe(true));
    expect(result.current.choice).toEqual({ choice: 'off', remindAt: '09:00', unknown: true });
  });

  it('is known, with the saved lead and time, once the read lands', async () => {
    mockAnswer = async () => ({ data: [ROW], error: null });
    const { result } = await renderHook(() => useReminderChoice('card', 'card-1'), { wrapper });

    await waitFor(() => expect(result.current.unknown).toBe(false));
    expect(result.current).toEqual({ choice: '3', remindAt: '18:30', unknown: false });
  });

  it('is known to be off once the read lands without one for this card', async () => {
    mockAnswer = async () => ({ data: [ROW], error: null });
    const { result } = await renderHook(() => useReminderChoice('card', 'card-2'), { wrapper });

    await waitFor(() => expect(result.current.unknown).toBe(false));
    expect(result.current.choice).toBe('off');
  });

  it('is never unknown for something new: nothing can be saved for it yet', async () => {
    mockAnswer = () => new Promise(() => {});
    const { result } = await renderHook(() => useReminderChoice('card', undefined), { wrapper });

    expect(result.current.unknown).toBe(false);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { msUntilNextMidnight, useKeepSchedulesCurrent } from '@/api/refresh';
import { toIsoDate } from '@/lib/date';

/**
 * The sweep when the day turns while the app stays open: a phone left on Home overnight is never
 * resumed, so a timer to the next local midnight runs the same sweep a resume runs, once per turn of
 * the day, and a resume at the same moment does not run it twice.
 */

/** The day each sweep was run for, as the first recorder is asked. */
const mockSweptFor: string[] = [];

jest.mock('@/api/charges', () => ({
  recordDueCharges: async (_userId: string, today: string) => {
    mockSweptFor.push(today);
    // Something was recorded, so the sweep re-reads the charges.
    return 1;
  },
}));
jest.mock('@/api/pay', () => ({ recordDuePay: async () => 0 }));
jest.mock('@/api/savings', () => ({ closeFinishedMonths: async () => 0 }));
jest.mock('@/lib/supabase', () => {
  const read = () => {
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
let mockUserId: string | null = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

let client: QueryClient;
let invalidated: unknown[][];
let resume: ((status: AppStateStatus) => void) | undefined;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Local time on 13 or 14 Oct 2026. */
const at = (day: 13 | 14, hours: number, minutes: number, seconds = 0, ms = 0) =>
  new Date(2026, 9, day, hours, minutes, seconds, ms);

/** Moves the clock to `when`, running every timer due on the way and what they set off. */
async function clockTo(when: Date) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(when.getTime() - Date.now());
  });
}

beforeEach(() => {
  mockSweptFor.length = 0;
  mockUserId = 'user-1';
  resume = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    resume = handler as (status: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  invalidated = [];
  client.invalidateQueries = ((filters?: { queryKey?: unknown[] }) => {
    invalidated.push(filters?.queryKey ?? []);
    return Promise.resolve();
  }) as typeof client.invalidateQueries;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Opens the app at `when` and waits for the launch sweep. */
async function launchAt(when: Date) {
  jest.useFakeTimers({ now: when, doNotFake: ['nextTick', 'setImmediate'] });
  const view = await renderHook(() => useKeepSchedulesCurrent(), { wrapper });
  await waitFor(() => expect(mockSweptFor).toEqual(['2026-10-13']));
  invalidated.length = 0;
  return view;
}

describe('the sweep when the day turns with the app open', () => {
  it('does not run again before midnight', async () => {
    await launchAt(at(13, 23, 59));

    await clockTo(at(13, 23, 59, 59, 999));

    expect(mockSweptFor).toEqual(['2026-10-13']);
    expect(invalidated).toEqual([]);
  });

  it('sweeps the new day once just after midnight and re-reads what it recorded', async () => {
    await launchAt(at(13, 23, 59));

    await clockTo(at(14, 0, 0, 2));

    expect(mockSweptFor).toEqual(['2026-10-13', '2026-10-14']);
    expect(invalidated).toEqual([['charges']]);

    // Nothing more that day, and the timer is set again for the next one.
    await clockTo(at(14, 23, 59, 59));
    expect(mockSweptFor).toEqual(['2026-10-13', '2026-10-14']);
    await clockTo(new Date(2026, 9, 15, 0, 0, 2));
    expect(mockSweptFor).toEqual(['2026-10-13', '2026-10-14', '2026-10-15']);
  });

  it('sweeps once when a resume lands just before the timer', async () => {
    // Launched 30 s before midnight: the resume falls inside the minute that usually skips one.
    await launchAt(at(13, 23, 59, 30));

    await clockTo(at(14, 0, 0, 0, 500));
    await act(async () => resume?.('active'));
    // Before the clock moves again, so the timer cannot be the one that swept.
    expect(mockSweptFor).toEqual(['2026-10-13', '2026-10-14']);

    await clockTo(at(14, 0, 0, 5));
    expect(mockSweptFor).toEqual(['2026-10-13', '2026-10-14']);
  });

  it('sweeps once when a resume lands just after the timer', async () => {
    await launchAt(at(13, 23, 59));

    await clockTo(at(14, 0, 0, 2));
    await act(async () => resume?.('active'));
    await clockTo(at(14, 0, 0, 20));

    expect(mockSweptFor).toEqual(['2026-10-13', '2026-10-14']);
  });

  it('stops at unmount', async () => {
    const view = await launchAt(at(13, 23, 59));

    await view.unmount();
    await clockTo(at(14, 0, 1));

    expect(mockSweptFor).toEqual(['2026-10-13']);
  });

  it('stops at sign-out', async () => {
    const view = await launchAt(at(13, 23, 59));

    mockUserId = null;
    await view.rerender({});
    await clockTo(at(14, 0, 1));

    expect(mockSweptFor).toEqual(['2026-10-13']);
  });
});

describe('msUntilNextMidnight', () => {
  // Ordinary days, a month and a year end, and the days North America and Europe change clocks.
  it.each([
    new Date(2026, 9, 13, 23, 59, 30),
    new Date(2026, 9, 13, 0, 0, 0),
    new Date(2026, 9, 31, 12, 0, 0),
    new Date(2026, 11, 31, 18, 45, 0),
    new Date(2026, 2, 8, 0, 30, 0),
    new Date(2026, 2, 29, 0, 30, 0),
    new Date(2026, 9, 25, 0, 30, 0),
    new Date(2026, 10, 1, 0, 30, 0),
  ])('lands on the next local midnight from %s', (now) => {
    const ms = msUntilNextMidnight(now);
    const next = new Date(now.getTime() + ms);

    expect(ms).toBeGreaterThan(0);
    expect([next.getHours(), next.getMinutes(), next.getSeconds(), next.getMilliseconds()]).toEqual(
      [0, 0, 0, 0],
    );
    expect(toIsoDate(next)).toBe(
      toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)),
    );
  });
});

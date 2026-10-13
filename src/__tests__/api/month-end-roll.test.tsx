import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useKeepSchedulesCurrent } from '@/api/refresh';

/**
 * The phone's roller moves a stored date that has passed onto the plan's anchor day, not onto the
 * day a short month left it on, and writes only the date: the database keeps the anchor. A set
 * period rolls monthly, as the server's roller does. A database without the column rolls from the
 * stored day, as before.
 */

type Row = Record<string, unknown>;

const mockDb: {
  rows: Record<string, Row[]>;
  hasAnchorDay: boolean;
  updates: { table: string; values: Row; id: unknown }[];
} = { rows: {}, hasAnchorDay: true, updates: [] };

jest.mock('@/api/charges', () => ({ recordDueCharges: async () => 0 }));
jest.mock('@/api/pay', () => ({ recordDuePay: async () => 0 }));
jest.mock('@/api/savings', () => ({ closeFinishedMonths: async () => 0 }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

jest.mock('@/lib/supabase', () => {
  const ANCHOR = /\banchor_day\b/;
  const build = (table: string) => {
    let columns = '';
    let values: Row | null = null;
    const builder: Record<string, unknown> = {
      select: (asked: string) => {
        columns = asked;
        return builder;
      },
      not: () => builder,
      lt: () => builder,
      update: (asked: Row) => {
        values = asked;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        if (values && column === 'id') mockDb.updates.push({ table, values, id: value });
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        if (values) return Promise.resolve(resolve({ error: null }));
        if (!mockDb.hasAnchorDay && ANCHOR.test(columns)) {
          return Promise.resolve(
            resolve({
              data: null,
              error: { code: '42703', message: `column ${table}.anchor_day does not exist` },
            }),
          );
        }
        const rows = (mockDb.rows[table] ?? []).map((row) => {
          if (ANCHOR.test(columns)) return row;
          const { anchor_day: _day, ...rest } = row;
          return rest;
        });
        return Promise.resolve(resolve({ data: rows, error: null }));
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  // Only the clock: the hook's effects and waitFor run on real timers.
  jest.useFakeTimers({
    now: new Date('2027-05-15T09:00:00'),
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'hrtime',
      'performance',
    ],
  });
  mockDb.rows = {
    bills: [
      // Rolled into April on the anchor day's clamp; due again on the 31st.
      { id: 'rent', next_due_on: '2027-04-30', recurrence: 'monthly', anchor_day: 31 },
      { id: 'gym', next_due_on: '2027-05-07', recurrence: 'weekly', anchor_day: 7 },
      { id: 'course', next_due_on: '2027-04-10', recurrence: 'period', anchor_day: 10 },
    ],
    subscriptions: [
      { id: 'stream', next_renewal_on: '2027-02-28', cycle: 'monthly', anchor_day: 30 },
      { id: 'insurance', next_renewal_on: '2027-04-30', cycle: 'quarterly', anchor_day: 31 },
    ],
  };
  mockDb.hasAnchorDay = true;
  mockDb.updates = [];
  client = new QueryClient();
  client.invalidateQueries = (() => Promise.resolve()) as typeof client.invalidateQueries;
});

afterEach(() => {
  jest.useRealTimers();
});

const written = () =>
  mockDb.updates
    .map((update) => `${update.table} ${String(update.id)} ${JSON.stringify(update.values)}`)
    .sort();

it('rolls a bill stored on 30 Apr with anchor 31 to 31 May, writing only the date', async () => {
  await renderHook(() => useKeepSchedulesCurrent(), { wrapper });
  await waitFor(() => expect(mockDb.updates).toHaveLength(5));
  expect(written()).toEqual([
    'bills course {"next_due_on":"2027-06-10"}',
    'bills gym {"next_due_on":"2027-05-21"}',
    'bills rent {"next_due_on":"2027-05-31"}',
    'subscriptions insurance {"next_renewal_on":"2027-07-31"}',
    'subscriptions stream {"next_renewal_on":"2027-05-30"}',
  ]);
});

it('on a database without the column, rolls from the stored day as before', async () => {
  mockDb.hasAnchorDay = false;
  await renderHook(() => useKeepSchedulesCurrent(), { wrapper });
  await waitFor(() => expect(mockDb.updates).toHaveLength(5));
  expect(written()).toEqual([
    'bills course {"next_due_on":"2027-06-10"}',
    'bills gym {"next_due_on":"2027-05-21"}',
    'bills rent {"next_due_on":"2027-05-30"}',
    'subscriptions insurance {"next_renewal_on":"2027-07-30"}',
    'subscriptions stream {"next_renewal_on":"2027-05-28"}',
  ]);
});

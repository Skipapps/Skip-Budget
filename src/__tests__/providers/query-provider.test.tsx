import * as Sentry from '@sentry/react-native';
import type { QueryClient } from '@tanstack/react-query';

import { createQueryClient } from '@/providers/query-provider';

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));

/**
 * A read that fails reaches Sentry in a release build, tagged as a read, with only the first part
 * of its key, and never often enough to flood the project.
 */

const USER = '4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';
const dev = (global as { __DEV__?: boolean }).__DEV__;

let client: QueryClient;

beforeEach(() => {
  (global as { __DEV__?: boolean }).__DEV__ = false;
  jest.mocked(Sentry.captureException).mockClear();
  client = createQueryClient();
});

afterEach(() => client.clear());

afterAll(() => {
  (global as { __DEV__?: boolean }).__DEV__ = dev;
});

/** Runs one read that fails with `thrown`. */
async function failRead(queryKey: unknown[], thrown: unknown) {
  await client
    .fetchQuery({
      queryKey,
      retry: false,
      queryFn: async () => {
        throw thrown;
      },
    })
    .catch(() => {});
}

const sent = () => jest.mocked(Sentry.captureException).mock.calls;

const refused = Object.assign(new Error('permission denied for table receipts'), {
  code: '42501',
  details: 'Failing row contains (Netflix, 15.49)',
  hint: 'Netflix',
});

describe('a failed read', () => {
  it('is sent once, tagged as a read, with only the first part of its key', async () => {
    await failRead(['receipts', USER, { month: '2026-10' }], refused);

    expect(sent()).toHaveLength(1);
    const [error, context] = sent()[0];
    expect((error as Error).message).toBe('permission denied for table receipts');
    expect(context).toEqual(
      expect.objectContaining({
        tags: { handled: 'query-read', query: 'receipts', code: '42501' },
      }),
    );
    const everything = JSON.stringify(sent()[0]);
    expect(everything).not.toContain(USER);
    expect(everything).not.toContain('2026-10');
    expect(everything).not.toContain('Netflix');
  });

  it('is not sent again when the same query fails again', async () => {
    await failRead(['receipts', USER], refused);
    await failRead(['receipts', USER], refused);
    await failRead(['receipts', USER], new TypeError('Network request failed'));
    expect(sent()).toHaveLength(1);
  });

  it('sends one cause a few times at most, however many screens it breaks', async () => {
    const offline = new TypeError('Network request failed');
    for (const key of ['bills', 'cards', 'charges', 'receipts', 'payments', 'loans']) {
      await failRead([key, USER], offline);
    }
    expect(sent()).toHaveLength(3);

    // A different cause still gets through.
    await failRead(['habits', USER], refused);
    expect(sent()).toHaveLength(4);
  });

  it('sends twenty at most in one run of the app', async () => {
    for (let index = 0; index < 30; index += 1) {
      await failRead([`table_${index}`, USER], new Error(`cause ${'x'.repeat(index + 1)}`));
    }
    expect(sent()).toHaveLength(20);
  });

  it('names a key that does not start with a plain name as "other"', async () => {
    await failRead([USER, 'receipts'], refused);
    expect(sent()[0][1]).toEqual(
      expect.objectContaining({ tags: expect.objectContaining({ query: 'other' }) }),
    );
  });

  it('is logged, not sent, in development', async () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await failRead(['receipts', USER], refused);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('[query-read]', 'receipts', refused);
    log.mockRestore();
  });

  it('starts counting afresh for a new client, which is a new run of the app', async () => {
    await failRead(['receipts', USER], refused);
    client.clear();
    client = createQueryClient();
    await failRead(['receipts', USER], refused);
    expect(sent()).toHaveLength(2);
  });
});

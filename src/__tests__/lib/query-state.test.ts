import { QueryClient, QueryObserver } from '@tanstack/react-query';

import { anyRefreshFailed, failedEmpty, refreshFailed } from '@/lib/query-state';

/**
 * The one rule for what a read's state means on screen. `isError` alone cannot tell a read with
 * nothing to show from a reload that failed behind good figures; `data` decides.
 */

const state = (isError: boolean, data?: unknown) => ({ isError, data });

describe('failedEmpty and refreshFailed', () => {
  it.each([
    ['still loading', state(false), false, false],
    ['answered', state(false, []), false, false],
    ['failed with nothing cached', state(true), true, false],
    ['failed to reload an empty list', state(true, []), false, true],
    ['failed to reload a list', state(true, [{ id: 'r1' }]), false, true],
    // null is an answer (a profile not found), not the absence of one.
    ['failed to reload a null answer', state(true, null), false, true],
    ['failed to reload a zero', state(true, 0), false, true],
  ])('%s', (_what, read, empty, refresh) => {
    expect(failedEmpty(read)).toBe(empty);
    expect(refreshFailed(read)).toBe(refresh);
  });

  it('passes a combined result’s own isError through, and never calls it a failed reload', () => {
    const combined = { isError: true, isLoading: false, refetch: () => {} };
    expect(failedEmpty(combined)).toBe(true);
    expect(refreshFailed(combined)).toBe(false);
  });
});

describe('anyRefreshFailed', () => {
  it('is false for no reads and for reads that all answered', () => {
    expect(anyRefreshFailed([])).toBe(false);
    expect(anyRefreshFailed([state(false, []), state(false, 1)])).toBe(false);
  });

  it('is true when one read among many failed to reload behind its data', () => {
    expect(anyRefreshFailed([state(false, []), state(true, [1]), state(false, 2)])).toBe(true);
  });

  it('is false when the only failure has nothing cached: that is the failure line’s', () => {
    expect(anyRefreshFailed([state(false, []), state(true)])).toBe(false);
  });
});

describe('against TanStack’s own result', () => {
  /** A real observer's result after a first read and a reload, each failing or not. */
  async function observed(first: 'ok' | 'fail', reload?: 'ok' | 'fail') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let answer: 'ok' | 'fail' = first;
    const observer = new QueryObserver(client, {
      queryKey: ['receipts'],
      queryFn: async () => {
        if (answer === 'fail') throw new Error('unreachable');
        return [{ id: 'r1' }];
      },
    });
    const stop = observer.subscribe(() => {});
    await observer.refetch();
    if (reload) {
      answer = reload;
      await observer.refetch();
    }
    const result = observer.getCurrentResult();
    stop();
    client.clear();
    return result;
  }

  it.each([
    ['a first read that failed', 'fail', undefined],
    ['a first read that answered', 'ok', undefined],
    ['a reload that failed behind data', 'ok', 'fail'],
    ['a reload that answered after a failure', 'fail', 'ok'],
    ['a reload that failed again with nothing cached', 'fail', 'fail'],
  ] as const)('agrees with isLoadingError and isRefetchError for %s', async (_what, a, b) => {
    const result = await observed(a, b);
    expect(failedEmpty(result)).toBe(result.isLoadingError);
    expect(refreshFailed(result)).toBe(result.isRefetchError);
  });

  it('calls a reload that failed behind data a failed refresh, not an empty failure', async () => {
    const result = await observed('ok', 'fail');
    expect(result.isError).toBe(true);
    expect(failedEmpty(result)).toBe(false);
    expect(refreshFailed(result)).toBe(true);
  });
});

import { settleWithin, withTimeout } from '@/lib/deadline';

/** A promise that is never resolved — the case these helpers exist for. */
const never = () => new Promise<never>(() => {});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('withTimeout', () => {
  it('passes work through when it answers in time', async () => {
    await expect(withTimeout(Promise.resolve('rows'), 1000, 'too slow')).resolves.toBe('rows');
  });

  it('fails work that never answers, rather than waiting forever', async () => {
    const settled = withTimeout(never(), 1000, 'Could not load bills.');
    jest.advanceTimersByTime(1000);
    await expect(settled).rejects.toThrow('Could not load bills.');
  });

  it('keeps the original failure when the work itself fails', async () => {
    const boom = Promise.reject(new Error('bad request'));
    await expect(withTimeout(boom, 1000, 'too slow')).rejects.toThrow('bad request');
  });

  it('leaves no timer running once the work has answered', async () => {
    await withTimeout(Promise.resolve(1), 1000, 'too slow');
    // A timer still pending here would keep the JS thread awake for its full
    // duration on every query the app makes.
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('settleWithin', () => {
  it('returns as soon as the work is done', async () => {
    await expect(settleWithin(Promise.resolve('done'), 1000)).resolves.toBeUndefined();
  });

  it('gives up quietly on work that never answers', async () => {
    const settled = settleWithin(never(), 1000);
    jest.advanceTimersByTime(1000);
    // Resolves rather than rejects: the spinner stops, nothing is reported as
    // broken, and any late answer still reaches the cache on its own.
    await expect(settled).resolves.toBeUndefined();
  });

  it('stops waiting without throwing when the work fails', async () => {
    // The read's own query reports the failure; the gesture must not also
    // reject, or it surfaces as an unhandled rejection with nothing to do.
    await expect(settleWithin(Promise.reject(new Error('offline')), 1000)).resolves.toBeUndefined();
  });

  it('leaves no timer running once the work has answered', async () => {
    await settleWithin(Promise.resolve(1), 1000);
    expect(jest.getTimerCount()).toBe(0);
  });
});

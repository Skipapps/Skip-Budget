import * as Sentry from '@sentry/react-native';

import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

describe('failureMessage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['a dropped connection', new TypeError('Network request failed')],
    ['a Postgres rule', new Error('A payment needs two different people.')],
    ['an auth refusal', { message: 'Invalid login credentials' }],
    ['a bare string', 'fetch failed'],
    ['nothing at all', undefined],
  ])('says the one line for %s', (_, thrown) => {
    expect(failureMessage(thrown)).toBe('Something went wrong. Please try again.');
  });

  it('keeps the real cause in the development log', () => {
    const thrown = new Error('duplicate key value violates unique constraint');
    failureMessage(thrown);
    expect(console.log).toHaveBeenCalledWith('[failure]', thrown);
  });

  it('is the constant the error screens use', () => {
    expect(failureMessage()).toBe(FAILURE_MESSAGE);
  });
});

describe('in a release build', () => {
  const dev = (global as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    jest.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it('reports the real error to Sentry', () => {
    const thrown = new Error('duplicate key value violates unique constraint');
    expect(failureMessage(thrown)).toBe(FAILURE_MESSAGE);
    expect(Sentry.captureException).toHaveBeenCalledWith(thrown, {
      tags: { handled: 'failure-message' },
    });
  });

  it('turns a Supabase error object into an Error Sentry can group', () => {
    failureMessage({ message: 'permission denied for table bills', code: '42501' });
    const [sent] = jest.mocked(Sentry.captureException).mock.calls[0];
    expect(sent).toBeInstanceOf(Error);
    expect((sent as Error).message).toBe('permission denied for table bills');
  });

  it('reports nothing when nothing was thrown', () => {
    failureMessage();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

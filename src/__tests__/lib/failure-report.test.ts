import * as Sentry from '@sentry/react-native';

import { failureFingerprint, failureMessage, reportFailure } from '@/lib/failure';

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

/**
 * What a caught error tells Sentry. One issue per cause, told apart by the database's code and the
 * message, and nothing from the person's own budget: a Supabase error's `details` and `hint` can
 * repeat what they typed, so neither ever leaves the phone.
 */

/** A Supabase error as supabase-js builds one: an Error with the server's fields on it. */
function supabaseError(fields: { message: string; code: string; details: string; hint: string }) {
  return Object.assign(new Error(fields.message), fields);
}

const DUPLICATE = supabaseError({
  message: 'duplicate key value violates unique constraint "subscriptions_user_name_key"',
  code: '23505',
  details: 'Key (user_id, name)=(4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f, Netflix) already exists.',
  hint: 'Netflix is already on your list',
});

const dev = (global as { __DEV__?: boolean }).__DEV__;

beforeEach(() => {
  (global as { __DEV__?: boolean }).__DEV__ = false;
  jest.mocked(Sentry.captureException).mockClear();
});

afterAll(() => {
  (global as { __DEV__?: boolean }).__DEV__ = dev;
});

function lastReport() {
  const calls = jest.mocked(Sentry.captureException).mock.calls;
  const [error, context] = calls[calls.length - 1];
  return { error: error as Error, context: context as Record<string, unknown> };
}

describe('a database refusal', () => {
  it('sends its code, and groups by code and message', () => {
    failureMessage(DUPLICATE);
    const { error, context } = lastReport();

    expect(error.message).toBe(DUPLICATE.message);
    expect(context).toEqual({
      tags: { handled: 'failure-message', code: '23505' },
      extra: { code: '23505' },
      fingerprint: [
        'failure-message',
        '23505',
        'duplicate key value violates unique constraint "subscriptions_user_name_key"',
      ],
    });
  });

  it('never sends its details or hint, from a supabase-js Error or a plain object', () => {
    for (const thrown of [DUPLICATE, { ...DUPLICATE, message: DUPLICATE.message }]) {
      jest.mocked(Sentry.captureException).mockClear();
      failureMessage(thrown);
      const { error, context } = lastReport();

      expect(error).not.toHaveProperty('details');
      expect(error).not.toHaveProperty('hint');
      const everything = JSON.stringify([error, error.stack, context]);
      expect(everything).not.toContain('Netflix');
      expect(everything).not.toContain('already on your list');
      expect(everything).not.toContain('4f1c2b8e');
    }
  });
});

describe('the message Sentry is sent', () => {
  it.each([
    [
      'a supabase-js Error',
      Object.assign(new Error('invalid input syntax for type uuid: "abc"'), { code: '22P02' }),
    ],
    [
      'a plain error object',
      { message: 'invalid input syntax for type uuid: "abc"', code: '22P02' },
    ],
  ])('blanks a quoted value, from %s', (_, thrown) => {
    failureMessage(thrown);
    const { error, context } = lastReport();

    expect(error.message).toBe('invalid input syntax for type uuid: "<value>"');
    expect(JSON.stringify([error.message, error.stack, context])).not.toContain('abc');
  });

  it('blanks the values of a key group and keeps its column names', () => {
    failureMessage(
      new Error(
        'Key (user_id, name)=(4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f, Netflix) already exists.',
      ),
    );
    const { error } = lastReport();
    expect(error.message).toBe('Key (user_id, name)=(<value>) already exists.');
    expect(error.stack).not.toContain('Netflix');
  });

  it("keeps the quoted names of the database's own rules, which say what refused", () => {
    failureMessage(
      new Error('new row for relation "bills" violates check constraint "bills_amount_check"'),
    );
    expect(lastReport().error.message).toBe(
      'new row for relation "bills" violates check constraint "bills_amount_check"',
    );
  });

  it('blanks quoted text a rule of our own raised, ids and figures', () => {
    failureMessage({
      message: 'Card "Hh" cannot pay 15.49 on 4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      code: 'P0001',
    });
    expect(lastReport().error.message).toBe('Card "<value>" cannot pay <n> on <id>');
  });

  it('cannot put the raw message back through a $& in the scrubbed one', () => {
    const thrown = new Error('Card "Hh" was charged $& again');
    failureMessage(thrown);
    const { error } = lastReport();
    expect(error.message).toBe('Card "<value>" was charged $& again');
    expect(error.stack).toContain('Card "<value>" was charged $& again');
    expect(error.stack).not.toContain('Hh');
  });

  it('still says the one line on screen', () => {
    expect(failureMessage(new Error('invalid input syntax for type uuid: "abc"'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

describe('telling causes apart', () => {
  it('keeps two refusals with the same code but different words in different issues', () => {
    const habit = { message: 'Tracking spending habits is part of Skip Pro.', code: 'P0001' };
    const free = { message: 'Free keeps one — Skip Pro removes the limit.', code: 'P0001' };
    expect(failureFingerprint(habit, 'failure-message')).not.toEqual(
      failureFingerprint(free, 'failure-message'),
    );
  });

  it('groups one cause as one issue whatever ids or figures it names', () => {
    const a = new Error('Receipt 4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f is over 12 days old');
    const b = new Error('Receipt 0a1b2c3d-1d2a-4c3b-9e8f-4f1c2b8e4e5f is over 30 days old');
    expect(failureFingerprint(a, 'failure-message')).toEqual(
      failureFingerprint(b, 'failure-message'),
    );
  });

  it('falls back to the error kind when there is no code', () => {
    expect(failureFingerprint(new TypeError('Network request failed'), 'query-read')).toEqual([
      'query-read',
      'TypeError',
      'Network request failed',
    ]);
  });

  it('adds the tags it is given, for other reporters', () => {
    reportFailure(DUPLICATE, 'query-read', { query: 'subscriptions' });
    expect(lastReport().context.tags).toEqual({
      handled: 'query-read',
      query: 'subscriptions',
      code: '23505',
    });
  });
});

describe('what stays the same', () => {
  it('still says the one line, and logs the real cause in development only', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(failureMessage(DUPLICATE)).toBe('Something went wrong. Please try again.');
    expect(log).not.toHaveBeenCalled();

    (global as { __DEV__?: boolean }).__DEV__ = true;
    jest.mocked(Sentry.captureException).mockClear();
    expect(failureMessage(DUPLICATE)).toBe('Something went wrong. Please try again.');
    expect(log).toHaveBeenCalledWith('[failure]', DUPLICATE);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

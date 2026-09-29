import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';

/**
 * However a request fails, the screen says the same line. A dropped
 * connection, a Postgres rule and a Supabase auth refusal used to arrive in
 * their own words; none of them does any more.
 */
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

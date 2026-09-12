import { NETWORK_MESSAGE, isNetworkError, saveErrorMessage } from '@/lib/save-error';

// Copied rather than imported: `@/api/mutations` pulls in the Supabase client,
// and this helper is meant to be testable without one. If either sentence is
// ever reworded these stay valid — what is under test is that a message
// written for a person survives untouched, whatever it says.
const NOTHING_UPDATED =
  'That is no longer there — it may have been deleted on another device. Open the list again.';
const NOTHING_SAVED = 'Skip could not save that. Close this and open it again.';

describe('saveErrorMessage — a dropped connection', () => {
  it('replaces the exact string a user saw when the network went down mid-save', () => {
    const thrown = new Error(
      'Error: fetch failed: UnexpectedException: The network connection was lost.',
    );

    expect(saveErrorMessage(thrown, 'Could not save that bill.')).toBe(NETWORK_MESSAGE);
  });

  it.each([
    'Network request failed',
    'fetch failed',
    'Failed to fetch',
    'The Internet connection appears to be offline.',
    'The request timed out.',
    'Could not load your charges. Check your connection and try again.',
  ])('maps %s', (message) => {
    expect(saveErrorMessage(new Error(message), 'fallback')).toBe(NETWORK_MESSAGE);
  });

  it('maps the TypeError fetch itself throws, whatever it says', () => {
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true);
    expect(saveErrorMessage(new TypeError('Load failed'), 'fallback')).toBe(NETWORK_MESSAGE);
  });

  it('reads a thrown string and a plain object the same way', () => {
    expect(saveErrorMessage('fetch failed', 'fallback')).toBe(NETWORK_MESSAGE);
    expect(saveErrorMessage({ message: 'Network request failed' }, 'fallback')).toBe(
      NETWORK_MESSAGE,
    );
  });
});

describe('saveErrorMessage — everything written for a person', () => {
  // The two the API raises on purpose. Both name a cause and an action, and
  // neither has anything to do with the connection, so both go through whole.
  it.each([NOTHING_UPDATED, NOTHING_SAVED])('leaves %s alone', (message) => {
    expect(saveErrorMessage(new Error(message), 'fallback')).toBe(message);
  });

  it.each([
    'Give the bill a name.',
    'Enter how much it costs.',
    'The end date cannot be before the start date.',
    'Pick the first due date.',
    'That name is already taken.',
  ])('leaves the validation line %s alone', (message) => {
    expect(saveErrorMessage(new Error(message), 'fallback')).toBe(message);
  });

  it('falls back only when nothing was said', () => {
    expect(saveErrorMessage(new Error(''), 'Could not save that bill.')).toBe(
      'Could not save that bill.',
    );
    expect(saveErrorMessage(undefined, 'Could not save that bill.')).toBe(
      'Could not save that bill.',
    );
    expect(saveErrorMessage({ code: 23505 }, 'Could not save that bill.')).toBe(
      'Could not save that bill.',
    );
  });

  it('does not mistake a word inside a longer one for the network', () => {
    // "Networking" would match a naive substring test, but no message in the
    // app says it — what must not match is the ordinary vocabulary of a form.
    expect(isNetworkError(new Error('Pick a card or account.'))).toBe(false);
    expect(isNetworkError(new Error('Give the group a name.'))).toBe(false);
  });
});

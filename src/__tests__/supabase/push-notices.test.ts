import fs from 'node:fs';
import path from 'node:path';

import { noticeRecipients } from '../../../supabase/functions/send-push/notices';

/**
 * "Payment went out" notices go only to accounts that have not turned Payment notices off, and to
 * nobody when the switch cannot be read: someone who turned them off must never get one.
 */

const read = (rows: { id: string }[] | null, error: { message: string } | null = null) =>
  jest.fn(async (_ids: string[]) => ({ data: rows, error }));

describe('noticeRecipients', () => {
  it('leaves out the accounts that turned payment notices off', async () => {
    const readQuiet = read([{ id: 'user-b' }]);

    const { allowed, error } = await noticeRecipients(['user-a', 'user-b', 'user-c'], readQuiet);

    expect([...allowed].sort()).toEqual(['user-a', 'user-c']);
    expect(error).toBeNull();
    expect(readQuiet).toHaveBeenCalledWith(['user-a', 'user-b', 'user-c']);
  });

  it('tells nobody when the switch cannot be read', async () => {
    const { allowed, error } = await noticeRecipients(
      ['user-a'],
      read(null, { message: 'column "payment_notices" does not exist' }),
    );

    expect(allowed.size).toBe(0);
    expect(error).toBe('column "payment_notices" does not exist');
  });

  it('reads nothing when no payment went out', async () => {
    const readQuiet = read([]);

    const { allowed } = await noticeRecipients([], readQuiet);

    expect(allowed.size).toBe(0);
    expect(readQuiet).not.toHaveBeenCalled();
  });
});

describe('the function itself (Deno, so read as source)', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../../supabase/functions/send-push/index.ts'),
    'utf8',
  );

  it('asks the profiles which accounts turned payment notices off', () => {
    expect(source).toContain(
      "supabase.from('profiles').select('id').in('id', ids).eq('payment_notices', false)",
    );
  });

  it('skips an account left out before reading its phones', () => {
    const loop = source.slice(source.indexOf('for (const [chargeUser, theirs] of byUser)'));
    const skip = loop.indexOf('if (!recipients.allowed.has(chargeUser)) continue;');
    expect(skip).toBeGreaterThan(-1);
    expect(skip).toBeLessThan(loop.indexOf('tokensFor(supabase, chargeUser)'));
  });
});

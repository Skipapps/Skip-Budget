import fs from 'node:fs';
import path from 'node:path';

/**
 * The next-due floor is held to one table of cases: the app's hint and walk read it in
 * src/__tests__/payments/next-due-hint.test.ts, and supabase/checks/next_due_floor.sql puts every
 * row through the database's triggers. That only proves they agree while both read the same text,
 * so a change to either copy fails here until the other is changed to match.
 */

const ROOT = path.join(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** The text between the first `start` and the next `end` after it. */
function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  if (from < 0) throw new Error(`No ${start}`);
  const to = text.indexOf(end, from + start.length);
  if (to < 0) throw new Error(`No ${end} after ${start}`);
  return text.slice(from + start.length, to);
}

describe('the next-due floor table', () => {
  const app = between(
    read('src/__tests__/payments/next-due-hint.test.ts'),
    'export const NEXT_DUE_FLOOR_TABLE = `',
    '`;',
  );
  const server = between(read('supabase/checks/next_due_floor.sql'), '$nextdue$', '$nextdue$');

  it('is the same text, character for character, in the app test and the SQL check', () => {
    expect(server).toBe(app);
  });

  it('is read as plain text in both: nothing a template literal or dollar quote would change', () => {
    expect(app).not.toMatch(/[`\\]|\$\{|\$nextdue\$/);
  });

  it('is the table of real rows, not an empty match', () => {
    const rows = app
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
    expect(rows).toHaveLength(33);
  });
});

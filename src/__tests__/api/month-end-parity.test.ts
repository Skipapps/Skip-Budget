import fs from 'node:fs';
import path from 'node:path';

/**
 * The phone's walk and the server's are held to one table of dates: the jest fixture checks
 * occurrencesInRange against it, supabase/checks/month_end_anchor.sql checks public.plan_occurrences.
 * That only proves parity while both read the same text, so a change to either copy fails here
 * until the other is changed to match.
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

describe('the month-end date table', () => {
  const phone = between(
    read('src/__tests__/month-end/fixtures.ts'),
    'export const DATE_TABLE = `',
    '`;',
  );
  const server = between(read('supabase/checks/month_end_anchor.sql'), '$table$', '$table$');

  it('is the same text, character for character, in the jest fixture and the SQL check', () => {
    expect(server).toBe(phone);
  });

  it('is read as plain text in both: nothing a template literal or dollar quote would change', () => {
    expect(phone).not.toMatch(/[`\\]|\$\{|\$table\$/);
  });

  it('is the table of real rows, not an empty match', () => {
    const rows = phone
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
    expect(rows).toHaveLength(45);
  });
});

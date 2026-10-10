import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The bill categories the migrations leave: Health & Medical and Education added, every Family &
 * Healthcare bill moved to Health & Medical, and no category row ever deleted, so an older build
 * that still offers Family & Healthcare or files a loan under Loans & Credit can always save.
 */

const DIR = join(__dirname, '../../../supabase/migrations');
const FILES = readdirSync(DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const sql = (name: string) =>
  readFileSync(join(DIR, name), 'utf8')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
const ALL = FILES.map(sql).join('\n');
const MOVE = sql('20261009100009_bill_categories_health_education.sql');

describe('bill categories in the migrations', () => {
  it('adds Health & Medical and Education, safely on a re-run', () => {
    expect(MOVE).toMatch(
      /insert into public\.bill_categories[^;]*'health'[^;]*'education'[^;]*on conflict \(id\) do update/is,
    );
  });

  it('moves every Family & Healthcare bill to Health & Medical', () => {
    expect(MOVE).toMatch(
      /update public\.bills set category_id = 'health' where category_id = 'family'/i,
    );
  });

  it('never deletes a category row, so Family & Healthcare and Loans & Credit stay valid', () => {
    expect(ALL).not.toMatch(/delete\s+from\s+public\.bill_categories/i);
    expect(ALL).not.toMatch(/truncate[^;]*bill_categories/i);
    for (const id of ['family', 'loans']) {
      expect(ALL).toMatch(
        new RegExp(String.raw`insert into public\.bill_categories[^;]*'${id}'`, 'is'),
      );
    }
  });
});

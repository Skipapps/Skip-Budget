import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What the migrations leave for loans, read from the files in the order the CLI applies them:
 * save_loan's live signature (and that its grants name that signature, or a dropped function's
 * grants are lost), the changed-payments column and its check, and the rate's precision.
 */

const DIR = join(__dirname, '../../../supabase/migrations');
const files = readdirSync(DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();

/** Comments out, so a sentence that names a function is not read as creating one. */
const sql = (name: string) =>
  readFileSync(join(DIR, name), 'utf8')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');

/** Parameter types of a `name type [default …]` list, lower-cased. */
function parameterTypes(list: string): string[] {
  return list
    .split(',')
    .map((part) => part.trim().split(/\s+/)[1]?.toLowerCase())
    .filter((type): type is string => Boolean(type));
}

/** The last `create [or replace] function public.save_loan(…)` across every migration. */
function liveSaveLoan(): { file: string; parameters: string; types: string[] } {
  let live: { file: string; parameters: string; types: string[] } | null = null;
  for (const file of files) {
    const text = sql(file);
    for (const match of text.matchAll(
      /create (?:or replace )?function public\.save_loan\(([\s\S]*?)\)\s*returns/gi,
    )) {
      live = { file, parameters: match[1], types: parameterTypes(match[1]) };
    }
  }
  if (!live) throw new Error('save_loan is never created');
  return live;
}

describe('save_loan after every migration', () => {
  const live = liveSaveLoan();

  it('takes the changed payments and the last payment’s date', () => {
    expect(live.file).toBe('20261009100007_loan_overrides.sql');
    expect(live.types).toEqual([
      'text',
      'text',
      'numeric',
      'numeric',
      'integer',
      'numeric',
      'numeric',
      'date',
      'public.bill_recurrence',
      'uuid',
      'uuid',
      'date',
      'text',
      'date',
      'numeric',
      'jsonb',
      'date',
    ]);
  });

  it('still answers a call from an app that sends neither new parameter', () => {
    const lines = live.parameters.split(',').map((line) => line.trim());
    expect(lines.slice(-2).every((line) => /default null$/i.test(line))).toBe(true);
  });

  it('is granted to signed-in callers and kept from anon, by its own signature', () => {
    const text = sql(live.file).replace(/\s+/g, ' ');
    const signature = live.types.join(', ');
    expect(text).toContain(
      `revoke all on function public.save_loan( ${signature} ) from public, anon;`,
    );
    expect(text).toContain(
      `grant execute on function public.save_loan( ${signature} ) to authenticated;`,
    );
  });

  it('drops the signature it replaces, so no call matches two', () => {
    const text = sql(live.file).replace(/\s+/g, ' ');
    expect(text).toContain(
      'drop function if exists public.save_loan( text, text, numeric, numeric, integer, numeric, numeric, date, public.bill_recurrence, uuid, uuid, date, text, date, numeric );',
    );
  });
});

describe('the loans table after every migration', () => {
  const all = files.map(sql).join('\n');

  it('has a checked jsonb column for changed payments', () => {
    expect(all).toMatch(/add column if not exists payment_overrides jsonb/i);
    expect(all).toMatch(
      /check \(public\.loan_payment_overrides_valid\(payment_overrides, term_months\)\)/i,
    );
  });

  it('lets the people who save a loan run its check, and nobody else', () => {
    // A CHECK runs its function with the inserting role's EXECUTE right; save_loan inserts as the
    // caller, and new public functions are not granted by default.
    const text = all.replace(/\s+/g, ' ');
    expect(text).toContain(
      'grant execute on function public.loan_payment_overrides_valid(jsonb, integer) to authenticated, service_role;',
    );
    expect(text).toContain(
      'revoke all on function public.loan_payment_overrides_valid(jsonb, integer) from public, anon;',
    );
    const created = text.indexOf('function public.loan_payment_overrides_valid(');
    const granted = text.indexOf('grant execute on function public.loan_payment_overrides_valid(');
    const checked = text.indexOf('check (public.loan_payment_overrides_valid(');
    expect(created).toBeLessThan(granted);
    expect(granted).toBeLessThan(checked);
  });

  it('checks keys with the same rule the app’s tests mirror', () => {
    // loan-overrides.test.ts's databaseAccepts uses this pattern; keep the two in step.
    expect(all).toContain("change.number !~ '^[1-9][0-9]{0,4}$'");
    expect(all).toContain('change.number::integer >= p_term_months');
    expect(all).toContain('change.amount::numeric <> round(change.amount::numeric, 2)');
  });

  it('keeps the rate to nine decimals, the precision the engine posts exactly', () => {
    const changes = [...all.matchAll(/annual_rate\s+(?:type\s+)?numeric\((\d+),(\d+)\)/gi)];
    const last = changes[changes.length - 1];
    expect(last?.slice(1)).toEqual(['12', '9']);
  });
});

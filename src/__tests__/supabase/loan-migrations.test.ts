import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What the migrations leave for loans, read from the files in the order the CLI applies them:
 * save_loan's live signature (and that its grants name that signature, or a dropped function's
 * grants are lost), the changed-payments column and its check, the rate's precision, the payment
 * day, the "counts toward spending" flag in the recorder and the reminders, and update_loan.
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

/** The last `create [or replace] function public.<name>(…)` across every migration. */
function liveSignature(name: string): { file: string; parameters: string; types: string[] } {
  let live: { file: string; parameters: string; types: string[] } | null = null;
  const opening = new RegExp(
    `create (?:or replace )?function public\\.${name}\\(([\\s\\S]*?)\\)\\s*returns`,
    'gi',
  );
  for (const file of files) {
    const text = sql(file);
    for (const match of text.matchAll(opening)) {
      live = { file, parameters: match[1], types: parameterTypes(match[1]) };
    }
  }
  if (!live) throw new Error(`${name} is never created`);
  return live;
}

const liveSaveLoan = () => liveSignature('save_loan');

/** The body of the last `create [or replace] function public.<name>(` across every migration. */
function liveFunction(name: string): { file: string; body: string } {
  let live: { file: string; body: string } | null = null;
  const opening = new RegExp(`create (?:or replace )?function public\\.${name}\\(`, 'gi');
  for (const file of files) {
    const text = sql(file);
    for (const match of text.matchAll(opening)) {
      const start = match.index ?? 0;
      const open = text.indexOf('$$', start);
      const close = text.indexOf('$$', open + 2);
      live = { file, body: text.slice(start, close + 2) };
    }
  }
  if (!live) throw new Error(`${name} is never created`);
  return live;
}

describe('save_loan after every migration', () => {
  const live = liveSaveLoan();

  it('takes the add flow’s switch, payment day and count floor after every earlier parameter', () => {
    expect(live.file).toBe('20261012100001_loan_add_flow.sql');
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
      'boolean',
      // Not smallint like its column: Postgres does not cast an integer argument down when it
      // picks the function, so `p_payment_day => 31` would find no save_loan.
      'integer',
      'date',
    ]);
  });

  it('still answers a call from an app that sends none of the newer parameters', () => {
    const lines = live.parameters.split(',').map((line) => line.trim());
    expect(lines.slice(-5)).toEqual([
      expect.stringMatching(/^p_payment_overrides\s+jsonb\s+default null$/i),
      expect.stringMatching(/^p_last_payment_on\s+date\s+default null$/i),
      expect.stringMatching(/^p_in_spending\s+boolean\s+default true$/i),
      expect.stringMatching(/^p_payment_day\s+integer\s+default null$/i),
      expect.stringMatching(/^p_counts_from\s+date\s+default null$/i),
    ]);
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
      'drop function if exists public.save_loan( text, text, numeric, numeric, integer, numeric, numeric, date, public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date );',
    );
  });

  it('saves the switch and the payment day, and counts from the floor it is given', () => {
    const body = liveFunction('save_loan').body.replace(/\s+/g, ' ');
    expect(body).toContain('coalesce(p_in_spending, true)');
    expect(body).toContain('payment_overrides, payment_day )');
    expect(body).toContain(
      'v_starts_on := greatest(p_first_payment_on, coalesce(p_counts_from, p_first_payment_on));',
    );
  });

  it('ends the term on the payment day, clamped to its month, not first + (term - 1) months', () => {
    const body = liveFunction('save_loan').body.replace(/\s+/g, ' ');
    expect(body).toContain(
      'v_day := coalesce(p_payment_day, extract(day from p_first_payment_on)::integer);',
    );
    expect(body).not.toContain('p_first_payment_on + make_interval(months => p_term_months - 1)');
  });
});

describe('the bills and the scheduler after every migration', () => {
  const all = files.map(sql).join('\n');

  it('has a flag on every bill that counts unless saved otherwise', () => {
    expect(all).toMatch(/add column if not exists in_spending boolean not null default true/i);
  });

  it('records nothing new for a bill kept out of spending, on the server as in the app', () => {
    const live = liveFunction('record_due_charges');
    expect(live.file).toBe('20261012100001_loan_add_flow.sql');
    expect(live.body.replace(/\s+/g, ' ')).toContain(
      'where b.next_due_on is not null and b.in_spending',
    );
  });

  it('stops reminding about a bill once its date has rolled past its end', () => {
    const live = liveFunction('reminders_due');
    expect(live.file).toBe('20261012100001_loan_add_flow.sql');
    expect(live.body.replace(/\s+/g, ' ')).toContain(
      'when r.bill_id is not null then case when b.next_due_on > b.ends_on then null else b.next_due_on end',
    );
  });

  it('keeps both for the scheduler alone', () => {
    const text = sql('20261012100001_loan_add_flow.sql').replace(/\s+/g, ' ');
    expect(text).toContain(
      'revoke all on function public.record_due_charges() from public, anon, authenticated;',
    );
    expect(text).toContain(
      'revoke all on function public.reminders_due() from public, anon, authenticated;',
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

  it('has a payment day of 1 to 31, or none', () => {
    expect(all).toMatch(
      /add column if not exists payment_day smallint check \(payment_day between 1 and 31\)/i,
    );
  });

  it('keeps the rate to nine decimals, the precision the engine posts exactly', () => {
    const changes = [...all.matchAll(/annual_rate\s+(?:type\s+)?numeric\((\d+),(\d+)\)/gi)];
    const last = changes[changes.length - 1];
    expect(last?.slice(1)).toEqual(['12', '9']);
  });
});

describe('update_loan after every migration', () => {
  const live = liveSignature('update_loan');
  const body = () => liveFunction('update_loan').body.replace(/\s+/g, ' ');

  it('takes the bill it edits and the whole contract, the optional four last', () => {
    expect(live.file).toBe('20261012100002_update_loan.sql');
    expect(live.types).toEqual([
      'uuid',
      'text',
      'text',
      'numeric',
      'numeric',
      'integer',
      'numeric',
      'numeric',
      'date',
      'date',
      'text',
      'uuid',
      'uuid',
      'boolean',
      // Not smallint, for the reason save_loan's is not.
      'integer',
      'jsonb',
      'date',
      'date',
    ]);
    const lines = live.parameters.split(',').map((line) => line.trim());
    expect(lines.slice(-4)).toEqual([
      expect.stringMatching(/^p_payment_day\s+integer\s+default null$/i),
      expect.stringMatching(/^p_payment_overrides\s+jsonb\s+default null$/i),
      expect.stringMatching(/^p_last_payment_on\s+date\s+default null$/i),
      expect.stringMatching(/^p_today\s+date\s+default null$/i),
    ]);
  });

  it('is granted to signed-in callers and kept from anon, by its own signature', () => {
    const text = sql(live.file).replace(/\s+/g, ' ');
    const signature = live.types.join(', ');
    expect(text).toContain(
      `revoke all on function public.update_loan( ${signature} ) from public, anon;`,
    );
    expect(text).toContain(
      `grant execute on function public.update_loan( ${signature} ) to authenticated;`,
    );
  });

  it('runs as the caller, so row security keeps each person to their own loans', () => {
    expect(body()).toContain('security invoker set search_path = public');
    expect(body()).not.toContain('security definer');
    expect(body()).toContain(
      "select * into v_bill from public.bills where id = p_bill_id for update; if not found then raise exception 'there is no such loan' using errcode = 'P0002';",
    );
  });

  it('counts from the day the loan was added, a floor set since, after the last charge, or from a switch back on', () => {
    expect(body()).toContain(
      "v_floor := greatest( (v_bill.created_at at time zone v_tz)::date, case when v_bill.starts_on > v_was_first then v_bill.starts_on end, (date_trunc('month', v_last_charged) + interval '1 month')::date, case when v_in_spending and not v_bill.in_spending then v_today end );",
    );
    expect(body()).toContain('v_starts_on := greatest(p_first_payment_on, v_floor);');
  });

  it('refuses what save_loan refuses, in its words', () => {
    expect(body()).toContain("raise exception 'a loan needs at least one payment'");
    expect(body()).toContain("raise exception 'the payment day must be between 1 and 31'");
    expect(body()).toContain("raise exception 'the last payment must fall within the term'");
  });

  it('leaves save_loan as migration A made it', () => {
    expect(liveSaveLoan().file).toBe('20261012100001_loan_add_flow.sql');
    expect(sql('20261012100002_update_loan.sql')).not.toMatch(/function public\.save_loan/i);
  });
});

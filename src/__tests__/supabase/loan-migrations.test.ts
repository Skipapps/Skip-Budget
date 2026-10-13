import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What the migrations leave for loans, read from the files in the order the CLI applies them:
 * save_loan's live signature (and that its grants name that signature, or a dropped function's
 * grants are lost), the changed-payments column and its check, the rate's precision, the payment
 * day, the "counts toward spending" flag in the recorder and the reminders, update_loan, loan
 * payoffs, and the loan edit that rewrites the payments already recorded.
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
    // Recreated by the month-end migration, with the same signature.
    expect(live.file).toBe('20261013300001_month_end_anchor.sql');
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
    // The add flow made this signature; the month-end migration only replaces its body.
    const text = sql('20261012100001_loan_add_flow.sql').replace(/\s+/g, ' ');
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

  it('changes in the month-end migration only by storing the payment day as the bill’s anchor', () => {
    const before = functionIn('20261012100001_loan_add_flow.sql', 'save_loan');
    const after = functionIn('20261013300001_month_end_anchor.sql', 'save_loan');
    expect(after).toContain('card_id, bank_account_id, anchor_day, in_spending )');
    expect(after).toContain('p_card_id, p_bank_account_id, v_day, coalesce(p_in_spending, true) )');
    expect(
      after
        .replace(
          'card_id, bank_account_id, anchor_day, in_spending',
          'card_id, bank_account_id, in_spending',
        )
        .replace('p_bank_account_id, v_day, coalesce(', 'p_bank_account_id, coalesce('),
    ).toBe(before);
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
    expect(live.file).toBe('20261013300001_month_end_anchor.sql');
    expect(live.body.replace(/\s+/g, ' ')).toContain(
      'where b.next_due_on is not null and b.in_spending',
    );
  });

  it('records from each plan’s anchor day, and changes nothing else in the recorder', () => {
    const before = functionIn('20261012100001_loan_add_flow.sql', 'record_due_charges');
    const after = functionIn('20261013300001_month_end_anchor.sql', 'record_due_charges');
    expect(
      after
        .replace('b.next_due_on as anchor, b.anchor_day,', 'b.next_due_on as anchor,')
        .replace('s.next_renewal_on, s.anchor_day,', 's.next_renewal_on,')
        .replace(', p.anchor_day ) o(d)', ' ) o(d)'),
    ).toBe(before);
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
    // Recreated by the payoffs migration, then the month-end one, with the same signature.
    expect(live.file).toBe('20261013300001_month_end_anchor.sql');
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

  it('changes in the month-end migration only by keeping the bill’s anchor on the payment day', () => {
    const before = functionIn('20261012100003_loan_payoffs.sql', 'update_loan');
    const after = functionIn('20261013300001_month_end_anchor.sql', 'update_loan');
    expect(after).toContain('ends_on = v_ends_on, anchor_day = v_day, card_id = p_card_id,');
    expect(after.replace(' anchor_day = v_day,', '')).toBe(before);
  });

  it('leaves save_loan to the migrations that make it', () => {
    expect(liveSaveLoan().file).toBe('20261013300001_month_end_anchor.sql');
    expect(sql('20261012100002_update_loan.sql')).not.toMatch(/function public\.save_loan/i);
  });
});

/** A function's text in one file, comments out, whitespace as single spaces. */
function functionIn(file: string, name: string): string {
  const text = sql(file);
  const start = text.search(new RegExp(`create (?:or replace )?function public\\.${name}\\(`, 'i'));
  if (start < 0) throw new Error(`${name} is not in ${file}`);
  const open = text.indexOf('$$', start);
  return text.slice(start, text.indexOf('$$', open + 2) + 2).replace(/\s+/g, ' ');
}

describe('loan payoffs after every migration', () => {
  const FILE = '20261012100003_loan_payoffs.sql';
  const text = () => sql(FILE).replace(/\s+/g, ' ');

  it('keeps payoffs in their own table, each person to their own rows, gone with their loan', () => {
    expect(text()).toContain('create table if not exists public.loan_payoffs (');
    expect(text()).toContain(
      'bill_id uuid not null references public.loans (bill_id) on delete cascade',
    );
    expect(text()).toContain('amount numeric(14,2) not null check (amount > 0)');
    expect(text()).toContain("kind text not null check (kind in ('full', 'partial'))");
    expect(text()).toContain('alter table public.loan_payoffs enable row level security;');
    expect(text()).toContain(
      'create policy "loan_payoffs_all_own" on public.loan_payoffs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
    );
    expect(text()).toContain(
      "create unique index if not exists loan_payoffs_one_full on public.loan_payoffs (bill_id) where kind = 'full';",
    );
    expect(text()).toContain('alter publication supabase_realtime add table public.loan_payoffs;');
  });

  it.each([
    ['record_loan_payoff', ['uuid', 'date', 'numeric', 'text', 'uuid', 'uuid', 'date', 'date']],
    ['delete_loan_payoff', ['uuid', 'date']],
  ])('%s runs as the caller, for signed-in callers only, by its own signature', (name, types) => {
    const live = liveSignature(name);
    expect(live.file).toBe(FILE);
    expect(live.types).toEqual(types);
    expect(functionIn(FILE, name)).toContain('security invoker set search_path = public');
    expect(functionIn(FILE, name)).not.toContain('security definer');
    const signature = types.join(', ');
    expect(text()).toContain(
      `revoke all on function public.${name}(${signature}) from public, anon;`,
    );
    expect(text()).toContain(
      `grant execute on function public.${name}(${signature}) to authenticated;`,
    );
  });

  it('lets a full payoff take its payment day, never a day before a payment made', () => {
    const record = functionIn(FILE, 'record_loan_payoff');
    expect(record).toContain(
      'select 1 from public.charges where bill_id = p_bill_id and charged_on > p_paid_on',
    );
    expect(record).toContain(
      'select 1 from public.loan_payoffs where bill_id = p_bill_id and paid_on > p_paid_on',
    );
    expect(record).toContain(
      "raise exception 'a full payoff must come after the last payment made'",
    );
  });

  it('changes update_loan only by keeping a paid-off loan ended', () => {
    const before = functionIn('20261012100002_update_loan.sql', 'update_loan');
    const after = functionIn(FILE, 'update_loan');
    const block =
      / select p\.paid_on into v_paid_off_on [\s\S]*? v_next_due_on := null; end if; end if;/;
    expect(after).toMatch(block);
    expect(after.replace(' v_paid_off_on date;', '').replace(block, '')).toBe(before);
    expect(after).toContain('v_ends_on := least(v_ends_on, v_paid_off_on);');
  });
});

describe('update_loan_and_charges after every migration', () => {
  const FILE = '20261012100004_update_loan_and_charges.sql';
  const live = liveSignature('update_loan_and_charges');
  const body = () => functionIn(FILE, 'update_loan_and_charges');

  it('takes update_loan’s parameters, names, order and defaults', () => {
    expect(live.file).toBe(FILE);
    const own = (parameters: string) => parameters.split(',').map((line) => line.trim());
    expect(own(live.parameters)).toEqual(own(liveSignature('update_loan').parameters));
  });

  it('runs as the caller, for signed-in callers only, by its own signature', () => {
    const text = sql(FILE).replace(/\s+/g, ' ');
    const signature = live.types.join(', ');
    expect(body()).toContain('security invoker set search_path = public');
    expect(body()).not.toContain('security definer');
    expect(text).toContain(
      `revoke all on function public.update_loan_and_charges( ${signature} ) from public, anon;`,
    );
    expect(text).toContain(
      `grant execute on function public.update_loan_and_charges( ${signature} ) to authenticated;`,
    );
  });

  it('saves the loan through update_loan, then copies the bill onto its charges as the recorders do', () => {
    const saved = body().indexOf('perform public.update_loan(');
    const read = body().indexOf(
      'select * into strict v_bill from public.bills where id = p_bill_id;',
    );
    const rewrite = body().indexOf(
      "update public.charges set label = coalesce(nullif(v_bill.name, ''), 'Bill'), amount = v_bill.amount, card_id = v_bill.card_id, bank_account_id = v_bill.bank_account_id where bill_id = p_bill_id;",
    );
    expect(saved).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(saved);
    expect(rewrite).toBeGreaterThan(read);
    // The recorders' own label, so a rewritten charge reads as one recorded today would.
    expect(functionIn('20261012100001_loan_add_flow.sql', 'record_due_charges')).toContain(
      "coalesce(nullif(b.name, ''), 'Bill') as label",
    );
  });

  it('never moves a charge’s date, touches a payoff or swallows a refusal', () => {
    expect(body()).not.toMatch(/charged_on\s*=/);
    expect(body()).not.toContain('loan_payoffs');
    expect(body()).not.toMatch(/exception/i);
  });

  it('leaves update_loan to the migrations that make it', () => {
    expect(liveSignature('update_loan').file).toBe('20261013300001_month_end_anchor.sql');
    expect(sql(FILE)).not.toMatch(/function public\.update_loan\(/i);
  });
});

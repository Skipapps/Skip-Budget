import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { habitCarriedValues, refusedHabitGone, type HabitRow } from '@/api/habits';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

/**
 * update_habit_and_days as the migration writes it, held to what the app expects of it: the days
 * get exactly the columns a tap copies, a habit that is not there is refused in the words
 * `refusedHabitGone` knows, and only signed-in callers may run it, as themselves. The behaviour
 * against a database is supabase/checks/update_habit_and_days.sql.
 */

const DIR = join(__dirname, '../../../supabase/migrations');
const FILE = '20261013500001_update_habit_and_days.sql';

/** Comments out and whitespace collapsed, so a sentence in a comment is never read as SQL. */
const sql = (name: string) =>
  readFileSync(join(DIR, name), 'utf8')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .replace(/\s+/g, ' ');

const text = sql(FILE);
const body = text.slice(text.indexOf('as $$'), text.lastIndexOf('$$'));

const COFFEE: HabitRow = {
  id: 'habit-coffee',
  name: 'Coffee',
  icon_id: 'food-dining/coffee',
  color: 'caramel',
  price: 4.5,
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  preset_id: 'coffee',
  started_on: '2026-10-05',
  saved_from: '2026-10-08',
  sort_order: 0,
  archived_at: null,
  created_at: '2026-10-09T08:00:00Z',
};

/** `column = value` pairs of the first `update public.<table> set … where` in the body. */
function setList(table: string): Map<string, string> {
  const match = body.match(new RegExp(`update public\\.${table} set (.*?) where`));
  if (!match) throw new Error(`no update of ${table}`);
  const pairs = new Map<string, string>();
  // Split on the commas between assignments, not those inside coalesce(…) or round(…).
  let depth = 0;
  let current = '';
  for (const char of match[1]) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      const [column, ...value] = current.split('=');
      pairs.set(column.trim(), value.join('=').trim());
      current = '';
    } else {
      current += char;
    }
  }
  const [column, ...value] = current.split('=');
  pairs.set(column.trim(), value.join('=').trim());
  return pairs;
}

describe('update_habit_and_days', () => {
  it('runs as the caller, for signed-in callers only, by its own signature', () => {
    const opening = text.match(
      /create or replace function public\.update_habit_and_days\((.*?)\) returns public\.habits /,
    );
    expect(opening).not.toBeNull();
    const types = opening![1].split(',').map((part) => part.trim().split(' ')[1]);
    expect(types).toEqual(['uuid', 'text', 'text', 'text', 'numeric', 'uuid', 'uuid', 'text']);
    const signature = types.join(', ');

    expect(text).toContain('language plpgsql security invoker set search_path = public');
    expect(text).not.toContain('security definer');
    expect(text).toContain(
      `revoke all on function public.update_habit_and_days(${signature}) from public, anon;`,
    );
    expect(text).toContain(
      `grant execute on function public.update_habit_and_days(${signature}) to authenticated;`,
    );
  });

  it("refuses a habit that is not there in delete_habit's words, which the app knows as gone", () => {
    const refusal = /raise exception '([^']+)' using errcode = 'P0002'/;
    const own = body.match(refusal)?.[1];
    const deletes = sql('20261012200001_habit_past_days.sql').match(refusal)?.[1];

    expect(own).toBe(deletes);
    expect(refusedHabitGone({ code: 'P0002', message: own })).toBe(true);
  });

  it('checks the caller, then locks the habit, then writes it, then writes the days from it as saved', () => {
    const steps = [
      'if auth.uid() is null then',
      'perform 1 from public.habits where id = p_habit for update;',
      'update public.habits set',
      'returning * into strict v_habit;',
      'update public.receipts set',
      'where habit_id = p_habit;',
      'return v_habit;',
    ].map((step) => body.indexOf(step));

    expect(steps.every((at) => at > -1)).toBe(true);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });

  it('gives every day exactly the columns a tap copies, read from the habit as saved', () => {
    const days = setList('receipts');

    expect([...days.keys()].sort()).toEqual(Object.keys(habitCarriedValues(COFFEE)).sort());
    expect(days.get('merchant')).toBe('v_habit.name');
    expect(days.get('amount')).toBe('v_habit.price');
    expect(days.get('category_id')).toBe("coalesce(v_habit.category_id, 'other')");
    expect(days.get('card_id')).toBe('v_habit.card_id');
    // A card wins, as habitCarriedValues has it.
    expect(days.get('bank_account_id')).toBe(
      'case when v_habit.card_id is null then v_habit.bank_account_id end',
    );
    expect(habitCarriedValues({ ...COFFEE, bank_account_id: 'acct-1' }).bank_account_id).toBeNull();
  });

  it("never writes a day's date or habit, so the not-before-creation rule cannot refuse the rewrite", () => {
    const days = setList('receipts');

    expect(days.has('purchased_on')).toBe(false);
    expect(days.has('habit_id')).toBe(false);
    expect(body).not.toMatch(/purchased_on\s*=/);
  });

  it('saves the habit as the app does: name trimmed, category kept unless given, a card winning', () => {
    const habit = setList('habits');

    expect([...habit.keys()].sort()).toEqual(
      ['bank_account_id', 'card_id', 'category_id', 'color', 'icon_id', 'name', 'price'].sort(),
    );
    expect(habit.get('name')).toBe('btrim(p_name)');
    expect(habit.get('category_id')).toBe('coalesce(p_category_id, category_id)');
    expect(habit.get('bank_account_id')).toBe(
      'case when p_card_id is null then p_bank_account_id end',
    );
    // Only the category may be left out.
    expect(text).toMatch(/p_category_id text default null \)/);
    expect(text.match(/ default /g)).toHaveLength(1);
  });

  it('refuses a price nobody typed before writing, and never swallows a refusal', () => {
    const guard = body.indexOf(
      "if p_price is null or p_price = 'NaN'::numeric or p_price <= 0 or p_price <> round(p_price, 2) then",
    );
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(body.indexOf('update public.habits'));
    expect(body).not.toMatch(/exception when/i);
  });

  it('creates this one function and changes nothing else', () => {
    expect(text.match(/create (or replace )?function/g)).toHaveLength(1);
    expect(text).not.toMatch(
      /\b(drop|alter|create trigger|create table|insert into|delete from)\b/,
    );
  });
});

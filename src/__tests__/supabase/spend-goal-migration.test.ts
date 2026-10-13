import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * spend_goal and link_goal_receipt as the migrations write them, held to what the app sends and
 * expects: the same arguments `useSpendGoal` and `useLinkGoalReceipt` name, the amount worked out
 * by the server from the goal itself, a goal that is not there refused in delete_goal's own words
 * (which `savingsRefusal` reads as 'gone'), and only signed-in callers. The behaviour against a
 * database is supabase/checks/spend_goal.sql and supabase/checks/link_goal_receipt.sql.
 */

const ROOT = join(__dirname, '../../..');
const FILE = 'supabase/migrations/20261013700001_spend_goal.sql';

/** Comments out and whitespace collapsed, so a sentence in a comment is never read as SQL. */
const sql = (path: string) =>
  readFileSync(join(ROOT, path), 'utf8')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ');

const text = sql(FILE);
const body = text.slice(text.indexOf('as $$'), text.lastIndexOf('$$'));
const SIGNATURE = 'public.spend_goal(uuid, uuid, text, date, uuid, uuid, uuid)';

/** A function's parameters as `source` declares it, in order. */
function parameters(name = 'spend_goal', source = text): string[] {
  const match = source.match(
    new RegExp(`create or replace function public\\.${name}\\((.*?)\\) returns uuid`),
  );
  if (!match) throw new Error(`no ${name}`);
  return match[1].split(',').map((part) => part.trim().split(' ')[0]);
}

/** The keys the app sends to an RPC, in order. */
function sentTo(name: string): string[] {
  const app = readFileSync(join(ROOT, 'src/api/goals.ts'), 'utf8');
  const call = app.match(new RegExp(`rpc\\('${name}', \\{([\\s\\S]*?)\\}\\)`));
  if (!call) throw new Error(`no call to ${name}`);
  return [...call[1].matchAll(/(p_\w+):/g)].map((match) => match[1]);
}

/** One function's body in a file that defines two. */
function bodyOf(source: string, name: string): string {
  const start = source.indexOf(`create or replace function public.${name}(`);
  const open = source.indexOf('as $$', start);
  return source.slice(open, source.indexOf('$$;', open + 5));
}

describe('20261013700001_spend_goal.sql', () => {
  it('takes exactly the arguments useSpendGoal sends, and no amount', () => {
    const app = readFileSync(join(ROOT, 'src/api/goals.ts'), 'utf8');
    const call = app.match(/rpc\('spend_goal', \{([\s\S]*?)\}\)/);
    expect(call).not.toBeNull();
    const sent = [...call![1].matchAll(/(p_\w+):/g)].map((match) => match[1]);
    expect(sent).toEqual(parameters());
    expect(parameters()).not.toContain('p_amount');
  });

  it('files what the goal holds, worked out by goal_saved', () => {
    expect(body).toContain('v_amount := public.goal_saved(p_id);');
    expect(body).toMatch(/insert into public\.receipts \(id, user_id, merchant, amount,/);
    expect(body).toMatch(/values \(p_receipt, v_user, v_merchant, v_amount,/);
  });

  it('refuses a goal that is not there in delete_goal’s words, as P0002', () => {
    const deleteGoal = sql('supabase/migrations/20261011100001_savings_goals.sql');
    const words = "raise exception 'That goal is no longer there.' using errcode = 'P0002'";
    expect(deleteGoal).toContain(words);
    expect(body).toContain(words);
  });

  it('locks the goal as open before it writes, under the savings lock every savings write takes', () => {
    const lock = body.indexOf(
      "pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0))",
    );
    const open = body.indexOf(
      'where id = p_id and user_id = v_user and closed_at is null for update',
    );
    const insert = body.indexOf('insert into public.receipts');
    const close = body.indexOf('update public.goals set closed_at = now(), receipt_id = p_receipt');
    expect([lock, open, insert, close].every((at) => at > 0)).toBe(true);
    expect(lock).toBeLessThan(open);
    expect(open).toBeLessThan(insert);
    expect(insert).toBeLessThan(close);
  });

  it('holds the card and the account to the caller, since it runs as its owner', () => {
    expect(text).toContain('security definer set search_path = public');
    expect(body).toContain('select 1 from public.cards where id = p_card_id and user_id = v_user');
    expect(body).toContain(
      'select 1 from public.bank_accounts where id = p_bank_account_id and user_id = v_user',
    );
  });

  it('is for the signed-in only', () => {
    expect(text).toContain(`revoke all on function ${SIGNATURE} from public, anon;`);
    expect(text).toContain(`grant execute on function ${SIGNATURE} to authenticated;`);
  });

  it('lets a deleted receipt go without taking the goal with it', () => {
    expect(text).toContain(
      'add column if not exists receipt_id uuid references public.receipts (id) on delete set null',
    );
  });
});

describe('20261013700002_link_goal_receipt.sql', () => {
  const linkText = sql('supabase/migrations/20261013700002_link_goal_receipt.sql');
  const link = bodyOf(linkText, 'link_goal_receipt');
  const spend = bodyOf(linkText, 'spend_goal');
  const LOCK = "pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0))";
  const REPLAY =
    'select 1 from public.goals where id = p_id and user_id = v_user and receipt_id = p_receipt';
  const GONE = "raise exception 'That goal is no longer there.' using errcode = 'P0002'";

  it('link_goal_receipt takes exactly what useLinkGoalReceipt sends', () => {
    expect(sentTo('link_goal_receipt')).toEqual(parameters('link_goal_receipt', linkText));
    expect(parameters('link_goal_receipt', linkText)).toEqual(['p_id', 'p_receipt']);
  });

  it('keeps spend_goal’s signature, so it stays one function with what useSpendGoal sends', () => {
    expect(parameters('spend_goal', linkText)).toEqual(parameters());
    expect(sentTo('spend_goal')).toEqual(parameters('spend_goal', linkText));
  });

  it('answers a retry of spend_goal straight after the lock, for this goal only', () => {
    const lock = spend.indexOf(LOCK);
    const replay = spend.indexOf(REPLAY);
    const firstCheck = spend.indexOf('char_length(v_merchant)');
    expect([lock, replay, firstCheck].every((at) => at > 0)).toBe(true);
    expect(lock).toBeLessThan(replay);
    expect(replay).toBeLessThan(firstCheck);
    expect(spend.slice(lock + LOCK.length, replay).trim()).toBe('; if exists (');
  });

  it('links under the savings lock: retry, the caller’s receipt and no habit’s day, one goal per receipt, the open goal, then the write', () => {
    const order = [
      LOCK,
      REPLAY,
      'select habit_id into v_habit from public.receipts where id = p_receipt and user_id = v_user for update',
      "if v_habit is not null then raise exception 'A spending habit''s day cannot be what a goal bought.' using errcode = '23514'",
      'select 1 from public.goals where receipt_id = p_receipt',
      'where id = p_id and user_id = v_user and closed_at is null for update',
      'update public.goals set closed_at = now(), receipt_id = p_receipt where id = p_id',
    ].map((part) => link.indexOf(part));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(link).not.toContain('insert into public.receipts');
    expect(link).not.toContain('update public.receipts');
  });

  it('refuses a goal that is not there in delete_goal’s words in both', () => {
    expect(link).toContain(GONE);
    expect(spend).toContain(GONE);
  });

  it('runs both as their owner, for the signed-in only', () => {
    expect(linkText).toContain(
      'create or replace function public.link_goal_receipt(p_id uuid, p_receipt uuid) returns uuid language plpgsql security definer set search_path = public',
    );
    expect(linkText).toContain(
      'revoke all on function public.link_goal_receipt(uuid, uuid) from public, anon;',
    );
    expect(linkText).toContain(
      'grant execute on function public.link_goal_receipt(uuid, uuid) to authenticated;',
    );
    expect(linkText).toContain(`revoke all on function ${SIGNATURE} from public, anon;`);
    expect(linkText).toContain(`grant execute on function ${SIGNATURE} to authenticated;`);
  });
});

-- 20261011100001 · Savings and goals
--
-- When a month ends, what it left over (earned − spent, never below zero) moves into savings as a
-- pot of its own; the person can also add money that was neither pay nor spending (a gift). From
-- savings, money is sent to goals, and every move names the pot it left (or went back to), so each
-- pot knows what of it is in goals. Ready to use is every pot less what has gone to goals.
--
-- One rule decides what a month earned and spent, and it lives in the app (src/lib/savings.ts),
-- the same one that shows "October so far". The app works the figures out after it has written
-- down the month's pay and charges and hands them to close_my_savings_month, which only refuses what
-- is not a finished month of this account and works out the amount moved itself. The figures are
-- frozen there: a raise today must not rewrite September.
--
-- savings_pots already exists (20260827100003, "Money set aside"). No app build ever wrote it and
-- none reads it now, so it becomes this table. The rows already in it were put there by hand
-- (the demo seed's "Emergency fund"); nobody added them as savings, so they are kept but marked
-- removed rather than appearing as money the person never put aside. Its `name` column is left
-- as it was and is not read.
--
-- Every write goes through the functions below, which hold the rules no screen can be trusted to
-- keep alone: no pot gives more than it has left, no goal takes more than it still needs, nothing
-- goes back to a pot that it did not come from, a pot never drops below what it has in goals, and
-- a removed month never comes back. The tables are readable by their owner and nothing else. The
-- functions run as their owner, so each one names the caller's rows itself, and takes a per-person
-- lock first, so two phones sending at once cannot both spend the same dollar.
--
-- The old monthly_savings table and its functions are not touched. The close below is named
-- close_my_savings_month so PostgREST can never match it against the old, revoked
-- close_savings_month(uuid, date).
--
-- Refusals the app tells apart carry their own codes; detail holds the figure the message needs,
-- hint the pot or goal it is about:
--   SV001  more than a pot has left               detail: what it has left      hint: pot
--   SV002  more than a goal still needs           detail: what it needs         hint: goal
--   SV003  this pot's money is in goals           detail: what it has in goals  hint: pot
--   SV004  more back than came from that pot      detail: what came from it     hint: pot
--   SV005  not a finished month of this account
--   SV006  a pot kept at $0 that is not an overspent month (removing it is the honest way)
--
-- Re-run safe.

-- ---------------------------------------------------------------------------
-- Pots
-- ---------------------------------------------------------------------------

alter table public.savings_pots
  add column if not exists kind            text,
  add column if not exists month           date,
  add column if not exists label           text,
  add column if not exists earned          numeric(14,2),
  add column if not exists spent           numeric(14,2),
  add column if not exists added_on        date,
  add column if not exists note            text,
  add column if not exists wrap_up_seen_at timestamptz,
  add column if not exists removed_at      timestamptz;

update public.savings_pots
   set kind       = 'added',
       label      = coalesce(nullif(btrim(left(btrim(name), 60)), ''), 'Savings'),
       added_on   = (created_at at time zone 'UTC')::date,
       removed_at = coalesce(removed_at, now())
 where kind is null;

alter table public.savings_pots alter column kind set not null;
alter table public.savings_pots alter column added_on set not null;

do $$ begin
  alter table public.savings_pots
    add constraint savings_pots_kind check (kind in ('month', 'added'));
exception when duplicate_object then null;
end $$;

-- A month pot is the month and its frozen figures; an added pot is a name and a date.
do $$ begin
  alter table public.savings_pots
    add constraint savings_pots_shape check (
      case kind
        when 'month' then
          month is not null
          and month = date_trunc('month', month)::date
          and earned is not null and earned >= 0
          and spent is not null and spent >= 0
          and label is null
        when 'added' then
          month is null
          and earned is null
          and spent is null
          and wrap_up_seen_at is null
          and label is not null
          and char_length(label) between 1 and 60
          and label = btrim(label)
      end
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.savings_pots
    add constraint savings_pots_note_length check (note is null or char_length(note) <= 200);
exception when duplicate_object then null;
end $$;

-- Removed months included: closing must find a removed month and leave it removed.
create unique index if not exists savings_pots_month_once
  on public.savings_pots (user_id, month)
  where kind = 'month';

comment on column public.savings_pots.name is
  'Unread. Older than the pots below; an added pot is named by label.';
comment on column public.savings_pots.amount is
  'What the pot holds. A month moves greatest(earned - spent, 0); the person may change it.';
comment on column public.savings_pots.added_on is
  'When the money arrived in savings: the 1st of the next month for a month, the chosen day for an added pot.';
comment on column public.savings_pots.removed_at is
  'Removed from savings. Pots are never deleted: goal moves name them, and closing must not bring a month back.';

-- ---------------------------------------------------------------------------
-- Goals and the money moved to them
-- ---------------------------------------------------------------------------

create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  -- A goal type from the app's list. Not checked against it: a type added later must not need a
  -- migration, and an older build draws an id it does not know as "other".
  icon_id      text not null check (char_length(icon_id) between 1 and 40),
  target       numeric(14,2) not null check (target > 0),
  target_date  date,
  -- What the person had put by before Skip. It never came from savings, so it never goes back there.
  start_amount numeric(14,2) not null default 0 check (start_amount >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- "I spent it": the goal leaves every list, and its moves stay, so that money stays out of savings.
alter table public.goals add column if not exists closed_at timestamptz;

create index if not exists goals_user_idx on public.goals (user_id, created_at);

drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- Positive is a pot's money into a goal, negative is a goal's money back to that pot. Deleting a
-- goal deletes its moves, which is what puts its money back in savings. A pot is never deleted by
-- the app; the cascade is for an account being deleted, which takes both tables at once.
create table if not exists public.goal_moves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  goal_id    uuid not null references public.goals (id) on delete cascade,
  pot_id     uuid not null references public.savings_pots (id) on delete cascade,
  amount     numeric(14,2) not null check (amount <> 0),
  batch_id   uuid not null,
  created_at timestamptz not null default now()
);

-- One line per goal and pot per send, which is also what makes a resent batch a no-op.
create unique index if not exists goal_moves_once_per_batch
  on public.goal_moves (batch_id, goal_id, pot_id);
create index if not exists goal_moves_goal_idx on public.goal_moves (goal_id, created_at);
create index if not exists goal_moves_pot_idx on public.goal_moves (pot_id);
create index if not exists goal_moves_user_idx on public.goal_moves (user_id, created_at);

-- The foreign keys accept anyone's goal and pot.
create or replace function public.goal_moves_own_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.goals where id = new.goal_id and user_id = new.user_id
  ) then
    raise exception 'Money can only move to one of your own goals.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.savings_pots where id = new.pot_id and user_id = new.user_id
  ) then
    raise exception 'Money can only move from your own savings.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists goal_moves_own_rows on public.goal_moves;
create trigger goal_moves_own_rows
  before insert or update of goal_id, pot_id, user_id on public.goal_moves
  for each row execute function public.goal_moves_own_rows();

-- What one pot has in goals: each goal's net from it, never below zero (the same sum the app makes).
create or replace function public.savings_pot_in_goals(p_pot uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(greatest(per_goal.net, 0)), 0)
    from (
      select sum(amount) as net from public.goal_moves where pot_id = p_pot group by goal_id
    ) as per_goal
$$;

-- What a goal holds: what it started with plus everything moved in, less everything moved out.
create or replace function public.goal_saved(p_goal uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select g.start_amount + coalesce((select sum(m.amount) from public.goal_moves m where m.goal_id = g.id), 0)
    from public.goals g
   where g.id = p_goal
$$;

-- ---------------------------------------------------------------------------
-- Who may read and write
-- ---------------------------------------------------------------------------

alter table public.savings_pots enable row level security;
alter table public.goals        enable row level security;
alter table public.goal_moves   enable row level security;

drop policy if exists "savings_pots_all_own" on public.savings_pots;
drop policy if exists "savings_pots_select_own" on public.savings_pots;
create policy "savings_pots_select_own" on public.savings_pots
  for select using (auth.uid() = user_id);

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists "goal_moves_select_own" on public.goal_moves;
create policy "goal_moves_select_own" on public.goal_moves
  for select using (auth.uid() = user_id);

revoke all on public.savings_pots, public.goals, public.goal_moves from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.savings_pots, public.goals, public.goal_moves from authenticated;
grant select on public.savings_pots, public.goals, public.goal_moves to authenticated;

-- ---------------------------------------------------------------------------
-- Closing a month
-- ---------------------------------------------------------------------------

/*
 * Moves a finished month into savings, once. p_seen says the wrap-up for it is not to be shown
 * (a past month filled in behind the latest). Returns the month's pot, whether made now or before.
 *
 * The phone decides from its own calendar; the server knows only UTC. So a month is accepted once
 * it has ended in the furthest zone ahead (UTC+14), and the account's first month is the month of
 * its creation in the furthest zone behind (UTC−12): every month the phone can call finished and
 * not before the account, wherever it is, is accepted here.
 */
create or replace function public.close_my_savings_month(
  p_month  date,
  p_earned numeric,
  p_spent  numeric,
  p_seen   boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
  v_born  timestamptz;
  v_id    uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_month is null or p_earned is null or p_spent is null
     or p_earned < 0 or p_spent < 0
     or p_earned <> round(p_earned, 2) or p_spent <> round(p_spent, 2) then
    raise exception 'A month needs what it earned and spent, in whole cents.' using errcode = '22023';
  end if;

  if (v_month + interval '1 month')::date > ((now() at time zone 'UTC') + interval '14 hours')::date then
    raise exception 'That month has not finished yet.' using errcode = 'SV005';
  end if;

  select created_at into v_born from public.profiles where id = v_user;
  if v_born is null
     or v_month < date_trunc('month', (v_born at time zone 'UTC') - interval '12 hours')::date then
    raise exception 'That month is from before your account.' using errcode = 'SV005';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  insert into public.savings_pots
    (user_id, kind, month, earned, spent, amount, added_on, wrap_up_seen_at)
  values
    (v_user, 'month', v_month, p_earned, p_spent, greatest(p_earned - p_spent, 0),
     (v_month + interval '1 month')::date,
     case when coalesce(p_seen, false) then now() end)
  on conflict (user_id, month) where kind = 'month' do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
      from public.savings_pots
     where user_id = v_user and kind = 'month' and month = v_month;
  end if;

  return v_id;
end;
$$;

/*
 * The wrap-up for p_month has been shown. Earlier months nobody saw are done with too: only the
 * latest month's wrap-up is ever offered.
 */
create or replace function public.mark_wrap_up_seen(p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  update public.savings_pots
     set wrap_up_seen_at = now()
   where user_id = v_user
     and kind = 'month'
     and month <= date_trunc('month', p_month)::date
     and wrap_up_seen_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Changing savings
-- ---------------------------------------------------------------------------

/*
 * p_id null adds savings that were neither pay nor spending: a name, an amount, a day. With an id,
 * an added pot takes all four again and a month takes its amount and note (its name and day are
 * the month's own, so p_label and p_added_on are ignored for it).
 *
 * A pot cannot be lowered below what it has in goals, and only an overspent month may be kept at
 * $0: any other pot at $0 is one to remove.
 */
create or replace function public.save_savings_pot(
  p_id       uuid,
  p_label    text,
  p_amount   numeric,
  p_added_on date,
  p_note     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  v_pot      public.savings_pots%rowtype;
  v_in_goals numeric;
  v_id       uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount < 0 or p_amount <> round(p_amount, 2) then
    raise exception 'An amount in whole cents, please.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  if p_id is null then
    if p_amount = 0 then
      raise exception 'Savings you add need an amount.' using errcode = '22023';
    end if;
    if p_added_on is null
       or p_added_on > ((now() at time zone 'UTC') + interval '14 hours')::date then
      raise exception 'Savings you add need a day that has come.' using errcode = '22023';
    end if;
    insert into public.savings_pots (user_id, kind, label, amount, added_on, note)
    values (v_user, 'added', btrim(coalesce(p_label, '')), p_amount, p_added_on, v_note)
    returning id into v_id;
    return v_id;
  end if;

  select * into v_pot
    from public.savings_pots
   where id = p_id and user_id = v_user and removed_at is null
     for update;
  if not found then
    raise exception 'That savings is no longer there.' using errcode = 'P0002';
  end if;

  v_in_goals := public.savings_pot_in_goals(v_pot.id);
  if p_amount < v_pot.amount and p_amount < v_in_goals then
    raise exception 'That money is already in your goals.'
      using errcode = 'SV003', detail = round(v_in_goals, 2)::text, hint = v_pot.id::text;
  end if;
  if p_amount = 0 and not (v_pot.kind = 'month' and v_pot.earned - v_pot.spent <= 0) then
    raise exception 'Remove it from savings instead of keeping it at nothing.' using errcode = 'SV006';
  end if;

  if v_pot.kind = 'month' then
    update public.savings_pots
       set amount = p_amount, note = v_note
     where id = v_pot.id;
  else
    if p_added_on is null
       or p_added_on > ((now() at time zone 'UTC') + interval '14 hours')::date then
      raise exception 'Savings you add need a day that has come.' using errcode = '22023';
    end if;
    update public.savings_pots
       set label = btrim(coalesce(p_label, '')), amount = p_amount, added_on = p_added_on, note = v_note
     where id = v_pot.id;
  end if;

  return v_pot.id;
end;
$$;

/*
 * Brings a closed month up to date when something dated in it changed later and the person took
 * the update its page offered (nothing changes on its own). The figures are the app's, worked out
 * by the same rule as at closing; the amount follows them, never below what the month already has
 * in goals. Returns the new amount.
 */
create or replace function public.update_savings_month(p_id uuid, p_earned numeric, p_spent numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_amount numeric;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_earned is null or p_spent is null
     or p_earned < 0 or p_spent < 0
     or p_earned <> round(p_earned, 2) or p_spent <> round(p_spent, 2) then
    raise exception 'A month needs what it earned and spent, in whole cents.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  perform 1
    from public.savings_pots
   where id = p_id and user_id = v_user and kind = 'month' and removed_at is null
     for update;
  if not found then
    raise exception 'That month is no longer in your savings.' using errcode = 'P0002';
  end if;

  v_amount := greatest(p_earned - p_spent, 0, public.savings_pot_in_goals(p_id));
  update public.savings_pots
     set earned = p_earned, spent = p_spent, amount = v_amount
   where id = p_id;

  return v_amount;
end;
$$;

/*
 * Takes a pot out of savings: marked removed, never deleted, so a month never comes back. Refused
 * while any of it is in goals.
 */
create or replace function public.remove_savings_pot(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_in_goals numeric;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  perform 1
    from public.savings_pots
   where id = p_id and user_id = v_user and removed_at is null
     for update;
  if not found then
    raise exception 'That savings is no longer there.' using errcode = 'P0002';
  end if;

  v_in_goals := public.savings_pot_in_goals(p_id);
  if v_in_goals > 0 then
    raise exception 'That money is already in your goals.'
      using errcode = 'SV003', detail = round(v_in_goals, 2)::text, hint = p_id::text;
  end if;

  update public.savings_pots set removed_at = now() where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------

/* p_id null creates a goal. Returns its id. A closed goal ("I spent it") cannot be edited. */
create or replace function public.save_goal(
  p_id           uuid,
  p_name         text,
  p_icon_id      text,
  p_target       numeric,
  p_target_date  date,
  p_start_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_start numeric := coalesce(p_start_amount, 0);
  v_id    uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_target is null or p_target <= 0 or p_target <> round(p_target, 2)
     or v_start < 0 or v_start <> round(v_start, 2) then
    raise exception 'A goal needs a target, and amounts in whole cents.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  if p_id is null then
    insert into public.goals (user_id, name, icon_id, target, target_date, start_amount)
    values (v_user, btrim(coalesce(p_name, '')), p_icon_id, p_target, p_target_date, v_start)
    returning id into v_id;
  else
    update public.goals
       set name = btrim(coalesce(p_name, '')),
           icon_id = p_icon_id,
           target = p_target,
           target_date = p_target_date,
           start_amount = v_start
     where id = p_id and user_id = v_user and closed_at is null
    returning id into v_id;
    if v_id is null then
      raise exception 'That goal is no longer there.' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

/*
 * Ends an open goal. p_return true deletes it, and what came to it from savings is back in its
 * pots. False is "I spent it": the goal is closed, and its moves stay, so that money stays out of
 * savings. A closed goal is ended for good: deleting it later would bring spent money back.
 */
create or replace function public.delete_goal(p_id uuid, p_return boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_return is null then
    raise exception 'Say whether the money goes back to savings.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  if p_return then
    delete from public.goals where id = p_id and user_id = v_user and closed_at is null;
  else
    update public.goals
       set closed_at = now()
     where id = p_id and user_id = v_user and closed_at is null;
  end if;
  if not found then
    raise exception 'That goal is no longer there.' using errcode = 'P0002';
  end if;
end;
$$;

/*
 * Sends savings to goals in one go: p_items is [{ "goal_id", "pot_id", "amount" }], one line per
 * goal and pot (a goal drawing on two pots is two lines). The app decides which pots each goal
 * draws on; this checks, all or nothing, that no pot gives more than it has left and no goal takes
 * more than it still needs.
 *
 * p_batch is the app's own id for this send. A send that reaches the server twice (a retry after
 * a lost answer) finds its batch already there and moves nothing more.
 *
 * Returns { batch_id, goals: [{ goal_id, amount, saved_before, saved_after }] }, one per goal in
 * the order first asked (on a replay, in goal id order), saved being what the goal holds.
 */
create or replace function public.send_to_goals(p_items jsonb, p_batch uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_batch    uuid := coalesce(p_batch, gen_random_uuid());
  v_goal_ids uuid[];
  v_pot_ids  uuid[];
  v_amounts  numeric[];
  v_lines    integer;
  v_pot      public.savings_pots%rowtype;
  v_goal     public.goals%rowtype;
  v_id       uuid;
  v_left     numeric;
  v_given    numeric;
  v_saved    numeric;
  v_result   jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  -- A batch already sent is answered as it was, whatever lines come with it this time.
  if p_batch is not null and exists (
    select 1 from public.goal_moves m where m.user_id = v_user and m.batch_id = p_batch
  ) then
    select coalesce(jsonb_agg(jsonb_build_object(
             'goal_id', b.goal_id,
             'amount', b.amount,
             'saved_before', public.goal_saved(b.goal_id) - b.amount,
             'saved_after', public.goal_saved(b.goal_id)
           ) order by b.goal_id), '[]'::jsonb)
      into v_result
      from (
        select m.goal_id, sum(m.amount) as amount
          from public.goal_moves m
         where m.user_id = v_user and m.batch_id = p_batch
         group by m.goal_id
      ) as b;
    return jsonb_build_object('batch_id', p_batch, 'goals', v_result);
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 200 then
    raise exception 'Pick at least one goal.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(item)
     where jsonb_typeof(e.item) <> 'object'
        or jsonb_typeof(e.item -> 'goal_id') is distinct from 'string'
        or jsonb_typeof(e.item -> 'pot_id') is distinct from 'string'
        or jsonb_typeof(e.item -> 'amount') is distinct from 'number'
  ) then
    raise exception 'Each line needs a goal, a pot and an amount.' using errcode = '22023';
  end if;

  select array_agg((e.item ->> 'goal_id')::uuid order by e.n),
         array_agg((e.item ->> 'pot_id')::uuid order by e.n),
         array_agg((e.item ->> 'amount')::numeric order by e.n)
    into v_goal_ids, v_pot_ids, v_amounts
    from jsonb_array_elements(p_items) with ordinality as e(item, n);

  select count(distinct (g, p)) into v_lines from unnest(v_goal_ids, v_pot_ids) as x(g, p);
  if v_lines <> cardinality(v_goal_ids) then
    raise exception 'Each goal once from each pot, please.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_amounts) as a where a <= 0 or a <> round(a, 2)) then
    raise exception 'Each amount in whole cents, above zero.' using errcode = '22023';
  end if;

  for v_id in select distinct p from unnest(v_pot_ids) as p loop
    select * into v_pot
      from public.savings_pots
     where id = v_id and user_id = v_user and removed_at is null
       for update;
    if not found then
      raise exception 'That savings is no longer there.' using errcode = 'P0002', detail = v_id::text;
    end if;
    v_left := v_pot.amount - public.savings_pot_in_goals(v_id);
    select sum(x.a) into v_given from unnest(v_pot_ids, v_amounts) as x(p, a) where x.p = v_id;
    if v_given > v_left then
      raise exception 'That is more than this savings has left.'
        using errcode = 'SV001', detail = round(greatest(v_left, 0), 2)::text, hint = v_id::text;
    end if;
  end loop;

  for v_id in
    select x.g from unnest(v_goal_ids) with ordinality as x(g, n) group by x.g order by min(x.n)
  loop
    select * into v_goal
      from public.goals
     where id = v_id and user_id = v_user and closed_at is null
       for update;
    if not found then
      raise exception 'That goal is no longer there.' using errcode = 'P0002', detail = v_id::text;
    end if;

    v_saved := public.goal_saved(v_id);
    select sum(x.a) into v_given from unnest(v_goal_ids, v_amounts) as x(g, a) where x.g = v_id;
    if v_given > greatest(v_goal.target - v_saved, 0) then
      raise exception 'That is more than this goal still needs.'
        using errcode = 'SV002',
              detail = round(greatest(v_goal.target - v_saved, 0), 2)::text,
              hint = v_id::text;
    end if;

    insert into public.goal_moves (user_id, goal_id, pot_id, amount, batch_id)
    select v_user, v_id, x.p, x.a, v_batch
      from unnest(v_goal_ids, v_pot_ids, v_amounts) with ordinality as x(g, p, a, n)
     where x.g = v_id
     order by x.n;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'goal_id', v_id,
      'amount', v_given,
      'saved_before', v_saved,
      'saved_after', v_saved + v_given
    ));
  end loop;

  return jsonb_build_object('batch_id', v_batch, 'goals', v_result);
end;
$$;

/*
 * Moves money from a goal back to savings: p_items is [{ "pot_id", "amount" }], the pots it goes
 * back to. Each pot takes back at most what this goal has from it, so only money that came from
 * savings returns there (what the goal started with never was savings). Returns the batch id.
 *
 * p_batch works as it does for send_to_goals: a take-back reaching the server twice moves once.
 */
drop function if exists public.take_from_goal(uuid, jsonb);
create or replace function public.take_from_goal(p_goal uuid, p_items jsonb, p_batch uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_batch   uuid := coalesce(p_batch, gen_random_uuid());
  v_pot_ids uuid[];
  v_amounts numeric[];
  v_lines   integer;
  v_i       integer;
  v_net     numeric;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  -- A batch already taken back is answered as it was, whatever lines come with it this time.
  if p_batch is not null and exists (
    select 1 from public.goal_moves m where m.user_id = v_user and m.batch_id = p_batch
  ) then
    return p_batch;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 200 then
    raise exception 'Say how much comes back.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(item)
     where jsonb_typeof(e.item) <> 'object'
        or jsonb_typeof(e.item -> 'pot_id') is distinct from 'string'
        or jsonb_typeof(e.item -> 'amount') is distinct from 'number'
  ) then
    raise exception 'Each line needs a pot and an amount.' using errcode = '22023';
  end if;

  select array_agg((e.item ->> 'pot_id')::uuid order by e.n),
         array_agg((e.item ->> 'amount')::numeric order by e.n)
    into v_pot_ids, v_amounts
    from jsonb_array_elements(p_items) with ordinality as e(item, n);

  select count(distinct p) into v_lines from unnest(v_pot_ids) as p;
  if v_lines <> cardinality(v_pot_ids) then
    raise exception 'Each pot once, please.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_amounts) as a where a <= 0 or a <> round(a, 2)) then
    raise exception 'Each amount in whole cents, above zero.' using errcode = '22023';
  end if;

  perform 1 from public.goals where id = p_goal and user_id = v_user and closed_at is null for update;
  if not found then
    raise exception 'That goal is no longer there.' using errcode = 'P0002';
  end if;

  for v_i in 1 .. cardinality(v_pot_ids) loop
    select coalesce(sum(amount), 0) into v_net
      from public.goal_moves
     where goal_id = p_goal and pot_id = v_pot_ids[v_i] and user_id = v_user;
    if v_amounts[v_i] > v_net then
      raise exception 'That is more than came to this goal from that savings.'
        using errcode = 'SV004', detail = round(greatest(v_net, 0), 2)::text, hint = v_pot_ids[v_i]::text;
    end if;

    insert into public.goal_moves (user_id, goal_id, pot_id, amount, batch_id)
    values (v_user, p_goal, v_pot_ids[v_i], -v_amounts[v_i], v_batch);
  end loop;

  return v_batch;
end;
$$;

-- ---------------------------------------------------------------------------
-- Exposure: signed-in people only, each function by its full signature.
-- ---------------------------------------------------------------------------

revoke all on function public.close_my_savings_month(date, numeric, numeric, boolean) from public, anon;
revoke all on function public.mark_wrap_up_seen(date)                              from public, anon;
revoke all on function public.save_savings_pot(uuid, text, numeric, date, text)    from public, anon;
revoke all on function public.remove_savings_pot(uuid)                             from public, anon;
revoke all on function public.update_savings_month(uuid, numeric, numeric)       from public, anon;
revoke all on function public.save_goal(uuid, text, text, numeric, date, numeric)  from public, anon;
revoke all on function public.delete_goal(uuid, boolean)                           from public, anon;
revoke all on function public.send_to_goals(jsonb, uuid)                           from public, anon;
revoke all on function public.take_from_goal(uuid, jsonb, uuid)                    from public, anon;
revoke all on function public.goal_moves_own_rows()           from public, anon, authenticated;
revoke all on function public.savings_pot_in_goals(uuid)      from public, anon, authenticated;
revoke all on function public.goal_saved(uuid)                from public, anon, authenticated;

grant execute on function public.close_my_savings_month(date, numeric, numeric, boolean) to authenticated;
grant execute on function public.mark_wrap_up_seen(date)                              to authenticated;
grant execute on function public.save_savings_pot(uuid, text, numeric, date, text)    to authenticated;
grant execute on function public.remove_savings_pot(uuid)                             to authenticated;
grant execute on function public.update_savings_month(uuid, numeric, numeric)       to authenticated;
grant execute on function public.save_goal(uuid, text, text, numeric, date, numeric)  to authenticated;
grant execute on function public.delete_goal(uuid, boolean)                           to authenticated;
grant execute on function public.send_to_goals(jsonb, uuid)                           to authenticated;
grant execute on function public.take_from_goal(uuid, jsonb, uuid)                    to authenticated;

-- savings_pots has been published since 20260829100011 and the app's channel already listens to
-- it; a filtered channel hears a change in full only with the whole old row.
alter table public.savings_pots replica identity full;

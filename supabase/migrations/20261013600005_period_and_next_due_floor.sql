-- 20261013600005 · A set period repeats monthly; a plan's next date is never before its start
--
-- A bill for a set period ("Specific period") was one payment on one day. It now
-- repeats monthly on its anchor day, from its start to its end, inclusive: the
-- walk treats 'period' as monthly, a charge stands for its month, the roller moves
-- it on, and the recorders and reminders follow, since they walk plan_occurrences
-- and read the stored date bounded by the plan's start and end. record_due_charges
-- and reminders_due are not recreated. The anchor trigger counts a period as a
-- month, so a period bill keeps its day as a monthly one does. The app's walk is
-- the same (src/lib/card-ledger.ts), date for date (supabase/checks/month_end_anchor.sql
-- holds the shared table).
--
-- A set period has an end: it is what bounds the months it repeats in. A bill saved
-- as 'period' with no end is refused (23514); the one live then had its end.
--
-- A period bill already running gets the months since its start written down here,
-- once, as charges, without the "went out" push the scheduler sends for a charge it
-- records: the months were due before the person was told they repeat. Only months
-- not already charged, from the start to the person's today or the end, whichever
-- is first; a bill kept out of spending gets none, as the recorder writes none.
-- Its next date then moves to the first one on or after today.
--
-- Next due inside a charged cycle. Editing a plan after this cycle's payment could
-- save the picked date inside that cycle: "Next due 15 Oct" for a bill paid for
-- October, and a reminder on 15 Oct. A plan's floor is its start (starts_on /
-- started_on) or the cycle after its newest charge, whichever is later: a set
-- period's start is the one picked, never moved past its charges, and older builds
-- move no start at all. A stored next date before the floor becomes the first date
-- of the schedule on or after it, whoever writes it (the forms, older builds, both
-- rollers). The start itself is left as it is. These triggers run after the
-- anchor-day ones and change only the date: the anchor was taken from the day the
-- person picked, so a 31st picked in a charged October is stored as 30 Nov and
-- comes back to 31 Dec. Rows already stored that way are put right once, below.
--
-- Bodies: plan_occurrences, anchor_after_update and roll_schedules_forward from
-- 20261013300001, charges_one_per_cycle from 20260928100003, each with only the
-- period lines changed.

-- 20261013300001's walk; a set period walks as a monthly plan.
create or replace function public.plan_occurrences(
  p_anchor date,
  p_recurrence text,
  p_from date,
  p_to date,
  p_anchor_day integer default null
)
returns setof date
language plpgsql
immutable
as $$
declare
  months integer;
  anchor_day integer;
  lo integer;
  hi integer;
  s integer;
  base date;
  d date;
begin
  if p_anchor is null or p_to is null then return; end if;

  if p_recurrence = 'weekly' then
    -- from <= anchor - 7s <= to, solved for s.
    lo := ceil((p_anchor - p_to)::numeric / 7);
    hi := floor((p_anchor - coalesce(p_from, p_anchor))::numeric / 7);
    for s in greatest(lo, -600) .. least(hi, 600) loop
      d := p_anchor - (7 * s);
      if d <= p_to and (p_from is null or d >= p_from) then return next d; end if;
    end loop;
    return;
  end if;

  -- A set period repeats monthly; its own start and end bound the window the
  -- callers walk it in.
  months := case p_recurrence
    when 'monthly' then 1 when 'period' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
  if months is null then return; end if;

  -- The day every step but the stored one returns to. Out of range (the
  -- columns' check stops it) reads as none, rather than a date in the wrong month.
  anchor_day := case when p_anchor_day between 1 and 31 then p_anchor_day
                     else extract(day from p_anchor)::int end;

  -- Same solve in whole months, with a step of slack either side because
  -- clamping a long day into a short month moves a date without moving its
  -- month index.
  lo := floor((
    (extract(year from p_anchor)::int * 12 + extract(month from p_anchor)::int)
    - (extract(year from p_to)::int * 12 + extract(month from p_to)::int)
  )::numeric / months) - 1;

  hi := ceil((
    (extract(year from p_anchor)::int * 12 + extract(month from p_anchor)::int)
    - (extract(year from coalesce(p_from, p_anchor))::int * 12
       + extract(month from coalesce(p_from, p_anchor))::int)
  )::numeric / months) + 1;

  for s in greatest(lo, -600) .. least(hi, 600) loop
    base := (date_trunc('month', p_anchor) - make_interval(months => months * s))::date;
    -- The day is clamped to the month's length, so a bill due on the 31st
    -- charges on the 30th rather than skidding into the month after. Never
    -- clamped from the stored date: after a short month that is already
    -- shortened, and every month after it would be too.
    d := base + make_interval(days => least(
      anchor_day,
      extract(day from (base + interval '1 month - 1 day'))::int
    ) - 1);
    -- The stored date stands as it is, even off the anchor day: a loan's first
    -- payment can be.
    if s = 0 then d := p_anchor; end if;

    if d <= p_to and (p_from is null or d >= p_from) then return next d; end if;
  end loop;
end;
$$;

revoke all on function public.plan_occurrences(date, text, date, date, integer)
  from public, anon, authenticated;

-- 20261013300001's anchor rules; a set period keeps its day as a monthly plan.
create or replace function public.anchor_after_update(
  p_old_on     date,
  p_new_on     date,
  p_old_anchor integer,
  p_new_anchor integer,
  p_old_every  text,
  p_new_every  text,
  p_loan       boolean,
  p_today      date,
  out anchor_day integer,
  out due_on     date
)
language plpgsql
immutable
as $$
declare
  v_months integer;
  v_anchor integer;
  v_old_day integer;
  v_new_day integer;
  v_last integer;
  v_steps integer;
  v_month date;
begin
  due_on := p_new_on;

  -- (a) The writer set it: save_loan and update_loan know the payment day.
  if p_new_anchor is distinct from p_old_anchor then
    anchor_day := p_new_anchor;
    return;
  end if;

  -- (b) The date did not move, or was cleared by a stop.
  if p_new_on is null or p_new_on is not distinct from p_old_on then
    anchor_day := p_old_anchor;
    return;
  end if;

  v_new_day := extract(day from p_new_on)::integer;
  v_months := case p_new_every when 'monthly' then 1 when 'period' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;

  -- (c) Weekly has no day of the month to keep.
  if v_months is null then
    anchor_day := v_new_day;
    return;
  end if;

  -- (d) A loan's day is its payment day; the bill form, a stop and the payoff
  -- functions move its dates without changing it.
  if coalesce(p_loan, false) then
    anchor_day := p_old_anchor;
    return;
  end if;

  -- (e) A roll. A roller never changes the recurrence, and only moves a date
  -- that has passed to the first one on or after today: today on the phone
  -- that wrote it, which may be a day either side of the profile zone's.
  if p_old_on is not null and p_today is not null
     and p_old_every is not distinct from p_new_every
     and p_old_on <= p_today and p_today - 1 <= p_new_on then
    v_old_day := extract(day from p_old_on)::integer;
    v_anchor := coalesce(p_old_anchor, v_old_day);
    v_month := date_trunc('month', p_new_on)::date;
    v_last := extract(day from (v_month + interval '1 month - 1 day'))::integer;
    v_steps := (extract(year from p_new_on)::integer * 12 + extract(month from p_new_on)::integer)
             - (extract(year from p_old_on)::integer * 12 + extract(month from p_old_on)::integer);
    -- The old phone roller clamps from the stored day, so its 30 April rolls
    -- to 30 May; that lands on 31 May for an anchor of 31.
    if v_steps > 0 and v_steps % v_months = 0
       and (v_new_day = least(v_anchor, v_last) or v_new_day = least(v_old_day, v_last)) then
      anchor_day := v_anchor;
      due_on := v_month + least(v_anchor, v_last) - 1;
      return;
    end if;
  end if;

  -- (f) The person picked a new day.
  anchor_day := v_new_day;
end;
$$;

revoke all on function public.anchor_after_update(date, date, integer, integer, text, text, boolean, date)
  from public, anon, authenticated;

-- 20260928100003's rule; a set period is charged once a month.
create or replace function public.charges_one_per_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  every text;
begin
  if new.bill_id is not null then
    select b.recurrence into every from public.bills b where b.id = new.bill_id;
  else
    select s.cycle into every from public.subscriptions s where s.id = new.subscription_id;
  end if;

  every := case every
    when 'weekly' then 'week'
    when 'monthly' then 'month'
    when 'period' then 'month'
    when 'quarterly' then 'quarter'
    when 'yearly' then 'year'
  end;
  if every is null then
    return new;
  end if;

  if exists (
    select 1
    from public.charges c
    where c.id <> new.id
      and (
        (new.bill_id is not null and c.bill_id = new.bill_id)
        or (new.subscription_id is not null and c.subscription_id = new.subscription_id)
      )
      and date_trunc(every, c.charged_on) = date_trunc(every, new.charged_on)
  ) then
    return null;
  end if;

  return new;
end;
$$;

-- 20261013300001's roller; set periods are rolled too.
create or replace function public.roll_schedules_forward()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  moved integer := 0;
  n integer;
begin
  with today_by_user as (
    select p.id as uid, (now() at time zone coalesce(p.timezone, 'UTC'))::date as today
    from public.profiles p
  ),
  next_dates as (
    select b.id, (
      select min(d) from public.plan_occurrences(
        b.next_due_on, b.recurrence::text, t.today, (t.today + interval '5 years')::date,
        b.anchor_day
      ) d where d >= t.today
    ) as next_on
    from public.bills b
    join today_by_user t on t.uid = b.user_id
    where b.next_due_on is not null
      and b.next_due_on < t.today
  )
  update public.bills b
     set next_due_on = n.next_on
    from next_dates n
   where b.id = n.id and n.next_on is not null;
  get diagnostics n = row_count;
  moved := moved + n;

  with today_by_user as (
    select p.id as uid, (now() at time zone coalesce(p.timezone, 'UTC'))::date as today
    from public.profiles p
  ),
  next_dates as (
    select s.id, (
      select min(d) from public.plan_occurrences(
        s.next_renewal_on, s.cycle::text, t.today, (t.today + interval '5 years')::date,
        s.anchor_day
      ) d where d >= t.today
    ) as next_on
    from public.subscriptions s
    join today_by_user t on t.uid = s.user_id
    where s.active and s.next_renewal_on is not null and s.next_renewal_on < t.today
  )
  update public.subscriptions s
     set next_renewal_on = n.next_on
    from next_dates n
   where s.id = n.id and n.next_on is not null;
  get diagnostics n = row_count;
  moved := moved + n;

  return moved;
end;
$$;

revoke all on function public.roll_schedules_forward() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- A set period has an end
-- --------------------------------------------------------------------------

do $$
begin
  alter table public.bills
    add constraint bills_period_has_end check (recurrence <> 'period' or ends_on is not null) not valid;
exception when duplicate_object then null;
end $$;

alter table public.bills validate constraint bills_period_has_end;

-- --------------------------------------------------------------------------
-- The next date is never inside a charged cycle, nor before the start
-- --------------------------------------------------------------------------

-- The first day of the cycle after the one a date falls in: the next Monday, the
-- next month's 1st (a set period's too), the next calendar quarter, the next year.
-- As nextCycleStart in src/lib/charges.ts. Null for no date.
create or replace function public.next_cycle_start(p_on date, p_recurrence text)
returns date
language sql
immutable
as $$
  select case p_recurrence
    when 'weekly' then (date_trunc('week', p_on) + interval '7 days')::date
    when 'monthly' then (date_trunc('month', p_on) + interval '1 month')::date
    when 'period' then (date_trunc('month', p_on) + interval '1 month')::date
    when 'quarterly' then (date_trunc('quarter', p_on) + interval '3 months')::date
    when 'yearly' then (date_trunc('year', p_on) + interval '1 year')::date
  end;
$$;

revoke all on function public.next_cycle_start(date, text) from public, anon, authenticated;

-- Security definer: plan_occurrences is the scheduler's alone, and a person's edit
-- runs these as them. greatest() leaves out a floor part that is null (no start,
-- no charge).
create or replace function public.bills_next_due_floor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_floor date;
begin
  if new.next_due_on is null then
    return new;
  end if;
  v_floor := greatest(
    new.starts_on,
    public.next_cycle_start(
      (select max(c.charged_on) from public.charges c where c.bill_id = new.id),
      new.recurrence::text));
  if v_floor is not null and new.next_due_on < v_floor then
    new.next_due_on := coalesce(
      (select min(d) from public.plan_occurrences(
         new.next_due_on, new.recurrence::text, v_floor,
         (v_floor + interval '5 years')::date, new.anchor_day) d),
      new.next_due_on);
  end if;
  return new;
end;
$$;

create or replace function public.subscriptions_next_due_floor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_floor date;
begin
  if new.next_renewal_on is null then
    return new;
  end if;
  v_floor := greatest(
    new.started_on,
    public.next_cycle_start(
      (select max(c.charged_on) from public.charges c where c.subscription_id = new.id),
      new.cycle::text));
  if v_floor is not null and new.next_renewal_on < v_floor then
    new.next_renewal_on := coalesce(
      (select min(d) from public.plan_occurrences(
         new.next_renewal_on, new.cycle::text, v_floor,
         (v_floor + interval '5 years')::date, new.anchor_day) d),
      new.next_renewal_on);
  end if;
  return new;
end;
$$;

-- Named to run after bills_anchor_day / subscriptions_anchor_day: triggers on one
-- event run in name order.
drop trigger if exists bills_next_due_floor on public.bills;
create trigger bills_next_due_floor
  before insert or update on public.bills
  for each row execute function public.bills_next_due_floor();

drop trigger if exists subscriptions_next_due_floor on public.subscriptions;
create trigger subscriptions_next_due_floor
  before insert or update on public.subscriptions
  for each row execute function public.subscriptions_next_due_floor();

-- Rows already stored before their floor. The date is written as it is, so the
-- anchor-day trigger keeps the anchor and the floor trigger moves the date.
update public.bills b
   set next_due_on = b.next_due_on
 where b.next_due_on < greatest(
         b.starts_on,
         public.next_cycle_start(
           (select max(c.charged_on) from public.charges c where c.bill_id = b.id),
           b.recurrence::text));
update public.subscriptions s
   set next_renewal_on = s.next_renewal_on
 where s.next_renewal_on < greatest(
         s.started_on,
         public.next_cycle_start(
           (select max(c.charged_on) from public.charges c where c.subscription_id = s.id),
           s.cycle::text));

-- --------------------------------------------------------------------------
-- Set periods already running: the months since their start
-- --------------------------------------------------------------------------

-- The recorder's own selection and window (record_due_charges): a bill with a next
-- date that counts toward spending, from its start (or the day it was made) to the
-- person's today or its end. A month already charged is left as it is. Each is
-- written already read: a catch-up is not news, so it sends no push and stays
-- out of the notifications list too.
insert into public.charges
  (user_id, bill_id, label, amount, charged_on, card_id, bank_account_id, notification_dismissed_at)
select b.user_id, b.id, coalesce(nullif(b.name, ''), 'Bill'), b.amount, o.d, b.card_id, b.bank_account_id, now()
from public.bills b
cross join lateral (select public.anchor_today(b.user_id) as today) t
cross join lateral public.plan_occurrences(
  b.next_due_on,
  'period',
  coalesce(b.starts_on, b.created_at::date),
  least(t.today, coalesce(b.ends_on, t.today)),
  b.anchor_day
) o(d)
where b.recurrence = 'period'
  and b.next_due_on is not null
  and b.in_spending
  and not exists (
    select 1 from public.charges c
    where c.bill_id = b.id
      and date_trunc('month', c.charged_on) = date_trunc('month', o.d)
  )
on conflict do nothing;

-- Then each one's next date, as the roller would move it.
with next_dates as (
  select b.id, (
    select min(d) from public.plan_occurrences(
      b.next_due_on, 'period', t.today, (t.today + interval '5 years')::date, b.anchor_day
    ) d where d >= t.today
  ) as next_on
  from public.bills b
  cross join lateral (select public.anchor_today(b.user_id) as today) t
  where b.recurrence = 'period'
    and b.next_due_on is not null
    and b.next_due_on < t.today
)
update public.bills b
   set next_due_on = n.next_on
  from next_dates n
 where b.id = n.id and n.next_on is not null;

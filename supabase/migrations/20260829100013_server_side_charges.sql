-- 0030 · Recording charges on the server, not on the phone
--
-- Charges have been written by whoever was holding the phone: the app swept on
-- open, worked out what had come due, and inserted it. That is why a bill that
-- fell due on Tuesday appeared on Thursday when the app was next opened — and
-- why a "this went out" push was impossible, since nothing on the server knew
-- it had.
--
-- The same arithmetic moves here. It is a port, not a rewrite: the dates this
-- produces must match src/lib/card-ledger.ts occurrence for occurrence, or the
-- two would disagree about somebody's history depending on who wrote it first.
-- The unique indexes are the backstop — both sides can run, and the second one
-- to reach a date is refused rather than doubling it.

/**
 * Every time a plan lands inside a window, walked out from its stored anchor.
 *
 * Recurrence is taken as text so bills and subscriptions can share it; they
 * carry the same idea under two enum names.
 *
 * The step range is computed rather than searched. Walking a fixed 600 either
 * way would work and would do twelve hundred date shifts per plan per run;
 * solving for which steps can possibly land in the window does a handful.
 */
create or replace function public.plan_occurrences(
  p_anchor date,
  p_recurrence text,
  p_from date,
  p_to date
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

  -- A one-off does not repeat: it happens on its date and never again.
  if p_recurrence = 'period' then
    if p_anchor <= p_to and (p_from is null or p_anchor >= p_from) then
      return next p_anchor;
    end if;
    return;
  end if;

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

  months := case p_recurrence
    when 'monthly' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
  if months is null then return; end if;

  anchor_day := extract(day from p_anchor)::int;

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
    -- charges on the 30th rather than skidding into the month after.
    d := base + make_interval(days => least(
      anchor_day,
      extract(day from (base + interval '1 month - 1 day'))::int
    ) - 1);

    if d <= p_to and (p_from is null or d >= p_from) then return next d; end if;
  end loop;
end;
$$;

/**
 * Writes down every occurrence that has come due and is not recorded yet.
 *
 * Returns what it wrote, so the caller can announce it. Nothing is announced
 * that was not actually inserted — `on conflict do nothing` means a second run,
 * or the phone getting there first, returns no rows and sends no push.
 *
 * "Come due" is measured in the user's own day. A bill due today should not be
 * recorded at nine in the evening UTC for somebody for whom it is still
 * yesterday afternoon.
 */
create or replace function public.record_due_charges()
returns table (
  user_id     uuid,
  label       text,
  amount      numeric,
  charged_on  date
)
language sql
security definer
set search_path = public
as $$
  with today_by_user as (
    select p.id as uid, (now() at time zone coalesce(p.timezone, 'UTC'))::date as today
    from public.profiles p
  ),
  plans as (
    select
      b.user_id, b.id as bill_id, null::uuid as subscription_id,
      coalesce(nullif(b.name, ''), 'Bill') as label, b.amount,
      b.recurrence::text as recurrence, b.next_due_on as anchor,
      -- The same floor the screens read with: the plan's own start when it has
      -- one, and the day the row was made when it does not. Without it a bill
      -- added today back-fills every month behind it.
      coalesce(b.starts_on, b.created_at::date) as floor_on,
      b.ends_on, b.card_id, b.bank_account_id, t.today
    from public.bills b
    join today_by_user t on t.uid = b.user_id
    where b.next_due_on is not null

    union all

    select
      s.user_id, null::uuid, s.id,
      coalesce(nullif(s.name, ''), 'Subscription'), s.amount,
      s.cycle::text, s.next_renewal_on,
      coalesce(s.started_on, s.created_at::date),
      null::date, s.card_id, s.bank_account_id, t.today
    from public.subscriptions s
    join today_by_user t on t.uid = s.user_id
    where s.active and s.next_renewal_on is not null
  ),
  due as (
    select p.*, o.d as occurred_on
    from plans p
    cross join lateral public.plan_occurrences(
      p.anchor,
      p.recurrence,
      p.floor_on,
      -- Never past today, and never past the day the plan stopped.
      least(p.today, coalesce(p.ends_on, p.today))
    ) o(d)
    where p.floor_on is not null
  ),
  written as (
    insert into public.charges (
      user_id, bill_id, subscription_id, label, amount, charged_on,
      card_id, bank_account_id
    )
    select
      d.user_id, d.bill_id, d.subscription_id, d.label, d.amount, d.occurred_on,
      d.card_id, d.bank_account_id
    from due d
    -- The expected outcome, not an exceptional one: the phone may have
    -- recorded the same day a moment earlier.
    on conflict do nothing
    returning charges.user_id, charges.label, charges.amount, charges.charged_on
  )
  select * from written;
$$;

/**
 * Advances every schedule whose stored date has slipped into the past.
 *
 * Runs after recording, never before. The stored anchor is what occurrences
 * are walked from, so moving it first would step straight over the very date
 * being written down.
 */
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
        b.next_due_on, b.recurrence::text, t.today, (t.today + interval '5 years')::date
      ) d where d >= t.today
    ) as next_on
    from public.bills b
    join today_by_user t on t.uid = b.user_id
    where b.next_due_on is not null
      and b.recurrence <> 'period'
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
        s.next_renewal_on, s.cycle::text, t.today, (t.today + interval '5 years')::date
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

revoke all on function public.plan_occurrences(date, text, date, date) from public, anon, authenticated;
revoke all on function public.record_due_charges() from public, anon, authenticated;
revoke all on function public.roll_schedules_forward() from public, anon, authenticated;

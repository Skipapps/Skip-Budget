-- 20261013300001 · Month-end dates keep their day
--
-- A bill or subscription stores one date, the next time it lands, and every
-- other occurrence is walked from it. Within one walk a monthly, quarterly or
-- yearly step clamps to short months from the stored day, which is right. But
-- both rollers (roll_schedules_forward here, rollSchedulesForward on the phone)
-- saved the clamped date as the new stored date. Rent due on the 31st became
-- the 30th for good after April and the 28th after February, and the walk back
-- moved its history with it. A loan's bill drifted from the start: save_loan
-- stores the first payment, which is already clamped (28 Feb for day 31).
--
-- anchor_day is the day those steps return to. Step 0 is the stored date
-- itself; every other step is the anchor day, clamped only for the month it
-- lands in. With no anchor day the stored date's own day is used, which is the
-- walk as it was. Weekly and set-period plans ignore it. src/lib/card-ledger.ts
-- walks the same way, date for date (supabase/checks/month_end_anchor.sql holds
-- the shared table).
--
-- The app never writes anchor_day. The triggers below own it, so a build that
-- has never heard of the column saves a bill exactly as a new one does:
-- - a new row takes its date's day, unless the writer gave one (save_loan);
-- - a writer that sets anchor_day (update_loan) keeps it;
-- - a date left alone or cleared (a stopped plan) keeps the anchor;
-- - weekly and set periods follow the date;
-- - a loan's bill keeps its payment day, whatever writes its dates;
-- - a roll keeps the anchor and lands on it: the stored date was on or before
--   the person's today and the new one is on or after their yesterday, whole
--   steps later, on either the anchor day or the old phone roller's day (the
--   old day clamped to the new month). The day either side is for a phone
--   whose own day is not its profile zone's yet (just travelled, or no zone
--   stored). An older build's roll is snapped back onto the anchor;
-- - anything else is the person picking a new day, which becomes the anchor.
--
-- Rows are filled from what they store, so a date that has already drifted
-- keeps its drifted day; supabase/reports/month_end_drift.sql lists those for
-- a decision. Loan bills are the exception: their day is known
-- (loans.payment_day, or the first payment's day), and a loan bill's next date
-- that fell short of it is moved onto it.
--
-- Pay drifted the same way, and a fixed walk would find a drifted month unpaid
-- on its right day, so a monthly salary is now paid at most once a calendar
-- month, whoever writes it (pay_received_one_per_month, at the end).

alter table public.bills
  add column if not exists anchor_day smallint check (anchor_day between 1 and 31);

alter table public.subscriptions
  add column if not exists anchor_day smallint check (anchor_day between 1 and 31);

comment on column public.bills.anchor_day is
  'Day of the month monthly, quarterly and yearly steps return to, clamped to short months. Set by triggers; null: the stored date''s day.';
comment on column public.subscriptions.anchor_day is
  'Day of the month monthly, quarterly and yearly renewals return to, clamped to short months. Set by triggers; null: the stored date''s day.';

-- --------------------------------------------------------------------------
-- Filling the anchor for rows already saved
-- --------------------------------------------------------------------------

update public.subscriptions
   set anchor_day = extract(day from next_renewal_on)::smallint
 where anchor_day is null
   and next_renewal_on is not null;

-- A loan's day is read as the payoff functions and the app's schedule read it:
-- the payment day, else the first payment's (the bill's start standing in for
-- a loan saved without one). Filled even with no next date, so a bill a payoff
-- stopped comes back on its day when the payoff is removed.
update public.bills b
   set anchor_day = coalesce(
         (select coalesce(
                   l.payment_day::integer,
                   extract(day from coalesce(l.first_payment_on, b.starts_on))::integer)
            from public.loans l
           where l.bill_id = b.id),
         extract(day from b.next_due_on)::integer)
 where b.anchor_day is null
   and (b.next_due_on is not null
        or exists (select 1 from public.loans l where l.bill_id = b.id));

-- A loan bill's next date that fell short of its payment day goes onto it, in
-- the same month: the first payment stays where it is, and a date already on
-- the day, or past it, is not moved. Nor is one inside the term that the
-- payment day would carry past the bill's end: the term ends off the payment
-- day there, so the stored date is the nearer of the two.
with loan_dates as (
  select
    b.id,
    b.next_due_on,
    b.ends_on,
    coalesce(l.first_payment_on, b.starts_on) as first_on,
    date_trunc('month', b.next_due_on)::date
      + least(
          b.anchor_day::integer,
          extract(day from (date_trunc('month', b.next_due_on) + interval '1 month - 1 day'))::integer
        ) - 1 as on_day
  from public.bills b
  join public.loans l on l.bill_id = b.id
  where b.next_due_on is not null
    and b.anchor_day is not null
)
update public.bills b
   set next_due_on = d.on_day
  from loan_dates d
 where b.id = d.id
   and d.next_due_on > d.first_on
   and d.next_due_on < d.on_day
   and (d.ends_on is null or d.on_day <= d.ends_on or d.next_due_on > d.ends_on);

-- --------------------------------------------------------------------------
-- The walk: plan_occurrences takes the anchor day
-- --------------------------------------------------------------------------

-- Dropped first, as save_loan was in 20261012100001: a new parameter makes a
-- new signature, and two overloads matching one call is an error. The new one
-- defaults it to null, so a four-argument call resolves here and returns what
-- it always did. record_due_charges and roll_schedules_forward name it only
-- inside their bodies, which hold no dependency on it; both are recreated below.
drop function if exists public.plan_occurrences(date, text, date, date);

-- 0030's walk with the anchor day; nothing else in it changes.
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

-- 20261012100001's recorder, with one change: each plan walks from its anchor day.
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
      b.anchor_day,
      -- The same floor the screens read with: the plan's own start when it has
      -- one, and the day the row was made when it does not. Without it a bill
      -- added today back-fills every month behind it.
      coalesce(b.starts_on, b.created_at::date) as floor_on,
      b.ends_on, b.card_id, b.bank_account_id, t.today
    from public.bills b
    join today_by_user t on t.uid = b.user_id
    where b.next_due_on is not null
      and b.in_spending

    union all

    select
      s.user_id, null::uuid, s.id,
      coalesce(nullif(s.name, ''), 'Subscription'), s.amount,
      s.cycle::text, s.next_renewal_on,
      s.anchor_day,
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
      least(p.today, coalesce(p.ends_on, p.today)),
      p.anchor_day
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

-- 0030's roller, with one change: the next date lands on the anchor day, so the
-- stored date is never the clamped one carried forward.
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

-- Replacing keeps a function's grants; restated so this file reads whole.
revoke all on function public.record_due_charges() from public, anon, authenticated;
revoke all on function public.roll_schedules_forward() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- save_loan and update_loan store the payment day as the bill's anchor
-- --------------------------------------------------------------------------

-- 20261012100001's save_loan with one change: the bill's anchor_day is the
-- payment day. Its first date stays the first payment, clamped or not, and
-- every later one is walked from the payment day.
create or replace function public.save_loan(
  p_name                text,
  p_icon_id             text,
  p_principal           numeric,
  p_annual_rate         numeric,
  p_term_months         integer,
  p_monthly_payment     numeric,
  p_total_interest      numeric,
  p_first_payment_on    date,
  p_recurrence          public.bill_recurrence default 'monthly',
  p_card_id             uuid default null,
  p_bank_account_id     uuid default null,
  p_funded_on           date default null,
  p_day_count_basis     text default 'actual/365',
  p_statement_on        date default null,
  p_statement_principal numeric default null,
  p_payment_overrides   jsonb default null,
  p_last_payment_on     date default null,
  p_in_spending         boolean default true,
  -- integer, though the column is smallint: Postgres does not cast an integer
  -- argument down to smallint when it picks the function, so `=> 31` from SQL
  -- would find no save_loan at all.
  p_payment_day         integer default null,
  p_counts_from         date default null
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bill public.bills;
  v_day integer;
  v_month date;
  v_last_month date;
  v_term_ends_on date;
  v_ends_on date;
  v_starts_on date;
  v_next_due_on date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_term_months is null or p_term_months < 1 then
    raise exception 'a loan needs at least one payment';
  end if;

  -- Refused before the term's end is worked out from it; the column's check
  -- is the backstop.
  if p_payment_day is not null and (p_payment_day < 1 or p_payment_day > 31) then
    raise exception 'the payment day must be between 1 and 31';
  end if;

  -- The term's last payment, on the payment day clamped to that month's end.
  -- Not first + (term - 1) months: from a clamped 28 Feb, Postgres keeps the
  -- 28th, which ends the bill early and refuses a valid last payment date.
  v_day := coalesce(p_payment_day, extract(day from p_first_payment_on)::integer);
  v_last_month := (date_trunc('month', p_first_payment_on)
                   + make_interval(months => p_term_months - 1))::date;
  v_term_ends_on := v_last_month + least(
    v_day,
    extract(day from (v_last_month + interval '1 month - 1 day'))::integer
  ) - 1;

  if p_last_payment_on is not null
     and (p_last_payment_on < p_first_payment_on or p_last_payment_on > v_term_ends_on) then
    raise exception 'the last payment must fall within the term';
  end if;

  v_ends_on := coalesce(p_last_payment_on, v_term_ends_on);
  v_starts_on := greatest(p_first_payment_on, coalesce(p_counts_from, p_first_payment_on));
  v_next_due_on := p_first_payment_on;

  if v_starts_on > v_ends_on then
    -- Every payment was made before the loan was added: none of them counts and
    -- none is still to come, so the bill has no next date (as a stopped bill).
    -- starts_on stays the first payment, because it may not pass ends_on.
    v_starts_on := p_first_payment_on;
    v_next_due_on := null;
  elsif v_starts_on > p_first_payment_on and p_recurrence = 'monthly' then
    -- The next payment from the floor on, rather than the first one for the
    -- sweep to roll later. Until then the bill would show a payment made years
    -- ago as due, and editing the bill saves the date it shows as its floor,
    -- which would write every earlier payment as spending. Computed here, not
    -- with plan_occurrences: that is the scheduler's alone, and this runs as
    -- the caller.
    v_month := date_trunc('month', v_starts_on)::date;
    v_next_due_on := v_month + least(
      v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
    ) - 1;
    if v_next_due_on < v_starts_on then
      v_month := (v_month + interval '1 month')::date;
      v_next_due_on := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
    end if;
    -- A last payment off the payment day can leave none after the floor.
    if v_next_due_on > v_ends_on then
      v_next_due_on := null;
    end if;
  end if;

  insert into public.bills (
    user_id, name, amount, category_id, icon_id,
    recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id,
    anchor_day,
    in_spending
  )
  values (
    v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
    p_recurrence, v_next_due_on, v_starts_on, v_ends_on,
    p_card_id, p_bank_account_id,
    v_day,
    coalesce(p_in_spending, true)
  )
  returning * into v_bill;

  -- The loans checks refuse a malformed payment_overrides or payment_day,
  -- which rolls the bill back with it: neither is saved.
  insert into public.loans (
    user_id, bill_id, principal, annual_rate, term_months,
    monthly_payment, total_interest, first_payment_on,
    funded_on, day_count_basis, statement_on, statement_principal,
    payment_overrides, payment_day
  )
  values (
    v_user, v_bill.id, p_principal, p_annual_rate, p_term_months,
    p_monthly_payment, p_total_interest, p_first_payment_on,
    -- Default the opening period to a month when the caller does not say.
    coalesce(p_funded_on, (p_first_payment_on - interval '1 month')::date),
    coalesce(p_day_count_basis, 'actual/365'),
    p_statement_on, p_statement_principal,
    p_payment_overrides, p_payment_day
  );

  return v_bill;
end;
$$;


-- Replacing keeps a function's grants; restated so this file reads whole.
revoke all on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date,
  boolean, integer, date
) from public, anon;

grant execute on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date,
  boolean, integer, date
) to authenticated;

-- 20261012100003's update_loan with one change: the bill's anchor_day follows
-- the payment day, so changing the day moves every later payment.
-- update_loan_and_charges calls this by name and is unchanged.
create or replace function public.update_loan(
  p_bill_id           uuid,
  p_name              text,
  p_icon_id           text,
  p_principal         numeric,
  p_annual_rate       numeric,
  p_term_months       integer,
  p_monthly_payment   numeric,
  p_total_interest    numeric,
  p_first_payment_on  date,
  p_funded_on         date,
  p_day_count_basis   text,
  p_card_id           uuid,
  p_bank_account_id   uuid,
  -- Null leaves the switch as it is.
  p_in_spending       boolean,
  -- integer for the reason given in 20261012100001: an integer argument is not
  -- cast down to smallint when Postgres picks the function.
  p_payment_day       integer default null,
  p_payment_overrides jsonb default null,
  p_last_payment_on   date default null,
  -- The person's day; null reads it off their profile's timezone.
  p_today             date default null
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bill public.bills;
  v_was_first date;
  v_tz text;
  v_today date;
  v_in_spending boolean;
  v_day integer;
  v_first_month date;
  v_month date;
  v_last_month date;
  v_term_ends_on date;
  v_ends_on date;
  v_last_charged date;
  v_floor date;
  v_starts_on date;
  v_from date;
  v_next_due_on date;
  v_paid_off_on date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_term_months is null or p_term_months < 1 then
    raise exception 'a loan needs at least one payment';
  end if;

  if p_first_payment_on is null then
    raise exception 'a loan needs its first payment date';
  end if;

  if p_payment_day is not null and (p_payment_day < 1 or p_payment_day > 31) then
    raise exception 'the payment day must be between 1 and 31';
  end if;

  -- Locked, so two edits of one loan cannot interleave their reads and writes.
  select * into v_bill from public.bills where id = p_bill_id for update;
  if not found then
    raise exception 'there is no such loan' using errcode = 'P0002';
  end if;
  select l.first_payment_on into v_was_first from public.loans l where l.bill_id = p_bill_id;
  if not found then
    raise exception 'there is no such loan' using errcode = 'P0002';
  end if;

  -- Runs as the caller, so these see only the caller's own rows. The foreign
  -- keys alone would take anyone's card.
  if p_card_id is not null and not exists (select 1 from public.cards where id = p_card_id) then
    raise exception 'the card is not one of yours';
  end if;
  if p_bank_account_id is not null
     and not exists (select 1 from public.bank_accounts where id = p_bank_account_id) then
    raise exception 'the account is not one of yours';
  end if;

  v_tz := coalesce((select p.timezone from public.profiles p where p.id = v_user), 'UTC');
  v_today := coalesce(p_today, (now() at time zone v_tz)::date);
  v_in_spending := coalesce(p_in_spending, v_bill.in_spending);

  -- The term's end, exactly as save_loan works it out.
  v_day := coalesce(p_payment_day, extract(day from p_first_payment_on)::integer);
  v_first_month := date_trunc('month', p_first_payment_on)::date;
  v_last_month := (v_first_month + make_interval(months => p_term_months - 1))::date;
  v_term_ends_on := v_last_month + least(
    v_day,
    extract(day from (v_last_month + interval '1 month - 1 day'))::integer
  ) - 1;

  if p_last_payment_on is not null
     and (p_last_payment_on < p_first_payment_on or p_last_payment_on > v_term_ends_on) then
    raise exception 'the last payment must fall within the term';
  end if;

  v_ends_on := coalesce(p_last_payment_on, v_term_ends_on);

  select max(c.charged_on) into v_last_charged from public.charges c where c.bill_id = p_bill_id;

  -- greatest() skips nulls: no floor set since, no charge or no switch leaves
  -- that part out.
  v_floor := greatest(
    (v_bill.created_at at time zone v_tz)::date,
    case when v_bill.starts_on > v_was_first then v_bill.starts_on end,
    (date_trunc('month', v_last_charged) + interval '1 month')::date,
    case when v_in_spending and not v_bill.in_spending then v_today end
  );
  v_starts_on := greatest(p_first_payment_on, v_floor);

  -- The schedule's next payment from the floor or today, whichever is later:
  -- the first payment, then the payment day (clamped) of each month after it.
  -- The date the sweep would roll to, so the bill never shows a payment from
  -- before it counts as due.
  v_from := greatest(v_starts_on, v_today);
  if v_from <= p_first_payment_on then
    v_next_due_on := p_first_payment_on;
  else
    v_month := greatest(date_trunc('month', v_from)::date, (v_first_month + interval '1 month')::date);
    v_next_due_on := v_month + least(
      v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
    ) - 1;
    if v_next_due_on < v_from then
      v_month := (v_month + interval '1 month')::date;
      v_next_due_on := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
    end if;
  end if;

  if v_starts_on > v_ends_on then
    -- Nothing in the term counts: as save_loan, no next date, and starts_on on
    -- the first payment because it may not pass ends_on.
    v_starts_on := p_first_payment_on;
    v_next_due_on := null;
  elsif v_next_due_on > v_ends_on then
    -- Every payment that counts is on or before today. Anchored on the last of
    -- them rather than left without a date: the recorders skip a bill with no
    -- next date, so one that fell due since they last ran would be lost.
    v_month := date_trunc('month', v_ends_on)::date;
    v_next_due_on := v_month + least(
      v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
    ) - 1;
    if v_next_due_on > v_ends_on then
      v_month := (v_month - interval '1 month')::date;
      v_next_due_on := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
    end if;
    if v_month <= v_first_month then
      v_next_due_on := p_first_payment_on;
    end if;
    if v_next_due_on < v_starts_on then
      v_next_due_on := null;
    end if;
  end if;

  -- The change: a paid-off loan stays ended on its payoff day, or stopped
  -- when that comes before it counts (as record_loan_payoff ends it). The
  -- dates the edit gives it otherwise go to the payoff, for removing it to
  -- put back.
  select p.paid_on into v_paid_off_on
    from public.loan_payoffs p where p.bill_id = p_bill_id and p.kind = 'full';
  if found then
    update public.loan_payoffs
       set bill_ends_on_before = v_ends_on,
           bill_next_due_on_before =
             case when least(v_ends_on, v_paid_off_on) < v_starts_on then v_next_due_on end
     where bill_id = p_bill_id and kind = 'full';
    v_ends_on := least(v_ends_on, v_paid_off_on);
    if v_ends_on < v_starts_on then
      v_ends_on := v_starts_on;
      v_next_due_on := null;
    end if;
  end if;

  -- A loan's own recurrence and category: the dates above are monthly, and a
  -- loan bill the bill form moved under another category comes back.
  update public.bills
     set name            = p_name,
         amount          = p_monthly_payment,
         category_id     = 'loans',
         icon_id         = p_icon_id,
         recurrence      = 'monthly',
         next_due_on     = v_next_due_on,
         starts_on       = v_starts_on,
         ends_on         = v_ends_on,
         anchor_day      = v_day,
         card_id         = p_card_id,
         bank_account_id = p_bank_account_id,
         in_spending     = v_in_spending
   where id = p_bill_id
  returning * into v_bill;

  -- The loans checks refuse a malformed payment_overrides (now against the new
  -- term) or payment_day, which rolls the bill's update back with it.
  update public.loans
     set principal         = p_principal,
         annual_rate       = p_annual_rate,
         term_months       = p_term_months,
         monthly_payment   = p_monthly_payment,
         total_interest    = p_total_interest,
         first_payment_on  = p_first_payment_on,
         funded_on         = coalesce(p_funded_on, (p_first_payment_on - interval '1 month')::date),
         day_count_basis   = coalesce(p_day_count_basis, 'actual/365'),
         payment_overrides = p_payment_overrides,
         payment_day       = p_payment_day
   where bill_id = p_bill_id;

  return v_bill;
end;
$$;

-- Replacing keeps a function's grants; restated so this file reads whole.
revoke all on function public.update_loan(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) from public, anon;

grant execute on function public.update_loan(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) to authenticated;

-- --------------------------------------------------------------------------
-- Who sets the anchor
-- --------------------------------------------------------------------------

-- What an update leaves as the anchor, and the date to store with it. Apart
-- from the triggers, so every case can be checked on a fixed "today".
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
  v_months := case p_new_every when 'monthly' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;

  -- (c) Weekly and set periods have no day of the month to keep.
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

-- The person's own day, as the recorders and the reminders read it. A zone
-- Postgres does not know must not stop a bill from saving, so it reads as UTC.
create or replace function public.anchor_today(p_user uuid)
returns date
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_zone text := coalesce((select p.timezone from public.profiles p where p.id = p_user), 'UTC');
begin
  return (now() at time zone v_zone)::date;
exception when invalid_parameter_value then
  return (now() at time zone 'UTC')::date;
end;
$$;

revoke all on function public.anchor_today(uuid) from public, anon, authenticated;

-- Security definer, as charges_one_per_cycle: it reads the owner's profile and
-- loan whoever writes the row, the app as the person or the scheduler.
create or replace function public.bills_anchor_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kept record;
begin
  if tg_op = 'INSERT' then
    new.anchor_day := coalesce(new.anchor_day::integer, extract(day from new.next_due_on)::integer);
    return new;
  end if;

  select * into v_kept from public.anchor_after_update(
    old.next_due_on,
    new.next_due_on,
    old.anchor_day,
    new.anchor_day,
    old.recurrence::text,
    new.recurrence::text,
    exists (select 1 from public.loans l where l.bill_id = new.id),
    -- Only a moved date can be a roll; the profile is not read otherwise.
    case when old.next_due_on is not null and new.next_due_on is not null
              and new.next_due_on <> old.next_due_on
         then public.anchor_today(new.user_id) end
  );

  new.anchor_day := v_kept.anchor_day;
  new.next_due_on := v_kept.due_on;
  return new;
end;
$$;

create or replace function public.subscriptions_anchor_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kept record;
begin
  if tg_op = 'INSERT' then
    new.anchor_day := coalesce(new.anchor_day::integer, extract(day from new.next_renewal_on)::integer);
    return new;
  end if;

  select * into v_kept from public.anchor_after_update(
    old.next_renewal_on,
    new.next_renewal_on,
    old.anchor_day,
    new.anchor_day,
    old.cycle::text,
    new.cycle::text,
    false,
    case when old.next_renewal_on is not null and new.next_renewal_on is not null
              and new.next_renewal_on <> old.next_renewal_on
         then public.anchor_today(new.user_id) end
  );

  new.anchor_day := v_kept.anchor_day;
  new.next_renewal_on := v_kept.due_on;
  return new;
end;
$$;

-- Created after the fill above, so filling is not read as an edit.
drop trigger if exists bills_anchor_day on public.bills;
create trigger bills_anchor_day
  before insert or update on public.bills
  for each row execute function public.bills_anchor_day();

drop trigger if exists subscriptions_anchor_day on public.subscriptions;
create trigger subscriptions_anchor_day
  before insert or update on public.subscriptions
  for each row execute function public.subscriptions_anchor_day();

-- --------------------------------------------------------------------------
-- One pay a month for a monthly salary, whoever writes it
-- --------------------------------------------------------------------------
--
-- Pay was unique per day (pay_received_once_a_day), not per month. The phone
-- writes pay by walking the salary's paydays from the last one on record, and
-- that walk drifted as the rollers did: a salary paid on the 31st was written
-- on the 28th, then the 28th every month after. With the walk fixed, a month
-- already written on its drifted day looks unpaid on its right day (28 Sep on
-- record, 30 Sep due), and an older build still walks the drifted days, so the
-- same month could be paid twice by whichever phone gets there.
--
-- So the rule lives here, under every writer, as charges_one_per_cycle does for
-- bills: a monthly salary is paid at most once per calendar month. A second
-- pay in a month already paid is dropped rather than refused, the way the
-- unique index is met with "on conflict do nothing": the writer is a catch-up
-- loop, and an error would stop the rest of the person's pay from being
-- written. Other frequencies pay more than once a month and are left alone, as
-- is a pay whose salary has been removed. Pay already recorded is not touched.
--
-- Security invoker: the person writes their own pay and can read their own
-- salary and pay. A pay naming someone else's salary reads no frequency here
-- and is refused by pay_received_own_rows, which runs after this.

create or replace function public.pay_received_one_per_month()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.salary_source_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.salary_sources s
    where s.id = new.salary_source_id and s.frequency = 'monthly'
  ) then
    return new;
  end if;

  if exists (
    select 1
    from public.pay_received p
    where p.salary_source_id = new.salary_source_id
      and p.id <> new.id
      and date_trunc('month', p.paid_on) = date_trunc('month', new.paid_on)
  ) then
    return null;
  end if;

  return new;
end;
$$;

comment on function public.pay_received_one_per_month() is
  'Drops a second pay for the same monthly salary within one calendar month, whichever writer records it.';

drop trigger if exists pay_received_one_per_month on public.pay_received;
create trigger pay_received_one_per_month
  before insert on public.pay_received
  for each row execute function public.pay_received_one_per_month();

-- Checks for set periods in 20261013600005_period_and_next_due_floor.sql. LOCAL database only, with
-- it applied: everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/period_monthly.sql
--
-- A set period repeats monthly on its anchor day from its start to its end, and must have an end.
-- The date-for-date walk is the shared table in month_end_anchor.sql; here the rest of the server
-- follows it: the anchor rules, one charge a month, the roller, the recorder inside the period,
-- the reminder. Then the migration's own back-fill statements, on the shape of the one live
-- period bill (from 5 Sep 2026 to 5 Feb 2027 on the 5th, charged 5 Sep): the months since its
-- start written once, quietly (no push, already read), and its next date moved on. The scheduler
-- works on the real clock, so what the back-fill writes is worked out from today.
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c9', 'period@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000c9') on conflict (id) do nothing;
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000c9';
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00c9', '00000000-0000-0000-0000-0000000000c9', 'Period card');

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

create or replace function pg_temp.expect_error(p_sql text, p_state text, p_words text default null)
returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate <> p_state or (p_words is not null and position(p_words in sqlerrm) = 0) then
      raise exception 'wrong refusal: % % (wanted % %)', sqlstate, sqlerrm, p_state, p_words;
    end if;
    raise notice 'ok  refused: %', sqlerrm;
    return;
  end;
  raise exception 'expected a refusal for: %', p_sql;
end $$;

create or replace function pg_temp.today() returns date
language sql stable as $$ select (now() at time zone 'UTC')::date $$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$
  select * from public.bills where name = p_name and user_id = '00000000-0000-0000-0000-0000000000c9'
$$;

create or replace function pg_temp.src(p_name text) returns text
language sql as $$ select prosrc from pg_proc where proname = p_name and pronamespace = 'public'::regnamespace $$;

create or replace function pg_temp.times(p_text text, p_piece text) returns integer
language sql immutable as $$ select (length(p_text) - length(replace(p_text, p_piece, ''))) / length(p_piece) $$;

-- ---------------------------------------------------------------- each body is its source, with only the period lines
select pg_temp.check(
  pg_temp.times(pg_temp.src('plan_occurrences'), $h$  if p_anchor is null or p_to is null then return; end if;

$h$) = 1
  and pg_temp.times(pg_temp.src('plan_occurrences'), $h$  -- A set period repeats monthly; its own start and end bound the window the
  -- callers walk it in.
$h$) = 1
  and pg_temp.times(pg_temp.src('plan_occurrences'), $h$    when 'monthly' then 1 when 'period' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
$h$) = 1
  and md5(replace(replace(replace(pg_temp.src('plan_occurrences'),
        $h$  if p_anchor is null or p_to is null then return; end if;

$h$,
        $h$  if p_anchor is null or p_to is null then return; end if;

  -- A one-off does not repeat: it happens on its date and never again.
  if p_recurrence = 'period' then
    if p_anchor <= p_to and (p_from is null or p_anchor >= p_from) then
      return next p_anchor;
    end if;
    return;
  end if;

$h$),
        $h$  -- A set period repeats monthly; its own start and end bound the window the
  -- callers walk it in.
$h$,
        $h$$h$),
        $h$    when 'monthly' then 1 when 'period' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
$h$,
        $h$    when 'monthly' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
$h$)) = '20eb7f4bc61df19aa6dc9ed3d71b0f12',
  'plan_occurrences is 20261013300001''s with only a set period walked as monthly');
select pg_temp.check(
  pg_temp.times(pg_temp.src('anchor_after_update'), $h$  v_months := case p_new_every when 'monthly' then 1 when 'period' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
$h$) = 1
  and pg_temp.times(pg_temp.src('anchor_after_update'), $h$  -- (c) Weekly has no day of the month to keep.
$h$) = 1
  and md5(replace(replace(pg_temp.src('anchor_after_update'),
        $h$  v_months := case p_new_every when 'monthly' then 1 when 'period' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
$h$,
        $h$  v_months := case p_new_every when 'monthly' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
$h$),
        $h$  -- (c) Weekly has no day of the month to keep.
$h$,
        $h$  -- (c) Weekly and set periods have no day of the month to keep.
$h$)) = 'f11c2b2ed6bccbf41f6884344876ff76',
  'anchor_after_update is 20261013300001''s with only a set period counted as a month');
select pg_temp.check(
  pg_temp.times(pg_temp.src('charges_one_per_cycle'), $h$    when 'period' then 'month'
$h$) = 1
  and md5(replace(pg_temp.src('charges_one_per_cycle'),
        $h$    when 'period' then 'month'
$h$,
        $h$$h$)) = 'b4db0cfcc9de266b6bb4983b3dc8e153',
  'charges_one_per_cycle is 20260928100003''s with only a set period charged once a month');
select pg_temp.check(
  pg_temp.times(pg_temp.src('roll_schedules_forward'), $h$    where b.next_due_on is not null
$h$) = 1
  and md5(replace(pg_temp.src('roll_schedules_forward'),
        $h$    where b.next_due_on is not null
$h$,
        $h$    where b.next_due_on is not null
      and b.recurrence <> 'period'
$h$)) = '645392f1e2572cc52157744f4a490267',
  'roll_schedules_forward is 20261013300001''s with only set periods rolled too');
select pg_temp.check(
  md5(pg_temp.src('record_due_charges')) = '88c5594cb93ac7d8d8a3f569151c1ea8'
  and md5(pg_temp.src('reminders_due')) = 'a77e563c57a6ea7edef540a16b2b1fde',
  'record_due_charges and reminders_due are not recreated: they follow the walk and the stored date');

-- ---------------------------------------------------------------- a set period has an end
select pg_temp.check(
  (select convalidated from pg_constraint
    where conname = 'bills_period_has_end' and conrelid = 'public.bills'::regclass),
  'the rule is on bills, and every row on the database keeps it');
select pg_temp.expect_error(
  $s$insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on)
     values ('00000000-0000-0000-0000-0000000000c9', 'No end', 10, 'other', 'period', '2026-11-01', '2026-11-01')$s$,
  '23514', 'bills_period_has_end');
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on)
values ('00000000-0000-0000-0000-0000000000c9', 'Course', 120, 'education', 'period', '2026-11-01', '2026-11-01', '2027-04-01'),
       ('00000000-0000-0000-0000-0000000000c9', 'Open monthly', 30, 'other', 'monthly', '2026-11-01', '2026-11-01', null);
select pg_temp.check(
  (pg_temp.bill('Course')).ends_on = '2027-04-01' and (pg_temp.bill('Open monthly')).ends_on is null,
  'a set period with an end saves, and a monthly bill still needs none');
select pg_temp.expect_error(
  $s$update public.bills set ends_on = null where name = 'Course' and user_id = '00000000-0000-0000-0000-0000000000c9'$s$,
  '23514', 'bills_period_has_end');
select pg_temp.expect_error(
  $s$update public.bills set recurrence = 'period' where name = 'Open monthly' and user_id = '00000000-0000-0000-0000-0000000000c9'$s$,
  '23514', 'bills_period_has_end');
-- "Keep past" on a set period, as stopBillValues writes it (the end brought to today, or a stop
-- with no next date when it counts from later): the rule holds, so both save.
update public.bills set starts_on = pg_temp.today(), ends_on = pg_temp.today(), next_due_on = null
 where name = 'Course' and user_id = '00000000-0000-0000-0000-0000000000c9';
select pg_temp.check(
  (pg_temp.bill('Course')).ends_on = pg_temp.today() and (pg_temp.bill('Course')).next_due_on is null,
  'stopping a set period still saves');

-- ---------------------------------------------------------------- the anchor, the cycle, the walk
create or replace function pg_temp.after(
  p_old date, p_new date, p_old_anchor integer, p_new_anchor integer, p_every text, p_today date)
returns text
language sql as $$
  select coalesce(a.anchor_day::text, '-') || ' ' || coalesce(a.due_on::text, '-')
  from public.anchor_after_update(p_old, p_new, p_old_anchor, p_new_anchor, p_every, p_every, false, p_today) a
$$;
select pg_temp.check(
  pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'period', '2027-05-15') = '31 2027-05-31'
  and pg_temp.after('2027-01-31', '2027-02-28', 31, 31, 'period', '2027-02-01') = '31 2027-02-28',
  'a set period keeps its anchor through a roll, as a monthly plan: 30 Apr rolled lands on 31 May');
select pg_temp.check(
  pg_temp.after('2027-04-30', '2027-05-15', 31, 31, 'period', '2027-05-01') = '15 2027-05-15'
  and pg_temp.after('2027-04-30', '2027-04-30', 31, 31, 'period', '2027-05-01') = '31 2027-04-30',
  'a set period moved to another day takes it; a date left alone keeps the anchor');

select pg_temp.check(
  (select array_agg(d order by d) from public.plan_occurrences('2026-09-05', 'period', '2026-09-05', '2027-02-05', 5) d)
  = array['2026-09-05', '2026-10-05', '2026-11-05', '2026-12-05', '2027-01-05', '2027-02-05']::date[]
  and (select array_agg(d order by d) from public.plan_occurrences('2026-09-05', 'period', '2026-09-05', '2027-02-05') d)
  = array['2026-09-05', '2026-10-05', '2026-11-05', '2026-12-05', '2027-01-05', '2027-02-05']::date[],
  'the live bill''s period walks the 5th of every month from 5 Sep to 5 Feb, four arguments or five');

insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on, card_id)
values ('00000000-0000-0000-0000-0000000000c9', 'Monthly once', 40, 'other', 'period', '2026-10-05', '2026-09-05', '2027-02-05',
        '00000000-0000-0000-0000-0000000c00c9');
insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
values ('00000000-0000-0000-0000-0000000000c9', (pg_temp.bill('Monthly once')).id, 'x', 40, '2026-10-05',
        '00000000-0000-0000-0000-0000000c00c9'),
       ('00000000-0000-0000-0000-0000000000c9', (pg_temp.bill('Monthly once')).id, 'x', 40, '2026-10-20',
        '00000000-0000-0000-0000-0000000c00c9'),
       ('00000000-0000-0000-0000-0000000000c9', (pg_temp.bill('Monthly once')).id, 'x', 40, '2026-11-05',
        '00000000-0000-0000-0000-0000000c00c9');
select pg_temp.check(
  (select array_agg(charged_on order by charged_on) from public.charges
    where bill_id = (pg_temp.bill('Monthly once')).id) = array['2026-10-05', '2026-11-05']::date[],
  'a set period is charged once a month: a second October charge is dropped, November''s is kept');

-- ---------------------------------------------------------------- the recorder, the roller, the reminder
-- On the real clock. A period that started three months back and ends next month, and one that
-- ended last month; both stored on their first payment and never recorded.
create temp table win as
select (date_trunc('month', pg_temp.today()) - interval '3 months')::date + 9 as started,
       (date_trunc('month', pg_temp.today()) + interval '1 month')::date + 9 as ends_running,
       (date_trunc('month', pg_temp.today()) - interval '1 month')::date + 9 as ends_ended;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on, card_id)
select '00000000-0000-0000-0000-0000000000c9', v.name, 25, 'other', 'period', w.started, w.started, v.ends_on,
       '00000000-0000-0000-0000-0000000c00c9'
from win w, lateral (values ('Running period', w.ends_running), ('Ended period', w.ends_ended)) v(name, ends_on);

create temp table recorded as
select r.label, r.charged_on from public.record_due_charges() r
 where r.user_id = '00000000-0000-0000-0000-0000000000c9';
select pg_temp.check(
  (select array_agg(charged_on order by charged_on) from recorded where label = 'Running period')
  = (select array_agg(d::date order by d) from win,
       generate_series(win.started, pg_temp.today(), interval '1 month') d),
  'the recorder writes a running period''s 10th of every month from its start to today');
select pg_temp.check(
  (select array_agg(charged_on order by charged_on) from recorded where label = 'Ended period')
  = (select array_agg(d::date order by d) from win,
       generate_series(win.started, win.ends_ended, interval '1 month') d),
  'and an ended one''s only up to its end');

select public.roll_schedules_forward();
select pg_temp.check(
  (pg_temp.bill('Running period')).next_due_on
  = (select min(d)::date from win, generate_series(win.started, win.started + interval '2 years', interval '1 month') d
      where d >= pg_temp.today())
  and (pg_temp.bill('Running period')).anchor_day = 10,
  'the roller moves a set period on to its next 10th, as a monthly plan, anchor kept');

insert into public.reminders (user_id, bill_id, lead_days, remind_at)
select '00000000-0000-0000-0000-0000000000c9', (pg_temp.bill('Running period')).id,
       (pg_temp.bill('Running period')).next_due_on - pg_temp.today(), '00:00'
where (pg_temp.bill('Running period')).next_due_on - pg_temp.today() <= 30;
select pg_temp.check(
  not exists (select 1 from public.reminders where bill_id = (pg_temp.bill('Running period')).id)
  or exists (select 1 from public.reminders_due() r
              where r.user_id = '00000000-0000-0000-0000-0000000000c9' and r.title = 'Running period'),
  'its reminder fires for that next date');

-- ---------------------------------------------------------------- the back-fill of set periods already running
-- The live bill's shape: from 5 Sep 2026 to 5 Feb 2027 on the 5th, stored on its start, charged
-- 5 Sep and never since, as a period was walked before. Beside it, one kept out of spending and
-- a monthly bill, which the back-fill leaves alone. Planted with triggers off, as rows from
-- before the migration.
set local session_replication_role = replica;
insert into public.bills (id, user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on,
                          anchor_day, in_spending, card_id)
values ('00000000-0000-0000-0000-0000000aa811', '00000000-0000-0000-0000-0000000000c9', 'Live period', 500,
        'other', 'period', '2026-09-05', '2026-09-05', '2027-02-05', 5, true, '00000000-0000-0000-0000-0000000c00c9'),
       ('00000000-0000-0000-0000-0000000aa812', '00000000-0000-0000-0000-0000000000c9', 'Period kept out', 80,
        'other', 'period', '2026-09-05', '2026-09-05', '2027-02-05', 5, false, null),
       ('00000000-0000-0000-0000-0000000aa813', '00000000-0000-0000-0000-0000000000c9', 'Plain monthly', 60,
        'other', 'monthly', '2026-09-05', '2026-09-05', null, 5, true, null);
insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
values ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000aa811', 'Live period', 500,
        '2026-09-05', '00000000-0000-0000-0000-0000000c00c9');
set local session_replication_role = origin;

-- What the back-fill should write: every 5th after the one charged, up to today or the end.
create temp table live_want as
select d::date as on_day
from generate_series('2026-10-05'::date, least(pg_temp.today(), '2027-02-05'::date), interval '1 month') d;
create temp table live_next as
select min(d)::date as on_day
from generate_series('2026-09-05'::date, '2028-09-05'::date, interval '1 month') d
where d >= pg_temp.today();

-- The migration's own statements, as it runs them.
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

select pg_temp.check(
  (select coalesce(array_agg(charged_on order by charged_on), '{}') from public.charges
    where bill_id = '00000000-0000-0000-0000-0000000aa811' and charged_on > '2026-09-05')
  = (select coalesce(array_agg(on_day order by on_day), '{}') from live_want)
  and (select count(*) = 1 from public.charges
        where bill_id = '00000000-0000-0000-0000-0000000aa811' and charged_on = '2026-09-05'),
  'the live bill gets each month since its charge up to today written once (on 13 Oct 2026: 5 Oct)');
select pg_temp.check(
  (select bool_and(label = 'Live period' and amount = 500 and card_id = '00000000-0000-0000-0000-0000000c00c9'
                   and bank_account_id is null)
     from public.charges where bill_id = '00000000-0000-0000-0000-0000000aa811'),
  'each with the name, amount and card the recorder copies');
select pg_temp.check(
  (select count(*) > 0 and bool_and(notification_dismissed_at is not null) from public.charges
    where bill_id = '00000000-0000-0000-0000-0000000aa811' and charged_on > '2026-09-05')
  and (select notification_dismissed_at is null from public.charges
        where bill_id = '00000000-0000-0000-0000-0000000aa811' and charged_on = '2026-09-05')
  and (select bool_and(notification_dismissed_at is null) from public.charges
        where bill_id = (pg_temp.bill('Running period')).id),
  'what the back-fill writes is already read, so it never shows in the notifications list; '
  || 'the charge recorded before it, and the recorder''s own, still show');
select pg_temp.check(
  (pg_temp.bill('Live period')).next_due_on = (select on_day from live_next)
  and (pg_temp.bill('Live period')).anchor_day = 5,
  'and its next date moves to the first 5th from today (on 13 Oct 2026: 5 Nov), anchor kept');
select pg_temp.check(
  not exists (select 1 from public.charges where bill_id = '00000000-0000-0000-0000-0000000aa812')
  and not exists (select 1 from public.charges where bill_id = '00000000-0000-0000-0000-0000000aa813')
  and (pg_temp.bill('Plain monthly')).next_due_on = '2026-09-05',
  'a period kept out of spending gets no charges, and a monthly bill is left to the recorders');

create temp table live_after as
select (select count(*) from public.charges where bill_id = '00000000-0000-0000-0000-0000000aa811') as n,
       (pg_temp.bill('Live period')).next_due_on as next_on;

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

select pg_temp.check(
  (select n = (select count(*) from public.charges where bill_id = '00000000-0000-0000-0000-0000000aa811')
          and next_on = (pg_temp.bill('Live period')).next_due_on from live_after),
  'run again, it writes nothing and moves nothing');

create temp table announced as
select * from public.record_due_charges() r where r.user_id = '00000000-0000-0000-0000-0000000000c9';
select pg_temp.check(
  not exists (select 1 from announced where label = 'Live period'),
  'and the scheduler''s next run finds nothing of it to record, so no push says it went out');

rollback;
\echo ALL CHECKS PASSED

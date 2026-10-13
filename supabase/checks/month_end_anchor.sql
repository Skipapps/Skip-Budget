-- Checks for 20261013300001_month_end_anchor.sql. LOCAL database only, with it applied: everything
-- runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/month_end_anchor.sql
--
-- The date table below is src/__tests__/month-end/fixtures.ts's DATE_TABLE, character for
-- character (src/__tests__/api/month-end-parity.test.ts keeps them equal), so the phone's walk and
-- this one are held to the same dates. The trigger's cases are checked on fixed days through
-- anchor_after_update, then once each through the tables on the real clock, as the scheduler runs.
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a5', 'month-end@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000a5') on conflict (id) do nothing;
-- The recorder, the roller and the triggers work in the person's own day; UTC keeps it plain here.
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000a5';
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00a5', '00000000-0000-0000-0000-0000000000a5', 'Month end');

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

-- Refused with this SQLSTATE, and (when given) words in the message.
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

-- The last day of the month a date is in.
create or replace function pg_temp.month_end(p_on date) returns date
language sql immutable as $$ select (date_trunc('month', p_on) + interval '1 month - 1 day')::date $$;

-- A day of the month, clamped to the month a date is in.
create or replace function pg_temp.on_day(p_on date, p_day integer) returns date
language sql immutable as $$
  select date_trunc('month', p_on)::date + least(p_day, extract(day from pg_temp.month_end(p_on))::integer) - 1
$$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$
  select * from public.bills where name = p_name and user_id = '00000000-0000-0000-0000-0000000000a5'
$$;

create or replace function pg_temp.sub(p_name text) returns public.subscriptions
language sql as $$
  select * from public.subscriptions where name = p_name and user_id = '00000000-0000-0000-0000-0000000000a5'
$$;

create or replace function pg_temp.walk(p_anchor date, p_every text, p_from date, p_to date, p_day integer)
returns date[]
language sql as $$
  select coalesce(array_agg(d order by d), '{}') from public.plan_occurrences(p_anchor, p_every, p_from, p_to, p_day) d
$$;

-- 0030's walk exactly as it was before the anchor day, to hold the four-argument call to it.
create or replace function pg_temp.old_plan_occurrences(
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

-- ---------------------------------------------------------------- the schema
select pg_temp.check(
  (select bool_and(format_type(a.atttypid, a.atttypmod) = 'smallint' and not a.attnotnull)
     from pg_attribute a
    where a.attrelid in ('public.bills'::regclass, 'public.subscriptions'::regclass)
      and a.attname = 'anchor_day' and not a.attisdropped)
  and (select count(*) = 2 from pg_attribute
        where attrelid in ('public.bills'::regclass, 'public.subscriptions'::regclass)
          and attname = 'anchor_day' and not attisdropped),
  'bills and subscriptions each have a nullable smallint anchor_day');
select pg_temp.check(
  (select count(*) = 2 from pg_constraint
    where conrelid in ('public.bills'::regclass, 'public.subscriptions'::regclass)
      and pg_get_constraintdef(oid) ~ 'anchor_day >= 1.*anchor_day <= 31'),
  'and it is 1 to 31');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'plan_occurrences' and pronamespace = 'public'::regnamespace),
  'there is one plan_occurrences, so a call cannot match two');
select pg_temp.check(
  to_regprocedure('public.plan_occurrences(date, text, date, date)') is null
  and to_regprocedure('public.plan_occurrences(date, text, date, date, integer)') is not null,
  'the four-argument overload is gone; the new one takes the anchor day last');
select pg_temp.check(
  (select p.provolatile = 'i' and not p.prosecdef
          and pg_get_function_arguments(p.oid) like '%p_anchor_day integer DEFAULT NULL%'
     from pg_proc p where p.proname = 'plan_occurrences' and p.pronamespace = 'public'::regnamespace),
  'it is still immutable, and the anchor day defaults to none');
select pg_temp.check(
  not has_function_privilege('public', 'public.plan_occurrences(date, text, date, date, integer)', 'execute')
  and not has_function_privilege('anon', 'public.plan_occurrences(date, text, date, date, integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.plan_occurrences(date, text, date, date, integer)', 'execute'),
  'plan_occurrences is the scheduler''s alone, as before');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.record_due_charges()', 'execute')
  and not has_function_privilege('anon', 'public.record_due_charges()', 'execute')
  and not has_function_privilege('authenticated', 'public.roll_schedules_forward()', 'execute')
  and not has_function_privilege('anon', 'public.roll_schedules_forward()', 'execute')
  and (select bool_and(p.prosecdef and p.proconfig = array['search_path=public'] and pg_get_function_arguments(p.oid) = '')
         from pg_proc p where p.pronamespace = 'public'::regnamespace
          and p.proname in ('record_due_charges', 'roll_schedules_forward')),
  'the recorder and the roller keep their signatures, run as their owner, and only for the scheduler');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'save_loan' and pronamespace = 'public'::regnamespace)
  and (select count(*) = 1 from pg_proc where proname = 'update_loan' and pronamespace = 'public'::regnamespace)
  and has_function_privilege('authenticated', 'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date)', 'execute')
  and not has_function_privilege('anon', 'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date)', 'execute')
  and has_function_privilege('authenticated', 'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute')
  and not has_function_privilege('anon', 'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute')
  and (select bool_and(not p.prosecdef and p.proconfig = array['search_path=public'])
         from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('save_loan', 'update_loan')),
  'save_loan and update_loan keep one signature each, run as the caller, for signed-in people only');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.anchor_after_update(date,date,integer,integer,text,text,boolean,date)', 'execute')
  and not has_function_privilege('anon', 'public.anchor_after_update(date,date,integer,integer,text,text,boolean,date)', 'execute')
  and not has_function_privilege('authenticated', 'public.anchor_today(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.anchor_today(uuid)', 'execute'),
  'the trigger''s helpers are not callable from the app');
select pg_temp.check(
  (select array_agg(t.tgname::text || ' ' || t.tgrelid::regclass::text || ' ' || (t.tgtype & 2 = 2)::text
                    || ' ' || (t.tgtype & 4 = 4)::text || ' ' || (t.tgtype & 16 = 16)::text order by t.tgname)
     from pg_trigger t
    where t.tgname in ('bills_anchor_day', 'subscriptions_anchor_day', 'pay_received_one_per_month')
      and not t.tgisinternal)
  = array['bills_anchor_day bills true true true',
          'pay_received_one_per_month pay_received true true false',
          'subscriptions_anchor_day subscriptions true true true'],
  'the anchor triggers run before insert and update; the pay one before insert');

-- ---------------------------------------------------------------- one change each
-- Each recreated function, with this migration's lines taken back out, is the body it replaced,
-- to the byte (md5 of the source as 20261012200001 left it). The ones it must not touch are pinned.
create or replace function pg_temp.src(p_name text) returns text
language sql as $$ select prosrc from pg_proc where proname = p_name and pronamespace = 'public'::regnamespace $$;

-- How many times a piece of text occurs, so each piece taken out is known to be the only one.
create or replace function pg_temp.times(p_text text, p_piece text) returns integer
language sql immutable as $$ select (length(p_text) - length(replace(p_text, p_piece, ''))) / length(p_piece) $$;

select pg_temp.check(
  pg_temp.times(pg_temp.src('update_loan'), E'         anchor_day      = v_day,\n') = 1
  and md5(replace(pg_temp.src('update_loan'), E'         anchor_day      = v_day,\n', ''))
      = 'e13c129343f58382d38124abf1be0b1e',
  'update_loan is 20261012100003''s with one line added: anchor_day = v_day');
select pg_temp.check(
  pg_temp.times(pg_temp.src('save_loan'), E'card_id, bank_account_id,\n    anchor_day,\n') = 1
  and pg_temp.times(pg_temp.src('save_loan'), E'p_card_id, p_bank_account_id,\n    v_day,\n') = 1
  and md5(replace(replace(pg_temp.src('save_loan'),
        E'card_id, bank_account_id,\n    anchor_day,\n', E'card_id, bank_account_id,\n'),
        E'p_card_id, p_bank_account_id,\n    v_day,\n', E'p_card_id, p_bank_account_id,\n'))
      = '5223d6dacf0c4612ffe4b09d0e93d675',
  'save_loan is 20261012100001''s with anchor_day and its value added to the insert');
select pg_temp.check(
  pg_temp.times(pg_temp.src('record_due_charges'), E'      b.anchor_day,\n') = 1
  and pg_temp.times(pg_temp.src('record_due_charges'), E'      s.anchor_day,\n') = 1
  and md5(replace(replace(replace(pg_temp.src('record_due_charges'),
        E'      b.anchor_day,\n', ''), E'      s.anchor_day,\n', ''),
        E'      least(p.today, coalesce(p.ends_on, p.today)),\n      p.anchor_day\n',
        E'      least(p.today, coalesce(p.ends_on, p.today))\n'))
      = 'b2314db288ecde53ec0be6f0cb5e970d',
  'record_due_charges is 20261012100001''s, passing each plan''s anchor day');
select pg_temp.check(
  md5(replace(replace(pg_temp.src('roll_schedules_forward'),
        E'(t.today + interval ''5 years'')::date,\n        b.anchor_day\n', E'(t.today + interval ''5 years'')::date\n'),
        E'(t.today + interval ''5 years'')::date,\n        s.anchor_day\n', E'(t.today + interval ''5 years'')::date\n'))
      = 'e1c8cec489e5306db9175d19f8e6be75',
  'roll_schedules_forward is 0030''s, passing each plan''s anchor day');
select pg_temp.check(
  md5(replace(replace(replace(pg_temp.src('plan_occurrences'),
        E'  -- The day every step but the stored one returns to. Out of range (the\n'
        || E'  -- columns'' check stops it) reads as none, rather than a date in the wrong month.\n'
        || E'  anchor_day := case when p_anchor_day between 1 and 31 then p_anchor_day\n'
        || E'                     else extract(day from p_anchor)::int end;\n',
        E'  anchor_day := extract(day from p_anchor)::int;\n'),
        E' Never\n    -- clamped from the stored date: after a short month that is already\n'
        || E'    -- shortened, and every month after it would be too.\n',
        E'\n'),
        E'    -- The stored date stands as it is, even off the anchor day: a loan''s first\n'
        || E'    -- payment can be.\n    if s = 0 then d := p_anchor; end if;\n',
        ''))
      = '2b47124cb2460f892d4aff47c3e4fd6c',
  'plan_occurrences is 0030''s walk with the anchor day and the stored date kept as step 0');
select pg_temp.check(
  md5(pg_temp.src('reminders_due')) = 'a77e563c57a6ea7edef540a16b2b1fde'
  and md5(pg_temp.src('record_loan_payoff')) = '204b8f94c756989257be3abe5eae0fd6'
  and md5(pg_temp.src('delete_loan_payoff')) = 'e4c933f54c09d6dfa3d19ac0a59d3b46'
  and md5(pg_temp.src('update_loan_and_charges')) = '2302c2388e8e1f01dac6f2c78c57648b',
  'reminders_due, record_loan_payoff, delete_loan_payoff and update_loan_and_charges are untouched');

-- ---------------------------------------------------------------- the shared date table
create temp table date_table as select $table$
# Monthly, 2027, anchors 29, 30 and 31
2027-01-29 29 monthly   2027-01-01 2027-12-31 | 2027-01-29 2027-02-28 2027-03-29 2027-04-29 2027-05-29 2027-06-29 2027-07-29 2027-08-29 2027-09-29 2027-10-29 2027-11-29 2027-12-29
2027-01-30 30 monthly   2027-01-01 2027-12-31 | 2027-01-30 2027-02-28 2027-03-30 2027-04-30 2027-05-30 2027-06-30 2027-07-30 2027-08-30 2027-09-30 2027-10-30 2027-11-30 2027-12-30
2027-01-31 31 monthly   2027-01-01 2027-12-31 | 2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31

# Monthly, 2027, stored on a shortened day: both directions keep the anchor day
2027-02-28 29 monthly   2027-01-01 2027-12-31 | 2027-01-29 2027-02-28 2027-03-29 2027-04-29 2027-05-29 2027-06-29 2027-07-29 2027-08-29 2027-09-29 2027-10-29 2027-11-29 2027-12-29
2027-02-28 30 monthly   2027-01-01 2027-12-31 | 2027-01-30 2027-02-28 2027-03-30 2027-04-30 2027-05-30 2027-06-30 2027-07-30 2027-08-30 2027-09-30 2027-10-30 2027-11-30 2027-12-30
2027-02-28 31 monthly   2027-01-01 2027-12-31 | 2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31
2027-04-30 31 monthly   2027-01-01 2027-12-31 | 2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31
2027-09-30 31 monthly   2027-01-01 2027-12-31 | 2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31
2027-12-31 31 monthly   2027-01-01 2027-12-31 | 2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31

# Monthly, leap 2028, anchors 29, 30 and 31
2028-01-29 29 monthly   2028-01-01 2028-12-31 | 2028-01-29 2028-02-29 2028-03-29 2028-04-29 2028-05-29 2028-06-29 2028-07-29 2028-08-29 2028-09-29 2028-10-29 2028-11-29 2028-12-29
2028-01-30 30 monthly   2028-01-01 2028-12-31 | 2028-01-30 2028-02-29 2028-03-30 2028-04-30 2028-05-30 2028-06-30 2028-07-30 2028-08-30 2028-09-30 2028-10-30 2028-11-30 2028-12-30
2028-01-31 31 monthly   2028-01-01 2028-12-31 | 2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31

# Monthly, leap 2028, stored on a shortened day
2028-02-29 29 monthly   2028-01-01 2028-12-31 | 2028-01-29 2028-02-29 2028-03-29 2028-04-29 2028-05-29 2028-06-29 2028-07-29 2028-08-29 2028-09-29 2028-10-29 2028-11-29 2028-12-29
2028-02-29 30 monthly   2028-01-01 2028-12-31 | 2028-01-30 2028-02-29 2028-03-30 2028-04-30 2028-05-30 2028-06-30 2028-07-30 2028-08-30 2028-09-30 2028-10-30 2028-11-30 2028-12-30
2028-02-29 31 monthly   2028-01-01 2028-12-31 | 2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31
2028-06-30 31 monthly   2028-01-01 2028-12-31 | 2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31
2028-11-30 31 monthly   2028-01-01 2028-12-31 | 2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31

# Monthly, across both years
2027-06-30 31 monthly   2027-01-01 2028-12-31 | 2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31 2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31
2028-02-29 30 monthly   2027-01-01 2028-12-31 | 2027-01-30 2027-02-28 2027-03-30 2027-04-30 2027-05-30 2027-06-30 2027-07-30 2027-08-30 2027-09-30 2027-10-30 2027-11-30 2027-12-30 2028-01-30 2028-02-29 2028-03-30 2028-04-30 2028-05-30 2028-06-30 2028-07-30 2028-08-30 2028-09-30 2028-10-30 2028-11-30 2028-12-30
2027-02-28 29 monthly   2027-01-01 2028-12-31 | 2027-01-29 2027-02-28 2027-03-29 2027-04-29 2027-05-29 2027-06-29 2027-07-29 2027-08-29 2027-09-29 2027-10-29 2027-11-29 2027-12-29 2028-01-29 2028-02-29 2028-03-29 2028-04-29 2028-05-29 2028-06-29 2028-07-29 2028-08-29 2028-09-29 2028-10-29 2028-11-29 2028-12-29

# Monthly, windows wholly after, wholly before, one day, and between two dates
2027-01-31 31 monthly   2028-02-01 2028-04-30 | 2028-02-29 2028-03-31 2028-04-30
2028-12-31 31 monthly   2027-02-01 2027-04-30 | 2027-02-28 2027-03-31 2027-04-30
2027-01-31 31 monthly   2027-03-31 2027-03-31 | 2027-03-31
2027-01-31 31 monthly   2027-02-01 2027-02-27 |

# No anchor day: the stored date's own day, exactly as before there was one
2027-01-31  - monthly   2027-01-01 2027-12-31 | 2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31
2027-02-28  - monthly   2027-01-01 2027-12-31 | 2027-01-28 2027-02-28 2027-03-28 2027-04-28 2027-05-28 2027-06-28 2027-07-28 2027-08-28 2027-09-28 2027-10-28 2027-11-28 2027-12-28
2027-04-30  - monthly   2027-01-01 2027-12-31 | 2027-01-30 2027-02-28 2027-03-30 2027-04-30 2027-05-30 2027-06-30 2027-07-30 2027-08-30 2027-09-30 2027-10-30 2027-11-30 2027-12-30
2028-02-29  - monthly   2028-01-01 2028-12-31 | 2028-01-29 2028-02-29 2028-03-29 2028-04-29 2028-05-29 2028-06-29 2028-07-29 2028-08-29 2028-09-29 2028-10-29 2028-11-29 2028-12-29

# The stored date itself stands, even off the anchor day (a loan's first payment can be)
2027-02-10 31 monthly   2027-02-10 2027-06-30 | 2027-02-10 2027-03-31 2027-04-30 2027-05-31 2027-06-30
2027-03-15 31 monthly   2027-01-01 2027-06-30 | 2027-01-31 2027-02-28 2027-03-15 2027-04-30 2027-05-31 2027-06-30
2027-03-31 15 monthly   2027-01-01 2027-05-31 | 2027-01-15 2027-02-15 2027-03-31 2027-04-15 2027-05-15

# Quarterly, anchor 31
2027-01-31 31 quarterly 2027-01-01 2027-12-31 | 2027-01-31 2027-04-30 2027-07-31 2027-10-31
2027-04-30 31 quarterly 2027-01-01 2027-12-31 | 2027-01-31 2027-04-30 2027-07-31 2027-10-31
2027-04-30  - quarterly 2027-01-01 2027-12-31 | 2027-01-30 2027-04-30 2027-07-30 2027-10-30
2027-11-30 31 quarterly 2027-01-01 2028-12-31 | 2027-02-28 2027-05-31 2027-08-31 2027-11-30 2028-02-29 2028-05-31 2028-08-31 2028-11-30
2027-11-30  - quarterly 2027-01-01 2028-12-31 | 2027-02-28 2027-05-30 2027-08-30 2027-11-30 2028-02-29 2028-05-30 2028-08-30 2028-11-30

# Yearly, 29 February 2028
2028-02-29 29 yearly    2028-01-01 2032-12-31 | 2028-02-29 2029-02-28 2030-02-28 2031-02-28 2032-02-29
2028-02-29  - yearly    2028-01-01 2032-12-31 | 2028-02-29 2029-02-28 2030-02-28 2031-02-28 2032-02-29
2029-02-28 29 yearly    2028-01-01 2032-12-31 | 2028-02-29 2029-02-28 2030-02-28 2031-02-28 2032-02-29
2031-02-28 29 yearly    2028-01-01 2032-12-31 | 2028-02-29 2029-02-28 2030-02-28 2031-02-28 2032-02-29
2029-02-28  - yearly    2028-01-01 2032-12-31 | 2028-02-28 2029-02-28 2030-02-28 2031-02-28 2032-02-28

# Weekly and a set period have no day of the month to keep
2027-01-31 31 weekly    2027-02-01 2027-02-28 | 2027-02-07 2027-02-14 2027-02-21 2027-02-28
2027-02-28 31 weekly    2027-02-01 2027-03-31 | 2027-02-07 2027-02-14 2027-02-21 2027-02-28 2027-03-07 2027-03-14 2027-03-21 2027-03-28
2027-03-31 31 period    2027-01-01 2027-12-31 | 2027-03-31
2027-02-28 31 period    2027-01-01 2027-12-31 | 2027-02-28
$table$::text as body;

create temp table date_rows as
with lines as (
  select n, line
  from regexp_split_to_table((select body from date_table), E'\n') with ordinality as t(line, n)
),
kept as (
  select n, line from lines where btrim(line) <> '' and left(btrim(line), 1) <> '#'
),
parts as (
  select n, line,
         regexp_split_to_array(btrim(split_part(line, '|', 1)), '\s+') as inputs,
         btrim(split_part(line, '|', 2)) as outputs,
         array_length(string_to_array(line, '|'), 1) as bars
  from kept
)
select
  n, line, bars,
  array_length(inputs, 1) as n_inputs,
  inputs[1]::date as anchor,
  case when inputs[2] = '-' then null else inputs[2]::integer end as anchor_day,
  inputs[3] as recurrence,
  inputs[4]::date as from_on,
  inputs[5]::date as to_on,
  case when outputs = '' then '{}'::date[] else regexp_split_to_array(outputs, '\s+')::date[] end as dates
from parts;

select pg_temp.check(
  (select count(*) = 45 and bool_and(n_inputs = 5 and bars = 2) from date_rows),
  'the table reads as 45 rows, as the phone''s test reads it');

do $$
declare
  r record;
  got date[];
begin
  for r in select * from date_rows order by n loop
    got := pg_temp.walk(r.anchor, r.recurrence, r.from_on, r.to_on, r.anchor_day);
    if got is distinct from r.dates then
      raise exception 'FAILED: the walk disagrees with the table on line %: % gave %', r.n, r.line, got;
    end if;
    -- With no anchor day, the four-argument call is the same walk.
    if r.anchor_day is null
       and got is distinct from (select coalesce(array_agg(d order by d), '{}')
                                   from public.plan_occurrences(r.anchor, r.recurrence, r.from_on, r.to_on) d) then
      raise exception 'FAILED: the four-argument call disagrees on line %', r.n;
    end if;
  end loop;
end $$;
select pg_temp.check(true, 'every row of the table, date for date, on the server''s walk');

-- ---------------------------------------------------------------- four arguments, as before
-- Every stored day from December 2026 to March 2029, each recurrence, three windows: the output,
-- in its order, is the old function's.
create temp table old_vs_new as
select a.anchor, r.every, w.from_on, w.to_on,
       array(select * from pg_temp.old_plan_occurrences(a.anchor, r.every, w.from_on, w.to_on)) as was,
       array(select * from public.plan_occurrences(a.anchor, r.every, w.from_on, w.to_on)) as four,
       array(select * from public.plan_occurrences(a.anchor, r.every, w.from_on, w.to_on, null)) as null_day,
       array(select * from public.plan_occurrences(a.anchor, r.every, w.from_on, w.to_on,
                                                   extract(day from a.anchor)::integer)) as own_day
from (select g::date as anchor from generate_series('2026-12-01'::date, '2029-03-31'::date, interval '1 day') g) a
cross join (values ('weekly'), ('monthly'), ('quarterly'), ('yearly'), ('period'), ('fortnightly')) as r(every)
cross join (values ('2027-01-01'::date, '2028-12-31'::date),
                   (null::date, '2027-06-15'::date),
                   ('2028-02-01'::date, '2028-03-31'::date)) as w(from_on, to_on);

select pg_temp.check(
  (select count(*) = 852 * 6 * 3 and bool_and(four = was) from old_vs_new),
  'a four-argument call returns what the old walk did, date for date and in its order (15,336 walks)');
select pg_temp.check(
  (select bool_and(null_day = was and own_day = was) from old_vs_new),
  'and so does no anchor day, or the stored date''s own day');
select pg_temp.check(
  (select count(*) = 8129 from old_vs_new where cardinality(was) > 0)
  and (select bool_and(n > 0) from (select count(*) filter (where cardinality(was) > 0) as n
                                      from old_vs_new where every <> 'fortnightly' group by every) x),
  'and 8,129 of those walks find dates, in every recurrence the walk knows');
select pg_temp.check(
  (select count(*) = 0 from public.plan_occurrences(null, 'monthly', null, '2027-01-01', 31))
  and (select count(*) = 0 from public.plan_occurrences('2027-01-31', 'monthly', null, null, 31)),
  'no stored date or no end still walks nothing');
select pg_temp.check(
  pg_temp.walk('2027-01-31', 'monthly', '2027-01-01', '2027-04-30', 0)
    = pg_temp.walk('2027-01-31', 'monthly', '2027-01-01', '2027-04-30', null)
  and pg_temp.walk('2027-02-28', 'monthly', '2027-01-01', '2027-04-30', 32)
    = array['2027-01-28', '2027-02-28', '2027-03-28', '2027-04-28']::date[],
  'an anchor day out of range reads as none, never a date in another month');

-- ---------------------------------------------------------------- who sets the anchor, on fixed days
create or replace function pg_temp.after(
  p_old date, p_new date, p_old_anchor integer, p_new_anchor integer,
  p_old_every text, p_new_every text, p_loan boolean, p_today date)
returns text
language sql as $$
  select coalesce(a.anchor_day::text, '-') || ' ' || coalesce(a.due_on::text, '-')
  from public.anchor_after_update(p_old, p_new, p_old_anchor, p_new_anchor, p_old_every, p_new_every, p_loan, p_today) a
$$;

-- (a) the writer set the anchor
select pg_temp.check(pg_temp.after('2027-03-31', '2027-04-15', 31, 15, 'monthly', 'monthly', true, '2027-03-10') = '15 2027-04-15',
  '(a) a writer that changes the anchor keeps it, with its date as written');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 30, 'monthly', 'monthly', false, '2027-05-15') = '30 2027-05-30',
  '(a) even when the dates look like a roll');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-04-30', 31, null, 'monthly', 'monthly', false, '2027-05-15') = '- 2027-04-30',
  '(a) and a writer may clear it');
select pg_temp.check(pg_temp.after(null, '2027-04-30', null, 30, 'monthly', 'monthly', false, null) = '30 2027-04-30',
  '(a) from none');
-- (b) the date did not move, or was cleared
select pg_temp.check(pg_temp.after('2027-04-30', '2027-04-30', 31, 31, 'monthly', 'monthly', false, '2027-05-15') = '31 2027-04-30',
  '(b) an edit that leaves the date alone keeps the anchor');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-04-30', 31, 31, 'monthly', 'quarterly', false, '2027-05-15') = '31 2027-04-30',
  '(b) even when only the recurrence changes');
select pg_temp.check(pg_temp.after('2027-04-30', null, 31, 31, 'monthly', 'monthly', false, '2027-05-15') = '31 -',
  '(b) a stop clears the date and keeps the anchor for a restart');
select pg_temp.check(pg_temp.after(null, null, null, null, 'monthly', 'monthly', false, null) = '- -',
  '(b) no date before or after keeps none');
-- (c) weekly and set periods follow the date
select pg_temp.check(pg_temp.after('2027-01-31', '2027-02-07', 31, 31, 'weekly', 'weekly', false, '2027-02-01') = '7 2027-02-07',
  '(c) a weekly roll takes the new day');
select pg_temp.check(pg_temp.after('2027-03-31', '2027-06-15', 31, 31, 'period', 'period', false, '2027-04-01') = '15 2027-06-15',
  '(c) a set period takes the new day');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-07', 31, 31, 'monthly', 'weekly', false, '2027-05-01') = '7 2027-05-07',
  '(c) a monthly bill made weekly takes the new day');
select pg_temp.check(pg_temp.after('2027-01-31', '2027-02-07', 31, 31, 'weekly', 'weekly', true, '2027-02-01') = '7 2027-02-07',
  '(c) before (d): a weekly loan follows its date too');
-- (d) a loan keeps its payment day
select pg_temp.check(pg_temp.after('2027-02-28', '2027-03-28', 31, 31, 'monthly', 'monthly', true, '2027-03-01') = '31 2027-03-28',
  '(d) a loan bill keeps its anchor whatever writes its date, and the date as written');
select pg_temp.check(pg_temp.after('2027-02-10', '2027-05-03', 31, 31, 'monthly', 'monthly', true, '2027-01-01') = '31 2027-05-03',
  '(d) even a date the person typed');
select pg_temp.check(pg_temp.after(null, '2027-03-31', 31, 31, 'monthly', 'monthly', true, null) = '31 2027-03-31',
  '(d) and a stopped loan put back by removing its payoff');
-- (e) a roll keeps the anchor and lands on it
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', false, '2027-05-15') = '31 2027-05-31',
  '(e) the old phone roller''s 30 Apr to 30 May lands on 31 May');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-31', 31, 31, 'monthly', 'monthly', false, '2027-05-15') = '31 2027-05-31',
  '(e) the new roller''s 31 May stays');
select pg_temp.check(pg_temp.after('2027-01-31', '2027-02-28', 31, 31, 'monthly', 'monthly', false, '2027-02-01') = '31 2027-02-28',
  '(e) a roll into February lands on the 28th and keeps 31');
select pg_temp.check(pg_temp.after('2027-02-28', '2027-03-28', 31, 31, 'monthly', 'monthly', false, '2027-03-01') = '31 2027-03-31',
  '(e) and the old roller''s 28 March from there goes back to the 31st');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-07-30', 31, 31, 'monthly', 'monthly', false, '2027-07-15') = '31 2027-07-31',
  '(e) several months behind rolls in one step');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', false, '2027-05-30') = '31 2027-05-31',
  '(e) today on the new date is still a roll');
-- A phone's own day can be a day either side of its profile zone's (just travelled, no zone stored).
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', false, '2027-04-30') = '31 2027-05-31',
  '(e) a phone a day ahead rolls a date that is still today here: 30 Apr to 30 May lands on 31 May');
select pg_temp.check(pg_temp.after('2027-02-28', '2027-03-28', 31, 31, 'monthly', 'monthly', false, '2027-03-29') = '31 2027-03-31',
  '(e) a phone a day behind rolls to its own today, yesterday here: 28 Mar lands on 31 Mar');
select pg_temp.check(pg_temp.after('2027-03-31', '2027-04-30', 31, 31, 'monthly', 'monthly', false, '2027-05-01') = '31 2027-04-30',
  '(e) and a new build a day behind writing 30 Apr keeps the anchor 31');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-07-30', 31, 31, 'quarterly', 'quarterly', false, '2027-05-01') = '31 2027-07-31',
  '(e) quarterly: 30 Apr to 30 Jul lands on 31 Jul');
select pg_temp.check(pg_temp.after('2031-02-28', '2032-02-28', 29, 29, 'yearly', 'yearly', false, '2031-03-01') = '29 2032-02-29',
  '(e) yearly: a 29 Feb anchor comes back in the leap year');
select pg_temp.check(pg_temp.after('2028-02-29', '2029-02-28', 29, 29, 'yearly', 'yearly', false, '2028-03-01') = '29 2029-02-28',
  '(e) and keeps 29 through a short February');
select pg_temp.check(pg_temp.after('2027-02-28', '2027-03-28', null, null, 'monthly', 'monthly', false, '2027-03-01') = '28 2027-03-28',
  '(e) with no anchor, the stored day is kept');
-- (f) anything else is a new day
select pg_temp.check(pg_temp.after('2027-10-31', '2027-11-30', 31, 31, 'monthly', 'monthly', false, '2027-10-13') = '30 2027-11-30',
  '(f) moving a date that has not come yet is the person''s choice');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', false, '2027-04-29') = '30 2027-05-30',
  '(f) a date due tomorrow here has not come even a day ahead, so moving it is a choice');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', false, '2027-06-01') = '30 2027-05-30',
  '(f) nor one moved to two days ago, past even a day behind');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', false, '2027-05-31') = '31 2027-05-31',
  '(e) one moved to yesterday is a phone a day behind');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-15', 31, 31, 'monthly', 'monthly', false, '2027-05-01') = '15 2027-05-15',
  '(f) a past date moved to another day of the month');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-06-30', 31, 31, 'quarterly', 'quarterly', false, '2027-05-01') = '30 2027-06-30',
  '(f) a quarterly date moved by less than a quarter');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'quarterly', 'monthly', false, '2027-05-15') = '30 2027-05-30',
  '(f) a roll never changes the recurrence');
select pg_temp.check(pg_temp.after(null, '2027-05-30', 31, 31, 'monthly', 'monthly', false, '2027-05-15') = '30 2027-05-30',
  '(f) a stopped plan started again on a new date');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', false, null) = '30 2027-05-30',
  '(f) with no today, nothing is read as a roll');
select pg_temp.check(pg_temp.after('2027-04-30', '2027-05-30', 31, 31, 'monthly', 'monthly', null, '2027-05-15') = '31 2027-05-31',
  'an unknown loan flag reads as no loan');

-- ---------------------------------------------------------------- the triggers, through the tables
-- Inserts: the date's day unless the writer gave one.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day) values
  ('00000000-0000-0000-0000-0000000000a5', 'Ins: 31st', 10, 'housing', 'monthly', '2027-01-31', '2027-01-31', null),
  ('00000000-0000-0000-0000-0000000000a5', 'Ins: no date', 10, 'housing', 'monthly', null, null, null),
  ('00000000-0000-0000-0000-0000000000a5', 'Ins: given', 10, 'housing', 'monthly', '2027-02-28', '2027-02-28', 31),
  ('00000000-0000-0000-0000-0000000000a5', 'Ins: weekly', 10, 'housing', 'weekly', '2027-02-26', '2027-02-26', null);
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, category_id, active, anchor_day) values
  ('00000000-0000-0000-0000-0000000000a5', 'Ins: 30th', 9.99, 'monthly', '2027-04-30', 'other', true, null),
  ('00000000-0000-0000-0000-0000000000a5', 'Ins: no date', 9.99, 'monthly', null, 'other', true, null);
select pg_temp.check(
  (pg_temp.bill('Ins: 31st')).anchor_day = 31 and (pg_temp.bill('Ins: no date')).anchor_day is null
  and (pg_temp.bill('Ins: given')).anchor_day = 31 and (pg_temp.bill('Ins: weekly')).anchor_day = 26
  and (pg_temp.sub('Ins: 30th')).anchor_day = 30 and (pg_temp.sub('Ins: no date')).anchor_day is null,
  'a new row takes its date''s day, none without a date, and the writer''s when given');
select pg_temp.expect_error(
  $s$insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, anchor_day)
     values ('00000000-0000-0000-0000-0000000000a5', 'bad', 1, 'housing', 'monthly', '2027-01-31', 32)$s$,
  '23514', 'anchor_day');
select pg_temp.expect_error(
  $s$update public.subscriptions set anchor_day = 0 where name = 'Ins: 30th'$s$,
  '23514', 'anchor_day');

-- Updates as the app makes them: signed in, row security on.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

update public.bills set amount = 11, name = 'Upd: amount' where name = 'Ins: given';
select pg_temp.check(
  (pg_temp.bill('Upd: amount')).anchor_day = 31 and (pg_temp.bill('Upd: amount')).next_due_on = '2027-02-28',
  '(b) an edit that leaves the date alone keeps 31 on a bill stored on the 28th');

update public.bills set next_due_on = '2027-03-15' where name = 'Ins: 31st';
select pg_temp.check(
  (pg_temp.bill('Ins: 31st')).anchor_day = 15 and (pg_temp.bill('Ins: 31st')).next_due_on = '2027-03-15',
  '(f) the person moving a date that has not come yet makes its day the anchor');

update public.bills set next_due_on = '2027-03-05' where name = 'Ins: weekly';
select pg_temp.check((pg_temp.bill('Ins: weekly')).anchor_day = 5, '(c) a weekly bill''s anchor follows its date');

update public.bills set next_due_on = null where name = 'Upd: amount';
select pg_temp.check(
  (pg_temp.bill('Upd: amount')).anchor_day = 31 and (pg_temp.bill('Upd: amount')).next_due_on is null,
  '(b) a stop keeps the anchor');

update public.subscriptions set next_renewal_on = '2027-06-30' where name = 'Ins: 30th';
select pg_temp.check((pg_temp.sub('Ins: 30th')).anchor_day = 30, 'a subscription moved ahead takes the day it was given');

-- Rolls on the real clock. Each plan is stored on the 28th with an anchor of 31, as one that rolled
-- through February is; the phone writes what its roller finds, the old one the 28th again.
reset role;
select set_config('request.jwt.claims', '', true);

create temp table roll_case as
select
  (date_trunc('month', pg_temp.today()) - interval '1 month')::date + 27 as stored_on,
  case when date_trunc('month', pg_temp.today())::date + 27 >= pg_temp.today()
       then date_trunc('month', pg_temp.today())::date + 27
       else (date_trunc('month', pg_temp.today()) + interval '1 month')::date + 27 end as old_roller_on;
-- Read again below as the person.
grant select on roll_case to authenticated;

insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day, card_id)
select '00000000-0000-0000-0000-0000000000a5', v.name, 50, 'housing', 'monthly', r.stored_on, r.stored_on, 31,
       '00000000-0000-0000-0000-0000000c00a5'::uuid
from roll_case r, (values ('Phone: old roller'), ('Phone: new roller'), ('Phone: loan bill')) as v(name);
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, started_on, category_id, active, anchor_day)
select '00000000-0000-0000-0000-0000000000a5', 'Phone: old roller', 5, 'monthly', r.stored_on, r.stored_on,
       'other', true, 31
from roll_case r;
insert into public.loans (user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest,
                          first_payment_on, payment_day)
select '00000000-0000-0000-0000-0000000000a5', (pg_temp.bill('Phone: loan bill')).id, 1000, 5, 24, 50, 10,
       r.stored_on - 60, 31
from roll_case r;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

update public.bills set next_due_on = (select old_roller_on from roll_case) where name = 'Phone: old roller';
update public.bills set next_due_on = pg_temp.on_day((select old_roller_on from roll_case), 31) where name = 'Phone: new roller';
update public.bills set next_due_on = (select old_roller_on from roll_case) where name = 'Phone: loan bill';
update public.subscriptions set next_renewal_on = (select old_roller_on from roll_case) where name = 'Phone: old roller';

select pg_temp.check(
  (select (pg_temp.bill('Phone: old roller')).next_due_on = pg_temp.on_day(old_roller_on, 31)
          and (pg_temp.bill('Phone: old roller')).anchor_day = 31 from roll_case),
  '(e) an older build''s roll to the 28th lands on the anchor day of that month, today');
select pg_temp.check(
  (select (pg_temp.bill('Phone: new roller')).next_due_on = pg_temp.on_day(old_roller_on, 31)
          and (pg_temp.bill('Phone: new roller')).anchor_day = 31 from roll_case),
  '(e) a new build''s roll stays where it put it');
select pg_temp.check(
  (select (pg_temp.sub('Phone: old roller')).next_renewal_on = pg_temp.on_day(old_roller_on, 31)
          and (pg_temp.sub('Phone: old roller')).anchor_day = 31 from roll_case),
  '(e) and the same for a subscription');
select pg_temp.check(
  (select (pg_temp.bill('Phone: loan bill')).next_due_on = old_roller_on
          and (pg_temp.bill('Phone: loan bill')).anchor_day = 31 from roll_case),
  '(d) a loan bill keeps its payment day; its date is left as written');

-- Phones a day either side of the profile's zone. Ahead: the stored date is still today here and the
-- phone rolls it a month on. Behind: the phone's today, yesterday here, is the date it writes.
-- Stored off the anchor day, so the old roller's day and the anchor day differ on any date.
reset role;
select set_config('request.jwt.claims', '', true);
create temp table skew_case as
select pg_temp.today() as ahead_old,
       (date_trunc('month', pg_temp.today()) + interval '1 month')::date
         + least(extract(day from pg_temp.today())::integer,
                 extract(day from pg_temp.month_end((date_trunc('month', pg_temp.today()) + interval '1 month')::date))::integer)
         - 1 as ahead_new,
       pg_temp.today() - 1 as behind_new,
       -- The same day in the nearest month before that has it, as the old roller steps from.
       (select m + extract(day from pg_temp.today() - 1)::integer - 1
          from (select k, (date_trunc('month', pg_temp.today() - 1) - make_interval(months => k))::date as m
                  from generate_series(1, 3) k) x
         where extract(day from pg_temp.today() - 1) <= extract(day from pg_temp.month_end(m))
         order by k limit 1) as behind_old;
grant select on skew_case to authenticated;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day)
select '00000000-0000-0000-0000-0000000000a5', 'Skew: ahead', 20, 'housing', 'monthly', ahead_old, ahead_old, 31 from skew_case;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day)
select '00000000-0000-0000-0000-0000000000a5', 'Skew: behind', 20, 'housing', 'monthly', behind_old, behind_old, 31 from skew_case;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
update public.bills set next_due_on = (select ahead_new from skew_case) where name = 'Skew: ahead';
update public.bills set next_due_on = (select behind_new from skew_case) where name = 'Skew: behind';
select pg_temp.check(
  (select (pg_temp.bill('Skew: ahead')).next_due_on = pg_temp.month_end(ahead_new)
          and (pg_temp.bill('Skew: ahead')).anchor_day = 31 from skew_case),
  '(e) a phone a day ahead rolling today''s date lands on the anchor day and keeps it');
select pg_temp.check(
  (select (pg_temp.bill('Skew: behind')).next_due_on = pg_temp.month_end(behind_new)
          and (pg_temp.bill('Skew: behind')).anchor_day = 31 from skew_case),
  '(e) a phone a day behind rolling to its today, yesterday here, lands on the anchor day and keeps it');

-- An unknown zone on the profile must not stop a bill from saving: it reads as UTC.
reset role;
select set_config('request.jwt.claims', '', true);
update public.profiles set timezone = 'Nowhere/Never' where id = '00000000-0000-0000-0000-0000000000a5';
select pg_temp.check(public.anchor_today('00000000-0000-0000-0000-0000000000a5') = pg_temp.today(),
  'an unknown zone reads as UTC');
update public.bills set next_due_on = pg_temp.today() + 40 where name = 'Ins: weekly';
select pg_temp.check((pg_temp.bill('Ins: weekly')).next_due_on = pg_temp.today() + 40,
  'and a bill whose date moves still saves');
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000a5';
select pg_temp.check(public.anchor_today('00000000-0000-0000-0000-0000000000a5'::uuid) = pg_temp.today()
  and public.anchor_today('00000000-0000-0000-0000-00000000ffff'::uuid) = pg_temp.today(),
  'a known zone, or no profile at all, reads the day there');

-- ---------------------------------------------------------------- the server roll and its reminder
create temp table server_case as
select (date_trunc('month', pg_temp.today()) - interval '2 months')::date + 27 as stored_on;

insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day, card_id)
select '00000000-0000-0000-0000-0000000000a5', v.name, 75, 'housing', v.every::public.bill_recurrence,
       case when v.every = 'quarterly' then (date_trunc('month', pg_temp.today()) - interval '3 months')::date + 27
            else s.stored_on end,
       pg_temp.today(), v.anchor, '00000000-0000-0000-0000-0000000c00a5'::uuid
from server_case s,
     (values ('Server: 31', 'monthly', 31), ('Server: 30', 'monthly', 30), ('Server: quarterly 31', 'quarterly', 31),
             ('Server: weekly', 'weekly', 28), ('Server: loan', 'monthly', 31)) as v(name, every, anchor);
-- A loan bill's date is never snapped by its trigger, so this one shows the roller's own walk.
insert into public.loans (user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest,
                          first_payment_on, payment_day)
select '00000000-0000-0000-0000-0000000000a5', (pg_temp.bill('Server: loan')).id, 1000, 5, 24, 75, 10,
       (date_trunc('month', pg_temp.today()) - interval '3 months')::date + 27, 31;
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, started_on, category_id, active, anchor_day)
select '00000000-0000-0000-0000-0000000000a5', 'Server: 31', 7.5, 'monthly', s.stored_on, pg_temp.today(),
       'other', true, 31
from server_case s;
-- Stored on the 1st with anchor 31. From the 2nd on, the stored day's next one has passed this
-- month while the anchor day has not: only a walk from the anchor day finds this month.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, anchor_day)
select '00000000-0000-0000-0000-0000000000a5', 'Server: off-day', 75, 'housing', 'monthly',
       (date_trunc('month', pg_temp.today()) - interval '1 month')::date, pg_temp.today(), 31;
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, started_on, category_id, active, anchor_day)
select '00000000-0000-0000-0000-0000000000a5', 'Server: off-day', 7.5, 'monthly',
       (date_trunc('month', pg_temp.today()) - interval '1 month')::date, pg_temp.today(), 'other', true, 31;

insert into public.reminders (user_id, bill_id, lead_days, remind_at)
select '00000000-0000-0000-0000-0000000000a5', (pg_temp.bill('Server: 31')).id,
       pg_temp.month_end(pg_temp.today()) - pg_temp.today(), '00:00';

select public.roll_schedules_forward();

select pg_temp.check(
  (pg_temp.bill('Server: 31')).next_due_on = pg_temp.month_end(pg_temp.today())
  and (pg_temp.bill('Server: 31')).anchor_day = 31,
  'the server rolls a bill stored on the 28th with anchor 31 to the last day of this month');
select pg_temp.check(
  (pg_temp.bill('Server: 30')).next_due_on
    = case when pg_temp.on_day(pg_temp.today(), 30) >= pg_temp.today() then pg_temp.on_day(pg_temp.today(), 30)
           else pg_temp.on_day(pg_temp.month_end(pg_temp.today()) + 1, 30) end
  and (pg_temp.bill('Server: 30')).anchor_day = 30,
  'and one with anchor 30 to its 30th (or February''s end)');
select pg_temp.check(
  (pg_temp.bill('Server: loan')).next_due_on = pg_temp.month_end(pg_temp.today())
  and (pg_temp.bill('Server: loan')).anchor_day = 31,
  'a loan bill on its 28th rolls to its payment day, by the roller''s own walk');
select pg_temp.check(
  (pg_temp.bill('Server: quarterly 31')).next_due_on = pg_temp.month_end(pg_temp.today())
  and (pg_temp.bill('Server: quarterly 31')).anchor_day = 31,
  'a quarterly bill rolls to the anchor day of the month a quarter on');
select pg_temp.check(
  (pg_temp.sub('Server: 31')).next_renewal_on = pg_temp.month_end(pg_temp.today())
  and (pg_temp.sub('Server: 31')).anchor_day = 31,
  'a subscription rolls the same way');
select pg_temp.check(
  (pg_temp.bill('Server: off-day')).next_due_on = pg_temp.month_end(pg_temp.today())
  and (pg_temp.sub('Server: off-day')).next_renewal_on = pg_temp.month_end(pg_temp.today()),
  'a plan stored off its anchor day rolls to the anchor day this month, not the stored day next month');
select pg_temp.check(
  (pg_temp.bill('Server: weekly')).next_due_on >= pg_temp.today()
  and (pg_temp.bill('Server: weekly')).next_due_on < pg_temp.today() + 7
  and (pg_temp.bill('Server: weekly')).anchor_day = extract(day from (pg_temp.bill('Server: weekly')).next_due_on),
  'a weekly bill rolls by weeks and its anchor follows');
select pg_temp.check(
  (select pg_temp.walk((pg_temp.bill('Server: 31')).next_due_on, 'monthly',
                       (date_trunc('month', pg_temp.today()) - interval '3 months')::date,
                       pg_temp.month_end(pg_temp.today()), 31)
          = array(select pg_temp.month_end((date_trunc('month', pg_temp.today()) - make_interval(months => k))::date)
                    from generate_series(3, 0, -1) k)),
  'walked back from the rolled date, every month lands on its last day');

create temp table reminded as
select title, body from public.reminders_due() where user_id = '00000000-0000-0000-0000-0000000000a5';
select pg_temp.check(
  exists (select 1 from reminded where title = 'Server: 31'),
  'the reminder fires for the anchor day after the roll, not the 28th');

-- ---------------------------------------------------------------- loans
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

create or replace function pg_temp.save_on(p_name text, p_first date, p_term integer, p_extra text default '')
returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  execute format(
    $f$select (public.save_loan(
       p_name => %L, p_icon_id => 'loan-personal', p_principal => 5000, p_annual_rate => 9,
       p_term_months => %s, p_monthly_payment => 420, p_total_interest => 260,
       p_first_payment_on => %L, p_recurrence => 'monthly',
       p_card_id => '00000000-0000-0000-0000-0000000c00a5', p_bank_account_id => null,
       p_funded_on => null, p_day_count_basis => 'actual/365'%s)).id$f$,
    p_name, p_term, p_first, p_extra)
    into v_id;
  return v_id;
end $$;

select pg_temp.save_on('Loan: day 31 from 28 Feb', '2025-02-28', 3, $x$, p_payment_day => 31$x$);
select pg_temp.save_on('Loan: day 31 from 31 Jan', '2025-01-31', 4, $x$, p_payment_day => 31$x$);
select pg_temp.save_on('Loan: off-day first', '2025-02-10', 3, $x$, p_payment_day => 31$x$);
select pg_temp.save_on('Loan: no payment day', '2025-01-30', 3);
select pg_temp.save_on('Loan: counted from today', '2025-02-28', 36,
  format($x$, p_payment_day => 31, p_counts_from => %L$x$, '2026-10-12'));

select pg_temp.check(
  (select array_agg(name || ' ' || next_due_on || ' ' || anchor_day order by name) from public.bills
    where name like 'Loan: %')
  = array['Loan: counted from today 2026-10-31 31',
          'Loan: day 31 from 28 Feb 2025-02-28 31',
          'Loan: day 31 from 31 Jan 2025-01-31 31',
          'Loan: no payment day 2025-01-30 30',
          'Loan: off-day first 2025-02-10 31'],
  'save_loan stores the first payment as it is, and the payment day (or the first payment''s) as the anchor');

reset role;
select set_config('request.jwt.claims', '', true);
create temp table loan_recorded as select * from public.record_due_charges();

select pg_temp.check(
  (select array_agg(b.name || ' ' || c.charged_on order by b.name, c.charged_on)
     from public.charges c join public.bills b on b.id = c.bill_id
    where b.name in ('Loan: day 31 from 28 Feb', 'Loan: day 31 from 31 Jan', 'Loan: off-day first', 'Loan: no payment day'))
  = array['Loan: day 31 from 28 Feb 2025-02-28', 'Loan: day 31 from 28 Feb 2025-03-31', 'Loan: day 31 from 28 Feb 2025-04-30',
          'Loan: day 31 from 31 Jan 2025-01-31', 'Loan: day 31 from 31 Jan 2025-02-28',
          'Loan: day 31 from 31 Jan 2025-03-31', 'Loan: day 31 from 31 Jan 2025-04-30',
          'Loan: no payment day 2025-01-30', 'Loan: no payment day 2025-02-28', 'Loan: no payment day 2025-03-30',
          'Loan: off-day first 2025-02-10', 'Loan: off-day first 2025-03-31', 'Loan: off-day first 2025-04-30'],
  'the server records day 31 from 28 Feb on 31 Mar and 30 Apr, and an off-day first payment then the payment day');
select pg_temp.check(
  (select array_agg(d order by d) from pg_temp.old_plan_occurrences('2025-02-28', 'monthly', '2025-02-28', '2025-04-30') d)
  = array['2025-02-28', '2025-03-28', '2025-04-28']::date[],
  'where the old walk gave the 28th every month');

-- update_loan: changing the payment day moves the anchor; the other edits keep it.
create temp table upd_case as
select pg_temp.month_end((date_trunc('month', pg_temp.today()) + interval '2 months')::date) as first_on;
grant select on upd_case to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

select pg_temp.save_on('Edit: day', (select first_on from upd_case), 12, $x$, p_payment_day => 31$x$);

create or replace function pg_temp.update_on(p_fn text, p_day integer) returns void
language plpgsql as $$
begin
  execute format(
    $f$select public.%I(
       p_bill_id => %L, p_name => 'Edit: day', p_icon_id => 'loan-personal', p_principal => 5000,
       p_annual_rate => 9, p_term_months => 12, p_monthly_payment => 420, p_total_interest => 260,
       p_first_payment_on => %L, p_funded_on => null, p_day_count_basis => 'actual/365',
       p_card_id => '00000000-0000-0000-0000-0000000c00a5', p_bank_account_id => null,
       p_in_spending => null, p_payment_day => %s)$f$,
    p_fn, (pg_temp.bill('Edit: day')).id, (select first_on from upd_case), coalesce(p_day::text, 'null'));
end $$;

select pg_temp.update_on('update_loan', 15);
select pg_temp.check(
  (select (pg_temp.bill('Edit: day')).anchor_day = 15
          and (pg_temp.bill('Edit: day')).next_due_on = first_on
          and (select payment_day from public.loans where bill_id = (pg_temp.bill('Edit: day')).id) = 15
     from upd_case),
  'update_loan moving the payment day to the 15th moves the anchor with it');
-- plan_occurrences is the scheduler's alone, so the walk is read as its owner.
reset role;
select pg_temp.check(
  (select pg_temp.walk((pg_temp.bill('Edit: day')).next_due_on, 'monthly', first_on, first_on + 70,
                       (pg_temp.bill('Edit: day')).anchor_day)
          = array[first_on, pg_temp.on_day(first_on + 1, 15), pg_temp.on_day(pg_temp.month_end(first_on + 1) + 1, 15)]
     from upd_case),
  'so the first payment stays and the ones after it fall on the 15th');
set local role authenticated;
select pg_temp.update_on('update_loan', 15);
select pg_temp.check((pg_temp.bill('Edit: day')).anchor_day = 15, 'an edit that keeps the day keeps the anchor');
select pg_temp.update_on('update_loan', null);
select pg_temp.check(
  (select (pg_temp.bill('Edit: day')).anchor_day = extract(day from first_on) from upd_case),
  'an older build that sends no payment day anchors on the first payment''s day, as the loan itself reads');
select pg_temp.update_on('update_loan_and_charges', 31);
select pg_temp.check(
  (pg_temp.bill('Edit: day')).anchor_day = 31
  and (select payment_day from public.loans where bill_id = (pg_temp.bill('Edit: day')).id) = 31,
  'update_loan_and_charges, unchanged, reaches the same anchor');

-- Payoffs: the dates move, the anchor does not.
select public.save_loan(
  p_name => 'Payoff', p_icon_id => 'loan-personal', p_principal => 5000, p_annual_rate => 9,
  p_term_months => 12, p_monthly_payment => 420, p_total_interest => 260,
  p_first_payment_on => (select first_on from upd_case), p_recurrence => 'monthly',
  p_card_id => '00000000-0000-0000-0000-0000000c00a5', p_funded_on => pg_temp.today() - 30,
  p_payment_day => 31);
create temp table payoff_before as select next_due_on, anchor_day from public.bills where name = 'Payoff';

-- A day apart, so the full one is the latest by date: both are written at the same moment here.
select public.record_loan_payoff((pg_temp.bill('Payoff')).id, pg_temp.today() - 1, 100, 'partial',
  '00000000-0000-0000-0000-0000000c00a5', null);
select pg_temp.check(
  (pg_temp.bill('Payoff')).anchor_day = 31
  and (pg_temp.bill('Payoff')).next_due_on = (select next_due_on from payoff_before),
  'a partial payoff keeps the anchor');
create temp table full_payoff as
select (public.record_loan_payoff((pg_temp.bill('Payoff')).id, pg_temp.today(), 4000, 'full',
  '00000000-0000-0000-0000-0000000c00a5', null)).id;
select pg_temp.check(
  (pg_temp.bill('Payoff')).anchor_day = 31 and (pg_temp.bill('Payoff')).next_due_on is null,
  'a full payoff before the first payment stops the bill and keeps the anchor');
select public.delete_loan_payoff((select id from full_payoff));
select pg_temp.check(
  (pg_temp.bill('Payoff')).anchor_day = 31
  and (pg_temp.bill('Payoff')).next_due_on = (select next_due_on from payoff_before),
  'removing it puts the first payment back, on the same anchor');

-- ---------------------------------------------------------------- one pay a month
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000a5', 'Monthly', 2500, 'monthly', '2026-01-31'),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000a5', 'Twice', 1200, 'semimonthly', '2026-01-15'),
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-0000000000a5', 'Weekly', 600, 'weekly', '2026-01-02'),
  ('00000000-0000-0000-0000-00000000aa04', '00000000-0000-0000-0000-0000000000a5', 'Biweekly', 900, 'biweekly', '2026-01-02');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

create or replace function pg_temp.pay(p_salary text, p_on date) returns integer
language plpgsql as $$
declare
  n integer;
begin
  insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on)
  values ('00000000-0000-0000-0000-0000000000a5', p_salary::uuid, 'Pay', 100, p_on)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

select pg_temp.check(pg_temp.pay('00000000-0000-0000-0000-00000000aa01', '2026-09-28') = 1,
  'a monthly salary''s first pay in September is written');
select pg_temp.check(pg_temp.pay('00000000-0000-0000-0000-00000000aa01', '2026-09-30') = 0,
  'a second one in September is dropped, without an error');
select pg_temp.check(pg_temp.pay('00000000-0000-0000-0000-00000000aa01', '2026-09-28') = 0,
  'the same day again is still nothing');
select pg_temp.check(pg_temp.pay('00000000-0000-0000-0000-00000000aa01', '2026-10-31') = 1
  and pg_temp.pay('00000000-0000-0000-0000-00000000aa01', '2026-08-31') = 1,
  'the months either side are written');

-- One insert of several rows, as the phone writes a backlog: the second in a month is dropped.
insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on) values
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-00000000aa01', 'Pay', 100, '2026-11-28'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-00000000aa01', 'Pay', 100, '2026-11-30'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-00000000aa01', 'Pay', 100, '2026-12-31')
on conflict do nothing;
select pg_temp.check(
  (select array_agg(paid_on order by paid_on) from public.pay_received
    where salary_source_id = '00000000-0000-0000-0000-00000000aa01')
  = array['2026-08-31', '2026-09-28', '2026-10-31', '2026-11-28', '2026-12-31']::date[],
  'one pay a month is kept, the first one written');

select pg_temp.check(
  pg_temp.pay('00000000-0000-0000-0000-00000000aa02', '2026-09-15') = 1
  and pg_temp.pay('00000000-0000-0000-0000-00000000aa02', '2026-09-30') = 1,
  'a semimonthly salary is paid twice in a month');
select pg_temp.check(
  pg_temp.pay('00000000-0000-0000-0000-00000000aa03', '2026-09-04') = 1
  and pg_temp.pay('00000000-0000-0000-0000-00000000aa03', '2026-09-11') = 1
  and pg_temp.pay('00000000-0000-0000-0000-00000000aa03', '2026-09-18') = 1
  and pg_temp.pay('00000000-0000-0000-0000-00000000aa03', '2026-09-25') = 1,
  'a weekly salary four times');
select pg_temp.check(
  pg_temp.pay('00000000-0000-0000-0000-00000000aa04', '2026-10-02') = 1
  and pg_temp.pay('00000000-0000-0000-0000-00000000aa04', '2026-10-16') = 1
  and pg_temp.pay('00000000-0000-0000-0000-00000000aa04', '2026-10-30') = 1,
  'a biweekly salary three times');
select pg_temp.check(
  pg_temp.pay(null, '2026-09-28') + pg_temp.pay(null, '2026-09-30') = 2,
  'a pay whose salary was removed is left alone');
select pg_temp.check(
  (select count(*) = 2 from public.pay_received where salary_source_id is null
     and user_id = '00000000-0000-0000-0000-0000000000a5'),
  'both of them are there');

reset role;
select set_config('request.jwt.claims', '', true);
update public.salary_sources set frequency = 'semimonthly' where id = '00000000-0000-0000-0000-00000000aa01';
select pg_temp.check(pg_temp.pay('00000000-0000-0000-0000-00000000aa01', '2026-12-15') = 1,
  'the rule reads the salary''s frequency now: made semimonthly, it is paid twice in December');

-- Someone else's salary is still refused, not dropped.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a6', 'month-end-2@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000a6') on conflict (id) do nothing;
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-00000000aa06', '00000000-0000-0000-0000-0000000000a6', 'Theirs', 100, 'monthly', '2026-01-31');
insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on) values
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-00000000aa06', 'Pay', 100, '2026-09-28');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select pg_temp.expect_error(
  $s$insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on)
     values ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-00000000aa06', 'Pay', 100, '2026-09-30')$s$,
  '23514', 'your own salaries');

rollback;
\echo ALL CHECKS PASSED

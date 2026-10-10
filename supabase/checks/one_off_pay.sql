-- Checks for 20261008100001_one_off_pay_value.sql and 20261008100002_one_off_pay.sql, with
-- 20261009100006_salary_sources_free.sql applied (salary has no free limit). LOCAL database only:
-- everything runs in one transaction and rolls back.
--
--   npx supabase start -x gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/one_off_pay.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED or "wrong refusal".

\set ON_ERROR_STOP on
begin;

-- F is free, P is Pro.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'f@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'p@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2')
on conflict (id) do nothing;
insert into public.entitlements (user_id, pro, expires_at) values
  ('00000000-0000-0000-0000-0000000000f2', true, null);

create or replace function pg_temp.expect_refusal(p_sql text, p_words text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_words in sqlerrm) = 0 then
      raise exception 'wrong refusal: % (wanted %)', sqlerrm, p_words;
    end if;
    raise notice 'ok  refused: %', sqlerrm;
    return;
  end;
  raise exception 'expected a refusal for: %', p_sql;
end $$;

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

-- ---------------------------------------------------------------- a month's worth
select pg_temp.check(public.monthly_from_salary(400, 'once') = 0, 'a one-off pay is worth nothing a month as a schedule');
select pg_temp.check(public.monthly_from_salary(3000, 'monthly') = 3000, 'a monthly pay is unchanged');
select pg_temp.check(round(public.monthly_from_salary(1000, 'biweekly'), 2) = 2166.67, 'a two-weekly pay is unchanged');

-- ---------------------------------------------------------------- free keeps any number of schedules and one-offs
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000f1', 'Office', 3000, 'monthly', '2026-06-01');
select pg_temp.check(true, 'free adds its one schedule');

insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000f1', 'Shift', 400, 'once', '2026-08-14'),
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-0000000000f1', 'Shift', 250.50, 'once', '2026-08-28'),
  ('00000000-0000-0000-0000-00000000aa04', '00000000-0000-0000-0000-0000000000f1', 'Shift', 90, 'once', '2026-10-20');
select pg_temp.check(true, 'free adds one-off pays beside it, as many as it likes');

-- Salary is free on every plan: a second schedule, and a one-off turned into one, are kept. Both
-- are undone straight after, so the month figures below see only the one schedule.
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-00000000aa06', '00000000-0000-0000-0000-0000000000f1', 'Second job', 500, 'weekly', '2026-09-04');
update public.salary_sources set frequency = 'weekly' where id = '00000000-0000-0000-0000-00000000aa02';
select pg_temp.check(
  (select count(*) = 3 from public.salary_sources
    where user_id = '00000000-0000-0000-0000-0000000000f1' and frequency <> 'once'),
  'free keeps as many pay schedules as it likes');
delete from public.salary_sources where id = '00000000-0000-0000-0000-00000000aa06';
update public.salary_sources set frequency = 'once' where id = '00000000-0000-0000-0000-00000000aa02';
select pg_temp.check(
  not exists (select 1 from pg_trigger where tgname = 'salary_sources_free_allowance')
  and to_regprocedure('public.enforce_income_allowance()') is null,
  'no free limit is left on salary sources');

-- Cards keep their free limit: one. Undone straight after, like the salary rows above.
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'First');
select pg_temp.expect_refusal(
  $$insert into public.cards (user_id, holder) values ('00000000-0000-0000-0000-0000000000f1', 'Second')$$,
  'Free keeps one');
delete from public.cards where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.check(
  not exists (select 1 from public.cards where user_id = '00000000-0000-0000-0000-0000000000f1'),
  'and the card added for that check is gone again');

update public.salary_sources set frequency = 'semimonthly' where id = '00000000-0000-0000-0000-00000000aa01';
update public.salary_sources set frequency = 'monthly' where id = '00000000-0000-0000-0000-00000000aa01';
select pg_temp.check(true, 'free changes how often its own schedule pays');

update public.salary_sources set amount = 410 where id = '00000000-0000-0000-0000-00000000aa02';
update public.salary_sources set amount = 400 where id = '00000000-0000-0000-0000-00000000aa02';
select pg_temp.check(true, 'free edits a one-off pay');

update public.salary_sources set frequency = 'once' where id = '00000000-0000-0000-0000-00000000aa01';
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-00000000aa05', '00000000-0000-0000-0000-0000000000f1', 'New job', 2000, 'monthly', '2026-06-01');
select pg_temp.check(true, 'a schedule turned one-off sits beside a new one');
delete from public.salary_sources where id = '00000000-0000-0000-0000-00000000aa05';
update public.salary_sources set frequency = 'monthly' where id = '00000000-0000-0000-0000-00000000aa01';
select pg_temp.check(true, 'and can be turned back');

-- Pro is never counted.
insert into public.salary_sources (user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-0000000000f2', 'Day job', 3000, 'monthly', '2026-06-01'),
  ('00000000-0000-0000-0000-0000000000f2', 'Weekends', 300, 'weekly', '2026-09-05');
select pg_temp.check(true, 'Pro keeps two schedules');

-- ---------------------------------------------------------------- a month's income
select pg_temp.check(public.income_for_month('00000000-0000-0000-0000-0000000000f1', '2026-07-01') = 3000,
  'a month without one-off pays earns the schedule');
select pg_temp.check(public.income_for_month('00000000-0000-0000-0000-0000000000f1', '2026-08-01') = 3650.50,
  'August earns the schedule plus its two one-off pays');
select pg_temp.check(public.income_for_month('00000000-0000-0000-0000-0000000000f1', '2026-08-31') = 3650.50,
  'any day of the month names the month');
select pg_temp.check(public.income_for_month('00000000-0000-0000-0000-0000000000f1', '2026-10-01') = 3090,
  'October counts the pay due on the 20th');
select pg_temp.check((select monthly_income from public.v_monthly_income
                       where user_id = '00000000-0000-0000-0000-0000000000f1') = 3000,
  'the standing monthly income leaves one-off pays out');

-- ---------------------------------------------------------------- an exact half cent rounds up, as in the app
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f3', 'h@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000f3') on conflict (id) do nothing;
insert into public.entitlements (user_id, pro, expires_at) values ('00000000-0000-0000-0000-0000000000f3', true, null);
insert into public.salary_sources (user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-0000000000f3', 'A', 0.17, 'weekly', '2026-06-05'),
  ('00000000-0000-0000-0000-0000000000f3', 'B', 5723.39, 'biweekly', '2026-06-05');
select pg_temp.check(public.income_for_month('00000000-0000-0000-0000-0000000000f3', '2026-08-01') = 12401.42,
  '0.17 weekly and 5,723.39 every two weeks are exactly 12,401.415 a month: 12,401.42');
select pg_temp.check((select monthly_income from public.v_monthly_income
                       where user_id = '00000000-0000-0000-0000-0000000000f3') = 12401.42,
  'and the standing monthly income agrees');
delete from public.salary_sources where user_id = '00000000-0000-0000-0000-0000000000f3';
insert into public.salary_sources (user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-0000000000f3', 'A', 2693.80, 'weekly', '2026-06-05'),
  ('00000000-0000-0000-0000-0000000000f3', 'B', 2022.31, 'biweekly', '2026-06-05'),
  ('00000000-0000-0000-0000-0000000000f3', 'S', 518.11, 'once', '2026-08-03'),
  ('00000000-0000-0000-0000-0000000000f3', 'S', 514.10, 'once', '2026-08-21');
select pg_temp.check(public.income_for_month('00000000-0000-0000-0000-0000000000f3', '2026-08-01') = 17087.02,
  'two schedules and two one-off pays making exactly 17,087.015: 17,087.02');

-- ---------------------------------------------------------------- the savings record
update public.profiles set created_at = '2026-06-01' where id = '00000000-0000-0000-0000-0000000000f1';
-- The rebuilt record starts at the first month with spending, so June has a purchase too.
insert into public.receipts (user_id, merchant, amount, purchased_on) values
  ('00000000-0000-0000-0000-0000000000f1', 'Grocer', 100, '2026-08-10'),
  ('00000000-0000-0000-0000-0000000000f1', 'Grocer', 40, '2026-06-20');

select public.close_savings_month('00000000-0000-0000-0000-0000000000f1', '2026-08-15');
select pg_temp.check((select income = 3650.50 and spent = 100 and saved = 3550.50 from public.monthly_savings
                       where user_id = '00000000-0000-0000-0000-0000000000f1' and month = '2026-08-01'),
  'closing August counts its one-off pays in income and saved');

select pg_temp.check(public.close_savings_for('00000000-0000-0000-0000-0000000000f1') = 4,
  'rebuilding the record writes June to September');
select pg_temp.check((select income from public.monthly_savings
                       where user_id = '00000000-0000-0000-0000-0000000000f1' and month = '2026-07-01') = 3000,
  'rebuilding the record: July has the schedule only');
select pg_temp.check((select income from public.monthly_savings
                       where user_id = '00000000-0000-0000-0000-0000000000f1' and month = '2026-08-01') = 3650.50,
  'rebuilding the record: August keeps its one-off pays');
select pg_temp.check((select income from public.monthly_savings
                       where user_id = '00000000-0000-0000-0000-0000000000f1' and month = '2026-09-01') = 3000,
  'rebuilding the record: September does not inherit August''s');

-- ---------------------------------------------------------------- paydays
select pg_temp.check(public.next_payday('2026-08-14', 'once', '2026-09-01') is null,
  'a one-off pay already paid has no next payday');
select pg_temp.check(public.next_payday('2026-10-20', 'once', '2026-10-08') = '2026-10-20',
  'a one-off pay still to come is due on its day');
select pg_temp.check(public.next_payday('2026-10-08', 'once', '2026-10-08') = '2026-10-08',
  'and on the day itself');
select pg_temp.check(public.next_payday('2026-09-01', 'weekly', '2026-09-10') = '2026-09-15',
  'a weekly payday walks forward as before');
select pg_temp.check(public.next_payday('2026-01-31', 'monthly', '2026-02-10') = '2026-02-28',
  'a monthly payday still clamps to a short month');

-- ---------------------------------------------------------------- who may ask
select pg_temp.check(not has_function_privilege('anon', 'public.income_for_month(uuid, date)', 'execute'),
  'signed-out callers cannot read anyone''s income');
select pg_temp.check(not has_function_privilege('authenticated', 'public.income_for_month(uuid, date)', 'execute'),
  'nor can signed-in ones, for any user id');

rollback;
\echo ALL CHECKS PASSED

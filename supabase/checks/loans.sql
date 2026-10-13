-- Checks for 20261009100007_loan_overrides.sql, 20261009100008_loan_rate_precision.sql and
-- 20261012100001_loan_add_flow.sql. LOCAL database only, with all three applied: everything runs
-- in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/loans.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'loans-check@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000e1') on conflict (id) do nothing;
-- The recorder and the reminders work in the person's own day; UTC keeps "today" plain here.
update public.profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000e1';
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00e1', '00000000-0000-0000-0000-0000000000e1', 'Loans');

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

-- A save_loan call as the app makes it, with whatever extra named arguments the case adds.
-- Bills are named per case, so each one is found by name.
create or replace function pg_temp.save(p_name text, p_rate numeric, p_extra text default '')
returns text
language plpgsql as $$
declare
  v_id uuid;
begin
  execute format(
    $f$select (public.save_loan(
       p_name => %L, p_icon_id => 'loan-car', p_principal => 32001, p_annual_rate => %s,
       p_term_months => 60, p_monthly_payment => 641.23, p_total_interest => 6472.80,
       p_first_payment_on => '2026-11-01', p_recurrence => 'monthly',
       p_card_id => '00000000-0000-0000-0000-0000000c00e1', p_bank_account_id => null,
       p_funded_on => '2026-10-01', p_day_count_basis => 'actual/365'%s)).id$f$,
    p_name, p_rate, p_extra)
    into v_id;
  return v_id::text;
end $$;

-- ---------------------------------------------------------------- the schema
select pg_temp.check(
  (select format_type(atttypid, atttypmod) = 'numeric(12,9)' from pg_attribute
    where attrelid = 'public.loans'::regclass and attname = 'annual_rate'),
  'a rate keeps nine decimals');
select pg_temp.check(
  exists (select 1 from pg_constraint where conrelid = 'public.loans'::regclass
           and pg_get_constraintdef(oid) like '%annual_rate >= (0)%annual_rate <= (100)%'),
  'and stays between 0 and 100');
select pg_temp.check(
  (select format_type(atttypid, atttypmod) = 'jsonb' from pg_attribute
    where attrelid = 'public.loans'::regclass and attname = 'payment_overrides'),
  'changed payments are kept as jsonb');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'save_loan' and pronamespace = 'public'::regnamespace),
  'there is one save_loan, so a call cannot match two');
select pg_temp.check(
  (select not p.prosecdef and p.proconfig = array['search_path=public'] and p.proowner::regrole::text = 'postgres'
     from pg_proc p where p.proname = 'save_loan' and p.pronamespace = 'public'::regnamespace),
  'save_loan runs as the caller, on search_path public, owned by postgres, as before');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date,uuid)', 'execute')
  and not has_function_privilege('public', 'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date,boolean,integer,date,uuid)', 'execute'),
  'signed-in people may call it, signed-out ones may not');
select pg_temp.check(
  to_regprocedure('public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date)') is null,
  'the 17-argument save_loan is gone');
select pg_temp.check(
  (select array_agg(p.parameter_name::text order by p.ordinal_position)
     from information_schema.parameters p
     join information_schema.routines r on r.specific_name = p.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'save_loan')
  = array['p_name', 'p_icon_id', 'p_principal', 'p_annual_rate', 'p_term_months',
          'p_monthly_payment', 'p_total_interest', 'p_first_payment_on', 'p_recurrence',
          'p_card_id', 'p_bank_account_id', 'p_funded_on', 'p_day_count_basis', 'p_statement_on',
          'p_statement_principal', 'p_payment_overrides', 'p_last_payment_on', 'p_in_spending',
          'p_payment_day', 'p_counts_from', 'p_id'],
  'every earlier parameter keeps its name and place; the newer ones come last, the app''s own id last of all');
select pg_temp.check(
  (select count(*) = 3 from information_schema.parameters p
     join information_schema.routines r on r.specific_name = p.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'save_loan'
      and p.parameter_name in ('p_in_spending', 'p_payment_day', 'p_counts_from')
      and p.parameter_default is not null),
  'and each new one has a default, so an older call still resolves here');
select pg_temp.check(
  (select format_type(atttypid, atttypmod) = 'boolean' and attnotnull from pg_attribute
    where attrelid = 'public.bills'::regclass and attname = 'in_spending')
  and (select pg_get_expr(d.adbin, d.adrelid) = 'true' from pg_attrdef d
         join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
        where d.adrelid = 'public.bills'::regclass and a.attname = 'in_spending'),
  'every bill counts toward spending unless saved otherwise');
select pg_temp.check(
  (select format_type(atttypid, atttypmod) = 'smallint' and not attnotnull from pg_attribute
    where attrelid = 'public.loans'::regclass and attname = 'payment_day')
  and exists (select 1 from pg_constraint where conrelid = 'public.loans'::regclass
               and pg_get_constraintdef(oid) ~ 'payment_day >= 1.*payment_day <= 31'),
  'a loan''s payment day is 1 to 31, or none');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.record_due_charges()', 'execute')
  and not has_function_privilege('anon', 'public.record_due_charges()', 'execute')
  and not has_function_privilege('authenticated', 'public.reminders_due()', 'execute')
  and not has_function_privilege('anon', 'public.reminders_due()', 'execute')
  and (select bool_and(p.prosecdef and p.proconfig = array['search_path=public'])
         from pg_proc p where p.pronamespace = 'public'::regnamespace
          and p.proname in ('record_due_charges', 'reminders_due')),
  'the recorder and the reminders still run only for the scheduler, as their owner');

-- What the widening does to a value already stored: the same ALTER on a copy of the old column.
create temp table old_rates (annual_rate numeric(6,3));
insert into old_rates values (0), (6.063), (7.500), (12.345), (99.999), (100);
create temp table old_rates_before as select annual_rate from old_rates;
alter table old_rates alter column annual_rate type numeric(12,9);
select pg_temp.check(
  (select array_agg(annual_rate order by annual_rate) from old_rates)
  = (select array_agg(annual_rate order by annual_rate) from old_rates_before),
  'widening keeps every stored rate exactly (7.500 reads 7.500000000)');

-- ---------------------------------------------------------------- as the app calls it
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- Today's call: the thirteen arguments the app sends, nothing new.
select pg_temp.save('Car loan', 7.5);
select pg_temp.check(
  (select b.ends_on = '2031-10-01' and b.category_id = 'loans' and b.icon_id = 'loan-car' and b.amount = 641.23
          and l.payment_overrides is null and l.annual_rate = 7.5 and l.funded_on = '2026-10-01'
          and b.starts_on = '2026-11-01' and b.next_due_on = '2026-11-01'
          and b.in_spending and l.payment_day is null
     from public.bills b join public.loans l on l.bill_id = b.id where b.name = 'Car loan'),
  'the call without the new arguments saves what it always did, counted, on its first payment''s day');

-- The new call: changed payments and an earlier last payment.
select pg_temp.save('Car loan, paid early', 7.4995,
  $x$, p_payment_overrides => '{"1": 612.40, "14": 1000}'::jsonb, p_last_payment_on => '2030-06-01'$x$);
select pg_temp.check(
  (select b.ends_on = '2030-06-01'
          and (l.payment_overrides->>'1')::numeric = 612.40
          and (l.payment_overrides->>'14')::numeric = 1000
          and l.annual_rate::text = '7.499500000'
     from public.bills b join public.loans l on l.bill_id = b.id where b.name = 'Car loan, paid early'),
  'the new call keeps the changed payments, the last payment day and the rate as printed');

select pg_temp.save('Last day', 6, $x$, p_last_payment_on => '2031-10-01'$x$);
select pg_temp.save('Last number', 6, $x$, p_payment_overrides => '{"59": 100}'::jsonb$x$);
select pg_temp.save('Largest', 6, $x$, p_payment_overrides => '{"2": 999999999999.99}'::jsonb$x$);
select pg_temp.check(
  (select count(*) = 3 from public.bills where name in ('Last day', 'Last number', 'Largest')),
  'the term''s last day, payment 59 of 60 and the largest amount are all allowed');

create temp table bills_before as select count(*) as n from public.bills;

select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"0": 100}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"01": 100}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"x": 100}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"1.5": 100}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"60": 100}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"2": "100"}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"2": 0}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"2": -5}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"2": 612.405}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '{"2": 1000000000000}'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_payment_overrides => '[100]'::jsonb$x$)$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_last_payment_on => '2026-10-31'$x$)$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error($s$select pg_temp.save('bad', 6, $x$, p_last_payment_on => '2031-10-02'$x$)$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.check((select count(*) from public.bills) = (select n from bills_before),
  'a refused loan leaves no bill behind');

-- The check holds for later edits of the row too.
select pg_temp.expect_error(
  $s$update public.loans set payment_overrides = '{"0": 1}'::jsonb
      where bill_id = (select id from public.bills where name = 'Car loan')$s$,
  '23514', 'loans_payment_overrides_valid');
select pg_temp.expect_error(
  $s$update public.loans set term_months = 10
      where bill_id = (select id from public.bills where name = 'Car loan, paid early')$s$,
  '23514', 'loans_payment_overrides_valid');

-- ---------------------------------------------------------------- the rate, as printed
select pg_temp.save('r1', 6.0625);
select pg_temp.save('r2', 8.139865);
select pg_temp.save('r3', 0.000000001);
select pg_temp.save('r4', 99.999999999);
select pg_temp.save('r5', 100);
select pg_temp.check(
  (select array_agg(l.annual_rate::text order by b.name) from public.loans l join public.bills b on b.id = l.bill_id
    where b.name in ('r1', 'r2', 'r3', 'r4', 'r5'))
  = array['6.062500000', '8.139865000', '0.000000001', '99.999999999', '100.000000000'],
  'sixteenths, a daily rate times 365, the smallest step and 100 are kept exactly');
select pg_temp.expect_error($s$select pg_temp.save('bad', 100.000000001)$s$, '23514', 'loans_annual_rate_check');
select pg_temp.expect_error($s$select pg_temp.save('bad', -0.000000001)$s$, '23514', 'loans_annual_rate_check');

-- ---------------------------------------------------------------- the add flow (20261012100001)
-- A loan on its own dates, as the add flow saves it.
create or replace function pg_temp.save_on(p_name text, p_first date, p_term integer, p_extra text default '')
returns text
language plpgsql as $$
declare
  v_id uuid;
begin
  execute format(
    $f$select (public.save_loan(
       p_name => %L, p_icon_id => 'loan-personal', p_principal => 5000, p_annual_rate => 9,
       p_term_months => %s, p_monthly_payment => 420, p_total_interest => 260,
       p_first_payment_on => %L, p_recurrence => 'monthly',
       p_card_id => '00000000-0000-0000-0000-0000000c00e1', p_bank_account_id => null,
       p_funded_on => null, p_day_count_basis => 'actual/365'%s)).id$f$,
    p_name, p_term, p_first, p_extra)
    into v_id;
  return v_id::text;
end $$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$ select * from public.bills where name = p_name $$;

-- "Add to monthly bills"
select pg_temp.save('Kept out', 6, $x$, p_in_spending => false$x$);
select pg_temp.save('Said nothing', 6, $x$, p_in_spending => null$x$);
select pg_temp.check(not (pg_temp.bill('Kept out')).in_spending, 'a loan kept out of monthly bills is saved so');
select pg_temp.check((pg_temp.bill('Said nothing')).in_spending, 'a null switch counts, as the default does');

-- The payment day. 28 Feb first, day 31: then 31 Mar, 30 Apr.
select pg_temp.save_on('Day 31', '2025-02-28', 3, $x$, p_payment_day => 31$x$);
select pg_temp.save_on('Day 31, last on the 30th', '2025-02-28', 3,
  $x$, p_payment_day => 31, p_last_payment_on => '2025-04-30'$x$);
select pg_temp.save_on('First payment''s day', '2025-02-28', 3);
select pg_temp.save_on('Day 31 from January', '2025-01-31', 2, $x$, p_payment_day => 31$x$);
select pg_temp.save_on('Day 31 from January, 3', '2025-01-31', 3, $x$, p_payment_day => 31$x$);
select pg_temp.save_on('Leap 13', '2024-02-29', 13, $x$, p_payment_day => 29$x$);
select pg_temp.save_on('Leap 49', '2024-02-29', 49, $x$, p_payment_day => 29$x$);
select pg_temp.save_on('Day 30 from February', '2026-02-28', 2, $x$, p_payment_day => 30$x$);
select pg_temp.check(
  (select array_agg(b.name || ' ' || b.ends_on || ' ' || coalesce(l.payment_day::text, '-') order by b.name)
     from public.bills b join public.loans l on l.bill_id = b.id
    where b.name in ('Day 31', 'Day 31, last on the 30th', 'First payment''s day', 'Day 31 from January',
                     'Day 31 from January, 3', 'Leap 13', 'Leap 49', 'Day 30 from February'))
  = array['Day 30 from February 2026-03-30 30',
          'Day 31 2025-04-30 31',
          'Day 31 from January 2025-02-28 31',
          'Day 31 from January, 3 2025-03-31 31',
          'Day 31, last on the 30th 2025-04-30 31',
          'First payment''s day 2025-04-28 -',
          'Leap 13 2025-02-28 29',
          'Leap 49 2028-02-29 29'],
  'the term ends on the payment day, clamped to its month; with none it ends on the first payment''s day');

create temp table bills_before_day as select count(*) as n from public.bills;
select pg_temp.expect_error($s$select pg_temp.save_on('bad', '2025-02-28', 3, $x$, p_payment_day => 0$x$)$s$,
  'P0001', 'the payment day must be between 1 and 31');
select pg_temp.expect_error($s$select pg_temp.save_on('bad', '2025-02-28', 3, $x$, p_payment_day => 32$x$)$s$,
  'P0001', 'the payment day must be between 1 and 31');
select pg_temp.expect_error(
  $s$select pg_temp.save_on('bad', '2025-02-28', 3, $x$, p_payment_day => 31, p_last_payment_on => '2025-05-01'$x$)$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error(
  $s$select pg_temp.save_on('bad', '2025-02-28', 3, $x$, p_last_payment_on => '2025-04-30'$x$)$s$,
  'P0001', 'the last payment must fall within the term');
select pg_temp.check((select count(*) from public.bills) = (select n from bills_before_day),
  'a refused payment day leaves no bill behind');
select pg_temp.expect_error(
  $s$update public.loans set payment_day = 32 where bill_id = (pg_temp.bill('Day 31')).id$s$,
  '23514', 'loans_payment_day_check');

-- Counting from the day the loan was added: the floor, and the next payment from it on.
select pg_temp.save_on('Had it two years', '2024-01-27', 48, $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Not paid yet', '2026-11-27', 48, $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Last payment today', '2024-11-12', 24, $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Paid off before', '2019-01-15', 24, $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Paid this month already', '2024-01-05', 48, $x$, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Day 31, into November', '2025-01-31', 36, $x$, p_counts_from => '2026-11-12'$x$);
select pg_temp.save_on('Day 31 clamped, into October', '2025-02-28', 36,
  $x$, p_payment_day => 31, p_counts_from => '2026-10-12'$x$);
select pg_temp.save_on('Paid off early, none left', '2026-01-27', 12,
  $x$, p_last_payment_on => '2026-10-15', p_counts_from => '2026-10-12'$x$);
select pg_temp.check(
  (select array_agg(name || ' ' || starts_on || ' ' || coalesce(next_due_on::text, '-') || ' ' || ends_on order by name)
     from public.bills
    where name in ('Had it two years', 'Not paid yet', 'Last payment today', 'Paid off before',
                   'Paid this month already', 'Day 31, into November', 'Day 31 clamped, into October',
                   'Paid off early, none left'))
  = array['Day 31 clamped, into October 2026-10-12 2026-10-31 2028-01-31',
          'Day 31, into November 2026-11-12 2026-11-30 2027-12-31',
          'Had it two years 2026-10-12 2026-10-27 2027-12-27',
          'Last payment today 2026-10-12 2026-10-12 2026-10-12',
          'Not paid yet 2026-11-27 2026-11-27 2030-10-27',
          'Paid off before 2019-01-15 - 2020-12-15',
          'Paid off early, none left 2026-10-12 - 2026-10-15',
          'Paid this month already 2026-10-12 2026-11-05 2027-12-05'],
  'counting starts the day it was added (or the first payment, if later), due next on the payment day; a loan already paid has nothing to come');
select pg_temp.check(
  (select l.first_payment_on = '2024-01-27' from public.loans l
    where l.bill_id = (pg_temp.bill('Had it two years')).id),
  'the loan keeps its own first payment, so its schedule still shows the payments made');

-- ---------------------------------------------------------------- recording, rolling, reminding
-- Relative to the real day, as the recorder and the reminders read it.
create temp table day as select (now() at time zone 'UTC')::date as today;
create temp table month_ago3 as
  select (date_trunc('month', (select today from day)) - interval '3 months')::date as first_on;

select pg_temp.save_on('Rec: counts from today', (select first_on from month_ago3), 24,
  format($x$, p_counts_from => %L$x$, (select today from day)));
select pg_temp.save_on('Rec: back-fills', (select first_on from month_ago3), 24);
select pg_temp.save_on('Rec: kept out', (select first_on from month_ago3), 24, $x$, p_in_spending => false$x$);
select pg_temp.save_on('Rec: switched off', (select first_on from month_ago3), 24);

-- Two months recorded while it counted, then switched off.
insert into public.charges (user_id, bill_id, label, amount, charged_on)
select '00000000-0000-0000-0000-0000000000e1', (pg_temp.bill('Rec: switched off')).id, 'Rec: switched off', 420,
       (select first_on from month_ago3) + make_interval(months => n)
from generate_series(0, 1) n;
update public.bills set in_spending = false where name = 'Rec: switched off';

-- Plain bills for the reminders: one kept out, one that has ended, one on its last day, one open.
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, ends_on, in_spending)
select '00000000-0000-0000-0000-0000000000e1', v.name, 10, 'other', 'monthly',
       (select today from day) + 3, null, v.ends_on, v.counts
from (values
  ('Rem: kept out',     null::date,                          false),
  ('Rem: ended',        (select today from day) - 10,        true),
  ('Rem: last payment', (select today from day) + 3,         true),
  ('Rem: open',         null::date,                          true)
) as v(name, ends_on, counts);
insert into public.reminders (user_id, bill_id, lead_days, remind_at)
select '00000000-0000-0000-0000-0000000000e1', id, 3, '00:00'
from public.bills where name like 'Rem: %';

reset role;
select set_config('request.jwt.claims', '', true);

create temp table recorded as select * from public.record_due_charges();

create temp table charged as
select b.name, count(c.id) as n, count(c.id) filter (where c.charged_on < (select today from day)) as before_today
from public.bills b left join public.charges c on c.bill_id = b.id
where b.name like 'Rec: %'
group by b.name;
select pg_temp.check(
  -- The 1st of three months back, then each 1st up to this month's, which is today or before.
  (select n = 4 and before_today = case when extract(day from (select today from day)) = 1 then 3 else 4 end
     from charged where name = 'Rec: back-fills'),
  'a loan saved without a count floor still back-fills every payment since its first (as before)');
select pg_temp.check(
  (select before_today = 0 and n = case when extract(day from (select today from day)) = 1 then 1 else 0 end
     from charged where name = 'Rec: counts from today'),
  'one counted from today records nothing before today');
select pg_temp.check(
  (select n = 0 from charged where name = 'Rec: kept out'),
  'one kept out of monthly bills records nothing');
select pg_temp.check(
  (select n = 2 from charged where name = 'Rec: switched off'),
  'one switched off keeps what it recorded, and records nothing new');
select pg_temp.check(
  not exists (select 1 from recorded r where r.label in ('Rec: kept out', 'Rec: switched off')),
  'and nothing is announced for either');

select public.roll_schedules_forward();
select pg_temp.check(
  (select next_due_on >= (select today from day) from public.bills where name = 'Rec: kept out'),
  'a loan kept out still rolls on to its next payment, so its reminder keeps coming');

create temp table reminded as
select title from public.reminders_due() where user_id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.check(
  (select array_agg(title order by title) from reminded where title like 'Rem: %')
  = array['Rem: kept out', 'Rem: last payment', 'Rem: open'],
  'reminders fire for a bill kept out and on a last payment day, never once a bill has ended');

-- The dashboard view counts what spending counts.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e2', 'loans-view@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000e2') on conflict (id) do nothing;
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, in_spending) values
  ('00000000-0000-0000-0000-0000000000e2', 'counted', 100, 'other', 'monthly', (select today from day), true),
  ('00000000-0000-0000-0000-0000000000e2', 'kept out', 50, 'other', 'monthly', (select today from day), false);
select pg_temp.check(
  (select monthly_expenses = 100 from public.v_monthly_expenses
    where user_id = '00000000-0000-0000-0000-0000000000e2'),
  'v_monthly_expenses leaves out a bill kept out of spending');

select pg_temp.expect_error($s$select pg_temp.save('nobody', 6)$s$, 'P0001', 'not authenticated');

rollback;
\echo ALL CHECKS PASSED

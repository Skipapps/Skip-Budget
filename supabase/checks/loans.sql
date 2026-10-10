-- Checks for 20261009100007_loan_overrides.sql and 20261009100008_loan_rate_precision.sql. LOCAL
-- database only, with both applied: everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/loans.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'loans-check@test.local');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000e1') on conflict (id) do nothing;
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
  has_function_privilege('authenticated', 'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date)', 'execute')
  and not has_function_privilege('anon', 'public.save_loan(text,text,numeric,numeric,integer,numeric,numeric,date,public.bill_recurrence,uuid,uuid,date,text,date,numeric,jsonb,date)', 'execute'),
  'signed-in people may call it, signed-out ones may not');

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
     from public.bills b join public.loans l on l.bill_id = b.id where b.name = 'Car loan'),
  'the call without the new arguments saves what it always did');

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

reset role;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($s$select pg_temp.save('nobody', 6)$s$, 'P0001', 'not authenticated');

rollback;
\echo ALL CHECKS PASSED

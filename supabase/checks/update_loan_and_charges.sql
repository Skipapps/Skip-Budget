-- Checks for 20261012100004_update_loan_and_charges.sql. LOCAL database only, with 20261012100003,
-- it and 20261013300001 applied: everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/update_loan_and_charges.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- Dates are fixed. "Past and upcoming" must save the loan exactly as update_loan does, rewrite
-- that loan's recorded payments and nothing else, and write nothing at all when anything fails.

\set ON_ERROR_STOP on
begin;

-- f1 edits; f3 is someone else.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'loan-and-charges@test.local'),
  ('00000000-0000-0000-0000-0000000000f3', 'loan-and-charges-other@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f3')
on conflict (id) do nothing;
update public.profiles set timezone = 'UTC'
 where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3');
-- Pro, for a second card to move the payments to.
insert into public.entitlements (user_id, pro, expires_at)
values ('00000000-0000-0000-0000-0000000000f1', true, null);
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c01f1', '00000000-0000-0000-0000-0000000000f1', 'Mine'),
  ('00000000-0000-0000-0000-0000000c02f1', '00000000-0000-0000-0000-0000000000f1', 'Mine too'),
  ('00000000-0000-0000-0000-0000000c00f3', '00000000-0000-0000-0000-0000000000f3', 'Theirs');
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000a00f1', '00000000-0000-0000-0000-0000000000f1', 'Mine'),
  ('00000000-0000-0000-0000-0000000a00f3', '00000000-0000-0000-0000-0000000000f3', 'Theirs');

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

create or replace function pg_temp.as_user(p_user text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_user), true);
end $$;

-- A loan as the add flow saves it (first payment 27 Jan 2026, $420 a month from my card), added on
-- p_added.
create or replace function pg_temp.save_on(p_name text, p_added date) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  select (public.save_loan(
    p_name => p_name, p_icon_id => 'loan-car', p_principal => 18000, p_annual_rate => 6.5,
    p_term_months => 48, p_monthly_payment => 420, p_total_interest => 2160,
    p_first_payment_on => '2026-01-27', p_recurrence => 'monthly',
    p_card_id => '00000000-0000-0000-0000-0000000c01f1', p_bank_account_id => null,
    p_funded_on => '2025-12-27', p_day_count_basis => 'actual/365')).id
    into v_id;
  update public.bills set created_at = p_added + time '12:00' where id = v_id;
  return v_id;
end $$;

create or replace function pg_temp.bill(p_name text) returns public.bills
language sql as $$ select * from public.bills where name = p_name $$;

-- The edit page's call through p_fn (update_loan or update_loan_and_charges): the saved figures,
-- with the name, payment and paid from the case gives.
create or replace function pg_temp.edit(
  p_fn text, p_bill_id uuid, p_new_name text, p_payment numeric, p_card uuid, p_account uuid,
  p_extra text default '')
returns public.bills
language plpgsql as $$
declare
  v_bill public.bills;
begin
  execute format(
    $f$select * from public.%I(
       p_bill_id => %L, p_name => %L, p_icon_id => 'loan-car', p_principal => 18000,
       p_annual_rate => 6.5, p_term_months => 48, p_monthly_payment => %s,
       p_total_interest => 2160, p_first_payment_on => '2026-01-27', p_funded_on => '2025-12-27',
       p_day_count_basis => 'actual/365', p_card_id => %L, p_bank_account_id => %L,
       p_in_spending => null, p_today => '2026-10-12'%s)$f$,
    p_fn, p_bill_id, p_new_name, p_payment, p_card, p_account, p_extra)
    into v_bill;
  return v_bill;
end $$;

-- A bill and its loan as stored, all but updated_at.
create or replace function pg_temp.row_of(p_bill_id uuid) returns jsonb
language sql as $$
  select (to_jsonb(b) - 'updated_at') || jsonb_build_object('loan', to_jsonb(l) - 'updated_at')
  from public.bills b join public.loans l on l.bill_id = b.id where b.id = p_bill_id
$$;

-- Every charge filed under a bill, whoever owns it, oldest first. As the owner of the check, so
-- a charge row security hides from the caller is still seen.
create or replace function pg_temp.charges_of(p_bill_id uuid) returns jsonb
language sql security definer as $$
  select coalesce(jsonb_agg(to_jsonb(c) - 'updated_at' order by c.charged_on, c.id), '[]')
  from public.charges c where c.bill_id = p_bill_id
$$;

create or replace function pg_temp.payoffs_of(p_bill_id uuid) returns jsonb
language sql security definer as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.paid_on, p.id), '[]')
  from public.loan_payoffs p where p.bill_id = p_bill_id
$$;

-- A charge as the recorders write one: the bill's values on that day.
create or replace function pg_temp.charge(p_bill_id uuid, p_on date) returns void
language sql as $$
  insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id, bank_account_id)
  select user_id, id, coalesce(nullif(name, ''), 'Bill'), amount, p_on, card_id, bank_account_id
  from public.bills where id = p_bill_id
$$;

-- ---------------------------------------------------------------- the function
select pg_temp.check(
  (select count(*) = 1 from pg_proc
    where proname = 'update_loan_and_charges' and pronamespace = 'public'::regnamespace),
  'there is one update_loan_and_charges');
select pg_temp.check(
  (select not p.prosecdef and p.proconfig = array['search_path=public']
          and p.proowner::regrole::text = 'postgres' and p.prorettype = 'public.bills'::regtype
     from pg_proc p where p.proname = 'update_loan_and_charges' and p.pronamespace = 'public'::regnamespace),
  'it runs as the caller, on search_path public, owned by postgres, and returns the bill');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.update_loan_and_charges(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute')
  and not has_function_privilege('anon', 'public.update_loan_and_charges(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute')
  and not has_function_privilege('public', 'public.update_loan_and_charges(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute'),
  'signed-in people may call it, signed-out ones may not');
select pg_temp.check(
  (select array_agg(p.parameter_name::text || ' ' || p.data_type || ' ' || coalesce(p.parameter_default, '-')
                    order by p.ordinal_position)
     from information_schema.parameters p
     join information_schema.routines r on r.specific_name = p.specific_name
    where r.routine_schema = 'public' and r.routine_name = 'update_loan_and_charges')
  = (select array_agg(p.parameter_name::text || ' ' || p.data_type || ' ' || coalesce(p.parameter_default, '-')
                      order by p.ordinal_position)
       from information_schema.parameters p
       join information_schema.routines r on r.specific_name = p.specific_name
      where r.routine_schema = 'public' and r.routine_name = 'update_loan'),
  'it takes update_loan''s parameters: the same names, types, order and defaults');

-- ---------------------------------------------------------------- update_loan untouched
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'update_loan' and pronamespace = 'public'::regnamespace),
  'there is still one update_loan');
-- 20261013300001 adds one line (anchor_day = v_day); supabase/checks/month_end_anchor.sql proves
-- that taking it out gives 20261012100003's body back.
select pg_temp.check(
  (select md5(p.prosrc) = '1f26263135df0d33b5ec0a77d6619d38'
          and not p.prosecdef and p.proconfig = array['search_path=public']
          and p.proowner::regrole::text = 'postgres'
     from pg_proc p where p.proname = 'update_loan' and p.pronamespace = 'public'::regnamespace),
  'update_loan is byte for byte the one 20261013300001 left, still run as the caller');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute')
  and not has_function_privilege('anon', 'public.update_loan(uuid,text,text,numeric,numeric,integer,numeric,numeric,date,date,text,uuid,uuid,boolean,integer,jsonb,date,date)', 'execute'),
  'and its grants are as they were');

-- ---------------------------------------------------------------- the rows
select pg_temp.as_user('f1');
select pg_temp.save_on('Car', '2026-01-20');
select pg_temp.save_on('Van', '2026-01-20');
insert into public.reminders (user_id, bill_id, lead_days, remind_at)
values ('00000000-0000-0000-0000-0000000000f1', (pg_temp.bill('Car')).id, 3, '09:00');
select pg_temp.charge(b.id, ('2026-01-27'::date + make_interval(months => m))::date)
  from public.bills b, generate_series(0, 8) m where b.name in ('Car', 'Van');
-- A partial payoff on each, which keeps its own amount, source and date.
select public.record_loan_payoff(
  p_bill_id => b.id, p_paid_on => '2026-06-03', p_amount => 1000, p_kind => 'partial',
  p_card_id => null, p_bank_account_id => '00000000-0000-0000-0000-0000000a00f1',
  p_last_payment_on => null, p_today => '2026-10-12')
  from public.bills b where b.name in ('Car', 'Van');
insert into public.bills (user_id, name, amount, category_id, recurrence, next_due_on, starts_on, card_id)
values ('00000000-0000-0000-0000-0000000000f1', 'Rent', 1450, 'housing', 'monthly', '2026-11-01',
        '2026-09-01', '00000000-0000-0000-0000-0000000c01f1');
select pg_temp.charge((pg_temp.bill('Rent')).id, d)
  from (values ('2026-09-01'::date), ('2026-10-01'::date)) v(d);
insert into public.subscriptions (user_id, name, amount, cycle, next_renewal_on, card_id, active)
values ('00000000-0000-0000-0000-0000000000f1', 'Stream', 17.99, 'monthly', '2026-11-05',
        '00000000-0000-0000-0000-0000000c01f1', true);
insert into public.charges (user_id, subscription_id, label, amount, charged_on, card_id)
select user_id, id, name, amount, '2026-10-05', card_id from public.subscriptions where name = 'Stream';

reset role;
select pg_temp.as_user('f3');
with b as (
  insert into public.bills (user_id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id)
  values ('00000000-0000-0000-0000-0000000000f3', 'Theirs', 400, 'loans', 'loan-car', 'monthly',
          '2026-11-01', '2026-01-01', '2028-10-01', '00000000-0000-0000-0000-0000000c00f3')
  returning id
)
insert into public.loans (user_id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest, first_payment_on)
select '00000000-0000-0000-0000-0000000000f3', b.id, 9000, 5, 34, 400, 600, '2026-01-01' from b;
select pg_temp.charge((pg_temp.bill('Theirs')).id, d)
  from (values ('2026-09-01'::date), ('2026-10-01'::date)) v(d);
reset role;
-- Someone else's charge filed under my loan's id: the foreign key takes any bill id. In a month
-- Car has no charge, or charges_one_per_cycle drops it.
insert into public.charges (user_id, bill_id, label, amount, charged_on, card_id)
values ('00000000-0000-0000-0000-0000000000f3', (pg_temp.bill('Car')).id, 'Planted', 5, '2025-12-15',
        '00000000-0000-0000-0000-0000000c00f3');

create temp table ids as
  select name, id from public.bills where name in ('Car', 'Van', 'Rent', 'Theirs');
grant select on ids to authenticated;
create temp table charges_before as
  select c.*, c.user_id = '00000000-0000-0000-0000-0000000000f1' as mine from public.charges c
  where c.user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3');
grant select on charges_before to authenticated;
create temp table rows_before as
  select b.id, to_jsonb(b) as bill, to_jsonb(l) as loan, pg_temp.payoffs_of(b.id) as payoffs
  from public.bills b left join public.loans l on l.bill_id = b.id
  where b.user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3');
grant select on rows_before to authenticated;

select pg_temp.check(
  (select count(*) = 10 from charges_before where bill_id = (select id from ids where name = 'Car'))
  and (select count(*) = 9 from charges_before where bill_id = (select id from ids where name = 'Car') and mine)
  and (select bool_and(label = 'Car' and amount = 420 and card_id = '00000000-0000-0000-0000-0000000c01f1')
         from charges_before where bill_id = (select id from ids where name = 'Car') and mine),
  'set up: Car has nine payments recorded, $420 each from my card, and one planted by someone else');

-- ---------------------------------------------------------------- past and upcoming
-- What update_loan alone makes of the edit: renamed, $431.17, paid from my account.
select pg_temp.as_user('f1');
savepoint plain;
select pg_temp.edit('update_loan', (select id from ids where name = 'Car'), 'Car loan', 431.17,
  null, '00000000-0000-0000-0000-0000000a00f1');
select pg_temp.row_of((select id from ids where name = 'Car'))::text as plain_row,
       pg_temp.payoffs_of((select id from ids where name = 'Car'))::text as plain_payoffs,
       pg_temp.charges_of((select id from ids where name = 'Car'))::text as plain_charges
\gset
rollback to savepoint plain;

create temp table returned as
select * from pg_temp.edit('update_loan_and_charges', (select id from ids where name = 'Car'),
  'Car loan', 431.17, null, '00000000-0000-0000-0000-0000000a00f1');

select pg_temp.check(
  pg_temp.row_of((select id from ids where name = 'Car'))::text = :'plain_row'
  and pg_temp.payoffs_of((select id from ids where name = 'Car'))::text = :'plain_payoffs',
  'the loan, its bill and its payoffs are saved exactly as update_loan saves them');
select pg_temp.check(
  (select r.id = (select id from ids where name = 'Car') and r.name = 'Car loan' and r.amount = 431.17
     from returned r),
  'it returns the bill as now stored');
select pg_temp.check(
  :'plain_charges'::jsonb
    = (select jsonb_agg(to_jsonb(c) - 'updated_at' - 'mine' order by c.charged_on, c.id)
         from charges_before c where c.bill_id = (select id from ids where name = 'Car')),
  'update_loan alone leaves every recorded payment as it was');
select pg_temp.check(
  (select count(*) = 9 and bool_and(c.label = 'Car loan' and c.amount = 431.17 and c.card_id is null
                                    and c.bank_account_id = '00000000-0000-0000-0000-0000000a00f1')
     from public.charges c where c.bill_id = (select id from ids where name = 'Car')),
  'every payment of mine recorded for it now reads Car loan, $431.17, from my account');
select pg_temp.check(
  (select array_agg(c.id::text || ' ' || c.charged_on order by c.id) from public.charges c
    where c.bill_id = (select id from ids where name = 'Car'))
  = (select array_agg(b.id::text || ' ' || b.charged_on order by b.id) from charges_before b
      where b.bill_id = (select id from ids where name = 'Car') and b.mine),
  'the same rows on the same days: rewritten in place, no date moved, none added or removed');

select pg_temp.edit('update_loan_and_charges', (select id from ids where name = 'Car'),
  'Car loan', 431.17, '00000000-0000-0000-0000-0000000c02f1', null);
select pg_temp.check(
  (select count(*) = 9 and bool_and(c.card_id = '00000000-0000-0000-0000-0000000c02f1' and c.bank_account_id is null)
     from public.charges c where c.bill_id = (select id from ids where name = 'Car')),
  'paid from moved back to a card: every payment names that card and no account');

select pg_temp.edit('update_loan_and_charges', (select id from ids where name = 'Car'),
  '', 431.17, '00000000-0000-0000-0000-0000000c02f1', null);
select pg_temp.check(
  (select name = '' from public.bills where id = (select id from ids where name = 'Car'))
  and (select count(*) = 9 and bool_and(c.label = 'Bill')
         from public.charges c where c.bill_id = (select id from ids where name = 'Car')),
  'an empty name gives the label the recorders give it: Bill');
update public.bills set name = 'Car loan' where id = (select id from ids where name = 'Car');

-- ---------------------------------------------------------------- upcoming only
select pg_temp.edit('update_loan', (select id from ids where name = 'Van'), 'Van loan', 455,
  '00000000-0000-0000-0000-0000000c01f1', null);
select pg_temp.check(
  (select name = 'Van loan' and amount = 455 from public.bills where id = (select id from ids where name = 'Van'))
  and pg_temp.charges_of((select id from ids where name = 'Van'))
      = (select jsonb_agg(to_jsonb(c) - 'updated_at' - 'mine' order by c.charged_on, c.id)
           from charges_before c where c.bill_id = (select id from ids where name = 'Van')),
  'upcoming only (update_loan) renames the loan and leaves its recorded payments as they landed');

-- ---------------------------------------------------------------- what it never touches
reset role;
select pg_temp.check(
  (select bool_and(to_jsonb(c) - 'updated_at' = to_jsonb(b) - 'updated_at' - 'mine')
     from charges_before b join public.charges c on c.id = b.id
    where not (b.bill_id = (select id from ids where name = 'Car') and b.mine))
  and (select count(*) = (select count(*) from charges_before) from public.charges c
        where c.user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3')),
  'every other charge is exactly as it was: the other loan, Rent, Stream, theirs, and the one planted under Car');
select pg_temp.check(
  (select payoffs from rows_before where id = (select id from ids where name = 'Car'))
    = pg_temp.payoffs_of((select id from ids where name = 'Car'))
  and (select count(*) = 1 from public.reminders where bill_id = (select id from ids where name = 'Car')),
  'its payoff keeps its own amount, account and date, and its reminder stays');
select pg_temp.check(
  (select bool_and(to_jsonb(b) = r.bill and to_jsonb(l) is not distinct from r.loan)
     from rows_before r join public.bills b on b.id = r.id left join public.loans l on l.bill_id = b.id
    where r.id not in (select id from ids where name in ('Car', 'Van'))),
  'bills and loans nobody edited, mine and theirs, are exactly as they were');

-- ---------------------------------------------------------------- refusals write nothing
create temp table car_before as
  select pg_temp.row_of(id) as row, pg_temp.charges_of(id) as charges, pg_temp.payoffs_of(id) as payoffs
  from ids where name = 'Car';
grant select on car_before to authenticated;
create or replace function pg_temp.car_unchanged() returns boolean
language sql as $$
  select pg_temp.row_of(i.id) = b.row and pg_temp.charges_of(i.id) = b.charges
         and pg_temp.payoffs_of(i.id) = b.payoffs
         and not exists (select 1 from public.charges where label = 'Renamed')
  from ids i, car_before b where i.name = 'Car'
$$;

select pg_temp.as_user('f1');
create or replace function pg_temp.refused(p_extra text, p_state text, p_words text) returns void
language plpgsql as $$
begin
  perform pg_temp.expect_error(format(
    $s$select pg_temp.edit('update_loan_and_charges', (select id from ids where name = 'Car'),
       'Renamed', 500, '00000000-0000-0000-0000-0000000c02f1', null, %L)$s$, p_extra),
    p_state, p_words);
end $$;
select pg_temp.refused($x$, p_payment_overrides => '{"60": 500}'::jsonb$x$, '23514', 'loans_payment_overrides_valid');
select pg_temp.refused($x$, p_payment_day => 0$x$, 'P0001', 'the payment day must be between 1 and 31');
select pg_temp.refused($x$, p_last_payment_on => '2029-12-28'$x$, 'P0001', 'the last payment must fall within the term');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', 18000, 6.5, 0, 500, 2160, '2026-01-27', null, 'actual/365', null, null, null)$s$,
  'P0001', 'a loan needs at least one payment');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', 18000, 6.5, 48, 500, 2160, null, null, 'actual/365', null, null, null)$s$,
  'P0001', 'a loan needs its first payment date');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', 18000, 100.000000001, 48, 500, 2160, '2026-01-27', null, 'actual/365', null, null, null)$s$,
  '23514', 'loans_annual_rate_check');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', -1, 6.5, 48, 500, 2160, '2026-01-27', null, 'actual/365', null, null, null)$s$,
  '23514', 'loans_principal_check');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', 18000, 6.5, 48, 500, 2160, '2026-01-27', null, 'daily', null, null, null)$s$,
  '23514', 'loans_day_count_basis_check');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', 18000, 6.5, 48, 500, 2160, '2026-01-27', null, 'actual/365',
     '00000000-0000-0000-0000-0000000c01f1', '00000000-0000-0000-0000-0000000a00f1', null)$s$,
  '23514', 'bills_single_source');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', 18000, 6.5, 48, 500, 2160, '2026-01-27', null, 'actual/365',
     '00000000-0000-0000-0000-0000000c00f3', null, null)$s$,
  'P0001', 'the card is not one of yours');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Car'), 'Renamed',
     'loan-car', 18000, 6.5, 48, 500, 2160, '2026-01-27', null, 'actual/365',
     null, '00000000-0000-0000-0000-0000000a00f3', null)$s$,
  'P0001', 'the account is not one of yours');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Rent'), 'Renamed',
     'loan-car', 18000, 6.5, 48, 500, 2160, '2026-01-27', null, 'actual/365', null, null, null)$s$,
  'P0002', 'there is no such loan');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges(gen_random_uuid(), 'Renamed',
     'loan-car', 18000, 6.5, 48, 500, 2160, '2026-01-27', null, 'actual/365', null, null, null)$s$,
  'P0002', 'there is no such loan');
select pg_temp.check(
  pg_temp.car_unchanged()
  and (select count(*) = 0 from public.bills where name = 'Renamed'),
  'every refusal is update_loan''s own, in its words, and leaves the loan, its payments and payoffs as they were');

-- ---------------------------------------------------------------- one transaction
-- A failure after update_loan has written: the whole call is undone, the loan's own edit with it.
reset role;
create function public.zz_refuse_charge_rewrite() returns trigger
language plpgsql as $$ begin raise exception 'refused for the check'; end $$;
create trigger zz_refuse_charge_rewrite before update on public.charges
  for each row execute function public.zz_refuse_charge_rewrite();
select pg_temp.as_user('f1');
savepoint alone;
select pg_temp.edit('update_loan', (select id from ids where name = 'Car'), 'Renamed', 500,
  '00000000-0000-0000-0000-0000000c02f1', null);
select pg_temp.check(
  (select name = 'Renamed' from public.bills where id = (select id from ids where name = 'Car')),
  'the same edit through update_loan alone goes through');
rollback to savepoint alone;
select pg_temp.expect_error(
  $s$select pg_temp.edit('update_loan_and_charges', (select id from ids where name = 'Car'),
     'Renamed', 500, '00000000-0000-0000-0000-0000000c02f1', null)$s$,
  'P0001', 'refused for the check');
select pg_temp.check(
  pg_temp.car_unchanged(),
  'when the payments cannot be rewritten, the loan is not edited either: nothing is half-written');
reset role;
drop trigger zz_refuse_charge_rewrite on public.charges;
drop function public.zz_refuse_charge_rewrite();

-- ---------------------------------------------------------------- someone else
select pg_temp.as_user('f3');
select pg_temp.expect_error(
  $s$select pg_temp.edit('update_loan_and_charges', (select id from ids where name = 'Car'),
     'Mine now', 1, '00000000-0000-0000-0000-0000000c00f3', null)$s$,
  'P0002', 'there is no such loan');
reset role;
select pg_temp.check(pg_temp.car_unchanged(), 'another person cannot edit my loan or its payments');
select pg_temp.as_user('f1');
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges((select id from ids where name = 'Theirs'), 'Mine now',
     'loan-car', 1, 9, 24, 1, 0, '2026-11-01', null, 'actual/365', null, null, null)$s$,
  'P0002', 'there is no such loan');
reset role;
select pg_temp.check(
  pg_temp.charges_of((select id from ids where name = 'Theirs'))
    = (select jsonb_agg(to_jsonb(c) - 'updated_at' - 'mine' order by c.charged_on, c.id)
         from charges_before c where c.bill_id = (select id from ids where name = 'Theirs'))
  and (select bill->>'name' = 'Theirs' from rows_before where id = (select id from ids where name = 'Theirs'))
  and (select name = 'Theirs' from public.bills where id = (select id from ids where name = 'Theirs')),
  'and I cannot edit theirs or its payments');

set local role anon;
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges(gen_random_uuid(), 'x', 'loan-car', 1, 9, 24, 1, 0,
     '2026-11-01', null, 'actual/365', null, null, null)$s$,
  '42501', 'permission denied for function update_loan_and_charges');
reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select pg_temp.expect_error(
  $s$select * from public.update_loan_and_charges(gen_random_uuid(), 'x', 'loan-car', 1, 9, 24, 1, 0,
     '2026-11-01', null, 'actual/365', null, null, null)$s$,
  'P0001', 'not authenticated');
reset role;

rollback;
\echo ALL CHECKS PASSED

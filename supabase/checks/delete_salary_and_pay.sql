-- Checks for 20261013100001_delete_salary_and_pay.sql. LOCAL database only, with it applied:
-- everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/delete_salary_and_pay.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- "Remove everything" takes the pay and every payday on its record, all or nothing, and nobody
-- else's; "keep past" (a plain delete of the pay) leaves its paydays counted with no pay.

\set ON_ERROR_STOP on
begin;

-- H removes; O is someone else.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'pay-delete@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'pay-delete-other@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2')
on conflict (id) do nothing;
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000d00e1', '00000000-0000-0000-0000-0000000000e1', 'H bank'),
  ('00000000-0000-0000-0000-0000000d00e2', '00000000-0000-0000-0000-0000000000e2', 'O bank');

-- H: Acme (three paydays), Cafe (two), Gift (a pay just this time) and Old (removed with "keep
-- past" below). O: Work (two).
insert into public.salary_sources (id, user_id, name, amount, frequency, last_payday) values
  ('00000000-0000-0000-0000-00000000a0e1', '00000000-0000-0000-0000-0000000000e1', 'Acme',  1834.62, 'biweekly', '2026-09-11'),
  ('00000000-0000-0000-0000-00000000b0e1', '00000000-0000-0000-0000-0000000000e1', 'Cafe',   412.37, 'monthly',  '2026-08-15'),
  ('00000000-0000-0000-0000-00000000c0e1', '00000000-0000-0000-0000-0000000000e1', 'Gift',   250.00, 'once',     '2026-08-22'),
  ('00000000-0000-0000-0000-00000000d0e1', '00000000-0000-0000-0000-0000000000e1', 'Old',    900.00, 'monthly',  '2026-08-01'),
  ('00000000-0000-0000-0000-00000000a0e2', '00000000-0000-0000-0000-0000000000e2', 'Work',  3100.00, 'monthly',  '2026-08-30');
insert into public.salary_source_accounts (salary_source_id, bank_account_id) values
  ('00000000-0000-0000-0000-00000000a0e1', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-00000000b0e1', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-00000000a0e2', '00000000-0000-0000-0000-0000000d00e2');
insert into public.pay_received (user_id, salary_source_id, label, amount, paid_on, bank_account_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000a0e1', 'Acme', 1790.00, '2026-08-28', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000a0e1', 'Acme', 1834.62, '2026-09-11', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000a0e1', 'Acme', 1834.62, '2026-09-25', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000b0e1', 'Cafe',  412.37, '2026-08-15', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000b0e1', 'Cafe',  412.37, '2026-09-15', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000c0e1', 'Gift',  250.00, '2026-08-22', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000d0e1', 'Old',   900.00, '2026-08-01', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000d0e1', 'Old',   900.00, '2026-09-01', '00000000-0000-0000-0000-0000000d00e1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000a0e2', 'Work', 3100.00, '2026-08-30', '00000000-0000-0000-0000-0000000d00e2'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000a0e2', 'Work', 3100.00, '2026-09-30', '00000000-0000-0000-0000-0000000d00e2');

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

create or replace function pg_temp.as_user(p_user text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_user), true);
end $$;

-- Everyone's pay as it stands, read past the row policies: (pay, salary, amount) per row.
create or replace function pg_temp.pay_of(p_user text) returns text
language sql as $$
  select coalesce(string_agg(format('%s|%s|%s', label, coalesce(salary_source_id::text, '-'), amount),
                             ',' order by paid_on, label), '')
    from public.pay_received
   where user_id = format('00000000-0000-0000-0000-0000000000%s', p_user)::uuid
$$;
create or replace function pg_temp.pay_total(p_user text) returns numeric
language sql as $$
  select coalesce(sum(amount), 0) from public.pay_received
   where user_id = format('00000000-0000-0000-0000-0000000000%s', p_user)::uuid
$$;

-- ---------------------------------------------------------------- shape and grants
select pg_temp.check(
  (select not prosecdef and proconfig @> array['search_path=public']
     from pg_proc where oid = 'public.delete_salary_and_pay(uuid)'::regprocedure),
  'runs as the caller, with its search path fixed');
select pg_temp.check(has_function_privilege('authenticated', 'public.delete_salary_and_pay(uuid)', 'execute'),
  'signed-in callers can run it');
select pg_temp.check(not has_function_privilege('anon', 'public.delete_salary_and_pay(uuid)', 'execute'),
  'signed-out callers cannot');
select pg_temp.check(
  not exists (select 1 from information_schema.routine_privileges
               where routine_name = 'delete_salary_and_pay' and grantee = 'PUBLIC'),
  'nor can PUBLIC');
select pg_temp.check(
  (with body as (select pg_get_functiondef('public.delete_salary_and_pay(uuid)'::regprocedure) as text),
        at as (select position('for update' in text) as lock,
                      position('delete from public.pay_received' in text) as paydays,
                      position('delete from public.salary_sources' in text) as pay
                 from body)
   select lock > 0 and lock < paydays and paydays < pay from at),
  'locks the pay, then deletes its paydays, then the pay');

-- ---------------------------------------------------------------- refusals write nothing
create temporary table before_refusals on commit drop as
  select pg_temp.pay_of('e1') as h, pg_temp.pay_of('e2') as o,
         (select count(*) from public.salary_sources) as salaries,
         (select count(*) from public.salary_source_accounts) as links;

select pg_temp.as_user('e1');
select pg_temp.expect_error(
  $q$select public.delete_salary_and_pay('00000000-0000-0000-0000-00000000a0e2')$q$,
  'P0002', 'there is no such pay');
select pg_temp.expect_error(
  $q$select public.delete_salary_and_pay(gen_random_uuid())$q$, 'P0002', 'there is no such pay');
select pg_temp.expect_error($q$select public.delete_salary_and_pay(null)$q$, 'P0002');
reset role;

select set_config('request.jwt.claims', '', true);
set local role authenticated;
select pg_temp.expect_error(
  $q$select public.delete_salary_and_pay('00000000-0000-0000-0000-00000000a0e1')$q$,
  'P0001', 'not authenticated');
reset role;

set local role anon;
select pg_temp.expect_error(
  $q$select public.delete_salary_and_pay('00000000-0000-0000-0000-00000000a0e1')$q$, '42501');
reset role;

-- A failure after the paydays are gone undoes them too.
create function pg_temp.refuse() returns trigger language plpgsql as $$
begin
  raise exception 'forced failure' using errcode = 'XX001';
end $$;
create trigger forced_failure before delete on public.salary_sources
  for each row execute function pg_temp.refuse();
select pg_temp.as_user('e1');
select pg_temp.expect_error(
  $q$select public.delete_salary_and_pay('00000000-0000-0000-0000-00000000a0e1')$q$,
  'XX001', 'forced failure');
reset role;
drop trigger forced_failure on public.salary_sources;

select pg_temp.check(
  (select h = pg_temp.pay_of('e1') and o = pg_temp.pay_of('e2')
          and salaries = (select count(*) from public.salary_sources)
          and links = (select count(*) from public.salary_source_accounts)
     from before_refusals),
  'every refusal, and a failure after the paydays went, left every pay and payday as it was');

-- ---------------------------------------------------------------- keep past: a plain delete
select pg_temp.as_user('e1');
delete from public.salary_sources where id = '00000000-0000-0000-0000-00000000d0e1';
reset role;
select pg_temp.check(
  pg_temp.pay_of('e1') like '%Old|-|900.00%Old|-|900.00%',
  'keep past: Old''s two paydays stay, with no pay');
select pg_temp.check(pg_temp.pay_total('e1') = 1790.00 + 1834.62 * 2 + 412.37 * 2 + 250.00 + 900.00 * 2,
  'keep past: every payday still counts');

-- ---------------------------------------------------------------- remove everything
select pg_temp.as_user('e1');
select public.delete_salary_and_pay('00000000-0000-0000-0000-00000000a0e1');
select pg_temp.check(
  not exists (select 1 from public.salary_sources where id = '00000000-0000-0000-0000-00000000a0e1'),
  'Acme is gone');
select pg_temp.check(
  not exists (select 1 from public.pay_received where label = 'Acme'),
  'and every payday it made');
select pg_temp.check(
  not exists (select 1 from public.salary_source_accounts
               where salary_source_id = '00000000-0000-0000-0000-00000000a0e1'),
  'and its accounts');
select pg_temp.expect_error(
  $q$select public.delete_salary_and_pay('00000000-0000-0000-0000-00000000a0e1')$q$,
  'P0002', 'there is no such pay');

-- A pay just this time goes the same way.
select public.delete_salary_and_pay('00000000-0000-0000-0000-00000000c0e1');
reset role;

select pg_temp.check(
  pg_temp.pay_of('e1') = 'Old|-|900.00,Cafe|00000000-0000-0000-0000-00000000b0e1|412.37,'
                         'Old|-|900.00,Cafe|00000000-0000-0000-0000-00000000b0e1|412.37',
  'Cafe and Old''s kept paydays are untouched');
select pg_temp.check(pg_temp.pay_total('e1') = 412.37 * 2 + 900.00 * 2,
  'H''s pay drops by exactly Acme''s and Gift''s paydays');
select pg_temp.check((select o from before_refusals) = pg_temp.pay_of('e2'), 'O''s pay is untouched');
select pg_temp.check(
  (select array_agg(name) = array['Cafe'] from public.salary_sources
    where user_id = '00000000-0000-0000-0000-0000000000e1'),
  'H has Cafe left');
select pg_temp.check(
  exists (select 1 from public.salary_sources where id = '00000000-0000-0000-0000-00000000a0e2'),
  'O still has Work');

rollback;
\echo ALL CHECKS PASSED

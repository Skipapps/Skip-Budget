-- Checks for 20261012200001_habit_past_days.sql. LOCAL database only, with it applied: everything
-- runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/habit_past_days.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- The receipts writes mirror the app's: "Past and upcoming" is now update_habit_and_days (checked
-- in update_habit_and_days.sql), "Remove everything" is useDeleteHabitAndDays's call.

\set ON_ERROR_STOP on
begin;

-- H edits and deletes; O is someone else, whose habit H must not reach.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'habit-days@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'habit-days-other@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2')
on conflict (id) do nothing;
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00f1', '00000000-0000-0000-0000-0000000000f1', 'H'),
  ('00000000-0000-0000-0000-0000000c00f2', '00000000-0000-0000-0000-0000000000f2', 'O');
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000d00f1', '00000000-0000-0000-0000-0000000000f1', 'H bank');
insert into public.receipt_books (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000b00f1', '00000000-0000-0000-0000-0000000000f1', 'Trip');

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

-- A receipt as stored, all but updated_at.
create or replace function pg_temp.receipt(p_id text) returns jsonb
language sql as $$
  select to_jsonb(r) - 'updated_at' from public.receipts r where r.id = p_id::uuid
$$;

-- ---------------------------------------------------------------- the schema
select pg_temp.check(
  not exists (select 1 from pg_trigger where tgname = 'habits_rename_receipts')
  and to_regprocedure('public.habit_renames_receipts()') is null,
  'the trigger that renamed every past day is gone, with its function');
select pg_temp.check(
  (select pg_get_triggerdef(oid) like '%BEFORE INSERT OR UPDATE OF purchased_on, habit_id ON public.receipts%'
     from pg_trigger where tgname = 'receipts_habit_not_before_creation'),
  'the not-before-creation rule still fires only on a new date or habit');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'delete_habit' and pronamespace = 'public'::regnamespace),
  'there is one delete_habit');
select pg_temp.check(
  (select not p.prosecdef and p.proconfig = array['search_path=public']
          and p.proowner::regrole::text = 'postgres' and p.prorettype = 'void'::regtype
          and p.proargnames = array['p_habit']
     from pg_proc p where p.oid = to_regprocedure('public.delete_habit(uuid)')),
  'it runs as the caller, on search_path public, owned by postgres, takes p_habit, returns nothing');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.delete_habit(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.delete_habit(uuid)', 'execute')
  and not has_function_privilege('public', 'public.delete_habit(uuid)', 'execute'),
  'signed-in people may call it, signed-out ones may not');

-- ---------------------------------------------------------------- the habits and their days
-- Written with no signed-in user, so the Pro check on a new habit passes.
select set_config('request.jwt.claims', '', true);
insert into public.habits (id, user_id, name, icon_id, color, price, category_id, card_id, started_on, saved_from)
values ('00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-0000000000f1', 'Coffee',
        'food-dining/coffee', 'caramel', 5.35, 'dining', '00000000-0000-0000-0000-0000000c00f1',
        '2026-10-05', '2026-10-08');
insert into public.habits (id, user_id, name, icon_id, color, price, bank_account_id, started_on, saved_from)
values ('00000000-0000-0000-0000-00000000f0c2', '00000000-0000-0000-0000-0000000000f1', 'Taxi & rides',
        'transport/taxi-rides', 'violet', 15, '00000000-0000-0000-0000-0000000d00f1', '2026-10-05', '2026-10-05'),
       ('00000000-0000-0000-0000-00000000f0c3', '00000000-0000-0000-0000-0000000000f1', 'Snacks',
        'food-dining/snacks-sweets', 'pink', 4, null, '2026-10-05', '2026-10-05'),
       ('00000000-0000-0000-0000-00000000f0c9', '00000000-0000-0000-0000-0000000000f2', 'Tea',
        'food-dining/coffee', 'green', 3, null, '2026-10-05', '2026-10-05');

-- Coffee's days: one filed before the not-before-creation rule (dated before the habit was made),
-- one as tapped, and one whose amount was edited on its own and kept in a book.
alter table public.receipts disable trigger receipts_habit_not_before_creation;
insert into public.receipts (id, user_id, merchant, amount, purchased_on, category_id, card_id, note, source, habit_id)
values ('00000000-0000-0000-0000-0000000f0f06', '00000000-0000-0000-0000-0000000000f1', 'Coffee', 5.35,
        '2026-10-06', 'dining', '00000000-0000-0000-0000-0000000c00f1', 'oat milk', 'habit',
        '00000000-0000-0000-0000-00000000f0c1');
alter table public.receipts enable trigger receipts_habit_not_before_creation;
insert into public.receipts (id, user_id, merchant, amount, purchased_on, category_id, card_id, source, habit_id, book_id)
values ('00000000-0000-0000-0000-0000000f0f08', '00000000-0000-0000-0000-0000000000f1', 'Coffee', 5.35,
        '2026-10-08', 'dining', '00000000-0000-0000-0000-0000000c00f1', 'habit',
        '00000000-0000-0000-0000-00000000f0c1', null),
       ('00000000-0000-0000-0000-0000000f0f09', '00000000-0000-0000-0000-0000000000f1', 'Coffee', 6.10,
        '2026-10-09', 'dining', '00000000-0000-0000-0000-0000000c00f1', 'habit',
        '00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-0000000b00f1');
insert into public.receipts (id, user_id, merchant, amount, purchased_on, bank_account_id, source, habit_id)
values ('00000000-0000-0000-0000-0000000f0f10', '00000000-0000-0000-0000-0000000000f1', 'Taxi & rides', 15,
        '2026-10-08', '00000000-0000-0000-0000-0000000d00f1', 'habit', '00000000-0000-0000-0000-00000000f0c2'),
       ('00000000-0000-0000-0000-0000000f0f90', '00000000-0000-0000-0000-0000000000f2', 'Tea', 3,
        '2026-10-08', null, 'habit', '00000000-0000-0000-0000-00000000f0c9');
insert into public.receipts (id, user_id, merchant, amount, purchased_on, card_id, source)
values ('00000000-0000-0000-0000-0000000f0f11', '00000000-0000-0000-0000-0000000000f1', 'Coffee', 4.20,
        '2026-10-08', '00000000-0000-0000-0000-0000000c00f1', 'manual');

create temp table before_edit as
  select id, pg_temp.receipt(id::text) as row from public.receipts
   where user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2');
create temp table rewritten (id uuid);
grant select, insert on rewritten to authenticated;

-- Every receipt in before_edit (but those in rewritten, when asked) exactly as it was. Read as
-- postgres: under the row policies another person's row reads as null, which bool_and skips.
create or replace function pg_temp.unchanged(p_skip_rewritten boolean) returns boolean
language sql as $$
  select bool_and(coalesce(pg_temp.receipt(b.id::text) = b.row, false))
    from before_edit b
   where not p_skip_rewritten or b.id not in (select id from rewritten)
$$;

-- ---------------------------------------------------------------- Upcoming only
-- Every copied value changes on the habit; the days already filed keep theirs.
select pg_temp.as_user('f1');
update public.habits
   set name = 'Lattes', price = 6.00, category_id = 'other', card_id = null,
       bank_account_id = '00000000-0000-0000-0000-0000000d00f1'
 where id = '00000000-0000-0000-0000-00000000f0c1';
reset role;
select pg_temp.check(
  pg_temp.unchanged(false) and (select count(*) = 6 from before_edit),
  'an edited habit leaves every receipt as it was, its own days included');

-- ---------------------------------------------------------------- Past and upcoming
select pg_temp.as_user('f1');
with written as (
  update public.receipts
     set merchant = 'Lattes', amount = 6.00, category_id = 'other', card_id = null,
         bank_account_id = '00000000-0000-0000-0000-0000000d00f1'
   where habit_id = '00000000-0000-0000-0000-00000000f0c1'
  returning id
)
insert into rewritten select id from written;
reset role;
select pg_temp.check((select count(*) = 3 from rewritten),
  'the rewrite reaches all three of the habit''s days, the one filed before the habit was made included');
select pg_temp.check(
  (select bool_and(r.merchant = 'Lattes' and r.amount = 6.00 and r.category_id = 'other'
                   and r.card_id is null and r.bank_account_id = '00000000-0000-0000-0000-0000000d00f1')
     from public.receipts r where r.habit_id = '00000000-0000-0000-0000-00000000f0c1'),
  'each now carries the new name, price, category and account, an amount edited on its own too');
select pg_temp.check(
  (select bool_and(
            (pg_temp.receipt(b.id::text) - array['merchant', 'amount', 'category_id', 'card_id', 'bank_account_id'])
            = (b.row - array['merchant', 'amount', 'category_id', 'card_id', 'bank_account_id']))
     from before_edit b where b.id in (select id from rewritten)),
  'and keeps its id, day, note, book, source, habit and when it was saved');
select pg_temp.check(
  pg_temp.unchanged(true) and (select count(*) = 3 from before_edit where id not in (select id from rewritten)),
  'another habit''s day, a receipt from no habit and another person''s day are untouched');

-- ---------------------------------------------------------------- Remove everything: refusals
select pg_temp.as_user('f2');
select pg_temp.expect_error(
  $q$select public.delete_habit('00000000-0000-0000-0000-00000000f0c1')$q$,
  'P0002', 'there is no such habit');
select pg_temp.as_user('f1');
select pg_temp.expect_error(
  $q$select public.delete_habit('00000000-0000-0000-0000-00000000f0c9')$q$,
  'P0002', 'there is no such habit');
select pg_temp.expect_error(
  $q$select public.delete_habit(gen_random_uuid())$q$,
  'P0002', 'there is no such habit');
reset role;
select pg_temp.check(
  (select count(*) = 3 from public.receipts where habit_id = '00000000-0000-0000-0000-00000000f0c1')
  and exists (select 1 from public.habits where id = '00000000-0000-0000-0000-00000000f0c1')
  and exists (select 1 from public.receipts where habit_id = '00000000-0000-0000-0000-00000000f0c9')
  and exists (select 1 from public.habits where id = '00000000-0000-0000-0000-00000000f0c9'),
  'a habit that is not the caller''s, or not there, removes nothing anywhere');

set local role anon;
select pg_temp.expect_error(
  $q$select public.delete_habit('00000000-0000-0000-0000-00000000f0c1')$q$,
  '42501', 'permission denied for function delete_habit');
reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select pg_temp.expect_error(
  $q$select public.delete_habit('00000000-0000-0000-0000-00000000f0c1')$q$,
  'P0001', 'not authenticated');
reset role;

-- One transaction: when the habit cannot go, its days stay too.
create function public.habit_past_days_check_refuse() returns trigger
language plpgsql as $$
begin
  raise exception 'refused for the check';
end $$;
create trigger habit_past_days_check_refuse before delete on public.habits
  for each row execute function public.habit_past_days_check_refuse();
select pg_temp.as_user('f1');
select pg_temp.expect_error(
  $q$select public.delete_habit('00000000-0000-0000-0000-00000000f0c1')$q$,
  'P0001', 'refused for the check');
reset role;
select pg_temp.check(
  (select count(*) = 3 from public.receipts where habit_id = '00000000-0000-0000-0000-00000000f0c1'),
  'a habit delete that fails leaves every one of its days');
drop trigger habit_past_days_check_refuse on public.habits;
drop function public.habit_past_days_check_refuse();

-- ---------------------------------------------------------------- Remove everything
select pg_temp.as_user('f1');
select public.delete_habit('00000000-0000-0000-0000-00000000f0c1');
reset role;
select pg_temp.check(
  not exists (select 1 from public.habits where id = '00000000-0000-0000-0000-00000000f0c1')
  and not exists (select 1 from public.receipts where id in (
    '00000000-0000-0000-0000-0000000f0f06', '00000000-0000-0000-0000-0000000f0f08',
    '00000000-0000-0000-0000-0000000f0f09')),
  'the habit and all its days are gone, the early one and the one in a book included');
select pg_temp.check(
  not exists (select 1 from public.receipts where merchant = 'Lattes'),
  'none was left behind unlinked');
select pg_temp.check(
  exists (select 1 from public.receipt_books where id = '00000000-0000-0000-0000-0000000b00f1')
  and pg_temp.unchanged(true),
  'the book stays, and every other receipt is exactly as it was');
select pg_temp.check(
  (select count(*) = 3 from public.habits
    where id in ('00000000-0000-0000-0000-00000000f0c2', '00000000-0000-0000-0000-00000000f0c3',
                 '00000000-0000-0000-0000-00000000f0c9')),
  'other habits stay');

select pg_temp.as_user('f1');
select pg_temp.expect_error(
  $q$select public.delete_habit('00000000-0000-0000-0000-00000000f0c1')$q$,
  'P0002', 'there is no such habit');
select pg_temp.expect_error(
  $q$insert into public.receipts (user_id, merchant, amount, purchased_on, source, habit_id)
     values ('00000000-0000-0000-0000-0000000000f1', 'Lattes', 6, '2026-10-10', 'habit',
             '00000000-0000-0000-0000-00000000f0c1')$q$,
  '23514', 'your own habits');
reset role;
select pg_temp.check(true, 'removing it again is refused, and so is a tap on it');

-- A habit already deleted with "Keep past days" can still be removed with everything.
select pg_temp.as_user('f1');
update public.habits set archived_at = now() where id = '00000000-0000-0000-0000-00000000f0c2';
select public.delete_habit('00000000-0000-0000-0000-00000000f0c2');
-- One that never filed a day.
select public.delete_habit('00000000-0000-0000-0000-00000000f0c3');
reset role;
select pg_temp.check(
  not exists (select 1 from public.habits
               where id in ('00000000-0000-0000-0000-00000000f0c2', '00000000-0000-0000-0000-00000000f0c3'))
  and not exists (select 1 from public.receipts where id = '00000000-0000-0000-0000-0000000f0f10'),
  'an archived habit goes with its days, and a habit with none goes too');
select pg_temp.check(
  (select count(*) = 1 from public.receipts where user_id = '00000000-0000-0000-0000-0000000000f1')
  and exists (select 1 from public.receipts where id = '00000000-0000-0000-0000-0000000f0f11')
  and (select count(*) = 1 from public.receipts where user_id = '00000000-0000-0000-0000-0000000000f2'),
  'H keeps the receipt from no habit, and O keeps everything');

rollback;
\echo ALL CHECKS PASSED

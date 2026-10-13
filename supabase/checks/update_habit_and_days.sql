-- Checks for 20261013500001_update_habit_and_days.sql. LOCAL database only, with it applied:
-- everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/update_habit_and_days.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- "Past and upcoming" must save the habit and give every day it filed what a tap would file now,
-- all or nothing, on any plan, and reach no one else's habit or receipts. The refusals run first,
-- against the rows as set up, so one snapshot shows each wrote nothing.

\set ON_ERROR_STOP on
begin;

-- H edits, on the free plan; O is someone else.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'habit-and-days@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'habit-and-days-other@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2')
on conflict (id) do nothing;
-- One card and one account each: the free allowance.
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00f1', '00000000-0000-0000-0000-0000000000f1', 'H'),
  ('00000000-0000-0000-0000-0000000c00f2', '00000000-0000-0000-0000-0000000000f2', 'O');
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000d00f1', '00000000-0000-0000-0000-0000000000f1', 'H bank'),
  ('00000000-0000-0000-0000-0000000d00f2', '00000000-0000-0000-0000-0000000000f2', 'O bank');
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

-- A habit and a receipt as stored, all but updated_at.
create or replace function pg_temp.habit(p_id text) returns jsonb
language sql as $$
  select to_jsonb(h) - 'updated_at' from public.habits h where h.id = p_id::uuid
$$;
create or replace function pg_temp.receipt(p_id text) returns jsonb
language sql as $$
  select to_jsonb(r) - 'updated_at' from public.receipts r where r.id = p_id::uuid
$$;

-- The edit page's Past and upcoming call, on H's Coffee unless p_habit says otherwise. Each
-- argument is what an untouched page sends, so a case names only what it changes.
create or replace function pg_temp.edit(
  p_name     text    default 'Coffee',
  p_price    numeric default 5.35,
  p_card     text    default '00000000-0000-0000-0000-0000000c00f1',
  p_account  text    default null,
  p_icon     text    default 'food-dining/coffee',
  p_color    text    default 'caramel',
  p_category text    default null,
  p_habit    text    default '00000000-0000-0000-0000-00000000f0c1')
returns public.habits
language plpgsql as $$
declare
  v_habit public.habits;
begin
  execute format(
    $f$select * from public.update_habit_and_days(
       p_habit => %L::uuid, p_name => %L, p_icon_id => %L, p_color => %L, p_price => %L::numeric,
       p_card_id => %L::uuid, p_bank_account_id => %L::uuid, p_category_id => %L)$f$,
    p_habit, p_name, p_icon, p_color, p_price, p_card, p_account, p_category)
    into v_habit;
  return v_habit;
end $$;

-- ---------------------------------------------------------------- the function
select pg_temp.check(
  (select count(*) = 1 from pg_proc
    where proname = 'update_habit_and_days' and pronamespace = 'public'::regnamespace),
  'there is one update_habit_and_days');
select pg_temp.check(
  (select not p.prosecdef and p.proconfig = array['search_path=public']
          and p.proowner::regrole::text = 'postgres' and p.prorettype = 'public.habits'::regtype
          and not p.proretset
          and p.proargnames = array['p_habit', 'p_name', 'p_icon_id', 'p_color', 'p_price',
                                    'p_card_id', 'p_bank_account_id', 'p_category_id']
          and p.pronargdefaults = 1
     from pg_proc p
    where p.oid = to_regprocedure('public.update_habit_and_days(uuid,text,text,text,numeric,uuid,uuid,text)')),
  'it runs as the caller, on search_path public, owned by postgres, and returns the one habit; only the category may be left out');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.update_habit_and_days(uuid,text,text,text,numeric,uuid,uuid,text)', 'execute')
  and not has_function_privilege('anon', 'public.update_habit_and_days(uuid,text,text,text,numeric,uuid,uuid,text)', 'execute')
  and not has_function_privilege('public', 'public.update_habit_and_days(uuid,text,text,text,numeric,uuid,uuid,text)', 'execute'),
  'signed-in people may call it, signed-out ones may not');

-- ---------------------------------------------------------------- the habits and their days
-- Written with no signed-in user, so the Pro check on a new habit passes.
select set_config('request.jwt.claims', '', true);
insert into public.habits (id, user_id, name, icon_id, color, price, category_id, card_id, preset_id,
                           started_on, saved_from, sort_order)
values ('00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-0000000000f1', 'Coffee',
        'food-dining/coffee', 'caramel', 5.35, 'dining', '00000000-0000-0000-0000-0000000c00f1',
        'coffee', '2026-10-05', '2026-10-08', 3);
insert into public.habits (id, user_id, name, icon_id, color, price, card_id, bank_account_id,
                           started_on, saved_from)
values ('00000000-0000-0000-0000-00000000f0c2', '00000000-0000-0000-0000-0000000000f1', 'Taxi & rides',
        'transport/taxi-rides', 'violet', 15, null, '00000000-0000-0000-0000-0000000d00f1',
        '2026-10-05', '2026-10-05'),
       ('00000000-0000-0000-0000-00000000f0c9', '00000000-0000-0000-0000-0000000000f2', 'Tea',
        'food-dining/coffee', 'green', 3, '00000000-0000-0000-0000-0000000c00f2', null,
        '2026-10-05', '2026-10-05');

-- Coffee's days: one dated before the habit was made (filed before that rule), one as tapped, and
-- one whose amount was edited on its own and kept in a book.
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
       ('00000000-0000-0000-0000-0000000f0f09', '00000000-0000-0000-0000-0000000000f1', 'Coffee', 6.40,
        '2026-10-09', 'dining', '00000000-0000-0000-0000-0000000c00f1', 'habit',
        '00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-0000000b00f1');
-- Another habit's day, a receipt from no habit under the same name, and O's own day.
insert into public.receipts (id, user_id, merchant, amount, purchased_on, card_id, bank_account_id, source, habit_id)
values ('00000000-0000-0000-0000-0000000f0f10', '00000000-0000-0000-0000-0000000000f1', 'Taxi & rides', 15,
        '2026-10-08', null, '00000000-0000-0000-0000-0000000d00f1', 'habit', '00000000-0000-0000-0000-00000000f0c2'),
       ('00000000-0000-0000-0000-0000000f0f11', '00000000-0000-0000-0000-0000000000f1', 'Coffee', 4.20,
        '2026-10-08', '00000000-0000-0000-0000-0000000c00f1', null, 'manual', null),
       ('00000000-0000-0000-0000-0000000f0f90', '00000000-0000-0000-0000-0000000000f2', 'Tea', 3,
        '2026-10-08', '00000000-0000-0000-0000-0000000c00f2', null, 'habit', '00000000-0000-0000-0000-00000000f0c9');
-- O's receipt filed under H's Coffee, which receipts_own_habit refuses: only row security keeps the
-- rewrite off it, so the function must run as the caller.
alter table public.receipts disable trigger receipts_own_habit;
insert into public.receipts (id, user_id, merchant, amount, purchased_on, card_id, source, habit_id)
values ('00000000-0000-0000-0000-0000000f0f91', '00000000-0000-0000-0000-0000000000f2', 'Planted', 1,
        '2026-10-10', '00000000-0000-0000-0000-0000000c00f2', 'habit', '00000000-0000-0000-0000-00000000f0c1');
alter table public.receipts enable trigger receipts_own_habit;

create temp table rows_before as
  select 'habit' as kind, h.id, to_jsonb(h) - 'updated_at' as row from public.habits h
   where h.user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2')
  union all
  select 'receipt', r.id, to_jsonb(r) - 'updated_at' from public.receipts r
   where r.user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2');

-- Every habit and receipt of H and O, but those in p_except, exactly as set up, and none added or
-- removed. Read as postgres: under the row policies another person's row reads as null.
create or replace function pg_temp.unchanged(p_except uuid[] default '{}') returns boolean
language sql as $$
  select bool_and(coalesce(
           case b.kind when 'habit' then pg_temp.habit(b.id::text) else pg_temp.receipt(b.id::text) end
             = b.row,
           false))
         and (select count(*) from public.habits
               where user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2'))
           + (select count(*) from public.receipts
               where user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2'))
           = (select count(*) from rows_before)
    from rows_before b
   where b.id <> all (p_except)
$$;

-- Each of H's Coffee days carries the habit's name, price, category and Paid with as stored now,
-- and keeps everything else it was set up with: id, day, habit, note, book, source, when saved.
create or replace function pg_temp.days_follow_coffee() returns boolean
language sql as $$
  select count(*) = 3
         and bool_and(r.merchant = h.name and r.amount = h.price and r.category_id = h.category_id
                      and r.card_id is not distinct from h.card_id
                      and r.bank_account_id is not distinct from h.bank_account_id)
         and bool_and(
               (to_jsonb(r) - 'updated_at' - array['merchant', 'amount', 'category_id', 'card_id', 'bank_account_id'])
               = (b.row - array['merchant', 'amount', 'category_id', 'card_id', 'bank_account_id']))
    from public.receipts r
    join public.habits h on h.id = r.habit_id
    join rows_before b on b.id = r.id
   where r.habit_id = '00000000-0000-0000-0000-00000000f0c1'
     and r.user_id = '00000000-0000-0000-0000-0000000000f1'
$$;

-- The columns an edit may change on the habit; the rest must stay as set up.
create or replace function pg_temp.coffee_keeps_the_rest() returns boolean
language sql as $$
  select (pg_temp.habit('00000000-0000-0000-0000-00000000f0c1')
            - array['name', 'icon_id', 'color', 'price', 'category_id', 'card_id', 'bank_account_id'])
       = (b.row - array['name', 'icon_id', 'color', 'price', 'category_id', 'card_id', 'bank_account_id'])
    from rows_before b where b.id = '00000000-0000-0000-0000-00000000f0c1'
$$;

select pg_temp.check(
  (select count(*) = 4 from rows_before b
    where b.kind = 'receipt' and b.row->>'habit_id' = '00000000-0000-0000-0000-00000000f0c1')
  and (select count(*) = 3 from public.habits where id::text like '00000000-0000-0000-0000-00000000f0c%')
  and not public.is_pro('00000000-0000-0000-0000-0000000000f1'),
  'set up: Coffee has three days of H''s and one of O''s planted on it, and H is on the free plan');

-- ---------------------------------------------------------------- refusals write nothing
select pg_temp.as_user('f1');
select pg_temp.expect_error($s$select pg_temp.edit(p_price => 0)$s$,
  '22023', 'a habit needs a price in whole cents above zero');
select pg_temp.expect_error($s$select pg_temp.edit(p_price => -4.5)$s$,
  '22023', 'a habit needs a price in whole cents above zero');
select pg_temp.expect_error($s$select pg_temp.edit(p_price => null)$s$,
  '22023', 'a habit needs a price in whole cents above zero');
-- The column would round these two, and NaN would pass its price > 0.
select pg_temp.expect_error($s$select pg_temp.edit(p_price => 4.355)$s$,
  '22023', 'a habit needs a price in whole cents above zero');
select pg_temp.expect_error($s$select pg_temp.edit(p_price => 'NaN')$s$,
  '22023', 'a habit needs a price in whole cents above zero');
select pg_temp.expect_error($s$select pg_temp.edit(p_price => 10000000000000)$s$,
  '22003', 'numeric field overflow');
select pg_temp.expect_error($s$select pg_temp.edit(p_name => '   ')$s$,
  '23514', 'habits_name_trimmed');
select pg_temp.expect_error($s$select pg_temp.edit(p_name => null)$s$,
  '23502', 'name');
select pg_temp.expect_error($s$select pg_temp.edit(p_icon => '')$s$,
  '23514', 'habits_icon_present');
select pg_temp.expect_error($s$select pg_temp.edit(p_color => 'red')$s$,
  '23514', 'habits_color_known');
select pg_temp.expect_error($s$select pg_temp.edit(p_category => 'no-such-category')$s$,
  '23503', 'habits_category_id_fkey');
select pg_temp.expect_error(
  $s$select pg_temp.edit(p_card => '00000000-0000-0000-0000-0000000c00f2')$s$,
  '23514', 'one of your own cards');
select pg_temp.expect_error(
  $s$select pg_temp.edit(p_card => null, p_account => '00000000-0000-0000-0000-0000000d00f2')$s$,
  '23514', 'one of your own accounts');
reset role;
select pg_temp.check(pg_temp.unchanged(),
  'each refusal leaves the habit and every receipt as they were, its own days included');

-- After the habit is written: a failure in the rewrite undoes the habit's own edit too.
create function public.zz_refuse_habit_day_rewrite() returns trigger
language plpgsql as $$ begin raise exception 'refused for the check'; end $$;
create trigger zz_refuse_habit_day_rewrite before update on public.receipts
  for each row execute function public.zz_refuse_habit_day_rewrite();
select pg_temp.as_user('f1');
savepoint alone;
update public.habits set name = 'Lattes', price = 6.10 where id = '00000000-0000-0000-0000-00000000f0c1';
select pg_temp.check(
  (select name = 'Lattes' and price = 6.10 from public.habits where id = '00000000-0000-0000-0000-00000000f0c1'),
  'the habit''s own update goes through alone');
rollback to savepoint alone;
select pg_temp.expect_error($s$select pg_temp.edit(p_name => 'Lattes', p_price => 6.10)$s$,
  'P0001', 'refused for the check');
reset role;
select pg_temp.check(pg_temp.unchanged(),
  'when the days cannot be rewritten the habit is not edited either: nothing is half-written');
drop trigger zz_refuse_habit_day_rewrite on public.receipts;
drop function public.zz_refuse_habit_day_rewrite();

-- ---------------------------------------------------------------- someone else, or nothing there
select pg_temp.as_user('f2');
select pg_temp.expect_error(
  $s$select pg_temp.edit(p_name => 'Mine now', p_price => 1, p_card => '00000000-0000-0000-0000-0000000c00f2')$s$,
  'P0002', 'there is no such habit');
select pg_temp.expect_error($s$select pg_temp.edit(p_name => 'Mine now', p_price => 1, p_card => null)$s$,
  'P0002', 'there is no such habit');
select pg_temp.as_user('f1');
select pg_temp.expect_error(
  $s$select pg_temp.edit(p_name => 'Mine now', p_price => 1, p_card => null,
       p_habit => '00000000-0000-0000-0000-00000000f0c9')$s$,
  'P0002', 'there is no such habit');
select pg_temp.expect_error(
  $s$select pg_temp.edit(p_habit => gen_random_uuid()::text)$s$,
  'P0002', 'there is no such habit');
-- Removed with everything on another phone first.
savepoint gone;
select public.delete_habit('00000000-0000-0000-0000-00000000f0c2');
select pg_temp.expect_error(
  $s$select pg_temp.edit(p_name => 'Taxi', p_price => 15, p_card => null,
       p_account => '00000000-0000-0000-0000-0000000d00f1', p_icon => 'transport/taxi-rides',
       p_color => 'violet', p_habit => '00000000-0000-0000-0000-00000000f0c2')$s$,
  'P0002', 'there is no such habit');
rollback to savepoint gone;
reset role;
select pg_temp.check(pg_temp.unchanged(),
  'O cannot edit H''s habit or its days, H cannot edit O''s, and a habit not there is refused in delete_habit''s words');

set local role anon;
select pg_temp.expect_error(
  $s$select * from public.update_habit_and_days('00000000-0000-0000-0000-00000000f0c1', 'x',
     'food-dining/coffee', 'caramel', 1, null, null)$s$,
  '42501', 'permission denied for function update_habit_and_days');
reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select pg_temp.expect_error(
  $s$select * from public.update_habit_and_days('00000000-0000-0000-0000-00000000f0c1', 'x',
     'food-dining/coffee', 'caramel', 1, null, null)$s$,
  'P0001', 'not authenticated');
reset role;
select pg_temp.check(pg_temp.unchanged(), 'signed out, nothing is written either');

-- ---------------------------------------------------------------- past and upcoming
-- Card to account, a new name with stray spaces, a new price and colour; the category left out.
select pg_temp.as_user('f1');
create temp table returned as
  select * from public.update_habit_and_days(
    p_habit => '00000000-0000-0000-0000-00000000f0c1', p_name => '  Lattes ',
    p_icon_id => 'food-dining/coffee', p_color => 'violet', p_price => 6.10,
    p_card_id => null, p_bank_account_id => '00000000-0000-0000-0000-0000000d00f1');
select pg_temp.check(
  (select count(*) = 1 from returned)
  and (select to_jsonb(r) = to_jsonb(h)
         from returned r, public.habits h where h.id = '00000000-0000-0000-0000-00000000f0c1'),
  'it returns the habit as now stored');
reset role;
select pg_temp.check(
  (select name = 'Lattes' and color = 'violet' and price = 6.10 and category_id = 'dining'
          and card_id is null and bank_account_id = '00000000-0000-0000-0000-0000000d00f1'
     from public.habits where id = '00000000-0000-0000-0000-00000000f0c1')
  and pg_temp.coffee_keeps_the_rest(),
  'a free account edits its habit: trimmed, $6.10, violet, from the account, its category kept');
select pg_temp.check(
  pg_temp.days_follow_coffee()
  and (select bool_and(merchant = 'Lattes' and amount = 6.10 and card_id is null
                       and bank_account_id = '00000000-0000-0000-0000-0000000d00f1')
         from public.receipts
        where id in ('00000000-0000-0000-0000-0000000f0f06', '00000000-0000-0000-0000-0000000f0f08',
                     '00000000-0000-0000-0000-0000000f0f09')),
  'all three days now read Lattes, $6.10, from the account: the one dated before the habit was made and the one edited on its own too');
select pg_temp.check(
  (select note = 'oat milk' and purchased_on = '2026-10-06' from public.receipts
    where id = '00000000-0000-0000-0000-0000000f0f06')
  and (select book_id = '00000000-0000-0000-0000-0000000b00f1' and purchased_on = '2026-10-09'
         from public.receipts where id = '00000000-0000-0000-0000-0000000f0f09'),
  'each keeps its day, habit, note and book');
select pg_temp.check(
  pg_temp.unchanged(array['00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-0000000f0f06',
                          '00000000-0000-0000-0000-0000000f0f08', '00000000-0000-0000-0000-0000000f0f09']::uuid[]),
  'every other habit and receipt is exactly as it was: Taxi''s day, the receipt from no habit, O''s Tea and the day O planted on Coffee');

-- A new icon in another spend category: the app sends its category.
select pg_temp.as_user('f1');
select pg_temp.edit(p_name => 'Lattes', p_price => 6.10, p_card => null,
  p_account => '00000000-0000-0000-0000-0000000d00f1', p_icon => 'food-dining/groceries',
  p_color => 'violet', p_category => 'groceries');
reset role;
select pg_temp.check(
  (select icon_id = 'food-dining/groceries' and category_id = 'groceries' from public.habits
    where id = '00000000-0000-0000-0000-00000000f0c1')
  and pg_temp.days_follow_coffee()
  and (select count(*) = 3 from public.receipts
        where category_id = 'groceries'
          and user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2')),
  'a category given moves the habit and its three days under it');

-- Named both, the card wins on the habit and on every day, which had an account until now.
select pg_temp.as_user('f1');
select pg_temp.edit(p_name => 'Lattes', p_price => 6.10, p_card => '00000000-0000-0000-0000-0000000c00f1',
  p_account => '00000000-0000-0000-0000-0000000d00f1', p_icon => 'food-dining/groceries', p_color => 'violet');
reset role;
select pg_temp.check(
  (select card_id = '00000000-0000-0000-0000-0000000c00f1' and bank_account_id is null
          and category_id = 'groceries'
     from public.habits where id = '00000000-0000-0000-0000-00000000f0c1')
  and pg_temp.days_follow_coffee()
  and (select bool_and(card_id = '00000000-0000-0000-0000-0000000c00f1' and bank_account_id is null)
         from public.receipts where habit_id = '00000000-0000-0000-0000-00000000f0c1'
          and user_id = '00000000-0000-0000-0000-0000000000f1'),
  'a card and an account named together: the card wins on the habit and its days, the account is cleared');

-- Skip, and back to the old name and price, to the cent.
select pg_temp.as_user('f1');
select pg_temp.edit(p_card => null, p_icon => 'food-dining/groceries', p_color => 'violet');
reset role;
select pg_temp.check(
  (select name = 'Coffee' and price = 5.35 and card_id is null and bank_account_id is null
     from public.habits where id = '00000000-0000-0000-0000-00000000f0c1')
  and pg_temp.days_follow_coffee()
  and (select bool_and(amount = 5.35 and card_id is null and bank_account_id is null)
         from public.receipts where habit_id = '00000000-0000-0000-0000-00000000f0c1'
          and user_id = '00000000-0000-0000-0000-0000000000f1'),
  'Skip leaves the habit and its days with no card or account; the days are back at $5.35, the one once $6.40 included');
select pg_temp.check(
  pg_temp.unchanged(array['00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-0000000f0f06',
                          '00000000-0000-0000-0000-0000000f0f08', '00000000-0000-0000-0000-0000000f0f09']::uuid[])
  and pg_temp.coffee_keeps_the_rest(),
  'and through every edit, nothing but Coffee and its three days changed, and Coffee kept its preset, dates, order and owner');

rollback;
\echo ALL CHECKS PASSED

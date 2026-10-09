-- Checks for 20261009100001_capture_source_habit.sql, 20261009100002_habits.sql,
-- 20261009100003_receipt_reminder_ignores_habits.sql and
-- 20261009100004_habit_receipt_not_before_creation.sql. LOCAL database only, with all four applied:
-- everything runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/habits.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

-- Three accounts: A free, P Pro, L lapsed Pro.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'p@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'l@test.local');

insert into public.profiles (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b1')
on conflict (id) do nothing;

insert into public.entitlements (user_id, pro, expires_at) values
  ('00000000-0000-0000-0000-0000000000a1', true, null),
  ('00000000-0000-0000-0000-0000000000b1', true, now() - interval '1 day');

insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000000a', 'A'),
  ('00000000-0000-0000-0000-0000000c00a1', '00000000-0000-0000-0000-0000000000a1', 'P');
insert into public.bank_accounts (id, user_id, bank_name) values
  ('00000000-0000-0000-0000-0000000d00a1', '00000000-0000-0000-0000-0000000000a1', 'P bank');

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

-- The DETAIL of the error a statement raises, or null when it succeeds (and is then kept).
create or replace function pg_temp.error_detail(p_sql text) returns text
language plpgsql as $$
declare
  v_detail text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_detail = pg_exception_detail;
    return v_detail;
  end;
  return null;
end $$;

create or replace function pg_temp.as_user(p_id text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------- the schema
select pg_temp.check('habit' = any(enum_range(null::public.capture_source)::text[]),
  'receipts can say they came from a habit');
select pg_temp.check(has_table_privilege('authenticated', 'public.habits', 'select, insert, update, delete'),
  'signed-in people can reach the table (rows are theirs by policy)');
select pg_temp.check((select relrowsecurity from pg_class where oid = 'public.habits'::regclass),
  'row level security is on');
select pg_temp.check(exists (select 1 from pg_publication_tables
                              where pubname = 'supabase_realtime' and tablename = 'habits'),
  'habits are published for realtime');

-- ---------------------------------------------------------------- free A: cannot start one
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-00000000000a', 'Coffee', 'food-dining/coffee', 'caramel', 5, '2026-10-05', '2026-10-05')$q$,
  'P0001', 'part of Skip Pro');
reset role;

-- ---------------------------------------------------------------- Pro P: starts, taps, renames
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');

insert into public.habits (id, user_id, name, icon_id, color, price, category_id, card_id, preset_id, started_on, saved_from)
values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', 'Coffee',
        'food-dining/coffee', 'caramel', 5.35, 'dining', '00000000-0000-0000-0000-0000000c00a1', 'coffee', '2026-10-05', '2026-10-05');
insert into public.habits (id, user_id, name, icon_id, color, price, bank_account_id, started_on, saved_from)
values ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-0000000000a1', 'Taxi & rides',
        'transport/taxi-rides', 'violet', 15, '00000000-0000-0000-0000-0000000d00a1', '2026-10-05', '2026-10-05');
select pg_temp.check((select count(*) = 2 from public.habits), 'Pro starts habits');
select pg_temp.check((select category_id = 'other' from public.habits where name = 'Taxi & rides'),
  'a habit with no category files under other');

select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, card_id, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'Theirs', 'goals/star', 'blue', 1,
             '00000000-0000-0000-0000-0000000c000a', '2026-10-05', '2026-10-05')$q$,
  '23514', 'your own cards');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', ' Padded', 'goals/star', 'blue', 1, '2026-10-05', '2026-10-05')$q$,
  '23514', 'habits_name_trimmed');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', '', 'goals/star', 'blue', 1, '2026-10-05', '2026-10-05')$q$,
  '23514', 'habits_name_trimmed');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'No icon', '', 'blue', 1, '2026-10-05', '2026-10-05')$q$,
  '23514', 'habits_icon_present');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'Teal', 'goals/star', 'teal', 1, '2026-10-05', '2026-10-05')$q$,
  '23514', 'habits_color_known');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'Free', 'goals/star', 'blue', 0, '2026-10-05', '2026-10-05')$q$,
  '23514', 'habits_price_positive');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, card_id, bank_account_id, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'Both', 'goals/star', 'blue', 1,
             '00000000-0000-0000-0000-0000000c00a1', '00000000-0000-0000-0000-0000000d00a1', '2026-10-05', '2026-10-05')$q$,
  '23514', 'habits_single_source');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price)
     values ('00000000-0000-0000-0000-0000000000a1', 'No start', 'goals/star', 'blue', 1)$q$,
  '23502');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on)
     values ('00000000-0000-0000-0000-0000000000a1', 'No saving day', 'goals/star', 'blue', 1, '2026-10-05')$q$,
  '23502');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000a1', 'Saves early', 'goals/star', 'blue', 1, '2026-10-05', '2026-10-04')$q$,
  '23514', 'habits_saved_after_start');

-- Taps: what the app's useTapHabitDay sends.
insert into public.receipts (user_id, merchant, amount, purchased_on, category_id, card_id, source, habit_id)
values ('00000000-0000-0000-0000-0000000000a1', 'Coffee', 5.35, '2026-10-06', 'dining',
        '00000000-0000-0000-0000-0000000c00a1', 'habit', '00000000-0000-0000-0000-00000000e001'),
       ('00000000-0000-0000-0000-0000000000a1', 'Coffee', 5.35, '2026-10-07', 'dining',
        '00000000-0000-0000-0000-0000000c00a1', 'habit', '00000000-0000-0000-0000-00000000e001'),
       ('00000000-0000-0000-0000-0000000000a1', 'Taxi & rides', 15, '2026-10-06', 'other',
        null, 'habit', '00000000-0000-0000-0000-00000000e002');
insert into public.receipts (user_id, merchant, amount, purchased_on, source)
values ('00000000-0000-0000-0000-0000000000a1', 'Corner shop', 9.99, '2026-10-06', 'manual');
select pg_temp.check((select sum(amount) = 25.70 from public.receipts where habit_id is not null),
  'taps are receipts at their price, to the cent');

select pg_temp.expect_error(
  $q$insert into public.receipts (user_id, merchant, amount, purchased_on, source, habit_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Coffee', 5.35, '2026-10-06', 'habit',
             '00000000-0000-0000-0000-00000000e001')$q$,
  '23505', 'receipts_habit_once_a_day');
select pg_temp.expect_error(
  $q$update public.receipts set purchased_on = '2026-10-06'
      where habit_id = '00000000-0000-0000-0000-00000000e001' and purchased_on = '2026-10-07'$q$,
  '23505', 'receipts_habit_once_a_day');

-- An edit keeps how it arrived.
update public.receipts set amount = 6.10, source = 'manual'
 where habit_id = '00000000-0000-0000-0000-00000000e001' and purchased_on = '2026-10-07';
select pg_temp.check(
  (select source = 'habit' and amount = 6.10 from public.receipts
    where habit_id = '00000000-0000-0000-0000-00000000e001' and purchased_on = '2026-10-07'),
  'an edited tap keeps its own amount and stays a habit receipt');

-- Rename: its receipts follow, nobody else's.
update public.habits set name = 'Lattes' where id = '00000000-0000-0000-0000-00000000e001';
select pg_temp.check(
  (select bool_and(merchant = 'Lattes') and count(*) = 2 from public.receipts
    where habit_id = '00000000-0000-0000-0000-00000000e001'),
  'renaming a habit renames its receipts');
select pg_temp.check(
  (select count(*) = 1 from public.receipts where merchant = 'Taxi & rides')
  and (select count(*) = 1 from public.receipts where merchant = 'Corner shop'),
  'and no other receipt');
update public.habits set price = 7 where id = '00000000-0000-0000-0000-00000000e001';
select pg_temp.check(
  (select array_agg(amount order by purchased_on) = array[5.35, 6.10]::numeric[] from public.receipts
    where habit_id = '00000000-0000-0000-0000-00000000e001'),
  'a new price leaves past taps alone');

-- Archive: the receipts stay and still name the habit.
update public.habits set archived_at = now() where id = '00000000-0000-0000-0000-00000000e002';
select pg_temp.check(
  (select r.habit_id = h.id and h.archived_at is not null
     from public.receipts r join public.habits h on h.id = r.habit_id
    where r.merchant = 'Taxi & rides'),
  'an archived habit keeps its receipts and their link');
reset role;

-- ---------------------------------------------------------------- receipts start on the day it was made
-- Breakfast: tappable from Monday the 5th, made (and saving) from Thursday the 8th.
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.habits (id, user_id, name, icon_id, color, price, card_id, started_on, saved_from)
values ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-0000000000a1', 'Breakfast',
        'food-dining/breakfast', 'coral', 10, '00000000-0000-0000-0000-0000000c00a1', '2026-10-05', '2026-10-08');

select pg_temp.expect_error(
  $q$insert into public.receipts (user_id, merchant, amount, purchased_on, source, habit_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Breakfast', 10, '2026-10-07', 'habit',
             '00000000-0000-0000-0000-00000000e003')$q$,
  '23514', 'A habit receipt cannot be dated before the habit started.');
select pg_temp.check(
  pg_temp.error_detail(
    $q$insert into public.receipts (user_id, merchant, amount, purchased_on, source, habit_id)
       values ('00000000-0000-0000-0000-0000000000a1', 'Breakfast', 10, '2026-10-05', 'habit',
               '00000000-0000-0000-0000-00000000e003')$q$) = '2026-10-08',
  'the refusal names the habit''s first day in its detail');

insert into public.receipts (id, user_id, merchant, amount, purchased_on, source, habit_id)
values ('00000000-0000-0000-0000-0000000f0b08', '00000000-0000-0000-0000-0000000000a1', 'Breakfast', 10,
        '2026-10-08', 'habit', '00000000-0000-0000-0000-00000000e003'),
       ('00000000-0000-0000-0000-0000000f0b09', '00000000-0000-0000-0000-0000000000a1', 'Breakfast', 10,
        '2026-10-09', 'habit', '00000000-0000-0000-0000-00000000e003');
select pg_temp.check(
  (select count(*) = 2 from public.receipts where habit_id = '00000000-0000-0000-0000-00000000e003'),
  'a tap on the day it was made, or after, is filed');

select pg_temp.expect_error(
  $q$update public.receipts set purchased_on = '2026-10-06'
      where id = '00000000-0000-0000-0000-0000000f0b09'$q$,
  '23514', 'before the habit started');
update public.receipts set purchased_on = '2026-10-10' where id = '00000000-0000-0000-0000-0000000f0b09';
select pg_temp.check(
  (select purchased_on = '2026-10-10' from public.receipts where id = '00000000-0000-0000-0000-0000000f0b09'),
  'a habit receipt moves to any day from its first on');

-- An ordinary receipt dated earlier cannot be filed under the habit either.
insert into public.receipts (id, user_id, merchant, amount, purchased_on, source)
values ('00000000-0000-0000-0000-0000000f0c01', '00000000-0000-0000-0000-0000000000a1', 'Cafe', 8, '2026-10-01', 'manual'),
       ('00000000-0000-0000-0000-0000000f0c11', '00000000-0000-0000-0000-0000000000a1', 'Cafe', 8, '2026-10-11', 'manual');
select pg_temp.expect_error(
  $q$update public.receipts set habit_id = '00000000-0000-0000-0000-00000000e003'
      where id = '00000000-0000-0000-0000-0000000f0c01'$q$,
  '23514', 'before the habit started');
update public.receipts set habit_id = '00000000-0000-0000-0000-00000000e003'
 where id = '00000000-0000-0000-0000-0000000f0c11';
select pg_temp.check(
  (select habit_id is not null from public.receipts where id = '00000000-0000-0000-0000-0000000f0c11'),
  'a later receipt can be filed under it');

-- A receipt that is not a habit's keeps any date.
update public.receipts set purchased_on = '2025-12-31' where id = '00000000-0000-0000-0000-0000000f0c01';
insert into public.receipts (user_id, merchant, amount, purchased_on, source)
values ('00000000-0000-0000-0000-0000000000a1', 'Old shop', 3, '2020-01-01', 'manual');
select pg_temp.check(
  (select purchased_on = '2025-12-31' from public.receipts where id = '00000000-0000-0000-0000-0000000f0c01')
  and exists (select 1 from public.receipts where merchant = 'Old shop'),
  'a receipt from no habit is untouched by the rule');
reset role;

-- A receipt already dated before its habit was made, as some are from before this rule.
alter table public.receipts disable trigger receipts_habit_not_before_creation;
insert into public.receipts (id, user_id, merchant, amount, purchased_on, card_id, source, habit_id)
values ('00000000-0000-0000-0000-0000000f0b06', '00000000-0000-0000-0000-0000000000a1', 'Breakfast', 10,
        '2026-10-06', '00000000-0000-0000-0000-0000000c00a1', 'habit', '00000000-0000-0000-0000-00000000e003');
alter table public.receipts enable trigger receipts_habit_not_before_creation;

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update public.receipts set amount = 12.40, note = 'with juice', card_id = null
 where id = '00000000-0000-0000-0000-0000000f0b06';
-- The edit page sends every field back, the unchanged date and habit included.
update public.receipts
   set amount = 12.45, purchased_on = '2026-10-06', habit_id = '00000000-0000-0000-0000-00000000e003'
 where id = '00000000-0000-0000-0000-0000000f0b06';
select pg_temp.check(
  (select amount = 12.45 and note = 'with juice' and card_id is null and purchased_on = '2026-10-06'
     from public.receipts where id = '00000000-0000-0000-0000-0000000f0b06'),
  'an older receipt keeps its day and can still be edited');
update public.habits set name = 'Breakfast out' where id = '00000000-0000-0000-0000-00000000e003';
select pg_temp.check(
  (select merchant = 'Breakfast out' from public.receipts where id = '00000000-0000-0000-0000-0000000f0b06'),
  'renaming the habit still renames it');
select pg_temp.expect_error(
  $q$update public.receipts set purchased_on = '2026-10-05'
      where id = '00000000-0000-0000-0000-0000000f0b06'$q$,
  '23514', 'before the habit started');
delete from public.receipts where id = '00000000-0000-0000-0000-0000000f0b06';
select pg_temp.check(
  not exists (select 1 from public.receipts where id = '00000000-0000-0000-0000-0000000f0b06'),
  'and deleted');
reset role;

-- ---------------------------------------------------------------- nobody writes for someone else
-- A is made Pro for a moment so the Pro check passes and the row policy is what answers.
insert into public.entitlements (user_id, pro) values ('00000000-0000-0000-0000-00000000000a', true);
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-00000000000a', 'For A', 'goals/star', 'blue', 1, '2026-10-05', '2026-10-05')$q$,
  '42501', 'row-level security');
reset role;
delete from public.entitlements where user_id = '00000000-0000-0000-0000-00000000000a';

-- ---------------------------------------------------------------- free A: sees nothing of P's
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) = 0 from public.habits), 'another person''s habits are hidden');
update public.habits set name = 'Mine now' where id = '00000000-0000-0000-0000-00000000e001';
reset role;
select pg_temp.check((select name = 'Lattes' from public.habits where id = '00000000-0000-0000-0000-00000000e001'),
  'and cannot be edited');
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error(
  $q$insert into public.receipts (user_id, merchant, amount, purchased_on, source, habit_id)
     values ('00000000-0000-0000-0000-00000000000a', 'Sneaky', 1, '2026-10-08', 'habit',
             '00000000-0000-0000-0000-00000000e001')$q$,
  '23514', 'your own habits');
reset role;

-- ---------------------------------------------------------------- service role: no auth.uid()
select set_config('request.jwt.claims', '', true);
insert into public.habits (id, user_id, name, icon_id, color, price, started_on, saved_from)
values ('00000000-0000-0000-0000-00000000e00a', '00000000-0000-0000-0000-00000000000a', 'Snacks',
        'food-dining/snacks-sweets', 'pink', 4, '2026-08-31', '2026-08-31'),
       ('00000000-0000-0000-0000-00000000e0b1', '00000000-0000-0000-0000-0000000000b1', 'Soft drinks',
        'food-dining/soft-drinks', 'coral', 3, '2026-10-05', '2026-10-05');
select pg_temp.check(true, 'writers without a signed-in user pass the Pro check');

-- ---------------------------------------------------------------- lapsed L: keeps what it has
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.check(not public.is_pro('00000000-0000-0000-0000-0000000000b1'), 'L has lapsed');
insert into public.receipts (user_id, merchant, amount, purchased_on, source, habit_id)
values ('00000000-0000-0000-0000-0000000000b1', 'Soft drinks', 3, '2026-10-06', 'habit',
        '00000000-0000-0000-0000-00000000e0b1');
update public.habits set price = 3.5, color = 'green' where id = '00000000-0000-0000-0000-00000000e0b1';
select pg_temp.check((select price = 3.5 from public.habits where id = '00000000-0000-0000-0000-00000000e0b1'),
  'a lapsed account taps and edits its habit');
select pg_temp.expect_error(
  $q$insert into public.habits (user_id, name, icon_id, color, price, started_on, saved_from)
     values ('00000000-0000-0000-0000-0000000000b1', 'Another', 'goals/star', 'blue', 1, '2026-10-05', '2026-10-05')$q$,
  'P0001', 'part of Skip Pro');
update public.habits set archived_at = now() where id = '00000000-0000-0000-0000-00000000e0b1';
select pg_temp.check((select archived_at is not null from public.habits
                       where id = '00000000-0000-0000-0000-00000000e0b1'),
  'and deletes it');
reset role;

-- ---------------------------------------------------------------- free A taps a habit it has
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.receipts (user_id, merchant, amount, purchased_on, card_id, source, habit_id)
select '00000000-0000-0000-0000-00000000000a', 'Snacks', 4, d::date,
       '00000000-0000-0000-0000-0000000c000a', 'habit', '00000000-0000-0000-0000-00000000e00a'
  from generate_series('2026-09-01'::date, '2026-09-20'::date, interval '1 day') d;
select pg_temp.check((select count(*) = 20 from public.receipts where source = 'habit'),
  'a free account taps without limit');
insert into public.receipts (user_id, merchant, amount, source)
values ('00000000-0000-0000-0000-00000000000a', 'Scan 1', 1, 'scan');
select pg_temp.check(true, 'taps do not use up the free scans');
reset role;

-- ---------------------------------------------------------------- deletes upstream
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
delete from public.cards where id = '00000000-0000-0000-0000-0000000c00a1';
select pg_temp.check(
  (select card_id is null from public.habits where id = '00000000-0000-0000-0000-00000000e001')
  and (select bool_and(card_id is null) from public.receipts
        where habit_id = '00000000-0000-0000-0000-00000000e001'),
  'deleting the card leaves the habit and its receipts paid with Skip');
delete from public.habits where id = '00000000-0000-0000-0000-00000000e001';
select pg_temp.check(
  (select count(*) = 2 from public.receipts where merchant = 'Lattes' and habit_id is null),
  'a habit removed outright leaves its receipts, unlinked');
reset role;

-- ---------------------------------------------------------------- the daily receipts reminder
-- L's only receipt saved today is a habit tap (above), so the reminder is still due.
update public.profiles
   set receipt_reminder_enabled = true, receipt_reminder_at = '00:00',
       receipt_reminder_last_sent_on = null, timezone = 'UTC'
 where id = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.check(
  (select count(*) = 1 from public.receipts
    where user_id = '00000000-0000-0000-0000-0000000000b1' and source = 'habit'
      and (created_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date)
  and (select count(*) = 1 from public.receipts where user_id = '00000000-0000-0000-0000-0000000000b1'),
  'L saved one receipt today, a habit tap');
select pg_temp.check(
  exists (select 1 from public.receipt_reminders_due() where user_id = '00000000-0000-0000-0000-0000000000b1'),
  'a habit tap does not silence the daily receipts reminder');
insert into public.receipts (user_id, merchant, amount, source)
values ('00000000-0000-0000-0000-0000000000b1', 'Corner shop', 2.50, 'manual');
select pg_temp.check(
  not exists (select 1 from public.receipt_reminders_due() where user_id = '00000000-0000-0000-0000-0000000000b1'),
  'any other receipt saved today still does');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.receipt_reminders_due()', 'execute')
  and not has_function_privilege('anon', 'public.receipt_reminders_due()', 'execute'),
  'only the scheduler can ask who is due');

rollback;
\echo ALL CHECKS PASSED

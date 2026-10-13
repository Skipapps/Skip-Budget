-- Checks for 20261013700001_spend_goal.sql. LOCAL database only, with it applied: everything runs
-- in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/spend_goal.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- A keeps 640.00 and 520.00 in savings. New TV started with 150.00 put by before Skip and was sent
-- 300.00 from the first pot and 212.47 from the second: it holds 662.47, of which 512.47 came from
-- savings. Sofa holds 80.00 and Kept 10.00, so Ready to use is 1,160.00 − 602.47 = 557.53.
-- Spending New TV files one receipt of 662.47 and leaves Ready to use at 557.53: its money left
-- savings when it went to the goal, and does not leave again.

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'spend-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b7', 'spend-b@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000a7'), ('00000000-0000-0000-0000-0000000000b7')
on conflict (id) do nothing;

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

-- Runs p_sql and expects it refused with p_code.
create or replace function pg_temp.refused(p_sql text, p_code text, p_what text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate <> p_code then
      raise exception 'wrong refusal for %: % %', p_what, sqlstate, sqlerrm;
    end if;
    raise notice 'ok  % (refused %)', p_what, sqlstate;
    return;
  end;
  raise exception 'expected % to be refused', p_what;
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;

create or replace function pg_temp.id(p_name text) returns uuid
language sql as $$ select id from ids where name = p_name $$;

-- Ready to use as the signed-in person can read it: every pot kept, less everything in goals.
create or replace function pg_temp.ready() returns numeric
language sql as $$
  select coalesce((select sum(amount) from public.savings_pots where removed_at is null), 0)
       - coalesce((select sum(amount) from public.goal_moves), 0)
$$;

-- Nothing was written for this receipt id, and the goal is still open.
create or replace function pg_temp.untouched(p_goal text, p_receipt uuid) returns boolean
language sql as $$
  select not exists (select 1 from public.receipts where id = p_receipt)
     and exists (
       select 1 from public.goals
        where id = pg_temp.id(p_goal) and closed_at is null and receipt_id is null
     )
$$;

grant execute on all functions in schema pg_temp to authenticated, anon;
grant select, insert on ids to authenticated;
grant select on ids to anon;

-- What only the owner can set up: pots, cards, accounts, a book ------------
insert into ids values
  ('pot1', gen_random_uuid()), ('pot2', gen_random_uuid()),
  ('a-card', gen_random_uuid()), ('a-account', gen_random_uuid()), ('a-book', gen_random_uuid()),
  ('b-card', gen_random_uuid()), ('b-account', gen_random_uuid()), ('b-book', gen_random_uuid()),
  ('r1', gen_random_uuid()), ('r2', gen_random_uuid()), ('r3', gen_random_uuid()),
  ('r-refused', gen_random_uuid());

insert into public.savings_pots (id, user_id, kind, label, amount, added_on) values
  (pg_temp.id('pot1'), '00000000-0000-0000-0000-0000000000a7', 'added', 'Gift', 640.00, '2026-09-01'),
  (pg_temp.id('pot2'), '00000000-0000-0000-0000-0000000000a7', 'added', 'Bonus', 520.00, '2026-09-15');
insert into public.cards (id, user_id, holder) values
  (pg_temp.id('a-card'), '00000000-0000-0000-0000-0000000000a7', 'Visa'),
  (pg_temp.id('b-card'), '00000000-0000-0000-0000-0000000000b7', 'Visa');
insert into public.bank_accounts (id, user_id, bank_name) values
  (pg_temp.id('a-account'), '00000000-0000-0000-0000-0000000000a7', 'Chase'),
  (pg_temp.id('b-account'), '00000000-0000-0000-0000-0000000000b7', 'Chase');
insert into public.receipt_books (id, user_id, name) values
  (pg_temp.id('a-book'), '00000000-0000-0000-0000-0000000000a7', 'Home'),
  (pg_temp.id('b-book'), '00000000-0000-0000-0000-0000000000b7', 'Home');

select pg_temp.check(
  (select prosecdef from pg_proc where oid = 'public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)'::regprocedure),
  'spend_goal runs as its owner');
select pg_temp.check(
  (select proconfig @> array['search_path=public'] from pg_proc
    where oid = 'public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)'::regprocedure),
  'spend_goal pins its search_path');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)', 'execute'),
  'the signed-in may spend a goal');
select pg_temp.check(
  not has_function_privilege('anon', 'public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)', 'execute'),
  'nobody signed out may');
select pg_temp.check(
  (select count(*) = 1 from pg_indexes where indexname = 'goals_receipt_once'),
  'one goal per receipt');

-- As A -----------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a7', true);

insert into ids
select 'tv', public.save_goal(null, 'New TV', 'other', 1000, null, 150);
insert into ids
select 'sofa', public.save_goal(null, 'Sofa', 'home', 400, null, 0);
insert into ids
select 'empty', public.save_goal(null, 'Bike', 'other', 300, null, 0);
insert into ids
select 'kept', public.save_goal(null, 'Kept', 'other', 300, null, 0);
insert into ids
select 'other', public.save_goal(null, 'Other', 'other', 100, null, 50);

select public.send_to_goals(jsonb_build_array(
  jsonb_build_object('goal_id', pg_temp.id('tv'), 'pot_id', pg_temp.id('pot1'), 'amount', 300.00),
  jsonb_build_object('goal_id', pg_temp.id('tv'), 'pot_id', pg_temp.id('pot2'), 'amount', 212.47),
  jsonb_build_object('goal_id', pg_temp.id('sofa'), 'pot_id', pg_temp.id('pot1'), 'amount', 80.00),
  jsonb_build_object('goal_id', pg_temp.id('kept'), 'pot_id', pg_temp.id('pot1'), 'amount', 10.00)
), gen_random_uuid());

select pg_temp.check(pg_temp.ready() = 557.53, 'Ready to use 1,160.00 − 602.47 = 557.53');

-- Refusals that write nothing
select pg_temp.refused(format($$select public.spend_goal(%L, null, 'Best Buy', '2026-10-18')$$,
  pg_temp.id('tv')), '22023', 'no receipt id');
select pg_temp.refused(format($$select public.spend_goal(null, %L, 'Best Buy', '2026-10-18')$$,
  pg_temp.id('r-refused')), '22023', 'no goal id');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, '   ', '2026-10-18')$$,
  pg_temp.id('tv'), pg_temp.id('r-refused')), '22023', 'a blank store');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, %L, '2026-10-18')$$,
  pg_temp.id('tv'), pg_temp.id('r-refused'), repeat('x', 121)), '22023', 'a 121-letter store');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Best Buy', null)$$,
  pg_temp.id('tv'), pg_temp.id('r-refused')), '22023', 'no date');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Best Buy', '2026-10-18', %L, %L)$$,
  pg_temp.id('tv'), pg_temp.id('r-refused'), pg_temp.id('a-card'), pg_temp.id('a-account')),
  '22023', 'a card and an account at once');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Best Buy', '2026-10-18', %L)$$,
  pg_temp.id('tv'), pg_temp.id('r-refused'), pg_temp.id('b-card')), '23514', 'B''s card');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Best Buy', '2026-10-18', null, %L)$$,
  pg_temp.id('tv'), pg_temp.id('r-refused'), pg_temp.id('b-account')), '23514', 'B''s account');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Best Buy', '2026-10-18', null, null, %L)$$,
  pg_temp.id('tv'), pg_temp.id('r-refused'), pg_temp.id('b-book')), '23514', 'B''s book');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Best Buy', '2026-10-18')$$,
  gen_random_uuid(), pg_temp.id('r-refused')), 'P0002', 'a goal that is not there');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Bike shop', '2026-10-18')$$,
  pg_temp.id('empty'), pg_temp.id('r-refused')), '22023', 'a goal with nothing in it');
select pg_temp.check(pg_temp.untouched('tv', pg_temp.id('r-refused')), 'every refusal wrote nothing');
select pg_temp.check(pg_temp.untouched('empty', pg_temp.id('r-refused')), 'the empty goal is still open');
select pg_temp.check(pg_temp.ready() = 557.53, 'Ready to use unchanged by the refusals');

-- Spent with A's card
select pg_temp.check(
  public.spend_goal(pg_temp.id('tv'), pg_temp.id('r1'), '  Best Buy  ', '2026-10-18', pg_temp.id('a-card'))
    = pg_temp.id('r1'),
  'spending New TV answers its receipt');
select pg_temp.check(
  (select merchant = 'Best Buy' and amount = 662.47 and purchased_on = '2026-10-18'
          and card_id = pg_temp.id('a-card') and bank_account_id is null and category_id = 'other'
          and source = 'manual' and book_id is null and image_path is null
          and user_id = '00000000-0000-0000-0000-0000000000a7'
     from public.receipts where id = pg_temp.id('r1')),
  'one receipt: Best Buy 662.47 on 18 Oct, A''s card, trimmed, Other, typed, General');
select pg_temp.check(
  (select closed_at is not null and receipt_id = pg_temp.id('r1')
     from public.goals where id = pg_temp.id('tv')),
  'New TV is closed and names its receipt');
select pg_temp.check(
  (select count(*) = 2 and sum(amount) = 512.47 from public.goal_moves where goal_id = pg_temp.id('tv')),
  'its moves stay: 512.47 stays out of savings');
select pg_temp.check(pg_temp.ready() = 557.53, 'Ready to use is 557.53, as before: it leaves once');

-- A retry after a lost answer
select pg_temp.check(
  public.spend_goal(pg_temp.id('tv'), pg_temp.id('r1'), 'Best Buy', '2026-10-18', pg_temp.id('a-card'))
    = pg_temp.id('r1'),
  'the same call again answers the same receipt');
select pg_temp.check(
  (select count(*) = 1 from public.receipts where amount = 662.47),
  'and files nothing more');

-- A closed goal stays closed
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Best Buy', '2026-10-18')$$,
  pg_temp.id('tv'), pg_temp.id('r2')), 'P0002', 'spending it again with a new receipt');
select pg_temp.refused(format($$select public.delete_goal(%L, true)$$, pg_temp.id('tv')),
  'P0002', 'putting a spent goal back in savings');

-- Paid from A's account, into A's book; and a goal closed without a receipt cannot gain one
select pg_temp.check(
  public.spend_goal(pg_temp.id('sofa'), pg_temp.id('r2'), 'IKEA', '2026-10-19', null,
                    pg_temp.id('a-account'), pg_temp.id('a-book')) = pg_temp.id('r2'),
  'spending Sofa from A''s account');
select pg_temp.check(
  (select amount = 80.00 and bank_account_id = pg_temp.id('a-account') and card_id is null
          and book_id = pg_temp.id('a-book')
     from public.receipts where id = pg_temp.id('r2')),
  'its receipt: 80.00 from the account, in A''s book');
select public.delete_goal(pg_temp.id('kept'), false);
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Shop', '2026-10-19')$$,
  pg_temp.id('kept'), pg_temp.id('r3')), 'P0002', 'a goal already spent without a receipt');

-- Deleting the receipt unlinks it; the goal stays spent and its money stays out
delete from public.receipts where id = pg_temp.id('r1');
select pg_temp.check(
  (select closed_at is not null and receipt_id is null from public.goals where id = pg_temp.id('tv')),
  'a deleted receipt leaves the goal closed, naming none');
select pg_temp.check(pg_temp.ready() = 557.53, 'and Ready to use where it was');

-- As B: A's goals are not B's ---------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b7","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b7', true);
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Shop', '2026-10-19')$$,
  pg_temp.id('other'), pg_temp.id('r3')), 'P0002', 'B spending A''s goal');

-- Signed out ----------------------------------------------------------------------
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'Shop', '2026-10-19')$$,
  pg_temp.id('other'), pg_temp.id('r3')), '42501', 'no one signed in');

reset role;
select pg_temp.check(
  (select closed_at is null and receipt_id is null from public.goals where id = pg_temp.id('other'))
  and not exists (select 1 from public.receipts where id = pg_temp.id('r3')),
  'A''s other goal is untouched by B and by no one');

select 'ALL CHECKS PASSED';
rollback;

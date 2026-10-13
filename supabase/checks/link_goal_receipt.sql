-- Checks for 20261013700002_link_goal_receipt.sql (link_goal_receipt, and spend_goal's retry
-- check moved). LOCAL database only, with 20261013700001 and 20261013700002 applied: everything
-- runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/link_goal_receipt.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".
-- A keeps 640.00 and 520.00 in savings. New TV started with 150.00 and was sent 300.00 and 212.47
-- (it holds 662.47); Sofa was sent 80.00, Kept 10.00, so Ready to use is 557.53. A had already
-- added Best Buy 662.47 on 18 Oct from Receipts; linking it to New TV changes no receipt and
-- leaves Ready to use at 557.53.

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a8', 'link-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b8', 'link-b@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000a8'), ('00000000-0000-0000-0000-0000000000b8')
on conflict (id) do nothing;

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

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

create or replace function pg_temp.ready() returns numeric
language sql as $$
  select coalesce((select sum(amount) from public.savings_pots where removed_at is null), 0)
       - coalesce((select sum(amount) from public.goal_moves), 0)
$$;

-- The goal is still open and names no receipt.
create or replace function pg_temp.open(p_goal text) returns boolean
language sql as $$
  select exists (
    select 1 from public.goals
     where id = pg_temp.id(p_goal) and closed_at is null and receipt_id is null
  )
$$;

grant execute on all functions in schema pg_temp to authenticated, anon;
grant select, insert on ids to authenticated;
grant select on ids to anon;

-- What only the owner can set up ---------------------------------------------
insert into ids values
  ('pot1', gen_random_uuid()), ('pot2', gen_random_uuid()),
  ('a-card', gen_random_uuid()),
  ('best-buy', gen_random_uuid()), ('ikea', gen_random_uuid()), ('b-receipt', gen_random_uuid()),
  ('sofa-receipt', gen_random_uuid()), ('coffee', gen_random_uuid()), ('coffee-day', gen_random_uuid());

-- A keeps a coffee habit (habits are Pro), and one tapped day of it is a receipt.
insert into public.entitlements (user_id, pro, expires_at) values
  ('00000000-0000-0000-0000-0000000000a8', true, null);
insert into public.habits (id, user_id, name, icon_id, color, price, started_on, saved_from) values
  (pg_temp.id('coffee'), '00000000-0000-0000-0000-0000000000a8', 'Coffee', 'food-dining/coffee',
   'caramel', 662.47, '2026-10-12', '2026-10-12');

insert into public.savings_pots (id, user_id, kind, label, amount, added_on) values
  (pg_temp.id('pot1'), '00000000-0000-0000-0000-0000000000a8', 'added', 'Gift', 640.00, '2026-09-01'),
  (pg_temp.id('pot2'), '00000000-0000-0000-0000-0000000000a8', 'added', 'Bonus', 520.00, '2026-09-15');
insert into public.cards (id, user_id, holder) values
  (pg_temp.id('a-card'), '00000000-0000-0000-0000-0000000000a8', 'Visa');
insert into public.receipts (id, user_id, merchant, amount, purchased_on) values
  (pg_temp.id('best-buy'), '00000000-0000-0000-0000-0000000000a8', 'Best Buy', 662.47, '2026-10-18'),
  (pg_temp.id('ikea'), '00000000-0000-0000-0000-0000000000a8', 'IKEA', 80.00, '2026-10-19'),
  (pg_temp.id('b-receipt'), '00000000-0000-0000-0000-0000000000b8', 'Shop', 10.00, '2026-10-19');
insert into public.receipts (id, user_id, merchant, amount, purchased_on, source, habit_id) values
  (pg_temp.id('coffee-day'), '00000000-0000-0000-0000-0000000000a8', 'Coffee', 662.47, '2026-10-14',
   'habit', pg_temp.id('coffee'));

select pg_temp.check(
  (select prosecdef from pg_proc where oid = 'public.link_goal_receipt(uuid,uuid)'::regprocedure),
  'link_goal_receipt runs as its owner');
select pg_temp.check(
  (select proconfig @> array['search_path=public'] from pg_proc
    where oid = 'public.link_goal_receipt(uuid,uuid)'::regprocedure),
  'link_goal_receipt pins its search_path');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.link_goal_receipt(uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.link_goal_receipt(uuid,uuid)', 'execute'),
  'only the signed-in may link');
select pg_temp.check(
  has_function_privilege('authenticated', 'public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)', 'execute')
  and (select prosecdef from pg_proc
        where oid = 'public.spend_goal(uuid,uuid,text,date,uuid,uuid,uuid)'::regprocedure),
  'spend_goal keeps its grants and runs as its owner');
select pg_temp.check(
  (select count(*) = 1 from pg_proc where proname = 'spend_goal'),
  'spend_goal is still one function');

-- As A -----------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a8","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a8', true);

insert into ids select 'tv', public.save_goal(null, 'New TV', 'other', 1000, null, 150);
insert into ids select 'sofa', public.save_goal(null, 'Sofa', 'home', 400, null, 0);
insert into ids select 'empty', public.save_goal(null, 'Bike', 'other', 300, null, 0);
insert into ids select 'kept', public.save_goal(null, 'Kept', 'other', 300, null, 0);
insert into ids select 'before', public.save_goal(null, 'Before Skip', 'other', 300, null, 50);

select public.send_to_goals(jsonb_build_array(
  jsonb_build_object('goal_id', pg_temp.id('tv'), 'pot_id', pg_temp.id('pot1'), 'amount', 300.00),
  jsonb_build_object('goal_id', pg_temp.id('tv'), 'pot_id', pg_temp.id('pot2'), 'amount', 212.47),
  jsonb_build_object('goal_id', pg_temp.id('sofa'), 'pot_id', pg_temp.id('pot1'), 'amount', 80.00),
  jsonb_build_object('goal_id', pg_temp.id('kept'), 'pot_id', pg_temp.id('pot1'), 'amount', 10.00)
), gen_random_uuid());
select public.delete_goal(pg_temp.id('kept'), false);
select pg_temp.check(pg_temp.ready() = 557.53, 'Ready to use 1,160.00 − 602.47 = 557.53');

-- Refusals that write nothing
select pg_temp.refused(format($$select public.link_goal_receipt(%L, null)$$, pg_temp.id('tv')),
  '22023', 'no receipt');
select pg_temp.refused(format($$select public.link_goal_receipt(null, %L)$$, pg_temp.id('best-buy')),
  '22023', 'no goal');
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('tv'), pg_temp.id('b-receipt')), '23503', 'B''s receipt');
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('tv'), gen_random_uuid()), '23503', 'a receipt that is not there');
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  gen_random_uuid(), pg_temp.id('best-buy')), 'P0002', 'a goal that is not there');
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('kept'), pg_temp.id('best-buy')), 'P0002', 'a goal already spent');
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('empty'), pg_temp.id('best-buy')), '22023', 'a goal with nothing in it');
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('tv'), pg_temp.id('coffee-day')), '23514', 'a habit''s day, even at the goal''s amount');
select pg_temp.check(pg_temp.open('tv') and pg_temp.open('empty'), 'every refusal wrote nothing');

-- Linked
select pg_temp.check(
  public.link_goal_receipt(pg_temp.id('tv'), pg_temp.id('best-buy')) = pg_temp.id('best-buy'),
  'linking New TV to Best Buy answers the receipt');
select pg_temp.check(
  (select closed_at is not null and receipt_id = pg_temp.id('best-buy')
     from public.goals where id = pg_temp.id('tv')),
  'New TV is closed and names it');
select pg_temp.check(
  (select merchant = 'Best Buy' and amount = 662.47 and purchased_on = '2026-10-18'
          and card_id is null and bank_account_id is null and category_id = 'other'
     from public.receipts where id = pg_temp.id('best-buy'))
  and (select count(*) = 3 from public.receipts),
  'the receipt is as it was, and no receipt was filed (A reads her three)');
select pg_temp.check(
  (select count(*) = 2 and sum(amount) = 512.47 from public.goal_moves where goal_id = pg_temp.id('tv')),
  'its moves stay');
select pg_temp.check(pg_temp.ready() = 557.53, 'Ready to use is 557.53, as before');
select pg_temp.check(
  public.link_goal_receipt(pg_temp.id('tv'), pg_temp.id('best-buy')) = pg_temp.id('best-buy'),
  'the same link again is answered');

-- One goal per receipt
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('sofa'), pg_temp.id('best-buy')), '23505', 'a receipt another goal names');
select pg_temp.refused(format($$select public.spend_goal(%L, %L, 'IKEA', '2026-10-19')$$,
  pg_temp.id('sofa'), pg_temp.id('best-buy')), '23505', 'spend_goal never takes another goal''s receipt for a retry');
select pg_temp.check(pg_temp.open('sofa'), 'Sofa is still open');

-- Money from before Skip only
select pg_temp.check(
  public.link_goal_receipt(pg_temp.id('before'), pg_temp.id('ikea')) = pg_temp.id('ikea'),
  'a goal holding only money from before Skip can be linked');

-- spend_goal: a retry is answered even when its card has gone since
select pg_temp.check(
  public.spend_goal(pg_temp.id('sofa'), pg_temp.id('sofa-receipt'), 'IKEA', '2026-10-19',
                    pg_temp.id('a-card')) = pg_temp.id('sofa-receipt'),
  'spending Sofa on A''s card');
delete from public.cards where id = pg_temp.id('a-card');
select pg_temp.check(
  public.spend_goal(pg_temp.id('sofa'), pg_temp.id('sofa-receipt'), 'IKEA', '2026-10-19',
                    pg_temp.id('a-card')) = pg_temp.id('sofa-receipt'),
  'its retry is answered after the card was deleted');
select pg_temp.check(
  (select count(*) = 1 from public.receipts where id = pg_temp.id('sofa-receipt') and amount = 80.00),
  'and files nothing more');

-- A deleted receipt unlinks; the goal stays spent
delete from public.receipts where id = pg_temp.id('best-buy');
select pg_temp.check(
  (select closed_at is not null and receipt_id is null from public.goals where id = pg_temp.id('tv')),
  'a deleted receipt leaves New TV closed, naming none');
select pg_temp.check(pg_temp.ready() = 557.53, 'and Ready to use where it was');

-- As B -------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b8","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b8', true);
insert into ids select 'b-goal', public.save_goal(null, 'B goal', 'other', 100, null, 20);
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('b-goal'), pg_temp.id('ikea')), '23503', 'B linking A''s receipt');
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('empty'), pg_temp.id('b-receipt')), 'P0002', 'B linking A''s goal');
select pg_temp.check(pg_temp.open('b-goal'), 'B''s goal is untouched');

-- Signed out ---------------------------------------------------------------------
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.refused(format($$select public.link_goal_receipt(%L, %L)$$,
  pg_temp.id('b-goal'), pg_temp.id('b-receipt')), '42501', 'no one signed in');

reset role;
select pg_temp.check(
  (select closed_at is null and receipt_id is null from public.goals where id = pg_temp.id('empty'))
  and (select closed_at is null and receipt_id is null from public.goals where id = pg_temp.id('b-goal')),
  'nothing B or no one tried was written');

select 'ALL CHECKS PASSED';
rollback;

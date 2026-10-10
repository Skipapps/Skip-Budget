-- Checks for 20261010100001_receipt_books.sql. LOCAL database only, with it applied: everything
-- runs in one transaction and rolls back.
--
--   docker exec -i supabase_db_SkipBudget psql -U postgres -d postgres -q -t < supabase/checks/receipt_books.sql
--
-- Ends with ALL CHECKS PASSED; any failed check stops with FAILED, "wrong refusal" or "expected".

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'books-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b7', 'books-b@test.local');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000a7'), ('00000000-0000-0000-0000-0000000000b7')
on conflict (id) do nothing;
insert into public.cards (id, user_id, holder) values
  ('00000000-0000-0000-0000-0000000c00a7', '00000000-0000-0000-0000-0000000000a7', 'A'),
  ('00000000-0000-0000-0000-0000000c00b7', '00000000-0000-0000-0000-0000000000b7', 'B');

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

grant execute on function pg_temp.check(boolean, text) to authenticated;
grant execute on function pg_temp.refused(text, text, text) to authenticated;

-- As A ------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a7', true);

create temp table ids (name text primary key, id uuid) on commit drop;

insert into ids values ('trip', public.save_receipt_book(
  null, '  Paris trip ', 'trip', '00000000-0000-0000-0000-0000000c00a7', null, true));
select pg_temp.check(
  (select name from public.receipt_books where id = (select id from ids where name = 'trip')) = 'Paris trip',
  'the name is saved trimmed');
select pg_temp.check(
  (select receipt_book_default from public.profiles where id = auth.uid()) = (select id::text from ids where name = 'trip'),
  'Make default sets the profile in the same call');

select pg_temp.refused(
  $$select public.save_receipt_book(null, 'PARIS TRIP', 'trip', null, null, false)$$,
  '23505', 'a second book with the same name in another case');
select pg_temp.refused(
  $$select public.save_receipt_book(null, '   ', 'trip', null, null, false)$$,
  '23514', 'an empty name');
select pg_temp.refused(
  $$select public.save_receipt_book(null, 'Kids', 'kids-family', '00000000-0000-0000-0000-0000000c00b7', null, false)$$,
  '23514', 'paid from someone else''s card');

insert into ids values ('kids', public.save_receipt_book(null, 'Kids', 'kids-family', null, null, false));
select pg_temp.check(
  (select receipt_book_default from public.profiles where id = auth.uid()) = (select id::text from ids where name = 'trip'),
  'a book made without Make default leaves the default alone');

-- Saving Kids without default does not clear Paris trip's; saving Paris trip without it does.
select public.save_receipt_book((select id from ids where name = 'kids'), 'Kids', 'kids-family', null, null, false);
select pg_temp.check(
  (select receipt_book_default from public.profiles where id = auth.uid()) = (select id::text from ids where name = 'trip'),
  'turning default off on another book leaves this one');
select public.save_receipt_book((select id from ids where name = 'trip'), 'Paris trip', 'trip', null, null, false);
select pg_temp.check(
  (select receipt_book_default from public.profiles where id = auth.uid()) is null,
  'turning default off on the default book clears it');

update public.profiles set receipt_book_default = 'general' where id = auth.uid();
select pg_temp.check(
  (select receipt_book_default from public.profiles where id = auth.uid()) = 'general',
  'General can be the default');
select pg_temp.refused(
  $$update public.profiles set receipt_book_default = 'nonsense' where id = auth.uid()$$,
  '23514', 'a default that is neither General nor an id');

insert into public.receipts (id, user_id, merchant, amount, book_id) values
  ('00000000-0000-0000-0000-00000000e0a7', auth.uid(), 'Cafe', 4.5, (select id from ids where name = 'trip'));
select pg_temp.check(true, 'a receipt goes in its owner''s book');

update public.profiles set receipt_book_default = (select id::text from ids where name = 'trip') where id = auth.uid();
delete from public.receipt_books where id = (select id from ids where name = 'trip');
select pg_temp.check(
  (select book_id from public.receipts where id = '00000000-0000-0000-0000-00000000e0a7') is null,
  'deleting a book moves its receipts to General');
select pg_temp.check(
  (select count(*) from public.receipts where id = '00000000-0000-0000-0000-00000000e0a7') = 1,
  'deleting a book keeps its receipts');
select pg_temp.check(
  (select receipt_book_default from public.profiles where id = auth.uid()) is null,
  'deleting the default book leaves the choice open');

-- As B ------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b7","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b7', true);

select pg_temp.check((select count(*) from public.receipt_books) = 0, 'B sees none of A''s books');
select pg_temp.refused(
  format($$select public.save_receipt_book(%L, 'Mine now', 'trip', null, null, false)$$,
         (select id from ids where name = 'kids')),
  'P0002', 'B saving A''s book');
select pg_temp.refused(
  format($$insert into public.receipts (user_id, merchant, amount, book_id) values (auth.uid(), 'X', 1, %L)$$,
         (select id from ids where name = 'kids')),
  '23514', 'a receipt in someone else''s book');
insert into ids values ('b-kids', public.save_receipt_book(null, 'Kids', 'kids-family', null, null, false));
select pg_temp.check(true, 'B may use a name A has');

-- Anonymous -------------------------------------------------------------------
reset role;
set local role anon;
select pg_temp.refused(
  $$select public.save_receipt_book(null, 'Anon', 'trip', null, null, false)$$,
  '42501', 'anon calling save_receipt_book');

reset role;
select 'ALL CHECKS PASSED';
rollback;

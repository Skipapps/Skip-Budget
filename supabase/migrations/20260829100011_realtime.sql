-- 0028 · Streaming changes to the app
--
-- Until now every screen learned about a change by asking again — on mount, on
-- a pull, or when the app came back to the foreground. That is fine for a
-- phone in one hand and wrong the moment there are two: a bill added on an
-- iPad left the phone showing yesterday's dashboard until something happened
-- to make it re-ask.
--
-- Adding a table to the publication is what lets Postgres announce its own
-- writes. The app subscribes per user and turns each announcement into a cache
-- invalidation, so the screen re-reads only what actually moved.
--
-- Only tables the app draws from. `brands` and the category tables are
-- reference data that never changes under a session, and streaming them would
-- be traffic with nothing on the other end.

do $$
declare
  t text;
begin
  foreach t in array array[
    'charges', 'bills', 'subscriptions', 'receipts', 'payments',
    'cards', 'bank_accounts', 'salary_sources', 'savings_pots',
    'reminders', 'profiles', 'loans'
  ] loop
    -- Idempotent: re-running the migration must not fail on a table that is
    -- already published.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- An update announcement carries only the changed columns unless the table is
-- told to send the whole row. The app matches rows by id to decide what to
-- re-read, so it needs the id even on an update that did not touch it.
alter table public.charges       replica identity full;
alter table public.bills         replica identity full;
alter table public.subscriptions replica identity full;
alter table public.receipts      replica identity full;
alter table public.payments      replica identity full;

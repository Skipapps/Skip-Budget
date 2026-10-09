-- 20261009100002 · Spending habits
--
-- A habit is something bought again and again (a coffee, a ride) that the
-- person wants to skip. Tapping a day on its card files ONE receipt for that
-- day at the habit's price, paid with the habit's card or account: the money
-- is a receipt like any other, so it lands on that card, in Activity and in
-- every total with no second ledger to keep in step. A day is "tapped" exactly
-- when a receipt with that habit_id exists on that date, so deleting or
-- re-dating the receipt anywhere in the app moves the circle with it.
--
-- Creating a habit is Pro; tapping is not, so a lapsed account keeps using
-- the cards it has. Deleting a card is soft (archived_at): its receipts are
-- real money spent and keep drawing the habit's icon and name.
--
-- Nothing here names the capture_source value 'habit'. The app files taps
-- with it, so 20261009100001 must be live before a build that taps.

create table if not exists public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  icon_id         text not null,
  color           text not null,
  -- What one tapped day costs. A change applies to taps after it: a tapped
  -- day is a receipt that keeps the amount it was filed with.
  price           numeric(14,2) not null,
  -- Where a tap's receipt is filed in spending; the app takes it from the icon.
  category_id     text not null references public.spend_categories (id) default 'other',
  card_id         uuid references public.cards (id) on delete set null,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  preset_id       text,
  -- The Monday of the week it was made, worked out on the phone: the server
  -- does not know the person's week or time zone. Days from here can be
  -- tapped, so the start of the first week can be filled in.
  started_on      date not null,
  -- The day it was made, the person's local date. Only an untapped day from
  -- here on counts as saved: the days filled in before it were never skipped
  -- on purpose.
  saved_from      date not null,
  sort_order      integer not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- The rename trigger copies the name onto receipts, so a padded or blank
  -- name would reach every row in Activity.
  constraint habits_name_trimmed check (name = btrim(name) and name <> ''),
  constraint habits_icon_present check (icon_id <> ''),
  constraint habits_color_known check (color in ('caramel', 'coral', 'green', 'blue', 'violet', 'pink')),
  constraint habits_price_positive check (price > 0),
  constraint habits_saved_after_start check (saved_from >= started_on),
  constraint habits_single_source check (num_nonnulls(card_id, bank_account_id) <= 1)
);

create index if not exists habits_user_id_idx on public.habits (user_id, sort_order, created_at);

alter table public.habits enable row level security;

drop policy if exists "habits_all_own" on public.habits;
create policy "habits_all_own" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Stated rather than left to the schema's default privileges, which no longer
-- reach new tables on every project (config.toml, auto_expose_new_tables).
grant select, insert, update, delete on public.habits to authenticated;
grant all on public.habits to service_role;

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

-- The foreign keys accept anyone's rows; only the person's own card and account may be named.
create or replace function public.habits_own_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A habit can only be paid with one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A habit can only be paid from one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists habits_own_rows on public.habits;
create trigger habits_own_rows
  before insert or update of card_id, bank_account_id, user_id on public.habits
  for each row execute function public.habits_own_rows();

-- --------------------------------------------------------------------------
-- Starting a habit is Pro
-- --------------------------------------------------------------------------
--
-- INSERT only: the wall gates verbs, not nouns, so a lapsed account edits,
-- archives and taps the habits it already has. Service-role writers have no
-- auth.uid() and pass, as they do for groups. The refusal says "part of Skip
-- Pro", which is how the app tells the wall from a failure
-- (src/lib/pro-refusal.ts).

create or replace function public.enforce_habits_are_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_pro(new.user_id) then
    return new;
  end if;
  raise exception 'Tracking spending habits is part of Skip Pro.';
end;
$$;

revoke all on function public.enforce_habits_are_pro() from public, anon, authenticated;

drop trigger if exists habits_are_pro on public.habits;
create trigger habits_are_pro
  before insert on public.habits
  for each row execute function public.enforce_habits_are_pro();

-- --------------------------------------------------------------------------
-- A tapped day is a receipt that names its habit
-- --------------------------------------------------------------------------

alter table public.receipts
  add column if not exists habit_id uuid references public.habits (id) on delete set null;

comment on column public.receipts.habit_id is
  'The spending habit whose day this receipt fills. Null for every other receipt.';

-- One receipt per habit per day: two quick taps, or two phones, must not
-- spend the price twice. Also the index the habit's day lookups and the
-- foreign key's "set null" use.
create unique index if not exists receipts_habit_once_a_day
  on public.receipts (habit_id, purchased_on)
  where habit_id is not null;

-- As for the habit's own card: the foreign key alone would let a receipt
-- name someone else's habit.
create or replace function public.receipts_own_habit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.habit_id is not null and not exists (
    select 1 from public.habits where id = new.habit_id and user_id = new.user_id
  ) then
    raise exception 'A receipt can only belong to one of your own habits.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_own_habit on public.receipts;
create trigger receipts_own_habit
  before insert or update of habit_id, user_id on public.receipts
  for each row execute function public.receipts_own_habit();

-- Renaming a habit renames its receipts, so a day's row in Activity says what
-- the card says. The icon and colour are read through the join and need no
-- copy. Runs as the person, so the row policy keeps it to their own receipts.
create or replace function public.habit_renames_receipts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.receipts
     set merchant = new.name
   where habit_id = new.id
     and merchant is distinct from new.name;
  return null;
end;
$$;

drop trigger if exists habits_rename_receipts on public.habits;
create trigger habits_rename_receipts
  after update of name on public.habits
  for each row
  when (old.name is distinct from new.name)
  execute function public.habit_renames_receipts();

-- Published like the other tables the app draws from, so the app can listen
-- for a habit started on another phone once this is live. Taps need nothing
-- more: they are receipts, which are published already.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'habits'
  ) then
    alter publication supabase_realtime add table public.habits;
  end if;
end;
$$;

alter table public.habits replica identity full;

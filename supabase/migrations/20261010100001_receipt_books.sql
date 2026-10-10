-- 20261010100001 · Receipt books
--
-- A book keeps a set of receipts apart (a trip, the kids) without taking them
-- out of anything: every receipt still counts toward spending, whichever book
-- holds it. A book is a label on a receipt, never a second ledger.
--
-- General is not a row. A receipt with no book is in General, which is where
-- every receipt saved before books existed, and every receipt an older build
-- saves, already is. Deleting a book moves its receipts back there.
--
-- A book may name the card or account it is paid from; new receipts in it
-- start with that one picked. Neither is Skip: each receipt picks its own.
--
-- Which book new receipts go to is the person's choice, kept on their profile:
-- null until they choose ("ask me each time" once they have a book), 'general',
-- or a book's id.
--
-- Additive: an older build reads and writes receipts exactly as before.
-- Re-run safe.

create table if not exists public.receipt_books (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  icon_id         text not null default 'general' check (char_length(icon_id) between 1 and 40),
  card_id         uuid references public.cards (id) on delete set null,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint receipt_books_single_source check (num_nonnulls(card_id, bank_account_id) <= 1)
);

-- Two books called "Trip" would be one pill read twice.
create unique index if not exists receipt_books_name_once
  on public.receipt_books (user_id, lower(name));
create index if not exists receipt_books_user_idx
  on public.receipt_books (user_id, created_at);

alter table public.receipt_books enable row level security;

drop policy if exists "receipt_books_all_own" on public.receipt_books;
create policy "receipt_books_all_own" on public.receipt_books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists receipt_books_updated_at on public.receipt_books;
create trigger receipt_books_updated_at
  before update on public.receipt_books
  for each row execute function public.set_updated_at();

-- The foreign keys accept anyone's rows; only the person's own card and
-- account may be named.
create or replace function public.receipt_books_own_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A book can only be paid with one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A book can only be paid from one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists receipt_books_own_rows on public.receipt_books;
create trigger receipt_books_own_rows
  before insert or update of card_id, bank_account_id, user_id on public.receipt_books
  for each row execute function public.receipt_books_own_rows();

-- --------------------------------------------------------------------------
-- A receipt names its book
-- --------------------------------------------------------------------------

alter table public.receipts
  add column if not exists book_id uuid references public.receipt_books (id) on delete set null;

comment on column public.receipts.book_id is
  'The receipt book it is kept in. Null is General. Every receipt counts toward spending either way.';

create index if not exists receipts_book_idx on public.receipts (book_id) where book_id is not null;

create or replace function public.receipts_own_book()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.book_id is not null and not exists (
    select 1 from public.receipt_books where id = new.book_id and user_id = new.user_id
  ) then
    raise exception 'A receipt can only go in one of your own books.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_own_book on public.receipts;
create trigger receipts_own_book
  before insert or update of book_id, user_id on public.receipts
  for each row execute function public.receipts_own_book();

-- --------------------------------------------------------------------------
-- The default book
-- --------------------------------------------------------------------------

alter table public.profiles
  add column if not exists receipt_book_default text;

do $$ begin
  alter table public.profiles
    add constraint profiles_receipt_book_default_shape check (
      receipt_book_default is null
      or receipt_book_default = 'general'
      or receipt_book_default ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );
exception when duplicate_object then null;
end $$;

comment on column public.profiles.receipt_book_default is
  'Where new receipts go: null (not chosen; the app asks once there is a book), ''general'', or a receipt_books id.';

-- A deleted default book leaves the choice open again rather than pointing at
-- nothing. Runs as the person, so the row policy keeps it to their own profile.
create or replace function public.receipt_book_deleted_clears_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.profiles
     set receipt_book_default = null
   where id = old.user_id
     and receipt_book_default = old.id::text;
  return null;
end;
$$;

drop trigger if exists receipt_books_clear_default on public.receipt_books;
create trigger receipt_books_clear_default
  after delete on public.receipt_books
  for each row execute function public.receipt_book_deleted_clears_default();

-- Saves a book and, in the same transaction, whether it is the default, so a
-- book is never left made but not chosen. p_id null creates one. Runs as the
-- caller: the row policies decide what it may touch.
create or replace function public.save_receipt_book(
  p_id              uuid,
  p_name            text,
  p_icon_id         text,
  p_card_id         uuid,
  p_bank_account_id uuid,
  p_make_default    boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.receipt_books (user_id, name, icon_id, card_id, bank_account_id)
    values (auth.uid(), btrim(p_name), p_icon_id, p_card_id, p_bank_account_id)
    returning id into v_id;
  else
    update public.receipt_books
       set name = btrim(p_name),
           icon_id = p_icon_id,
           card_id = p_card_id,
           bank_account_id = p_bank_account_id
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'That book is no longer there.' using errcode = 'P0002';
    end if;
  end if;

  if p_make_default then
    update public.profiles set receipt_book_default = v_id::text where id = auth.uid();
  else
    update public.profiles
       set receipt_book_default = null
     where id = auth.uid()
       and receipt_book_default = v_id::text;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_receipt_book(uuid, text, text, uuid, uuid, boolean) from public, anon;
grant execute on function public.save_receipt_book(uuid, text, text, uuid, uuid, boolean)
  to authenticated;

-- Published like the other tables the app draws from, so a book made on
-- another phone shows here too.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'receipt_books'
  ) then
    alter publication supabase_realtime add table public.receipt_books;
  end if;
end $$;

alter table public.receipt_books replica identity full;

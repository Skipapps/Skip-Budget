-- 0002 · Cards and bank accounts
--
-- Both are "payment sources": bills, receipts and subscriptions all point at
-- one of them. They stay separate tables because their fields genuinely differ.

do $$ begin
  create type public.account_type as enum ('checking', 'savings');
exception when duplicate_object then null;
end $$;

create table if not exists public.cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  holder        text not null default '',
  network       text not null default 'VISA',
  -- Only ever the last four. Full card numbers are never stored.
  last4         text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  color         text not null default '#FA8F6F',
  balance       numeric(14,2) not null default 0,
  bill_due_day  smallint check (bill_due_day is null or bill_due_day between 1 and 31),
  reminder_days smallint check (reminder_days is null or reminder_days >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id);

create table if not exists public.bank_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  bank_name      text not null default '',
  nickname       text,
  account_type   public.account_type not null default 'checking',
  last4          text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  color          text not null default '#7BC4F5',
  balance        numeric(14,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists bank_accounts_user_id_idx on public.bank_accounts (user_id);

alter table public.cards          enable row level security;
alter table public.bank_accounts  enable row level security;

drop policy if exists "cards_all_own" on public.cards;
create policy "cards_all_own" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bank_accounts_all_own" on public.bank_accounts;
create policy "bank_accounts_all_own" on public.bank_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at
  before update on public.bank_accounts
  for each row execute function public.set_updated_at();

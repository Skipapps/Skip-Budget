-- 0014 · Payments, and the date a stated balance was true
--
-- Cards behave like real cards now: what you spend on one adds to it, and a
-- payment brings it down. Nothing is automated — every figure is derived from
-- rows the user entered.
--
-- balance_as_of is the important half. `balance` is what the user typed into
-- "Today's balance", and that figure ALREADY includes everything charged
-- before the moment they typed it. Without a date attached, older receipts
-- would be counted twice. With it, only charges on or after that date accrue.
--
-- Null means no balance was ever stated, and then every charge counts from the
-- beginning — a backdated receipt on a card with no stated balance must still
-- show up rather than being silently dropped.

alter table public.cards
  add column if not exists balance_as_of date;

alter table public.bank_accounts
  add column if not exists balance_as_of date;

comment on column public.cards.balance_as_of is
  'Date the stated balance was true. Charges on or after it accrue; earlier ones are assumed included. Null = count everything.';

-- Money paid INTO a payment source.
--
-- One table for both, because it is the same event seen from two sides: on a
-- credit card it clears debt, on a bank account it is a deposit. The sign is a
-- presentation decision made by the ledger, not something to store twice.
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  card_id         uuid references public.cards (id) on delete cascade,
  bank_account_id uuid references public.bank_accounts (id) on delete cascade,
  amount          numeric(14,2) not null check (amount > 0),
  paid_on         date not null default current_date,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Exactly one source, never both and never neither: a payment that belongs
  -- to nothing cannot be shown anywhere.
  constraint payments_single_source check (num_nonnulls(card_id, bank_account_id) = 1)
);

create index if not exists payments_user_id_idx on public.payments (user_id, paid_on desc);
create index if not exists payments_card_idx    on public.payments (card_id, paid_on desc);
create index if not exists payments_bank_idx    on public.payments (bank_account_id, paid_on desc);

alter table public.payments enable row level security;

drop policy if exists "payments_all_own" on public.payments;
create policy "payments_all_own" on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

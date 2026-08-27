-- 0004 · Bill categories and bills
--
-- Categories are a table, not an enum: the app already lets people add their
-- own bill with a custom icon, and altering an enum for that is painful.

create table if not exists public.bill_categories (
  id         text primary key,
  label      text not null,
  hint       text,
  sort_order smallint not null default 0
);

insert into public.bill_categories (id, label, hint, sort_order) values
  ('housing',    'Housing',             'Rent, mortgage, HOA fees',       1),
  ('energy',     'Electricity & Gas',   'Power, heating, cooking gas',    2),
  ('water',      'Water & Waste',       'Water, sewer, garbage',          3),
  ('internet',   'Internet',            'Home broadband and Wi-Fi',       4),
  ('mobile',     'Mobile Phone',        'Phone plans, device payments',   5),
  ('insurance',  'Insurance',           'Car, health, home, life',        6),
  ('loans',      'Loans & Credit',      'Cards, student, auto, personal', 7),
  ('transport',  'Transportation',      'Car, transit, parking, tolls',   8),
  ('family',     'Family & Healthcare', 'Childcare, tuition, medical',    9),
  ('other',      'Other bill',          'Name it and pick an icon',      10)
on conflict (id) do update
  set label = excluded.label, hint = excluded.hint, sort_order = excluded.sort_order;

-- Reference data, readable by any signed-in user; nobody writes it from the app.
alter table public.bill_categories enable row level security;

drop policy if exists "bill_categories_read" on public.bill_categories;
create policy "bill_categories_read" on public.bill_categories
  for select to authenticated using (true);

do $$ begin
  create type public.bill_recurrence as enum ('weekly', 'monthly', 'quarterly', 'yearly', 'period');
exception when duplicate_object then null;
end $$;

create table if not exists public.bills (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null default '',
  -- Positive magnitude; the minus sign is added when displayed.
  amount          numeric(14,2) not null default 0 check (amount >= 0),
  category_id     text not null references public.bill_categories (id),
  icon_id         text,
  recurrence      public.bill_recurrence not null default 'monthly',
  next_due_on     date,
  starts_on       date,
  ends_on         date,
  -- Paid from exactly one source, or none yet. Two nullable FKs beat a
  -- polymorphic column: the database still enforces that the row exists.
  card_id         uuid references public.cards (id) on delete set null,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint bills_single_source check (num_nonnulls(card_id, bank_account_id) <= 1),
  constraint bills_period_order  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists bills_user_id_idx     on public.bills (user_id);
create index if not exists bills_category_idx    on public.bills (user_id, category_id);
create index if not exists bills_next_due_on_idx on public.bills (user_id, next_due_on);

alter table public.bills enable row level security;

drop policy if exists "bills_all_own" on public.bills;
create policy "bills_all_own" on public.bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

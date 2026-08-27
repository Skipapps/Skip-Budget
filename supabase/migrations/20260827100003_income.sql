-- 0003 · Salary sources and savings
--
-- A salary source can be paid into several accounts, so the link is a proper
-- join table rather than a single account_id.

do $$ begin
  create type public.pay_frequency as enum ('weekly', 'biweekly', 'semimonthly', 'monthly');
exception when duplicate_object then null;
end $$;

create table if not exists public.salary_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default '',
  amount      numeric(14,2) not null default 0 check (amount >= 0),
  frequency   public.pay_frequency not null default 'monthly',
  last_payday date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists salary_sources_user_id_idx on public.salary_sources (user_id);

create table if not exists public.salary_source_accounts (
  salary_source_id uuid not null references public.salary_sources (id) on delete cascade,
  bank_account_id  uuid not null references public.bank_accounts (id) on delete cascade,
  primary key (salary_source_id, bank_account_id)
);

-- Money set aside — the "Savings" tile.
create table if not exists public.savings_pots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'Savings',
  amount     numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists savings_pots_user_id_idx on public.savings_pots (user_id);

alter table public.salary_sources          enable row level security;
alter table public.salary_source_accounts  enable row level security;
alter table public.savings_pots            enable row level security;

drop policy if exists "salary_sources_all_own" on public.salary_sources;
create policy "salary_sources_all_own" on public.salary_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "savings_pots_all_own" on public.savings_pots;
create policy "savings_pots_all_own" on public.savings_pots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The join table carries no user_id of its own, so ownership is proven through
-- the parent rows — and both ends must belong to the same person.
drop policy if exists "salary_source_accounts_all_own" on public.salary_source_accounts;
create policy "salary_source_accounts_all_own" on public.salary_source_accounts
  for all
  using (
    exists (
      select 1 from public.salary_sources s
      where s.id = salary_source_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.salary_sources s
      where s.id = salary_source_id and s.user_id = auth.uid()
    )
    and exists (
      select 1 from public.bank_accounts b
      where b.id = bank_account_id and b.user_id = auth.uid()
    )
  );

drop trigger if exists salary_sources_set_updated_at on public.salary_sources;
create trigger salary_sources_set_updated_at
  before update on public.salary_sources
  for each row execute function public.set_updated_at();

drop trigger if exists savings_pots_set_updated_at on public.savings_pots;
create trigger savings_pots_set_updated_at
  before update on public.savings_pots
  for each row execute function public.set_updated_at();

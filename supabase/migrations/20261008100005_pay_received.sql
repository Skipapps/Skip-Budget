-- Recorded pay
--
-- A salary's paydays were worked out at read time from its schedule, so changing the amount after
-- a raise or a new job repriced every pay it ever made. A row here is one pay that actually landed,
-- with its own label, amount and account copied at that moment, exactly as a charge is for a bill:
-- editing the salary later leaves the pay already received alone.
--
-- Unlike a charge, a pay outlives its salary: someone who changes job and removes the old one still
-- received that money, so removing the salary keeps its pay (salary_source_id goes null).

create table if not exists public.pay_received (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  salary_source_id uuid references public.salary_sources (id) on delete set null,
  -- Copied from the salary the day it landed, never read back from it.
  label            text not null default '',
  amount           numeric(14,2) not null check (amount > 0),
  paid_on          date not null,
  -- The account it landed in, also copied: moving a salary to another account later does not
  -- move last March's pay.
  bank_account_id  uuid references public.bank_accounts (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- The catch-up writer runs on every app open; two opens racing must not record a payday twice.
create unique index if not exists pay_received_once_a_day
  on public.pay_received (salary_source_id, paid_on)
  where salary_source_id is not null;

create index if not exists pay_received_user_idx on public.pay_received (user_id, paid_on desc);

alter table public.pay_received enable row level security;

drop policy if exists "pay_received_all_own" on public.pay_received;
create policy "pay_received_all_own" on public.pay_received
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists pay_received_set_updated_at on public.pay_received;
create trigger pay_received_set_updated_at
  before update on public.pay_received
  for each row execute function public.set_updated_at();

-- The foreign keys accept anyone's rows; only the person's own salary and account may be named.
create or replace function public.pay_received_own_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.salary_source_id is not null and not exists (
    select 1 from public.salary_sources where id = new.salary_source_id and user_id = new.user_id
  ) then
    raise exception 'A pay can only belong to one of your own salaries.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A pay can only land in one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists pay_received_own_rows on public.pay_received;
create trigger pay_received_own_rows
  before insert or update of salary_source_id, bank_account_id on public.pay_received
  for each row execute function public.pay_received_own_rows();

-- Other devices hear about new pay as they do about new charges.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pay_received'
  ) then
    alter publication supabase_realtime add table public.pay_received;
  end if;
end;
$$;

alter table public.pay_received replica identity full;

-- Pay is something that happened, so it is let go after seven years like the rest.
create or replace function public.prune_expired_data(p_years integer default 7)
returns table (table_name text, removed bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := current_date - make_interval(years => p_years);
  n bigint;
begin
  delete from public.charges where charged_on < cutoff;
  get diagnostics n = row_count;
  table_name := 'charges'; removed := n; return next;

  delete from public.receipts where purchased_on < cutoff;
  get diagnostics n = row_count;
  table_name := 'receipts'; removed := n; return next;

  delete from public.payments where paid_on < cutoff;
  get diagnostics n = row_count;
  table_name := 'payments'; removed := n; return next;

  delete from public.pay_received where paid_on < cutoff;
  get diagnostics n = row_count;
  table_name := 'pay_received'; removed := n; return next;
end;
$$;

revoke all on function public.prune_expired_data(integer) from public, anon, authenticated;

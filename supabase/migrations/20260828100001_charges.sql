-- 0016 · Recorded charges
--
-- Until now a bill's occurrences were never written down. They were worked out
-- at read time by walking a recurrence from an anchor date, which answers "what
-- does this month look like" perfectly well and cannot answer anything else:
-- nothing happens, so nothing can be notified; editing a bill's amount silently
-- rewrites every month it ever ran; and there is nothing to erase after seven
-- years because there is nothing there.
--
-- A charge is one occurrence that actually landed. It keeps its own label and
-- amount rather than reading them from the plan, so correcting a bill going
-- forward leaves what already went out alone — the single most important
-- property here, and the reason this is a table rather than a view.

create table if not exists public.charges (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,

  -- Exactly one of these is set, and it says which kind of thing charged.
  bill_id         uuid references public.bills (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete cascade,

  -- Copied from the plan at the moment it landed, never read back from it.
  label           text not null default '',
  amount          numeric(14,2) not null default 0 check (amount >= 0),
  charged_on      date not null,

  -- Where it came out of, also copied: moving a bill to a different card
  -- should not rewrite which card paid for it last March.
  card_id         uuid references public.cards (id) on delete set null,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint charges_one_plan   check (num_nonnulls(bill_id, subscription_id) = 1),
  constraint charges_one_source check (num_nonnulls(card_id, bank_account_id) <= 1)
);

-- The catch-up writer runs on every app open and will happily try to record the
-- same occurrence twice. These are what make that safe: a second attempt hits
-- the constraint instead of doubling somebody's rent.
create unique index if not exists charges_bill_once
  on public.charges (bill_id, charged_on) where bill_id is not null;

create unique index if not exists charges_subscription_once
  on public.charges (subscription_id, charged_on) where subscription_id is not null;

-- Every read is "this user, this window", in that order.
create index if not exists charges_user_date on public.charges (user_id, charged_on desc);

alter table public.charges enable row level security;

drop policy if exists "charges_select_own" on public.charges;
create policy "charges_select_own" on public.charges
  for select using (auth.uid() = user_id);

drop policy if exists "charges_insert_own" on public.charges;
create policy "charges_insert_own" on public.charges
  for insert with check (auth.uid() = user_id);

drop policy if exists "charges_update_own" on public.charges;
create policy "charges_update_own" on public.charges
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "charges_delete_own" on public.charges;
create policy "charges_delete_own" on public.charges
  for delete using (auth.uid() = user_id);

drop trigger if exists charges_set_updated_at on public.charges;
create trigger charges_set_updated_at
  before update on public.charges
  for each row execute function public.set_updated_at();

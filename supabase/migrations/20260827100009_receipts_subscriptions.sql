-- 0009 · Receipts and subscriptions
--
-- Both pages have run on mock data until now. cards.last4 and
-- bank_accounts.last4 already exist (0002), which is what a scanned receipt
-- matches against to pick the payment source.

do $$ begin
  create type public.capture_source as enum ('manual', 'scan', 'upload');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.billing_cycle as enum ('weekly', 'monthly', 'quarterly', 'yearly');
exception when duplicate_object then null;
end $$;

-- Receipts
--
-- merchant is stored as text on every row, even when brand_id is set. The
-- catalog can be renamed or a brand removed, and a receipt must still say
-- where the money went — it is a record of something that happened, not a
-- live join. brand_id is the enrichment on top.
create table if not exists public.receipts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  brand_id      text references public.brands (id) on delete set null,
  merchant      text not null default '',
  amount        numeric(14,2) not null default 0 check (amount >= 0),
  purchased_on  date not null default current_date,
  category_id   text not null references public.spend_categories (id) default 'other',
  card_id       uuid references public.cards (id) on delete set null,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  note          text,
  -- How the row got here, so a scan can be re-parsed later if the parser
  -- improves and a manual entry is never overwritten by one.
  source        public.capture_source not null default 'manual',
  image_path    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint receipts_single_source check (num_nonnulls(card_id, bank_account_id) <= 1)
);

create index if not exists receipts_user_id_idx  on public.receipts (user_id, purchased_on desc);
create index if not exists receipts_category_idx on public.receipts (user_id, category_id);
create index if not exists receipts_card_idx     on public.receipts (card_id);

-- Subscriptions
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  brand_id        text references public.brands (id) on delete set null,
  name            text not null default '',
  amount          numeric(14,2) not null default 0 check (amount >= 0),
  cycle           public.billing_cycle not null default 'monthly',
  next_renewal_on date,
  category_id     text not null references public.spend_categories (id) default 'other',
  card_id         uuid references public.cards (id) on delete set null,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  started_on      date,
  -- Cancelled subscriptions stay visible in history rather than vanishing.
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint subscriptions_single_source check (num_nonnulls(card_id, bank_account_id) <= 1)
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id, next_renewal_on);
create index if not exists subscriptions_active_idx  on public.subscriptions (user_id, active);

alter table public.receipts      enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "receipts_all_own" on public.receipts;
create policy "receipts_all_own" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subscriptions_all_own" on public.subscriptions;
create policy "subscriptions_all_own" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists receipts_set_updated_at on public.receipts;
create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Scanned receipt images are private, one folder per user. The first path
-- segment must be the owner's uid, which is what these policies check.
insert into storage.buckets (id, name, public)
  values ('receipt-images', 'receipt-images', false)
on conflict (id) do nothing;

drop policy if exists "receipt_images_own" on storage.objects;
create policy "receipt_images_own" on storage.objects
  for all
  using (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text);

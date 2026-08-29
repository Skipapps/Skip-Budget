-- 0018 · Reminders
--
-- One row per thing somebody wants to be told about. Cards already carried a
-- `reminder_days` column of their own, which is the shape this replaces: four
-- tables each growing their own pair of columns means the scheduler has to ask
-- four questions every time it runs, and every new remindable thing is another
-- migration and another branch in the job.
--
-- A reminder is deliberately not a copy of what it points at. It holds only the
-- decision — on or off, and how long before — and the date is read from the
-- bill or the card at send time. A bill moved to the 15th should be announced
-- on the 15th without anything here being touched.
--
-- What "before" means depends on the thing:
--
--   bill          before its next due date
--   subscription  before it renews
--   card          before the card's own payment is due (cards.bill_due_day)
--   bank account  before anything charged to it goes out
--
-- Absence means off. Somebody who has never opened the reminders page is not
-- someone who asked to be messaged, so there is no row and nothing is sent.

create table if not exists public.reminders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,

  -- Exactly one of these is set, and it says what is being reminded about.
  bill_id         uuid references public.bills (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  card_id         uuid references public.cards (id) on delete cascade,
  bank_account_id uuid references public.bank_accounts (id) on delete cascade,

  enabled         boolean not null default true,
  -- Days ahead. Zero is "on the day", which is a real choice rather than off.
  -- Capped at a month: further out and it is a calendar entry, not a reminder.
  lead_days       smallint not null default 1 check (lead_days between 0 and 30),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint reminders_one_target
    check (num_nonnulls(bill_id, subscription_id, card_id, bank_account_id) = 1)
);

-- One reminder per thing. The page upserts on these, so a double tap on a
-- toggle updates the row it already made instead of making a second one.
create unique index if not exists reminders_bill_once
  on public.reminders (bill_id) where bill_id is not null;
create unique index if not exists reminders_subscription_once
  on public.reminders (subscription_id) where subscription_id is not null;
create unique index if not exists reminders_card_once
  on public.reminders (card_id) where card_id is not null;
create unique index if not exists reminders_account_once
  on public.reminders (bank_account_id) where bank_account_id is not null;

-- What the scheduler asks for: this user's live reminders, nothing else.
create index if not exists reminders_user_enabled
  on public.reminders (user_id) where enabled;

alter table public.reminders enable row level security;

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own" on public.reminders
  for select using (auth.uid() = user_id);

drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own" on public.reminders
  for insert with check (auth.uid() = user_id);

drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own" on public.reminders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own" on public.reminders
  for delete using (auth.uid() = user_id);

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- The old per-card column. Anything already set there becomes a real reminder
-- so nobody loses a preference they had, and the column goes: two places to
-- read the same answer from is how they end up disagreeing.
insert into public.reminders (user_id, card_id, enabled, lead_days)
select c.user_id, c.id, true, least(greatest(c.reminder_days, 0), 30)
from public.cards c
where c.reminder_days is not null
on conflict do nothing;

alter table public.cards drop column if exists reminder_days;

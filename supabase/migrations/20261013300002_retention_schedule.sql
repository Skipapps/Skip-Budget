-- 20261013300002 · Seven-year retention, switched on
--
-- What happened is deleted seven years after the date on it; what was set up is
-- kept until the person deletes it. public.prune_expired_data() (0017, last
-- redefined in 20261008100005) did the deleting and was never scheduled. This
-- recreates it so balances do not move, and runs it daily.
--
-- What it deletes, by the date on each row:
--   charges       charged_on    recorded bill and subscription payments
--   receipts      purchased_on  receipts, habit days included (a habit day is a receipt)
--   payments      paid_on       card payments and transfers between accounts
--   pay_received  paid_on       pay that landed
-- A row goes when its date is before the person's own today (profiles.timezone,
-- as the recorders read it) less seven years: one dated exactly seven years ago
-- is kept until the next run. Nothing points at these rows, so deleting one
-- deletes nothing else.
--
-- Kept, though some are dated: bills, subscriptions, loans and their payoffs
-- (a payoff is part of the loan's schedule; dropping one would change what is
-- still owed), cards, accounts, salaries, savings months and moves, goals and
-- their moves, habits, receipt books, reminders, the profile.
--
-- Card and account balances stay where they were. A card's or account's
-- balance is its typed balance plus what has moved since its as-of day, and the
-- app counts some rows however old: payments, and charges of a plan it no
-- longer walks (a bill with no next date, a subscription switched off). Each
-- such deleted row is added into its card's or account's typed balance as it
-- goes. Receipts, pay and a running plan's charges are not: the app stopped
-- counting them when they left its seven-year window.
--
-- Home's Current balance can still move, by exactly one kind of row: a deleted
-- charge of a plan no longer walked that came from no card or account (paid
-- with Skip, or its card or account since deleted). The app counts such a
-- charge against no source, so there is no typed balance to take it in.
--
-- A balance re-typed while this runs is left as it was typed: each update
-- checks the as-of day it read is still the one on the row. A new as-of day
-- means the person stated the balance afresh, and the deleted rows before it no
-- longer count toward it.
--
-- To switch it off, both parts go: the job, and the two guards, which would
-- otherwise still drop old charges and pay that someone writes:
--   select cron.unschedule('skip-prune-expired-data');
--   drop trigger if exists charges_within_retention on public.charges;
--   drop trigger if exists pay_received_within_retention on public.pay_received;
-- prune_expired_data(999) only shows that the function runs (it reports zeroes
-- and changes nothing); it is not a preview. To see what a run would delete,
-- count each table's rows dated before retention_cutoff(user_id).
--
-- Both recorders write every due date from a plan's own start: the server's
-- record_due_charges every quarter hour, the app's on every launch, and the
-- app's pay writer the same for pay. A bill running for more than seven years
-- would have its deleted charges written straight back, with today's name and
-- amount. So a charge or pay dated before the cutoff is dropped whoever writes
-- it, the way charges_one_per_cycle drops a second charge in a cycle: the
-- recorders are catch-up loops, and an error would stop the rest being
-- written. Receipts and payments are only ever written by a person, so they
-- are not guarded; one typed in older than seven years goes at the next run.

-- The first day still kept for a person: a row of theirs dated before it is
-- older than p_years. Their own today, so a phone west of UTC never loses a day
-- it still shows; the guards, the job and the recorders all use this one rule.
-- Security invoker: a caller sees only their own profile, so anyone else's
-- reads as UTC; the job and the recorders run as the owner and see every one.
create or replace function public.retention_cutoff(p_user uuid, p_years integer default 7)
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  v_zone text := coalesce((select p.timezone from public.profiles p where p.id = p_user), 'UTC');
  v_today date;
begin
  begin
    v_today := (now() at time zone v_zone)::date;
  exception when invalid_parameter_value then
    -- A zone Postgres does not know must not stop the job or a recorder.
    v_today := (now() at time zone 'UTC')::date;
  end;
  return (v_today - make_interval(years => p_years))::date;
end;
$$;

comment on function public.retention_cutoff(uuid, integer) is
  'First day still kept for a person: their rows dated before it are older than p_years, by their own today.';

create or replace function public.charges_within_retention()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.charged_on < public.retention_cutoff(new.user_id) then
    return null;
  end if;
  return new;
end;
$$;

create or replace function public.pay_received_within_retention()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.paid_on < public.retention_cutoff(new.user_id) then
    return null;
  end if;
  return new;
end;
$$;

comment on function public.charges_within_retention() is
  'Drops a charge dated before retention_cutoff(), whichever recorder writes it, so the deletion job is not undone.';
comment on function public.pay_received_within_retention() is
  'Drops a pay dated before retention_cutoff(), whichever writer records it, so the deletion job is not undone.';

drop trigger if exists charges_within_retention on public.charges;
create trigger charges_within_retention
  before insert on public.charges
  for each row execute function public.charges_within_retention();

drop trigger if exists pay_received_within_retention on public.pay_received;
create trigger pay_received_within_retention
  before insert on public.pay_received
  for each row execute function public.pay_received_within_retention();

-- --------------------------------------------------------------------------
-- The job
-- --------------------------------------------------------------------------

-- Same signature, the same four rows back in the same order, still the
-- scheduler's alone.
create or replace function public.prune_expired_data(p_years integer default 7)
returns table (table_name text, removed bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charges bigint;
  v_payments bigint;
  n bigint;
begin
  -- Deleting and taking in are one statement, so what is taken in is exactly
  -- what is deleted, even with a back-dated row written while this runs.
  with cut as (
    select u.id as user_id, public.retention_cutoff(u.id, p_years) as cutoff
    from auth.users u
  ),
  gone_payments as (
    delete from public.payments pm
     using cut
     where pm.user_id = cut.user_id and pm.paid_on < cut.cutoff
    returning pm.card_id, pm.bank_account_id, pm.from_bank_account_id, pm.amount, pm.paid_on
  ),
  gone_charges as (
    delete from public.charges c
     using cut
     where c.user_id = cut.user_id and c.charged_on < cut.cutoff
    returning c.bill_id, c.subscription_id, c.card_id, c.bank_account_id, c.amount, c.charged_on
  ),
  -- The app walks a bill with a next date and a subscription switched on with
  -- one; their charges left its count with its seven-year window. The rest it
  -- counts however old.
  unwalked as (
    select g.*
    from gone_charges g
    left join public.bills b on b.id = g.bill_id
    left join public.subscriptions s on s.id = g.subscription_id
    where case
            when g.bill_id is not null then b.next_due_on is null
            else not coalesce(s.active and s.next_renewal_on is not null, false)
          end
  ),
  -- What each deleted row did to its source, as the app counts it: an
  -- account's balance is what it holds, a card's is what is owed on it.
  effect as (
    select 'account' as kind, bank_account_id as source_id, paid_on as on_day, amount as delta
      from gone_payments where bank_account_id is not null
    union all
    select 'account', from_bank_account_id, paid_on, -amount
      from gone_payments where from_bank_account_id is not null
    union all
    select 'card', card_id, paid_on, -amount
      from gone_payments where card_id is not null
    union all
    select 'account', bank_account_id, charged_on, -amount
      from unwalked where bank_account_id is not null
    union all
    select 'card', card_id, charged_on, amount
      from unwalked where card_id is not null
  ),
  -- Only what the source counts: from its as-of day on, or everything when it
  -- has none. The as-of day is left alone: it is shown on the source's page,
  -- and later rows still count from it.
  account_delta as (
    select a.id, a.balance_as_of as as_of, sum(e.delta) as delta
    from effect e
    join public.bank_accounts a on a.id = e.source_id
    where e.kind = 'account'
      and (a.balance_as_of is null or e.on_day >= a.balance_as_of)
    group by a.id, a.balance_as_of
  ),
  card_delta as (
    select c.id, c.balance_as_of as as_of, sum(e.delta) as delta
    from effect e
    join public.cards c on c.id = e.source_id
    where e.kind = 'card'
      and (c.balance_as_of is null or e.on_day >= c.balance_as_of)
    group by c.id, c.balance_as_of
  ),
  -- The as-of day must still be the one read above. A row re-typed and
  -- committed meanwhile is re-checked against its new version under READ
  -- COMMITTED, and a new as-of day skips it: that balance was stated afresh.
  accounts as (
    update public.bank_accounts a
       set balance = a.balance + d.delta
      from account_delta d
     where a.id = d.id and d.delta <> 0
       and a.balance_as_of is not distinct from d.as_of
    returning a.id
  ),
  cards as (
    update public.cards c
       set balance = c.balance + d.delta
      from card_delta d
     where c.id = d.id and d.delta <> 0
       and c.balance_as_of is not distinct from d.as_of
    returning c.id
  )
  select (select count(*) from gone_charges), (select count(*) from gone_payments)
    into v_charges, v_payments;

  table_name := 'charges'; removed := v_charges; return next;

  with cut as (
    select u.id as user_id, public.retention_cutoff(u.id, p_years) as cutoff
    from auth.users u
  )
  delete from public.receipts r
   using cut
   where r.user_id = cut.user_id and r.purchased_on < cut.cutoff;
  get diagnostics n = row_count;
  table_name := 'receipts'; removed := n; return next;

  table_name := 'payments'; removed := v_payments; return next;

  with cut as (
    select u.id as user_id, public.retention_cutoff(u.id, p_years) as cutoff
    from auth.users u
  )
  delete from public.pay_received pr
   using cut
   where pr.user_id = cut.user_id and pr.paid_on < cut.cutoff;
  get diagnostics n = row_count;
  table_name := 'pay_received'; removed := n; return next;
end;
$$;

revoke all on function public.prune_expired_data(integer) from public, anon, authenticated;

comment on function public.prune_expired_data(integer) is
  'Deletes each person''s charges, receipts, payments and pay_received dated before retention_cutoff(user, p_years), '
  'adding into card and account balances what the app still counted of them. Runs daily as the cron job '
  'skip-prune-expired-data. prune_expired_data(999) only shows that it runs (zeroes, nothing changed); it '
  'previews nothing. Off: unschedule skip-prune-expired-data and drop the triggers charges_within_retention '
  'and pay_received_within_retention.';

-- --------------------------------------------------------------------------
-- The schedule
-- --------------------------------------------------------------------------

-- 08:07 UTC: after midnight everywhere from New York to Los Angeles (04:07 or
-- 03:07 in New York, 01:07 or 00:07 in Los Angeles), the quietest hour for the
-- app's US users. Off the quarter hours, so it never starts with send-push.
--
-- Replaced rather than added, so running this again leaves one job. The name
-- 0017 suggested arming it by hand under is cleared too, in case that was done.
select cron.unschedule(jobname)
  from cron.job
 where jobname in ('skip-prune-expired-data', 'prune-expired-data');

select cron.schedule(
  'skip-prune-expired-data',
  '7 8 * * *',
  $$ select public.prune_expired_data(); $$
);

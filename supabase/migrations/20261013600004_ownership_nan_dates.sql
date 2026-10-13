-- 20261013600004 · Amounts are numbers, rows point at their owner's, and nothing older than seven years is typed in
--
-- Finite amounts. Each amount column's precision refuses ±Infinity as an overflow
-- but stores NaN, and a check such as amount > 0 does not stop NaN, which Postgres
-- sorts above every number. The app's client sends NaN as null, so it could only
-- arrive from SQL or a string, and a nullable column would take it silently. Every
-- numeric column of the app's tables now refuses NaN, and ±Infinity too should a
-- column ever lose its precision. The live tables held none, so each check is
-- validated here.
--
-- Owners. A row's foreign keys accept anyone's row. The policies keep each person
-- to their own rows, but code that runs as the owner joins on those ids:
-- reminders_due put the named plan's name and amount into a push,
-- charges_one_per_cycle let a charge filed under another person's bill drop
-- theirs, and the seven-year job adds a deleted row into the card or account it
-- names. So a bill, subscription, receipt, payment, charge, reminder and loan may
-- only name the same person's card, account, bill or subscription (23514, as
-- habits_own_rows refuses). The live tables held no such row.
--
-- Seven years. Nothing is kept past seven years from the date on it, so a receipt,
-- card payment or transfer dated before the person's retention_cutoff is refused
-- with "Pick a day in the last seven years." under its own SQLSTATE, SK007: other
-- functions a receipt is filed through raise 22023 for other reasons, so the app
-- can tell this one apart by its code. Charges and pay are dropped quietly
-- instead by their own guards, because the recorders that write them are
-- catch-up loops.
--
-- prune_expired_data is 20261013300002's with one change: what a deleted row did
-- is added only into a card or account of the same person, and its plan is read
-- only if it is theirs.

-- --------------------------------------------------------------------------
-- Finite amounts
-- --------------------------------------------------------------------------

do $$
declare
  v_pair text[];
  v_name text;
begin
  foreach v_pair slice 1 in array array[
    ['bank_accounts', 'balance'],
    ['bills', 'amount'],
    ['cards', 'balance'],
    ['cards', 'credit_limit'],
    ['charges', 'amount'],
    ['expense_splits', 'share'],
    ['expenses', 'amount'],
    ['goal_moves', 'amount'],
    ['goals', 'start_amount'],
    ['goals', 'target'],
    ['habits', 'price'],
    ['loan_payoffs', 'amount'],
    ['loans', 'annual_rate'],
    ['loans', 'monthly_payment'],
    ['loans', 'principal'],
    ['loans', 'statement_principal'],
    ['loans', 'total_interest'],
    ['monthly_savings', 'adjusted_saved'],
    ['monthly_savings', 'income'],
    ['monthly_savings', 'saved'],
    ['monthly_savings', 'spent'],
    ['pay_received', 'amount'],
    ['payments', 'amount'],
    ['receipts', 'amount'],
    ['salary_sources', 'amount'],
    ['salary_sources', 'deduction_percent'],
    ['salary_sources', 'hourly_rate'],
    ['salary_sources', 'hours_per_week'],
    ['salary_sources', 'overtime_hours_per_week'],
    ['salary_sources', 'overtime_multiplier'],
    ['savings_pots', 'amount'],
    ['savings_pots', 'earned'],
    ['savings_pots', 'spent'],
    ['settlements', 'amount'],
    ['subscriptions', 'amount']
  ] loop
    v_name := v_pair[1] || '_' || v_pair[2] || '_finite';
    if not exists (
      select 1 from pg_constraint
      where conname = v_name and conrelid = format('public.%I', v_pair[1])::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I not in (''NaN'', ''Infinity'', ''-Infinity'')) not valid',
        v_pair[1], v_name, v_pair[2]);
    end if;
    execute format('alter table public.%I validate constraint %I', v_pair[1], v_name);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- Owners
-- --------------------------------------------------------------------------
--
-- As habits_own_rows: run as the writer, whose own rows are all the lookups see,
-- or as the owner of the code writing (the recorder), who sees every row.

create or replace function public.bills_own_sources()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A bill can only be paid with one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A bill can only be paid from one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists bills_own_sources on public.bills;
create trigger bills_own_sources
  before insert or update of card_id, bank_account_id, user_id on public.bills
  for each row execute function public.bills_own_sources();

create or replace function public.subscriptions_own_sources()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A subscription can only be paid with one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A subscription can only be paid from one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_own_sources on public.subscriptions;
create trigger subscriptions_own_sources
  before insert or update of card_id, bank_account_id, user_id on public.subscriptions
  for each row execute function public.subscriptions_own_sources();

create or replace function public.receipts_own_sources()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A receipt can only be paid with one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A receipt can only be paid from one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_own_sources on public.receipts;
create trigger receipts_own_sources
  before insert or update of card_id, bank_account_id, user_id on public.receipts
  for each row execute function public.receipts_own_sources();

-- The account money comes from is already held to its owner (payments_from_own_account).
create or replace function public.payments_own_target()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A payment can only go to one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A payment can only go to one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_own_target on public.payments;
create trigger payments_own_target
  before insert or update of card_id, bank_account_id, user_id on public.payments
  for each row execute function public.payments_own_target();

-- A charge copies its plan's card or account, which bills_own_sources and
-- subscriptions_own_sources hold to the same person, so the recorder, which writes
-- every person's charges in one statement, is never refused here.
create or replace function public.charges_own_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.bill_id is not null and not exists (
    select 1 from public.bills where id = new.bill_id and user_id = new.user_id
  ) then
    raise exception 'A charge can only be for one of your own bills.' using errcode = '23514';
  end if;
  if new.subscription_id is not null and not exists (
    select 1 from public.subscriptions where id = new.subscription_id and user_id = new.user_id
  ) then
    raise exception 'A charge can only be for one of your own subscriptions.' using errcode = '23514';
  end if;
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A charge can only be paid with one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A charge can only be paid from one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists charges_own_rows on public.charges;
create trigger charges_own_rows
  before insert or update of bill_id, subscription_id, card_id, bank_account_id, user_id on public.charges
  for each row execute function public.charges_own_rows();

create or replace function public.reminders_own_target()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.bill_id is not null and not exists (
    select 1 from public.bills where id = new.bill_id and user_id = new.user_id
  ) then
    raise exception 'A reminder can only be for one of your own bills.' using errcode = '23514';
  end if;
  if new.subscription_id is not null and not exists (
    select 1 from public.subscriptions where id = new.subscription_id and user_id = new.user_id
  ) then
    raise exception 'A reminder can only be for one of your own subscriptions.' using errcode = '23514';
  end if;
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A reminder can only be for one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A reminder can only be for one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists reminders_own_target on public.reminders;
create trigger reminders_own_target
  before insert or update of bill_id, subscription_id, card_id, bank_account_id, user_id on public.reminders
  for each row execute function public.reminders_own_target();

create or replace function public.loans_own_bill()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.bill_id is not null and not exists (
    select 1 from public.bills where id = new.bill_id and user_id = new.user_id
  ) then
    raise exception 'A loan can only belong to one of your own bills.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists loans_own_bill on public.loans;
create trigger loans_own_bill
  before insert or update of bill_id, user_id on public.loans
  for each row execute function public.loans_own_bill();

-- --------------------------------------------------------------------------
-- Seven years
-- --------------------------------------------------------------------------

create or replace function public.receipts_within_retention()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.purchased_on < public.retention_cutoff(new.user_id) then
    raise exception 'Pick a day in the last seven years.' using errcode = 'SK007';
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_within_retention on public.receipts;
create trigger receipts_within_retention
  before insert or update of purchased_on, user_id on public.receipts
  for each row execute function public.receipts_within_retention();

create or replace function public.payments_within_retention()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.paid_on < public.retention_cutoff(new.user_id) then
    raise exception 'Pick a day in the last seven years.' using errcode = 'SK007';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_within_retention on public.payments;
create trigger payments_within_retention
  before insert or update of paid_on, user_id on public.payments
  for each row execute function public.payments_within_retention();

-- --------------------------------------------------------------------------
-- The seven-year job folds only into the same person's sources
-- --------------------------------------------------------------------------

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
    returning pm.user_id, pm.card_id, pm.bank_account_id, pm.from_bank_account_id, pm.amount, pm.paid_on
  ),
  gone_charges as (
    delete from public.charges c
     using cut
     where c.user_id = cut.user_id and c.charged_on < cut.cutoff
    returning c.user_id, c.bill_id, c.subscription_id, c.card_id, c.bank_account_id, c.amount, c.charged_on
  ),
  -- The app walks a bill with a next date and a subscription switched on with
  -- one; their charges left its count with its seven-year window. The rest it
  -- counts however old.
  unwalked as (
    select g.*
    from gone_charges g
    left join public.bills b on b.id = g.bill_id and b.user_id = g.user_id
    left join public.subscriptions s on s.id = g.subscription_id and s.user_id = g.user_id
    where case
            when g.bill_id is not null then b.next_due_on is null
            else not coalesce(s.active and s.next_renewal_on is not null, false)
          end
  ),
  -- What each deleted row did to its source, as the app counts it: an
  -- account's balance is what it holds, a card's is what is owed on it.
  effect as (
    select 'account' as kind, user_id, bank_account_id as source_id, paid_on as on_day, amount as delta
      from gone_payments where bank_account_id is not null
    union all
    select 'account', user_id, from_bank_account_id, paid_on, -amount
      from gone_payments where from_bank_account_id is not null
    union all
    select 'card', user_id, card_id, paid_on, -amount
      from gone_payments where card_id is not null
    union all
    select 'account', user_id, bank_account_id, charged_on, -amount
      from unwalked where bank_account_id is not null
    union all
    select 'card', user_id, card_id, charged_on, amount
      from unwalked where card_id is not null
  ),
  -- Only what the source counts: from its as-of day on, or everything when it
  -- has none. The as-of day is left alone: it is shown on the source's page,
  -- and later rows still count from it.
  account_delta as (
    select a.id, a.balance_as_of as as_of, sum(e.delta) as delta
    from effect e
    join public.bank_accounts a on a.id = e.source_id and a.user_id = e.user_id
    where e.kind = 'account'
      and (a.balance_as_of is null or e.on_day >= a.balance_as_of)
    group by a.id, a.balance_as_of
  ),
  card_delta as (
    select c.id, c.balance_as_of as as_of, sum(e.delta) as delta
    from effect e
    join public.cards c on c.id = e.source_id and c.user_id = e.user_id
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

-- 20261012100003 · Paying a loan off, in full or in part
--
-- A payoff is money paid on a loan beyond its instalments: everything owed on
-- a day (full), or some of it (partial). Every partial is kept, however many.
-- The app's schedule reads these rows: a payoff pays the interest built up
-- since the last payment first, then the balance.
--
-- A payoff is neither a charge nor a receipt. Charges stand for instalments,
-- one per bill per month (charges_one_per_cycle); a receipt would land in
-- Receipts and its books. The app counts a payoff as spending on its own date,
-- from its own card or account, when the loan counted toward spending as it
-- was paid and it is dated on or after the day the loan was added (F1, as its
-- instalments): `counted` keeps that, as a charge keeps its own copy. One
-- dated earlier still lowers the balance; it is just not this app's spending.
--
-- The loan's bill follows its payoffs:
-- - A full payoff ends the bill on its date, so no later instalment is
--   charged, projected or reminded. Nothing paid may come after it (a charge,
--   a scheduled payment up to today, another payoff), or it would stay
--   counted after the loan ended. The payment day itself is allowed: the
--   payoff posts after that day's instalment, which counts once.
-- - A partial payoff ends the bill on the schedule's new last payment, which
--   the app works out and sends: the monthly payment stays, the loan ends
--   sooner.
-- - An end before the bill counts at all (paid off before its first payment,
--   or before the day it was added) stops the bill instead: no next date, so
--   nothing is walked, and its end stays on its count floor, as
--   bills_period_order needs. Moving the floor down instead would let the
--   recorders write an instalment that falls on the new floor.
-- - Only the latest payoff can be removed (by date, then as recorded): taking
--   out an earlier one would leave a later full payoff short of clearing the
--   loan. Removing it puts the bill back, from the dates kept on the payoff
--   or the last payment the app sends; a partial one removed with no last
--   payment leaves the bill as it is. Through an edit (update_loan, recreated
--   below), a paid-off loan stays ended on its payoff day.
--
-- Each function writes the bill even when its dates do not move. That change
-- is what reaches the person's other phones: their feed listens to bills, not
-- to this table, because a feed naming a table the server lacks fails whole.

create table if not exists public.loan_payoffs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The loan's bill, the id the app knows a loan by. It references the loan,
  -- so a payoff goes with its loan, and the loan with its bill.
  bill_id                 uuid not null references public.loans (bill_id) on delete cascade,
  paid_on                 date not null,
  amount                  numeric(14,2) not null check (amount > 0),
  kind                    text not null check (kind in ('full', 'partial')),
  card_id                 uuid references public.cards (id) on delete set null,
  bank_account_id         uuid references public.bank_accounts (id) on delete set null,
  counted                 boolean not null,
  bill_ends_on_before     date,
  bill_next_due_on_before date,
  created_at              timestamptz not null default now(),
  constraint loan_payoffs_single_source check (num_nonnulls(card_id, bank_account_id) <= 1)
);

comment on column public.loan_payoffs.counted is
  'Counts toward spending: the bill''s in_spending when it was paid, and dated on or after the day the loan was added.';
comment on column public.loan_payoffs.bill_ends_on_before is
  'The bill''s end just before this payoff, put back when it is removed. update_loan keeps a full payoff''s current.';
comment on column public.loan_payoffs.bill_next_due_on_before is
  'The next due date this payoff took when it stopped its bill, put back when it is removed; null when it stopped nothing.';

-- A loan is paid off once; removing that payoff is how it is undone.
create unique index if not exists loan_payoffs_one_full
  on public.loan_payoffs (bill_id) where kind = 'full';
create index if not exists loan_payoffs_bill_idx on public.loan_payoffs (bill_id, paid_on);
create index if not exists loan_payoffs_user_idx on public.loan_payoffs (user_id, paid_on);

alter table public.loan_payoffs enable row level security;

drop policy if exists "loan_payoffs_all_own" on public.loan_payoffs;
create policy "loan_payoffs_all_own" on public.loan_payoffs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The foreign keys accept anyone's rows; only the person's own loan, card and
-- account may be named.
create or replace function public.loan_payoffs_own_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.loans where bill_id = new.bill_id and user_id = new.user_id
  ) then
    raise exception 'A payoff can only be on one of your own loans.' using errcode = '23514';
  end if;
  if new.card_id is not null and not exists (
    select 1 from public.cards where id = new.card_id and user_id = new.user_id
  ) then
    raise exception 'A payoff can only come from one of your own cards.' using errcode = '23514';
  end if;
  if new.bank_account_id is not null and not exists (
    select 1 from public.bank_accounts where id = new.bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A payoff can only come from one of your own accounts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists loan_payoffs_own_rows on public.loan_payoffs;
create trigger loan_payoffs_own_rows
  before insert or update of bill_id, card_id, bank_account_id, user_id on public.loan_payoffs
  for each row execute function public.loan_payoffs_own_rows();

-- --------------------------------------------------------------------------
-- Recording a payoff
-- --------------------------------------------------------------------------

create or replace function public.record_loan_payoff(
  p_bill_id         uuid,
  p_paid_on         date,
  p_amount          numeric,
  p_kind            text,
  p_card_id         uuid,
  p_bank_account_id uuid,
  -- A partial payoff's new last payment, from the app's schedule; null keeps
  -- the bill's end. Not read for a full payoff, which ends on its own date.
  p_last_payment_on date default null,
  -- The person's day; null reads it off their profile's timezone.
  p_today           date default null
)
returns public.loan_payoffs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bill public.bills;
  v_loan public.loans;
  v_tz text;
  v_today date;
  v_first date;
  v_day integer;
  v_month date;
  v_due date;
  v_term_ends_on date;
  v_end date;
  v_stops boolean;
  v_payoff public.loan_payoffs;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_kind is null or p_kind not in ('full', 'partial') then
    raise exception 'a payoff is full or partial';
  end if;

  -- Refused rather than rounded by numeric(14,2): a payoff is what was paid.
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'a payoff is an amount above zero, in whole cents';
  end if;

  if p_paid_on is null then
    raise exception 'a payoff needs its date';
  end if;

  -- Locked, so payoffs and edits of one loan cannot interleave their reads
  -- and writes.
  select * into v_bill from public.bills where id = p_bill_id for update;
  if not found then
    raise exception 'there is no such loan' using errcode = 'P0002';
  end if;
  select * into v_loan from public.loans where bill_id = p_bill_id;
  if not found then
    raise exception 'there is no such loan' using errcode = 'P0002';
  end if;

  v_tz := coalesce((select p.timezone from public.profiles p where p.id = v_user), 'UTC');
  v_today := coalesce(p_today, (now() at time zone v_tz)::date);

  if p_paid_on > v_today then
    raise exception 'a payoff cannot be dated after today';
  end if;

  -- The schedule's first payment: the bill's first due date stands in for a
  -- loan saved without one, as the app's schedule reads it.
  v_first := coalesce(v_loan.first_payment_on, v_bill.starts_on);
  v_day := coalesce(v_loan.payment_day, extract(day from v_first)::integer);

  if p_paid_on < coalesce(v_loan.funded_on, (v_first - interval '1 month')::date) then
    raise exception 'a payoff cannot be dated before the loan started';
  end if;

  if exists (select 1 from public.loan_payoffs where bill_id = p_bill_id and kind = 'full') then
    raise exception 'the loan is already paid off';
  end if;

  if v_bill.ends_on is not null and p_paid_on > v_bill.ends_on then
    raise exception 'the loan had already finished by then';
  end if;

  if p_kind = 'full' then
    if exists (
         select 1 from public.charges where bill_id = p_bill_id and charged_on > p_paid_on
       )
       or exists (
         select 1 from public.loan_payoffs where bill_id = p_bill_id and paid_on > p_paid_on
       ) then
      raise exception 'a full payoff must come after the last payment made';
    end if;

    -- The schedule's first payment after the payoff's day, as the app's
    -- schedule dates them: the first payment, then the payment day (clamped)
    -- of each month after it. On or before today it was made, recorded yet or
    -- not, and only a loan that ends before it never has it.
    if p_paid_on < v_first then
      v_due := v_first;
    else
      v_month := greatest(
        date_trunc('month', p_paid_on + 1)::date,
        (date_trunc('month', v_first) + interval '1 month')::date
      );
      v_due := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
      if v_due <= p_paid_on then
        v_month := (v_month + interval '1 month')::date;
        v_due := v_month + least(
          v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
        ) - 1;
      end if;
    end if;
    if v_due <= v_today and (v_bill.ends_on is null or v_due <= v_bill.ends_on) then
      raise exception 'a full payoff must come after the last payment made';
    end if;

    v_end := p_paid_on;
  else
    if p_last_payment_on is not null then
      -- The term's last payment, exactly as save_loan works it out.
      v_month := (date_trunc('month', v_first)
                  + make_interval(months => v_loan.term_months - 1))::date;
      v_term_ends_on := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
      if p_last_payment_on < greatest(p_paid_on, v_first) or p_last_payment_on > v_term_ends_on then
        raise exception 'the last payment must fall within the term';
      end if;
    end if;
    v_end := coalesce(p_last_payment_on, v_bill.ends_on);
  end if;

  v_stops := v_end < v_bill.starts_on;

  insert into public.loan_payoffs (
    user_id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted,
    bill_ends_on_before, bill_next_due_on_before
  )
  values (
    v_user, p_bill_id, p_paid_on, p_amount, p_kind, p_card_id, p_bank_account_id,
    -- The add day in the person's own day, as update_loan's floor reads it.
    v_bill.in_spending and p_paid_on >= (v_bill.created_at at time zone v_tz)::date,
    v_bill.ends_on, case when v_stops then v_bill.next_due_on end
  )
  returning * into v_payoff;

  if v_stops then
    update public.bills set ends_on = v_bill.starts_on, next_due_on = null where id = p_bill_id;
  else
    update public.bills set ends_on = v_end where id = p_bill_id;
  end if;

  return v_payoff;
end;
$$;

-- A new function is executable by PUBLIC by default. As save_loan, only
-- signed-in people may call it.
revoke all on function public.record_loan_payoff(uuid, date, numeric, text, uuid, uuid, date, date)
  from public, anon;
grant execute on function public.record_loan_payoff(uuid, date, numeric, text, uuid, uuid, date, date)
  to authenticated;

-- --------------------------------------------------------------------------
-- Removing a payoff typed wrong
-- --------------------------------------------------------------------------

create or replace function public.delete_loan_payoff(
  p_id              uuid,
  -- The loan's last payment with this payoff taken out, from the app's
  -- schedule. Null: a full payoff puts back the end the bill had before it,
  -- and a partial one leaves the bill as it is (one stopped early stays so).
  p_last_payment_on date default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_payoff public.loan_payoffs;
  v_bill public.bills;
  v_loan public.loans;
  v_first date;
  v_day integer;
  v_month date;
  v_term_ends_on date;
  v_end date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Gone already (a second tap, another phone) or not this person's: there
  -- is nothing to undo, and nothing to say.
  select * into v_payoff from public.loan_payoffs where id = p_id;
  if not found then
    return false;
  end if;

  -- The bill first, as record_loan_payoff and update_loan lock it, then the
  -- payoff again under that lock: a removal that raced this one has won.
  select * into v_bill from public.bills where id = v_payoff.bill_id for update;
  select * into v_payoff from public.loan_payoffs where id = p_id for update;
  if not found then
    return false;
  end if;
  select * into v_loan from public.loans where bill_id = v_payoff.bill_id;

  -- The schedule's order, as the app's: by date, then as recorded.
  if exists (
    select 1 from public.loan_payoffs o
    where o.bill_id = v_payoff.bill_id
      and (o.paid_on, o.created_at, o.id) > (v_payoff.paid_on, v_payoff.created_at, v_payoff.id)
  ) then
    raise exception 'only the latest payoff can be removed';
  end if;

  if p_last_payment_on is not null then
    v_first := coalesce(v_loan.first_payment_on, v_bill.starts_on);
    v_day := coalesce(v_loan.payment_day, extract(day from v_first)::integer);
    v_month := (date_trunc('month', v_first)
                + make_interval(months => v_loan.term_months - 1))::date;
    v_term_ends_on := v_month + least(
      v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
    ) - 1;
    if p_last_payment_on < v_first or p_last_payment_on > v_term_ends_on then
      raise exception 'the last payment must fall within the term';
    end if;
  end if;

  delete from public.loan_payoffs where id = p_id;

  -- Its dates may have moved since for other reasons (an edit, a stop), and
  -- only the app's schedule knows where the loan ends without it.
  if v_payoff.kind = 'partial' and p_last_payment_on is null then
    update public.bills set ends_on = v_bill.ends_on where id = v_payoff.bill_id;
    return true;
  end if;

  v_end := case
    when v_payoff.kind = 'full' then coalesce(p_last_payment_on, v_payoff.bill_ends_on_before)
    else p_last_payment_on
  end;

  if v_end < v_bill.starts_on then
    update public.bills set ends_on = v_bill.starts_on, next_due_on = null
     where id = v_payoff.bill_id;
  else
    -- A bill this payoff stopped runs again from the next due date it took.
    -- One in the past is rolled on by the sweep, and the recorders write the
    -- instalments since, which the payoff no longer stands in for.
    update public.bills
       set ends_on = v_end,
           next_due_on = coalesce(v_bill.next_due_on, v_payoff.bill_next_due_on_before)
     where id = v_payoff.bill_id;
  end if;

  return true;
end;
$$;

revoke all on function public.delete_loan_payoff(uuid, date) from public, anon;
grant execute on function public.delete_loan_payoff(uuid, date) to authenticated;

-- --------------------------------------------------------------------------
-- update_loan: a paid-off loan stays ended through an edit
-- --------------------------------------------------------------------------

-- 20261012100002's function with one change, marked below. Without it an edit
-- of a paid-off loan would end its bill on the contract's last payment again,
-- and the recorders would write every instalment after the payoff.
create or replace function public.update_loan(
  p_bill_id           uuid,
  p_name              text,
  p_icon_id           text,
  p_principal         numeric,
  p_annual_rate       numeric,
  p_term_months       integer,
  p_monthly_payment   numeric,
  p_total_interest    numeric,
  p_first_payment_on  date,
  p_funded_on         date,
  p_day_count_basis   text,
  p_card_id           uuid,
  p_bank_account_id   uuid,
  -- Null leaves the switch as it is.
  p_in_spending       boolean,
  -- integer for the reason given in 20261012100001: an integer argument is not
  -- cast down to smallint when Postgres picks the function.
  p_payment_day       integer default null,
  p_payment_overrides jsonb default null,
  p_last_payment_on   date default null,
  -- The person's day; null reads it off their profile's timezone.
  p_today             date default null
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bill public.bills;
  v_was_first date;
  v_tz text;
  v_today date;
  v_in_spending boolean;
  v_day integer;
  v_first_month date;
  v_month date;
  v_last_month date;
  v_term_ends_on date;
  v_ends_on date;
  v_last_charged date;
  v_floor date;
  v_starts_on date;
  v_from date;
  v_next_due_on date;
  v_paid_off_on date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_term_months is null or p_term_months < 1 then
    raise exception 'a loan needs at least one payment';
  end if;

  if p_first_payment_on is null then
    raise exception 'a loan needs its first payment date';
  end if;

  if p_payment_day is not null and (p_payment_day < 1 or p_payment_day > 31) then
    raise exception 'the payment day must be between 1 and 31';
  end if;

  -- Locked, so two edits of one loan cannot interleave their reads and writes.
  select * into v_bill from public.bills where id = p_bill_id for update;
  if not found then
    raise exception 'there is no such loan' using errcode = 'P0002';
  end if;
  select l.first_payment_on into v_was_first from public.loans l where l.bill_id = p_bill_id;
  if not found then
    raise exception 'there is no such loan' using errcode = 'P0002';
  end if;

  -- Runs as the caller, so these see only the caller's own rows. The foreign
  -- keys alone would take anyone's card.
  if p_card_id is not null and not exists (select 1 from public.cards where id = p_card_id) then
    raise exception 'the card is not one of yours';
  end if;
  if p_bank_account_id is not null
     and not exists (select 1 from public.bank_accounts where id = p_bank_account_id) then
    raise exception 'the account is not one of yours';
  end if;

  v_tz := coalesce((select p.timezone from public.profiles p where p.id = v_user), 'UTC');
  v_today := coalesce(p_today, (now() at time zone v_tz)::date);
  v_in_spending := coalesce(p_in_spending, v_bill.in_spending);

  -- The term's end, exactly as save_loan works it out.
  v_day := coalesce(p_payment_day, extract(day from p_first_payment_on)::integer);
  v_first_month := date_trunc('month', p_first_payment_on)::date;
  v_last_month := (v_first_month + make_interval(months => p_term_months - 1))::date;
  v_term_ends_on := v_last_month + least(
    v_day,
    extract(day from (v_last_month + interval '1 month - 1 day'))::integer
  ) - 1;

  if p_last_payment_on is not null
     and (p_last_payment_on < p_first_payment_on or p_last_payment_on > v_term_ends_on) then
    raise exception 'the last payment must fall within the term';
  end if;

  v_ends_on := coalesce(p_last_payment_on, v_term_ends_on);

  select max(c.charged_on) into v_last_charged from public.charges c where c.bill_id = p_bill_id;

  -- greatest() skips nulls: no floor set since, no charge or no switch leaves
  -- that part out.
  v_floor := greatest(
    (v_bill.created_at at time zone v_tz)::date,
    case when v_bill.starts_on > v_was_first then v_bill.starts_on end,
    (date_trunc('month', v_last_charged) + interval '1 month')::date,
    case when v_in_spending and not v_bill.in_spending then v_today end
  );
  v_starts_on := greatest(p_first_payment_on, v_floor);

  -- The schedule's next payment from the floor or today, whichever is later:
  -- the first payment, then the payment day (clamped) of each month after it.
  -- The date the sweep would roll to, so the bill never shows a payment from
  -- before it counts as due.
  v_from := greatest(v_starts_on, v_today);
  if v_from <= p_first_payment_on then
    v_next_due_on := p_first_payment_on;
  else
    v_month := greatest(date_trunc('month', v_from)::date, (v_first_month + interval '1 month')::date);
    v_next_due_on := v_month + least(
      v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
    ) - 1;
    if v_next_due_on < v_from then
      v_month := (v_month + interval '1 month')::date;
      v_next_due_on := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
    end if;
  end if;

  if v_starts_on > v_ends_on then
    -- Nothing in the term counts: as save_loan, no next date, and starts_on on
    -- the first payment because it may not pass ends_on.
    v_starts_on := p_first_payment_on;
    v_next_due_on := null;
  elsif v_next_due_on > v_ends_on then
    -- Every payment that counts is on or before today. Anchored on the last of
    -- them rather than left without a date: the recorders skip a bill with no
    -- next date, so one that fell due since they last ran would be lost.
    v_month := date_trunc('month', v_ends_on)::date;
    v_next_due_on := v_month + least(
      v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
    ) - 1;
    if v_next_due_on > v_ends_on then
      v_month := (v_month - interval '1 month')::date;
      v_next_due_on := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
    end if;
    if v_month <= v_first_month then
      v_next_due_on := p_first_payment_on;
    end if;
    if v_next_due_on < v_starts_on then
      v_next_due_on := null;
    end if;
  end if;

  -- The change: a paid-off loan stays ended on its payoff day, or stopped
  -- when that comes before it counts (as record_loan_payoff ends it). The
  -- dates the edit gives it otherwise go to the payoff, for removing it to
  -- put back.
  select p.paid_on into v_paid_off_on
    from public.loan_payoffs p where p.bill_id = p_bill_id and p.kind = 'full';
  if found then
    update public.loan_payoffs
       set bill_ends_on_before = v_ends_on,
           bill_next_due_on_before =
             case when least(v_ends_on, v_paid_off_on) < v_starts_on then v_next_due_on end
     where bill_id = p_bill_id and kind = 'full';
    v_ends_on := least(v_ends_on, v_paid_off_on);
    if v_ends_on < v_starts_on then
      v_ends_on := v_starts_on;
      v_next_due_on := null;
    end if;
  end if;

  -- A loan's own recurrence and category: the dates above are monthly, and a
  -- loan bill the bill form moved under another category comes back.
  update public.bills
     set name            = p_name,
         amount          = p_monthly_payment,
         category_id     = 'loans',
         icon_id         = p_icon_id,
         recurrence      = 'monthly',
         next_due_on     = v_next_due_on,
         starts_on       = v_starts_on,
         ends_on         = v_ends_on,
         card_id         = p_card_id,
         bank_account_id = p_bank_account_id,
         in_spending     = v_in_spending
   where id = p_bill_id
  returning * into v_bill;

  -- The loans checks refuse a malformed payment_overrides (now against the new
  -- term) or payment_day, which rolls the bill's update back with it.
  update public.loans
     set principal         = p_principal,
         annual_rate       = p_annual_rate,
         term_months       = p_term_months,
         monthly_payment   = p_monthly_payment,
         total_interest    = p_total_interest,
         first_payment_on  = p_first_payment_on,
         funded_on         = coalesce(p_funded_on, (p_first_payment_on - interval '1 month')::date),
         day_count_basis   = coalesce(p_day_count_basis, 'actual/365'),
         payment_overrides = p_payment_overrides,
         payment_day       = p_payment_day
   where bill_id = p_bill_id;

  return v_bill;
end;
$$;

-- Replacing keeps a function's grants; restated so this file reads whole.
revoke all on function public.update_loan(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) from public, anon;

grant execute on function public.update_loan(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) to authenticated;

-- Published like the other tables the app draws from, for a build that
-- listens to it once every server has it.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loan_payoffs'
  ) then
    alter publication supabase_realtime add table public.loan_payoffs;
  end if;
end $$;

alter table public.loan_payoffs replica identity full;

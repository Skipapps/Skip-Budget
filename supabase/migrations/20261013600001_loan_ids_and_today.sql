-- 20261013600001 · A loan and a payoff are filed once; the day they are saved on is the person's
--
-- A save whose answer is lost and is tapped again filed a second loan, and a second
-- payoff (a full one then failed against loan_payoffs_one_full, so a payoff that
-- had been made read as a failure). save_loan and record_loan_payoff take the
-- app's own id for the row, one per visit, as the app's direct inserts already do:
-- the same id again returns the row the first call filed, and changes nothing.
-- Another person's id fails on the primary key and says nothing about their row.
--
-- update_loan and record_loan_payoff took the app's today as given, and it decides
-- which payments count and whether a payoff is dated after today. It is now held to
-- within a day of the person's own (person_today: profiles.timezone, UTC on a zone
-- Postgres does not know): a phone a zone away still saves, and no other day can
-- be claimed. Both also read the zone for the day the loan was added, which
-- decides what counts as spending; a zone Postgres does not know now reads as
-- UTC there too, where before it stopped the save with an error.
--
-- update_loan re-run with the same input saves the same loan, so it needs no id.
-- Its signature is unchanged, so update_loan_and_charges, which calls it by name,
-- is not recreated.
--
-- Every body is its source with only these changes: save_loan and update_loan from
-- 20261013300001 (anchor_day = v_day kept), record_loan_payoff from 20261012100003.

-- The person's own today. Security invoker: a caller reads only their own profile,
-- so anyone else's day reads as UTC.
create or replace function public.person_today(p_user uuid)
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  v_zone text := coalesce((select p.timezone from public.profiles p where p.id = p_user), 'UTC');
begin
  return (now() at time zone v_zone)::date;
exception when invalid_parameter_value then
  return (now() at time zone 'UTC')::date;
end;
$$;

comment on function public.person_today(uuid) is
  'The person''s own today: profiles.timezone, UTC when unset or unknown.';

-- A new parameter makes a new signature, and two overloads matching one call is an
-- error. Every earlier parameter keeps its name, type and default, so an app that
-- sends no id still resolves here and saves what it saved before.
drop function if exists public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date,
  boolean, integer, date
);

create or replace function public.save_loan(
  p_name                text,
  p_icon_id             text,
  p_principal           numeric,
  p_annual_rate         numeric,
  p_term_months         integer,
  p_monthly_payment     numeric,
  p_total_interest      numeric,
  p_first_payment_on    date,
  p_recurrence          public.bill_recurrence default 'monthly',
  p_card_id             uuid default null,
  p_bank_account_id     uuid default null,
  p_funded_on           date default null,
  p_day_count_basis     text default 'actual/365',
  p_statement_on        date default null,
  p_statement_principal numeric default null,
  p_payment_overrides   jsonb default null,
  p_last_payment_on     date default null,
  p_in_spending         boolean default true,
  -- integer, though the column is smallint: Postgres does not cast an integer
  -- argument down to smallint when it picks the function, so `=> 31` from SQL
  -- would find no save_loan at all.
  p_payment_day         integer default null,
  p_counts_from         date default null,
  -- The app's own id for the bill, one per visit: saving again after a lost
  -- answer returns the loan the first save filed instead of filing a second.
  p_id                  uuid default null
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bill public.bills;
  v_day integer;
  v_month date;
  v_last_month date;
  v_term_ends_on date;
  v_ends_on date;
  v_starts_on date;
  v_next_due_on date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_id is not null then
    -- Two saves of one visit at once wait here, so the second finds the first.
    perform pg_advisory_xact_lock(hashtextextended('save_loan:' || p_id::text, 0));
    select * into v_bill from public.bills where id = p_id and user_id = v_user;
    if found then
      return v_bill;
    end if;
  end if;

  if p_term_months is null or p_term_months < 1 then
    raise exception 'a loan needs at least one payment';
  end if;

  -- Refused before the term's end is worked out from it; the column's check
  -- is the backstop.
  if p_payment_day is not null and (p_payment_day < 1 or p_payment_day > 31) then
    raise exception 'the payment day must be between 1 and 31';
  end if;

  -- The term's last payment, on the payment day clamped to that month's end.
  -- Not first + (term - 1) months: from a clamped 28 Feb, Postgres keeps the
  -- 28th, which ends the bill early and refuses a valid last payment date.
  v_day := coalesce(p_payment_day, extract(day from p_first_payment_on)::integer);
  v_last_month := (date_trunc('month', p_first_payment_on)
                   + make_interval(months => p_term_months - 1))::date;
  v_term_ends_on := v_last_month + least(
    v_day,
    extract(day from (v_last_month + interval '1 month - 1 day'))::integer
  ) - 1;

  if p_last_payment_on is not null
     and (p_last_payment_on < p_first_payment_on or p_last_payment_on > v_term_ends_on) then
    raise exception 'the last payment must fall within the term';
  end if;

  v_ends_on := coalesce(p_last_payment_on, v_term_ends_on);
  v_starts_on := greatest(p_first_payment_on, coalesce(p_counts_from, p_first_payment_on));
  v_next_due_on := p_first_payment_on;

  if v_starts_on > v_ends_on then
    -- Every payment was made before the loan was added: none of them counts and
    -- none is still to come, so the bill has no next date (as a stopped bill).
    -- starts_on stays the first payment, because it may not pass ends_on.
    v_starts_on := p_first_payment_on;
    v_next_due_on := null;
  elsif v_starts_on > p_first_payment_on and p_recurrence = 'monthly' then
    -- The next payment from the floor on, rather than the first one for the
    -- sweep to roll later. Until then the bill would show a payment made years
    -- ago as due, and editing the bill saves the date it shows as its floor,
    -- which would write every earlier payment as spending. Computed here, not
    -- with plan_occurrences: that is the scheduler's alone, and this runs as
    -- the caller.
    v_month := date_trunc('month', v_starts_on)::date;
    v_next_due_on := v_month + least(
      v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
    ) - 1;
    if v_next_due_on < v_starts_on then
      v_month := (v_month + interval '1 month')::date;
      v_next_due_on := v_month + least(
        v_day, extract(day from (v_month + interval '1 month - 1 day'))::integer
      ) - 1;
    end if;
    -- A last payment off the payment day can leave none after the floor.
    if v_next_due_on > v_ends_on then
      v_next_due_on := null;
    end if;
  end if;

  insert into public.bills (
    id, user_id, name, amount, category_id, icon_id,
    recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id,
    anchor_day,
    in_spending
  )
  values (
    coalesce(p_id, gen_random_uuid()), v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
    p_recurrence, v_next_due_on, v_starts_on, v_ends_on,
    p_card_id, p_bank_account_id,
    v_day,
    coalesce(p_in_spending, true)
  )
  returning * into v_bill;

  -- The loans checks refuse a malformed payment_overrides or payment_day,
  -- which rolls the bill back with it: neither is saved.
  insert into public.loans (
    user_id, bill_id, principal, annual_rate, term_months,
    monthly_payment, total_interest, first_payment_on,
    funded_on, day_count_basis, statement_on, statement_principal,
    payment_overrides, payment_day
  )
  values (
    v_user, v_bill.id, p_principal, p_annual_rate, p_term_months,
    p_monthly_payment, p_total_interest, p_first_payment_on,
    -- Default the opening period to a month when the caller does not say.
    coalesce(p_funded_on, (p_first_payment_on - interval '1 month')::date),
    coalesce(p_day_count_basis, 'actual/365'),
    p_statement_on, p_statement_principal,
    p_payment_overrides, p_payment_day
  );

  return v_bill;
end;
$$;

-- A dropped function takes its grants with it, and a new one is executable by
-- PUBLIC by default.
revoke all on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date,
  boolean, integer, date,
  uuid
) from public, anon;

grant execute on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date,
  boolean, integer, date,
  uuid
) to authenticated;

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
  v_profile_today date;
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
  -- A day the app sends is held to within one of the person's own: a phone a zone
  -- away still saves, and no other day can be claimed.
  v_profile_today := public.person_today(v_user);
  v_today := least(greatest(coalesce(p_today, v_profile_today), v_profile_today - 1), v_profile_today + 1);
  -- The zone also reads the day the loan was added; one Postgres does not know reads as UTC.
  begin
    perform now() at time zone v_tz;
  exception when invalid_parameter_value then
    v_tz := 'UTC';
  end;
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
         anchor_day      = v_day,
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

drop function if exists public.record_loan_payoff(uuid, date, numeric, text, uuid, uuid, date, date);

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
  p_today           date default null,
  -- The app's own id for the payoff, one per visit: recording it again after a
  -- lost answer returns the first, and changes no date of the bill.
  p_id              uuid default null
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
  v_profile_today date;
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

  -- After the bill's lock, so a repeat racing the first waits for it and finds it.
  if p_id is not null then
    select * into v_payoff from public.loan_payoffs where id = p_id and user_id = v_user;
    if found then
      return v_payoff;
    end if;
  end if;

  v_tz := coalesce((select p.timezone from public.profiles p where p.id = v_user), 'UTC');
  -- A day the app sends is held to within one of the person's own: a phone a zone
  -- away still saves, and no other day can be claimed.
  v_profile_today := public.person_today(v_user);
  v_today := least(greatest(coalesce(p_today, v_profile_today), v_profile_today - 1), v_profile_today + 1);
  -- The zone also reads the day the loan was added; one Postgres does not know reads as UTC.
  begin
    perform now() at time zone v_tz;
  exception when invalid_parameter_value then
    v_tz := 'UTC';
  end;

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
    id, user_id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted,
    bill_ends_on_before, bill_next_due_on_before
  )
  values (
    coalesce(p_id, gen_random_uuid()), v_user, p_bill_id, p_paid_on, p_amount, p_kind, p_card_id, p_bank_account_id,
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

revoke all on function public.record_loan_payoff(uuid, date, numeric, text, uuid, uuid, date, date, uuid)
  from public, anon;
grant execute on function public.record_loan_payoff(uuid, date, numeric, text, uuid, uuid, date, date, uuid)
  to authenticated;

-- 20261012100002 · Edit a saved loan in place
--
-- The loan and its bill are rewritten together, keeping the bill's id, so its
-- recorded charges, its reminder and everything that links to it stay. Not
-- save_loan, which would file a second bill and leave the history on the
-- first; and not a bill update then a loans update, which could half-write.
--
-- The edit replaces the contract: name, type, figures, dates, payment day,
-- changed payments, last payment, paid from and "Add to monthly bills". The
-- statement balance (statement_on, statement_principal) is not on the edit
-- page and stays as stored.
--
-- What counts as spending after an edit, by the rules of 20261012100001:
-- - Never a payment from before the day the loan was added, in the person's
--   own day, so moving the dates or the payment day earlier cannot back-fill.
-- - Never from before a floor set since. The bill's starts_on is one when it
--   is later than the loan's first payment: save_loan's count floor, a switch
--   back on, or the month after a charge. When it is the first payment it is
--   no floor (a loan added before its first payment, or with every payment
--   behind it), and taking it as one would stop a first payment moved earlier
--   from ever counting, even one still to come.
-- - Never in a month already charged, so moving the payment day cannot charge
--   a month twice or project a payment for it.
-- - Switched back on, it counts from the person's today: nothing was recorded
--   while it was off, and that stretch is not filled in afterwards.
-- - Switched off, it keeps what it recorded and records nothing new.

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

-- A new function is executable by PUBLIC by default. As save_loan, only
-- signed-in people may call it; the loans checks it trips need no new grant.
revoke all on function public.update_loan(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) from public, anon;

grant execute on function public.update_loan(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) to authenticated;

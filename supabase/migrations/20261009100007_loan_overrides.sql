-- 20261009100007 · A saved loan keeps the payments the person changed
--
-- Before saving, the person can type the bank's monthly payment and change any
-- single payment on the schedule (the bank's odd first payment, a bigger one).
--
-- The monthly payment already has a home: monthly_payment is the contract
-- payment (0014), and the app passes the typed one through it. The single
-- changes are new. payment_overrides holds them as
-- {"<payment number>": amount}, e.g. {"1": 612.40, "14": 1000}. jsonb keeps
-- numbers as exact numerics, so no cent is lost on the way in or out. Null
-- means nothing was changed.
--
-- The check refuses what the app never writes: a key that is not a payment
-- number below the term (the term's last payment is always what is left), or
-- an amount that is not a positive number of whole cents within numeric(14,2).
-- Whether a change covers its period's interest depends on the whole schedule,
-- so the app decides that (src/lib/loan-overrides.ts).
--
-- A higher or changed payment can pay the loan off before the term, so
-- save_loan also takes the last payment's date. Without it the bill would keep
-- coming due after the loan is paid. It must fall between the first payment
-- and the term's last; null keeps the term's last, as before.
--
-- Additive: both new parameters default to null, so an app that does not send
-- them still resolves to this function and saves exactly what it saved before.

alter table public.loans
  add column if not exists payment_overrides jsonb;

comment on column public.loans.payment_overrides is
  'Payments the person changed, {"<payment number>": amount}. Null: none.';

create or replace function public.loan_payment_overrides_valid(
  p_overrides   jsonb,
  p_term_months integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_overrides is null or (
    jsonb_typeof(p_overrides) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_overrides) as change(number, amount)
      -- CASE, because OR does not promise to test the shape before the cast.
      where case
        when change.number !~ '^[1-9][0-9]{0,4}$' then true
        when change.number::integer >= p_term_months then true
        when jsonb_typeof(change.amount) <> 'number' then true
        when change.amount::numeric <= 0 then true
        when change.amount::numeric > 999999999999.99 then true
        when change.amount::numeric <> round(change.amount::numeric, 2) then true
        else false
      end
    )
  );
$$;

-- A CHECK calls its function with the inserting role's own EXECUTE right, and
-- save_loan inserts as the caller. New public functions are not granted by
-- default, so without these every loan save would fail with "permission
-- denied". Nobody else needs to call it.
revoke all on function public.loan_payment_overrides_valid(jsonb, integer) from public, anon;
grant execute on function public.loan_payment_overrides_valid(jsonb, integer)
  to authenticated, service_role;

do $$ begin
  alter table public.loans
    add constraint loans_payment_overrides_valid
    check (public.loan_payment_overrides_valid(payment_overrides, term_months));
exception when duplicate_object then null;
end $$;

-- Dropped and recreated rather than replaced, as in 0014: new parameters make a
-- new signature, and two overloads matching one call is an error. The body
-- carries forward 0014's whole: the auth check, the term check, the funding
-- default and the basis default.
drop function if exists public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric
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
  p_last_payment_on     date default null
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bill public.bills;
  v_term_ends_on date;
  v_ends_on date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_term_months is null or p_term_months < 1 then
    raise exception 'a loan needs at least one payment';
  end if;

  -- The term's last payment falls term_months - 1 months after the first,
  -- because the first payment is itself one of them.
  v_term_ends_on := (p_first_payment_on + make_interval(months => p_term_months - 1))::date;

  if p_last_payment_on is not null
     and (p_last_payment_on < p_first_payment_on or p_last_payment_on > v_term_ends_on) then
    raise exception 'the last payment must fall within the term';
  end if;

  v_ends_on := coalesce(p_last_payment_on, v_term_ends_on);

  insert into public.bills (
    user_id, name, amount, category_id, icon_id,
    recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id
  )
  values (
    v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
    p_recurrence, p_first_payment_on, p_first_payment_on, v_ends_on,
    p_card_id, p_bank_account_id
  )
  returning * into v_bill;

  -- The loans check refuses a malformed payment_overrides, which rolls the bill
  -- back with it: neither is saved.
  insert into public.loans (
    user_id, bill_id, principal, annual_rate, term_months,
    monthly_payment, total_interest, first_payment_on,
    funded_on, day_count_basis, statement_on, statement_principal,
    payment_overrides
  )
  values (
    v_user, v_bill.id, p_principal, p_annual_rate, p_term_months,
    p_monthly_payment, p_total_interest, p_first_payment_on,
    -- Default the opening period to a month when the caller does not say.
    coalesce(p_funded_on, (p_first_payment_on - interval '1 month')::date),
    coalesce(p_day_count_basis, 'actual/365'),
    p_statement_on, p_statement_principal,
    p_payment_overrides
  );

  return v_bill;
end;
$$;

-- A dropped function takes its grants with it, and a fresh one is executable by
-- PUBLIC by default, so these restore 0014's hardening for the new signature.
revoke all on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date
) from public, anon;

grant execute on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date
) to authenticated;

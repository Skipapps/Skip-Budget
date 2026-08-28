-- 0015 · Give a saved loan an end date
--
-- save_loan (0005) creates the bill and its loan detail in one transaction,
-- which is right — two round trips could leave a bill with no loan attached.
-- What it never set was ends_on, so a five-year loan looked like a bill that
-- repeats forever: correct on the bills list, wrong anywhere that projects
-- forward or asks when the debt is clear.
--
-- The last payment falls term_months - 1 months after the first, because the
-- first payment is itself one of them. A 60-payment loan starting 27 Aug 2026
-- ends 27 Jul 2031, not 27 Aug 2031.

create or replace function public.save_loan(
  p_name             text,
  p_icon_id          text,
  p_principal        numeric,
  p_annual_rate      numeric,
  p_term_months      integer,
  p_monthly_payment  numeric,
  p_total_interest   numeric,
  p_first_payment_on date,
  p_recurrence       public.bill_recurrence default 'monthly',
  p_card_id          uuid default null,
  p_bank_account_id  uuid default null
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bill public.bills;
  v_ends_on date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_term_months is null or p_term_months < 1 then
    raise exception 'a loan needs at least one payment';
  end if;

  v_ends_on := (p_first_payment_on + make_interval(months => p_term_months - 1))::date;

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

  insert into public.loans (
    user_id, bill_id, principal, annual_rate, term_months,
    monthly_payment, total_interest, first_payment_on
  )
  values (
    v_user, v_bill.id, p_principal, p_annual_rate, p_term_months,
    p_monthly_payment, p_total_interest, p_first_payment_on
  );

  return v_bill;
end;
$$;

-- security invoker, so RLS still decides what the caller may write — but there
-- is no reason for an unauthenticated role to reach the body at all.
revoke all on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid
) from public, anon;

grant execute on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid
) to authenticated;

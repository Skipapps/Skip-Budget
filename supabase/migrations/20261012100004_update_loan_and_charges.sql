-- 20261012100004 · Edit a loan and the payments already recorded, together
--
-- "Past and upcoming" on a loan edit. The loan is saved exactly as
-- update_loan saves it, then every charge already recorded for its bill takes
-- the name, monthly payment and paid from the bill now has. One transaction:
-- two calls from the phone could leave the loan edited and its past not, with
-- nothing on screen to say so. "Upcoming only" stays plain update_loan.
--
-- update_loan is called, not copied or changed. The values are read back from
-- the bill after it, so each charge holds what the recorders would have copied
-- on its day (record_due_charges: the name, or 'Bill' when it is empty). A
-- charge's date is the day the money moved and is never touched. Payoffs are
-- not charges: they keep their own amount, source and date.
--
-- Any refusal from update_loan, or a failure in the rewrite, undoes the whole
-- call. Rewriting fires no push: the scheduler announces only charges it
-- inserts.

create or replace function public.update_loan_and_charges(
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
  p_in_spending       boolean,
  p_payment_day       integer default null,
  p_payment_overrides jsonb default null,
  p_last_payment_on   date default null,
  p_today             date default null
)
returns public.bills
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_bill public.bills;
begin
  perform public.update_loan(
    p_bill_id           => p_bill_id,
    p_name              => p_name,
    p_icon_id           => p_icon_id,
    p_principal         => p_principal,
    p_annual_rate       => p_annual_rate,
    p_term_months       => p_term_months,
    p_monthly_payment   => p_monthly_payment,
    p_total_interest    => p_total_interest,
    p_first_payment_on  => p_first_payment_on,
    p_funded_on         => p_funded_on,
    p_day_count_basis   => p_day_count_basis,
    p_card_id           => p_card_id,
    p_bank_account_id   => p_bank_account_id,
    p_in_spending       => p_in_spending,
    p_payment_day       => p_payment_day,
    p_payment_overrides => p_payment_overrides,
    p_last_payment_on   => p_last_payment_on,
    p_today             => p_today
  );

  -- update_loan holds this row locked until the end of the call.
  select * into strict v_bill from public.bills where id = p_bill_id;

  -- As the caller: row security keeps it to the caller's own charges, even
  -- one someone else filed under this bill's id.
  update public.charges
     set label           = coalesce(nullif(v_bill.name, ''), 'Bill'),
         amount          = v_bill.amount,
         card_id         = v_bill.card_id,
         bank_account_id = v_bill.bank_account_id
   where bill_id = p_bill_id;

  return v_bill;
end;
$$;

-- A new function is executable by PUBLIC by default. As update_loan, only
-- signed-in people may call it.
revoke all on function public.update_loan_and_charges(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) from public, anon;

grant execute on function public.update_loan_and_charges(
  uuid, text, text, numeric, numeric, integer, numeric, numeric, date, date, text,
  uuid, uuid, boolean, integer, jsonb, date, date
) to authenticated;

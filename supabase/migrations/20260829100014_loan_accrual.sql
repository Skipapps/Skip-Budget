-- 0014 · How a loan actually accrues
--
-- A loan was stored as principal, rate and term, and everything else was
-- rederived from those three with the textbook "APR ÷ 12" formula. Real
-- lenders do not charge that way: US installment loans accrue interest daily
-- on the outstanding balance, so a 31-day month costs more than a 28-day one,
-- and the gap between the money landing and the first payment is rarely one
-- month at all. Rebuilt from three columns, a schedule cannot help but
-- disagree with the statement it is meant to mirror.
--
-- These columns hold the parts that were missing:
--
--   funded_on          when interest started running, which sets the length of
--                      the opening period — 45 days is common, 30 is assumed
--   day_count_basis    the convention the lender charges under
--   monthly_payment    now the CONTRACT payment, not a derived one; lenders
--                      round the solved figure by their own house rules and a
--                      cent of difference rides the balance for the whole term
--   statement_*        a balance read off a statement, and when it was true
--
-- The statement anchor is the one that makes the app exact rather than merely
-- close. Payments land early and late, and under daily accrual each nudge
-- permanently shifts the balance — so a schedule reconstructed from
-- origination drifts, and no amount of better maths fixes that. Pinning it to
-- a figure the user can read off their lender makes everything from that date
-- forward correct, and marks the past as the estimate it always was.

alter table public.loans
  add column if not exists funded_on           date,
  add column if not exists day_count_basis     text not null default 'actual/365',
  add column if not exists statement_on        date,
  add column if not exists statement_principal numeric(14,2);

alter table public.loans
  drop constraint if exists loans_day_count_basis_check;
alter table public.loans
  add constraint loans_day_count_basis_check
  check (day_count_basis in ('actual/365', 'actual/360', '30/360'));

-- A balance is only meaningful with a date attached, and vice versa.
alter table public.loans
  drop constraint if exists loans_statement_paired_check;
alter table public.loans
  add constraint loans_statement_paired_check
  check ((statement_on is null) = (statement_principal is null));

alter table public.loans
  drop constraint if exists loans_statement_principal_check;
alter table public.loans
  add constraint loans_statement_principal_check
  check (statement_principal is null or statement_principal >= 0);

-- Every row that exists right now predates the daily-accrual engine and was
-- saved on the flat monthly model, so it is pinned to the convention that
-- model implements. New loans get the 'actual/365' default instead. This is
-- deliberately unconditional: leaving any old row on the new default would
-- silently reprice a loan someone has already filed and checked.
--
-- funded_on is left null where there is no first payment to count back from —
-- the app treats that the same way it treats a missing schedule.
update public.loans
   set day_count_basis = '30/360',
       funded_on = coalesce(funded_on, (first_payment_on - interval '1 month')::date);

-- Dropped and recreated rather than replaced. Adding parameters makes a new
-- signature rather than replacing the old one, and the two would then both
-- match an eleven-argument call — Postgres refuses that as ambiguous instead of
-- picking one, so every existing caller would start erroring.
--
-- The body carries forward what 0015 added: a term check, and the ends_on that
-- stops a five-year loan looking like a bill that repeats forever. Rebuilding
-- from 0005 instead would quietly revert it.
drop function if exists public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid
);

create function public.save_loan(
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
  p_statement_principal numeric default null
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

  -- The last payment falls term_months - 1 months after the first, because the
  -- first payment is itself one of them.
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
    monthly_payment, total_interest, first_payment_on,
    funded_on, day_count_basis, statement_on, statement_principal
  )
  values (
    v_user, v_bill.id, p_principal, p_annual_rate, p_term_months,
    p_monthly_payment, p_total_interest, p_first_payment_on,
    -- Default the opening period to a month when the caller does not say.
    coalesce(p_funded_on, (p_first_payment_on - interval '1 month')::date),
    coalesce(p_day_count_basis, 'actual/365'),
    p_statement_on, p_statement_principal
  );

  return v_bill;
end;
$$;

-- A dropped function takes its grants with it, and a fresh one is executable by
-- PUBLIC by default — so these are not boilerplate. Without them the drop above
-- would quietly undo the hardening in 0007 and 0015 and hand anon the function.
revoke all on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric
) from public, anon;

grant execute on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric
) to authenticated;

-- 0005 · Loans
--
-- Saving from the loan calculator creates a bill under the 'loans' category, so
-- there is exactly one place to edit or delete it. This table holds the parts a
-- bill row cannot express — rate, term, interest — and hangs off that bill.
--
-- ON DELETE CASCADE is the point: deleting the bill from the bills page removes
-- the loan detail with it, so no orphan can outlive what the user deleted.

create table if not exists public.loans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  bill_id          uuid not null unique references public.bills (id) on delete cascade,
  principal        numeric(14,2) not null check (principal >= 0),
  annual_rate      numeric(6,3)  not null check (annual_rate >= 0 and annual_rate <= 100),
  term_months      integer       not null check (term_months > 0),
  monthly_payment  numeric(14,2) not null check (monthly_payment >= 0),
  total_interest   numeric(14,2) not null check (total_interest >= 0),
  first_payment_on date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists loans_user_id_idx on public.loans (user_id);

alter table public.loans enable row level security;

drop policy if exists "loans_all_own" on public.loans;
create policy "loans_all_own" on public.loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();

-- One call from the app: create the bill and its loan detail together, or
-- neither. Two round trips could leave a bill with no loan attached.
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
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.bills (
    user_id, name, amount, category_id, icon_id,
    recurrence, next_due_on, starts_on, card_id, bank_account_id
  )
  values (
    v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
    p_recurrence, p_first_payment_on, p_first_payment_on, p_card_id, p_bank_account_id
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

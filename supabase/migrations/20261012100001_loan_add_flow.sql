-- 20261012100001 · Add a loan: "Add to monthly bills", the payment day, and counting from today
--
-- A loan can be kept out of monthly spending. bills.in_spending is the switch,
-- on the bill because spending is counted per bill. Off, the bill records
-- nothing new and projects nothing; charges already recorded stay counted,
-- because that money went out. The loan keeps its Loans page entry, its own
-- page and its reminder either way.
--
-- loans.payment_day is the day of the month payments fall on. Without it the
-- day is read off the first payment, which is wrong once that was clamped:
-- day 31 first paid on 28 Feb would put every later payment on the 28th, and
-- the interest days with it. Null keeps the first payment's day, as before.
--
-- A loan added after payments were already made counts from the day it was
-- added (p_counts_from, the person's today). The bill's starts_on is the floor
-- both recorders and the app read from, so earlier payments are never written
-- as spending, and its next_due_on is the next payment from then on. The
-- schedule on the Loans page still shows the earlier ones as paid.
--
-- reminders_due also stops reminding about bills that have ended. The sweep
-- rolls next_due_on forward past ends_on, so a finished loan, or any bill with
-- an end date, kept sending "Due in 3 days" every month.

alter table public.bills
  add column if not exists in_spending boolean not null default true;

comment on column public.bills.in_spending is
  'Counts toward monthly spending. Off: nothing new is recorded or projected; recorded charges stay counted.';

alter table public.loans
  add column if not exists payment_day smallint check (payment_day between 1 and 31);

comment on column public.loans.payment_day is
  'Day of the month payments fall on, clamped to short months. Null: the first payment''s day.';

-- Dropped and recreated, as in 0007: new parameters make a new signature, and
-- two overloads matching one call is an error. Every earlier parameter keeps
-- its name, type and default, so an app that sends none of the new ones still
-- resolves here and saves what it saved before.
drop function if exists public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date
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
  p_counts_from         date default null
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
    user_id, name, amount, category_id, icon_id,
    recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id,
    in_spending
  )
  values (
    v_user, p_name, p_monthly_payment, 'loans', p_icon_id,
    p_recurrence, v_next_due_on, v_starts_on, v_ends_on,
    p_card_id, p_bank_account_id,
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

-- A dropped function takes its grants with it, and a fresh one is executable
-- by PUBLIC by default, so these restore 0014's hardening for the new
-- signature. The payment_day check is an expression, not a function, so it
-- needs no grant; 0007's grant on loan_payment_overrides_valid still stands.
revoke all on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date,
  boolean, integer, date
) from public, anon;

grant execute on function public.save_loan(
  text, text, numeric, numeric, integer, numeric, numeric, date,
  public.bill_recurrence, uuid, uuid, date, text, date, numeric, jsonb, date,
  boolean, integer, date
) to authenticated;

-- 0030's recorder, with one change: a bill kept out of spending is skipped.
create or replace function public.record_due_charges()
returns table (
  user_id     uuid,
  label       text,
  amount      numeric,
  charged_on  date
)
language sql
security definer
set search_path = public
as $$
  with today_by_user as (
    select p.id as uid, (now() at time zone coalesce(p.timezone, 'UTC'))::date as today
    from public.profiles p
  ),
  plans as (
    select
      b.user_id, b.id as bill_id, null::uuid as subscription_id,
      coalesce(nullif(b.name, ''), 'Bill') as label, b.amount,
      b.recurrence::text as recurrence, b.next_due_on as anchor,
      -- The same floor the screens read with: the plan's own start when it has
      -- one, and the day the row was made when it does not. Without it a bill
      -- added today back-fills every month behind it.
      coalesce(b.starts_on, b.created_at::date) as floor_on,
      b.ends_on, b.card_id, b.bank_account_id, t.today
    from public.bills b
    join today_by_user t on t.uid = b.user_id
    where b.next_due_on is not null
      and b.in_spending

    union all

    select
      s.user_id, null::uuid, s.id,
      coalesce(nullif(s.name, ''), 'Subscription'), s.amount,
      s.cycle::text, s.next_renewal_on,
      coalesce(s.started_on, s.created_at::date),
      null::date, s.card_id, s.bank_account_id, t.today
    from public.subscriptions s
    join today_by_user t on t.uid = s.user_id
    where s.active and s.next_renewal_on is not null
  ),
  due as (
    select p.*, o.d as occurred_on
    from plans p
    cross join lateral public.plan_occurrences(
      p.anchor,
      p.recurrence,
      p.floor_on,
      -- Never past today, and never past the day the plan stopped.
      least(p.today, coalesce(p.ends_on, p.today))
    ) o(d)
    where p.floor_on is not null
  ),
  written as (
    insert into public.charges (
      user_id, bill_id, subscription_id, label, amount, charged_on,
      card_id, bank_account_id
    )
    select
      d.user_id, d.bill_id, d.subscription_id, d.label, d.amount, d.occurred_on,
      d.card_id, d.bank_account_id
    from due d
    -- The expected outcome, not an exceptional one: the phone may have
    -- recorded the same day a moment earlier.
    on conflict do nothing
    returning charges.user_id, charges.label, charges.amount, charges.charged_on
  )
  select * from written;
$$;

-- 0027's reminders, with one change: a bill's due date is gone once it has
-- rolled past the bill's end.
create or replace function public.reminders_due()
returns table (
  reminder_id uuid,
  user_id     uuid,
  local_date  date,
  title       text,
  body        text
)
language sql
security definer
set search_path = public
as $$
  with ctx as (
    select
      r.id as reminder_id,
      r.user_id,
      r.lead_days,
      r.remind_at,
      r.last_sent_on,
      (now() at time zone coalesce(p.timezone, 'UTC'))::date as local_date,
      (now() at time zone coalesce(p.timezone, 'UTC'))::time as local_time,
      coalesce(b.name, s.name, c.holder, a.nickname, a.bank_name, 'Skip') as label,
      coalesce(b.amount, s.amount) as amount,
      case
        when r.bill_id is not null then case
          when b.next_due_on > b.ends_on then null
          else b.next_due_on
        end
        when r.subscription_id is not null then s.next_renewal_on
        when r.card_id is not null         then public.next_month_day(
          c.bill_due_day, (now() at time zone coalesce(p.timezone, 'UTC'))::date)
        else (
          select min(public.next_payday(
            sal.last_payday, sal.frequency,
            (now() at time zone coalesce(p.timezone, 'UTC'))::date))
          from public.salary_source_accounts ssa
          join public.salary_sources sal on sal.id = ssa.salary_source_id
          where ssa.bank_account_id = r.bank_account_id
        )
      end as due_on,
      case
        when r.bill_id is not null         then 'bill'
        when r.subscription_id is not null then 'subscription'
        when r.card_id is not null         then 'card'
        else 'account'
      end as kind
    from public.reminders r
    join public.profiles p on p.id = r.user_id
    left join public.bills b         on b.id = r.bill_id
    left join public.subscriptions s on s.id = r.subscription_id and s.active
    left join public.cards c         on c.id = r.card_id
    left join public.bank_accounts a on a.id = r.bank_account_id
    where r.enabled
  )
  select
    ctx.reminder_id,
    ctx.user_id,
    ctx.local_date,
    case when ctx.kind = 'account' then 'Payday' else ctx.label end as title,
    case ctx.kind
      when 'account' then 'Your pay lands ' || public.when_words(ctx.due_on - ctx.local_date)
      when 'card'    then 'Payment due ' || public.when_words(ctx.due_on - ctx.local_date)
      when 'subscription' then 'Renews ' || public.when_words(ctx.due_on - ctx.local_date)
        || coalesce(' · $' || to_char(ctx.amount, 'FM999,999,990.00'), '')
      else 'Due ' || public.when_words(ctx.due_on - ctx.local_date)
        || coalesce(' · $' || to_char(ctx.amount, 'FM999,999,990.00'), '')
    end as body
  from ctx
  where ctx.due_on is not null
    -- The day it fires is the due date brought forward by the lead.
    and ctx.due_on - ctx.lead_days = ctx.local_date
    and ctx.remind_at <= ctx.local_time
    and (ctx.last_sent_on is null or ctx.last_sent_on <> ctx.local_date);
$$;

-- Replacing keeps a function's grants; restated so this file reads whole.
revoke all on function public.record_due_charges() from public, anon, authenticated;
revoke all on function public.reminders_due() from public, anon, authenticated;

-- Unused by the app, kept in step with it.
create or replace view public.v_monthly_expenses
with (security_invoker = true) as
  select
    user_id,
    round(coalesce(sum(public.monthly_from_bill(amount, recurrence)), 0), 2) as monthly_expenses
  from public.bills
  -- A fixed-period bill only counts while it is actually running.
  where (starts_on is null or starts_on <= current_date)
    and (ends_on   is null or ends_on   >= current_date)
    and in_spending
  group by user_id;

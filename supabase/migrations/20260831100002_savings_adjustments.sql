-- 0002 · Correcting a month
--
-- monthly_savings was computed and nothing else: no insert policy, no update
-- policy, rows written only by the closing function. That is defensible for a
-- figure derived from a complete ledger and wrong for this one, because the
-- ledger is not complete. A bill paid in cash, a receipt never scanned, a
-- subscription the app does not know about — every one of them makes a month
-- look better than it was, and there was no way to say so.
--
-- So a month now carries two things: what the app worked out, and what the
-- person says actually happened. Both are kept. Overwriting the computed
-- figures with a correction would throw away the only thing that can explain
-- the number later, and the sentence under each month — "$4,200 came in,
-- $3,360 went out" — is the reason anybody trusts the total at all.
--
-- Excluding rather than deleting, for a plain reason: closing recreates any
-- month it can compute, so a deleted row would reappear the next time the page
-- was opened. A flag survives that, and can be undone.

alter table public.monthly_savings
  -- What the person says the month really left. Null means use the computed figure.
  add column if not exists adjusted_saved numeric(14,2),
  -- Why it was corrected. Shown under the month, so a number nobody remembers
  -- changing can still explain itself.
  add column if not exists note           text,
  add column if not exists excluded_at    timestamptz;

alter table public.monthly_savings
  drop constraint if exists monthly_savings_note_length;
alter table public.monthly_savings
  add constraint monthly_savings_note_length
  check (note is null or length(note) <= 200);

-- --------------------------------------------------------------------------

/*
 * Close every finished month in one statement.
 *
 * Was a loop that ran three aggregates per month, up to twenty-four times,
 * every time the page opened. This does the same work as one pass.
 *
 * The conflict clause is the part that matters now: it updates only the
 * computed columns. A correction, a note and an exclusion are the person's,
 * and recomputing a month must never quietly undo them — which the old
 * upsert would have done on the very next page open.
 */
create or replace function public.close_savings_for(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_income numeric(14,2);
  v_first  date;
  v_count  integer;
begin
  select round(coalesce(sum(public.monthly_from_salary(amount, frequency)), 0), 2)
    into v_income
    from public.salary_sources
   where user_id = p_user;

  select least(
           coalesce((select min(charged_on)   from public.charges  where user_id = p_user), current_date),
           coalesce((select min(purchased_on) from public.receipts where user_id = p_user), current_date)
         )
    into v_first;

  with months as (
    select generate_series(
             greatest(
               date_trunc('month', v_first),
               date_trunc('month', current_date) - interval '24 months'
             ),
             -- Strictly before this month: a month still running has charges
             -- yet to come, and closing it early records a saving the rest of
             -- the month then spends.
             date_trunc('month', current_date) - interval '1 month',
             interval '1 month'
           )::date as month
  ),
  spend as (
    select date_trunc('month', charged_on)::date as month, sum(amount) as amount
      from public.charges where user_id = p_user
     group by 1
    union all
    select date_trunc('month', purchased_on)::date, sum(amount)
      from public.receipts where user_id = p_user
     group by 1
  ),
  totals as (
    select m.month, round(coalesce(sum(s.amount), 0), 2) as spent
      from months m
      left join spend s on s.month = m.month
     group by m.month
  )
  insert into public.monthly_savings (user_id, month, income, spent, saved, closed_at)
  select p_user, t.month, v_income, t.spent, round(v_income - t.spent, 2), now()
    from totals t
  on conflict (user_id, month) do update
    set income    = excluded.income,
        spent     = excluded.spent,
        saved     = excluded.saved,
        closed_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- --------------------------------------------------------------------------

/*
 * Say what a month really left.
 *
 * Passing null clears the correction and puts the month back on what the app
 * worked out — which is what somebody wants after adding the bill they had
 * missed, rather than having to remember the original figure themselves.
 */
create or replace function public.adjust_savings_month(
  p_month  date,
  p_amount numeric default null,
  p_note   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  update public.monthly_savings
     set adjusted_saved = p_amount,
         note           = nullif(btrim(coalesce(p_note, '')), '')
   where user_id = v_user and month = v_month;

  if not found then
    raise exception 'That month is not on your savings yet.';
  end if;
end;
$$;

/* Take a month out of the total, or put it back. */
create or replace function public.exclude_savings_month(p_month date, p_excluded boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  update public.monthly_savings
     set excluded_at = case when p_excluded then now() else null end
   where user_id = v_user and month = v_month;

  if not found then
    raise exception 'That month is not on your savings yet.';
  end if;
end;
$$;

revoke all on function public.adjust_savings_month(date, numeric, text) from public, anon;
revoke all on function public.exclude_savings_month(date, boolean) from public, anon;
grant execute on function public.adjust_savings_month(date, numeric, text) to authenticated;
grant execute on function public.exclude_savings_month(date, boolean) to authenticated;

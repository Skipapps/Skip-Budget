-- 0011 · One charge per cycle, whoever writes it
--
-- Two recorders write charges — the app on every open and record_due_charges()
-- on the quarter-hour — and both match what is already recorded by exact date.
-- charges_bill_once / charges_subscription_once stop the same date twice, but
-- not the same month twice: move a charged rent from the 28th to the 1st and
-- the 1st looked like a September nobody had recorded, so September got two
-- rents (and a push for the second). Newer app builds move a plan's start past
-- its last charge when the date is edited; older builds on people's phones do
-- not, and neither recorder would have noticed.
--
-- So the rule lives here, under every writer: a plan is charged at most once
-- per cycle of its own recurrence — calendar week (Monday first, as the app
-- counts it), month, quarter or year. A second charge in a cycle already
-- charged is dropped rather than refused, the way the unique indexes are met
-- with "on conflict do nothing": the recorders are catch-up loops, and an
-- error would stop the rest of a user's charges from being written.
--
-- A bill that runs for a set period has no cycle to compare, and is left as it
-- was. Existing duplicates are not touched: a charge is a record of money, and
-- removing one is a decision about one person's data, not a schema change.

create or replace function public.charges_one_per_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  every text;
begin
  if new.bill_id is not null then
    select b.recurrence into every from public.bills b where b.id = new.bill_id;
  else
    select s.cycle into every from public.subscriptions s where s.id = new.subscription_id;
  end if;

  every := case every
    when 'weekly' then 'week'
    when 'monthly' then 'month'
    when 'quarterly' then 'quarter'
    when 'yearly' then 'year'
  end;
  if every is null then
    return new;
  end if;

  if exists (
    select 1
    from public.charges c
    where c.id <> new.id
      and (
        (new.bill_id is not null and c.bill_id = new.bill_id)
        or (new.subscription_id is not null and c.subscription_id = new.subscription_id)
      )
      and date_trunc(every, c.charged_on) = date_trunc(every, new.charged_on)
  ) then
    return null;
  end if;

  return new;
end;
$$;

comment on function public.charges_one_per_cycle() is
  'Drops a second charge for the same bill or subscription within one cycle of '
  'its recurrence (week, month, quarter, year), whichever recorder writes it.';

drop trigger if exists charges_one_per_cycle on public.charges;
create trigger charges_one_per_cycle
  before insert on public.charges
  for each row execute function public.charges_one_per_cycle();

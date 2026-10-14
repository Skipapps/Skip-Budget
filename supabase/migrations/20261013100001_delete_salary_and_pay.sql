-- 20261013100001 · Removing a pay with everything it paid
--
-- Removing a salary keeps the pay it already made (pay_received.salary_source_id
-- is "on delete set null", 20261008100005): that is "keep past". "Remove
-- everything" deletes those paydays too, and has to do it in one step: with the
-- paydays gone and the salary still there, the next launch's pay writer would
-- write every one of them back from the salary's last payday.
--
-- Runs as the caller, like delete_habit, so the row policies keep it to the
-- caller's own salary and pay. A salary the caller cannot see, someone else's or
-- none at all, is refused with P0002 "there is no such pay", never reported as
-- removed.
--
-- Re-run safe.

create or replace function public.delete_salary_and_pay(p_salary uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Locked before the paydays go: a payday written meanwhile by another phone
  -- waits on this lock (its foreign key check locks the salary row) and then
  -- fails on the deleted salary, instead of landing in between and being left
  -- behind with no salary.
  perform 1 from public.salary_sources where id = p_salary for update;
  if not found then
    raise exception 'there is no such pay' using errcode = 'P0002';
  end if;

  delete from public.pay_received where salary_source_id = p_salary;
  delete from public.salary_sources where id = p_salary;
end;
$$;

-- A new function is executable by PUBLIC by default.
revoke all on function public.delete_salary_and_pay(uuid) from public, anon;
grant execute on function public.delete_salary_and_pay(uuid) to authenticated;

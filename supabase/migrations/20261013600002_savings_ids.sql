-- 20261013600002 · A goal and added savings are filed once
--
-- A save whose answer is lost and is tapped again created a second goal, or added
-- the same savings twice. save_goal and save_savings_pot already take p_id to mean
-- "edit this row" (null creates), so the app's own id for a new row, one per
-- visit, comes in a new last parameter, p_new_id. With p_id null and p_new_id
-- naming one of the caller's rows, the save edits that row with the values sent
-- now, as the app's direct inserts do; otherwise it creates the row under p_new_id.
-- Another person's id fails on the primary key and says nothing about their row.
--
-- Both bodies are 20261011100001's with only these changes.

drop function if exists public.save_savings_pot(uuid, text, numeric, date, text);

create or replace function public.save_savings_pot(
  p_id       uuid,
  p_label    text,
  p_amount   numeric,
  p_added_on date,
  p_note     text,
  -- The app's own id for a new pot, one per visit. Saving again after a lost
  -- answer finds the pot the first save added and gives it the values sent now.
  p_new_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  v_pot      public.savings_pots%rowtype;
  v_in_goals numeric;
  v_id       uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount < 0 or p_amount <> round(p_amount, 2) then
    raise exception 'An amount in whole cents, please.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  -- After the lock, so a repeat racing the first waits for it and finds it.
  if p_id is null and p_new_id is not null
     and exists (select 1 from public.savings_pots where id = p_new_id and user_id = v_user) then
    p_id := p_new_id;
  end if;

  if p_id is null then
    if p_amount = 0 then
      raise exception 'Savings you add need an amount.' using errcode = '22023';
    end if;
    if p_added_on is null
       or p_added_on > ((now() at time zone 'UTC') + interval '14 hours')::date then
      raise exception 'Savings you add need a day that has come.' using errcode = '22023';
    end if;
    insert into public.savings_pots (id, user_id, kind, label, amount, added_on, note)
    values (coalesce(p_new_id, gen_random_uuid()), v_user, 'added', btrim(coalesce(p_label, '')), p_amount, p_added_on, v_note)
    returning id into v_id;
    return v_id;
  end if;

  select * into v_pot
    from public.savings_pots
   where id = p_id and user_id = v_user and removed_at is null
     for update;
  if not found then
    raise exception 'That savings is no longer there.' using errcode = 'P0002';
  end if;

  v_in_goals := public.savings_pot_in_goals(v_pot.id);
  if p_amount < v_pot.amount and p_amount < v_in_goals then
    raise exception 'That money is already in your goals.'
      using errcode = 'SV003', detail = round(v_in_goals, 2)::text, hint = v_pot.id::text;
  end if;
  if p_amount = 0 and not (v_pot.kind = 'month' and v_pot.earned - v_pot.spent <= 0) then
    raise exception 'Remove it from savings instead of keeping it at nothing.' using errcode = 'SV006';
  end if;

  if v_pot.kind = 'month' then
    update public.savings_pots
       set amount = p_amount, note = v_note
     where id = v_pot.id;
  else
    if p_added_on is null
       or p_added_on > ((now() at time zone 'UTC') + interval '14 hours')::date then
      raise exception 'Savings you add need a day that has come.' using errcode = '22023';
    end if;
    update public.savings_pots
       set label = btrim(coalesce(p_label, '')), amount = p_amount, added_on = p_added_on, note = v_note
     where id = v_pot.id;
  end if;

  return v_pot.id;
end;
$$;

drop function if exists public.save_goal(uuid, text, text, numeric, date, numeric);

create or replace function public.save_goal(
  p_id           uuid,
  p_name         text,
  p_icon_id      text,
  p_target       numeric,
  p_target_date  date,
  p_start_amount numeric,
  -- The app's own id for a new goal, one per visit. Saving again after a lost
  -- answer finds the goal the first save created and gives it the values sent now.
  p_new_id       uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_start numeric := coalesce(p_start_amount, 0);
  v_id    uuid;
begin
  if v_user is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_target is null or p_target <= 0 or p_target <> round(p_target, 2)
     or v_start < 0 or v_start <> round(v_start, 2) then
    raise exception 'A goal needs a target, and amounts in whole cents.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('savings:' || v_user::text, 0));

  -- After the lock, so a repeat racing the first waits for it and finds it.
  if p_id is null and p_new_id is not null
     and exists (select 1 from public.goals where id = p_new_id and user_id = v_user) then
    p_id := p_new_id;
  end if;

  if p_id is null then
    insert into public.goals (id, user_id, name, icon_id, target, target_date, start_amount)
    values (coalesce(p_new_id, gen_random_uuid()), v_user, btrim(coalesce(p_name, '')), p_icon_id, p_target, p_target_date, v_start)
    returning id into v_id;
  else
    update public.goals
       set name = btrim(coalesce(p_name, '')),
           icon_id = p_icon_id,
           target = p_target,
           target_date = p_target_date,
           start_amount = v_start
     where id = p_id and user_id = v_user and closed_at is null
    returning id into v_id;
    if v_id is null then
      raise exception 'That goal is no longer there.' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

-- A dropped function takes its grants with it, and a new one is executable by
-- PUBLIC by default.
revoke all on function public.save_savings_pot(uuid, text, numeric, date, text, uuid) from public, anon;
revoke all on function public.save_goal(uuid, text, text, numeric, date, numeric, uuid) from public, anon;
grant execute on function public.save_savings_pot(uuid, text, numeric, date, text, uuid) to authenticated;
grant execute on function public.save_goal(uuid, text, text, numeric, date, numeric, uuid) to authenticated;

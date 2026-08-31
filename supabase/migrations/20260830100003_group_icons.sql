-- 0003 · Give a group a face
--
-- A list of groups is a list of names, and names alone are slow to tell apart
-- once there are more than two or three. The icon set is the one bills already
-- use — bundled with the app and stored as an id, so there is no upload, no
-- bucket and nothing to load before a card can be drawn.

alter table public.groups
  add column if not exists icon_id text;

-- Dropped rather than replaced, for the same reason as save_loan in 0014:
-- adding a parameter makes a new signature instead of replacing the old one,
-- and a three-argument call would then match both. Postgres refuses that as
-- ambiguous rather than choosing, so every existing caller would start failing.
drop function if exists public.create_group(text, text, boolean);

create function public.create_group(
  p_name           text,
  p_currency       text default 'USD',
  p_simplify_debts boolean default true,
  p_icon_id        text default null
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_group public.groups;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.groups (
    name, currency, simplify_debts, created_by, invite_code, icon_id
  )
  values (
    btrim(p_name), coalesce(p_currency, 'USD'), coalesce(p_simplify_debts, true),
    v_user, public.generate_group_code(), nullif(btrim(coalesce(p_icon_id, '')), '')
  )
  returning * into v_group;

  -- Same transaction as the group itself: a group whose creator is not a
  -- member is invisible to everyone including its creator, because every
  -- policy on it asks is_group_member.
  insert into public.group_members (group_id, user_id, role)
  values (v_group.id, v_user, 'owner');

  return v_group;
end;
$$;

revoke all on function public.create_group(text, text, boolean, text) from public, anon;
grant execute on function public.create_group(text, text, boolean, text) to authenticated;
